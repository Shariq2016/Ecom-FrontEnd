import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "./AppContext";
import { useToast, useConfirm } from "./Toast";
import "./AdminOrders.css";

export default function AdminOrders() {
  const navigate = useNavigate();
  const toast    = useToast();
  const confirm  = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { navigate("/admin/login"); return; }

      // Uses shared API — token injected automatically
      const response = await API.get("/orders");
      setOrders(response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      if (error.response?.status === 401) navigate("/admin/login");
      else toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await API.put(`/order/${orderId}/status`, { status: newStatus });
      fetchOrders();
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    const ok = await confirm(`Delete order ${orderNumber}?\n\nThis action cannot be undone!`);
    if (!ok) return;
    try {
      await API.delete(`/order/${orderId}`);
      toast.success(`Order ${orderNumber} deleted successfully`);
      fetchOrders();
    } catch (error) {
      toast.error("Failed to delete order. Please try again.");
    }
  };

  const getFullAddress = (order) => {
    const parts = [order.shippingAddress, order.shippingCity, order.shippingState, order.shippingPincode, order.shippingCountry].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Address not available";
  };

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === "ALL" || order.status === filter;
    const matchesSearch = searchQuery === "" ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total:     orders.length,
    pending:   orders.filter(o => o.status === "PENDING").length,
    confirmed: orders.filter(o => o.status === "CONFIRMED").length,
    shipped:   orders.filter(o => o.status === "SHIPPED").length,
    delivered: orders.filter(o => o.status === "DELIVERED").length,
    revenue:   orders.filter(o => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(o.status))
                     .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING:   { color: "#ff9800", icon: "⏳", label: "Pending",   next: ["CONFIRMED", "CANCELLED"] },
      CONFIRMED: { color: "#4caf50", icon: "✓",  label: "Confirmed", next: ["SHIPPED", "CANCELLED"] },
      SHIPPED:   { color: "#2196f3", icon: "🚚", label: "Shipped",   next: ["DELIVERED"] },
      DELIVERED: { color: "#9c27b0", icon: "📦", label: "Delivered", next: [] },
      CANCELLED: { color: "#f44336", icon: "✕",  label: "Cancelled", next: [] },
      FAILED:    { color: "#d32f2f", icon: "⚠",  label: "Failed",    next: ["PENDING"] }
    };
    return configs[status] || configs.PENDING;
  };

  const openOrderDetails = (order) => { setSelectedOrder(order); setShowModal(true); };

  return (
    <div className="admin-orders-container">
      <div className="orders-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate("/admin/dashboard")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Back
          </button>
          <div className="header-title">
            <h1>Order Management</h1>
            <p>Monitor and manage all customer orders</p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{"--accent": "#667eea"}}>
          <div className="stat-icon">📊</div>
          <div className="stat-content"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Orders</div></div>
        </div>
        <div className="stat-card" style={{"--accent": "#4caf50"}}>
          <div className="stat-icon">💰</div>
          <div className="stat-content"><div className="stat-value">₹{stats.revenue.toFixed(2)}</div><div className="stat-label">Total Revenue</div></div>
        </div>
        <div className="stat-card" style={{"--accent": "#ff9800"}}>
          <div className="stat-icon">⏳</div>
          <div className="stat-content"><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending Orders</div></div>
        </div>
        <div className="stat-card" style={{"--accent": "#9c27b0"}}>
          <div className="stat-icon">✓</div>
          <div className="stat-content"><div className="stat-value">{stats.confirmed}</div><div className="stat-label">Confirmed</div></div>
        </div>
      </div>

      <div className="orders-controls">
        <input type="text" placeholder="Search orders..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
        <div className="filter-tabs">
          {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map(f => (
            <button key={f} className={`filter-tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><p>Loading orders...</p></div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state"><p>No orders found</p></div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <tr key={order.id}>
                    <td>#{order.orderNumber}</td>
                    <td>
                      <div>{order.customerName}</div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{order.customerEmail}</div>
                    </td>
                    <td>₹{order.totalAmount?.toFixed(2)}</td>
                    <td>
                      <div className="status-badge" style={{
                        background: `linear-gradient(135deg, ${statusConfig.color}15, ${statusConfig.color}30)`,
                        color: statusConfig.color, borderColor: statusConfig.color
                      }}>
                        {statusConfig.icon} {statusConfig.label}
                      </div>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        {statusConfig.next.length > 0 && (
                          <select onChange={(e) => { if (e.target.value) { handleStatusUpdate(order.id, e.target.value); e.target.value = ""; }}} defaultValue="">
                            <option value="" disabled>Update Status</option>
                            {statusConfig.next.map(status => (
                              <option key={status} value={status}>{getStatusConfig(status).icon} {getStatusConfig(status).label}</option>
                            ))}
                          </select>
                        )}
                        <button className="view-button" onClick={() => openOrderDetails(order)} title="View Details">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        <button className="delete-button" onClick={() => handleDeleteOrder(order.id, order.orderNumber)} title="Delete Order">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="modal-header">
              <h2>Order Details</h2>
              <div className="order-number">#{selectedOrder.orderNumber}</div>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Customer Information</h3>
                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Name</span><span className="detail-value">{selectedOrder.customerName}</span></div>
                  <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{selectedOrder.customerEmail}</span></div>
                  <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{selectedOrder.customerPhone}</span></div>
                </div>
              </div>
              <div className="detail-section">
                <h3>Shipping Address</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width"><span className="detail-label">Street</span><span className="detail-value">{selectedOrder.shippingAddress || "N/A"}</span></div>
                  <div className="detail-item"><span className="detail-label">City</span><span className="detail-value">{selectedOrder.shippingCity || "N/A"}</span></div>
                  <div className="detail-item"><span className="detail-label">State</span><span className="detail-value">{selectedOrder.shippingState || "N/A"}</span></div>
                  <div className="detail-item"><span className="detail-label">Pincode</span><span className="detail-value">{selectedOrder.shippingPincode || "N/A"}</span></div>
                  <div className="detail-item"><span className="detail-label">Country</span><span className="detail-value">{selectedOrder.shippingCountry || "India"}</span></div>
                  <div className="detail-item full-width"><span className="detail-label">Complete Address</span><span className="detail-value complete-address">{getFullAddress(selectedOrder)}</span></div>
                </div>
              </div>
              <div className="detail-section">
                <h3>Order Items</h3>
                <div className="items-list">
                  {(selectedOrder.orderItems || selectedOrder.items || []).length > 0 ? (
                    (selectedOrder.orderItems || selectedOrder.items).map((item, idx) => (
                      <div key={idx} className="item-row">
                        <div className="item-info">
                          <span className="item-name">{item.productName || item.name}</span>
                          <span className="item-brand">{item.brand}</span>
                        </div>
                        <div className="item-qty">Qty: {item.quantity}</div>
                        <div className="item-price">₹{(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))
                  ) : (<p>No items found</p>)}
                </div>
              </div>
              <div className="detail-section">
                <h3>Payment Details</h3>
                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Subtotal</span><span className="detail-value">₹{selectedOrder.subtotal?.toFixed(2) || "0.00"}</span></div>
                  <div className="detail-item"><span className="detail-label">Shipping</span><span className="detail-value">₹{selectedOrder.shippingCost?.toFixed(2) || "0.00"}</span></div>
                  <div className="detail-item"><span className="detail-label">Total</span><span className="detail-value total-amount">₹{selectedOrder.totalAmount?.toFixed(2) || "0.00"}</span></div>
                  <div className="detail-item"><span className="detail-label">Payment Method</span><span className="detail-value">{selectedOrder.paymentMethod}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
