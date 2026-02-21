package models

import (
	uuid "github.com/google/uuid"
	"gorm.io/gorm"
)

type MeetingPlatform struct {
	gorm.Model
	ID       uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name     string    `gorm:"unique;not null"`
	IsActive bool      `gorm:"default:true"`
}

func (m *MeetingPlatform) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
