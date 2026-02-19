import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Dashboard from './Dashboard';
import Contact from './Contact';
import './App.css';
import { SERVER_URL } from './api';

const Projecthomepage = () => {
    console.log("Projecthomepage rendered");
    const [showLogin, setShowLogin] = useState(false);
    const [isSignup, setIsSignup] = useState(false); // Toggle between Login and Signup
    const [user, setUser] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [role, setRole] = useState('Customer'); // Default role
    const [authMessage, setAuthMessage] = useState({ text: '', type: '' }); // Inline auth notifications

    useEffect(() => {
        const token = sessionStorage.getItem('token');

        if (token) {
            // 1. Immediate optimistic UI (decode token)
            try {
                const decoded = jwtDecode(token);
                setUser({
                    role: decoded.role,
                    username: decoded.username || sessionStorage.getItem('username'),
                    id: decoded.id || decoded.userId
                });
            } catch (err) {
                console.error("Token decode failed", err);
            }

            // 2. Fetch fresh data from source of truth
            fetch(`${SERVER_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch user');
                    return res.json();
                })
                .then(userData => {
                    console.log("Fresh user data fetched:", userData);
                    setUser({
                        role: userData.role,
                        username: userData.username,
                        id: userData._id
                    });
                    sessionStorage.setItem('username', userData.username); // Sync session storage
                    sessionStorage.setItem('role', userData.role);
                })
                .catch(err => {
                    console.error('Session validation failed:', err);
                    // Optional: handleLogout();
                });
        }
    }, []);


    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthMessage({ text: '', type: '' }); // Clear previous messages
        const endpoint = isSignup ? 'register' : 'login';
        const body = isSignup ? { username, password, role } : { username, password };

        try {
            const response = await fetch(`${SERVER_URL}/api/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                if (isSignup) {
                    setAuthMessage({ text: 'Registration Successful! Switching to Login...', type: 'success' });
                    setTimeout(() => {
                        setIsSignup(false);
                        setAuthMessage({ text: 'Registration Successful! Please Login.', type: 'success' });
                        // Optional: Clear password but keep username for convenience
                        setPassword('');
                    }, 1500);
                } else {
                    sessionStorage.setItem('token', data.token);
                    sessionStorage.setItem('role', data.role);
                    sessionStorage.setItem('username', data.username || username); // Fix for missing username on refresh
                    setUser({
                        role: data.role,
                        username: data.username || username,
                        id: data.id
                    });
                    setShowLogin(false);
                }
            } else {
                setAuthMessage({ text: data.error || 'Authentication Failed', type: 'error' });
            }
        } catch (error) {
            console.error('Auth Error:', error);
            setAuthMessage({ text: 'Server connection failed. Check backend.', type: 'error' });
        }
    };
    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');
        sessionStorage.removeItem('username'); // Clear username
        setUser(null);
    };

    return (
        <div className="homepage-container">
            {user ? (
                <Dashboard user={user} handleLogout={handleLogout} />
            ) : (
                <>
                    {/* Navbar */}
                    <nav className="navbar">
                        {/* Load Google Font */}
                        <style>
                            {`@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');`}
                        </style>
                        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                                src="/images/freshmart_logo_white.png"
                                alt="Freshmart"
                                style={{ height: '55px', objectFit: 'contain' }}
                            />
                            <span style={{ fontFamily: "'Pacifico', cursive", fontSize: '2.5rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Freshmart</span>
                        </div>
                        <ul className="nav-links">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setShowLogin(true); }}>Shop</a></li>
                        </ul>
                    </nav>

                    {/* Hero Section */}
                    <section className="split-section hero-section" id="home">
                        <div className="split-text hero-text-bg">
                            <div className="content-wrapper">
                                <h1>Welcome to<br />Freshmart</h1>
                                <div className="green-line"></div>
                                <p>Your trusted destination for all retail solutions, both online and in-store.</p>
                            </div>
                        </div>
                        <div className="split-image">
                            <img src="/images/img1.jpg" alt="Warehouse" />
                        </div>
                    </section>

                    {/* About Section */}
                    <section className="split-section" id="about">
                        <div className="split-image about-image-padded">
                            <img src="/images/img9.png" alt="About Us" />
                        </div>
                        <div className="split-text white-bg">
                            <div className="content-wrapper">
                                <h2>About Freshmart</h2>
                                <div className="green-line"></div>
                                <p>
                                    At Freshmart, we bring exceptional retail experiences to life. Our business bridges the gap between manufacturers and consumers, offering a curated selection of products to meet diverse needs. Dedicated to optimizing satisfaction through innovative inventory management and personalized services, we pride ourselves on fostering lasting relationships with our customers.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Discover Section */}
                    <section className="split-section">
                        <div className="split-text text-box-overlay-container">
                            <div className="content-wrapper">
                                <h2>Discover<br />Unmatched Retail<br />Excellence</h2>
                                <div className="green-line"></div>
                                <p>
                                    At  Freshmart, find unparalleled quality, satisfaction, and convenience.
                                </p>
                            </div>
                        </div>
                        <div className="split-image">
                            <img src="/images/img3.jpg" alt="Store Interior" />
                        </div>
                    </section>

                    {/* Services Section */}
                    <section className="services-section" id="services">
                        <div className="section-header">
                            <h2>SERVICES</h2>
                            <div className="green-line center-line"></div>
                        </div>
                        <div className="services-grid">
                            <div className="service-card">
                                <img src="/images/img4.jpg" alt="Curated Product Selection" />
                                <div className="card-content">
                                    <h3>Curated Product Selection</h3>
                                    <p>Explore a diverse range of quality products tailored to meet your unique preferences.</p>
                                </div>
                            </div>
                            <div className="service-card">
                                <img src="/images/img3.jpg" alt="Seamless Online Shopping" />
                                <div className="card-content">
                                    <h3>Seamless Online Shopping</h3>
                                    <p>Enjoy a convenient and user-friendly e-commerce platform for all your shopping needs.</p>
                                </div>
                            </div>
                            <div className="service-card">
                                <img src="/images/img5.jpg" alt="Excellent Customer Support" />
                                <div className="card-content">
                                    <h3>Excellent Customer Support</h3>
                                    <p>Experience personalized assistance to enhance your shopping journey.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Testimonials Section */}
                    <section className="testimonials-section" id="testimonials">
                        <div className="section-header">
                            <h2>TESTIMONIALS</h2>
                            <div className="green-line center-line"></div>
                        </div>
                        <div className="testimonial-container">
                            <div className="testimonial-split-image">
                                <img src="/images/img1.jpg" alt="Emma P." />
                            </div>
                            <div className="testimonial-split-text">
                                <span className="subtitle">SATISFIED ONLINE SHOPPER</span>
                                <h3>Emma P.</h3>
                                <p>Freshmart's personalized service made my shopping easy and enjoyable.</p>
                                <div className="stars">★★★★★</div>
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    {/* Contact Section */}
                    <Contact />

                    {/* Footer */}
                    <footer className="footer">
                        <div className="footer-content">
                            <div className="footer-left">
                                <h3>Freshmart</h3>
                                <p>Copyright © 2026 All rights reserved</p>
                            </div>
                            <div className="footer-right">
                                <a href="#home">HOME</a>
                                <a href="#about">ABOUT</a>
                                <a href="#services">SERVICES</a>
                                <a href="#more" className="more-link">MORE <span className="arrow">▼</span></a>
                            </div>
                        </div>
                    </footer>
                </>
            )
            }

            {/* Login Modal */}
            {
                showLogin && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>{isSignup ? 'Sign Up' : 'Sign In'}</h2>
                            {authMessage.text && (
                                <div style={{
                                    padding: '10px',
                                    marginBottom: '10px',
                                    borderRadius: '5px',
                                    fontSize: '0.9rem',
                                    textAlign: 'center',
                                    background: authMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                                    color: authMessage.type === 'success' ? '#155724' : '#721c24',
                                    border: `1px solid ${authMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                                }}>
                                    {authMessage.text}
                                </div>
                            )}
                            <form onSubmit={handleAuth} autoComplete="off">
                                <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoComplete="off"
                                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                                    />
                                </div>
                                {isSignup && (
                                    <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Role</label>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="modal-input-select"
                                            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                                        >
                                            <option value="Customer">Customer</option>
                                            <option value="Sales Manager">Sales Manager</option>
                                            <option value="Product Manager">Product Manager</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                )}
                                <button type="submit" className="modal-btn">
                                    {isSignup ? 'REGISTER' : 'LOGIN'}
                                </button>
                            </form>
                            <p
                                onClick={() => setIsSignup(!isSignup)}
                                style={{ marginTop: '1rem', cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                            >
                                {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                            </p>
                            <button className="close-btn" onClick={() => setShowLogin(false)}>Close</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Projecthomepage;
