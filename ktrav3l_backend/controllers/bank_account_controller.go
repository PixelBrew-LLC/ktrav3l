package controllers

import (
	"net/http"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetBankAccounts - Obtener todas las cuentas bancarias
func GetBankAccounts(c *gin.Context) {
	var accounts []models.BankAccount
	if err := initializers.DB.Where("is_active = ?", true).Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener cuentas bancarias"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"accounts": accounts})
}

// CreateBankAccount - Crear una cuenta bancaria
func CreateBankAccount(c *gin.Context) {
	var body struct {
		BankName      string `json:"bankName" binding:"required"`
		AccountNumber string `json:"accountNumber" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	account := models.BankAccount{
		BankName:      body.BankName,
		AccountNumber: body.AccountNumber,
		IsActive:      true,
	}

	if err := initializers.DB.Create(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al crear cuenta bancaria"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"account": account})
}

// UpdateBankAccount - Actualizar una cuenta bancaria
func UpdateBankAccount(c *gin.Context) {
	id := c.Param("id")
	accountID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var body struct {
		BankName      string `json:"bankName"`
		AccountNumber string `json:"accountNumber"`
		IsActive      *bool  `json:"isActive"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var account models.BankAccount
	if err := initializers.DB.Where("id = ?", accountID).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cuenta no encontrada"})
		return
	}

	// Actualizar campos
	if body.BankName != "" {
		account.BankName = body.BankName
	}
	if body.AccountNumber != "" {
		account.AccountNumber = body.AccountNumber
	}
	if body.IsActive != nil {
		account.IsActive = *body.IsActive
	}

	if err := initializers.DB.Save(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al actualizar cuenta"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"account": account})
}

// DeleteBankAccount - Desactivar una cuenta bancaria
func DeleteBankAccount(c *gin.Context) {
	id := c.Param("id")
	accountID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var account models.BankAccount
	if err := initializers.DB.Where("id = ?", accountID).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cuenta no encontrada"})
		return
	}

	account.IsActive = false
	if err := initializers.DB.Save(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al desactivar cuenta"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cuenta desactivada"})
}
