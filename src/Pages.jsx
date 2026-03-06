// Pages.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppContext, API, SECTIONS, CATEGORIES, fetchProductById, bustProductCache } from "./AppContext";

// ── Helper ────────────────────────────────────────────────────────────────────
const optimiseImg = (url) =>
  url ? url.replace("/upload/", "/upload/w_800,f_auto,q_auto/") : "";

// ── ProductCard (extracted — no more duplication) ─────────────────────────────
const ProductCard = ({ product, addToCart }) => (
  <div className="product-card">
    <Link to={`/product/${product.id}`} className="product-card-link">
      <div className="product-media">
        <img src={optimiseImg(product.imageUrl)} alt={product.name} loading="lazy" />
      </div>
      <div className="product-body">
        <p className="product-brand">{product.brand}</p>
        <h3 className="product-title">{product.name}</h3>
        <div className="product-bottom">
          <span className="product-price">Rs {product.price}</span>
        </div>
      </div>
    </Link>
    <div className="product-actions">
      <button
        onClick={() => { addToCart(product); alert("Added to cart!"); }}
        disabled={!product.productAvailable}
        className="product-cta"
      >
        {product.productAvailable ? "Add to Cart" : "Out of Stock"}
      </button>
    </div>
  </div>
);

// ── ProductSection ────────────────────────────────────────────────────────────
const ProductSection = ({ section, products, addToCart, selectedCategory }) => {
  const scrollRef = React.useRef(null);

  const sectionProducts = useMemo(
  () => (Array.isArray(products) ? products : []).filter((p) => {
    const inSection  = p.sections && p.sections.includes(section.id);
    const matchesCat = selectedCategory ? p.category === selectedCategory : true;
    return inSection && matchesCat;
  }),
  [products, section.id, selectedCategory]
);
  if (sectionProducts.length === 0) return null;

  const scrollLeft  = () => scrollRef.current?.scrollBy({ left: -400, behavior: "smooth" });
  const scrollRight = () => scrollRef.current?.scrollBy({ left:  400, behavior: "smooth" });

  return (
    <section className="product-section">
      <div className="section-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div><h2>{section.title}</h2><p>{section.subtitle}</p></div>
          {sectionProducts.length > 3 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={scrollLeft}  className="scroll-arrow">←</button>
              <button onClick={scrollRight} className="scroll-arrow">→</button>
            </div>
          )}
        </div>
      </div>
      <div className="product-grid" ref={scrollRef}>
        {sectionProducts.map((product) => (
          <ProductCard key={product.id} product={product} addToCart={addToCart} />
        ))}
      </div>
    </section>
  );
};

