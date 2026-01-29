import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Dashboard from './Dashboard';
import './App.css';

const Projecthomepage = () => {
    console.log("Projecthomepage rendered");
    const [showLogin, setShowLogin] = useState(false);
    const [isSignup, setIsSignup] = useState(false); // Toggle between Login and Signup
    const [user, setUser] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Customer'); // Default role

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            try {
                // Inside handleAuth after successful login
                const decoded = jwtDecode(token);
                setUser({
                    role: decoded.role,
                    username: decoded.username,
                    id: decoded.id || decoded.userId // Allow for id variations
                });

            } catch (err) {
                console.error('Invalid token');
                localStorage.removeItem('token');
            }
        }
    }, []);


    const handleAuth = async (e) => {
        e.preventDefault();
        const endpoint = isSignup ? 'register' : 'login';
        // Ensure these variables exist in your useState hooks
        const body = isSignup ? { username, password, role } : { username, password };

        try {
            const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (response.ok) {
                if (isSignup) {
                    alert('Registration Successful! Please Login.');
                    setIsSignup(false);
                } else {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    // Fix: using data.username from the response if available
                    setUser({ role: data.role, username: data.username || username });
                    setShowLogin(false);
                    alert('Login Successful');
                }
            } else {
                alert(data.error || 'Authentication Failed');
            }
        } catch (error) {
            console.error('Auth Error:', error);
            alert('Server connection failed. Check if backend is running on port 5000.');
        }
    };
    const handleLogout = () => {
        localStorage.removeItem('token'); // keep
        localStorage.removeItem('role');  // optional, legacy cleanup
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
                        <div className="logo">
                            <span className="logo-icon">§</span> Freshmart
                        </div>
                        <ul className="nav-links">
                            <li><a href="#home">Home</a></li>
                            <li><a href="#about">About</a></li>
                            <li><a href="#services">Services</a></li>
                            <li><a href="#testimonials">Testimonials</a></li>
                            <li><a href="#contact">Contact</a></li>
                            <li><a href="#contact">Contact</a></li>
                            <li>
                                {user ? (
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Sign Out ({user.role})</a>
                                ) : (
                                    <a href="#" onClick={(e) => { e.preventDefault(); setShowLogin(true); }}>Sign In</a>
                                )}
                            </li>
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
                    <section className="contact-section" id="contact">
                        <div className="section-header">
                            <h2>CONTACT</h2>
                            <div className="green-line center-line"></div>
                        </div>

                        <form className="contact-form">
                            <div className="form-row">
                                <input type="text" placeholder="Name" />
                                <input type="text" placeholder="Phone" />
                                <input type="email" placeholder="Email address" />
                            </div>
                            <div className="form-row single-col">
                                <textarea placeholder="Message" rows="5"></textarea>
                            </div>
                            <button type="button" className="contact-btn">CONTACT US</button>
                        </form>

                        <div className="contact-details-row">
                            <div className="contact-info">
                                <h3>Manhattan, New York, NY, United States</h3>
                                <p className="contact-link">📞 999-7777-000</p>
                                <p className="contact-link">🕒 Mon-Fri - 08:00-19:00</p>
                            </div>
                            <div className="contact-map">
                                <iframe
                                    title="Store Location Map"
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0, borderRadius: '8px' }}
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d193595.1583086942!2d-74.119763973049!3d40.6976700673559!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c2593a6b8b4b1b%3A0x4b8b8b8b8b8b8b8b!2sManhattan%2C%20New%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1234567890"
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade">
                                </iframe>
                            </div>
                        </div>
                    </section>

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
                            <form onSubmit={handleAuth}>
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                {isSignup && (
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="modal-input-select"
                                    >
                                        <option value="Customer">Customer</option>
                                        <option value="Sales Manager">Sales Manager</option>
                                        <option value="Product Manager">Product Manager</option>
                                        <option value="Admin">Admin</option>
                                    </select>
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
