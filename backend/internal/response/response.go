package response

import (
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/models"
)

// Response mirrors the old Spring `Response` class (null fields omitted).
type Response struct {
	Status         int          `json:"status"`
	Message        string       `json:"message,omitempty"`
	Token          string       `json:"token,omitempty"`
	Role           string       `json:"role,omitempty"`
	ExpirationTime string       `json:"expirationTime,omitempty"`
	User           *models.User `json:"user,omitempty"`
	DashboardStats any          `json:"dashboardStats,omitempty"`
	Timestamp      string       `json:"timestamp"`
}

func New(status int, msg string) *Response {
	return &Response{
		Status:    status,
		Message:   msg,
		Timestamp: time.Now().Format(models.LocalISO),
	}
}

func Send(c *gin.Context, r *Response) { c.JSON(r.Status, r) }

func Error(c *gin.Context, status int, msg string) {
	Send(c, New(status, msg))
}

func AbortError(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, New(status, msg))
}
