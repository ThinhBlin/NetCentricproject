package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"backend/internal/response"
	"backend/internal/services"
)

type CategoryController struct{ svc *services.CategoryService }

func NewCategoryController(svc *services.CategoryService) *CategoryController {
	return &CategoryController{svc: svc}
}

func (cc *CategoryController) All(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil {
		limit = 10
	} else if limit < 1 {
		limit = 1
	} else if limit > 100 {
		limit = 100
	}

	categories, totalElements, totalPages, err := cc.svc.List(services.CategoryListParams{
		Page:        page,
		Limit:       limit,
		Search:      c.Query("search"),
		Description: c.Query("description"),
		Status:      c.Query("status"),
		SortBy:      c.Query("sortBy"),
		SortDir:     c.Query("sortDir"),
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load categories")
		return
	}

	r := response.New(http.StatusOK, "success")
	r.Categories = &categories
	r.TotalElements = &totalElements
	r.TotalPages = &totalPages
	response.Send(c, r)
}

func (cc *CategoryController) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(c, http.StatusNotFound, "Category Not Found")
		return
	}
	cat, err := cc.svc.GetByID(id)
	if err != nil {
		if errors.Is(err, services.ErrCategoryNotFound) {
			response.Error(c, http.StatusNotFound, "Category Not Found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to load category")
		return
	}
	r := response.New(http.StatusOK, "success")
	r.Category = cat
	response.Send(c, r)
}
