package main

import (
	"net/http"

	"pixelbrew-llc/ktrav3l_backend/controllers"
	"pixelbrew-llc/ktrav3l_backend/initializers"
	"pixelbrew-llc/ktrav3l_backend/middleware"

	"github.com/gin-gonic/gin"
)

func init() {
	initializers.LoadEnvVariables()
	initializers.ConnectToDB()
	initializers.SyncDB()
}

func main() {
	r := gin.Default()

	// Aumentar el límite de tamaño del body para archivos (10MB)
	r.MaxMultipartMemory = 10 << 20 // 10 MB

	// CORS middleware
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Permitir ktrav3l.com y localhost para desarrollo
		if origin == "https://ktrav3l.com" || origin == "https://www.ktrav3l.com" ||
			origin == "http://localhost:3001" || origin == "http://localhost:3000" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Server is running",
		})
	})

	// Auth routes
	r.POST("/sign-in", controllers.SignIn)
	r.GET("/me", middleware.RequireAuth, controllers.Me)

	// Public appointment routes
	r.POST("/appointments", controllers.CreateAppointment)
	r.GET("/appointments/short/:shortID", controllers.GetAppointmentByShortID)
	r.GET("/appointments/receipt/:shortID", controllers.GetReceipt)
	r.GET("/appointments/available-hours", controllers.GetAvailableHours)
	r.GET("/appointments/types", controllers.GetAppointmentTypes)
	r.GET("/bank-accounts", controllers.GetBankAccounts)

	// Admin routes (protected)
	admin := r.Group("/admin")
	admin.Use(middleware.RequireAuth)
	{
		// Appointments management
		admin.GET("/appointments", controllers.GetAllAppointments)
		admin.GET("/appointments/:id", controllers.GetAppointmentByID)
		admin.GET("/appointments/:id/receipt", controllers.GetReceiptByID)
		admin.POST("/appointments/:id/approve", controllers.ApproveAppointment)
		admin.POST("/appointments/:id/reject", controllers.RejectAppointment)
		admin.POST("/appointments/:id/done", controllers.MarkAppointmentDone)
		admin.PATCH("/appointments/:id/move", controllers.MoveAppointment)
		admin.GET("/calendar", controllers.GetCalendarData)

		// Appointment types management
		admin.GET("/appointment-types", controllers.GetAllAppointmentTypes)
		admin.POST("/appointment-types", controllers.CreateAppointmentType)
		admin.PATCH("/appointment-types/:id/visibility", controllers.UpdateAppointmentTypeVisibility)

		// Availability rules management
		admin.GET("/availability-rules", controllers.GetAvailabilityRules)
		admin.POST("/availability-rules/weekday", controllers.CreateWeekdayRule)
		admin.POST("/availability-rules/specific-date", controllers.CreateSpecificDateRule)
		admin.PUT("/availability-rules/:id", controllers.UpdateAvailabilityRule)
		admin.DELETE("/availability-rules/:id", controllers.DeleteAvailabilityRule)
		admin.DELETE("/availability-rules/weekday/:day", controllers.DeleteWeekdayRule)
		admin.DELETE("/availability-rules/specific-date/:date", controllers.DeleteSpecificDateRule)

		// Bank accounts management
		admin.GET("/bank-accounts", controllers.GetBankAccounts)
		admin.POST("/bank-accounts", controllers.CreateBankAccount)
		admin.PATCH("/bank-accounts/:id", controllers.UpdateBankAccount)
		admin.DELETE("/bank-accounts/:id", controllers.DeleteBankAccount)
	}

	r.Run()
}
