package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Config struct {
	Port       string
	MySQLDSN   string
	JWTSecret  string
	CORSOrigin string
}

// loadDotEnv reads KEY=VALUE lines from path into the process env
// (existing env vars win). A missing file is not an error.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if os.Getenv(k) == "" {
			os.Setenv(k, v)
		}
	}
}

func Load() (*Config, error) {
	// Look for .env in the current dir and up to 3 parents, plus backend/.env.
	prefix := ""
	for i := 0; i < 4; i++ {
		loadDotEnv(prefix + ".env")
		loadDotEnv(prefix + "backend/.env")
		prefix += "../"
	}
	c := &Config{
		Port:       getenv("PORT", "8080"),
		MySQLDSN:   os.Getenv("MYSQL_DSN"),
		JWTSecret:  os.Getenv("JWT_SECRET"),
		CORSOrigin: getenv("CORS_ORIGIN", "http://localhost:5173"),
	}
	if c.MySQLDSN == "" {
		return nil, fmt.Errorf("MYSQL_DSN is required")
	}
	if c.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}
	return c, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func OpenMySQL(dsn string) (*gorm.DB, error) {
	return gorm.Open(mysql.Open(dsn), &gorm.Config{})
}
