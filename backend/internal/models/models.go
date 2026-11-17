package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin   Role = "ADMIN"
	RoleManager Role = "MANAGER"
	RoleStaff   Role = "STAFF"
)

type User struct {
	ID          int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Email       string    `gorm:"column:email" json:"email"`
	Name        string    `gorm:"column:name" json:"name"`
	Password    string    `gorm:"column:password" json:"-"`
	PhoneNumber string    `gorm:"column:phone_number" json:"phoneNumber"`
	Role        Role      `gorm:"column:role" json:"role"`
	IsActive    bool      `gorm:"column:is_active" json:"isActive"`
	CreatedAt   LocalTime `gorm:"column:created_at" json:"createdAt"`
}

func (User) TableName() string { return "users" }

func (u *User) BeforeCreate(*gorm.DB) error {
	if u.CreatedAt.IsZero() {
		u.CreatedAt = LocalTime{time.Now()}
	}
	return nil
}

type Category struct {
	ID           int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string    `gorm:"column:name" json:"name"`
	Description  *string   `gorm:"column:description" json:"description"`
	ImageURL     *string   `gorm:"-" json:"imageUrl"`
	IsActive     bool      `gorm:"column:is_active" json:"isActive"`
	DisplayOrder int       `gorm:"column:display_order" json:"displayOrder"`
	CreatedAt    LocalTime `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    *string   `gorm:"-" json:"updatedAt"`
	CreatedBy    *int64    `gorm:"-" json:"createdBy"`
	UpdatedBy    *int64    `gorm:"-" json:"updatedBy"`
	ProductIDs   []int64   `gorm:"-" json:"productIDs"`
}

func (Category) TableName() string { return "categories" }

type Product struct {
	ID               int64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name             string    `gorm:"column:name" json:"name"`
	SKU              string    `gorm:"column:sku" json:"sku"`
	Price            float64   `gorm:"column:price" json:"price"`
	StockQuantity    int       `gorm:"column:stock_quantity" json:"stockQuantity"`
	ReorderThreshold int       `gorm:"column:reorder_threshold" json:"reorderThreshold"`
	WarehouseID      *int64    `gorm:"-" json:"warehouseId"`
	Description      *string   `gorm:"column:description" json:"description"`
	ExpiryDate       *string   `gorm:"-" json:"expiryDate"`
	ImageURL         *string   `gorm:"-" json:"imageUrl"`
	CreatedAt        LocalTime `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt        LocalTime `gorm:"column:updated_at" json:"updatedAt"`
	IsDeleted        bool      `gorm:"-" json:"isDeleted"`
	CategoryID       *int64    `gorm:"column:category_id" json:"categoryId"`
	CreatedBy        *int64    `gorm:"-" json:"createdBy"`
	UpdatedBy        *int64    `gorm:"-" json:"updatedBy"`
}

func (Product) TableName() string { return "products" }

type Transaction struct {
	ID              int64     `gorm:"primaryKey;autoIncrement"`
	ProductID       *int64    `gorm:"column:product_id"`
	UserID          *int64    `gorm:"column:user_id"`
	TransactionType string    `gorm:"column:transaction_type"`
	Status          string    `gorm:"column:status"`
	TotalPrice      float64   `gorm:"column:total_price"`
	TotalProducts   int       `gorm:"column:total_products"`
	Description     *string   `gorm:"column:description"`
	CreatedAt       time.Time `gorm:"column:created_at"`
}

func (Transaction) TableName() string { return "transactions" }
