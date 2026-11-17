package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"backend/internal/response"
	"backend/internal/services"
)

type ProductController struct{ svc *services.ProductService }

func NewProductController(svc *services.ProductService) *ProductController {
	return &ProductController{svc: svc}
}

func (pc *ProductController) All(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	size, err := strconv.Atoi(c.DefaultQuery("size", "10"))
	if err != nil {
		size = 10
	} else if size < 1 {
		size = 1
	} else if size > 100 {
		size = 100
	}

	search := c.Query("search")
	if utf8.RuneCountInString(search) > 100 {
		response.Error(c, http.StatusBadRequest, "Search query must not exceed 100 characters")
		return
	}

	var categoryID *int64
	if raw := strings.TrimSpace(c.Query("categoryId")); raw != "" {
		if v, err := strconv.ParseInt(raw, 10, 64); err == nil {
			categoryID = &v
		}
	}

	var minPrice *float64
	if raw := strings.TrimSpace(c.Query("minPrice")); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			minPrice = &v
		}
	}

	var maxPrice *float64
	if raw := strings.TrimSpace(c.Query("maxPrice")); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			maxPrice = &v
		}
	}

	// warehouseId is accepted and ignored per spec.
	_ = c.Query("warehouseId")

	products, totalElements, totalPages, err := pc.svc.List(services.ProductListParams{
		Page:        page,
		Size:        size,
		SortBy:      c.DefaultQuery("sortBy", "id"),
		SortDir:     c.DefaultQuery("sortDir", "ASC"),
		CategoryID:  categoryID,
		MinPrice:    minPrice,
		MaxPrice:    maxPrice,
		StockStatus: c.Query("stockStatus"),
		Search:      search,
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load products")
		return
	}

	r := response.New(http.StatusOK, "success")
	r.Products = &products
	r.TotalElements = &totalElements
	r.TotalPages = &totalPages
	response.Send(c, r)
}

func (pc *ProductController) GetByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(c, http.StatusNotFound, "Product Not Found")
		return
	}
	prod, err := pc.svc.GetByID(id)
	if err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			response.Error(c, http.StatusNotFound, "Product Not Found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to load product")
		return
	}
	r := response.New(http.StatusOK, "success")
	r.Product = prod
	response.Send(c, r)
}

func (pc *ProductController) Update(c *gin.Context) {
	// Parse multipart form or urlencoded form
	_ = c.Request.ParseMultipartForm(10 << 20)

	rawID := strings.TrimSpace(c.PostForm("productId"))
	if rawID == "" {
		response.Error(c, http.StatusBadRequest, "productId is required")
		return
	}
	productID, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || productID <= 0 {
		response.Error(c, http.StatusBadRequest, "productId is required")
		return
	}

	in := services.ProductUpdateInput{
		ProductID:   productID,
		Name:        c.PostForm("name"),
		Description: c.PostForm("description"),
	}

	if rawPrice := strings.TrimSpace(c.PostForm("price")); rawPrice != "" {
		if v, err := strconv.ParseFloat(rawPrice, 64); err == nil {
			in.Price = &v
		}
	}
	if rawStock := strings.TrimSpace(c.PostForm("stockQuantity")); rawStock != "" {
		if v, err := strconv.Atoi(rawStock); err == nil {
			in.StockQuantity = &v
		}
	}
	if rawThreshold := strings.TrimSpace(c.PostForm("reorderThreshold")); rawThreshold != "" {
		if v, err := strconv.Atoi(rawThreshold); err == nil {
			in.ReorderThreshold = &v
		}
	}
	if rawCat := strings.TrimSpace(c.PostForm("categoryId")); rawCat != "" {
		if v, err := strconv.ParseInt(rawCat, 10, 64); err == nil {
			in.CategoryID = &v
		}
	}

	// imageFile and warehouseId are accepted and ignored per spec.

	if err := pc.svc.Update(in); err != nil {
		if errors.Is(err, services.ErrProductNotFound) {
			response.Error(c, http.StatusNotFound, "Product not found")
			return
		}
		if errors.Is(err, services.ErrCategoryNotFound) {
			response.Error(c, http.StatusNotFound, "Category not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "Failed to update product")
		return
	}

	response.Send(c, response.New(http.StatusOK, "Product was successfully updated"))
}
