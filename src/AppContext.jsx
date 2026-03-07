// AppContext.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

export const AppContext = createContext();

// ─── Axios instance ───────────────────────────────────────────────────────────
export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Only redirect on 401 for write operations — not public GETs
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = error.config?.method?.toUpperCase();
    const isWriteRequest = ["POST", "PUT", "DELETE"].includes(method);
    if (error.response?.status === 401 && isWriteRequest) {
      localStorage.removeItem("token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export const isAdmin = () => !!localStorage.getItem("token");

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/";
};

// ─── Constants ────────────────────────────────────────────────────────────────
export const SECTIONS = [
  { id: "new-arrivals",     title: "🎉 New Arrivals",      subtitle: "Freshly added to our store",             emoji: "✨"  },
  { id: "kashmiri-special", title: "🏔️ Kashmiri Special", subtitle: "Premium authentic products from Kashmir", emoji: "🏔️" },
  { id: "best-sellers",     title: "🔥 Best Sellers",      subtitle: "Customer favorites",                     emoji: "🔥"  },
  { id: "all-products",     title: "🌰 All Products",      subtitle: "Complete collection",                    emoji: "🛍️" },
];
export const CATEGORIES = ["Almonds", "Cashews", "Dates", "Walnuts", "Pistachios", "Raisins", "Figs"];

// ─── TTLs ─────────────────────────────────────────────────────────────────────
const PRODUCT_LIST_TTL   = 5 * 60 * 1000;  // 5 min
const PRODUCT_DETAIL_TTL = 5 * 60 * 1000;  // 5 min
const SEARCH_TTL         = 2 * 60 * 1000;  // 2 min

// ─── In-memory caches ─────────────────────────────────────────────────────────
// These live for the entire browser session (cleared on refresh).
// Render free tier spins down after inactivity — caching means only the
// very first visitor hits the cold server; everyone else gets instant data.
const productListCache   = { data: null, ts: 0 };
const productDetailCache = new Map();   // id  → { data, ts }
const searchCache        = new Map();   // key → { data, ts }

const isFresh = (ts, ttl) => Date.now() - ts < ttl;

// ─── Exported cache-aware fetch helpers ───────────────────────────────────────

/** Fetch a single product – uses detail cache (called from ProductDetail page). */
export const fetchProductById = async (id) => {
  const cached = productDetailCache.get(String(id));
  if (cached && isFresh(cached.ts, PRODUCT_DETAIL_TTL)) return cached.data;
  const { data } = await API.get(`/product/${id}`);
  productDetailCache.set(String(id), { data, ts: Date.now() });
  return data;
};

/** Fetch search results – uses search cache with 2 min TTL (called from Navbar). */
export const fetchSearch = async (keyword) => {
  const key = keyword.trim().toLowerCase();
  const cached = searchCache.get(key);
  if (cached && isFresh(cached.ts, SEARCH_TTL)) return cached.data;
  const { data } = await API.get(`/products/search?keyword=${keyword}`);
  searchCache.set(key, { data, ts: Date.now() });
  return data;
};

/** Bust the list cache + optionally one detail entry after a write operation. */
export const bustProductCache = (id) => {
  productListCache.data = null;
  productListCache.ts   = 0;
  if (id) productDetailCache.delete(String(id));
};

// ─── Provider ─────────────────────────────────────────────────────────────────
const AppProvider = ({ children }) => {
  const [products,  setProducts]  = useState([]);
  const [cart,      setCart]      = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  // Persist cart on change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // ── fetchProducts: cache-first, network fallback ──────────────────────────
  const fetchProducts = useCallback(async (force = false) => {
    // Cache hit — serve immediately, no spinner, zero network
    if (!force && productListCache.data && isFresh(productListCache.ts, PRODUCT_LIST_TTL)) {
      setProducts(productListCache.data);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await API.get("/products");
      productListCache.data = data;
      productListCache.ts   = Date.now();
      setProducts(data);
      setError(null);
    } catch (err) {
      // Serve stale data if available rather than showing an error
      if (productListCache.data) setProducts(productListCache.data);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // After any write: bust cache then force a fresh fetch
  const refreshProducts = useCallback(() => {
    bustProductCache();
    fetchProducts(true);
  }, [fetchProducts]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
  setCart((prev) => {
    const idx = prev.findIndex((item) => item.id === product.id);
    if (idx !== -1) {
      const current = prev[idx];
      if (current.quantity >= current.stockQuantity) return prev; // ← stop here
      return prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item);
    }
    return [...prev, { ...product, quantity: 1 }];
  });
}, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, newQuantity) => {
    setCart((prev) => prev.map((item) => item.id === productId ? { ...item, quantity: newQuantity } : item));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo(() => ({
    products, cart, isLoading, error,
    addToCart, removeFromCart, updateQuantity, clearCart, refreshProducts,
  }), [products, cart, isLoading, error, addToCart, removeFromCart, updateQuantity, clearCart, refreshProducts]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
