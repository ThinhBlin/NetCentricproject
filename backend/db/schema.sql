-- Stripped-down schema (4 tables) for the Redis demo.
-- Uses a NEW database, inventory_db_v2. The old inventory_db is not touched.
-- Create the DB first:  CREATE DATABASE inventory_db_v2 CHARACTER SET utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id           BIGINT NOT NULL AUTO_INCREMENT,
  email        VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  password     VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255) NOT NULL,
  role         ENUM('ADMIN','MANAGER','STAFF') NOT NULL DEFAULT 'STAFF',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE categories (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  description   VARCHAR(500) DEFAULT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE products (
  id                BIGINT NOT NULL AUTO_INCREMENT,
  sku               VARCHAR(255) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  description       VARCHAR(255) DEFAULT NULL,
  price             DECIMAL(38,2) NOT NULL DEFAULT 0,
  stock_quantity    INT NOT NULL DEFAULT 0,
  reorder_threshold INT NOT NULL DEFAULT 10,
  category_id       BIGINT DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  KEY idx_products_category (category_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (stock_quantity >= 0)
);

CREATE TABLE transactions (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  product_id       BIGINT DEFAULT NULL,
  user_id          BIGINT DEFAULT NULL,
  transaction_type ENUM('PURCHASE','RETURN_TO_SUPPLIER','SALE') NOT NULL,
  status           ENUM('CANCELLED','COMPLETED','PENDING','PROCESSING') NOT NULL,
  total_price      DECIMAL(38,2) NOT NULL DEFAULT 0,
  total_products   INT NOT NULL DEFAULT 0,
  description      VARCHAR(255) DEFAULT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tx_created_at (created_at),
  KEY idx_tx_type_status (transaction_type, status),
  KEY idx_tx_product (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL ON UPDATE CASCADE
);
