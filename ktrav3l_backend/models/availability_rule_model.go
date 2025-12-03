package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// IntArray es un tipo personalizado para arrays de enteros en PostgreSQL
type IntArray []int

func (a IntArray) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (a *IntArray) Scan(value interface{}) error {
	if value == nil {
		*a = []int{}
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, a)
}

// AvailabilityRule define reglas de disponibilidad por día de la semana o fechas específicas
type AvailabilityRule struct {
	gorm.Model
	DayOfWeek        *int       `gorm:"index"`           // 0=Domingo, 1=Lunes, ..., 6=Sábado (null para fechas específicas)
	SpecificDate     *time.Time `gorm:"type:date;index"` // Fecha específica (null para reglas de día de semana)
	UnavailableHours IntArray   `gorm:"type:jsonb"`      // Array de horas no disponibles [0-23]
	AllDay           bool       `gorm:"default:false"`   // true = todo el día bloqueado
}
