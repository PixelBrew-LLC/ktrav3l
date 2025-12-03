package utils

import "os"

func MustGetEnv(key string) string {
	value, exists := os.LookupEnv(key)
	if !exists {
		panic("Environment variable " + key + " is not set")
	}
	return value
}
