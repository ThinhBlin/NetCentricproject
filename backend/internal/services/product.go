package services

import (
	"errors"
	"math"
	"strings"
	"time"

	"gorm.io/gorm"

	"backend/internal/models"
)

var ErrProductNotFound = errors.New("product not found")

type ProductListParams struct {
	Page        int
	Size        int
	SortBy      string
	SortDir     string
	CategoryID  *int64
	MinPrice    *float64
	MaxPrice    *float64
	StockStatus string
	Search      string
}

type ProductUpdateInput struct {
	ProductID        int64
	Name             string
	Description      string
	Price            *float64
	StockQuantity    *int
	ReorderThreshold *int
	CategoryID       *int64
}

var productOrderColumns = map[string]map[string]string{
	"id":             {"ASC": "id ASC", "DESC": "id DESC"},
	"name":           {"ASC": "name ASC, id ASC", "DESC": "name DESC, id ASC"},
	"price":          {"ASC": "price ASC, id ASC", "DESC": "price DESC, id ASC"},
	"stock_quantity": {"ASC": "stock_quantity ASC, id ASC", "DESC": "stock_quantity DESC, id ASC"},
	"created_at":     {"ASC": "created_at ASC, id ASC", "DESC": "created_at DESC, id ASC"},
}

type ProductService struct{ db *gorm.DB }

func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{db: db}
}

func (s *ProductService) List(p ProductListParams) ([]models.Product, int64, int, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Size < 1 {
		p.Size = 10
	} else if p.Size > 100 {
		p.Size = 100
	}

	q := s.db.Model(&models.Product{})

	if p.CategoryID != nil {
		q = q.Where("category_id = ?", *p.CategoryID)
	}
	if p.MinPrice != nil {
		q = q.Where("price >= ?", *p.MinPrice)
	}
	if p.MaxPrice != nil {
		q = q.Where("price <= ?", *p.MaxPrice)
	}
	switch strings.ToUpper(strings.TrimSpace(p.StockStatus)) {
	case "OUT_OF_STOCK":
		q = q.Where("stock_quantity = 0")
	case "LOW_STOCK":
		q = q.Where("stock_quantity > 0 AND stock_quantity <= reorder_threshold")
	case "IN_STOCK":
		q = q.Where("stock_quantity > reorder_threshold")
	}
	if search := strings.TrimSpace(p.Search); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where(
			"(LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)",
			like, like, like,
		)
	}

	var totalElements int64
	if err := q.Count(&totalElements).Error; err != nil {
		return nil, 0, 0, err
	}

	colMap, ok := productOrderColumns[strings.ToLower(strings.TrimSpace(p.SortBy))]
	if !ok {
		colMap = productOrderColumns["id"]
	}
	dir := "ASC"
	if strings.EqualFold(strings.TrimSpace(p.SortDir), "DESC") {
		dir = "DESC"
	}
	orderClause := colMap[dir]

	products := []models.Product{}
	offset := (p.Page - 1) * p.Size
	if err := q.Order(orderClause).Limit(p.Size).Offset(offset).Find(&products).Error; err != nil {
		return nil, 0, 0, err
	}

	totalPages := 0
	if totalElements > 0 {
		totalPages = int((totalElements + int64(p.Size) - 1) / int64(p.Size))
	}
	return products, totalElements, totalPages, nil
}

func (s *ProductService) GetByID(id int64) (*models.Product, error) {
	var prod models.Product
	if err := s.db.First(&prod, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	return &prod, nil
}

func (s *ProductService) Update(in ProductUpdateInput) error {
	var prod models.Product
	if err := s.db.First(&prod, in.ProductID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}

	if in.CategoryID != nil && *in.CategoryID > 0 {
		var catCount int64
		if err := s.db.Model(&models.Category{}).Where("id = ?", *in.CategoryID).Count(&catCount).Error; err != nil {
			return err
		}
		if catCount == 0 {
			return ErrCategoryNotFound
		}
		prod.CategoryID = in.CategoryID
	}

	if name := strings.TrimSpace(in.Name); name != "" {
		prod.Name = name
	}
	if desc := strings.TrimSpace(in.Description); desc != "" {
		prod.Description = &desc
	}
	if in.Price != nil && !math.IsNaN(*in.Price) && !math.IsInf(*in.Price, 0) && *in.Price >= 0 {
		prod.Price = *in.Price
	}
	if in.StockQuantity != nil && *in.StockQuantity >= 0 {
		prod.StockQuantity = *in.StockQuantity
	}
	if in.ReorderThreshold != nil && *in.ReorderThreshold >= 0 {
		prod.ReorderThreshold = *in.ReorderThreshold
	}

	prod.UpdatedAt = models.LocalTime{Time: time.Now()}
	return s.db.Save(&prod).Error
}
