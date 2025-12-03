package controllers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"pixelbrew-llc/ktrav3l_backend/config"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"
	"pixelbrew-llc/ktrav3l_backend/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateAppointment crea una nueva cita
func CreateAppointment(c *gin.Context) {
	// Parsear form multipart
	err := c.Request.ParseMultipartForm(5 << 20) // 5 MB max
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error parsing form data"})
		return
	}

	// Extraer datos del formulario
	firstName := c.PostForm("firstName")
	lastName := c.PostForm("lastName")
	email := c.PostForm("email")
	phoneNumber := c.PostForm("phoneNumber")
	appointmentDateStr := c.PostForm("appointmentDate")
	appointmentHourStr := c.PostForm("appointmentHour")
	appointmentTypeIDStr := c.PostForm("appointmentTypeID")
	bankTransfer := c.PostForm("bankTransfer")

	// Parsear BankAccountID si viene como UUID
	var bankAccountID *uuid.UUID
	if bankTransfer != "" {
		parsedUUID, err := uuid.Parse(bankTransfer)
		if err == nil {
			bankAccountID = &parsedUUID
		}
	}

	// Validaciones básicas
	if firstName == "" || lastName == "" || email == "" || phoneNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	// Validar formato de teléfono (###-###-####)
	if len(phoneNumber) != 12 || phoneNumber[3] != '-' || phoneNumber[7] != '-' {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone format. Use ###-###-####"})
		return
	}

	// Parsear fecha y hora
	appointmentDate, err := time.Parse("2006-01-02", appointmentDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	appointmentHour, err := strconv.Atoi(appointmentHourStr)
	if err != nil || appointmentHour < 0 || appointmentHour > 23 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid hour"})
		return
	}

	appointmentTypeID, err := strconv.ParseUint(appointmentTypeIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid appointment type ID"})
		return
	}

	// Verificar que el tipo de cita existe y está visible
	var appointmentType models.AppointmentType
	if err := initializers.DB.First(&appointmentType, appointmentTypeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment type not found"})
		return
	}

	if !appointmentType.Visible {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Appointment type not available"})
		return
	}

	// Verificar disponibilidad (no debe haber otra cita en la misma fecha/hora)
	var existingAppointment models.Appointment
	result := initializers.DB.Where("appointment_date = ? AND appointment_hour = ? AND status != ?",
		appointmentDate, appointmentHour, models.StatusRejected).First(&existingAppointment)

	if result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Time slot not available"})
		return
	}

	// Verificar reglas de disponibilidad con el nuevo sistema
	dayOfWeek := int(appointmentDate.Weekday())

	// Verificar reglas de día de semana
	var weekdayRules []models.AvailabilityRule
	initializers.DB.Where("day_of_week = ?", dayOfWeek).Find(&weekdayRules)

	for _, rule := range weekdayRules {
		if rule.AllDay {
			c.JSON(http.StatusConflict, gin.H{"error": "This day is blocked"})
			return
		}
		for _, blockedHour := range rule.UnavailableHours {
			if appointmentHour == blockedHour {
				c.JSON(http.StatusConflict, gin.H{"error": "This time slot is blocked"})
				return
			}
		}
	}

	// Verificar reglas de fecha específica
	var specificDateRules []models.AvailabilityRule
	specificDate := time.Date(appointmentDate.Year(), appointmentDate.Month(), appointmentDate.Day(), 0, 0, 0, 0, time.UTC)
	initializers.DB.Where("specific_date = ?", specificDate).Find(&specificDateRules)

	for _, rule := range specificDateRules {
		if rule.AllDay {
			c.JSON(http.StatusConflict, gin.H{"error": "This date is blocked"})
			return
		}
		for _, blockedHour := range rule.UnavailableHours {
			if appointmentHour == blockedHour {
				c.JSON(http.StatusConflict, gin.H{"error": "This time slot is blocked"})
				return
			}
		}
	}

	// Manejar archivo de comprobante
	file, header, err := c.Request.FormFile("receipt")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Receipt file is required"})
		return
	}
	defer file.Close()

	// Validar tipo de archivo (solo imágenes y PDF)
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPG, PNG, and PDF allowed"})
		return
	}

	// Crear directorio de uploads si no existe
	uploadsPath := config.Env.UploadsPath
	if err := os.MkdirAll(uploadsPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating uploads directory"})
		return
	}

	// Generar nombre único para el archivo
	filename := fmt.Sprintf("%s_%s%s", uuid.New().String(), time.Now().Format("20060102150405"), ext)
	filepath := filepath.Join(uploadsPath, filename)

	// Guardar archivo
	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving file"})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error saving file"})
		return
	}

	// Crear cita
	appointment := models.Appointment{
		FirstName:         firstName,
		LastName:          lastName,
		Email:             email,
		PhoneNumber:       phoneNumber,
		AppointmentDate:   appointmentDate,
		AppointmentHour:   appointmentHour,
		AppointmentTypeID: uint(appointmentTypeID),
		BankAccountID:     bankAccountID,
		BankTransfer:      models.BankType(bankTransfer),
		ReceiptPath:       filepath,
		Status:            models.StatusPending,
	}

	if err := initializers.DB.Create(&appointment).Error; err != nil {
		// Si hay error, eliminar archivo subido
		os.Remove(filepath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating appointment"})
		return
	}

	// Cargar el tipo de cita para el email
	initializers.DB.First(&appointment.AppointmentType, appointment.AppointmentTypeID)

	// Enviar email de confirmación
	emailService := services.NewEmailService()
	if err := emailService.SendAppointmentConfirmation(&appointment); err != nil {
		// Log error pero no fallar la request
		fmt.Println("Error sending confirmation email:", err)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Appointment created successfully",
		"shortID": appointment.ShortID,
		"id":      appointment.ID,
		"status":  appointment.Status,
	})
}

