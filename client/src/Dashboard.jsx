import React, { useState, useEffect } from 'react';
import './App.css';
import { SERVER_URL } from './api';
import Profile from './Profile';
import { hasRole, isManager } from './utils/roleUtils';

const Dashboard = ({ user, handleLogout }) => {
    console.log("Dashboard user prop:", user);
    console.log("SessionStorage username:", sessionStorage.getItem('username'));
    const [aiRecommendations, setAiRecommendations] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [view, setView] = React.useState('home'); // admin views
    const [customerView, setCustomerView] = React.useState('home');
    const [searchQuery, setSearchQuery] = useState('');
    const [reports, setReports] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [importStatus, setImportStatus] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [couponMsg, setCouponMsg] = useState({ text: '', type: '' });
    const [selectedPayment, setSelectedPayment] = useState('card');
    const [notification, setNotification] = useState({ message: '', type: '', visible: false });

    const showNotification = (message, type = 'info') => {
        setNotification({ message, type, visible: true });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, visible: false }));
        }, 3000);
    };
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [userAddress, setUserAddress] = useState(sessionStorage.getItem('userAddress') || '');
    const [wishlist, setWishlist] = useState(() => {
        const saved = sessionStorage.getItem('wishlist');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        sessionStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const toggleWishlist = (product) => {
        const prodId = product.productId || `P${String(product.id).padStart(3, '0')}`;
        const isWishlisted = wishlist.some(item => (item.productId || item.id) === prodId);
        if (isWishlisted) {
            setWishlist(wishlist.filter(item => (item.productId || item.id) !== prodId));
        } else {
            setWishlist([...wishlist, { ...product, productId: prodId }]);
        }
    };

    const [newProduct, setNewProduct] = useState({
        productId: '', name: '', description: '', category: '', brand: '',
        batch_number: '', manufacture_date: '', expiry_date: '',
        price: '', storage_type: '', image_url: '',
        weight: '',
        dimensions: { width: '', height: '', depth: '' },
        warrantyInformation: '', shippingInformation: '', availabilityStatus: '',
        returnPolicy: '', minimumOrderQuantity: '', tags: [], sku: '', rating: '', reviews: []
    });
    const [catalog, setCatalog] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [supportForm, setSupportForm] = useState({ subject: '', category: 'General', message: '' });
    const [supportRequests, setSupportRequests] = useState([]);

    const cheesyMessages = [
        "Your cart is looking lonely. How about a date with some fresh apples?",
        "Do you believe in love at first bite? Check out our Bakery section!",
        "Are you a magician? Because whenever I look at your cart, everyone else disappears.",
        "Is your name Wi-Fi? Because I'm feeling a connection to these deals.",
        "Do you have a map? I just got lost in your shopping list.",
        "If you were a fruit, you'd be a fineapple.",
        "We go together like milk and cookies."
    ];
    const [welcomeMsg] = useState(cheesyMessages[Math.floor(Math.random() * cheesyMessages.length)]);

    useEffect(() => {
        fetchCatalog();
    }, []);

    useEffect(() => {
        if (catalog.length > 0) {
            fetchProducts();
        }
    }, [catalog]);

    useEffect(() => {
        setCart([]);
        if (user && user.id) {
            fetchCart();
        }
    }, [user]);

    const fetchCart = async () => {
        try {
            console.log(`[Cart] Fetching for user.id: ${user.id} (Type: ${typeof user.id})`);
            const res = await fetch(`${SERVER_URL}/api/cart/${user.id}?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`[Cart] Received:`, data);
                setCart(data);
            } else {
                console.error(`[Cart] Fetch failed with status: ${res.status}`);
            }
        } catch (err) {
            console.error("[Cart] Fetch error:", err);
        }
    };

    useEffect(() => {
        const handleLocationChange = () => {
            const params = new URLSearchParams(window.location.search);
            const v = params.get('v') || 'home';
            const c = params.get('c') || 'All';
            const q = params.get('q') || '';
            setCustomerView(v);
            setSelectedCategory(c);
            setSearchQuery(q);
        };
        handleLocationChange();
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    const navigate = (v, c = 'All', q = '') => {
        const params = new URLSearchParams();
        params.set('v', v);
        params.set('c', c);
        if (q) params.set('q', q);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        if (window.location.search !== `?${params.toString()}`) {
            window.history.pushState({ v, c, q }, '', newUrl);
        }
        setCustomerView(v);
        setSelectedCategory(c);
        setSearchQuery(q);
    };

    const [orderCount, setOrderCount] = useState(0);
    useEffect(() => {
        if (user && (hasRole(user.role, 'Customer') || isManager(user.role))) {
            fetchTransactions();
        }
    }, [user]);

    useEffect(() => {
        if ((hasRole(user.role, 'Customer') || isManager(user.role)) && cart.length > 0) {
            fetchAIRecommendations();
        }
    }, [cart]);

    const fetchCatalog = async () => {
        try {
            const res = await fetch('/images/Dataset.json');
            const data = await res.json();
            if (data.products) setCatalog(data.products);
        } catch (err) {
            console.error("Failed to fetch catalog", err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/products`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const dbProducts = await res.json();
            if (!Array.isArray(dbProducts)) throw new Error("dbProducts is not an array");

            const enrichedProducts = dbProducts.map(dbProduct => {
                let datasetProduct = null;
                datasetProduct = catalog.find(dsProduct => dsProduct.title.toLowerCase() === dbProduct.name.toLowerCase());
                if (!datasetProduct && dbProduct.productId) {
                    const id = parseInt(dbProduct.productId.replace('P', ''));
                    datasetProduct = catalog.find(dsProduct => dsProduct.id === id);
                }
                if (datasetProduct) {
                    return {
                        ...dbProduct,
                        brand: datasetProduct.brand,
                        rating: datasetProduct.rating,
                        reviews: datasetProduct.reviews,
                        stock: dbProduct.stock !== undefined ? dbProduct.stock : datasetProduct.stock,
                        dimensions: datasetProduct.dimensions,
                        weight: datasetProduct.weight,
                        shippingInformation: datasetProduct.shippingInformation,
                        sku: datasetProduct.sku,
                        tags: datasetProduct.tags,
                        minimumOrderQuantity: datasetProduct.minimumOrderQuantity,
                        warrantyInformation: datasetProduct.warrantyInformation,
                        returnPolicy: datasetProduct.returnPolicy,
                        availabilityStatus: datasetProduct.availabilityStatus,
                        image_url: datasetProduct.images && datasetProduct.images.length > 0 ? datasetProduct.images[0] : datasetProduct.thumbnail,
                        imageUrl: datasetProduct.images && datasetProduct.images.length > 0 ? datasetProduct.images[0] : datasetProduct.thumbnail,
                        thumbnail: datasetProduct.thumbnail,
                        category: datasetProduct.category || (dbProduct.category ? dbProduct.category.trim() : 'Uncategorized')
                    };
                }
                return { ...dbProduct, category: dbProduct.category ? dbProduct.category.trim() : 'Uncategorized' };
            });

            const shuffledProducts = enrichedProducts.sort(() => Math.random() - 0.5);
            setProducts(shuffledProducts);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const fetchReports = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Parallel fetch for efficiency
            const [mbaRes, salesRes, topRes] = await Promise.all([
                fetch(`${SERVER_URL}/api/reports/mba`, { headers }),
                fetch(`${SERVER_URL}/api/reports/sales?type=monthly`, { headers }),
                fetch(`${SERVER_URL}/api/reports/sales?type=top`, { headers })
            ]);

            let mba = mbaRes.ok ? await mbaRes.json() : [];
            let sales = salesRes.ok ? await salesRes.json() : { totalRevenue: 0, count: 0 };
            let topProducts = topRes.ok ? await topRes.json() : [];

            // Filter out corrupted data before checking emptiness
            const validTopProducts = topProducts.filter(p => p.product_id && p.product_id !== 'undefined');

            // 🛠️ MOCK DATA FALLBACK (For Demo/Empty States)
            if (!sales.count && validTopProducts.length === 0) {
                console.log("Using Mock Data for Dashboard");
                const MOCK_REPORTS = {
                    sales: { totalRevenue: 1250400, count: 1245 }, // Realistic monthly figures
                    topProducts: [
                        { product_id: 'Fresh Organic Milk', count: 450 },
                        { product_id: 'Whole Wheat Bread', count: 320 },
                        { product_id: 'Free Range Eggs', count: 280 },
                        { product_id: 'Farm Fresh Butter', count: 210 },
                        { product_id: 'Strawberry Yogurt', count: 185 }
                    ],
                    mba: [
                        { pair: ['Milk', 'Bread'], count: 145 },
                        { pair: ['Eggs', 'Butter'], count: 98 },
                        { pair: ['Coffee', 'Sugar'], count: 85 },
                        { pair: ['Chips', 'Soda'], count: 76 }
                    ]
                };
                sales = MOCK_REPORTS.sales;
                topProducts = MOCK_REPORTS.topProducts;
                mba = mba.length > 0 ? mba : MOCK_REPORTS.mba;
            }

            setReports({ mba, sales, topProducts: validTopProducts });
        } catch (err) {
            console.error("Analytics fetch error:", err);
            setReports({ mba: [], sales: { totalRevenue: 0 }, topProducts: [] });
        }
    };

    const fetchSupportRequests = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/support`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setSupportRequests(data);
            } else {
                console.error("Support fetch returned non-array:", data);
                setSupportRequests([]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/transactions/my-orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setTransactions(data);
                setOrderCount(data.length);
            } else {
                console.error("Transactions fetch returned non-array:", data);
                setTransactions([]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAIRecommendations = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: user._id || user.id,
                    currentCart: cart.map(item => item.productId)
                })
            });
            const data = await res.json();
            setAiRecommendations(data.recommendations || []);
            setAnalytics(data.analytics || null);
        } catch (err) {
            console.error("AI Brain failed to fetch", err);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newProduct)
            });
            if (res.ok) {
                showNotification('Product Added Successfully! ✅', 'success');
                fetchProducts();
                setNewProduct({
                    productId: '', name: '', description: '', category: '', brand: '',
                    batch_number: '', manufacture_date: '', expiry_date: '',
                    price: '', storage_type: '', image_url: '',
                    weight: '', dimensions: { width: '', height: '', depth: '' },
                    warrantyInformation: '', shippingInformation: '', availabilityStatus: '',
                    returnPolicy: '', minimumOrderQuantity: '', tags: [], sku: '', rating: '', reviews: []
                });
            } else {
                const errData = await res.json();
                showNotification(`Failed to add product: ${errData.error || 'Unknown Error'} ❌`, 'error');
            }
        } catch (err) {
            console.error(err);
            showNotification("Error connecting to server. Please try again.", 'error');
        }
    };

    const addToCart = async (product) => {
        try {
            const res = await fetch(`${SERVER_URL}/api/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: user.id || user._id, // Prioritize 'id' to match fetchCart and Login response
                    product: {
                        productId: product.productId || `P${String(product.id).padStart(3, '0')}`,
                        name: product.name || product.title,
                        price: product.price,
                        imageUrl: product.image_url || product.imageUrl || product.thumbnail
                    }
                })
            });
            if (res.ok) {
                const updatedCart = await res.json();
                setCart(updatedCart);
            } else {
                const errData = await res.json();
                showNotification(`Failed to add: ${errData.error || "Unknown error"}`, 'error');
            }
        } catch (err) {
            console.error("Failed to add to cart", err);
            showNotification("Network error: Failed to add to cart.", 'error');
        }
    };

    const removeFromCart = async (productId) => {
        try {
            const res = await fetch(`${SERVER_URL}/api/cart/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: user._id || user.id,
                    productId: productId
                })
            });
            if (res.ok) {
                const updatedCart = await res.json();
                setCart(updatedCart);
            }
        } catch (err) {
            console.error("Failed to remove from cart", err);
        }
    };

    const handleImportDataset = async () => {
        try {
            setImportStatus('Importing...');
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${SERVER_URL}/api/products/import-dataset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                setImportStatus(`Imported ${data.imported} products, skipped ${data.skipped}`);
                fetchProducts();
            } else {
                setImportStatus('Import failed');
            }
        } catch (err) {
            setImportStatus('Import error');
        }
    };

    const [recommendedAddedIds, setRecommendedAddedIds] = useState(new Set());
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleCheckout = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const subTotal = cart.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);

            // Shipping and Discount logic for final amount
            const shipping = subTotal >= 70 ? 0 : 25;
            const discountPercent = subTotal >= 249 ? 15 : (subTotal >= 150 ? 10 : 0);
            const thresholdDiscount = (subTotal * discountPercent) / 100;
            const totalDiscount = thresholdDiscount + (discount || 0);
            const totalAmount = subTotal + shipping - totalDiscount;

            if (totalAmount <= 0) {
                showNotification("Cart is empty!", 'warning');
                return;
            }

            const orderRes = await fetch(`${SERVER_URL}/api/payment/createOrder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount: totalAmount, currency: "INR" })
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const orderData = await orderRes.json();

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Freshmart",
                description: "Grocery Purchase",
                order_id: orderData.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch(`${SERVER_URL}/api/payment/verifyPayment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                order_id: orderData.id,
                                payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        if (verifyRes.ok) {
                            // Backend tracking of checkout and Cart Clearing
                            const checkoutRes = await fetch(`${SERVER_URL}/api/transactions/checkout`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
                                    subtotal: subTotal,
                                    shipping_charges: shipping,
                                    discount_amount: totalDiscount
                                })
                            });

                            if (!checkoutRes.ok) {
                                const errData = await checkoutRes.json();
                                throw new Error(`Transaction failed: ${errData.error || checkoutRes.statusText}`);
                            }

                            // Clear cart and show success modal ONLY if backend succeeded
                            setCart([]);
                            setRecommendedAddedIds(new Set());
                            setShowSuccessModal(true);
                            fetchTransactions(); // Refresh Order History
                        }
                    } catch (err) {
                        console.error("Payment Verification Error:", err);
                        showNotification(`Payment verified but Order Creation failed: ${err.message}. Please contact support.`, 'error');
                    }
                },
                prefill: { name: user.username || "Customer" },
                theme: { color: "#4caf50" }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (err) {
            console.error("Checkout Error:", err);
        }
    };

    // --- RENDER HELPERS ---

    const renderHome = () => {
        const categoryImages = {
            'dairy': '/images/cat_dairy.png',
            'staples': '/images/cat_staples.png',
            'baby-products': '/images/cat_baby.png',
            'self-care': '/images/cat_selfcare.png',
            'fruits-vegetables': '/images/cat_fruits-vegetables.png',
            'snacks': '/images/cat_snacks.png',
            'beverages': '/images/cat_beverages.png'
        };

        return (
            <div className="home-view" style={{ padding: '2rem' }}>
                <div className="hero-section" style={{ textAlign: 'center', marginBottom: '3rem', padding: '3rem', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', borderRadius: '16px' }}>
                    <div className="welcome-banner">
                        <h1 style={{ fontSize: '3rem', color: '#2e7d32', margin: '0 0 1rem 0' }}>Welcome, {user.username || 'Shopper'}!</h1>
                        <p style={{ fontSize: '1.4rem', color: '#555', fontStyle: 'italic', maxWidth: '800px', margin: '0 auto' }}>"{welcomeMsg}"</p>
                    </div>

                    <div className="search-bar-container" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', gap: '10px', marginTop: '2rem' }}>
                        <input
                            type="text"
                            placeholder="Craving something specific? Search here..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ flex: 1, padding: '1.2rem 2rem', borderRadius: '60px', border: 'none', fontSize: '1.1rem', boxShadow: '0 15px 30px rgba(0,0,0,0.06)', outline: 'none' }}
                        />
                        <button
                            onClick={() => navigate('shop', 'All', searchQuery)}
                            style={{ padding: '0 2.5rem', borderRadius: '60px', background: '#4caf50', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '900', boxShadow: '0 8px 15px rgba(76, 175, 80, 0.2)' }}
                        >
                            Find It!
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '2rem', fontWeight: '800' }}>Explore Our Aisles</h2>
                    <span style={{ color: '#4caf50', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => navigate('shop')}>Browse All Products →</span>
                </div>

                <div className="categories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
                    {['All', ...new Set(products.filter(p => p.category).map(p => p.category))].map(cat => (
                        <div
                            key={cat}
                            onClick={() => navigate('shop', cat)}
                            className="category-card-premium"
                            style={{
                                padding: '1.5rem',
                                background: 'white',
                                borderRadius: '24px',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                border: '2px solid transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '15px'
                            }}
                        >
                            <div className="cat-img-wrap" style={{ width: '130px', height: '130px', background: '#fcfcfc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0f0f0' }}>
                                <img
                                    src={categoryImages[cat] || '/images/freshmart_icon.png'}
                                    alt={cat}
                                    style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                                    onError={(e) => { e.target.src = '/images/freshmart_icon.png'; }}
                                />
                            </div>
                            <h3 style={{ margin: 0, color: '#333', textTransform: 'capitalize', fontWeight: '800', fontSize: '1.2rem' }}>
                                {cat === 'All' ? 'Everything' : cat.replace('-', ' ')}
                            </h3>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCustomerView = () => (
        <div className="dashboard-section">
            <header className="customer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#4caf50', padding: '1rem 2rem', borderRadius: '8px', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div
                        onClick={() => navigate('home')}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}
                    >
                        <style>
                            {`@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');`}
                        </style>
                        <img
                            src="/images/freshmart_logo_white.png"
                            alt="Freshmart"
                            style={{ height: '55px', objectFit: 'contain' }}
                        />
                        <span style={{ fontFamily: "'Pacifico', cursive", fontSize: '2.5rem', color: 'white', textTransform: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Freshmart</span>
                    </div>

                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>


                    <button
                        onClick={() => navigate('cart')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="My Basket"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span style={{ fontWeight: 'bold' }}>({cart.reduce((acc, item) => acc + item.quantity, 0)})</span>
                    </button>

                    <button
                        onClick={() => navigate('profile-wishlist')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                        title="My Wishlist"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="1">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                        </svg>
                    </button>

                    <button
                        onClick={() => navigate('profile')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}
                        title="My Profile"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </button>

                    {isManager(user.role) && (
                        <button
                            onClick={() => setView('reports')}
                            style={{ marginLeft: '10px', padding: '10px 15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            Admin Panel
                        </button>
                    )}
                </div>
            </header>

            {customerView === 'home' && renderHome()}

            {customerView === 'shop' && (
                <div className="shop-view">
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '2rem', overflowX: 'auto', padding: '5px' }}>
                        {['All', ...new Set(products.filter(p => p.category).map(p => p.category))].map(cat => (
                            <button
                                key={cat}
                                onClick={() => navigate('shop', cat)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '10px 25px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: selectedCategory === cat ? '#2e7d32' : '#fff',
                                    color: selectedCategory === cat ? '#fff' : '#666',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '25px' }}>
                        {products
                            .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) &&
                                (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map(p => (
                                <div key={p._id} className="p-card-modern" style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', border: '1px solid #f0f0f0', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', position: 'relative' }} onClick={() => setSelectedProduct(p)}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleWishlist(p); }}
                                        style={{
                                            position: 'absolute', top: '15px', right: '15px', background: '#fff', border: 'none',
                                            borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 5,
                                            color: wishlist.some(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`)) ? '#ff5252' : '#ddd',
                                            fontSize: '1.2rem'
                                        }}
                                    >
                                        {wishlist.some(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`)) ? '❤️' : '🤍'}
                                    </button>
                                    <div style={{ height: '220px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfcfc' }}>
                                        <img src={p.imageUrl || '/images/freshmart_icon.png'} alt={p.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1a1a1a', fontWeight: '800' }}>{p.name}</h3>
                                        <p style={{ margin: '5px 0 5px', color: '#888', fontSize: '0.9rem' }}>{p.brand}</p>
                                        <p style={{ margin: '0 0 15px', fontSize: '0.85rem', color: '#d32f2f', fontWeight: 'bold', height: '20px' }}>
                                            {p.stock <= 0 ? 'Out of Stock' : ''}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#2e7d32' }}>₹{p.price}</span>
                                            {cart.some(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`)) ? (
                                                <div style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', border: '1px solid #4caf50', overflow: 'hidden', height: '36px' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const pid = p.productId || `P${String(p.id).padStart(3, '0')}`;
                                                            removeFromCart(pid);
                                                        }}
                                                        style={{ width: '32px', height: '100%', border: 'none', borderRight: '1px solid #4caf50', background: '#fff', color: '#2e7d32', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', paddingBottom: '3px' }}
                                                    >
                                                        -
                                                    </button>
                                                    <span style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontWeight: '900', color: '#1b5e20', fontSize: '1rem' }}>
                                                        {cart.find(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`)).quantity}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const currentQty = cart.find(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`))?.quantity || 0;
                                                            if (currentQty >= p.stock) {
                                                                showNotification("Cannot add more: Stock limit reached", 'warning');
                                                                return;
                                                            }
                                                            addToCart(p);
                                                        }}
                                                        style={{
                                                            width: '32px', height: '100%', border: 'none', borderLeft: '1px solid #4caf50',
                                                            background: cart.find(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`)).quantity >= p.stock ? '#eee' : '#2e7d32',
                                                            color: cart.find(item => item.productId === (p.productId || `P${String(p.id).padStart(3, '0')}`)).quantity >= p.stock ? '#888' : '#fff',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', paddingBottom: '3px'
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (p.stock <= 0) {
                                                            showNotification("Item is Out of Stock", 'warning');
                                                            return;
                                                        }
                                                        addToCart(p);
                                                    }}
                                                    style={{
                                                        padding: '10px 15px',
                                                        background: p.stock <= 0 ? '#eee' : '#4caf50',
                                                        color: p.stock <= 0 ? '#888' : 'white',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        fontWeight: 'bold',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {p.stock <= 0 ? 'Out of Stock' : 'Add +'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {customerView === 'cart' && (
                <div className="cart-page-container">
                    <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1a1a1a', marginBottom: '2rem' }}>Your Shopping Basket</h2>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem', background: '#fff', borderRadius: '32px' }}>
                            <p style={{ fontSize: '1.5rem', color: '#888', marginBottom: '1.5rem' }}>Your basket is feeling a bit empty...</p>
                            <button onClick={() => navigate('shop')} style={{ padding: '15px 40px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>Go Fill It Up!</button>
                        </div>
                    ) : (
                        <div className="cart-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '60px', width: '100%', marginBottom: '0' }}>
                            {/* TOP SECTION: Snug Items & Recommendations */}
                            <div className="cart-main-row" style={{
                                display: 'flex',
                                gap: '40px',
                                alignItems: 'stretch',
                                maxWidth: '1500px',
                                margin: '0 auto',
                                width: '100%',
                                padding: '0 20px'
                            }}>
                                {/* LEFT COLUMN: Cart Items */}
                                <div className="cart-items-list" style={{
                                    flex: 1,
                                    background: '#fff',
                                    padding: '2.5rem',
                                    borderRadius: '32px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {cart.map(item => (
                                        <div key={item.productId} className="cart-item-row" style={{ display: 'grid', gridTemplateColumns: '1fr 150px 100px', gap: '20px', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                <img src={item.imageUrl || item.image_url || '/images/freshmart_icon.png'} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{item.name}</h4>
                                                    <p style={{ margin: '4px 0 0', color: '#4caf50', fontWeight: 'bold' }}>₹{item.price}</p>
                                                </div>
                                            </div>
                                            <div style={{ justifySelf: 'center', display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', height: '36px' }}>
                                                <button
                                                    onClick={() => removeFromCart(item.productId)}
                                                    style={{ width: '36px', height: '100%', border: 'none', borderRight: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#555', paddingBottom: '3px' }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ width: '45px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const p = products.find(prod => prod.productId === item.productId);
                                                        if (p && p.stock <= item.quantity) {
                                                            showNotification("Cannot add more: Stock limit reached", 'warning');
                                                            return;
                                                        }
                                                        addToCart(item);
                                                    }}
                                                    style={{
                                                        width: '36px', height: '100%', border: 'none', borderLeft: '1px solid #ddd',
                                                        background: products.find(p => p.productId === item.productId)?.stock <= item.quantity ? '#eee' : '#f5f5f5',
                                                        cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#555', paddingBottom: '3px'
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div style={{ width: '100px', textAlign: 'right', fontWeight: '900', fontSize: '1.2rem' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* AI Recommendations (Leveled & Snug) */}
                                {aiRecommendations.length > 0 && (
                                    <div className="ai-discovery-sidebar" style={{
                                        flex: '0 0 420px',
                                        background: '#f1f8e9',
                                        padding: '2rem',
                                        borderRadius: '24px',
                                        border: '2px dashed #81c784',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '1.5rem' }}>✨</span>
                                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#2e7d32' }}>Just for You</h3>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {aiRecommendations.slice(0, 3).map((rec, i) => (
                                                <div key={i} style={{ background: '#fff', padding: '15px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #e0e0e0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                                        <img src={rec.image || '/images/freshmart_icon.png'} alt={rec.name} style={{ width: '50px', height: '50px', objectFit: 'contain' }} />
                                                        <div style={{ flex: 1 }}>
                                                            <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#333' }}>{rec.name}</h5>
                                                            <p style={{ margin: '2px 0 0', fontSize: '0.9rem', color: '#4caf50', fontWeight: 'bold' }}>₹{rec.price}</p>
                                                        </div>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: '#555', fontStyle: 'italic', marginBottom: '10px', lineHeight: '1.4' }}>"{rec.message}"</p>

                                                    <button
                                                        onClick={(e) => {
                                                            const p = products.find(x => x.productId === rec.productId);
                                                            if (p) {
                                                                const currentQty = cart.find(c => c.productId === rec.productId)?.quantity || 0;
                                                                if (p.stock <= currentQty) {
                                                                    showNotification("Cannot add more: Stock limit reached", 'warning');
                                                                    return;
                                                                }
                                                                addToCart(p);
                                                                setRecommendedAddedIds(prev => new Set(prev).add(p.productId));
                                                            }
                                                        }}
                                                        style={{
                                                            width: '100%', padding: '10px',
                                                            background: (recommendedAddedIds.has(rec.productId) || (products.find(x => x.productId === rec.productId)?.stock <= (cart.find(c => c.productId === rec.productId)?.quantity || 0))) ? '#eee' : '#4caf50',
                                                            color: (recommendedAddedIds.has(rec.productId) || (products.find(x => x.productId === rec.productId)?.stock <= (cart.find(c => c.productId === rec.productId)?.quantity || 0))) ? '#888' : '#fff',
                                                            border: 'none', borderRadius: '8px', fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                                                        }}
                                                    >
                                                        {recommendedAddedIds.has(rec.productId) ? '✓ Added' :
                                                            ((products.find(x => x.productId === rec.productId)?.stock <= (cart.find(c => c.productId === rec.productId)?.quantity || 0)) ? 'Max Stock' : `+ Add ${rec.name}`)}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Basket Growth Indicator */}
                                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #81c784' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem', fontWeight: 'bold', color: '#2e7d32' }}>
                                                <span>Basket Growth</span>
                                                <span>{Math.round((recommendedAddedIds.size / Math.max(aiRecommendations.length, 1)) * 100)}%</span>
                                            </div>
                                            <div style={{ height: '8px', background: 'rgba(129, 199, 132, 0.2)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${(recommendedAddedIds.size / Math.max(aiRecommendations.length, 1)) * 100}%`,
                                                    background: '#4caf50',
                                                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: '0 0 10px rgba(76, 175, 80, 0.4)'
                                                }}></div>
                                            </div>
                                            <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#558b2f', fontStyle: 'italic' }}>
                                                {recommendedAddedIds.size === 0 ? "Add suggested items to grow your basket!" :
                                                    recommendedAddedIds.size < aiRecommendations.length ? "You're exploring great deals! Keep it up." :
                                                        "100% Growth! You've discovered all our top picks."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ORDER SUMMARY: Truly Full-Width Footer */}
                            <div className="cart-summary-fullbleed" style={{
                                width: '100%',
                                background: '#fff',
                                borderTop: '2px solid #f0f0f0',
                                boxShadow: '0 -10px 40px rgba(0,0,0,0.03)',
                                padding: '4rem 0',
                                marginTop: '40px'
                            }}>
                                <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 40px' }}>
                                    {(() => {
                                        const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                                        const shipping = subtotal >= 70 ? 0 : 25;
                                        const discountPercent = subtotal >= 249 ? 15 : (subtotal >= 150 ? 10 : 0);
                                        const thresholdDiscount = (subtotal * discountPercent) / 100;
                                        const totalDiscount = thresholdDiscount + (discount || 0);
                                        const finalTotal = subtotal + shipping - totalDiscount;

                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '60px', alignItems: 'start' }}>

                                                {/* GROUP 1: Address & Summary Stacking */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                                    {/* Delivery Address */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#333' }}>Delivery Address</h4>
                                                        <div style={{ padding: '25px', background: '#f9f9f9', borderRadius: '20px', border: '1px solid #eee' }}>
                                                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>{user?.name || 'Home'}</p>
                                                            <p style={{ margin: '10px 0', color: '#666', lineHeight: '1.5' }}>
                                                                123 Fresh Garden Street,<br />
                                                                Green Valley, New Delhi,<br />
                                                                Pincode: 110001
                                                            </p>
                                                            <button style={{ background: 'none', border: 'none', color: '#4caf50', fontWeight: 'bold', padding: 0, cursor: 'pointer', fontSize: '0.9rem' }}>Change Address</button>
                                                        </div>
                                                    </div>

                                                    {/* Order Summary Details */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#333' }}>Order Summary</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '1.2rem' }}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: shipping === 0 ? '#4caf50' : '#666', fontSize: '1.2rem' }}>
                                                                <span>Shipping</span>
                                                                <span>{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
                                                            </div>
                                                            {totalDiscount > 0 && (
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e53935', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                                                    <span>Discount Applied ✨</span>
                                                                    <span>-₹{totalDiscount.toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '2.8rem', fontWeight: '950', color: '#1b5e20', marginTop: '10px', paddingTop: '20px', borderTop: '3px solid #f9f9f9' }}>
                                                                <span>Total</span><span>₹{finalTotal.toFixed(2)}</span>
                                                            </div>
                                                        </div>

                                                        {/* Integrated Alerts */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {shipping > 0 && (
                                                                <div style={{ fontSize: '0.9rem', color: '#856404', background: '#fff3cd', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ffeeba' }}>
                                                                    Add <strong>₹{(70 - subtotal).toFixed(2)}</strong> for Free Shipping!
                                                                </div>
                                                            )}
                                                            {subtotal < 249 && (
                                                                <div style={{ padding: '12px', background: '#fff9c4', borderRadius: '12px', textAlign: 'center', fontSize: '0.9rem', color: '#856404', border: '1px solid #fff176' }}>
                                                                    Add <strong>₹{((subtotal < 150 ? 150 : 249) - subtotal).toFixed(2)}</strong> for {subtotal < 150 ? '10%' : '15%'} OFF
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* GROUP 2: Payment & Actions Stacking */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                                    {/* Mode of Payment */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#333' }}>Mode of Payment</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {[
                                                                { id: 'upi', name: 'UPI (GPay / PhonePe)', icon: '📱' },
                                                                { id: 'card', name: 'Credit / Debit Card', icon: '💳' },
                                                                { id: 'banking', name: 'Net Banking', icon: '🏦' },
                                                                { id: 'cod', name: 'Cash on Delivery', icon: '💵' }
                                                            ].map(mode => (
                                                                <div
                                                                    key={mode.id}
                                                                    onClick={() => setSelectedPayment(mode.id)}
                                                                    style={{
                                                                        padding: '12px 20px',
                                                                        background: selectedPayment === mode.id ? '#e8f5e9' : '#f9f9f9',
                                                                        borderRadius: '16px',
                                                                        border: `2px solid ${selectedPayment === mode.id ? '#4caf50' : '#eee'}`,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '15px',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: '1.2rem' }}>{mode.icon}</span>
                                                                    <span style={{ fontWeight: selectedPayment === mode.id ? 'bold' : '500', color: selectedPayment === mode.id ? '#1b5e20' : '#444' }}>{mode.name}</span>
                                                                    {selectedPayment === mode.id && <span style={{ marginLeft: 'auto', color: '#4caf50', fontWeight: 'bold' }}>✓</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {discountPercent > 0 && (
                                                            <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '15px', textAlign: 'center', fontSize: '1rem', color: '#1b5e20', fontWeight: 'bold', border: '1px solid #c8e6c9' }}>
                                                                🎉 {discountPercent}% Discount Unlocked!
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions (Coupon & Pay) */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        {!showCouponInput ? (
                                                            <button onClick={() => setShowCouponInput(true)} style={{ width: '100%', background: 'none', border: '2px solid #4caf50', padding: '18px', borderRadius: '16px', color: '#4caf50', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>Have a Coupon?</button>
                                                        ) : (
                                                            <>
                                                                {couponMsg?.type === 'success' ? (
                                                                    <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '16px', border: '1px solid #c8e6c9', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                        <div style={{ color: '#1b5e20', fontWeight: 'bold', fontSize: '1.1rem' }}>✅ {couponMsg.text}</div>
                                                                        <button
                                                                            onClick={() => {
                                                                                setDiscount(0);
                                                                                setCouponCode('');
                                                                                setCouponMsg(null);
                                                                            }}
                                                                            style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'underline' }}
                                                                        >
                                                                            Remove Coupon
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                                            <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="CODE" style={{ flex: 1, padding: '15px', borderRadius: '16px', border: '1px solid #eee', background: '#f9f9f9', fontSize: '1rem', outline: 'none', color: '#333' }} />
                                                                            <button onClick={() => {
                                                                                const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                                                                                if (couponCode === 'WELCOME50') {
                                                                                    if (orderCount === 0 || (user && user.orderCount === 0)) {
                                                                                        setDiscount(subtotal * 0.50);
                                                                                        setCouponMsg({ text: 'Welcome Gift Applied!', type: 'success' });
                                                                                    } else {
                                                                                        setCouponMsg({ text: 'New Users Only', type: 'error' });
                                                                                    }
                                                                                    return;
                                                                                }
                                                                                const tiers = { 'FRESH10': 0.1, 'FRESH20': 0.2, 'FRESH30': 0.3 };
                                                                                if (tiers[couponCode]) { setDiscount(subtotal * tiers[couponCode]); setCouponMsg({ text: 'Applied!', type: 'success' }); }
                                                                                else { setCouponMsg({ text: 'Invalid Code', type: 'error' }); }
                                                                            }} style={{ background: '#4caf50', color: '#fff', border: 'none', padding: '15px 25px', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Apply</button>
                                                                        </div>
                                                                        {couponMsg && <p style={{ margin: '5px 0 0', fontSize: '0.9rem', color: couponMsg.type === 'success' ? 'green' : 'red', textAlign: 'center' }}>{couponMsg.text}</p>}
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                        <button onClick={handleCheckout} style={{
                                                            width: '100%',
                                                            padding: '30px',
                                                            background: '#2e7d32',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '24px',
                                                            fontWeight: '950',
                                                            fontSize: '1.5rem',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 15px 35px rgba(46, 125, 50, 0.3)'
                                                        }}>
                                                            Confirm & Pay
                                                        </button>
                                                    </div>
                                                </div>

                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                    )}
                </div>
            )}

            {customerView.startsWith('profile') && (
                <Profile
                    user={user}
                    customerView={customerView}
                    setCustomerView={setCustomerView}
                    handleLogout={handleLogout}
                    navigate={navigate}
                    wishlist={wishlist}
                    toggleWishlist={toggleWishlist}
                    addToCart={addToCart}
                    orderCount={orderCount}
                    transactions={transactions}
                    supportForm={supportForm}
                    setSupportForm={setSupportForm}
                    showNotification={showNotification}
                />
            )}
        </div>
    );

    const renderAdminView = () => {
        const dashboardTitle = hasRole(user.role, 'Admin') ? "Admin Control Center" :
            hasRole(user.role, 'Product Manager', 'ProductManager') ? "Product Manager Dashboard" :
                hasRole(user.role, 'Sales Manager', 'SalesManager') ? "Sales Manager Dashboard" : "Manager Dashboard";

        const menuItems = [
            { id: 'addProduct', label: 'Add Product', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>, roles: ['Admin', 'Product Manager', 'ProductManager'] },
            { id: 'sync', label: 'Sync Dataset', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"></path></svg>, action: handleImportDataset, roles: ['Admin', 'Product Manager', 'ProductManager'] },
            { id: 'support', label: 'Support', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>, action: fetchSupportRequests, roles: ['Admin', 'Product Manager', 'ProductManager', 'Sales Manager', 'SalesManager'] },
            { id: 'reports', label: 'Analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>, action: fetchReports, roles: ['Admin', 'Sales Manager', 'SalesManager'] },
            { id: 'home', label: 'Shop View', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>, roles: ['All'] },
            { id: 'logout', label: 'Logout', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>, action: handleLogout, roles: ['All'] }
        ];

        return (
            <div className="admin-view" style={{ padding: '3rem', maxWidth: '1400px', margin: '0 auto' }}>
                <h1 style={{ marginBottom: '2.5rem', fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a', letterSpacing: '-0.5px' }}>{dashboardTitle}</h1>

                {/* Modern Navigation Pills */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '3rem', background: '#fff', padding: '10px', borderRadius: '16px', display: 'inline-flex', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                    {menuItems.filter(item => item.roles.includes('All') || hasRole(user.role, ...item.roles)).map(item => {
                        const isActive = view === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.action) item.action();
                                    if (item.id !== 'sync') setView(item.id);
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 24px',
                                    background: isActive && item.id !== 'sync' ? '#2e7d32' : '#f5f5f5', // Improved visibility for inactive buttons
                                    color: isActive && item.id !== 'sync' ? '#fff' : '#444',
                                    border: 'none', borderRadius: '12px',
                                    cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? '0 4px 12px rgba(46, 125, 50, 0.3)' : 'none'
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        );
                    })}
                    {importStatus && <span style={{ alignSelf: 'center', marginLeft: '10px', color: '#666', fontSize: '0.9rem', fontWeight: '500' }}>{importStatus}</span>}
                </div>

                <div className="admin-content-area">
                    {view === 'addProduct' && (
                        <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', maxWidth: '800px' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '2rem', color: '#333' }}>Register New Product</h2>
                            <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Product ID</label>
                                    <input type="text" value={newProduct.productId} onChange={e => setNewProduct({ ...newProduct, productId: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #eee', background: '#f9f9f9', fontSize: '1rem', outline: 'none', transition: 'border 0.2s', color: '#333' }} placeholder="e.g. PROD123" />
                                </div>
                                <div style={{ gridColumn: 'span 1' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Category</label>
                                    <input type="text" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #eee', background: '#f9f9f9', fontSize: '1rem', outline: 'none', color: '#333' }} placeholder="e.g. Dairy" />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Product Name</label>
                                    <input type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #eee', background: '#f9f9f9', fontSize: '1rem', outline: 'none', color: '#333' }} placeholder="e.g. Organic Milk" />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#666', fontSize: '0.9rem' }}>Price (₹)</label>
                                    <input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #eee', background: '#f9f9f9', fontSize: '1rem', outline: 'none', color: '#333' }} placeholder="0.00" />
                                </div>
                                <button type="submit" style={{ gridColumn: 'span 2', marginTop: '15px', padding: '18px', background: 'linear-gradient(135deg, #4caf50, #2e7d32)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 20px rgba(46, 125, 50, 0.25)' }}>
                                    Register Product
                                </button>
                            </form>
                        </div>
                    )}

                    {view === 'reports' && reports && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {/* Sales Overview Card */}
                            <div style={{ background: 'linear-gradient(135deg, #2e7d32, #1b5e20)', color: '#fff', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 50px rgba(46, 125, 50, 0.25)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <h2 style={{ margin: '0 0 20px 0', fontSize: '1.4rem', fontWeight: '600', opacity: 0.9 }}>Monthly Performance</h2>
                                    <div style={{ display: 'flex', gap: '60px' }}>
                                        <div>
                                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Revenue</p>
                                            <p style={{ fontSize: '3.5rem', fontWeight: '800', margin: '5px 0 0', letterSpacing: '-1px' }}>₹{reports.sales?.totalRevenue?.toLocaleString() || 0}</p>
                                        </div>
                                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
                                        <div>
                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '600', opacity: 0.7 }}>Orders (This Month)</p>
                                            <p style={{ fontSize: '3.5rem', fontWeight: '800', margin: '5px 0 0', letterSpacing: '-1px' }}>{reports.sales?.count || 0}</p>
                                            {/* Fallback to show recent order count if monthly is 0 but we know user has orders? */}
                                            {/* Actually, let's just show what the backend says. */}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                {/* Top Products */}
                                <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>🏆</span>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Top Selling Products</h3>
                                    </div>
                                    {reports.topProducts?.length === 0 ? <p style={{ color: '#888' }}>No sales data available yet.</p> : (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {reports.topProducts?.filter(p => p.product_id && p.product_id !== 'undefined') // Filter out bad data
                                                .map((p, i) => (
                                                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: i !== reports.topProducts.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            <span style={{ fontWeight: '900', color: '#ddd', fontSize: '1.2rem', width: '25px' }}>{i + 1}</span>
                                                            <span style={{ fontWeight: '600', color: '#444' }}>{products.find(x => x.productId === p.product_id)?.name || p.product_id}</span>
                                                        </div>
                                                        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>{p.count} sold</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    )}
                                </div>

                                {/* Market Basket Analysis */}
                                <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>👜</span>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Frequently Bought Together</h3>
                                    </div>
                                    {reports.mba?.length === 0 ? <p style={{ color: '#888' }}>Not enough data for insights yet.</p> : (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {reports.mba?.map((r, i) => (
                                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: i !== reports.mba.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                                    <span style={{ color: '#555', fontWeight: '500' }}>{r.pair.map(id => products.find(x => x.productId === id)?.name || id).join(' + ')}</span>
                                                    <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>{r.count} times</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {view === 'support' && (
                        <div className="support-admin-section" style={{ background: '#fff', padding: '3rem', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '2rem', color: '#333' }}>Customer Support Requests</h2>
                            {supportRequests.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No active requests. Good job! 🎉</div> : (
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {supportRequests.map(req => (
                                        <div key={req._id} style={{ padding: '25px', border: '1px solid #f0f0f0', borderRadius: '20px', background: '#fff', transition: 'transform 0.2s', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                                                <strong style={{ fontSize: '1.1rem', color: '#222' }}>{req.subject}</strong>
                                                <div>
                                                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: '#e3f2fd', color: '#1565c0', marginRight: '10px' }}>{req.category || 'General'}</span>
                                                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', background: req.status === 'Resolved' ? '#e8f5e9' : '#fff3e0', color: req.status === 'Resolved' ? '#2e7d32' : '#e65100' }}>{req.status}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: '#888', marginBottom: '15px' }}>
                                                <span>From: <strong>{req.customerName}</strong></span>
                                                <span>&bull;</span>
                                                <span>{req.email}</span>
                                            </div>
                                            <p style={{ margin: '0 0 20px 0', lineHeight: '1.6', color: '#444', background: '#fafafa', padding: '15px', borderRadius: '12px' }}>{req.message}</p>
                                            <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '2px dashed #e0e0e0' }}>
                                                <h4 style={{ margin: '0 0 15px 0', color: '#1976d2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>🛠️</span> Resolution & Reply
                                                </h4>
                                                <textarea
                                                    id={`reply-${req._id}`}
                                                    key={req._id} // Force re-render per ticket
                                                    placeholder={req.adminReply ? "Edit your resolution message..." : "Type your resolution message here..."}
                                                    defaultValue={req.adminReply || ""}
                                                    onChange={(e) => {
                                                        // Optional: Could update local state here if needed
                                                        req.tempReply = e.target.value;
                                                    }}
                                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #ccc', marginBottom: '15px', minHeight: '120px', resize: 'vertical', fontSize: '1rem', outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        // Use the value directly from the DOM element at the moment of click
                                                        const replyInput = document.getElementById(`reply-${req._id}`);
                                                        const replyText = replyInput ? replyInput.value : "";

                                                        console.log("Submitting reply for", req._id, ":", replyText); // Debug log

                                                        if (!replyText.trim()) return showNotification("Please type a message first.", 'warning');

                                                        // Use current status or force 'Resolved'
                                                        const newStatus = 'Resolved';
                                                        showNotification("Saving message...", 'info');

                                                        try {
                                                            const token = sessionStorage.getItem('token');
                                                            const res = await fetch(`${SERVER_URL}/api/support/${req._id}`, {
                                                                method: 'PUT',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'Authorization': `Bearer ${token}`
                                                                },
                                                                body: JSON.stringify({ status: newStatus, adminReply: replyText })
                                                            });
                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                console.log("Update success:", data);
                                                                showNotification('Message Updated Successfully! ✅', 'success');
                                                                fetchSupportRequests();
                                                            } else {
                                                                const err = await res.json();
                                                                showNotification(`Failed: ${err.error} ❌`, 'error');
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            showNotification('Network error.', 'error');
                                                        }
                                                    }}
                                                    style={{ padding: '12px 25px', background: req.status === 'Resolved' ? '#1976d2' : '#4caf50', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', transition: 'background 0.2s' }}
                                                    onMouseOver={(e) => e.target.style.background = req.status === 'Resolved' ? '#1565c0' : '#388e3c'}
                                                    onMouseOut={(e) => e.target.style.background = req.status === 'Resolved' ? '#1976d2' : '#4caf50'}
                                                >
                                                    {req.status === 'Resolved' ? 'Update Message' : 'Resolve & Send Message'}
                                                </button>
                                            </div>
                                            {req.adminReply && (
                                                <div style={{ marginTop: '20px', padding: '20px', background: '#f1f8e9', borderRadius: '15px', borderLeft: '5px solid #4caf50' }}>
                                                    <strong style={{ color: '#1b5e20', display: 'block', marginBottom: '8px' }}>Admin Resolution:</strong>
                                                    <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>{req.adminReply}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        );
    };

    return (
        <div className="dashboard-root" style={{ minHeight: '100vh', background: '#fcfcfc' }}>
            <main>
                {(hasRole(user.role, 'Customer') || view === 'home') && renderCustomerView()}
                {isManager(user.role) && view !== 'home' && renderAdminView()}
            </main>
            {selectedProduct && (
                <div className="modal-overlay" onClick={() => setSelectedProduct(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="product-modal" onClick={e => e.stopPropagation()} style={{ background: '#fff', width: '1000px', borderRadius: '32px', overflow: 'hidden', display: 'flex', position: 'relative' }}>
                        <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: '#f5f5f5', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem', zIndex: 10 }}>×</button>
                        <div style={{ flex: 1, background: '#fcfcfc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px' }}>
                            <img src={selectedProduct.imageUrl || '/images/freshmart_icon.png'} alt={selectedProduct.name} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, padding: '50px', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#4caf50', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>{selectedProduct.category}</span>
                            <h2 style={{ fontSize: '2.5rem', margin: '15px 0', fontWeight: '900' }}>{selectedProduct.name}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                <span style={{ fontSize: '2rem', fontWeight: '900', color: '#1b5e20' }}>₹{selectedProduct.price}</span>
                                <div style={{ background: '#fff9c4', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold' }}>⭐ {selectedProduct.rating || 4.5}</div>
                            </div>
                            <p style={{ fontSize: '1.1rem', color: '#666', lineHeight: '1.8', flex: 1 }}>{selectedProduct.description || "A fresh and high-quality selection just for you. Sourced directly from our organic farms to your table."}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '30px 0' }}>
                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '15px' }}><strong>Stock:</strong> {selectedProduct.stock || 'In Stock'}</div>
                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '15px' }}><strong>Weight:</strong> {selectedProduct.weight || '500g'}</div>
                            </div>
                            <button
                                onClick={() => {
                                    const currentQty = cart.find(item => item.productId === (selectedProduct.productId || `P${String(selectedProduct.id).padStart(3, '0')}`))?.quantity || 0;
                                    if (selectedProduct.stock <= currentQty) {
                                        showNotification("Cannot add more: Stock limit reached", 'warning');
                                        return;
                                    }
                                    if (selectedProduct.stock <= 0) {
                                        showNotification("Item is Out of Stock", 'warning');
                                        return;
                                    }
                                    addToCart(selectedProduct);
                                    setSelectedProduct(null);
                                }}
                                style={{
                                    padding: '20px',
                                    background: (selectedProduct.stock <= 0 || (cart.find(item => item.productId === (selectedProduct.productId || `P${String(selectedProduct.id).padStart(3, '0')}`))?.quantity || 0) >= selectedProduct.stock) ? '#eee' : '#4caf50',
                                    color: (selectedProduct.stock <= 0 || (cart.find(item => item.productId === (selectedProduct.productId || `P${String(selectedProduct.id).padStart(3, '0')}`))?.quantity || 0) >= selectedProduct.stock) ? '#888' : '#fff',
                                    border: 'none', borderRadius: '60px', fontWeight: '900', fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 25px rgba(76, 175, 80, 0.3)'
                                }}
                            >
                                {selectedProduct.stock <= 0 ? 'Out of Stock' :
                                    ((cart.find(item => item.productId === (selectedProduct.productId || `P${String(selectedProduct.id).padStart(3, '0')}`))?.quantity || 0) >= selectedProduct.stock ? 'Max Stock Reached' : 'Add to Basket')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Success Modal */}
            {/* Toast Notification */}
            {notification.visible && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: notification.type === 'error' ? '#d32f2f' : (notification.type === 'success' ? '#4caf50' : '#333'),
                    color: '#fff',
                    padding: '16px 32px',
                    borderRadius: '50px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    zIndex: 11000,
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    animation: 'fadeInUp 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span>{notification.type === 'success' ? '✅' : (notification.type === 'error' ? '❌' : 'ℹ️')}</span>
                    {notification.message}
                </div>
            )}

            {showSuccessModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: '#fff', padding: '40px', borderRadius: '32px', textAlign: 'center', maxWidth: '450px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ width: '100px', height: '100px', background: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px', color: '#4caf50', fontSize: '50px', boxShadow: '0 10px 20px rgba(76, 175, 80, 0.2)' }}>
                            ✓
                        </div>
                        <h2 style={{ margin: '0 0 10px', color: '#1b5e20', fontSize: '2rem', fontWeight: '900' }}>Payment Successful!</h2>
                        <p style={{ color: '#666', marginBottom: '35px', fontSize: '1.1rem', lineHeight: '1.5' }}>Your order has been placed successfully.<br />Thank you for shopping with Freshmart!</p>
                        <button
                            onClick={() => { setShowSuccessModal(false); navigate('home'); }}
                            style={{ background: '#4caf50', color: 'white', border: 'none', padding: '18px 50px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 25px rgba(76, 175, 80, 0.3)', transition: 'transform 0.2s', width: '100%' }}
                        >
                            Continue Shopping
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
