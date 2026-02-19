import React, { useState, useEffect } from 'react';
import { SERVER_URL } from './api';
import './App.css';

const OrdersList = ({ orders, addToCart, navigate }) => {
    return (
        <div className="orders-list">
            {!orders || orders.length === 0 ? <p>No orders yet.</p> : orders.map(order => (
                <div key={order._id} style={{ border: '1px solid #f0f0f0', borderRadius: '20px', padding: '2rem', marginBottom: '1.5rem', background: '#fcfcfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <span style={{ fontWeight: '900', color: '#4caf50' }}>{order.invoice_no}</span>
                        <span style={{ color: '#888' }}>{new Date(order.transaction_date).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {order.items.map((it, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{it.product_name} × {it.quantity}</span>
                                <button onClick={() => { addToCart({ productId: it.productId, name: it.product_name, price: it.price_at_purchase }); navigate('shop'); }} style={{ color: '#4caf50', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Buy Again</button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #eee', display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'right' }}>
                        {order.subtotal && (
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                Subtotal: ₹{order.subtotal.toFixed(2)}
                            </div>
                        )}
                        {order.discount_amount > 0 && (
                            <div style={{ fontSize: '0.9rem', color: '#e53935' }}>
                                Discount: -₹{order.discount_amount.toFixed(2)}
                            </div>
                        )}
                        {order.shipping_charges > 0 && (
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                Shipping: ₹{order.shipping_charges.toFixed(2)}
                            </div>
                        )}
                        <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#1b5e20', marginTop: '5px' }}>
                            Total Paid: ₹{order.total_price.toFixed(2)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Profile = ({ user, customerView, setCustomerView, handleLogout, navigate, wishlist, toggleWishlist, addToCart, orderCount, transactions, supportForm, setSupportForm, showNotification }) => {
    const [myTickets, setMyTickets] = useState([]);
    const [fetchError, setFetchError] = useState(null);

    const fetchMyTickets = async () => {
        setFetchError(null);
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/support`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Profile: Fetched tickets:", data);
                setMyTickets(data);
            } else {
                if (res.status === 403) setFetchError("Access denied. Please restart the backend server to apply recent updates.");
                else setFetchError("Failed to load tickets.");
            }
        } catch (err) {
            console.error("Failed to fetch tickets", err);
            setFetchError("Connection error.");
        }
    };

    useEffect(() => {
        if (customerView === 'profile-help') {
            fetchMyTickets();
        }
    }, [customerView]);

    const handleResolveTicket = async (ticketId) => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/support/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Resolved' })
            });
            if (res.ok) {
                showNotification('Ticket resolved', 'success');
                fetchMyTickets();
            } else {
                showNotification('Failed to resolve', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    };
    return (
        <div className="profile-view">
            <div className="profile-header">
                <div>
                    <h2 className="profile-username">{user.username || sessionStorage.getItem('username') || 'Account Details'}</h2>
                    <p className="profile-subtitle">Managing your info, orders, and rewards.</p>
                </div>
                <div className="profile-tabs">
                    {['Orders', 'Wishlist', 'Loyalty', 'Help'].map(t => {
                        const tabKey = `profile-${t.toLowerCase().replace(' ', '-')}`;
                        const isActive = customerView === tabKey || (t === 'Orders' && customerView === 'profile');
                        return (
                            <button
                                key={t}
                                onClick={() => setCustomerView(tabKey)}
                                className={`profile-tab-btn ${isActive ? 'active' : ''}`}
                            >
                                {t}
                            </button>
                        );
                    })}
                </div>
                <button onClick={handleLogout} className="profile-logout-btn">Logout</button>
            </div>

            <div className="profile-grid">
                {/* Vertical Sidebar for Extra Items */}
                <div className="profile-sidebar">
                    {[
                        { name: 'Coupons', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 6H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zM10 20v-4M14 20v-4M8 20v-4M16 20v-4M12 20v-4"></path></svg> },
                        { name: 'Wallet', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> },
                        { name: 'Notifications', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> },
                        { name: 'About', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> }
                    ].map(item => {
                        const tabKey = `profile-${item.name.toLowerCase()}`;
                        const isActive = customerView === tabKey;
                        return (
                            <button
                                key={item.name}
                                onClick={() => setCustomerView(tabKey)}
                                className={`sidebar-btn ${isActive ? 'active' : ''}`}
                            >
                                {item.icon}
                                {item.name}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="profile-content">
                    {customerView === 'profile-orders' || customerView === 'profile' ? (
                        <OrdersList orders={transactions} addToCart={addToCart} navigate={navigate} />
                    ) : customerView === 'profile-loyalty' ? (
                        <div className="profile-content-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '2rem' }}>
                                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 'bold' }}>
                                    {user.username?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{user.username}</h3>
                                    <p style={{ margin: 0, color: '#666' }}>{user.role}</p>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                <div className="stat-card">
                                    <h4 className="stat-header">FreshPoints</h4>
                                    <p className="stat-value">{orderCount * 50}</p>
                                </div>
                                <div className="stat-card">
                                    <h4 className="stat-header">Orders Placed</h4>
                                    <p className="stat-value">{orderCount}</p>
                                </div>
                            </div>
                        </div>
                    ) : customerView === 'profile-coupons' ? (
                        <div className="profile-content-card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Available Coupons</h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                {[
                                    { code: 'FRESH10', desc: '10% OFF on all items', exp: '31 Dec 2026' },
                                    { code: 'WELCOME20', desc: '20% OFF for new users', exp: '15 Feb 2026' },
                                    { code: 'SAVE50', desc: '₹50 OFF on orders above ₹500', exp: '28 Feb 2026' }
                                ].map(c => (
                                    <div key={c.code} className="coupon-card">
                                        <div>
                                            <strong style={{ fontSize: '1.2rem', color: '#2e7d32' }}>{c.code}</strong>
                                            <p style={{ margin: '5px 0', color: '#666' }}>{c.desc}</p>
                                            <small style={{ color: '#888' }}>Expires: {c.exp}</small>
                                        </div>
                                        <button onClick={() => { navigator.clipboard.writeText(c.code); showNotification('Coupon code copied!', 'success'); }} style={{ padding: '8px 15px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Copy</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : customerView === 'profile-wallet' ? (
                        <div className="profile-content-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
                            <h2>Freshmart Wallet</h2>
                            <div style={{ padding: '2.5rem', background: 'linear-gradient(135deg, #2e7d32, #4caf50)', color: '#fff', borderRadius: '24px', margin: '2rem 0', display: 'inline-block', minWidth: '300px', boxShadow: '0 10px 20px rgba(46, 125, 50, 0.3)' }}>
                                <p style={{ margin: '0 0 10px 0', opacity: 0.9, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Balance</p>
                                <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0 }}>₹450.00</p>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '1rem' }}>
                                <button style={{ padding: '15px 30px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Add Money</button>
                                <button style={{ padding: '15px 30px', background: 'none', border: '2px solid #ddd', color: '#333', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>History</button>
                            </div>
                        </div>
                    ) : customerView === 'profile-notifications' ? (
                        <div className="profile-content-card">
                            <h3 style={{ marginBottom: '1.5rem' }}>Notifications</h3>
                            <div style={{ display: 'grid', gap: '10px' }}>
                                {[
                                    { title: 'Flash Sale! ⚡', body: 'Get 30% off on all snacks today only.', time: '2 hours ago' },
                                    { title: 'Order Delivered 📦', body: 'Your order #FM2026-001 has been delivered.', time: 'Yesterday' },
                                    { title: 'Points Earned ⭐', body: 'You earned 50 FreshPoints from your last purchase.', time: '2 days ago' }
                                ].map((n, i) => (
                                    <div key={i} style={{ padding: '20px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <strong style={{ color: '#333', fontSize: '1.1rem' }}>{n.title}</strong>
                                            <small style={{ color: '#aaa' }}>{n.time}</small>
                                        </div>
                                        <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>{n.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : customerView === 'profile-help' ? (
                        <div className="profile-content-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3>Help & Support</h3>
                                <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#666' }}>
                                    <p style={{ margin: 0 }}>📞 +91 98765 43210</p>
                                    <p style={{ margin: 0 }}>📧 <a href="mailto:support@freshmart.com" style={{ color: '#2e7d32', textDecoration: 'none', fontWeight: 'bold' }}>support@freshmart.com</a></p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '3rem' }}>
                                <h4 style={{ marginBottom: '1.5rem', color: '#555' }}>Frequently Asked Questions</h4>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {[
                                        { q: 'How do I track my order?', a: 'You can track your order in the "Orders" tab by clicking on the transaction details.' },
                                        { q: 'What is the return policy?', a: 'Items can be returned within 7 days of delivery for a full refund if they are unopened.' },
                                        { q: 'How to use FreshPoints?', a: 'FreshPoints are automatically redeemed at checkout for discounts on eligible orders.' }
                                    ].map((f, i) => (
                                        <details key={i} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '12px', background: '#fcfcfc' }}>
                                            <summary style={{ fontWeight: 'bold', cursor: 'pointer', color: '#2e7d32', padding: '5px' }}>{f.q}</summary>
                                            <p style={{ marginTop: '15px', color: '#666', lineHeight: '1.6', padding: '0 5px' }}>{f.a}</p>
                                        </details>
                                    ))}
                                </div>
                            </div>

                            <div style={{ padding: '2.5rem', background: '#f0fdf4', borderRadius: '20px' }}>
                                <h4 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.2rem', color: '#1b5e20' }}>Message Our Support Team</h4>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    <input
                                        type="text"
                                        placeholder="Subject"
                                        value={supportForm.subject}
                                        onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })}
                                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: '#fff', color: '#333', outline: 'none' }}
                                    />
                                    <select
                                        value={supportForm.category}
                                        onChange={e => setSupportForm({ ...supportForm, category: e.target.value })}
                                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: '#fff', color: '#333', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="General">General Inquiry</option>
                                        <option value="Product">Product Issue</option>
                                        <option value="Order">Order Status</option>
                                        <option value="Payment">Payment/Refund</option>
                                        <option value="Shipping">Shipping/Delivery</option>
                                        <option value="Stock">Stock Request</option>
                                        <option value="Quality">Quality Control</option>
                                    </select>
                                    <textarea
                                        placeholder="How can we help you today?"
                                        rows="5"
                                        value={supportForm.message}
                                        onChange={e => setSupportForm({ ...supportForm, message: e.target.value })}
                                        style={{ padding: '15px', borderRadius: '12px', border: '1px solid #ddd', resize: 'none', fontSize: '1rem', fontFamily: 'inherit', background: '#fff', color: '#333', outline: 'none' }}
                                    ></textarea>
                                    <button
                                        onClick={async () => {
                                            if (!supportForm.subject || !supportForm.message) return showNotification('Please fill all fields', 'warning');
                                            console.log("Submitting support request:", { ...supportForm, customerId: user._id || user.id });
                                            try {
                                                const res = await fetch(`${SERVER_URL}/api/support`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        customerId: user._id || user.id,
                                                        customerName: user.username,
                                                        email: sessionStorage.getItem('email') || user.email || 'N/A',
                                                        subject: supportForm.subject,
                                                        category: supportForm.category,
                                                        message: supportForm.message
                                                    })
                                                });
                                                const data = await res.json();
                                                if (res.ok) {
                                                    showNotification('Message sent! We will get back to you soon.', 'success');
                                                    setSupportForm({ subject: '', category: 'General', message: '' });
                                                    fetchMyTickets(); // Refresh list
                                                } else {
                                                    showNotification(`Failed to send: ${data.error || 'Server error'}`, 'error');
                                                }
                                            } catch (err) {
                                                console.error("Support submission error:", err);
                                                showNotification(`Connection failed: ${err.message}. If other features work, please RESTART YOUR BACKEND SERVER to activate the new support routes.`, 'error');
                                            }
                                        }}
                                        style={{ padding: '18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px', boxShadow: '0 4px 15px rgba(46, 125, 50, 0.2)' }}
                                    >
                                        Send Message
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: 0, color: '#333' }}>My Support History</h4>
                                    <button onClick={fetchMyTickets} style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontWeight: 'bold' }}>↻ Refresh</button>
                                </div>
                                {fetchError && (
                                    <div style={{ padding: '15px', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffcdd2' }}>
                                        ⚠️ {fetchError}
                                    </div>
                                )}
                                {myTickets.length === 0 && !fetchError ? <p style={{ color: '#888', fontStyle: 'italic' }}>No active support requests.</p> : (
                                    <div style={{ display: 'grid', gap: '20px' }}>
                                        {myTickets.map(ticket => (
                                            <div key={ticket._id} style={{ padding: '20px', background: '#fff', border: '1px solid #eee', borderRadius: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <strong style={{ fontSize: '1.1rem' }}>{ticket.subject}</strong>
                                                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: '#e3f2fd', color: '#1565c0', borderRadius: '10px' }}>{ticket.category || 'General'}</span>
                                                    </div>
                                                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', background: ticket.status === 'Resolved' ? '#e8f5e9' : '#fff3e0', color: ticket.status === 'Resolved' ? '#2e7d32' : '#e65100', fontWeight: 'bold' }}>{ticket.status}</span>
                                                </div>
                                                <p style={{ margin: '0 0 10px 0', color: '#555' }}>{ticket.message}</p>
                                                {ticket.adminReply && (
                                                    <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '12px', marginTop: '15px', borderLeft: '5px solid #2e7d32', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#1b5e20' }}>
                                                            <span style={{ fontSize: '1.2rem' }}>💬</span>
                                                            <strong style={{ fontSize: '1rem' }}>Message from Support:</strong>
                                                        </div>
                                                        <p style={{ margin: 0, color: '#333', fontSize: '1rem', lineHeight: '1.6' }}>{ticket.adminReply}</p>
                                                    </div>
                                                )}
                                                {ticket.status === 'Resolved' && !ticket.adminReply && (
                                                    <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '10px', marginTop: '15px', borderLeft: '4px solid #aaa' }}>
                                                        <p style={{ margin: 0, color: '#666', fontStyle: 'italic' }}>Ticket resolved (No additional message).</p>
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : customerView === 'profile-about' ? (
                        <div className="profile-content-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1.5rem', fontFamily: "'Pacifico', cursive", color: '#4caf50' }}>Freshmart</div>
                            <p style={{ color: '#666', lineHeight: '1.8', maxWidth: '600px', margin: '0 auto', fontSize: '1rem' }}>
                                Freshmart is your one-stop destination for the freshest groceries, delivered straight to your doorstep.
                                Founded in 2024, our mission is to provide organic and high-quality produce while supporting local farmers.
                            </p>
                            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '40px', color: '#555' }}>
                                <div><strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: '5px' }}>v1.5.0</strong>Version</div>
                                <div><strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: '5px' }}>Organic</strong>Certified</div>
                                <div><strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: '5px' }}>Eco</strong>Friendly</div>
                            </div>
                        </div>
                    ) : (
                        <div className="wishlist-section">
                            {wishlist.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem' }}>
                                    <p style={{ fontSize: '1.2rem', color: '#888', marginBottom: '20px' }}>Your wishlist is empty. Start hearting some items!</p>
                                    <button onClick={() => navigate('shop')} style={{ padding: '12px 30px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>Go to Shop</button>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
                                    {wishlist.map(p => (
                                        <div key={p.productId} style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f0f0f0', position: 'relative', transition: 'transform 0.2s', boxShadow: '0 5px 15px rgba(0,0,0,0.03)' }}>
                                            <button
                                                onClick={() => toggleWishlist(p)}
                                                style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem' }}
                                            >
                                                ❤️
                                            </button>
                                            <img src={p.imageUrl || '/images/freshmart_icon.png'} style={{ width: '100%', height: '140px', objectFit: 'contain', marginBottom: '15px' }} />
                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', height: '2.4em', overflow: 'hidden' }}>{p.name}</h4>
                                            <p style={{ margin: '0 0 15px 0', fontWeight: '900', color: '#2e7d32', fontSize: '1.1rem' }}>₹{p.price}</p>
                                            <button onClick={() => addToCart(p)} style={{ width: '100%', padding: '12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Add to Cart</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
