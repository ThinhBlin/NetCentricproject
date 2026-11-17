package services

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"backend/internal/models"
)

const (
	TokenLifetime  = 1000 * 60 * 60 * 24 * 30 * 6 * time.Millisecond // 180 days
	ExpirationText = "6 months"
)

// AuthError carries an HTTP status for the controller to report.
type AuthError struct {
	Status  int
	Message string
}

func (e *AuthError) Error() string { return e.Message }

func authErr(status int, msg string) error { return &AuthError{status, msg} }

type AuthService struct {
	db     *gorm.DB
	secret []byte
}

func NewAuthService(db *gorm.DB, secret string) *AuthService {
	return &AuthService{db: db, secret: []byte(secret)}
}

func (s *AuthService) Register(name, email, password, phone string) (*models.User, error) {
	email = strings.TrimSpace(email)
	var count int64
	if err := s.db.Model(&models.User{}).Where("email = ?", email).Count(&count).Error; err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, authErr(http.StatusBadRequest, "Email already registered")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return nil, err
	}
	u := &models.User{
		Name:        name,
		Email:       email,
		Password:    string(hash),
		PhoneNumber: phone,
		Role:        models.RoleStaff,
		IsActive:    true,
	}
	if err := s.db.Create(u).Error; err != nil {
		return nil, err
	}
	return u, nil
}

// Login verifies credentials and returns the user and a signed token.
func (s *AuthService) Login(email, password string) (*models.User, string, error) {
	var u models.User
	err := s.db.Where("email = ?", strings.TrimSpace(email)).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, "", authErr(http.StatusUnauthorized, "Invalid email or password")
	}
	if err != nil {
		return nil, "", err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password)) != nil {
		return nil, "", authErr(http.StatusUnauthorized, "Invalid email or password")
	}
	if !u.IsActive {
		return nil, "", authErr(http.StatusUnauthorized, "Account is deactivated. Please contact an administrator.")
	}
	tok, err := s.generateToken(u.Email)
	if err != nil {
		return nil, "", err
	}
	return &u, tok, nil
}

func (s *AuthService) generateToken(email string) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   email,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(TokenLifetime)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

// ParseToken validates the token (HS256 only) and returns the email (sub).
func (s *AuthService) ParseToken(raw string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(*jwt.Token) (any, error) {
		return s.secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return "", err
	}
	if claims.Subject == "" {
		return "", errors.New("missing subject")
	}
	return claims.Subject, nil
}

// UserForToken validates the token and loads the active user from MySQL.
func (s *AuthService) UserForToken(raw string) (*models.User, error) {
	email, err := s.ParseToken(raw)
	if err != nil {
		return nil, err
	}
	var u models.User
	if err := s.db.Where("email = ?", email).First(&u).Error; err != nil {
		return nil, err
	}
	if !u.IsActive {
		return nil, errors.New("user inactive")
	}
	return &u, nil
}
