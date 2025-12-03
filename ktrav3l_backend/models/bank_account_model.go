package models

import (
	uuid "github.com/google/uuid"
	"gorm.io/gorm"
)

type BankAccount struct {
	gorm.Model
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	BankName      string    `gorm:"not null"` // Nombre del banco
	AccountNumber string    `gorm:"not null"` // Número de cuenta
	IsActive      bool      `gorm:"default:true"`
}

func (b *BankAccount) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
