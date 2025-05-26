-- Create database
CREATE DATABASE IF NOT EXISTS mydb;
USE mydb;

-- Create products table with index on id
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product_id (id)
);

-- Create cart table with index on user_id for query optimization
CREATE TABLE IF NOT EXISTS cart (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    items JSON NOT NULL,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_orders (user_id),
    INDEX idx_created_at (created_at)
);

-- Insert sample products
INSERT INTO products (name, price, stock) VALUES
('Wireless Headphones', 99.99, 50),
('Smartphone Case', 24.99, 100),
('Bluetooth Speaker', 79.99, 30),
('Laptop Stand', 45.99, 25),
('USB-C Cable', 19.99, 75),
('Wireless Mouse', 34.99, 40),
('Keyboard', 89.99, 20),
('Monitor', 299.99, 15),
('Webcam', 69.99, 35),
('Power Bank', 39.99, 60)
ON DUPLICATE KEY UPDATE name=VALUES(name);