package config

type EnvConfig struct {
	//Environment
	Environment string
	// Server
	Port string
	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	// JWT
	JWTSecret string
	// File Storage
	UploadsPath string
	// Email SMTP
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	SMTPFromName string
	// Frontend
	FrontendURL string
}

var Env *EnvConfig
