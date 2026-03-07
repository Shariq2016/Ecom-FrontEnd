import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "./AppContext";
import { useToast } from "./Toast";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      // Uses shared API instance — token injected automatically via interceptor
      const response = await API.get("/orders");
      const orders = response.data;

      const totalOrders = orders.length;

      const totalRevenue = orders.reduce((sum, order) => {
        if (["CONFIRMED", "DELIVERED", "SHIPPED"].includes(order.status)) {
          return sum + (order.totalAmount || 0);
        }
        return sum;
      }, 0);

      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setStats({ totalOrders, totalRevenue, recentOrders });

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/admin/login");
      } else {
        toast.error("Error loading dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/admin/login");
  };

  const adminCards = [
    { title: "📦 Manage Orders", description: "View and manage customer orders", path: "/admin/orders",    icon: "📦", color: "#3b82f6" },
    { title: "➕ Add Product",   description: "Add new products to store",       path: "/admin/add",       icon: "➕", color: "#10b981" },
    { title: "🏠 Go to Store",   description: "Visit the main store",            path: "/",                icon: "🏠", color: "#8b5cf6" }
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>🔐 Admin Dashboard</h1>
          <p>Welcome back, Admin! Manage your e-commerce store</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">🚪 Logout</button>
      </div>

      <div className="dashboard-grid">
        {adminCards.map((card, index) => (
          <div key={index} className="dashboard-card" onClick={() => navigate(card.path)} style={{ borderTop: `4px solid ${card.color}` }}>
            <div className="card-icon" style={{ color: card.color }}>{card.icon}</div>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <button className="card-btn" style={{ backgroundColor: card.color }}>Open →</button>
          </div>
        ))}
      </div>

      <div className="quick-stats">
        <h2>📊 Quick Stats</h2>
        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>Loading statistics...</p>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h4>Total Orders</h4>
                <p className="stat-number">{stats.totalOrders}</p>
                <span className="stat-label">
                  <a href="/admin/orders" style={{ color: "#3b82f6", textDecoration: "none" }}>View all orders →</a>
                </span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🛍️</div>
              <div className="stat-info">
                <h4>Recent Orders</h4>
                <p className="stat-number">{stats.recentOrders.length}</p>
                <span className="stat-label">Last 5 orders</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h4>Revenue</h4>
                <p className="stat-number">₹{stats.totalRevenue.toFixed(2)}</p>
                <span className="stat-label">From confirmed orders</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!loading && stats.recentOrders.length > 0 && (
        <div className="recent-orders-section">
          <h2>📋 Recent Orders</h2>
          <div className="recent-orders-list">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="recent-order-item">
                <div className="order-info">
                  <h4>#{order.orderNumber}</h4>
                  <p>{order.customerName}</p>
                  <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="order-amount">
                  <p className="amount">₹{order.totalAmount?.toFixed(2) || "0.00"}</p>
                  <span className="status-badge-mini" style={{
                    backgroundColor: order.status === 'CONFIRMED' ? '#10b981' :
                                     order.status === 'PENDING'   ? '#f59e0b' :
                                     order.status === 'DELIVERED' ? '#3b82f6' : '#6b7280'
                  }}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/admin/orders")} className="view-all-btn">View All Orders →</button>
        </div>
      )}

      {!loading && stats.totalOrders === 0 && (
        <div className="no-orders-state">
          <h3>📭 No orders yet</h3>
          <p>Your store hasn't received any orders yet.</p>
        </div>
      )}
    </div>
  );
}
