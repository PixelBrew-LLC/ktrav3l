package services

import (
	"fmt"
	"net/smtp"
	"pixelbrew-llc/ktrav3l_backend/config"
	"pixelbrew-llc/ktrav3l_backend/models"
	"strings"
	"time"
)

type EmailService struct{}

func NewEmailService() *EmailService {
	return &EmailService{}
}

// Función helper para formatear fechas en español
func (s *EmailService) formatSpanishDate(t time.Time) string {
	weekdays := map[time.Weekday]string{
		time.Monday:    "lunes",
		time.Tuesday:   "martes",
		time.Wednesday: "miércoles",
		time.Thursday:  "jueves",
		time.Friday:    "viernes",
		time.Saturday:  "sábado",
		time.Sunday:    "domingo",
	}

	months := map[time.Month]string{
		time.January:   "enero",
		time.February:  "febrero",
		time.March:     "marzo",
		time.April:     "abril",
		time.May:       "mayo",
		time.June:      "junio",
		time.July:      "julio",
		time.August:    "agosto",
		time.September: "septiembre",
		time.October:   "octubre",
		time.November:  "noviembre",
		time.December:  "diciembre",
	}

	weekday := weekdays[t.Weekday()]
	month := months[t.Month()]

	// Capitalizar primera letra del día
	weekday = strings.ToUpper(string(weekday[0])) + weekday[1:]

	return fmt.Sprintf("%s, %d de %s de %d", weekday, t.Day(), month, t.Year())
}

