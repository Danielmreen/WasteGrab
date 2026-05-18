-- WasteGrab Database Schema
-- MySQL/MariaDB SQL for creating all tables

-- Users table
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('CUSTOMER', 'COLLECTOR', 'ADMIN') DEFAULT 'CUSTOMER',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
);

CREATE TABLE address (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(100) NOT NULL,
  street LONGTEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  notes LONGTEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_default (is_default)
);

-- -- Waste Categories table
-- CREATE TABLE waste_categories (
--   id CHAR(36) PRIMARY KEY,
--   name VARCHAR(100) NOT NULL,
--   pricePerKg DECIMAL(10, 2) NOT NULL,
--   pointsPerKg INT DEFAULT 1,
--   isBanned BOOLEAN DEFAULT false,
--   description LONGTEXT,
--   INDEX idx_name (name),
--   INDEX idx_isBanned (isBanned)
-- );

-- -- Pickup Requests table
-- CREATE TABLE pickup_requests (
--   id CHAR(36) PRIMARY KEY,
--   user_id CHAR(36) NOT NULL,
--   collector_id CHAR(36),
--   address_text LONGTEXT NOT NULL,
--   status ENUM('PENDING', 'ACCEPTED', 'ARRIVED', 'VERIFIED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
--   ai_classification_label VARCHAR(100),
--   ai_confidence DECIMAL(5, 2),
--   estimated_price DECIMAL(10, 2),
--   final_price DECIMAL(10, 2),
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   completed_at DATETIME,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
--   FOREIGN KEY (collector_id) REFERENCES users(id) ON DELETE SET NULL,
--   INDEX idx_user_id (user_id),
--   INDEX idx_collector_id (collector_id),
--   INDEX idx_status (status),
--   INDEX idx_created_at (created_at),
--   INDEX idx_completed_at (completed_at)
-- );

-- -- Pickup Items table
-- CREATE TABLE pickup_items (
--   id CHAR(36) PRIMARY KEY,
--   pickup_request_id CHAR(36) NOT NULL,
--   category_id CHAR(36) NOT NULL,
--   estimated_weight DECIMAL(10, 2),
--   actual_weight DECIMAL(10, 2),
--   FOREIGN KEY (pickup_request_id) REFERENCES pickup_requests(id) ON DELETE CASCADE,
--   FOREIGN KEY (category_id) REFERENCES waste_categories(id) ON DELETE RESTRICT,
--   INDEX idx_pickup_request_id (pickup_request_id),
--   INDEX idx_category_id (category_id)
-- );

-- -- Pickup Images table
-- CREATE TABLE pickup_images (
--   id CHAR(36) PRIMARY KEY,
--   pickup_request_id CHAR(36) NOT NULL,
--   image_url LONGTEXT NOT NULL,
--   image_type ENUM('USER_UPLOAD', 'COLLECTOR_PROOF'),
--   uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (pickup_request_id) REFERENCES pickup_requests(id) ON DELETE CASCADE,
--   INDEX idx_pickup_request_id (pickup_request_id),
--   INDEX idx_image_type (image_type)
-- );

-- -- Transactions table
-- CREATE TABLE transactions (
--   id CHAR(36) PRIMARY KEY,
--   pickup_request_id CHAR(36) NOT NULL,
--   user_id CHAR(36) NOT NULL,
--   amount DECIMAL(10, 2) NOT NULL,
--   type ENUM('PAYMENT', 'POINTS_REDEEMED'),
--   status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'SUCCESS',
--   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (pickup_request_id) REFERENCES pickup_requests(id) ON DELETE RESTRICT,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
--   INDEX idx_pickup_request_id (pickup_request_id),
--   INDEX idx_user_id (user_id),
--   INDEX idx_type (type),
--   INDEX idx_status (status),
--   INDEX idx_created_at (created_at)
-- );

-- -- Todos table
-- CREATE TABLE todos (
--   id CHAR(36) PRIMARY KEY,
--   title VARCHAR(255) NOT NULL,
--   completed BOOLEAN DEFAULT false,
--   createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
--   updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   INDEX idx_completed (completed),
--   INDEX idx_createdAt (createdAt)
-- );

-- -- Sample data for waste categories
-- INSERT INTO waste_categories (id, name, pricePerKg, pointsPerKg, description) VALUES
--   (UUID(), 'Plastic', 5.00, 2, 'All types of plastic waste including bottles, bags, and containers'),
--   (UUID(), 'Metal', 15.00, 3, 'Aluminum, steel, and other metal waste'),
--   (UUID(), 'Paper', 2.00, 1, 'Newspapers, magazines, cardboard, and paper waste'),
--   (UUID(), 'Glass', 3.00, 1, 'Glass bottles and jars'),
--   (UUID(), 'Organic', 1.00, 1, 'Food waste and biodegradable materials');
