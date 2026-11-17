package services

import (
	"gorm.io/gorm"
)

// WarehouseStat keeps the old JSON name. The demo has no warehouses, so each
// entry describes a category instead (capacity is omitted).
type WarehouseStat struct {
	ID            int64  `json:"id"`
	Name          string `json:"name"`
	ProductCount  int64  `json:"productCount"`
	TotalQuantity int64  `json:"totalQuantity"`
}

// DashboardStats mirrors the old Spring DashboardStats class.
type DashboardStats struct {
	TotalActiveProducts int64           `json:"totalActiveProducts"`
	LowStockCount       int64           `json:"lowStockCount"`
	OutOfStockCount     int64           `json:"outOfStockCount"`
	TotalStockValue     float64         `json:"totalStockValue"`
	InventoryCost       float64         `json:"inventoryCost"`
	EstimatedMargin     float64         `json:"estimatedMargin"`
	WarehouseStats      []WarehouseStat `json:"warehouseStats"`
}

// costRatio: the schema has no cost column, so cost is assumed to be 70% of price.
const costRatio = 0.7

type DashboardService struct{ db *gorm.DB }

func NewDashboardService(db *gorm.DB) *DashboardService { return &DashboardService{db: db} }

func (s *DashboardService) Stats() (*DashboardStats, error) {
	var agg struct {
		Total        int64
		Low          int64
		out_of_stock int64
		Value        float64
	}
	err := s.db.Table("products").Select(
		"COUNT(*) AS total, " +
			"COALESCE(SUM(stock_quantity <= reorder_threshold), 0) AS low, " +
			"COALESCE(SUM(stock_quantity = 0), 0) AS out_of_stock, " +
			"COALESCE(SUM(price * stock_quantity), 0) AS value").Scan(&agg).Error
	if err != nil {
		return nil, err
	}

	cats := []WarehouseStat{}
	err = s.db.Table("categories c").
		Select("c.id AS id, c.name AS name, COUNT(p.id) AS product_count, COALESCE(SUM(p.stock_quantity), 0) AS total_quantity").
		Joins("LEFT JOIN products p ON p.category_id = c.id").
		Group("c.id, c.name, c.display_order").
		Order("c.display_order, c.id").
		Scan(&cats).Error
	if err != nil {
		return nil, err
	}

	cost := agg.Value * costRatio
	return &DashboardStats{
		TotalActiveProducts: agg.Total,
		LowStockCount:       agg.Low,
		OutOfStockCount:     agg.out_of_stock,
		TotalStockValue:     agg.Value,
		InventoryCost:       cost,
		EstimatedMargin:     agg.Value - cost,
		WarehouseStats:      cats,
	}, nil
}
