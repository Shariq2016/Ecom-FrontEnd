import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";
export default function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

   console.log("ADMIN LOGIN LOADED");

 const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    // simple hardcoded admin login (for now)
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("token", "FAKE_ADMIN_TOKEN_123");
      navigate("/");
    } else {
      setError("Invalid credentials!");
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h2>Admin Login 🔐</h2>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Admin Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
