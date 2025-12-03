package models

import (
	uuid "github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID       uuid.UUID `gorm:"primaryKey"`
	Email    string    `gorm:"unique"`
	Password string
}
