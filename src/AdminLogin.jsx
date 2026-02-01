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
      // Make API call to backend
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/login`, {
        username: username,
        password: password,
      });

      // If successful, save token and navigate
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        navigate("/");
      }
    } catch (err) {
      // Handle errors
      if (err.response) {
        // Server responded with error status
        setError(err.response.data.message || "Invalid credentials!");
      } else if (err.request) {
        // Request was made but no response received
        setError("Cannot connect to server. Please try again.");
      } else {
        // Something else happened
        setError("An error occurred. Please try again.");
      }
      console.error("Login error:", err);
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