package models

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// DateOnly es un tipo personalizado que envuelve time.Time pero siempre
// serializa a JSON como "YYYY-MM-DD" (sin hora ni zona horaria).
// Esto evita problemas donde la zona horaria del servidor convierte
// "2026-02-20 00:00:00 UTC" a "2026-02-19T20:00:00-04:00".
type DateOnly struct {
	time.Time
}

// MarshalJSON serializa la fecha como "YYYY-MM-DD"
func (d DateOnly) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, d.Time.UTC().Format("2006-01-02"))), nil
}

// UnmarshalJSON deserializa desde "YYYY-MM-DD"
func (d *DateOnly) UnmarshalJSON(b []byte) error {
	s := string(b)
	// Quitar comillas
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		s = s[1 : len(s)-1]
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return err
	}
	d.Time = t.UTC()
	return nil
}

// Value implementa driver.Valuer para GORM/SQL
func (d DateOnly) Value() (driver.Value, error) {
	return d.Time.UTC(), nil
}

// Scan implementa sql.Scanner para GORM/SQL
func (d *DateOnly) Scan(value interface{}) error {
	if value == nil {
		d.Time = time.Time{}
		return nil
	}
	switch v := value.(type) {
	case time.Time:
		d.Time = v.UTC()
		return nil
	default:
		return fmt.Errorf("cannot scan type %T into DateOnly", value)
	}
}

// NewDateOnly crea un DateOnly desde una fecha parseada
func NewDateOnly(t time.Time) DateOnly {
	return DateOnly{Time: t.UTC()}
}
