import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminOrders.css";

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.get("http://localhost:8080/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched orders:", response.data);
      setOrders(response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (error.response?.status === 401) {
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      
      await axios.put(
        `http://localhost:8080/api/order/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchOrders();
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Failed to update order status");
    }
  };

  // NEW: Delete order handler
  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`⚠️ Are you sure you want to permanently delete order ${orderNumber}?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      await axios.delete(
        `http://localhost:8080/api/order/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(`✅ Order ${orderNumber} deleted successfully`);
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("❌ Failed to delete order. Please try again.");
    }
  };

  // Helper function to get full address
  const getFullAddress = (order) => {
    const parts = [
      order.shippingAddress,
      order.shippingCity,
      order.shippingState,
      order.shippingPincode,
      order.shippingCountry
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(", ") : "Address not available";
  };

  const filteredOrders = orders.filter((order) => {
    const matchesFilter = filter === "ALL" || order.status === filter;
    const matchesSearch =
      searchQuery === "" ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "PENDING").length,
    confirmed: orders.filter(o => o.status === "CONFIRMED").length,
    shipped: orders.filter(o => o.status === "SHIPPED").length,
    delivered: orders.filter(o => o.status === "DELIVERED").length,
    revenue: orders
      .filter(o => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(o.status))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING: { color: "#ff9800", icon: "⏳", label: "Pending", next: ["CONFIRMED", "CANCELLED"] },
      CONFIRMED: { color: "#4caf50", icon: "✓", label: "Confirmed", next: ["SHIPPED", "CANCELLED"] },
      SHIPPED: { color: "#2196f3", icon: "🚚", label: "Shipped", next: ["DELIVERED"] },
      DELIVERED: { color: "#9c27b0", icon: "📦", label: "Delivered", next: [] },
      CANCELLED: { color: "#f44336", icon: "✕", label: "Cancelled", next: [] },
      FAILED: { color: "#d32f2f", icon: "⚠", label: "Failed", next: ["PENDING"] }
    };
    return configs[status] || configs.PENDING;
  };

  const openOrderDetails = (order) => {
    console.log("Opening order details:", order);
    setSelectedOrder(order);
    setShowModal(true);
  };

  return (
    <div className="admin-orders-container">
      {/* Header with Glass Effect */}
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

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{"--accent": "#667eea"}}>
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>
        
        <div className="stat-card" style={{"--accent": "#4caf50"}}>
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">₹{stats.revenue.toFixed(2)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        
        <div className="stat-card" style={{"--accent": "#ff9800"}}>
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Orders</div>
          </div>
        </div>
        
        <div className="stat-card" style={{"--accent": "#9c27b0"}}>
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.delivered}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="controls-section">
        <div className="filter-pills">
          {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map(status => (
            <button
              key={status}
              className={`filter-pill ${filter === status ? "active" : ""}`}
              onClick={() => setFilter(status)}
            >
              {status === "ALL" ? "All" : getStatusConfig(status).label}
              <span className="pill-count">
                {status === "ALL" ? stats.total : stats[status.toLowerCase()] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search orders, customers, emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No orders found</h3>
          <p>{searchQuery ? "Try a different search term" : "No orders match your filters"}</p>
        </div>
      ) : (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date & Time</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                // FIXED: Use orderItems instead of items
                const items = order.orderItems || order.items || [];
                // console.log(items+"items")
                
                return (
                  <tr key={order.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <td>
                      <div className="order-id">
                        <span className="id-text">{order.orderNumber}</span>
                      </div>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar">
                          {order.customerName?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="customer-info">
                          <div className="customer-name">{order.customerName || "N/A"}</div>
                          <div className="customer-email">{order.customerEmail}</div>
                          <div className="customer-phone">📞 {order.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <div className="date-main">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="date-time">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="items-cell">
                        {items.length > 0 ? (
                          <>
                            <span className="items-count">{items.length} item{items.length > 1 ? 's' : ''}</span>
                            <span className="items-preview">
                              {items.slice(0, 2).map(item => item.productName || item.name).join(", ")}
                              {items.length > 2 && "..."}
                            </span>
                          </>
                        ) : (
                          <span className="no-items">No items</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="amount-cell">
                        ₹{order.totalAmount?.toFixed(2) || "0.00"}
                      </div>
                    </td>
                    <td>
                      <div className={`payment-badge payment-${order.paymentMethod?.toLowerCase()}`}>
                        {order.paymentMethod === "COD" ? "💵 COD" : "💳 Online"}
                      </div>
                    </td>
                    <td>
                      <div className="status-badge" style={{ 
                        background: `linear-gradient(135deg, ${statusConfig.color}15, ${statusConfig.color}30)`,
                        color: statusConfig.color,
                        borderColor: statusConfig.color
                      }}>
                        <span className="status-icon">{statusConfig.icon}</span>
                        {statusConfig.label}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {statusConfig.next.length > 0 && (
                          <select
                            className="status-select"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusUpdate(order.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Update Status</option>
                            {statusConfig.next.map(status => (
                              <option key={status} value={status}>
                                {getStatusConfig(status).icon} {getStatusConfig(status).label}
                              </option>
                            ))}
                          </select>
                        )}
                        <button 
                          className="view-button"
                          onClick={() => openOrderDetails(order)}
                          title="View Details"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        {/* NEW: Delete Button */}
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                          title="Delete Order"
                        >
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

      {/* Order Details Modal */}
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
                  <div className="detail-item">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{selectedOrder.customerName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{selectedOrder.customerEmail}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{selectedOrder.customerPhone}</span>
                  </div>
                </div>
              </div>

              {/* FIXED: Full Address Section */}
              <div className="detail-section">
                <h3>Shipping Address</h3>
                <div className="detail-grid">
                  <div className="detail-item full-width">
                    <span className="detail-label">Street Address</span>
                    <span className="detail-value">{selectedOrder.shippingAddress || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">City</span>
                    <span className="detail-value">{selectedOrder.shippingCity || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">State</span>
                    <span className="detail-value">{selectedOrder.shippingState || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Pincode</span>
                    <span className="detail-value">{selectedOrder.shippingPincode || "N/A"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Country</span>
                    <span className="detail-value">{selectedOrder.shippingCountry || "India"}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">Complete Address</span>
                    <span className="detail-value complete-address">{getFullAddress(selectedOrder)}</span>
                  </div>
                </div>
              </div>

              {/* FIXED: Order Items Section */}
              <div className="detail-section">
                <h3>Order Items</h3>
                <div className="items-list">
                  {(selectedOrder.orderItems || selectedOrder.items || []).length > 0 ? (
                    (selectedOrder.orderItems || selectedOrder.items).map((item, idx) => (
                      <div key={idx} className="item-row">
                        <div className="item-info">
                          <span className="item-name">{item.productName || item.name}</span>
                          <span className="item-brand">{item.brand}</span>
                          <span className="item-category">{item.category}</span>
                        </div>
                        <div className="item-qty">Qty: {item.quantity}</div>
                        <div className="item-price">₹{(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="no-items-message">
                      <p>⚠️ No items found for this order</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>Payment Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Subtotal</span>
                    <span className="detail-value">₹{selectedOrder.subtotal?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Shipping Cost</span>
                    <span className="detail-value">₹{selectedOrder.shippingCost?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Tax (GST)</span>
                    <span className="detail-value">₹{selectedOrder.tax?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Amount</span>
                    <span className="detail-value total-amount">₹{selectedOrder.totalAmount?.toFixed(2) || "0.00"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Method</span>
                    <span className="detail-value">{selectedOrder.paymentMethod}</span>
                  </div>
                  {selectedOrder.razorpayPaymentId && selectedOrder.razorpayPaymentId !== "null" && (
                    <div className="detail-item full-width">
                      <span className="detail-label">Payment ID</span>
                      <span className="detail-value payment-id">{selectedOrder.razorpayPaymentId}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">
                      <div className="status-badge" style={{ 
                        background: `linear-gradient(135deg, ${getStatusConfig(selectedOrder.status).color}15, ${getStatusConfig(selectedOrder.status).color}30)`,
                        color: getStatusConfig(selectedOrder.status).color,
                        borderColor: getStatusConfig(selectedOrder.status).color
                      }}>
                        {getStatusConfig(selectedOrder.status).icon} {getStatusConfig(selectedOrder.status).label}
                      </div>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
