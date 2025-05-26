const { useState, useEffect, useCallback } = React;

// Header Component - Shows cart count and navigation
const Header = ({ cartCount }) => {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hybrid Shopping Cart</h1>
        <div className="flex items-center space-x-4">
          <span className="bg-blue-800 px-3 py-1 rounded-full">
            Cart: {cartCount} items
          </span>
        </div>
      </div>
    </header>
  );
};

// Product Card Component
const ProductCard = ({ product, onAddToCart, cartQuantity }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
      <p className="text-gray-600 mb-2">${product.price}</p>
      <p className="text-sm text-gray-500 mb-4">Stock: {product.stock}</p>

      <div className="flex items-center justify-between">
        <button
          onClick={() => onAddToCart(product.id)}
          disabled={product.stock <= 0}
          className={`px-4 py-2 rounded ${
            product.stock <= 0
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          Add to Cart
        </button>
        {cartQuantity > 0 && (
          <span className="text-green-600 font-semibold">
            In cart: {cartQuantity}
          </span>
        )}
      </div>
    </div>
  );
};

// Product List Component
const ProductList = ({ products, onAddToCart, cart }) => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            cartQuantity={cart[product.id] || 0}
          />
        ))}
      </div>
    </div>
  );
};

// Cart Component
const Cart = ({
  cart,
  products,
  onRemoveFromCart,
  onCheckout,
  isLoading,
  syncStatus,
}) => {
  const cartItems = Object.entries(cart).filter(
    ([_, quantity]) => quantity > 0
  );

  const getProductDetails = (productId) => {
    return products.find((p) => p.id === parseInt(productId));
  };

  const calculateTotal = () => {
    return cartItems
      .reduce((total, [productId, quantity]) => {
        const product = getProductDetails(productId);
        return total + (product ? product.price * quantity : 0);
      }, 0)
      .toFixed(2);
  };

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>
        <p className="text-gray-500">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Shopping Cart</h2>
        {syncStatus && (
          <span className="text-blue-500 text-sm">{syncStatus}</span>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {cartItems.map(([productId, quantity]) => {
          const product = getProductDetails(productId);
          if (!product) return null;

          return (
            <div
              key={productId}
              className="flex justify-between items-center border-b pb-2"
            >
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-gray-600">
                  ${product.price} x {quantity}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold">
                  ${(product.price * quantity).toFixed(2)}
                </span>
                <button
                  onClick={() => onRemoveFromCart(productId)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold">Total: ${calculateTotal()}</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={isLoading}
          className={`w-full py-3 rounded text-white font-semibold ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isLoading ? "Processing..." : "Checkout"}
        </button>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [notification, setNotification] = useState("");

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error loading cart from localStorage:", error);
      }
    }
    fetchProducts();
  }, []);

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      showNotification("Error loading products", "error");
    }
  };

  // Show notification helper
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(""), 3000);
  };

  // Debounced sync function - batches cart updates after 1 second of inactivity
  const debouncedSync = useCallback(
    _.debounce(async (cartData) => {
      try {
        setSyncStatus("Syncing...");
        const response = await fetch("/api/cart/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: 1, // Simplified - in real app, get from auth
            items: Object.entries(cartData)
              .filter(([_, quantity]) => quantity > 0)
              .map(([product_id, quantity]) => ({
                product_id: parseInt(product_id),
                quantity,
              })),
          }),
        });

        if (response.ok) {
          setSyncStatus("Synced ✓");
          setTimeout(() => setSyncStatus(""), 2000);
        } else {
          setSyncStatus("Sync failed");
        }
      } catch (error) {
        console.error("Sync error:", error);
        setSyncStatus("Sync failed");
      }
    }, 1000),
    []
  );

  // Add item to cart - instant UI feedback + debounced backend sync
  const handleAddToCart = (productId) => {
    setCart((prevCart) => {
      const newCart = {
        ...prevCart,
        [productId]: (prevCart[productId] || 0) + 1,
      };

      // Trigger debounced sync
      debouncedSync(newCart);

      return newCart;
    });

    showNotification("Item added to cart!");
  };

  // Remove item from cart
  const handleRemoveFromCart = (productId) => {
    setCart((prevCart) => {
      const newCart = { ...prevCart };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }

      // Trigger debounced sync
      debouncedSync(newCart);

      return newCart;
    });

    showNotification("Item removed from cart");
  };

  // Checkout process
  const handleCheckout = async () => {
    if (Object.keys(cart).filter((key) => cart[key] > 0).length === 0) {
      showNotification("Cart is empty", "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: 1,
          items: Object.entries(cart)
            .filter(([_, quantity]) => quantity > 0)
            .map(([product_id, quantity]) => ({
              product_id: parseInt(product_id),
              quantity,
            })),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setCart({});
        localStorage.removeItem("cart");
        showNotification("Order placed successfully!");
        // Refresh products to update stock
        fetchProducts();
      } else {
        showNotification(result.error || "Checkout failed", "error");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      showNotification("Checkout failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total cart items
  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header cartCount={cartCount} />

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 p-4 rounded shadow-lg z-50 ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-green-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ProductList
              products={products}
              onAddToCart={handleAddToCart}
              cart={cart}
            />
          </div>
          <div>
            <Cart
              cart={cart}
              products={products}
              onRemoveFromCart={handleRemoveFromCart}
              onCheckout={handleCheckout}
              isLoading={isLoading}
              syncStatus={syncStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Render the app
ReactDOM.render(<App />, document.getElementById("root"));
