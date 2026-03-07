// AppContext.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

export const AppContext = createContext();

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

export const isAdmin = () => !!localStorage.getItem("token");

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/";
};

export const SECTIONS = [
  { id: "new-arrivals",     title: "🎉 New Arrivals",      subtitle: "Freshly added to our store",             emoji: "✨"  },
  { id: "kashmiri-special", title: "🏔️ Kashmiri Special", subtitle: "Premium authentic products from Kashmir", emoji: "🏔️" },
  { id: "best-sellers",     title: "🔥 Best Sellers",      subtitle: "Customer favorites",                     emoji: "🔥"  },
  { id: "all-products",     title: "🌰 All Products",      subtitle: "Complete collection",                    emoji: "🛍️" },
];
export const CATEGORIES = ["Almonds", "Cashews", "Dates", "Walnuts", "Pistachios", "Raisins", "Figs"];

const PRODUCT_LIST_TTL   = 5 * 60 * 1000;
const PRODUCT_DETAIL_TTL = 5 * 60 * 1000;
const SEARCH_TTL         = 2 * 60 * 1000;

const productListCache   = { data: null, ts: 0 };
const productDetailCache = new Map();
const searchCache        = new Map();

const isFresh = (ts, ttl) => Date.now() - ts < ttl;

export const fetchProductById = async (id) => {
  const cached = productDetailCache.get(String(id));
  if (cached && isFresh(cached.ts, PRODUCT_DETAIL_TTL)) return cached.data;
  const { data } = await API.get(`/product/${id}`);
  productDetailCache.set(String(id), { data, ts: Date.now() });
  return data;
};

export const fetchSearch = async (keyword) => {
  const key = keyword.trim().toLowerCase();
  const cached = searchCache.get(key);
  if (cached && isFresh(cached.ts, SEARCH_TTL)) return cached.data;
  const { data } = await API.get(`/products/search?keyword=${keyword}`);
  searchCache.set(key, { data, ts: Date.now() });
  return data;
};

export const bustProductCache = (id) => {
  productListCache.data = null;
  productListCache.ts   = 0;
  if (id) productDetailCache.delete(String(id));
};

const AppProvider = ({ children }) => {
  const [products,  setProducts]  = useState([]);
  const [cart,      setCart]      = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const fetchProducts = useCallback(async (force = false) => {
    if (!force && productListCache.data && isFresh(productListCache.ts, PRODUCT_LIST_TTL)) {
      setProducts(productListCache.data);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const t1 = Date.now();
      console.log("⏱ [FRONTEND] API call started");
      const { data } = await API.get("/products");
      console.log(`⏱ [FRONTEND] Response received in: ${Date.now() - t1}ms`);
      console.log(`⏱ [FRONTEND] Products count: ${data.length}`);
      productListCache.data = data;
      productListCache.ts   = Date.now();
      setProducts(data);
      setError(null);
    } catch (err) {
      if (productListCache.data) setProducts(productListCache.data);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const refreshProducts = useCallback(() => {
    bustProductCache();
    fetchProducts(true);
  }, [fetchProducts]);

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.id === product.id);
      if (idx !== -1) {
        const current = prev[idx];
        if (current.quantity >= current.stockQuantity) return prev;
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
