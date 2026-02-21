package controllers

import (
	"fmt"
	"net/http"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"
	"pixelbrew-llc/ktrav3l_backend/services"
	"regexp"
	"strconv"
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
	query := initializers.DB.Preload("AppointmentType").Preload("BankAccount").Preload("MeetingPlatform")

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
	if err := initializers.DB.Preload("AppointmentType").Preload("MeetingPlatform").First(&appointment, "id = ?", id).Error; err != nil {
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
	newDateOnly := models.NewDateOnly(newDate)

	// Verificar si el nuevo horario está disponible según reglas de disponibilidad
	dayOfWeek := int(newDateOnly.Time.Weekday())

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
	specificDate := time.Date(newDateOnly.Time.Year(), newDateOnly.Time.Month(), newDateOnly.Time.Day(), 0, 0, 0, 0, time.UTC)
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
		newDateOnly, body.NewHour, id, models.StatusRejected).First(&existingAppointment)

	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Time slot already taken"})
		return
	}

	// 4. Filtrar horas pasadas si es hoy
	now := time.Now()
	isToday := newDateOnly.Time.Year() == now.Year() && newDateOnly.Time.Month() == now.Month() && newDateOnly.Time.Day() == now.Day()
	if isToday && body.NewHour <= now.Hour() {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot move to a past hour"})
		return
	}

	// Guardar datos anteriores para el email
	oldDate := appointment.AppointmentDate
	oldHour := appointment.AppointmentHour

	// Actualizar la cita
	appointment.AppointmentDate = newDateOnly
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
	go SendAppointmentMovedEmail(appointment, oldDate.Time, oldHour)

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
		Preload("MeetingPlatform").
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
		dateKey := app.AppointmentDate.Time.Format("2006-01-02")

		// Formatear fecha en español
		dayName := app.AppointmentDate.Time.Format("Monday")
		monthName := app.AppointmentDate.Time.Format("January")
		day := app.AppointmentDate.Time.Format("2")
		year := app.AppointmentDate.Time.Format("2006")

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

		// Construir datos de plataforma si existe
		var platformName string
		if app.MeetingPlatform != nil {
			platformName = app.MeetingPlatform.Name
		}

		calendarData[dateKey] = append(calendarData[dateKey], gin.H{
			"id":                app.ID,
			"shortID":           app.ShortID,
			"firstName":         app.FirstName,
			"lastName":          app.LastName,
			"email":             app.Email,
			"phoneNumber":       app.PhoneNumber,
			"date":              formattedDate,
			"hour":              app.AppointmentHour,
			"type":              app.AppointmentType.Name,
			"status":            app.Status,
			"bankTransfer":      app.BankTransfer,
			"bankAccount":       bankAccount,
			"receiptPath":       app.ReceiptPath,
			"meetingLink":       app.MeetingLink,
			"adminNote":         app.AdminNote,
			"rejectionReason":   app.RejectionReason,
			"meetingPlatform":   platformName,
			"meetingPlatformId": app.MeetingPlatformID,
			"createdByAdmin":    app.CreatedByAdmin,
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
	newDateFormatted := formatSpanishDate(appointment.AppointmentDate.Time)

	if err := emailService.SendAppointmentMoved(&appointment, oldDateFormatted, newDateFormatted, oldHour, appointment.AppointmentHour); err != nil {
		// Log error but don't fail the request
		println("Error sending appointment moved email:", err.Error())
	}
}

// UpdateAppointmentDetails permite editar campos de una cita (excepto si está completada)
func UpdateAppointmentDetails(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		FirstName         *string `json:"firstName"`
		LastName          *string `json:"lastName"`
		Email             *string `json:"email"`
		PhoneNumber       *string `json:"phoneNumber"`
		MeetingLink       *string `json:"meetingLink"`
		AdminNote         *string `json:"adminNote"`
		MeetingPlatformID *string `json:"meetingPlatformId"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}

	var appointment models.Appointment
	if err := initializers.DB.Preload("AppointmentType").Preload("MeetingPlatform").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	// No permitir editar citas completadas
	if appointment.Status == models.StatusDone {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot edit completed appointments"})
		return
	}

	if body.FirstName != nil {
		appointment.FirstName = *body.FirstName
	}
	if body.LastName != nil {
		appointment.LastName = *body.LastName
	}
	if body.Email != nil {
		appointment.Email = *body.Email
	}
	if body.PhoneNumber != nil {
		cleaned := regexp.MustCompile(`\D`).ReplaceAllString(*body.PhoneNumber, "")
		appointment.PhoneNumber = cleaned
	}
	if body.MeetingLink != nil {
		appointment.MeetingLink = *body.MeetingLink
	}
	if body.AdminNote != nil {
		appointment.AdminNote = *body.AdminNote
	}
	if body.MeetingPlatformID != nil && *body.MeetingPlatformID != "" {
		platformUUID, err := uuid.Parse(*body.MeetingPlatformID)
		if err == nil {
			appointment.MeetingPlatformID = &platformUUID
		}
	}

	if err := initializers.DB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Appointment updated successfully",
		"appointment": appointment,
	})
}

// UpdateAppointmentPlatform asigna una plataforma de reunión a una cita
func UpdateAppointmentPlatform(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		MeetingPlatformID string `json:"meetingPlatformId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Meeting platform ID is required"})
		return
	}

	platformID, err := uuid.Parse(body.MeetingPlatformID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid platform ID"})
		return
	}

	// Verificar que la plataforma existe
	var platform models.MeetingPlatform
	if err := initializers.DB.First(&platform, "id = ?", platformID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting platform not found"})
		return
	}

	var appointment models.Appointment
	if err := initializers.DB.Preload("AppointmentType").Preload("MeetingPlatform").First(&appointment, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	appointment.MeetingPlatformID = &platformID
	if err := initializers.DB.Save(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating appointment"})
		return
	}

	// Recargar con la relación
	initializers.DB.Preload("AppointmentType").Preload("MeetingPlatform").First(&appointment, "id = ?", id)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Platform assigned successfully",
		"appointment": appointment,
	})
}

