import React, { useState, useEffect } from 'react';
import './App.css';

const Dashboard = ({ user, handleLogout }) => {
    const [aiRecommendations, setAiRecommendations] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [view, setView] = useState('home'); // home, reports, transactions, addProduct
    const [reports, setReports] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [importStatus, setImportStatus] = useState('');

    // Admin/Sales Form State
    const [newProduct, setNewProduct] = useState({
        productId: '', name: '', description: '', category: '', brand: '',
        batch_number: '', manufacture_date: '', expiry_date: '',
        price: '', storage_type: '', image_url: '',
        // New Fields
        weight: '',
        dimensions: { width: '', height: '', depth: '' },
        warrantyInformation: '', shippingInformation: '', availabilityStatus: '',
        returnPolicy: '', minimumOrderQuantity: '', tags: [], sku: '', rating: '', reviews: []
    });
    const [catalog, setCatalog] = useState([]);

    useEffect(() => {
        fetchCatalog();
    }, []);

    useEffect(() => {
        // Fetch products only after catalog is loaded
        if (catalog.length > 0) {
            fetchProducts();
        }
    }, [catalog]);

    // Fetch Cart on User Login
    useEffect(() => {
        if (user && user.id) {
            fetchCart();
        }
    }, [user]);

    const fetchCart = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/cart/${user.id || user._id}`);
            if (res.ok) {
                const data = await res.json();
                setCart(data);
            }
        } catch (err) {
            console.error("Failed to fetch cart", err);
        }
    };

    useEffect(() => {
        // Debug: Log catalog products when loaded
        if (catalog.length > 0) {
            console.log('Catalog Products:', catalog.map(p => ({ id: p.id, title: p.title, brand: p.brand })));
        }
    }, [catalog]);
    useEffect(() => {
        // Only run AI if user is a customer and has items in cart
        if (user.role === 'Customer' && cart.length > 0) {
            fetchAIRecommendations();
        }
    }, [cart]); // This triggers the brain every time the cart changes

    const fetchCatalog = async () => {
        try {
            const res = await fetch('/images/Dataset.json');
            const data = await res.json();
            if (data.products) {
                setCatalog(data.products);
            }
        } catch (err) {
            console.error("Failed to fetch catalog", err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/products');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const dbProducts = await res.json();
            console.log("Fetched dbProducts:", dbProducts);
            if (!Array.isArray(dbProducts)) throw new Error("dbProducts is not an array");

            // Enrich database products with dataset details
            const enrichedProducts = dbProducts.map(dbProduct => {
                // Try multiple matching strategies
                let datasetProduct = null;

                // Strategy 1: Exact title match
                datasetProduct = catalog.find(dsProduct =>
                    dsProduct.title.toLowerCase() === dbProduct.name.toLowerCase()
                );

                // Strategy 2: Match by productId (P001 -> 1)
                if (!datasetProduct && dbProduct.productId) {
                    const id = parseInt(dbProduct.productId.replace('P', ''));
                    datasetProduct = catalog.find(dsProduct => dsProduct.id === id);
                }

                // Strategy 3: Partial name match (contains)
                if (!datasetProduct) {
                    datasetProduct = catalog.find(dsProduct =>
                        dsProduct.title.toLowerCase().includes(dbProduct.name.toLowerCase()) ||
                        dbProduct.name.toLowerCase().includes(dsProduct.title.toLowerCase())
                    );
                }

                // Strategy 4: Brand + category match
                if (!datasetProduct && dbProduct.brand) {
                    datasetProduct = catalog.find(dsProduct =>
                        dsProduct.brand === dbProduct.brand &&
                        dsProduct.category === dbProduct.category
                    );
                }

                console.log('Matching:', dbProduct.name, '->', datasetProduct ? datasetProduct.title : 'No match');

                if (datasetProduct) {
                    // Merge database product with dataset details
                    return {
                        ...dbProduct,
                        // Use dataset fields for display
                        brand: datasetProduct.brand,
                        rating: datasetProduct.rating,
                        reviews: datasetProduct.reviews,
                        stock: datasetProduct.stock,
                        dimensions: datasetProduct.dimensions,
                        weight: datasetProduct.weight,
                        shippingInformation: datasetProduct.shippingInformation,
                        sku: datasetProduct.sku,
                        tags: datasetProduct.tags,
                        minimumOrderQuantity: datasetProduct.minimumOrderQuantity,
                        warrantyInformation: datasetProduct.warrantyInformation,
                        returnPolicy: datasetProduct.returnPolicy,
                        availabilityStatus: datasetProduct.availabilityStatus,
                        // Add image URLs from dataset
                        image_url: datasetProduct.images && datasetProduct.images.length > 0 ? datasetProduct.images[0] : datasetProduct.thumbnail,
                        imageUrl: datasetProduct.images && datasetProduct.images.length > 0 ? datasetProduct.images[0] : datasetProduct.thumbnail,
                        thumbnail: datasetProduct.thumbnail
                    };
                }
                return dbProduct;
            });

            setProducts(enrichedProducts);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const fetchReports = async (type) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/reports/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setReports(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/transactions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTransactions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAIRecommendations = async () => {
        try {
            const res = await fetch('http://localhost:5000/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: user._id || user.id,
                    currentCart: cart.map(item => item.productId) // Change item.productId to item.productId
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
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newProduct)
            });
            if (res.ok) {
                alert('Product Added');
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
                alert('Failed to add product');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addToCart = async (product) => {
        console.log('Current User State:', user);
        try {
            const res = await fetch('http://localhost:5000/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: user._id || user.id,
                    product: {
                        productId: product.productId,
                        name: product.name,
                        price: product.price,
                        imageUrl: product.image_url || product.imageUrl
                    }
                })
            });
            if (res.ok) {
                const updatedCart = await res.json();
                setCart(updatedCart);
            }
        } catch (err) {
            console.error("Failed to add to cart", err);
        }
    };

    const removeFromCart = async (index) => {
        const itemToRemove = cart[index];
        try {
            const res = await fetch('http://localhost:5000/api/cart/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: user._id || user.id,
                    productId: itemToRemove.productId
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
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/products/import-dataset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (res.ok) {
                setImportStatus(`Imported ${data.imported} products, skipped ${data.skipped}`);
                fetchProducts(); // Refresh products list
            } else {
                setImportStatus('Import failed: ' + data.error);
            }
        } catch (err) {
            setImportStatus('Import error: ' + err.message);
        }
    };

    const handleCheckout = async () => {
        try {
            const token = localStorage.getItem('token');
            const items = cart.map(item => ({ productId: item.productId, quantity: item.quantity }));
            const res = await fetch('http://localhost:5000/api/transactions/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items })
            });
            if (res.ok) {
                alert('Checkout Successful! Invoice Generated.');
                setCart([]);
            } else {
                alert('Checkout Failed');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // --- RENDER HELPERS ---

    const renderCustomerView = () => (
        <div className="dashboard-section">
            <h2>Welcome, {user.username || 'Customer'}</h2>
            <div className="customer-layout">
                <div className="product-grid">
                    {products.map(p => (
                        <div key={p._id} className="product-card">
                            <div style={{ position: 'relative' }}>
                                <img src={p.image_url || p.imageUrl || 'https://placehold.co/200'} alt={p.name} style={{ width: '100%', height: '200px', objectFit: 'contain' }} />
                            </div>

                            <h3 style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>{p.name || 'Unnamed Product'}</h3>

                            <p className="product-desc" style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                                {p.description ? p.description.substring(0, 80) + '...' : 'No description'}
                            </p>

                            <div className="product-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'left' }}>
                                <div>
                                    <strong>Brand:</strong> {p.brand || 'Generic'}
                                </div>
                                <div>
                                    <strong>Rating:</strong> {p.rating || 0} ⭐
                                    <span style={{ fontSize: '0.7rem', color: '#666' }}>({p.reviews?.length || 0} reviews)</span>
                                </div>

                                <div>
                                    <strong>Stock:</strong> {p.stock !== undefined ? p.stock : 'N/A'} units
                                </div>
                                <div>
                                    <strong>Dimensions:</strong> {p.dimensions ? `${p.dimensions.width}x${p.dimensions.height}x${p.dimensions.depth}` : 'N/A'}
                                </div>

                                <div>
                                    <strong>Weight:</strong> {p.weight || 'N/A'}
                                </div>
                                <div>
                                    <strong>Shipping:</strong> {p.shippingInformation || 'Standard'}
                                </div>

                                <div>
                                    <strong>SKU:</strong> {p.sku || 'N/A'}
                                </div>
                                <div>
                                    <strong>Tags:</strong> {p.tags?.join(', ') || 'None'}
                                </div>

                                <div>
                                    <strong>Min Order:</strong> {p.minimumOrderQuantity || 1}
                                </div>
                                <div>
                                    <strong>Policy:</strong> {p.returnPolicy || 'No Returns'}
                                </div>
                            </div>

                            <div className="product-price" style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '1rem 0' }}>
                                ${p.price || 0}
                            </div>

                            <button
                                onClick={() => addToCart(p)}
                                style={{ width: '100%', background: '#222', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Add to Basket
                            </button>
                        </div>
                    ))}
                </div>
                <div className="cart-sidebar">
                    {/* --- START AI RECOMMENDATIONS --- */}
                    {aiRecommendations.length > 0 && (
                        <div className="ai-nudge-box" style={{ background: '#f0f7ff', border: '1px dashed #007bff', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                            <h4 style={{ margin: '0 0 5px 0' }}>✨ Just for You</h4>
                            {aiRecommendations.map((rec, i) => (
                                <div key={i} style={{ marginBottom: '10px', borderBottom: '1px solid #d0e4ff', paddingBottom: '5px' }}>
                                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#0056b3', margin: '0 0 5px 0' }}>"{rec.message}"</p>
                                    <button
                                        style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        onClick={() => {
                                            // Matching frontend 'productId' with backend 'productId'
                                            const product = products.find(p => p.productId === rec.productId);
                                            if (product) addToCart(product);
                                        }}
                                    >
                                        + Add {rec.name}
                                    </button>
                                </div>
                            ))}
                            {analytics && (
                                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '5px' }}>
                                    <strong>Basket Growth: {analytics.projectedGrowth}</strong>
                                </div>
                            )}
                        </div>
                    )}
                    {/* --- END AI RECOMMENDATIONS --- */}

                    <h3>Your Basket</h3>
                    {cart.map((item, idx) => (
                        <div key={idx} className="cart-item">
                            <span>{item.name}</span>
                            <span>${item.price}</span>
                            <button onClick={() => removeFromCart(idx)}>X</button>
                        </div>
                    ))}
                    <div className="cart-total">
                        Total: ${cart.reduce((acc, item) => acc + (item.price || 0), 0)}
                    </div>
                    {cart.length > 0 && <button className="checkout-btn" onClick={handleCheckout}>Checkout</button>}
                </div>
            </div>
        </div>
    );

    const fillFromCatalog = (e) => {
        const productId = parseInt(e.target.value);
        const item = catalog.find(p => p.id === productId);
        if (item) {
            const today = new Date().toISOString().split('T')[0];
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            const expiry = nextYear.toISOString().split('T')[0];

            setNewProduct({
                ...newProduct,
                name: item.title,
                description: item.description,
                category: item.category,
                brand: item.brand || 'Generic',
                price: item.price,
                image_url: item.images && item.images.length > 0 ? item.images[0] : item.thumbnail,
                // Defaults for required fields not in JSON
                productId: `P${String(item.id).padStart(3, '0')}`,
                batch_number: item.sku || `BATCH-${item.id}`,
                manufacture_date: today,
                expiry_date: expiry,
                storage_type: 'Normal',
                // New Fields
                weight: item.weight,
                dimensions: item.dimensions,
                warrantyInformation: item.warrantyInformation,
                shippingInformation: item.shippingInformation,
                availabilityStatus: item.availabilityStatus,
                returnPolicy: item.returnPolicy,
                minimumOrderQuantity: item.minimumOrderQuantity,
                tags: item.tags,
                sku: item.sku,
                rating: item.rating,
                reviews: item.reviews
            });
        }
    };

    const renderAddProductForm = () => (
        <form className="admin-form" onSubmit={handleAddProduct}>
            <div style={{ gridColumn: 'span 2', marginBottom: '1rem' }}>
                <h3>Add New Product</h3>
                {catalog.length > 0 && (
                    <select onChange={fillFromCatalog} defaultValue="" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', border: '2px solid var(--accent-green)', borderRadius: '4px' }}>
                        <option value="" disabled>✨ Quick Fill from Catalog (Select an item)</option>
                        {catalog.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.title} - ${item.price}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <input type="text" placeholder="ID (P001)" value={newProduct.productId} onChange={e => setNewProduct({ ...newProduct, productId: e.target.value })} required />
            <input type="text" placeholder="Name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
            <input type="text" placeholder="Category" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} required />
            <input type="text" placeholder="Brand" value={newProduct.brand} onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })} />
            <input type="text" placeholder="Batch No" value={newProduct.batch_number} onChange={e => setNewProduct({ ...newProduct, batch_number: e.target.value })} required />
            <input type="date" placeholder="Mfg Date" value={newProduct.manufacture_date} onChange={e => setNewProduct({ ...newProduct, manufacture_date: e.target.value })} required />
            <input type="date" placeholder="Exp Date" value={newProduct.expiry_date} onChange={e => setNewProduct({ ...newProduct, expiry_date: e.target.value })} required />
            <input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required />
            <input type="text" placeholder="Storage Type" value={newProduct.storage_type} onChange={e => setNewProduct({ ...newProduct, storage_type: e.target.value })} />
            <input type="text" placeholder="Image URL" value={newProduct.image_url} onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })} />
            <button type="submit">Add Product</button>
        </form>
    );

    const renderAdminView = () => (
        <div className="dashboard-section">
            <div className="admin-nav">
                <button onClick={() => setView('addProduct')}>Add Product</button>
                <button onClick={handleImportDataset}>Import Dataset</button>
                <button onClick={() => { setView('reports'); fetchReports('mba'); }}>MBA Report</button>
                <button onClick={() => { setView('expiry'); fetchReports('expiry'); }}>Expiry Report</button>
                <button onClick={() => { setView('transactions'); fetchTransactions(); }}>Transactions</button>
            </div>
            {importStatus && (
                <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', margin: '1rem 0', borderRadius: '4px' }}>
                    <strong>Import Status:</strong> {importStatus}
                </div>
            )}

            {view === 'addProduct' && renderAddProductForm()}

            {view === 'reports' && reports && (
                <div className="report-view">
                    <h3>Market Basket Analysis (Frequent Pairs)</h3>
                    <ul>
                        {reports.map((r, i) => (
                            <li key={i}>{r.pair.join(' + ')} (Bought {r.count} times)</li>
                        ))}
                    </ul>
                </div>
            )}

            {view === 'expiry' && reports && (
                <div className="report-view">
                    <h3>Expiry Report</h3>
                    <h4>Expired</h4>
                    <ul>{reports.expired?.map(p => <li key={p._id}>{p.name} (Exp: {p.expiry_date})</li>)}</ul>
                    <h4>Near Expiry (30 Days)</h4>
                    <ul>{reports.nearExpiry?.map(p => <li key={p._id}>{p.name} (Exp: {p.expiry_date})</li>)}</ul>
                </div>
            )}
            {view === 'transactions' && (
                <div className="report-view">
                    <h3>All Transactions</h3>
                    <table>
                        <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Date</th></tr></thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t._id}>
                                    <td>{t.invoice_no}</td>
                                    <td>{t.customer_id?.username || 'N/A'}</td>
                                    <td>${t.total_price}</td>
                                    <td>{new Date(t.transaction_date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderSalesView = () => (
        <div className="dashboard-section">
            <div className="admin-nav">
                <button onClick={() => setView('addProduct')}>Add Product</button>
                <button onClick={() => { setView('sales'); fetchReports('sales?type=daily'); }}>Daily Sales</button>
                <button onClick={() => { setView('expiry'); fetchReports('expiry'); }}>Expiry Report</button>
                <button onClick={() => { setView('transactions'); fetchTransactions(); }}>Transactions</button>
            </div>
            {view === 'addProduct' && renderAddProductForm()}
            {view === 'sales' && reports && (
                <div className="report-view">
                    <h3>Sales Report</h3>
                    <p>Total Revenue: ${reports.totalRevenue}</p>
                    <p>Transaction Count: {reports.count}</p>
                </div>
            )}
            {view === 'expiry' && reports && (
                <div className="report-view">
                    <h3>Expiry Report</h3>
                    <ul>{reports.nearExpiry?.map(p => <li key={p._id}>{p.name} (Exp: {p.expiry_date})</li>)}</ul>
                </div>
            )}
            {view === 'transactions' && (
                <div className="report-view">
                    <h3>Transactions</h3>
                    <ul>{transactions.map(t => <li key={t._id}>{t.invoice_no} - ${t.total_price}</li>)}</ul>
                </div>
            )}
        </div>
    );

    const renderProductManagerView = () => (
        <div className="dashboard-section">
            <div className="admin-nav">
                <button onClick={() => setView('addProduct')}>Add Product</button>
            </div>
            {/* Default to add product view or maybe a list? For now, add product form is main request */}
            {/* If view is home (default), show Add Product or maybe product list? Let's show Add Product by default or button clicks */}

            {(view === 'addProduct' || view === 'home') && renderAddProductForm()}
        </div>
    );

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Retail Dashboard - {user.role}</h1>
                <button onClick={handleLogout} className="logout-btn">Sign Out</button>
            </header>
            <main>
                {user.role === 'Customer' && renderCustomerView()}
                {user.role === 'Admin' && renderAdminView()}
                {user.role === 'Sales Manager' && renderSalesView()}
                {user.role === 'Product Manager' && renderProductManagerView()}
            </main>
        </div>
    );
};

export default Dashboard;
