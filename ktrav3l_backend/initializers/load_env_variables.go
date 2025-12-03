package initializers

import (
	"os"
	"pixelbrew-llc/ktrav3l_backend/config"
	"pixelbrew-llc/ktrav3l_backend/utils"

	"github.com/joho/godotenv"
)

func LoadEnvVariables() {
	env := os.Getenv("ENVIRONMENT")
	if env != "production" {
		err := godotenv.Load()
		if err != nil {
			panic("Error loading environment variables")
		}
	}
	config.Env = &config.EnvConfig{
		Environment:  utils.MustGetEnv("ENVIRONMENT"),
		Port:         utils.MustGetEnv("PORT"),
		DBHost:       utils.MustGetEnv("DB_HOST"),
		DBPort:       utils.MustGetEnv("DB_PORT"),
		DBUser:       utils.MustGetEnv("DB_USER"),
		DBPassword:   utils.MustGetEnv("DB_PASSWORD"),
		DBName:       utils.MustGetEnv("DB_NAME"),
		JWTSecret:    utils.MustGetEnv("JWT_SECRET"),
		UploadsPath:  utils.MustGetEnv("UPLOADS_PATH"),
		SMTPHost:     utils.MustGetEnv("SMTP_HOST"),
		SMTPPort:     utils.MustGetEnv("SMTP_PORT"),
		SMTPUser:     utils.MustGetEnv("SMTP_USER"),
		SMTPPassword: utils.MustGetEnv("SMTP_PASSWORD"),
		SMTPFrom:     utils.MustGetEnv("SMTP_FROM"),
		SMTPFromName: utils.MustGetEnv("SMTP_FROM_NAME"),
		FrontendURL:  utils.MustGetEnv("FRONTEND_URL"),
	}
}
