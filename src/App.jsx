// App.jsx - FIXED SEARCH VERSION
import React, { useState, useEffect, createContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import "./styles.css";
import AdminLogin from "./AdminLogin";
import Checkout from "./Checkout";

export const AppContext = createContext();

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
});
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Define sections - add more here to extend
const SECTIONS = [
  { id: "new-arrivals", title: "🎉 New Arrivals", subtitle: "Freshly added to our store", emoji: "✨" },
  { id: "kashmiri-special", title: "🏔️ Kashmiri Special", subtitle: "Premium authentic products from Kashmir", emoji: "🏔️" },
  { id: "best-sellers", title: "🔥 Best Sellers", subtitle: "Customer favorites", emoji: "🔥" },
  { id: "all-products", title: "🌰 All Products", subtitle: "Complete collection", emoji: "🛍️" }
];

// ========================================
// CONTEXT PROVIDER
// ========================================
const AppProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(
    JSON.parse(localStorage.getItem("cart")) || []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const response = await API.get("/products");

      const productsWithImages = await Promise.all(
        response.data.map(async (product) => {
          try {
            const imgResponse = await API.get(`/product/${product.id}/image`, {
              responseType: "blob",
            });
            const imageUrl = URL.createObjectURL(imgResponse.data);
            return { ...product, imageUrl };
          } catch (error) {
            return { ...product, imageUrl: "" };
          }
        })
      );

      setProducts(productsWithImages);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingIndex = cart.findIndex((item) => item.id === product.id);
    let updatedCart;

    if (existingIndex !== -1) {
      updatedCart = cart.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      updatedCart = [...cart, { ...product, quantity: 1 }];
    }

    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter((item) => item.id !== productId);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const updateQuantity = (productId, newQuantity) => {
    const updatedCart = cart.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.setItem("cart", JSON.stringify([]));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <AppContext.Provider
      value={{
        products,
        cart,
        isLoading,
        error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshProducts: fetchProducts,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// ========================================
// NAVBAR - FIXED
// ========================================
const Navbar = ({ onCategorySelect, onSearch }) => {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light-theme"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const categories = [
    "Almonds",
    "Cashews",
    "Dates",
    "Walnuts",
    "Pistachios",
    "Raisins",
    "Figs",
  ];

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleSearch = async (value) => {
    setSearchQuery(value);

    if (value.length >= 2) {
      try {
        const response = await API.get(`/products/search?keyword=${value}`);
        
        // Add image URLs to search results
        const resultsWithImages = await Promise.all(
          response.data.map(async (product) => {
            try {
              const imgResponse = await API.get(`/product/${product.id}/image`, {
                responseType: "blob",
              });
              const imageUrl = URL.createObjectURL(imgResponse.data);
              return { ...product, imageUrl };
            } catch (error) {
              return { ...product, imageUrl: "" };
            }
          })
        );
        
        setSearchResults(resultsWithImages);
        setShowResults(true);

        // ✅ Send search results to Home page
        onSearch(value, resultsWithImages);
      } catch (error) {
        console.error("Search error:", error);
      }
    } else {
      setSearchResults([]);
      setShowResults(false);

      // ✅ Reset Home page to normal sections
      onSearch("", []);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light-theme" ? "dark-theme" : "light-theme");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={() => {
          setSearchQuery("");
          onSearch("", []);
        }}>
          🌰 AYaan's Dry-fruit Store
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="nav-link" onClick={() => {
            setSearchQuery("");
            onSearch("", []);
          }}>
            Home
          </Link>

          {localStorage.getItem("token") && (
            <Link to="/admin/add" className="nav-link">
              Add Product
            </Link>
          )}


          <div className={`dropdown ${dropdownOpen ? "open" : ""}`}>
            <button
              className="nav-link dropdown-btn"
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              Categories ▾
            </button>

            <div className="dropdown-content">
              <button
                onClick={() => {
                  onCategorySelect("");
                  setDropdownOpen(false);
                  setSearchQuery("");
                  onSearch("", []);
                }}
              >
                All Products
              </button>

              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onCategorySelect(cat);
                    setDropdownOpen(false);
                    setSearchQuery("");
                    onSearch("", []);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="search-container">
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="search-input"
            />

            {showResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <Link
                    key={result.id}
                    to={`/product/${result.id}`}
                    className="search-result-item"
                    onClick={() => {
                      setShowResults(false);
                      setSearchQuery("");
                      onSearch("", []);
                    }}
                  >
                    {result.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <button onClick={toggleTheme} className="theme-toggle">
            {theme === "dark-theme" ? "☀️" : "🌙"}
          </button>

          <Link to="/cart" className="cart-link">
            🛒 Cart
          </Link>
        </div>
      </div>
    </nav>
  );
};

// ========================================
// PRODUCT SECTION COMPONENT - WITH HORIZONTAL SCROLL
// ========================================
// ========================================
// PRODUCT SECTION COMPONENT - WITH HORIZONTAL SCROLL
// ========================================
const ProductSection = ({ section, products, addToCart, selectedCategory }) => {
  const scrollContainerRef = React.useRef(null);

  // Filter products for this section
  const sectionProducts = products.filter((p) => {
    const inSection = p.sections && p.sections.includes(section.id);
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return inSection && matchesCategory;
  });

  if (sectionProducts.length === 0) return null;

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  return (
    <section className="product-section">
      <div className="section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2>{section.title}</h2>
            <p>{section.subtitle}</p>
          </div>
          
          {/* Scroll Arrows - Only show if more than 3 products */}
          {sectionProducts.length > 3 && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={scrollLeft} className="scroll-arrow">←</button>
              <button onClick={scrollRight} className="scroll-arrow">→</button>
            </div>
          )}
        </div>
      </div>

      {/* THIS REF IS IMPORTANT FOR SCROLLING */}
      <div className="product-grid" ref={scrollContainerRef}>
        {sectionProducts.map((product) => (
          <div key={product.id} className="product-card">
            <Link to={`/product/${product.id}`} className="product-card-link">
              <div className="product-media">
                <img
                  src={product.imageUrl || "/placeholder.jpg"}
                  alt={product.name}
                  loading="lazy"
                />
              </div>

              <div className="product-body">
                <p className="product-brand">{product.brand}</p>
                <h3 className="product-title">{product.name}</h3>

                <div className="product-bottom">
                  <span className="product-price">${product.price}</span>
                </div>
              </div>
            </Link>

            <div className="product-actions">
              <button
                onClick={() => {
                  addToCart(product);
                  alert("Added to cart!");
                }}
                disabled={!product.productAvailable}
                className="product-cta"
              >
                {product.productAvailable ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ========================================
// HOME PAGE - FIXED
// ========================================
const Home = ({ selectedCategory, searchQuery, filteredProducts }) => {
  const { products, isLoading, error, addToCart } = React.useContext(AppContext);

  if (isLoading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // ✅ If searching, show only matching products
  if (searchQuery && searchQuery.length >= 2) {
    return (
      <div className="home-page">
        <section className="product-section">
          <div className="section-header">
            <h2>🔍 Search Results for "{searchQuery}"</h2>
            <p>{filteredProducts.length} product(s) found</p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>No products found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <Link to={`/product/${product.id}`} className="product-card-link">
                    <div className="product-media">
                      <img
                        src={product.imageUrl || "/placeholder.jpg"}
                        alt={product.name}
                        loading="lazy"
                      />
                    </div>

                    <div className="product-body">
                      <p className="product-brand">{product.brand}</p>
                      <h3 className="product-title">{product.name}</h3>

                      <div className="product-bottom">
                        <span className="product-price">${product.price}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="product-actions">
                    <button
                      onClick={() => {
                        addToCart(product);
                        alert("Added to cart!");
                      }}
                      disabled={!product.productAvailable}
                      className="product-cta"
                    >
                      {product.productAvailable ? "Add to Cart" : "Out of Stock"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ✅ Normal section rendering
  return (
    <div className="home-page">
      {SECTIONS.map((section) => (
        <ProductSection
          key={section.id}
          section={section}
          products={products}
          addToCart={addToCart}
          selectedCategory={selectedCategory}
        />
      ))}
    </div>
  );
};

// ========================================
// PRODUCT DETAIL PAGE
// ========================================
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, refreshProducts } = React.useContext(AppContext);
  const [product, setProduct] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await API.get(`/product/${id}`);
        setProduct(response.data);

        const imgResponse = await API.get(`/product/${id}/image`, {
          responseType: "blob",
        });
        setImageUrl(URL.createObjectURL(imgResponse.data));
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    };
    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await API.delete(`/product/${id}`);
        alert("Product deleted successfully!");
        refreshProducts();
        navigate("/");
      } catch (error) {
        alert("Error deleting product");
      }
    }
  };

  if (!product) return <div className="loading">Loading...</div>;

  return (
    <div className="product-detail">
      <div className="product-image-section">
        <img src={imageUrl} alt={product.name} />
      </div>

      <div className="product-info-section">
        <div className="product-header">
          <span className="category-badge">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="brand">{product.brand}</p>
          <p className="release-date">
            Listed: {new Date(product.releaseDate).toLocaleDateString()}
          </p>
        </div>

        <div className="product-description">
          <h3>Product Description</h3>
          <p>{product.description}</p>
        </div>

        <div className="purchase-section">
          <div className="price-tag">${product.price}</div>
          <button
            onClick={() => {
              addToCart(product);
              alert("Added to cart!");
            }}
            disabled={!product.productAvailable}
            className="add-cart-btn-large"
          >
            {product.productAvailable ? "Add to Cart" : "Out of Stock"}
          </button>
          <p className="stock-info">Stock: {product.stockQuantity} units</p>
        </div>

      {localStorage.getItem("token") && (
  <div className="admin-actions">
    <button onClick={() => navigate(`/admin/edit/${id}`)} className="edit-btn">
      Edit Product
    </button>
    <button onClick={handleDelete} className="delete-btn">
      Delete Product
    </button>
  </div>
)}

      </div>
    </div>
  );
};

// ========================================
// CART PAGE
// ========================================
const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart } =
    React.useContext(AppContext);
  const [showCheckout, setShowCheckout] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    try {
      for (const item of cart) {
        const updatedStock = item.stockQuantity - item.quantity;
        await API.put(`/product/${item.id}`, {
          ...item,
          stockQuantity: updatedStock,
        });
      }
      alert("Order placed successfully!");
      clearCart();
      setShowCheckout(false);
    } catch (error) {
      alert("Error processing checkout");
    }
  };

  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <Link to="/" className="continue-shopping">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>
      <div className="cart-items">
        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <img src={item.imageUrl} alt={item.name} />
            <div className="item-details">
              <h3>{item.name}</h3>
              <p>{item.brand}</p>
            </div>
            <div className="quantity-controls">
              <button
                onClick={() =>
                  updateQuantity(item.id, Math.max(1, item.quantity - 1))
                }
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                +
              </button>
            </div>
            <div className="item-price">${item.price * item.quantity}</div>
            <button
              onClick={() => removeFromCart(item.id)}
              className="remove-btn"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h2>Total: ${total.toFixed(2)}</h2>
            <button onClick={() => navigate("/checkout")} 
                className="checkout-btn" >
                Proceed to Checkout
      </button>
      </div>

      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Purchase</h2>
            <div className="checkout-items">
              {cart.map((item) => (
                <div key={item.id} className="checkout-item">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <span>${item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <h3>Total: ${total.toFixed(2)}</h3>
            <div className="modal-actions">
              <button onClick={() => setShowCheckout(false)}>Cancel</button>
              <button onClick={handleCheckout} className="confirm-btn">
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================
// PRODUCT FORM
// ========================================
const ProductForm = ({ isEdit = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshProducts } = React.useContext(AppContext);

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    description: "",
    price: "",
    category: "",
    stockQuantity: "",
    releaseDate: "",
    productAvailable: false,
    sections: "all-products",
  });

  const [image, setImage] = useState(null);
  const [selectedSections, setSelectedSections] = useState(["all-products"]);

  useEffect(() => {
    if (isEdit && id) {
      const fetchProduct = async () => {
        try {
          const response = await API.get(`/product/${id}`);
          setFormData(response.data);
          
          if (response.data.sections) {
            setSelectedSections(response.data.sections.split(","));
          }

          const imgResponse = await API.get(`/product/${id}/image`, {
            responseType: "blob",
          });
          setImage(new File([imgResponse.data], response.data.imageName));
        } catch (error) {
          console.error("Error fetching product:", error);
        }
      };
      fetchProduct();
    }
  }, [isEdit, id]);

  const handleSectionToggle = (sectionId) => {
    setSelectedSections((prev) => {
      if (prev.includes(sectionId)) {
        const newSections = prev.filter((s) => s !== sectionId);
        return newSections.length > 0 ? newSections : ["all-products"];
      } else {
        return [...prev, sectionId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    if (image) formDataToSend.append("imageFile", image);

    const sectionsString = selectedSections.join(",");

    formDataToSend.append(
      "product",
      new Blob([JSON.stringify({ ...formData, sections: sectionsString })], {
        type: "application/json",
      })
    );

    try {
      if (isEdit) {
        await API.put(`/product/${id}`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Product updated successfully!");
      } else {
        await API.post("/product", formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Product added successfully!");
      }

      refreshProducts();
      navigate("/");
    } catch (error) {
      alert("Error saving product");
      console.error(error);
    }
  };

  return (
    <div className="product-form-page">
      <h1>{isEdit ? "Edit Product" : "Add New Product"}</h1>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-row">
          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) =>
                setFormData({ ...formData, brand: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Price ($)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              required
            >
              <option value="">Select category</option>
              <option value="Almonds">Almonds</option>
              <option value="Cashews">Cashews</option>
              <option value="Dates">Dates</option>
              <option value="Walnuts">Walnuts</option>
              <option value="Pistachios">Pistachios</option>
              <option value="Raisins">Raisins</option>
              <option value="Figs">Figs</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Stock Quantity</label>
            <input
              type="number"
              value={formData.stockQuantity}
              onChange={(e) =>
                setFormData({ ...formData, stockQuantity: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Release Date</label>
            <input
              type="date"
              value={formData.releaseDate}
              onChange={(e) =>
                setFormData({ ...formData, releaseDate: e.target.value })
              }
              required
            />
          </div>
        </div>

        {/* SECTION SELECTION */}
        <div className="form-group">
          <label style={{ marginBottom: '1rem', display: 'block', fontSize: '1.1rem', fontWeight: 'bold' }}>
            📂 Display in Sections (Choose where this product appears)
          </label>
          <div className="section-checkboxes">
            {SECTIONS.map((section) => (
              <label key={section.id} className="section-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSections.includes(section.id)}
                  onChange={() => handleSectionToggle(section.id)}
                />
                <span>{section.emoji} {section.title.replace(/🎉|🏔️|🔥|🌰/g, '').trim()}</span>
              </label>
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Selected: {selectedSections.map(s => SECTIONS.find(sec => sec.id === s)?.title.replace(/🎉|🏔️|🔥|🌰/g, '').trim()).join(', ')}
          </p>
        </div>

        <div className="form-group">
          <label>Product Image</label>

          {image && (
            <img
              src={URL.createObjectURL(image)}
              alt="Preview"
              className="image-preview"
            />
          )}

          <input
            type="file"
            onChange={(e) => setImage(e.target.files[0])}
            accept="image/*"
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.productAvailable}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  productAvailable: e.target.checked,
                })
              }
            />
            Product Available
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="cancel-btn"
          >
            Cancel
          </button>

          <button type="submit" className="submit-btn">
            {isEdit ? "Update Product" : "Add Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ========================================
// MAIN APP - FIXED
// ========================================
function App() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app">
          <Navbar
            onCategorySelect={setSelectedCategory}
            onSearch={(query, results) => {
              setSearchQuery(query);
              setFilteredProducts(results);
            }}
          />

          <main className="main-content">
            <Routes>
              <Route
                path="/"
                element={
                  <Home
                    selectedCategory={selectedCategory}
                    searchQuery={searchQuery}
                    filteredProducts={filteredProducts}
                  />
                }
              />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/admin/add" element={<ProductForm />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/admin/edit/:id"
                element={<ProductForm isEdit={true} />}
              />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;