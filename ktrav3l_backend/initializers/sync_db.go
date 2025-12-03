package initializers

import "pixelbrew-llc/ktrav3l_backend/models"

func SyncDB() {
	DB.AutoMigrate(
		&models.User{},
		&models.AppointmentType{},
		&models.AvailabilityRule{},
		&models.BankAccount{},
		&models.Appointment{},
	)
}
