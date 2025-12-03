package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"pixelbrew-llc/ktrav3l_backend/config"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func RequireAuth(c *gin.Context) {
	accessToken := c.GetHeader("Authorization")
	if accessToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Access token is required",
		})
		c.Abort()
		return
	}

	// Check if the Authorization header starts with "Bearer "
	if !strings.HasPrefix(accessToken, "Bearer ") {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid access token",
		})
		c.Abort()
		return
	}

	// Extract the token part from the header
	tokenString := strings.TrimPrefix(accessToken, "Bearer ")

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return []byte(config.Env.JWTSecret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"message": "Invalid access token",
		})
		c.Abort()
		return
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if float64(time.Now().Unix()) > claims["exp"].(float64) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "Access token expired",
			})
			c.Abort()
			return
		}

		var user models.User
		if err := initializers.DB.First(&user, "id = ?", claims["sub"]).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"message": "User not found",
			})
			fmt.Println(err)
			c.Abort()
			return
		}

		c.Set("user", user)

		c.Next()
	} else {
		c.AbortWithStatus(http.StatusUnauthorized)
	}
}
