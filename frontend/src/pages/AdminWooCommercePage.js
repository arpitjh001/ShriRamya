import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    wcProductsAPI,
    wcCategoriesAPI,
    wcOrdersAPI,
    wcCustomersAPI,
    wcCouponsAPI,
} from '../lib/wcApi';
import { authAPI } from '../lib/api';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';

const TABS = ['Products', 'Categories', 'Orders', 'Customers', 'Coupons'];

const AdminWooCommercePage = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Products');
    const [loading, setLoading] = useState(false);
    const [adminCheck, setAdminCheck] = useState('checking'); // 'checking' | 'admin' | 'denied' | 'login'

    // Data states
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [coupons, setCoupons] = useState([]);

    // Modal states
    const [showProductForm, setShowProductForm] = useState(false);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);

    // Login form
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Category management
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [sizeStock, setSizeStock] = useState([]); // [{size:'S', qty:0}]
    const [colorStock, setColorStock] = useState([]); // [{color:'Red', qty:0}]
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    /* Size UI moved to proper location */
    // Product form
    const [productForm, setProductForm] = useState({
        name: '', description: '', regular_price: '', sale_price: '',
        stock_quantity: 0, sku: '', status: 'publish', images: [''],
        fabric: '', occasion: '', care_instructions: '',
        size_stock: [], // will be synced with sizeStock state
    });

    // Coupon form
    const [couponForm, setCouponForm] = useState({
        code: '', discount_type: 'percent', amount: '10',
        description: '', usage_limit: '', expiry_date: '',
    });

    // Check admin on mount
    useEffect(() => {
        checkAdminAccess();
    }, [user]);

    const checkAdminAccess = async () => {
        if (!user) {
            setAdminCheck('login');
            return;
        }
        try {
            const res = await authAPI.checkAdmin();
            if (res.data.is_admin) {
                setAdminCheck('admin');
            } else {
                setAdminCheck('denied');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                setAdminCheck('login');
            } else {
                setAdminCheck('denied');
            }
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            await login(loginForm.email, loginForm.password);
            // After login, the useEffect on user will re-check admin
        } catch (err) {
            setLoginError(err.response?.data?.detail || 'Login failed');
        }
        setLoginLoading(false);
    };

    useEffect(() => {
        if (adminCheck !== 'admin') return;
        if (activeTab === 'Products') loadProducts();
        if (activeTab === 'Categories') loadCategories();
        if (activeTab === 'Orders') loadOrders();
        if (activeTab === 'Customers') loadCustomers();
        if (activeTab === 'Coupons') loadCoupons();
    }, [activeTab, adminCheck]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await wcProductsAPI.getAll({ per_page: 50 });
            setProducts(data.products || []);
        } catch { toast.error('Failed to load products'); }
        setLoading(false);
    };

    const loadCategories = async () => {
        setLoading(true);
        try {
            const catData = await wcCategoriesAPI.getAll();
            setCategories(catData.categories || []);
        } catch { toast.error('Failed to load categories'); }
        setLoading(false);
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await wcOrdersAPI.getAll({ per_page: 50 });
            setOrders(data.orders || []);
        } catch { toast.error('Failed to load orders'); }
        setLoading(false);
    };

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await wcCustomersAPI.getAll({ per_page: 50 });
            setCustomers(data.customers || []);
        } catch { toast.error('Failed to load customers'); }
        setLoading(false);
    };

    const loadCoupons = async () => {
        setLoading(true);
        try {
            const data = await wcCouponsAPI.getAll();
            setCoupons(data.coupons || []);
        } catch { toast.error('Failed to load coupons'); }
        setLoading(false);
    };

    // --- Product CRUD ---
    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Validation: Unique Colors
            const colorNames = colorStock.map(c => c.color.trim().toLowerCase()).filter(Boolean);
            if (new Set(colorNames).size !== colorNames.length) {
                toast.error('Each color must be unique.');
                setLoading(false);
                return;
            }

            // Aggregate Total Stock
            const totalSizeStock = sizeStock.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
            const totalColorStock = colorStock.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
            const aggregatedStock = totalSizeStock + totalColorStock;

            const data = {
                ...productForm,
                regular_price: parseFloat(productForm.regular_price),
                sale_price: productForm.sale_price ? parseFloat(productForm.sale_price) : null,
                stock_quantity: aggregatedStock || parseInt(productForm.stock_quantity) || 0,
                images: productForm.images.filter(Boolean),
                categories: selectedCategories.map(id => ({ id: parseInt(id) })),
                size_stock: sizeStock,
                color_stock: colorStock,
            };
            if (editProduct) {
                await wcProductsAPI.update(editProduct.id, data);
                toast.success('Product updated!');
            } else {
                await wcProductsAPI.create(data);
                toast.success('Product created!');
            }
            setShowProductForm(false);
            setEditProduct(null);
            resetProductForm();
            loadProducts();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to save product');
        }
        setLoading(false);
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await wcProductsAPI.delete(id);
            toast.success('Product deleted');
            loadProducts();
        } catch { toast.error('Delete failed'); }
    };

    const startEditProduct = (product) => {
        // Load size stock from meta
        const sizesMeta = product.meta_data?.find(m => m.key === '_sr_sizes');
        if (sizesMeta && typeof sizesMeta.value === 'string') {
            try { setSizeStock(JSON.parse(sizesMeta.value)); } catch { setSizeStock([]); }
        } else { setSizeStock([]); }
        // Load color stock from meta
        const colorsMeta = product.meta_data?.find(m => m.key === '_sr_colors');
        if (colorsMeta && typeof colorsMeta.value === 'string') {
            try { setColorStock(JSON.parse(colorsMeta.value)); } catch { setColorStock([]); }
        } else { setColorStock([]); }

        setEditProduct(product);
        setProductForm({
            name: product.name || '',
            description: product.description || '',
            regular_price: product.regular_price || product.price || '',
            sale_price: product.sale_price || '',
            stock_quantity: product.stock_quantity || 0,
            sku: product.sku || '',
            status: product.status || 'publish',
            images: product.images?.map(i => typeof i === 'string' ? i : i.src) || [''],
            fabric: '', occasion: '', care_instructions: '',
        });
        // Pre-select existing product categories
        setSelectedCategories(
            (product.categories || []).map(c => String(c.id))
        );
        setShowProductForm(true);
    };

    const resetProductForm = () => {
        setProductForm({
            name: '', description: '', regular_price: '', sale_price: '',
            stock_quantity: 0, sku: '', status: 'publish', images: [''],
            fabric: '', occasion: '', care_instructions: '',
            size_stock: [],
        });
        setSelectedCategories([]);
        setSizeStock([]);
        setColorStock([]);
    };

    const toggleCategory = (catId) => {
        const id = String(catId);
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        setCreatingCategory(true);
        try {
            const result = await wcCategoriesAPI.create({ name: newCategoryName.trim() });
            if (result) {
                toast.success(`Category "${newCategoryName}" created!`);
                setNewCategoryName('');
                // Refresh categories
                loadCategories();
                // Auto-select the new category
                if (result.id) setSelectedCategories(prev => [...prev, String(result.id)]);
            }
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to create category');
        }
        setCreatingCategory(false);
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Delete this category? This cannot be undone.')) return;
        try {
            await wcCategoriesAPI.delete(id);
            toast.success('Category deleted');
            loadCategories();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to delete category');
        }
    };

    const handleImageUpload = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be smaller than 10MB');
            return;
        }
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Upload failed');
            }
            const data = await res.json();
            const current = productForm.images.filter(Boolean);
            setProductForm(prev => ({ ...prev, images: [...current, data.url] }));
            toast.success(`Image "${file.name}" uploaded!`);
        } catch (err) {
            toast.error(err.message || 'Image upload failed');
        }
        setUploadingImage(false);
    };

    // --- Order Status ---
    const handleOrderStatus = async (orderId, newStatus) => {
        try {
            await wcOrdersAPI.updateStatus(orderId, newStatus);
            toast.success(`Order updated to ${newStatus}`);
            loadOrders();
        } catch { toast.error('Failed to update order'); }
    };

    // --- Coupon Create ---
    const handleCouponSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = {
                ...couponForm,
                usage_limit: couponForm.usage_limit ? parseInt(couponForm.usage_limit) : null,
                expiry_date: couponForm.expiry_date || null,
            };
            await wcCouponsAPI.create(data);
            toast.success('Coupon created!');
            setShowCouponForm(false);
            setCouponForm({ code: '', discount_type: 'percent', amount: '10', description: '', usage_limit: '', expiry_date: '' });
            loadCoupons();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to create coupon');
        }
        setLoading(false);
    };

    const STATUS_COLORS = {
        pending: '#f59e0b', processing: '#3b82f6', completed: '#10b981',
        cancelled: '#ef4444', refunded: '#8b5cf6', failed: '#dc2626',
        'on-hold': '#6b7280',
    };

    // ---- RENDER ----

    // Access Gate: checking
    if (adminCheck === 'checking') {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f0c29 0%, #1a1035 50%, #24243e 100%)',
                color: '#e2e8f0',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 16 }}>🔒</div>
                    <p style={{ color: '#94a3b8' }}>Checking admin access...</p>
                </div>
            </div>
        );
    }

    // Access Gate: login required
    if (adminCheck === 'login') {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f0c29 0%, #1a1035 50%, #24243e 100%)',
                color: '#e2e8f0', fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{
                    background: 'rgba(30,27,75,0.95)', border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 20, padding: '3rem', width: 400, textAlign: 'center',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
                    <h1 style={{
                        fontSize: '1.5rem', fontWeight: 700, marginBottom: 8,
                        background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Admin Access Required</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        Please log in with an admin account to access the WooCommerce Dashboard.
                    </p>
                    <form onSubmit={handleAdminLogin}>
                        <div style={{ marginBottom: 16 }}>
                            <input type="email" placeholder="Admin email" required
                                value={loginForm.email}
                                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                                style={{
                                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                                    border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)',
                                    color: '#e2e8f0', fontSize: '0.95rem', boxSizing: 'border-box',
                                }} />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <input type="password" placeholder="Password" required
                                value={loginForm.password}
                                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                style={{
                                    width: '100%', padding: '0.75rem 1rem', borderRadius: 10,
                                    border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)',
                                    color: '#e2e8f0', fontSize: '0.95rem', boxSizing: 'border-box',
                                }} />
                        </div>
                        {loginError && (
                            <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: 12 }}>{loginError}</p>
                        )}
                        <button type="submit" disabled={loginLoading} style={{
                            width: '100%', padding: '0.75rem', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff',
                            fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                        }}>{loginLoading ? 'Signing in...' : 'Sign In as Admin'}</button>
                    </form>
                    <button onClick={() => navigate('/')} style={{
                        marginTop: 16, background: 'none', border: 'none', color: '#64748b',
                        cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline',
                    }}>← Back to Store</button>
                </div>
            </div>
        );
    }

    // Access Gate: denied (logged in but not admin)
    if (adminCheck === 'denied') {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f0c29 0%, #1a1035 50%, #24243e 100%)',
                color: '#e2e8f0', fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{
                    background: 'rgba(30,27,75,0.95)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 20, padding: '3rem', width: 420, textAlign: 'center',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚫</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: '#f87171' }}>
                        Access Denied
                    </h1>
                    <p style={{ color: '#94a3b8', marginBottom: 8, fontSize: '0.9rem' }}>
                        Your account <strong style={{ color: '#e2e8f0' }}>{user?.email}</strong> does not have admin privileges.
                    </p>
                    <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.8rem' }}>
                        Contact the site administrator to request admin access.
                    </p>
                    <button onClick={() => navigate('/')} style={{
                        padding: '0.75rem 2rem', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff',
                        fontWeight: 600, cursor: 'pointer',
                    }}>← Back to Store</button>
                </div>
            </div>
        );
    }
    return (
        <div style={{
            minHeight: '100vh', padding: '2rem 3rem',
            background: 'linear-gradient(135deg, #0f0c29 0%, #1a1035 50%, #24243e 100%)',
            color: '#e2e8f0', fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{
                            fontSize: '2rem', fontWeight: 700,
                            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>WooCommerce Dashboard</h1>
                        <p style={{ color: '#94a3b8', marginTop: 4 }}>Manage products, orders, customers & coupons</p>
                    </div>
                    {loading && <div style={{
                        padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(99,102,241,0.2)',
                        color: '#a5b4fc', fontSize: '0.875rem',
                    }}>Loading...</div>}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', borderBottom: '1px solid rgba(148,163,184,0.2)', paddingBottom: 8 }}>
                    {TABS.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                            background: activeTab === tab ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === tab ? '#fff' : '#94a3b8',
                        }}>{tab}</button>
                    ))}
                </div>

                {/* ===== PRODUCTS TAB ===== */}
                {activeTab === 'Products' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Products ({products.length})</h2>
                            <button onClick={() => { resetProductForm(); setEditProduct(null); setShowProductForm(true); }} style={{
                                padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600,
                            }}>+ Add Product</button>
                        </div>

                        {/* Product Form Modal */}
                        {showProductForm && (
                            <div style={{
                                background: 'rgba(30,27,75,0.95)', border: '1px solid rgba(148,163,184,0.2)',
                                borderRadius: 16, padding: '2rem', marginBottom: '2rem',
                            }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    {editProduct ? 'Edit Product' : 'New Product'}
                                </h3>
                                <form onSubmit={handleProductSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {[
                                            ['name', 'Product Name', 'text', true],
                                            ['sku', 'SKU', 'text', false],
                                            ['regular_price', 'Price (₹)', 'number', true],
                                            ['sale_price', 'Sale Price (₹)', 'number', false],
                                            ['stock_quantity', 'Stock Qty', 'number', true],
                                            ['fabric', 'Fabric', 'text', false],
                                            ['occasion', 'Occasion', 'text', false],
                                        ].map(([key, label, type, required]) => (
                                            <div key={key}>
                                                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>{label}</label>
                                                <input type={type} value={productForm[key]} required={required}
                                                    onChange={e => setProductForm({ ...productForm, [key]: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)',
                                                        background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.9rem',
                                                    }} />
                                            </div>
                                        ))}
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Status</label>
                                            <select value={productForm.status}
                                                onChange={e => setProductForm({ ...productForm, status: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                                                    border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                                                }}>
                                                <option value="publish">Published</option>
                                                <option value="draft">Draft</option>
                                                <option value="private">Private</option>
                                            </select>
                                        </div>
                                        {/* Category Selector */}
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 8 }}>Categories</label>
                                            <div style={{
                                                border: '1px solid rgba(148,163,184,0.3)', borderRadius: 8,
                                                padding: '0.75rem', background: 'rgba(255,255,255,0.03)',
                                                maxHeight: 160, overflowY: 'auto',
                                            }}>
                                                {categories.length === 0 && (
                                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>No categories yet. Create one below.</p>
                                                )}
                                                {categories.filter(c => c.name !== 'Uncategorized').map(cat => (
                                                    <label key={cat.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                                                        cursor: 'pointer', fontSize: '0.9rem',
                                                    }}>
                                                        <input type="checkbox"
                                                            checked={selectedCategories.includes(String(cat.id))}
                                                            onChange={() => toggleCategory(cat.id)}
                                                            style={{ accentColor: '#667eea', width: 16, height: 16 }}
                                                        />
                                                        <span style={{ color: '#e2e8f0' }}>{cat.name}</span>
                                                        <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 'auto' }}>({cat.count || 0})</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {/* Inline Add Category */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <input
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    placeholder="New category name"
                                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                                                    style={{
                                                        flex: 1, padding: '0.4rem 0.75rem', borderRadius: 8,
                                                        border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)',
                                                        color: '#e2e8f0', fontSize: '0.85rem',
                                                    }}
                                                />
                                                <button type="button" onClick={handleCreateCategory} disabled={creatingCategory || !newCategoryName.trim()} style={{
                                                    padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                                                    background: newCategoryName.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)',
                                                    color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                                                    opacity: !newCategoryName.trim() ? 0.5 : 1,
                                                }}>{creatingCategory ? '...' : '+ Add'}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 16 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Description</label>
                                        <textarea value={productForm.description} rows={3}
                                            onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                                            style={{
                                                width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                                                border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                                            }} />
                                    </div>
                                    {/* Size Stock UI */}
                                    <div style={{ marginTop: 16 }}>
                                        <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>Size Stock</h4>
                                        {sizeStock.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                <select value={item.size} onChange={e => {
                                                    const newArr = [...sizeStock];
                                                    newArr[idx].size = e.target.value;
                                                    setSizeStock(newArr);
                                                }} style={{ padding: '0.4rem', borderRadius: 4, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                                                    <option value="">Select size</option>
                                                    <option value="S">S</option>
                                                    <option value="M">M</option>
                                                    <option value="L">L</option>
                                                    <option value="XL">XL</option>
                                                </select>
                                                <input type="number" min="0" placeholder="Qty" value={item.qty}
                                                    onChange={e => {
                                                        const newArr = [...sizeStock];
                                                        newArr[idx].qty = parseInt(e.target.value) || 0;
                                                        setSizeStock(newArr);
                                                    }}
                                                    style={{ width: 80, padding: '0.4rem', borderRadius: 4, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }} />
                                                <button type="button" onClick={() => setSizeStock(sizeStock.filter((_, i) => i !== idx))}
                                                    style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>✕</button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setSizeStock([...sizeStock, { size: '', qty: 0 }])}
                                            style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600 }}>
                                            + Add Size
                                        </button>
                                    </div>
                                    {/* Color Stock UI */}
                                    <div style={{ marginTop: 16 }}>
                                        <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>Color Stock</h4>
                                        {colorStock.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                {/* Color Swatch */}
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 6,
                                                    border: '1px solid rgba(148,163,184,0.3)',
                                                    background: item.color || 'transparent',
                                                    flexShrink: 0
                                                }} />
                                                <input type="text" placeholder="Color (e.g. Red, #ff0000)" value={item.color}
                                                    onChange={e => {
                                                        const newArr = [...colorStock];
                                                        newArr[idx].color = e.target.value;
                                                        setColorStock(newArr);
                                                    }}
                                                    style={{ flex: 1, padding: '0.4rem', borderRadius: 4, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }} />
                                                <input type="number" min="0" placeholder="Qty" value={item.qty}
                                                    onChange={e => {
                                                        const newArr = [...colorStock];
                                                        newArr[idx].qty = parseInt(e.target.value) || 0;
                                                        setColorStock(newArr);
                                                    }}
                                                    style={{ width: 80, padding: '0.4rem', borderRadius: 4, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }} />
                                                <button type="button" onClick={() => setColorStock(colorStock.filter((_, i) => i !== idx))}
                                                    style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>✕</button>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                                            <button type="button" onClick={() => setColorStock([...colorStock, { color: '', qty: 0 }])}
                                                style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontWeight: 600 }}>
                                                + Add Color
                                            </button>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                Total Variation Stock: {sizeStock.reduce((s, i) => s + (parseInt(i.qty) || 0), 0) + colorStock.reduce((s, i) => s + (parseInt(i.qty) || 0), 0)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 16 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 8 }}>Product Images</label>

                                        {/* Image Previews */}
                                        {productForm.images.filter(Boolean).length > 0 && (
                                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                                {productForm.images.filter(Boolean).map((img, idx) => (
                                                    <div key={idx} style={{ position: 'relative', width: 90, height: 90 }}>
                                                        <img src={img.startsWith('/') ? `${window.location.origin.replace(':3000', ':8000')}${img}` : img}
                                                            alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)' }}
                                                            onError={e => { e.target.style.display = 'none'; }} />
                                                        <button type="button" onClick={() => {
                                                            const newImages = productForm.images.filter((_, i) => i !== idx);
                                                            setProductForm({ ...productForm, images: newImages.length ? newImages : [''] });
                                                        }} style={{
                                                            position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                                                            background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer',
                                                            fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}>✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Upload Area */}
                                        <div style={{
                                            border: '2px dashed rgba(148,163,184,0.3)', borderRadius: 12,
                                            padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                                            background: uploadingImage ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                                            transition: 'all 0.2s',
                                        }}
                                            onClick={() => document.getElementById('imageUploadInput').click()}
                                            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#667eea'; }}
                                            onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)'; }}
                                            onDrop={async (e) => {
                                                e.preventDefault();
                                                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)';
                                                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                                for (const file of files) await handleImageUpload(file);
                                            }}>
                                            <input id="imageUploadInput" type="file" accept="image/*" multiple
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    for (const file of Array.from(e.target.files)) await handleImageUpload(file);
                                                    e.target.value = '';
                                                }} />
                                            {uploadingImage ? (
                                                <p style={{ color: '#a5b4fc', margin: 0, fontSize: '0.9rem' }}>📤 Uploading...</p>
                                            ) : (
                                                <>
                                                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>📷 Click or drag images here to upload</p>
                                                    <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.75rem' }}>JPG, PNG, WebP, GIF • Max 10MB each</p>
                                                </>
                                            )}
                                        </div>

                                        {/* URL Fallback */}
                                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                            <input
                                                placeholder="Or paste image URL..."
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const url = e.target.value.trim();
                                                        if (url) {
                                                            const current = productForm.images.filter(Boolean);
                                                            setProductForm({ ...productForm, images: [...current, url] });
                                                            e.target.value = '';
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    flex: 1, padding: '0.4rem 0.75rem', borderRadius: 8,
                                                    border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)',
                                                    color: '#e2e8f0', fontSize: '0.85rem',
                                                }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: '1.5rem' }}>
                                        <button type="submit" disabled={loading} style={{
                                            padding: '0.6rem 2rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                                            background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', fontWeight: 600,
                                        }}>{loading ? 'Saving...' : editProduct ? 'Update' : 'Create'}</button>
                                        <button type="button" onClick={() => { setShowProductForm(false); setEditProduct(null); }} style={{
                                            padding: '0.6rem 2rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)',
                                            background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                        }}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Products Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                                        {['Image', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)', transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '0.75rem' }}>
                                                {p.images?.[0]?.src ? (
                                                    <img src={p.images[0].src} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                                                ) : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.1)' }} />}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontWeight: 500 }}>{p.name}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {p.categories?.length > 0 ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {p.categories.map(c => (
                                                            <span key={c.id} style={{
                                                                padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem',
                                                                background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                                                            }}>{c.name}</span>
                                                        ))}
                                                    </div>
                                                ) : <span style={{ color: '#64748b', fontSize: '0.8rem' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {p.sale_price ? (
                                                    <><span style={{ textDecoration: 'line-through', color: '#64748b', marginRight: 8 }}>₹{p.regular_price}</span>
                                                        <span style={{ color: '#f59e0b' }}>₹{p.sale_price}</span></>
                                                ) : <span>₹{p.regular_price || p.price}</span>}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem',
                                                    background: p.stock_quantity > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: p.stock_quantity > 0 ? '#10b981' : '#ef4444',
                                                }}>{p.stock_quantity ?? 'N/A'}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem',
                                                    background: p.status === 'publish' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                    color: p.status === 'publish' ? '#10b981' : '#f59e0b',
                                                }}>{p.status}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => startEditProduct(p)} style={{
                                                        padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.5)',
                                                        background: 'transparent', color: '#818cf8', cursor: 'pointer', fontSize: '0.8rem',
                                                    }}>Edit</button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} style={{
                                                        padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.5)',
                                                        background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem',
                                                    }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {products.length === 0 && !loading && (
                                <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    No products found. {!loading && 'WooCommerce may not be configured yet.'}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== CATEGORIES TAB ===== */}
                {activeTab === 'Categories' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Categories ({categories.length})</h2>
                        {/* Add Category */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder="New category name"
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateCategory())}
                                style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.85rem' }}
                            />
                            <button type="button" onClick={handleCreateCategory} disabled={creatingCategory || !newCategoryName.trim()}
                                style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: newCategoryName.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: '0.8rem', opacity: !newCategoryName.trim() ? 0.5 : 1 }}
                            >{creatingCategory ? '...' : '+ Add'}</button>
                        </div>
                        {/* Category List */}
                        <div style={{ border: '1px solid rgba(148,163,184,0.3)', borderRadius: 8, background: 'rgba(255,255,255,0.03)', maxHeight: 300, overflowY: 'auto' }}>
                            {categories.length === 0 && <p style={{ padding: '0.75rem', color: '#64748b' }}>No categories found.</p>}
                            {categories.map(cat => (
                                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                    <span style={{ color: '#e2e8f0' }}>{cat.name} ({cat.count || 0})</span>
                                    <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ===== ORDERS TAB ===== */}
                {activeTab === 'Orders' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Orders ({orders.length})</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                                        {['#', 'Customer', 'Total', 'Status', 'Date', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(o => (
                                        <tr key={o.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>#{o.id}</td>
                                            <td style={{ padding: '0.75rem' }}>{o.billing?.first_name} {o.billing?.last_name}<br />
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{o.billing?.email}</span></td>
                                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{o.total}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem',
                                                    background: `${STATUS_COLORS[o.status] || '#6b7280'}22`,
                                                    color: STATUS_COLORS[o.status] || '#6b7280',
                                                }}>{o.status}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                                {new Date(o.date_created).toLocaleDateString('en-IN')}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <select value={o.status} onChange={e => handleOrderStatus(o.id, e.target.value)} style={{
                                                    padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)',
                                                    background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer',
                                                }}>
                                                    {['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {orders.length === 0 && !loading && <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No orders found.</p>}
                        </div>
                    </div>
                )}

                {/* ===== CUSTOMERS TAB ===== */}
                {activeTab === 'Customers' && (
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Customers ({customers.length})</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                                    {['ID', 'Name', 'Email', 'Orders', 'Total Spent', 'Registered'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                        <td style={{ padding: '0.75rem' }}>#{c.id}</td>
                                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.first_name} {c.last_name}</td>
                                        <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{c.email}</td>
                                        <td style={{ padding: '0.75rem' }}>{c.orders_count ?? 0}</td>
                                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{c.total_spent ?? '0.00'}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                            {c.date_created ? new Date(c.date_created).toLocaleDateString('en-IN') : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {customers.length === 0 && !loading && <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No customers found.</p>}
                    </div>
                )}

                {/* ===== COUPONS TAB ===== */}
                {activeTab === 'Coupons' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Coupons ({coupons.length})</h2>
                            <button onClick={() => setShowCouponForm(!showCouponForm)} style={{
                                padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 600,
                            }}>+ Add Coupon</button>
                        </div>

                        {showCouponForm && (
                            <div style={{
                                background: 'rgba(30,27,75,0.95)', border: '1px solid rgba(148,163,184,0.2)',
                                borderRadius: 16, padding: '2rem', marginBottom: '2rem',
                            }}>
                                <form onSubmit={handleCouponSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Code *</label>
                                            <input value={couponForm.code} required
                                                onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Type</label>
                                            <select value={couponForm.discount_type}
                                                onChange={e => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                                                <option value="percent">Percentage</option>
                                                <option value="fixed_cart">Fixed Cart</option>
                                                <option value="fixed_product">Fixed Product</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>Amount</label>
                                            <input value={couponForm.amount}
                                                onChange={e => setCouponForm({ ...couponForm, amount: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: '1.5rem' }}>
                                        <button type="submit" disabled={loading} style={{
                                            padding: '0.6rem 2rem', borderRadius: 8, border: 'none',
                                            background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 600, cursor: 'pointer',
                                        }}>{loading ? 'Creating...' : 'Create Coupon'}</button>
                                        <button type="button" onClick={() => setShowCouponForm(false)} style={{
                                            padding: '0.6rem 2rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)',
                                            background: 'transparent', color: '#94a3b8', cursor: 'pointer',
                                        }}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                                    {['Code', 'Type', 'Amount', 'Usage', 'Expiry'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                        <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace', color: '#f59e0b' }}>{c.code}</td>
                                        <td style={{ padding: '0.75rem' }}>{c.discount_type}</td>
                                        <td style={{ padding: '0.75rem' }}>{c.discount_type === 'percent' ? `${c.amount}%` : `₹${c.amount}`}</td>
                                        <td style={{ padding: '0.75rem' }}>{c.usage_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                            {c.date_expires ? new Date(c.date_expires).toLocaleDateString('en-IN') : 'No expiry'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {coupons.length === 0 && !loading && <p style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No coupons found.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminWooCommercePage;
