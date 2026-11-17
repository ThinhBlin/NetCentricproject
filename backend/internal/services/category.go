package services

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"backend/internal/models"
)

var ErrCategoryNotFound = errors.New("category not found")

type CategoryListParams struct {
	Page        int
	Limit       int
	Search      string
	Description string
	Status      string
	SortBy      string
	SortDir     string
}

var categoryOrderColumns = map[string]map[string]string{
	"id":            {"ASC": "id ASC", "DESC": "id DESC"},
	"name":          {"ASC": "name ASC, id ASC", "DESC": "name DESC, id ASC"},
	"display_order": {"ASC": "display_order ASC, id ASC", "DESC": "display_order DESC, id ASC"},
	"created_at":    {"ASC": "created_at ASC, id ASC", "DESC": "created_at DESC, id ASC"},
}

type CategoryService struct{ db *gorm.DB }

func NewCategoryService(db *gorm.DB) *CategoryService {
	return &CategoryService{db: db}
}

func (s *CategoryService) List(p CategoryListParams) ([]models.Category, int64, int, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Limit < 1 {
		p.Limit = 10
	} else if p.Limit > 100 {
		p.Limit = 100
	}

	q := s.db.Model(&models.Category{})

	if search := strings.TrimSpace(p.Search); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("(LOWER(name) LIKE ? OR LOWER(COALESCE(description, '')) LIKE ?)", like, like)
	}
	if desc := strings.TrimSpace(p.Description); desc != "" {
		like := "%" + strings.ToLower(desc) + "%"
		q = q.Where("LOWER(COALESCE(description, '')) LIKE ?", like)
	}
	switch strings.ToUpper(strings.TrimSpace(p.Status)) {
	case "ACTIVE":
		q = q.Where("is_active = ?", true)
	case "INACTIVE":
		q = q.Where("is_active = ?", false)
	}

	var totalElements int64
	if err := q.Count(&totalElements).Error; err != nil {
		return nil, 0, 0, err
	}

	colMap, ok := categoryOrderColumns[strings.ToLower(strings.TrimSpace(p.SortBy))]
	if !ok {
		colMap = categoryOrderColumns["display_order"]
	}
	dir := "ASC"
	if strings.EqualFold(strings.TrimSpace(p.SortDir), "DESC") {
		dir = "DESC"
	}
	orderClause := colMap[dir]

	categories := []models.Category{}
	offset := (p.Page - 1) * p.Limit
	if err := q.Order(orderClause).Limit(p.Limit).Offset(offset).Find(&categories).Error; err != nil {
		return nil, 0, 0, err
	}

	totalPages := 0
	if totalElements > 0 {
		totalPages = int((totalElements + int64(p.Limit) - 1) / int64(p.Limit))
	}
	return categories, totalElements, totalPages, nil
}

func (s *CategoryService) GetByID(id int64) (*models.Category, error) {
	var cat models.Category
	if err := s.db.First(&cat, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrCategoryNotFound
		}
		return nil, err
	}
	return &cat, nil
}