// AdminCreateAppointment crea una cita desde el admin (ya aprobada)
func AdminCreateAppointment(c *gin.Context) {
	var body struct {
		FirstName         string `json:"firstName" binding:"required"`
		LastName          string `json:"lastName" binding:"required"`
		Email             string `json:"email"`
		PhoneNumber       string `json:"phoneNumber"`
		AppointmentDate   string `json:"appointmentDate" binding:"required"`
		AppointmentHour   int    `json:"appointmentHour" binding:"required,min=0,max=23"`
		AppointmentTypeID uint   `json:"appointmentTypeId" binding:"required"`
		MeetingLink       string `json:"meetingLink"`
		AdminNote         string `json:"adminNote"`
		MeetingPlatformID string `json:"meetingPlatformId"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data: " + err.Error()})
		return
	}

	// Parsear fecha
	parsedDate, err := time.Parse("2006-01-02", body.AppointmentDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}
	appointmentDate := models.NewDateOnly(parsedDate)

	// Verificar tipo de cita
	var appointmentType models.AppointmentType
	if err := initializers.DB.First(&appointmentType, body.AppointmentTypeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment type not found"})
		return
	}

	// Verificar disponibilidad
	var existingAppointment models.Appointment
	result := initializers.DB.Where("appointment_date = ? AND appointment_hour = ? AND status != ?",
		appointmentDate, body.AppointmentHour, models.StatusRejected).First(&existingAppointment)

	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Time slot not available"})
		return
	}

	appointment := models.Appointment{
		FirstName:         body.FirstName,
		LastName:          body.LastName,
		Email:             body.Email,
		PhoneNumber:       regexp.MustCompile(`\D`).ReplaceAllString(body.PhoneNumber, ""),
		AppointmentDate:   appointmentDate,
		AppointmentHour:   body.AppointmentHour,
		AppointmentTypeID: body.AppointmentTypeID,
		MeetingLink:       body.MeetingLink,
		AdminNote:         body.AdminNote,
		Status:            models.StatusApproved,
		CreatedByAdmin:    true,
		ReceiptPath:       "", // No receipt for admin-created appointments
	}

	// Asignar plataforma si se proporcionó
	if body.MeetingPlatformID != "" {
		platformUUID, err := uuid.Parse(body.MeetingPlatformID)
		if err == nil {
			appointment.MeetingPlatformID = &platformUUID
		}
	}

	if err := initializers.DB.Create(&appointment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating appointment"})
		return
	}

	// Cargar relaciones
	initializers.DB.Preload("AppointmentType").First(&appointment, "id = ?", appointment.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Appointment created successfully",
		"appointment": appointment,
	})
}

// GetDashboardStats obtiene estadísticas para el dashboard
func GetDashboardStats(c *gin.Context) {
	// Mes actual o el especificado
	monthStr := c.DefaultQuery("month", time.Now().Format("2006-01"))

	startDate, err := time.Parse("2006-01", monthStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month format"})
		return
	}
	endDate := startDate.AddDate(0, 1, 0)

	// Contar por estado en el mes
	var appointments []models.Appointment
	initializers.DB.Where("appointment_date >= ? AND appointment_date < ?", startDate, endDate).Find(&appointments)

	stats := gin.H{
		"pending":  0,
		"approved": 0,
		"rejected": 0,
		"done":     0,
		"total":    len(appointments),
	}

	// Agrupar por día para los gráficos
	dailyData := make(map[string]gin.H)

	for _, apt := range appointments {
		switch apt.Status {
		case models.StatusPending:
			stats["pending"] = stats["pending"].(int) + 1
		case models.StatusApproved:
			stats["approved"] = stats["approved"].(int) + 1
		case models.StatusRejected:
			stats["rejected"] = stats["rejected"].(int) + 1
		case models.StatusDone:
			stats["done"] = stats["done"].(int) + 1
		}

		dateKey := apt.AppointmentDate.Time.Format("2006-01-02")
		if _, exists := dailyData[dateKey]; !exists {
			dailyData[dateKey] = gin.H{
				"date":  dateKey,
				"day":   apt.AppointmentDate.Time.Day(),
				"total": 0,
			}
		}
		dailyData[dateKey]["total"] = dailyData[dateKey]["total"].(int) + 1
	}

	// Convertir a array ordenado
	daysInMonth := int(endDate.Sub(startDate).Hours() / 24)
	dailyArray := make([]gin.H, 0, daysInMonth)
	for i := 0; i < daysInMonth; i++ {
		day := startDate.AddDate(0, 0, i)
		dateKey := day.Format("2006-01-02")
		if data, exists := dailyData[dateKey]; exists {
			dailyArray = append(dailyArray, data)
		} else {
			dailyArray = append(dailyArray, gin.H{
				"date":  dateKey,
				"day":   day.Day(),
				"total": 0,
			})
		}
	}

	// Estadísticas globales (todas las citas)
	var totalAllTime int64
	initializers.DB.Model(&models.Appointment{}).Count(&totalAllTime)

	// Tipo de cita más popular en el mes
	type TypeCount struct {
		Name  string
		Count int
	}
	typeCountMap := make(map[string]int)
	for _, apt := range appointments {
		var aptType models.AppointmentType
		initializers.DB.First(&aptType, apt.AppointmentTypeID)
		typeCountMap[aptType.Name]++
	}

	topType := ""
	topCount := 0
	for name, count := range typeCountMap {
		if count > topCount {
			topType = name
			topCount = count
		}
	}

	// Mes anterior para comparación
	prevStart := startDate.AddDate(0, -1, 0)
	prevEnd := startDate
	var prevCount int64
	initializers.DB.Model(&models.Appointment{}).Where("appointment_date >= ? AND appointment_date < ?", prevStart, prevEnd).Count(&prevCount)

	growth := 0
	if prevCount > 0 {
		growth = int(((int64(len(appointments)) - prevCount) * 100) / prevCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"month":        monthStr,
		"stats":        stats,
		"dailyData":    dailyArray,
		"totalAllTime": totalAllTime,
		"topType":      topType,
		"topTypeCount": topCount,
		"prevMonth":    strconv.FormatInt(prevCount, 10),
		"growth":       growth,
	})
}
