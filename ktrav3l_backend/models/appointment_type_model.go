package models

import (
	"gorm.io/gorm"
)

type AppointmentType struct {
	gorm.Model
	Name    string `gorm:"unique;not null"`
	Visible bool   `gorm:"default:true"`
}
