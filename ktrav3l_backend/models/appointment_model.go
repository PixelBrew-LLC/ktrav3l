package models

import (
	"time"

	uuid "github.com/google/uuid"
	"gorm.io/gorm"
)

type AppointmentStatus string

const (
	StatusPending  AppointmentStatus = "pending"
	StatusApproved AppointmentStatus = "approved"
	StatusRejected AppointmentStatus = "rejected"
	StatusDone     AppointmentStatus = "done"
)

type BankType string

const (
	BankReservas  BankType = "banreservas"
	BankPopular   BankType = "popular"
	BankBHD       BankType = "bhd"
	BankLeon      BankType = "leon"
	BankSantaCruz BankType = "santacruz"
	BankProgreso  BankType = "progreso"
	BankAdemi     BankType = "ademi"
	BankOther     BankType = "other"
)

type Appointment struct {
	gorm.Model
	ID                uuid.UUID         `gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ShortID           string            `gorm:"uniqueIndex;size:8"` // UUID corto hasta primer -
	FirstName         string            `gorm:"not null"`
	LastName          string            `gorm:"not null"`
	Email             string            `gorm:"not null"`
	PhoneNumber       string            `gorm:"not null;size:12"` // ###-###-####
	AppointmentDate   time.Time         `gorm:"not null"`
	AppointmentHour   int               `gorm:"not null"` // Hora en formato 24h (0-23)
	AppointmentTypeID uint              `gorm:"not null"`
	AppointmentType   AppointmentType   `gorm:"foreignKey:AppointmentTypeID"`
	BankAccountID     *uuid.UUID        // ID de la cuenta bancaria seleccionada
	BankAccount       *BankAccount      `gorm:"foreignKey:BankAccountID"`
	BankTransfer      BankType          `gorm:"not null"` // Mantenemos por compatibilidad
	ReceiptPath       string            `gorm:"not null"` // Ruta al archivo del comprobante
	Status            AppointmentStatus `gorm:"default:'pending'"`
	RejectionReason   string            // Razón de rechazo (opcional)
	MeetingLink       string            // Enlace de la reunión (Zoom/Google Meet)
	AdminNote         string            // Nota del admin para el cliente
}

// BeforeCreate hook para generar el ShortID
func (a *Appointment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	// Generar ShortID: primeros 8 caracteres del UUID (hasta primer -)
	a.ShortID = a.ID.String()[:8]
	return nil
}
