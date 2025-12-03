package controllers

import (
	"fmt"
	"net/http"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"
	"pixelbrew-llc/ktrav3l_backend/services"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	uuid "github.com/google/uuid"
)

// Helper para formatear fechas en español
func formatSpanishDate(t time.Time) string {
	weekdays := map[time.Weekday]string{
		time.Monday:    "lunes",
		time.Tuesday:   "martes",
		time.Wednesday: "miércoles",
		time.Thursday:  "jueves",
		time.Friday:    "viernes",
		time.Saturday:  "sábado",
		time.Sunday:    "domingo",
	}

	months := map[time.Month]string{
		time.January:   "enero",
		time.February:  "febrero",
		time.March:     "marzo",
		time.April:     "abril",
		time.May:       "mayo",
		time.June:      "junio",
		time.July:      "julio",
		time.August:    "agosto",
		time.September: "septiembre",
		time.October:   "octubre",
		time.November:  "noviembre",
		time.December:  "diciembre",
	}

	weekday := weekdays[t.Weekday()]
	month := months[t.Month()]

	// Capitalizar primera letra del día
	weekday = strings.ToUpper(string(weekday[0])) + weekday[1:]

	return fmt.Sprintf("%s, %d de %s de %d", weekday, t.Day(), month, t.Year())
}

// GetAllAppointments obtiene todas las citas con filtros
func GetAllAppointments(c *gin.Context) {
	var appointments []models.Appointment
	query := initializers.DB.Preload("AppointmentType").Preload("BankAccount")

	// Filtros opcionales
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if dateStr := c.Query("date"); dateStr != "" {
		date, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			query = query.Where("appointment_date = ?", date)
		}
	}

	if month := c.Query("month"); month != "" {
		// Formato: YYYY-MM
		startDate, _ := time.Parse("2006-01", month)
		endDate := startDate.AddDate(0, 1, 0)
		query = query.Where("appointment_date >= ? AND appointment_date < ?", startDate, endDate)
	}

	// Ordenamiento
	orderBy := c.DefaultQuery("orderBy", "appointment_date")
	orderDir := c.DefaultQuery("orderDir", "asc")
	query = query.Order(orderBy + " " + orderDir)

	query.Find(&appointments)

	c.JSON(http.StatusOK, gin.H{
		"appointments": appointments,
	})
}

// GetAppointmentByID obtiene una cita por ID (para admin)
func GetAppointmentByID(c *gin.Context) {
	id := c.Param("id")

	var appointment models.Appointment
	if err := initializers.DB.Preload("AppointmentType").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"appointment": appointment,
	})
}

// ApproveAppointment aprueba una cita
func ApproveAppointment(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		MeetingLink string `json:"meetingLink"`
		AdminNote   string `json:"adminNote"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var appointment models.Appointment
	if err := initializers.DB.Preload("AppointmentType").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	if appointment.Status == models.StatusDone {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot modify completed appointment"})
		return
	}

	appointment.Status = models.StatusApproved
	appointment.RejectionReason = ""
	appointment.MeetingLink = body.MeetingLink
	appointment.AdminNote = body.AdminNote

	if err := initializers.DB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment"})
		return
	}

	// Enviar email de aprobación
	emailService := services.NewEmailService()
	if err := emailService.SendAppointmentApproved(&appointment); err != nil {
		// Log error pero no fallar
		println("Error sending approval email:", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Appointment approved successfully",
		"appointment": appointment,
	})
}

// RejectAppointment rechaza una cita
func RejectAppointment(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Reason    string `json:"reason" binding:"required"`
		AdminNote string `json:"adminNote"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rejection reason is required"})
		return
	}

	var appointment models.Appointment
	if err := initializers.DB.Preload("AppointmentType").Preload("BankAccount").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	if appointment.Status == models.StatusDone {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot modify completed appointment"})
		return
	}

	appointment.Status = models.StatusRejected
	appointment.RejectionReason = body.Reason
	appointment.AdminNote = body.AdminNote

	if err := initializers.DB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment"})
		return
	}

	// Enviar email de rechazo
	emailService := services.NewEmailService()
	if err := emailService.SendAppointmentRejected(&appointment, body.Reason); err != nil {
		// Log error pero no fallar
		println("Error sending rejection email:", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Appointment rejected successfully",
		"appointment": appointment,
	})
}

