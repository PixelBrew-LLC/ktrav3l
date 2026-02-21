package controllers

import (
	"net/http"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"

	"github.com/gin-gonic/gin"
	uuid "github.com/google/uuid"
)

// GetMeetingPlatforms lista todas las plataformas
func GetMeetingPlatforms(c *gin.Context) {
	var platforms []models.MeetingPlatform
	initializers.DB.Find(&platforms)

	c.JSON(http.StatusOK, gin.H{
		"meetingPlatforms": platforms,
	})
}

// GetActiveMeetingPlatforms lista solo las activas (para selects)
func GetActiveMeetingPlatforms(c *gin.Context) {
	var platforms []models.MeetingPlatform
	initializers.DB.Where("is_active = ?", true).Find(&platforms)

	c.JSON(http.StatusOK, gin.H{
		"meetingPlatforms": platforms,
	})
}

// CreateMeetingPlatform crea una nueva plataforma
func CreateMeetingPlatform(c *gin.Context) {
	var body struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	platform := models.MeetingPlatform{
		Name:     body.Name,
		IsActive: true,
	}

	if err := initializers.DB.Create(&platform).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating meeting platform"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"meetingPlatform": platform,
	})
}

// UpdateMeetingPlatform actualiza nombre o estado activo
func UpdateMeetingPlatform(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Name     *string `json:"name"`
		IsActive *bool   `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}

	var platform models.MeetingPlatform
	if err := initializers.DB.First(&platform, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting platform not found"})
		return
	}

	if body.Name != nil {
		platform.Name = *body.Name
	}
	if body.IsActive != nil {
		platform.IsActive = *body.IsActive
	}

	if err := initializers.DB.Save(&platform).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating meeting platform"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"meetingPlatform": platform,
	})
}

// DeleteMeetingPlatform elimina (soft delete) una plataforma
func DeleteMeetingPlatform(c *gin.Context) {
	id := c.Param("id")

	parsedID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var platform models.MeetingPlatform
	if err := initializers.DB.First(&platform, "id = ?", parsedID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Meeting platform not found"})
		return
	}

	if err := initializers.DB.Delete(&platform).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error deleting meeting platform"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Meeting platform deleted",
	})
}
