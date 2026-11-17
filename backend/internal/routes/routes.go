package routes

import (
	"github.com/gin-gonic/gin"

	"backend/internal/controllers"
	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/services"
)

func Register(
	r *gin.Engine,
	auth *services.AuthService,
	dash *services.DashboardService,
	prod *services.ProductService,
	cat *services.CategoryService,
	rl services.RateLimiter,
	corsOrigin string,
) {
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

	pc := controllers.NewProductController(prod)
	p := api.Group("/products", middleware.JWTAuth(auth))
	p.GET("/all", pc.All)
	p.GET("/:id", pc.GetByID)
	p.PUT("/update", middleware.RequireRole(models.RoleAdmin, models.RoleManager), pc.Update)

	cc := controllers.NewCategoryController(cat)
	cats := api.Group("/categories", middleware.JWTAuth(auth))
	cats.GET("/all", cc.All)
	cats.GET("/:id", cc.GetByID)
}
