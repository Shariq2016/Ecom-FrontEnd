// App.jsx
import React, { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles.css";

import AppProvider from "./AppContext";
import { ToastProvider } from "./Toast";
import Navbar from "./Navbar";
import { Home, ProductDetail, Cart, ProductForm } from "./Pages";
import AdminLogin from "./AdminLogin";
import Checkout from "./Checkout";
import AdminOrders from "./AdminOrders";
import AdminDashboard from "./AdminDashboard";

const Snowfall = () => {
  const snowflakes = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="snowfall-container">
      {snowflakes.map((i) => (
        <div key={i} className="snowflake">❄</div>
      ))}
    </div>
  );
};

function App() {
  const [selectedCategory,  setSelectedCategory]  = useState("");
  const [searchQuery,       setSearchQuery]        = useState("");
  const [filteredProducts,  setFilteredProducts]   = useState([]);
  const [theme,             setTheme]              = useState(() => localStorage.getItem("theme") || "light-theme");

  const handleSearch = useCallback((query, results) => {
    setSearchQuery(query);
    setFilteredProducts(results);
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <div className="app">
            {theme === "dark-theme" && <Snowfall />}
            <Navbar onCategorySelect={setSelectedCategory} onSearch={handleSearch} onThemeChange={setTheme} />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home selectedCategory={selectedCategory} searchQuery={searchQuery} filteredProducts={filteredProducts} />} />
                <Route path="/product/:id"     element={<ProductDetail />} />
                <Route path="/cart"            element={<Cart />} />
                <Route path="/admin/add"       element={<ProductForm />} />
                <Route path="/admin/login"     element={<AdminLogin />} />
                <Route path="/checkout"        element={<Checkout />} />
                <Route path="/admin/edit/:id"  element={<ProductForm isEdit={true} />} />
                <Route path="/admin/orders"    element={<AdminOrders />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Routes>
            </main>
          </div>
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
