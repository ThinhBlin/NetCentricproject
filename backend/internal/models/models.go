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
	ID           int64  `gorm:"primaryKey;autoIncrement"`
	Name         string `gorm:"column:name"`
	DisplayOrder int    `gorm:"column:display_order"`
}

func (Category) TableName() string { return "categories" }

type Product struct {
	ID               int64     `gorm:"primaryKey;autoIncrement"`
	SKU              string    `gorm:"column:sku"`
	Name             string    `gorm:"column:name"`
	Price            float64   `gorm:"column:price"`
	StockQuantity    int       `gorm:"column:stock_quantity"`
	ReorderThreshold int       `gorm:"column:reorder_threshold"`
	CategoryID       *int64    `gorm:"column:category_id"`
	CreatedAt        time.Time `gorm:"column:created_at"`
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
