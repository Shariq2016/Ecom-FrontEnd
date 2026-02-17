import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "./App";
import "./styles.css";
import axios from "axios";

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useContext(AppContext);

  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment
  const [loading, setLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("online"); // "online" or "cod"

  // Shipping Form State
  const [shippingDetails, setShippingDetails] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  const [errors, setErrors] = useState({});

  // Fetch Razorpay Key on mount
  useEffect(() => {
    fetchRazorpayKey();
  }, []);

  const fetchRazorpayKey = async () => {
    try {
      const response = await fetch("https://ecom-backend-1-ydje.onrender.com/api/razorpay-key");
      const data = await response.json();
      setRazorpayKey(data.key);
    } catch (error) {
      console.error("Error fetching Razorpay key:", error);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const total = subtotal + shipping ;

  // Validate shipping form
  const validateForm = () => {
    const newErrors = {};

    if (!shippingDetails.fullName.trim()) newErrors.fullName = "Name is required";
    if (!shippingDetails.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(shippingDetails.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!shippingDetails.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(shippingDetails.phone)) {
      newErrors.phone = "Phone must be 10 digits";
    }
    if (!shippingDetails.address.trim()) newErrors.address = "Address is required";
    if (!shippingDetails.city.trim()) newErrors.city = "City is required";
    if (!shippingDetails.state.trim()) newErrors.state = "State is required";
    if (!shippingDetails.pincode.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(shippingDetails.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingDetails((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Proceed to payment
  const handleProceedToPayment = () => {
    if (validateForm()) {
      setStep(2);
    }
  };

  // Handle Cash on Delivery
  const handleCODOrder = async () => {
    setLoading(true);

    try {
      // Create COD order on backend
      const orderResponse = await fetch( "https://ecom-backend-1-ydje.onrender.com/api/create-cod-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingDetails: shippingDetails,
          cart: cart.map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl || "https://ecom-backend-1-ydje.onrender.com/api/image"
          })),
          subtotal: subtotal,
          shippingCost: shipping,
          total: total,
          paymentMethod: "COD"
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await orderResponse.json();

      // Clear cart and show success
      clearCart();
      alert(`🎉 Order placed successfully!\n\nOrder Number: ${orderData.orderNumber}\n\nYou will pay ₹${total.toFixed(2)} in cash upon delivery.\n\nWe'll send you updates via email at ${shippingDetails.email}`);
      navigate("/");
    } catch (error) {
      console.error("Error creating COD order:", error);
      alert("Error processing order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize Razorpay payment
  const handleRazorpayPayment = async () => {
    setLoading(true);

    try {
      // Step 1: Create order on backend
      const orderResponse = await fetch("https://ecom-backend-1-ydje.onrender.com/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(total * 100), // Convert to paise
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
          shippingDetails: shippingDetails,
          cart: cart.map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl || `https://ecom-backend-1-ydje.onrender.com/api/product/${item.id}/image`
          })),
          total: total
        }),
      });

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await orderResponse.json();

      // Step 2: Configure Razorpay options
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "🌰 AYaan's Dry-fruit Store",
        description: "Order Payment",
        order_id: orderData.id,
        handler: function (response) {
          // Payment successful
          handlePaymentSuccess(response);
        },
        prefill: {
          name: shippingDetails.fullName,
          email: shippingDetails.email,
          contact: shippingDetails.phone,
        },
        notes: {
          address: `${shippingDetails.address}, ${shippingDetails.city}, ${shippingDetails.state} - ${shippingDetails.pincode}`,
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      // Step 3: Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        alert("Payment failed! Please try again.");
        console.error(response.error);
        setLoading(false);
      });
      razorpay.open();
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert("Error processing payment. Please try again.");
      setLoading(false);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (paymentResponse) => {
    try {
      setLoading(true);

      // Verify payment on backend
      const verifyResponse = await fetch("https://ecom-backend-1-ydje.onrender.com/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          shippingDetails,
          cart,
          total,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        // Clear cart and show success
        clearCart();
        alert(`🎉 Order placed successfully!\n\nOrder Number: ${verifyData.orderNumber}\nPayment ID: ${paymentResponse.razorpay_payment_id}`);
        navigate("/");
      } else {
        alert("Payment verification failed. Please contact support.");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Payment successful but order processing failed. Please contact support with Payment ID: " + paymentResponse.razorpay_payment_id);
    } finally {
      setLoading(false);
    }
  };

  // If cart is empty
  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <button onClick={() => navigate("/")} className="continue-shopping">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Progress Steps */}
      <div className="checkout-progress">
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? "active" : ""}`}>
            <div className="step-number">1</div>
            <div className="step-label">Shipping Details</div>
          </div>
          <div className="step-divider"></div>
          <div className={`step ${step >= 2 ? "active" : ""}`}>
            <div className="step-number">2</div>
            <div className="step-label">Payment</div>
          </div>
        </div>
      </div>

      <div className="checkout-container">
        {/* Left Side - Form */}
        <div className="checkout-form-section">
          {step === 1 ? (
            // STEP 1: Shipping Details
            <div className="shipping-form">
              <h2>📦 Shipping Information</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={shippingDetails.fullName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className={errors.fullName ? "error" : ""}
                  />
                  {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={shippingDetails.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className={errors.email ? "error" : ""}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={shippingDetails.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  maxLength="10"
                  className={errors.phone ? "error" : ""}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label>Address *</label>
                <textarea
                  name="address"
                  value={shippingDetails.address}
                  onChange={handleInputChange}
                  placeholder="Street address, Apartment, Suite, etc."
                  rows="3"
                  className={errors.address ? "error" : ""}
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={shippingDetails.city}
                    onChange={handleInputChange}
                    placeholder="Mumbai"
                    className={errors.city ? "error" : ""}
                  />
                  {errors.city && <span className="error-text">{errors.city}</span>}
                </div>

                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={shippingDetails.state}
                    onChange={handleInputChange}
                    placeholder="Maharashtra"
                    className={errors.state ? "error" : ""}
                  />
                  {errors.state && <span className="error-text">{errors.state}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={shippingDetails.pincode}
                    onChange={handleInputChange}
                    placeholder="400001"
                    maxLength="6"
                    className={errors.pincode ? "error" : ""}
                  />
                  {errors.pincode && <span className="error-text">{errors.pincode}</span>}
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="country"
                    value={shippingDetails.country}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <button onClick={handleProceedToPayment} className="checkout-next-btn">
                Proceed to Payment →
              </button>
            </div>
          ) : ( 
            // STEP 2: Payment
            <div className="payment-form">
              <h2>💳 Payment Method</h2>

              <div className="shipping-summary">
                <h3>Shipping To:</h3>
                <p><strong>{shippingDetails.fullName}</strong></p>
                <p>{shippingDetails.address}</p>
                <p>{shippingDetails.city}, {shippingDetails.state} - {shippingDetails.pincode}</p>
                <p>📞 {shippingDetails.phone}</p>
                <p>✉️ {shippingDetails.email}</p>
                <button onClick={() => setStep(1)} className="edit-shipping-btn">
                  ✏️ Edit Shipping Details
                </button>
              </div>

              {/* Payment Method Selection */}
           
             <div className="payment-methods">
                <h3>Choose Payment Method</h3>
                
                <div className="payment-options">
                  {/* Online Payment Option */}
                  <div 
                    className={`payment-option ${paymentMethod === "online" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("online")}
                  >
                    <input
                      type="radio"
                      id="online"
                      name="paymentMethod"
                      value="online"
                      checked={paymentMethod === "online"}
                      onChange={() => setPaymentMethod("online")}
                    />
                    <label htmlFor="online">
                      <div className="payment-option-content">
                        <h4>💳 Online Payment (Razorpay)</h4>
                        <p>Pay securely using UPI, Cards, Net Banking, or Wallets</p>
                        <div className="payment-logos">
                          <span>💳 Cards</span>
                          <span>📱 UPI</span>
                          <span>🏦 Banking</span>
                          <span>💛 Wallets</span>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Cash on Delivery Option */}
                  <div 
                    className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <input
                      type="radio"
                      id="cod"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                    />
                    <label htmlFor="cod">
                      <div className="payment-option-content">
                        <h4>💵 Cash on Delivery</h4>
                        <p>Pay with cash when your order is delivered</p>
                        <div className="cod-info">
                          <span>✅ No online payment required</span>
                          <span>✅ Pay when you receive</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              {paymentMethod === "online" ? (
                <div className="payment-method-card">
                  <button
                    onClick={handleRazorpayPayment}
                    disabled={loading}
                    className="pay-now-btn"
                  >
                    {loading ? "Processing..." : `Pay ₹${total.toFixed(2)} Now`}
                  </button>
                  <p className="secure-text">
                    🔒 Your payment information is secure and encrypted
                  </p>
                </div>
              ) : (
                <div className="payment-method-card">
                  <button
                    onClick={handleCODOrder}
                    disabled={loading}
                    className="cod-btn"
                  >
                    {loading ? "Processing..." : `Place Order - Pay ₹${total.toFixed(2)} on Delivery`}
                  </button>
                  <p className="secure-text">
                    💵 You will pay in cash when your order arrives
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Right Side - Order Summary */}
        <div className="order-summary-section">
          <h3>📋 Order Summary</h3>

          <div className="order-items">
            {cart.map((item) => (
              <div key={item.id} className="order-item">
                <img src={item.imageUrl || `https://ecom-backend-1-ydje.onrender.com/api/product/${item.id}/image`} alt={item.name} />
                <div className="order-item-details">
                  <h4>{item.name}</h4>
                  <p>Qty: {item.quantity}</p>
                </div>
                <div className="order-item-price">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="order-totals">
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="total-row">
              <span>Shipping:</span>
              <span>{shipping === 0 ? "FREE" : `₹${shipping.toFixed(2)}`}</span>
            </div>
          
            <div className="total-row grand-total">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {subtotal < 500 && (
            <div className="shipping-note">
              💡 Add ₹{(500 - subtotal).toFixed(2)} more for FREE shipping!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
