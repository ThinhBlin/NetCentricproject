package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/response"
	"backend/internal/services"
)

type DashboardController struct{ svc *services.DashboardService }

func NewDashboardController(svc *services.DashboardService) *DashboardController {
	return &DashboardController{svc: svc}
}

func (d *DashboardController) Stats(c *gin.Context) {
	stats, err := d.svc.Stats()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load dashboard stats")
		return
	}
	r := response.New(http.StatusOK, "success")
	r.DashboardStats = stats
	response.Send(c, r)
}
