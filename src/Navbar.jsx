// Navbar.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchSearch, CATEGORIES } from "./AppContext";

const DEBOUNCE_MS = 400; // wait 400 ms after user stops typing before hitting API

const Navbar = ({ onCategorySelect, onSearch, onThemeChange }) => {
  const [theme,        setTheme]        = useState(() => localStorage.getItem("theme") || "light-theme");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchResults,setSearchResults]= useState([]);
  const [showResults,  setShowResults]  = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const debounceTimer = useRef(null);   // holds the setTimeout id

  const isAdminLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ── Debounced + cached search ─────────────────────────────────────────────
  // Without debounce: every keystroke → 1 API call (e.g. "almond" = 6 calls)
  // With debounce:    only fires when user pauses → usually 1 call total
  // fetchSearch also checks the in-memory cache, so repeated queries are free
  const handleSearch = useCallback((value) => {
    setSearchQuery(value);

    // Clear any pending timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      onSearch("", []);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await fetchSearch(value); // cache-aware
        setSearchResults(results);
        setShowResults(true);
        onSearch(value, results);
      } catch (err) {
        console.error("Search error:", err);
      }
    }, DEBOUNCE_MS);
  }, [onSearch]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    onSearch("", []);
  }, [onSearch]);

  const toggleTheme = () =>
  setTheme((prev) => {
    const next = prev === "light-theme" ? "dark-theme" : "light-theme";
    onThemeChange?.(next);  // ← add this line
    return next;
  });
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={clearSearch}>
          🌰 R.K dry frui Store
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="nav-link" onClick={clearSearch}>Home</Link>

          {isAdminLoggedIn && <Link to="/admin/dashboard" className="nav-link">📊 Dashboard</Link>}
          {isAdminLoggedIn && <Link to="/admin/add"       className="nav-link">Add Product</Link>}

          <div className={`dropdown ${dropdownOpen ? "open" : ""}`}>
            <button
              className="nav-link dropdown-btn"
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
            >
              Categories ▾
            </button>
            <div className="dropdown-content">
              <button onClick={() => { onCategorySelect(""); setDropdownOpen(false); clearSearch(); }}>
                All Products
              </button>
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => { onCategorySelect(cat); setDropdownOpen(false); clearSearch(); }}>
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
                    onClick={() => { setShowResults(false); clearSearch(); }}
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

          <Link to="/cart" className="cart-link">🛒 Cart</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