// ── Home ──────────────────────────────────────────────────────────────────────
export const Home = ({ selectedCategory, searchQuery, filteredProducts }) => {
  const { products, isLoading, error, addToCart } = React.useContext(AppContext);

  if (isLoading) return <div className="loading">Loading products...</div>;
  if (error)     return <div className="error">Error: {error}</div>;

  if (searchQuery && searchQuery.length >= 2) {
    return (
      <div className="home-page">
        <section className="product-section">
          <div className="section-header">
            <h2>🔍 Search Results for "{searchQuery}"</h2>
            <p>{filteredProducts.length} product(s) found</p>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="no-products"><p>No products found matching "{searchQuery}"</p></div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} addToCart={addToCart} />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

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

// ── ProductDetail ─────────────────────────────────────────────────────────────
export const ProductDetail = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { addToCart, refreshProducts } = React.useContext(AppContext);
  const [product,  setProduct]  = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchProductById(id);
        if (!cancelled) {
          setProduct(data);
          setImageUrl(data.imageUrl);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await API.delete(`/product/${id}`);
      bustProductCache(id);
      alert("Product deleted successfully!");
      refreshProducts();
      navigate("/");
    } catch {
      alert("Error deleting product");
    }
  }, [id, navigate, refreshProducts]);

  if (!product) return <div className="loading">Loading...</div>;

  return (
    <div className="product-detail">
      <div className="product-image-section">
        <img src={optimiseImg(imageUrl)} alt={product.name} loading="lazy" />
      </div>
      <div className="product-info-section">
        <div className="product-header">
          <span className="category-badge">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="brand">{product.brand}</p>
        </div>
        <div className="product-description">
          <h3>Product Description</h3>
          <p>{product.description}</p>
        </div>
        <div className="purchase-section">
          <div className="price-tag">Rs {product.price}</div>
          <button
            onClick={() => { addToCart(product); alert("Added to cart!"); }}
            disabled={!product.productAvailable}
            className="add-cart-btn-large"
          >
            {product.productAvailable ? "Add to Cart" : "Out of Stock"}
          </button>
          <p className="stock-info">Stock: {product.stockQuantity} {product.unit}</p>
        </div>
        {localStorage.getItem("token") && (
          <div className="admin-actions">
            <button onClick={() => navigate(`/admin/edit/${id}`)} className="edit-btn">Edit Product</button>
            <button onClick={handleDelete} className="delete-btn">Delete Product</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Cart ──────────────────────────────────────────────────────────────────────
export const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart } = React.useContext(AppContext);
  const [showCheckout, setShowCheckout] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const handleCheckout = useCallback(async () => {
    try {
      for (const item of cart) {
        await API.put(`/product/${item.id}`, { ...item, stockQuantity: item.stockQuantity - item.quantity });
        bustProductCache(item.id);
      }
      alert("Order placed successfully!");
      clearCart();
      setShowCheckout(false);
    } catch {
      alert("Error processing checkout");
    }
  }, [cart, clearCart]);

  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <Link to="/" className="continue-shopping">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>
      <div className="cart-items">
        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <img src={optimiseImg(item.imageUrl)} alt={item.name} loading="lazy" />
            <div className="item-details"><h3>{item.name}</h3><p>{item.brand}</p></div>
            <div className="quantity-controls">
              <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>-</button>
              <span>{item.quantity}</span>
             <button 
  onClick={() => updateQuantity(item.id, item.quantity + 1)}
  disabled={item.quantity >= item.stockQuantity}
>+</button>
            </div>
            <div className="item-price">Rs {item.price * item.quantity}</div>
            <button onClick={() => removeFromCart(item.id)} className="remove-btn">🗑️</button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <h2>Total: Rs {total.toFixed(2)}</h2>
        <button onClick={() => navigate("/checkout")} className="checkout-btn">Proceed to Checkout</button>
      </div>
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Purchase</h2>
            <div className="checkout-items">
              {cart.map((item) => (
                <div key={item.id} className="checkout-item">
                  <span>{item.name} x {item.quantity}</span>
                  <span>Rs {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <h3>Total: Rs {total.toFixed(2)}</h3>
            <div className="modal-actions">
              <button onClick={() => setShowCheckout(false)}>Cancel</button>
              <button onClick={handleCheckout} className="confirm-btn">Confirm Purchase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ProductForm ───────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  name: "", brand: "", description: "", price: "",
  category: "", stockQuantity: "", unit: "kilogram",
  productAvailable: true, sections: "all-products",
};

export const ProductForm = ({ isEdit = false }) => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { refreshProducts } = React.useContext(AppContext);

  const [formData,          setFormData]          = useState(DEFAULT_FORM);
  const [selectedSections,  setSelectedSections]  = useState(["all-products"]);
  const [image,             setImage]             = useState(null);
  const [existingImageUrl,  setExistingImageUrl]  = useState(null);

  // ✅ FIX: Revoke object URL on unmount / image change to prevent memory leak
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!image) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url); // cleanup on every image change
  }, [image]);

  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      try {
        const p = await fetchProductById(id);
        setFormData({
          name: p.name || "", brand: p.brand || "", description: p.description || "",
          price: p.price || "", category: p.category || "", stockQuantity: p.stockQuantity || "",
          unit: p.unit || "kilogram", productAvailable: p.productAvailable ?? true,
          sections: p.sections || "all-products",
        });
        if (p.imageUrl) setExistingImageUrl(p.imageUrl);
        if (p.sections) {
          const arr = p.sections.split(",").map((s) => s.trim());
          setSelectedSections(arr.length > 0 ? arr : ["all-products"]);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        alert("Failed to load product");
      }
    };
    load();
  }, [isEdit, id]);

  const handleSectionToggle = (sectionId) => {
    setSelectedSections((prev) => {
      if (prev.includes(sectionId)) {
        const next = prev.filter((s) => s !== sectionId);
        return next.length > 0 ? next : ["all-products"];
      }
      return [...prev, sectionId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    if (image) formDataToSend.append("imageFile", image);
    const productData = { ...formData, unit: formData.unit || "kilogram", sections: selectedSections.join(",") };
    formDataToSend.append("product", new Blob([JSON.stringify(productData)], { type: "application/json" }));

    try {
      if (isEdit) {
        await API.put(`/product/${id}`, formDataToSend, { headers: { "Content-Type": "multipart/form-data" } });
        bustProductCache(id);
        alert("Product updated successfully!");
      } else {
        await API.post("/product", formDataToSend, { headers: { "Content-Type": "multipart/form-data" } });
        bustProductCache();
        alert("Product added successfully!");
      }
      refreshProducts();
      navigate("/");
    } catch (err) {
      alert("Error saving product: " + (err.response?.data || err.message));
    }
  };

  const field = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="product-form-page">
      <h1>{isEdit ? "Edit Product" : "Add New Product"}</h1>
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-row">
          <div className="form-group">
            <label>Product Name</label>
            <input type="text" value={formData.name} onChange={(e) => field("name", e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Brand</label>
            <input type="text" value={formData.brand} onChange={(e) => field("brand", e.target.value)} required />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={formData.description} onChange={(e) => field("description", e.target.value)} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Price (Rs)</label>
            <input type="number" min="10" step="1" value={formData.price}
              onChange={(e) => { if (e.target.value >= 0) field("price", e.target.value); }} required />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={formData.category} onChange={(e) => field("category", e.target.value)} required>
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Stock Quantity</label>
            <input type="number" value={formData.stockQuantity} onChange={(e) => field("stockQuantity", e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <select value={formData.unit} onChange={(e) => field("unit", e.target.value)} required>
              <option value="kilogram">Kilograms (Kg)</option>
              <option value="gram">Grams (g)</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label style={{ marginBottom: "1rem", display: "block", fontSize: "1.1rem", fontWeight: "bold" }}>
            📂 Display in Sections
          </label>
          <div className="section-checkboxes">
            {SECTIONS.map((section) => (
              <label key={section.id} className="section-checkbox">
                <input type="checkbox" checked={selectedSections.includes(section.id)} onChange={() => handleSectionToggle(section.id)} />
                <span>{section.emoji} {section.title.replace(/🎉|🏔️|🔥|🌰/g, "").trim()}</span>
              </label>
            ))}
          </div>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Selected: {selectedSections.map((s) => SECTIONS.find((sec) => sec.id === s)?.title.replace(/🎉|🏔️|🔥|🌰/g, "").trim()).join(", ")}
          </p>
        </div>
        <div className="form-group">
          <label>Product Image</label>
          {/* ✅ FIX: Use previewUrl state instead of URL.createObjectURL inline */}
          {previewUrl ? (
            <div>
              <img src={previewUrl} alt="Preview" className="image-preview" style={{ maxWidth: "300px", marginBottom: "10px" }} />
              <p style={{ fontSize: "0.9rem", color: "green" }}>✅ New image selected</p>
            </div>
          ) : existingImageUrl ? (
            <div>
              <img src={existingImageUrl} alt="Current product" className="image-preview" style={{ maxWidth: "300px", marginBottom: "10px" }} />
              <p style={{ fontSize: "0.9rem", color: "blue" }}>📸 Current image (kept if no new image uploaded)</p>
            </div>
          ) : null}
          <input type="file" onChange={(e) => setImage(e.target.files[0])} accept="image/*" required={!isEdit && !existingImageUrl} />
          {isEdit && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "5px" }}>Leave empty to keep the current image</p>}
        </div>
        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" checked={formData.productAvailable} onChange={(e) => field("productAvailable", e.target.checked)} />
            Product Available
          </label>
        </div>
        <div className="form-actions">
          <button type="button" onClick={() => navigate("/")} className="cancel-btn">Cancel</button>
          <button type="submit" className="submit-btn">{isEdit ? "Update Product" : "Add Product"}</button>
        </div>
      </form>
    </div>
  );
};
