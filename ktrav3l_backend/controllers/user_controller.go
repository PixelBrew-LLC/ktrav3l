package controllers

import (
	"net/http"
	"time"

	"pixelbrew-llc/ktrav3l_backend/config"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func SignUp(c *gin.Context) {
	// Handle request body
	body := struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}{}

	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request body",
		})
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Failed to hash password",
		})
		return
	}

	newUser := models.User{
		ID:       uuid.New(),
		Email:    body.Email,
		Password: string(hash),
	}

	var count int64
	initializers.DB.First(&newUser, "email = ?", body.Email).Count(&count)

	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "User already exists",
		})
		return
	}

	if err := initializers.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Failed to create user",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    newUser,
	})
}

func SignIn(c *gin.Context) {
	// Handle request body
	body := struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}{}

	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Invalid request body",
		})
		return
	}

	var user models.User
	if err := initializers.DB.First(&user, "email = ?", body.Email).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid email or password",
		})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid email or password",
		})
		return
	}

	// Generate JWT

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(time.Hour * 1).Unix(),
	})
	tokenString, err := token.SignedString([]byte(config.Env.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			// "message": "There was a error creating JWT token",
			"error": err.Error(),
		})
		return
	}

	// return the token
	c.JSON(http.StatusOK, gin.H{
		"message":      "Sign in successfully",
		"access_token": tokenString,
	})
}

func Me(c *gin.Context) {
	user, err := c.Get("user")
	if err != true {
		c.AbortWithStatus(http.StatusUnauthorized)
	} else {
		c.JSON(http.StatusOK, gin.H{
			"user": user,
		})
	}
}