func (s *EmailService) getEmailHeader() string {
	logoURL := config.Env.FrontendURL + "/logo.png"
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #1a1a1a;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
            width: 100%%;
        }
        .email-body {
            width: 100%%;
            background-color: #f7f7f7;
            padding: 40px 20px;
            margin: 0;
        }
        .email-container { 
            max-width: 600px; 
            margin: 0 auto;
            background-color: #ffffff; 
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .logo-wrapper {
            text-align: center;
            padding: 40px 30px 30px;
            background-color: #ffffff;
        }
        .logo-wrapper img {
            max-width: 180px;
            height: auto;
            display: inline-block;
        }
        .title-wrapper {
            text-align: center;
            padding: 0 30px 30px;
            background-color: #ffffff;
            border-bottom: 1px solid #e5e7eb;
        }
        .title-wrapper h1 {
            font-size: 26px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0;
        }
        .content-wrapper {
            padding: 35px 30px;
            background-color: #ffffff;
        }
        .greeting {
            font-size: 16px;
            font-weight: 400;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .intro-text {
            font-size: 15px;
            color: #6b7280;
            margin-bottom: 28px;
            line-height: 1.5;
        }
        .info-row {
            margin: 14px 0;
            font-size: 15px;
            line-height: 1.6;
        }
        .info-label {
            color: #667eea;
            font-weight: 600;
            display: inline-block;
            min-width: 160px;
            vertical-align: top;
        }
        .info-value {
            color: #1a1a1a;
            display: inline;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
        }
        .note-box {
            margin: 24px 0;
            padding: 18px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.6;
        }
        .note-box strong {
            display: block;
            margin-bottom: 6px;
        }
        @media only screen and (max-width: 600px) {
            .email-body { padding: 20px 10px; }
            .content-wrapper { padding: 25px 20px; }
            .logo-wrapper { padding: 30px 20px 20px; }
            .title-wrapper { padding: 0 20px 20px; }
            .title-wrapper h1 { font-size: 22px; }
            .info-label { min-width: 120px; font-size: 14px; }
            .info-value { font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="email-body">
        <div class="email-container">
            <div class="logo-wrapper">
                <img src="%s" alt="KTrav3l" />
            </div>
            <div class="title-wrapper">`, logoURL)
}

func (s *EmailService) getEmailFooter() string {
	return `
            </div>
        </div>
    </div>
</body>
</html>`
}

func (s *EmailService) sendEmail(to, subject, body string) error {
	from := config.Env.SMTPFrom
	password := config.Env.SMTPPassword
	smtpHost := config.Env.SMTPHost
	smtpPort := config.Env.SMTPPort

	// Formato del mensaje con headers
	message := []byte(
		"From: " + config.Env.SMTPFromName + " <" + from + ">\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=UTF-8\r\n" +
			"\r\n" +
			body + "\r\n")

	auth := smtp.PlainAuth("", config.Env.SMTPUser, password, smtpHost)
	addr := smtpHost + ":" + smtpPort
	err := smtp.SendMail(addr, auth, from, []string{to}, message)
	return err
}

func (s *EmailService) SendAppointmentConfirmation(appointment *models.Appointment) error {
	subject := "Confirmación de reserva - " + appointment.ShortID

	appointmentDate := s.formatSpanishDate(appointment.AppointmentDate)
	appointmentTime := fmt.Sprintf("%02d:00", appointment.AppointmentHour)

	phoneFormatted := fmt.Sprintf("+1 (%s) %s-%s",
		appointment.PhoneNumber[0:3],
		appointment.PhoneNumber[4:7],
		appointment.PhoneNumber[8:12])

	body := s.getEmailHeader() + `
                <h1>Reserva Confirmada</h1>
            </div>
            <div class="content-wrapper">
                <p class="greeting">Hola <strong>` + appointment.FirstName + ` ` + appointment.LastName + `</strong>,</p>
                <p class="intro-text">Tu reserva ha sido recibida exitosamente. A continuación los detalles:</p>
                
                <div class="info-row">
                    <span class="info-label">Código de reserva:</span>
                    <span class="info-value">` + appointment.ShortID + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Tipo de cita:</span>
                    <span class="info-value">` + appointment.AppointmentType.Name + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">` + appointmentDate + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Hora:</span>
                    <span class="info-value">` + appointmentTime + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">` + appointment.Email + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">` + phoneFormatted + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Estado:</span>
                    <span class="status-badge" style="background: #fef3c7; color: #92400e;">Pendiente de confirmación</span>
                </div>

                <div class="note-box" style="background-color: #f0f9ff; border-left: 4px solid #667eea;">
                    <strong>¿Qué sigue?</strong>
                    Puedes consultar el estado de tu reserva en cualquier momento ingresando tu código en:<br>
                    <a href="` + config.Env.FrontendURL + `/status" style="color: #667eea; text-decoration: none; font-weight: 500;">` + config.Env.FrontendURL + `/status</a><br><br>
                    Recibirás una notificación por email una vez que tu reserva sea aprobada.
                </div>
        ` + s.getEmailFooter()

	return s.sendEmail(appointment.Email, subject, body)
}

func (s *EmailService) SendAppointmentApproved(appointment *models.Appointment) error {
	subject := "¡Tu reserva ha sido aprobada! - " + appointment.ShortID

	appointmentDate := s.formatSpanishDate(appointment.AppointmentDate)
	appointmentTime := fmt.Sprintf("%02d:00", appointment.AppointmentHour)

	phoneFormatted := fmt.Sprintf("+1 (%s) %s-%s",
		appointment.PhoneNumber[0:3],
		appointment.PhoneNumber[4:7],
		appointment.PhoneNumber[8:12])

	// Construir sección de meeting link
	meetingSection := ""
	if appointment.MeetingLink != "" {
		meetingSection = `
                <div class="info-row">
                    <span class="info-label">Enlace de reunión:</span>
                    <span class="info-value"><a href="` + appointment.MeetingLink + `" style="color: #667eea; text-decoration: none; font-weight: 500;">` + appointment.MeetingLink + `</a></span>
                </div>`
	}

	// Construir sección de nota del admin
	noteSection := ""
	if appointment.AdminNote != "" {
		noteSection = `
                <div class="note-box" style="background-color: #f0f9ff; border-left: 4px solid #667eea;">
                    <strong>Nota del administrador:</strong>
                    ` + appointment.AdminNote + `
                </div>`
	}

	body := s.getEmailHeader() + `
                <h1>¡Reserva Aprobada!</h1>
            </div>
            <div class="content-wrapper">
                <p class="greeting">Hola <strong>` + appointment.FirstName + ` ` + appointment.LastName + `</strong>,</p>
                <p class="intro-text">¡Excelentes noticias! Tu reserva ha sido <strong style="color: #10b981;">aprobada</strong>.</p>
                
                <div class="info-row">
                    <span class="info-label">Código de reserva:</span>
                    <span class="info-value">` + appointment.ShortID + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Tipo de cita:</span>
                    <span class="info-value">` + appointment.AppointmentType.Name + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">` + appointmentDate + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Hora:</span>
                    <span class="info-value">` + appointmentTime + `</span>
                </div>
                
                ` + meetingSection + `
                
                <div class="info-row">
                    <span class="info-label">Teléfono de contacto:</span>
                    <span class="info-value">` + phoneFormatted + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Estado:</span>
                    <span class="status-badge" style="background: #d1fae5; color: #065f46;">Aprobada</span>
                </div>

                ` + noteSection + `

                <div class="note-box" style="background-color: #fffbeb; border-left: 4px solid #f59e0b;">
                    <strong>Recordatorio:</strong>
                    Por favor asegúrate de estar disponible en la fecha y hora indicadas. Si tienes alguna pregunta, no dudes en contactarnos.
                </div>
        ` + s.getEmailFooter()

	return s.sendEmail(appointment.Email, subject, body)
}

func (s *EmailService) SendAppointmentRejected(appointment *models.Appointment, reason string) error {
	subject := "Información sobre tu reserva - " + appointment.ShortID

	appointmentDate := s.formatSpanishDate(appointment.AppointmentDate)
	appointmentTime := fmt.Sprintf("%02d:00", appointment.AppointmentHour)

	// Construir sección de nota del admin
	noteSection := ""
	if appointment.AdminNote != "" {
		noteSection = `
                <div class="note-box" style="background-color: #f0f9ff; border-left: 4px solid #667eea;">
                    <strong>Nota del administrador:</strong>
                    ` + appointment.AdminNote + `
                </div>`
	}

	body := s.getEmailHeader() + `
                <h1>Información sobre tu reserva</h1>
            </div>
            <div class="content-wrapper">
                <p class="greeting">Hola <strong>` + appointment.FirstName + ` ` + appointment.LastName + `</strong>,</p>
                <p class="intro-text">Lamentamos informarte que tu reserva no pudo ser procesada.</p>
                
                <div class="info-row">
                    <span class="info-label">Código de reserva:</span>
                    <span class="info-value">` + appointment.ShortID + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Tipo de cita:</span>
                    <span class="info-value">` + appointment.AppointmentType.Name + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Fecha solicitada:</span>
                    <span class="info-value">` + appointmentDate + ` a las ` + appointmentTime + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Estado:</span>
                    <span class="status-badge" style="background: #fee2e2; color: #991b1b;">Rechazada</span>
                </div>

                <div class="note-box" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
                    <strong>Razón:</strong>
                    ` + reason + `
                </div>
                
                ` + noteSection + `

                <div class="note-box" style="background-color: #f0f9ff; border-left: 4px solid #667eea;">
                    <strong>¿Qué puedes hacer?</strong>
                    Si deseas hacer una nueva reserva, puedes hacerlo en: <a href="` + config.Env.FrontendURL + `" style="color: #667eea; text-decoration: none; font-weight: 500;">` + config.Env.FrontendURL + `</a><br><br>
                    Si tienes alguna pregunta, no dudes en contactarnos.
                </div>
        ` + s.getEmailFooter()

	return s.sendEmail(appointment.Email, subject, body)
}

func (s *EmailService) SendAppointmentMoved(appointment *models.Appointment, oldDate, newDate string, oldHour, newHour int) error {
	subject := "Tu cita ha sido movida - " + appointment.ShortID

	noteSection := ""
	if appointment.AdminNote != "" {
		noteSection = `
                <div class="note-box" style="background-color: #f0f9ff; border-left: 4px solid #667eea;">
                    <strong>Nota del administrador:</strong>
                    ` + appointment.AdminNote + `
                </div>`
	}

	body := s.getEmailHeader() + `
                <h1>Cita Movida</h1>
            </div>
            <div class="content-wrapper">
                <p class="greeting">Hola <strong>` + appointment.FirstName + ` ` + appointment.LastName + `</strong>,</p>
                <p class="intro-text">Te informamos que tu cita <strong style="color: #667eea;">#` + appointment.ShortID + `</strong> ha sido movida a una nueva fecha y hora.</p>
                
                <div class="note-box" style="background-color: #fef2f2; border-left: 4px solid #ef4444;">
                    <strong>Fecha y hora anterior:</strong>
                    ` + oldDate + ` a las ` + fmt.Sprintf("%02d:00", oldHour) + `
                </div>

                <div class="note-box" style="background-color: #d1fae5; border-left: 4px solid #10b981;">
                    <strong>Nueva fecha y hora:</strong>
                    ` + newDate + ` a las ` + fmt.Sprintf("%02d:00", newHour) + `
                </div>

                <div class="info-row">
                    <span class="info-label">Tipo de cita:</span>
                    <span class="info-value">` + appointment.AppointmentType.Name + `</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Código de reserva:</span>
                    <span class="info-value">` + appointment.ShortID + `</span>
                </div>

                ` + noteSection + `

                <div class="note-box" style="background-color: #fffbeb; border-left: 4px solid #f59e0b;">
                    <strong>Importante:</strong>
                    Por favor ten en cuenta la nueva fecha y hora. Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.
                </div>
        ` + s.getEmailFooter()

	return s.sendEmail(appointment.Email, subject, body)
}
