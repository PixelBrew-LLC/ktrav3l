package controllers

import (
	"net/http"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetAvailabilityRules obtiene todas las reglas de disponibilidad
func GetAvailabilityRules(c *gin.Context) {
	var rules []models.AvailabilityRule
	initializers.DB.Order("day_of_week ASC, specific_date ASC").Find(&rules)

	c.JSON(http.StatusOK, gin.H{
		"rules": rules,
	})
}

// CreateWeekdayRule crea una regla para un día de la semana
func CreateWeekdayRule(c *gin.Context) {
	var body struct {
		DayOfWeek        int   `json:"dayOfWeek" binding:"min=0,max=6"`
		UnavailableHours []int `json:"unavailableHours"`
		AllDay           bool  `json:"allDay"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verificar si ya existe una regla para este día
	var existingRule models.AvailabilityRule
	result := initializers.DB.Where("day_of_week = ?", body.DayOfWeek).First(&existingRule)

	if result.Error == nil {
		// Ya existe, actualizar
		existingRule.UnavailableHours = body.UnavailableHours
		existingRule.AllDay = body.AllDay
		initializers.DB.Save(&existingRule)

		c.JSON(http.StatusOK, gin.H{
			"message": "Rule updated successfully",
			"rule":    existingRule,
		})
		return
	}

	// No existe, crear nueva
	rule := models.AvailabilityRule{
		DayOfWeek:        &body.DayOfWeek,
		UnavailableHours: body.UnavailableHours,
		AllDay:           body.AllDay,
	}

	if err := initializers.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rule"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Rule created successfully",
		"rule":    rule,
	})
}

// CreateSpecificDateRule crea una regla para una fecha específica
func CreateSpecificDateRule(c *gin.Context) {
	var body struct {
		SpecificDate     string `json:"specificDate" binding:"required"`
		UnavailableHours []int  `json:"unavailableHours"`
		AllDay           bool   `json:"allDay"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse la fecha
	date, err := time.Parse("2006-01-02", body.SpecificDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Verificar si ya existe una regla para esta fecha
	var existingRule models.AvailabilityRule
	result := initializers.DB.Where("specific_date = ?", date).First(&existingRule)

	if result.Error == nil {
		// Ya existe, actualizar
		existingRule.UnavailableHours = body.UnavailableHours
		existingRule.AllDay = body.AllDay
		initializers.DB.Save(&existingRule)

		c.JSON(http.StatusOK, gin.H{
			"message": "Rule updated successfully",
			"rule":    existingRule,
		})
		return
	}

	// No existe, crear nueva
	rule := models.AvailabilityRule{
		SpecificDate:     &date,
		UnavailableHours: body.UnavailableHours,
		AllDay:           body.AllDay,
	}

	if err := initializers.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rule"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Rule created successfully",
		"rule":    rule,
	})
}

// UpdateAvailabilityRule actualiza una regla existente
func UpdateAvailabilityRule(c *gin.Context) {
	id := c.Param("id")

	var rule models.AvailabilityRule
	if err := initializers.DB.First(&rule, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rule not found"})
		return
	}

	var body struct {
		UnavailableHours []int `json:"unavailableHours"`
		AllDay           bool  `json:"allDay"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule.UnavailableHours = body.UnavailableHours
	rule.AllDay = body.AllDay

	if err := initializers.DB.Save(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update rule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Rule updated successfully",
		"rule":    rule,
	})
}

// DeleteAvailabilityRule elimina una regla
func DeleteAvailabilityRule(c *gin.Context) {
	id := c.Param("id")

	var rule models.AvailabilityRule
	if err := initializers.DB.First(&rule, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Rule not found"})
		return
	}

	if err := initializers.DB.Delete(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Rule deleted successfully",
	})
}

// DeleteWeekdayRule elimina la regla de un día de la semana específico
func DeleteWeekdayRule(c *gin.Context) {
	dayStr := c.Param("day")
	day, err := strconv.Atoi(dayStr)
	if err != nil || day < 0 || day > 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid day of week"})
		return
	}

	if err := initializers.DB.Where("day_of_week = ?", day).Delete(&models.AvailabilityRule{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Weekday rule deleted successfully",
	})
}

// DeleteSpecificDateRule elimina la regla de una fecha específica
func DeleteSpecificDateRule(c *gin.Context) {
	dateStr := c.Param("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	if err := initializers.DB.Where("specific_date = ?", date).Delete(&models.AvailabilityRule{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rule"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Specific date rule deleted successfully",
	})
}
