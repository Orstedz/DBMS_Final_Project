# Hybrid Shopping Cart Application

A lightweight e-commerce shopping cart application that demonstrates caching, query optimization, and concurrency management using NodeCache, debounced API calls, and localStorage persistence.

## Features

- **Client-Side Cart Persistence**: Uses localStorage for instant UI feedback
- **Debounced Backend Sync**: Batches cart updates to reduce server load
- **NodeCache Integration**: In-memory caching with 60-second TTL
- **Query Optimization**: Indexed MySQL tables for fast lookups
- **Responsive UI**: Built with React and Tailwind CSS
- **Performance Testing**: Built-in load testing capability

## Architecture

### Frontend (React)

- **localStorage**: Immediate cart persistence and UI updates
- **Debounced API Calls**: Uses Lodash debounce (1s delay) to batch requests
- **Real-time Feedback**: Instant cart updates without server roundtrips
- **Error Handling**: Graceful handling of network failures and stock issues

### Backend (Node.js + Express)

- **NodeCache**: In-memory caching for product data (60s TTL)
- **MySQL**: Persistent storage with optimized indexes
- **RESTful APIs**: Clean separation of concerns
- **Transaction Management**: Ensures data consistency during checkout

### Database (MySQL)

- **Indexed Tables**: Optimized queries on products.id and cart.user_id
- **Foreign Key Constraints**: Data integrity enforcement
- **JSON Storage**: Flexible order item storage

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- Web browser with JavaScript enabled

### Installation

1. **Clone/Extract the project files**

   ```bash
   # Extract files to project directory
   cd hybrid-shopping-cart
   ```

2. **Install Node.js dependencies**

   ```bash
   npm install
   ```

3. **Setup Environment Variables**

   Create a `.env` file in the project root with your MySQL configuration:

   ```env
   # MySQL Database Configuration
   DB_HOST=localhost
   DB_USER=MinhPham
   DB_PASSWORD=123456
   DB_NAME=mydb
   DB_PORT=3306

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Cache Configuration
   CACHE_TTL=60
   ```

4. **Setup MySQL Database**

   ```bash
   # Login to MySQL
   mysql -u MinhPham -p

   # Run the schema file
   source schema.sql

   # Or execute manually:
   # CREATE DATABASE mydb;
   # USE mydb;
   # [Copy and paste schema.sql contents]
   ```

5. **Start the Application**

   ```bash
   npm start
   ```

6. **Access the Application**
   - Main App: http://localhost:3000
   - Load Test: http://localhost:3000/load_test.html
   - Health Check: http://localhost:3000/api/health

## Usage

### Shopping Cart Features

1. **Browse Products**: View available products with real-time stock information
2. **Add to Cart**: Click "Add to Cart" for instant UI feedback
3. **View Cart**: See cart contents updated in real-time from localStorage
4. **Modify Cart**: Add/remove items with automatic backend sync
5. **Checkout**: Process orders with stock validation and transaction management

### Performance Testing

1. Navigate to `/load_test.html`
2. Configure test parameters (request count, product ID)
3. Run load tests to see caching performance
4. Compare results with/without cache

### Cache Behavior

- **First Request**: Database query + cache storage
- **Subsequent Requests**: Cache hit (no database query)
- **Cache Expiry**: 60-second TTL, then refresh from database
- **Cache Invalidation**: Automatic on stock changes

## License

MIT License - feel free to use and modify for your projects.