// MarkAppointmentDone marca una cita como completada
func MarkAppointmentDone(c *gin.Context) {
	id := c.Param("id")

	var appointment models.Appointment
	if err := initializers.DB.Preload("BankAccount").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	if appointment.Status != models.StatusApproved {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only approved appointments can be marked as done"})
		return
	}

	appointment.Status = models.StatusDone

	if err := initializers.DB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Appointment marked as done",
		"appointment": appointment,
	})
}

// MoveAppointment mueve una cita a otra fecha/hora
func MoveAppointment(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		NewDate   string  `json:"newDate" binding:"required"`
		NewHour   int     `json:"newHour" binding:"required,min=0,max=23"`
		AdminNote *string `json:"adminNote"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}

	var appointment models.Appointment
	if err := initializers.DB.Preload("BankAccount").Preload("AppointmentType").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	if appointment.Status == models.StatusDone {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot move completed appointment"})
		return
	}

	// Parsear nueva fecha
	newDate, err := time.Parse("2006-01-02", body.NewDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Verificar si el nuevo horario está disponible según reglas de disponibilidad
	dayOfWeek := int(newDate.Weekday())

	// 1. Verificar reglas de día de semana
	var weekdayRules []models.AvailabilityRule
	initializers.DB.Where("day_of_week = ?", dayOfWeek).Find(&weekdayRules)

	for _, rule := range weekdayRules {
		if rule.AllDay {
			c.JSON(http.StatusConflict, gin.H{"error": "Selected day is blocked"})
			return
		}
		for _, hour := range rule.UnavailableHours {
			if hour == body.NewHour {
				c.JSON(http.StatusConflict, gin.H{"error": "Selected hour is not available"})
				return
			}
		}
	}

	// 2. Verificar reglas de fecha específica
	var specificDateRules []models.AvailabilityRule
	specificDate := time.Date(newDate.Year(), newDate.Month(), newDate.Day(), 0, 0, 0, 0, time.UTC)
	initializers.DB.Where("specific_date = ?", specificDate).Find(&specificDateRules)

	for _, rule := range specificDateRules {
		if rule.AllDay {
			c.JSON(http.StatusConflict, gin.H{"error": "Selected date is blocked"})
			return
		}
		for _, hour := range rule.UnavailableHours {
			if hour == body.NewHour {
				c.JSON(http.StatusConflict, gin.H{"error": "Selected hour is not available"})
				return
			}
		}
	}

	// 3. Verificar que no haya otra cita en ese horario
	var existingAppointment models.Appointment
	result := initializers.DB.Where("appointment_date = ? AND appointment_hour = ? AND id != ? AND status != ?",
		newDate, body.NewHour, id, models.StatusRejected).First(&existingAppointment)

	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Time slot already taken"})
		return
	}

	// 4. Filtrar horas pasadas si es hoy
	now := time.Now()
	isToday := newDate.Year() == now.Year() && newDate.Month() == now.Month() && newDate.Day() == now.Day()
	if isToday && body.NewHour <= now.Hour() {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot move to a past hour"})
		return
	}

	// Guardar datos anteriores para el email
	oldDate := appointment.AppointmentDate
	oldHour := appointment.AppointmentHour

	// Actualizar la cita
	appointment.AppointmentDate = newDate
	appointment.AppointmentHour = body.NewHour

	// Actualizar nota administrativa si se provee
	if body.AdminNote != nil && *body.AdminNote != "" {
		appointment.AdminNote = *body.AdminNote
	}

	if err := initializers.DB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment"})
		return
	}

	// Enviar email al cliente notificando el cambio
	go SendAppointmentMovedEmail(appointment, oldDate, oldHour)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Appointment moved successfully",
		"appointment": appointment,
	})
}

// GetCalendarData obtiene datos para el calendario del admin
func GetCalendarData(c *gin.Context) {
	monthStr := c.Query("month") // YYYY-MM

	startDate, err := time.Parse("2006-01", monthStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month format"})
		return
	}

	endDate := startDate.AddDate(0, 1, 0)

	var appointments []models.Appointment
	initializers.DB.Where("appointment_date >= ? AND appointment_date < ?", startDate, endDate).
		Preload("AppointmentType").
		Preload("BankAccount").
		Find(&appointments)

	// Agrupar por fecha
	calendarData := make(map[string][]gin.H)

	// Mapa de traducción de días de la semana
	daysES := map[string]string{
		"Monday":    "Lunes",
		"Tuesday":   "Martes",
		"Wednesday": "Miércoles",
		"Thursday":  "Jueves",
		"Friday":    "Viernes",
		"Saturday":  "Sábado",
		"Sunday":    "Domingo",
	}

	// Mapa de traducción de meses
	monthsES := map[string]string{
		"January":   "Enero",
		"February":  "Febrero",
		"March":     "Marzo",
		"April":     "Abril",
		"May":       "Mayo",
		"June":      "Junio",
		"July":      "Julio",
		"August":    "Agosto",
		"September": "Septiembre",
		"October":   "Octubre",
		"November":  "Noviembre",
		"December":  "Diciembre",
	}

	for _, app := range appointments {
		dateKey := app.AppointmentDate.Format("2006-01-02")

		// Formatear fecha en español
		dayName := app.AppointmentDate.Format("Monday")
		monthName := app.AppointmentDate.Format("January")
		day := app.AppointmentDate.Format("2")
		year := app.AppointmentDate.Format("2006")

		formattedDate := daysES[dayName] + ", " + day + " de " + monthsES[monthName] + " de " + year

		// Si BankAccount es nil pero BankTransfer tiene un UUID, intentar cargar el banco
		bankAccount := app.BankAccount
		if bankAccount == nil && app.BankTransfer != "" {
			// Intentar parsear BankTransfer como UUID y buscar el banco
			bankID, err := uuid.Parse(string(app.BankTransfer))
			if err == nil {
				var bank models.BankAccount
				if err := initializers.DB.First(&bank, "id = ?", bankID).Error; err == nil {
					bankAccount = &bank
				}
			}
		}

		calendarData[dateKey] = append(calendarData[dateKey], gin.H{
			"id":           app.ID,
			"shortID":      app.ShortID,
			"firstName":    app.FirstName,
			"lastName":     app.LastName,
			"email":        app.Email,
			"phoneNumber":  app.PhoneNumber,
			"date":         formattedDate,
			"hour":         app.AppointmentHour,
			"type":         app.AppointmentType.Name,
			"status":       app.Status,
			"bankTransfer": app.BankTransfer,
			"bankAccount":  bankAccount,
			"receiptPath":  app.ReceiptPath,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"month":        monthStr,
		"calendarData": calendarData,
	})
}

// Gestión de tipos de cita

func GetAllAppointmentTypes(c *gin.Context) {
	var appointmentTypes []models.AppointmentType
	initializers.DB.Find(&appointmentTypes)

	c.JSON(http.StatusOK, gin.H{
		"appointmentTypes": appointmentTypes,
	})
}

func CreateAppointmentType(c *gin.Context) {
	var body struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	appointmentType := models.AppointmentType{
		Name:    body.Name,
		Visible: true,
	}

	if err := initializers.DB.Create(&appointmentType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating appointment type"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"appointmentType": appointmentType,
	})
}

func UpdateAppointmentTypeVisibility(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Visible bool `json:"visible"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}

	var appointmentType models.AppointmentType
	if err := initializers.DB.First(&appointmentType, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment type not found"})
		return
	}

	appointmentType.Visible = body.Visible

	if err := initializers.DB.Save(&appointmentType).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"appointmentType": appointmentType,
	})
}

// SendAppointmentMovedEmail envía email cuando una cita es movida
func SendAppointmentMovedEmail(appointment models.Appointment, oldDate time.Time, oldHour int) {
	emailService := services.NewEmailService()

	oldDateFormatted := formatSpanishDate(oldDate)
	newDateFormatted := formatSpanishDate(appointment.AppointmentDate)

	if err := emailService.SendAppointmentMoved(&appointment, oldDateFormatted, newDateFormatted, oldHour, appointment.AppointmentHour); err != nil {
		// Log error but don't fail the request
		println("Error sending appointment moved email:", err.Error())
	}
}
