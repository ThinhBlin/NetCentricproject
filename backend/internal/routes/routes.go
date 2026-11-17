package routes

import (
	"github.com/gin-gonic/gin"

	"backend/internal/controllers"
	"backend/internal/middleware"
	"backend/internal/services"
)

func Register(r *gin.Engine, auth *services.AuthService, dash *services.DashboardService, rl services.RateLimiter, corsOrigin string) {
	r.Use(middleware.CORS(corsOrigin))

	ac := controllers.NewAuthController(auth)
	api := r.Group("/api")
	{
		g := api.Group("/auth")
		g.POST("/login", middleware.RateLimit(rl), ac.Login)
		g.POST("/register", ac.Register)
	}

	dc := controllers.NewDashboardController(dash)
	d := api.Group("/dashboard", middleware.JWTAuth(auth))
	d.GET("/stats", dc.Stats)
}
