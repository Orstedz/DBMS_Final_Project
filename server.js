// Load environment variables
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const NodeCache = require("node-cache");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize NodeCache with configurable TTL
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 60 });

// Middleware
app.use(express.json());
app.use(express.static("."));

// MySQL connection configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopping_cart",
  port: parseInt(process.env.DB_PORT) || 3306,
};

let db;

// Initialize database connection with better error handling
async function initDB() {
  try {
    console.log("Connecting to MySQL database...");
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`Database: ${dbConfig.database}`);
    console.log(`User: ${dbConfig.user}`);

    db = await mysql.createConnection(dbConfig);

    // Test the connection
    await db.execute("SELECT 1");

    console.log("✅ Successfully connected to MySQL database");
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🔧 Cache TTL: ${cache.options.stdTTL} seconds`);
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}`);

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("Please check your database credentials in the .env file");
    } else if (error.code === "ECONNREFUSED") {
      console.error("Please ensure MySQL server is running");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error(
        `Database '${dbConfig.database}' does not exist. Please create it first.`
      );
    }

    process.exit(1);
  }
}

// API Routes

// GET /api/products - Fetch all products (cached)
app.get("/api/products", async (req, res) => {
  try {
    const cacheKey = "all_products";
    let products = cache.get(cacheKey);

    if (!products) {
      console.log("📊 Cache miss - fetching products from database");
      const [rows] = await db.execute("SELECT * FROM products ORDER BY id");
      products = rows;
      cache.set(cacheKey, products);
      console.log(`📦 Cached ${products.length} products`);
    } else {
      console.log("⚡ Cache hit - returning cached products");
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET /api/products/:id - Fetch single product (cached)
app.get("/api/products/:id", async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const cacheKey = `product:${productId}`;

    let product = cache.get(cacheKey);

    if (!product) {
      console.log(
        `📊 Cache miss - fetching product ${productId} from database`
      );
      const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [
        productId,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      product = rows[0];
      cache.set(cacheKey, product);
      console.log(`📦 Cached product ${productId}: ${product.name}`);
    } else {
      console.log(`⚡ Cache hit - returning cached product ${productId}`);
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// POST /api/cart/sync - Sync cart with backend
app.post("/api/cart/sync", async (req, res) => {
  try {
    const { user_id, items } = req.body;

    if (!user_id || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Clear existing cart items for user
    await db.execute("DELETE FROM cart WHERE user_id = ?", [user_id]);

    // Insert new cart items
    if (items.length > 0) {
      const placeholders = items.map(() => "(?, ?, ?)").join(", ");
      const values = items.flatMap((item) => [
        user_id,
        item.product_id,
        item.quantity,
      ]);
      await db.execute(
        `INSERT INTO cart (user_id, product_id, quantity) VALUES ${placeholders}`,
        values
      );
    }

    console.log(`🛒 Cart synced for user ${user_id}: ${items.length} items`);
    res.json({ success: true, message: "Cart synced successfully" });
  } catch (error) {
    console.error("Error syncing cart:", error);
    res.status(500).json({ error: "Failed to sync cart" });
  }
});

// POST /api/checkout - Process checkout
app.post("/api/checkout", async (req, res) => {
  try {
    const { user_id, items } = req.body;

    if (!user_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid checkout data" });
    }

    // Start transaction
    await db.beginTransaction();

    try {
      // Validate stock for each item
      for (const item of items) {
        const cacheKey = `product:${item.product_id}`;
        let product = cache.get(cacheKey);

        if (!product) {
          const [rows] = await db.execute(
            "SELECT * FROM products WHERE id = ?",
            [item.product_id]
          );
          if (rows.length === 0) {
            throw new Error(`Product ${item.product_id} not found`);
          }
          product = rows[0];
          cache.set(cacheKey, product);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }
      }

      // Update stock for each item
      for (const item of items) {
        await db.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [
          item.quantity,
          item.product_id,
        ]);

        // Invalidate cache for this product
        cache.del(`product:${item.product_id}`);
      }

      // Create order
      const orderData = JSON.stringify(items);
      const [result] = await db.execute(
        "INSERT INTO orders (user_id, items, created_at) VALUES (?, ?, NOW())",
        [user_id, orderData]
      );

      // Clear user's cart
      await db.execute("DELETE FROM cart WHERE user_id = ?", [user_id]);

      // Invalidate products cache
      cache.del("all_products");

      await db.commit();

      console.log(`✅ Order created: ID ${result.insertId}, User ${user_id}`);
      res.json({
        success: true,
        message: "Order placed successfully",
        order_id: result.insertId,
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Performance testing endpoint
app.get("/api/test-performance/:id", async (req, res) => {
  const startTime = Date.now();
  const productId = parseInt(req.params.id);
  const cacheKey = `product:${productId}`;

  try {
    let product = cache.get(cacheKey);
    let fromCache = true;

    if (!product) {
      fromCache = false;
      const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [
        productId,
      ]);
      if (rows.length > 0) {
        product = rows[0];
        cache.set(cacheKey, product);
      }
    }

    const responseTime = Date.now() - startTime;

    res.json({
      product,
      responseTime,
      fromCache,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    await db.execute("SELECT 1");

    // Get cache stats
    const cacheStats = cache.getStats();

    res.json({
      status: "healthy",
      database: "connected",
      cache: {
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate:
          cacheStats.hits > 0
            ? (
                (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) *
                100
              ).toFixed(2) + "%"
            : "0%",
      },
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`⚡ Cache TTL: ${cache.options.stdTTL} seconds`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  if (db) {
    await db.end();
    console.log("📊 Database connection closed");
  }
  process.exit(0);
});

startServer();
