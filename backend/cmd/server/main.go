package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/config"
	"backend/internal/routes"
	"backend/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	db, err := config.OpenMySQL(cfg.MySQLDSN)
	if err != nil {
		log.Fatalf("mysql: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	rlCtx, cancelRL := context.WithCancel(context.Background())
	rl := services.NewMemoryRateLimiter(rlCtx, 10, time.Minute)
	auth := services.NewAuthService(db, cfg.JWTSecret)

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	routes.Register(
		router,
		auth,
		services.NewDashboardService(db),
		services.NewProductService(db),
		services.NewCategoryService(db),
		rl,
		cfg.CORSOrigin,
	)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-ctx.Done()
	stop() // a second Ctrl+C kills immediately
	log.Println("shutting down")

	exit := 0
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("forced shutdown: %v", err)
		_ = srv.Close()
		exit = 1
	}

	cancelRL() // 1) stop rate limiter goroutine
	if sqlDB, err := db.DB(); err == nil {
		if err := sqlDB.Close(); err != nil { // 2) close MySQL
			log.Printf("mysql close: %v", err)
			exit = 1
		}
	}
	log.Println("server stopped")
	os.Exit(exit)
}
