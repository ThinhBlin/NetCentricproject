package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"backend/internal/models"
	"backend/internal/response"
	"backend/internal/services"
)

const userKey = "user"

func ClientIP(c *gin.Context) string {
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		first, _, _ := strings.Cut(xff, ",")
		return strings.TrimSpace(first)
	}
	return c.Request.RemoteAddr
}

func RateLimit(rl services.RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rl.Allow(ClientIP(c)) {
			response.AbortError(c, http.StatusTooManyRequests, "Too many login attempts. Please try again in a minute.")
			return
		}
		c.Next()
	}
}

func JWTAuth(auth *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		raw, ok := strings.CutPrefix(h, "Bearer ")
		if !ok || raw == "" {
			response.AbortError(c, http.StatusUnauthorized, "Unauthorized")
			return
		}
		u, err := auth.UserForToken(raw)
		if err != nil {
			response.AbortError(c, http.StatusUnauthorized, "Unauthorized")
			return
		}
		c.Set(userKey, u)
		c.Next()
	}
}

func RequireRole(roles ...models.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		v, _ := c.Get(userKey)
		u, ok := v.(*models.User)
		if ok {
			for _, r := range roles {
				if u.Role == r {
					c.Next()
					return
				}
			}
		}
		response.AbortError(c, http.StatusForbidden, "Access denied")
	}
}

func CORS(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Vary", "Origin")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