// GetAppointmentByShortID obtiene una cita por su código corto
func GetAppointmentByShortID(c *gin.Context) {
	shortID := c.Param("shortID")

	var appointment models.Appointment
	if err := initializers.DB.Preload("AppointmentType").Where("short_id = ?", shortID).First(&appointment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	// Formato del teléfono para mostrar: +1 (###) ###-####
	phoneFormatted := fmt.Sprintf("+1 (%s) %s-%s",
		appointment.PhoneNumber[0:3],
		appointment.PhoneNumber[4:7],
		appointment.PhoneNumber[8:12])

	c.JSON(http.StatusOK, gin.H{
		"id":              appointment.ID,
		"shortID":         appointment.ShortID,
		"firstName":       appointment.FirstName,
		"lastName":        appointment.LastName,
		"email":           appointment.Email,
		"phoneNumber":     phoneFormatted,
		"appointmentDate": appointment.AppointmentDate.Format("2006-01-02"),
		"appointmentHour": appointment.AppointmentHour,
		"appointmentType": appointment.AppointmentType.Name,
		"bankTransfer":    appointment.BankTransfer,
		"status":          appointment.Status,
		"rejectionReason": appointment.RejectionReason,
		"createdAt":       appointment.CreatedAt,
	})
}

// GetReceipt devuelve el archivo de comprobante
func GetReceipt(c *gin.Context) {
	shortID := c.Param("shortID")

	var appointment models.Appointment
	if err := initializers.DB.Where("short_id = ?", shortID).First(&appointment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	// Verificar que el archivo existe
	if _, err := os.Stat(appointment.ReceiptPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Receipt file not found"})
		return
	}

	c.File(appointment.ReceiptPath)
}

// GetReceiptByID devuelve el archivo de comprobante por ID (para admin)
func GetReceiptByID(c *gin.Context) {
	id := c.Param("id")

	var appointment models.Appointment
	if err := initializers.DB.Where("id = ?", id).First(&appointment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Appointment not found"})
		return
	}

	// Verificar que el archivo existe
	if _, err := os.Stat(appointment.ReceiptPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Receipt file not found"})
		return
	}

	c.File(appointment.ReceiptPath)
}

// GetAvailableHours obtiene las horas disponibles para una fecha
func GetAvailableHours(c *gin.Context) {
	dateStr := c.Query("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Todas las 24 horas por defecto (0-23)
	allHours := make(map[int]bool)
	for hour := 0; hour < 24; hour++ {
		allHours[hour] = true
	}

	dayOfWeek := int(date.Weekday())

	// 1. Aplicar reglas de día de semana
	var weekdayRules []models.AvailabilityRule
	initializers.DB.Where("day_of_week = ?", dayOfWeek).Find(&weekdayRules)

	for _, rule := range weekdayRules {
		if rule.AllDay {
			// Bloquear todo el día
			for hour := 0; hour < 24; hour++ {
				allHours[hour] = false
			}
		} else {
			// Bloquear horas específicas
			for _, hour := range rule.UnavailableHours {
				if hour >= 0 && hour < 24 {
					allHours[hour] = false
				}
			}
		}
	}

	// 2. Aplicar reglas de fecha específica (tienen prioridad)
	var specificDateRules []models.AvailabilityRule
	specificDate := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	initializers.DB.Where("specific_date = ?", specificDate).Find(&specificDateRules)

	for _, rule := range specificDateRules {
		if rule.AllDay {
			// Bloquear todo el día
			for hour := 0; hour < 24; hour++ {
				allHours[hour] = false
			}
		} else {
			// Bloquear horas específicas
			for _, hour := range rule.UnavailableHours {
				if hour >= 0 && hour < 24 {
					allHours[hour] = false
				}
			}
		}
	}

	// 3. Eliminar horas que ya tienen citas
	for hour := 0; hour < 24; hour++ {
		if !allHours[hour] {
			continue
		}

		var existingAppointment models.Appointment
		result := initializers.DB.Where("appointment_date = ? AND appointment_hour = ? AND status != ?",
			date, hour, models.StatusRejected).First(&existingAppointment)

		if result.Error == nil {
			// Hay una cita, eliminar esta hora
			allHours[hour] = false
		}
	}

	// 4. Eliminar horas pasadas si es el día de hoy
	now := time.Now()
	isToday := date.Year() == now.Year() && date.Month() == now.Month() && date.Day() == now.Day()

	if isToday {
		currentHour := now.Hour()
		for hour := 0; hour <= currentHour; hour++ {
			allHours[hour] = false
		}
	}

	// Convertir map a slice ordenado
	availableHours := []int{}
	for hour := 0; hour < 24; hour++ {
		if allHours[hour] {
			availableHours = append(availableHours, hour)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"date":           dateStr,
		"availableHours": availableHours,
	})
}

// GetAppointmentTypes obtiene todos los tipos de cita visibles
func GetAppointmentTypes(c *gin.Context) {
	var appointmentTypes []models.AppointmentType
	initializers.DB.Where("visible = true").Find(&appointmentTypes)

	c.JSON(http.StatusOK, gin.H{
		"appointmentTypes": appointmentTypes,
	})
}
