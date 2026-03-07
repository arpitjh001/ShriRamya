import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    wcProductsAPI,
    wcCategoriesAPI,
    wcOrdersAPI,
    wcCustomersAPI,
    wcCouponsAPI,
} from '../services/wcApi.service';
import { authAPI, productsAPI, analyticsAPI, warehouseAPI, couponsAPI } from '../services/api';
import { formatPrice } from '../utils';
import { toast } from 'sonner';

// Import Phase 9 admin components
import AdminProductsPage from './AdminProductsPage';
import AdminInventoryPage from './AdminInventoryPage';
import AdminCouponsPage from './AdminCouponsPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminAnalyticsPage from './AdminAnalyticsPage';

// Updated TABS with Phase 9 features (removed WooCommerce tab)
const TABS = ['Native Products', 'Inventory', 'Coupons', 'Orders', 'Analytics'];

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
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingVariantIndex, setUploadingVariantIndex] = useState(null);

    /* Size UI moved to proper location */
    // Product form
    const [productForm, setProductForm] = useState({
        name: '', description: '', basePrice: '',
        sku: '', status: 'published', images: [''],
        fabric: '', occasion: '', care_instructions: '',
        attributes: [
            { name: "Color", values: [] },
            { name: "Size", values: [] }
        ],
        variants: [] // Array of explicit variants
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

    const getProductThumbnail = (product) => {
        if (!product) return '';

        const fromImages = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : null;
        const firstImage = typeof fromImages === 'string' ? fromImages : fromImages?.src;
        if (firstImage) return firstImage;

        if (typeof product.image === 'string' && product.image.trim()) {
            return product.image;
        }

        const variantImage = Array.isArray(product.variants)
            ? product.variants.find(v => typeof v?.image === 'string' && v.image.trim())?.image
            : null;

        return variantImage || '';
    };

    const addVariantRow = () => {
        setProductForm((prev) => ({
            ...prev,
            variants: [
                ...prev.variants,
                {
                    sku: '',
                    price: '',
                    discountPrice: '',
                    discountStart: '',
                    discountEnd: '',
                    stock: 0,
                    image: '',
                    attributes: { Color: '', Size: '' }
                }
            ]
        }));
    };

    const deleteVariantRow = (index) => {
        setProductForm((prev) => ({
            ...prev,
            variants: prev.variants.filter((_, idx) => idx !== index)
        }));
    };

    const updateVariantField = (index, field, value) => {
        setProductForm((prev) => ({
            ...prev,
            variants: prev.variants.map((variant, idx) =>
                idx === index ? { ...variant, [field]: value } : variant
            )
        }));
    };

    const updateVariantAttributeField = (index, key, value) => {
        setProductForm((prev) => ({
            ...prev,
            variants: prev.variants.map((variant, idx) =>
                idx === index
                    ? { ...variant, attributes: { ...(variant.attributes || {}), [key]: value } }
                    : variant
            )
        }));
    };

    // --- Product CRUD ---
    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!productForm.name?.trim() || productForm.basePrice === '') {
                toast.error('Name and Base Price are required.');
                setLoading(false);
                return;
            }
            // Validation: Unique Variants
            const variantHash = productForm.variants.map(v =>
                Object.entries(v.attributes).sort().map(e => `${e[0]}:${e[1]}`).join('|')
            );
            if (new Set(variantHash).size !== variantHash.length) {
                toast.error('Each variant combination must be unique.');
                setLoading(false);
                return;
            }
            // Validation: Unique SKUs
            const skuList = productForm.variants.map(v => v.sku?.trim().toLowerCase()).filter(Boolean);
            if (new Set(skuList).size !== skuList.length) {
                toast.error('Each variant SKU must be unique.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => !v.sku || !String(v.sku).trim())) {
                toast.error('SKU is required for each variant.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => v.price === '' || v.price === null || Number.isNaN(Number(v.price)))) {
                toast.error('Price is required for each variant.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => Number(v.price) < 0)) {
                toast.error('Price cannot be negative.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => v.stock === '' || v.stock === null || Number.isNaN(Number(v.stock)))) {
                toast.error('Stock is required for each variant.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => Number(v.stock) < 0)) {
                toast.error('Stock cannot be negative.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => v.discountPrice !== '' && v.discountPrice != null && Number(v.discountPrice) >= Number(v.price))) {
                toast.error('Variant discount price must be lower than price.');
                setLoading(false);
                return;
            }
            if (productForm.variants.some(v => v.discountStart && v.discountEnd && new Date(v.discountEnd) <= new Date(v.discountStart))) {
                toast.error('Variant discount end must be after discount start.');
                setLoading(false);
                return;
            }

            // Extract distinct values for the attributes definition
            let colorValues = new Set();
            let sizeValues = new Set();
            for (const v of productForm.variants) {
                const color = v.attributes?.Color ? String(v.attributes.Color).trim() : '';
                const size = v.attributes?.Size ? String(v.attributes.Size).trim() : '';
                if (color) colorValues.add(color);
                if (size) sizeValues.add(size);
            }

            const data = {
                name: productForm.name?.trim(),
                sku: productForm.sku?.trim() || null,
                description: productForm.description,
                fabric: productForm.fabric?.trim() || null,
                occasion: productForm.occasion?.trim() || null,
                basePrice: parseFloat(productForm.basePrice) || 0,
                status: productForm.status,
                attributes: [
                    { name: "Color", values: Array.from(colorValues) },
                    { name: "Size", values: Array.from(sizeValues) }
                ].filter(attr => attr.values.length > 0),
                variants: productForm.variants.map(v => ({
                    id: v.id || null,
                    sku: v.sku.trim(),
                    price: parseFloat(v.price) || 0,
                    discountPrice: v.discountPrice === '' || v.discountPrice == null ? null : (parseFloat(v.discountPrice) || null),
                    discountStart: v.discountStart || null,
                    discountEnd: v.discountEnd || null,
                    stock: parseInt(v.stock) || 0,
                    attributes: v.attributes,
                    image: v.image || productForm.images[0] || null
                })),
                categories: selectedCategories.length > 0 ? selectedCategories[0] : null
            };

            if (editProduct) {
                // Backend now handles the full variants array natively (Update / Insert / Delete)
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
            toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to save product');
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
        const toDatetimeLocal = (value) => {
            if (!value) return '';
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return '';
            return parsed.toISOString().slice(0, 16);
        };

        setEditProduct(product);
        setProductForm({
            name: product.name || '',
            description: product.description || '',
            basePrice: product.basePrice || product.price || product.regular_price || 0,
            sku: product.sku || '',
            status: product.status === 'publish' ? 'published' : (product.status || 'published'),
            images: product.images?.map(i => typeof i === 'string' ? i : i.src) || [''],
            fabric: product.fabric || '',
            occasion: product.occasion || '',
            care_instructions: product.care_instructions || '',
            variants: product.variants?.map(v => ({
                id: v.id,
                sku: v.sku || '',
                price: v.price || v.regular_price || 0,
                discountPrice: v.discountPrice ?? v.discount_price ?? '',
                discountStart: toDatetimeLocal(v.discountStart ?? v.discount_start),
                discountEnd: toDatetimeLocal(v.discountEnd ?? v.discount_end),
                stock: v.stock_quantity ?? v.stock ?? 0,
                attributes: v.attributes || {},
                image: v.image || ''
            })) || []
        });

        setSelectedCategories(
            (product.categories || []).map(c => String(c.id))
        );
        setShowProductForm(true);
    };

    const resetProductForm = () => {
        setProductForm({
            name: '', description: '', basePrice: '',
            sku: '', status: 'published', images: [''],
            fabric: '', occasion: '', care_instructions: '',
            attributes: [],
            variants: []
        });
        setSelectedCategories([]);
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

    const uploadImageToServer = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            throw new Error('Please select an image file');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Image must be smaller than 10MB');
        }

        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8002'}/api/v1/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Upload failed');
        }

        return await res.json();
    };

    const handleImageUpload = async (file) => {
        setUploadingImage(true);
        try {
            const data = await uploadImageToServer(file);
            const current = productForm.images.filter(Boolean);
            setProductForm(prev => ({ ...prev, images: [...current, data.url] }));
            toast.success(`Image "${file.name}" uploaded!`);
        } catch (err) {
            toast.error(err.message || 'Image upload failed');
        }
        setUploadingImage(false);
    };

    const handleVariantImageUpload = async (file, variantIndex) => {
        setUploadingVariantIndex(variantIndex);
        try {
            const data = await uploadImageToServer(file);
            updateVariantField(variantIndex, 'image', data.url);
            toast.success(`Variant image "${file.name}" uploaded!`);
        } catch (err) {
            toast.error(err.message || 'Variant image upload failed');
        }
        setUploadingVariantIndex(null);
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
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Product Management</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        Please log in with an admin account to access the Product Dashboard.
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
                        }}>Product Dashboard</h1>
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
                                            ['basePrice', 'Base Price (₹)', 'number', true],
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
                                                <option value="published">Published</option>
                                                <option value="draft">Draft</option>
                                                <option value="archived">Archived</option>
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
                                    {/* Explicit Variants UI */}
                                    <div style={{ marginTop: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h4 style={{ fontSize: '1rem', color: '#e2e8f0' }}>Variants ({productForm.variants.length})</h4>
                                            <button type="button" onClick={addVariantRow}
                                                style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600 }}>
                                                + Add Variant
                                            </button>
                                        </div>
                                        <div style={{
                                            border: '1px solid rgba(148,163,184,0.25)',
                                            borderRadius: 10,
                                            overflowX: 'auto',
                                            background: 'rgba(255,255,255,0.02)'
                                        }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
                                                        {['SKU', 'Color', 'Size', 'Price', 'Discount', 'Stock', 'Image URL', 'Actions'].map((header) => (
                                                            <th key={header} style={{ padding: '0.65rem', textAlign: 'left', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {productForm.variants.map((variant, idx) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="SKU"
                                                                    value={variant.sku || ''}
                                                                    onChange={e => updateVariantField(idx, 'sku', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 120, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Color"
                                                                    value={variant.attributes?.Color || ''}
                                                                    onChange={e => updateVariantAttributeField(idx, 'Color', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 100, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Size"
                                                                    value={variant.attributes?.Size || ''}
                                                                    onChange={e => updateVariantAttributeField(idx, 'Size', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 80, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Price"
                                                                    value={variant.price}
                                                                    onChange={e => updateVariantField(idx, 'price', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 100, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Discount"
                                                                    value={variant.discountPrice ?? ''}
                                                                    onChange={e => updateVariantField(idx, 'discountPrice', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 100, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="Stock"
                                                                    value={variant.stock}
                                                                    onChange={e => updateVariantField(idx, 'stock', e.target.value)}
                                                                    style={{ width: '100%', minWidth: 90, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <div style={{ display: 'flex', gap: 6, minWidth: 300 }}>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Image URL"
                                                                        value={variant.image || ''}
                                                                        onChange={e => updateVariantField(idx, 'image', e.target.value)}
                                                                        style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.82rem' }}
                                                                    />
                                                                    <input
                                                                        id={`variant-image-input-${idx}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        style={{ display: 'none' }}
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) await handleVariantImageUpload(file, idx);
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => document.getElementById(`variant-image-input-${idx}`)?.click()}
                                                                        style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid rgba(99,102,241,0.5)', background: 'transparent', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                                    >
                                                                        {uploadingVariantIndex === idx ? 'Uploading...' : 'Upload'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '0.5rem' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteVariantRow(idx)}
                                                                    style={{ padding: '0.35rem 0.65rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.5)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem' }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {productForm.variants.length === 0 && (
                                            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0' }}>No variants added yet. Click "+ Add Variant" to create one.</p>
                                        )}
                                    </div>
                                    <div style={{ marginTop: 16 }}>
                                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 8 }}>Product Images</label>

                                        {/* Image Previews */}
                                        {productForm.images.filter(Boolean).length > 0 && (
                                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                                                {productForm.images.filter(Boolean).map((img, idx) => (
                                                    <div key={idx} style={{ position: 'relative', width: 90, height: 90 }}>
                                                        <img src={img.startsWith('/') ? `${window.location.origin.replace(':3002', ':8002').replace(':3000', ':8002')}${img}` : img}
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
                                                {getProductThumbnail(p) ? (
                                                    <img
                                                        src={getProductThumbnail(p)}
                                                        alt={p.name || 'Product thumbnail'}
                                                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(148,163,184,0.25)' }}
                                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                                    />
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
                                                    <><span style={{ textDecoration: 'line-through', color: '#64748b', marginRight: 8 }}>₹{p.basePrice ?? p.regular_price}</span>
                                                        <span style={{ color: '#f59e0b' }}>₹{p.sale_price}</span></>
                                                ) : <span>₹{p.basePrice ?? p.regular_price ?? p.price ?? 0}</span>}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem',
                                                    background: (p.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) > 0 || p.stock_quantity > 0) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: (p.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) > 0 || p.stock_quantity > 0) ? '#10b981' : '#ef4444',
                                                }}>{p.variants ? p.variants.reduce((s, v) => s + (v.stock ?? 0), 0) : (p.stock_quantity ?? 'N/A')}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem',
                                                    background: p.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                    color: p.status === 'published' ? '#10b981' : '#f59e0b',
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
                                    No products found. {!loading && 'Click "+ Add Product" to create one.'}
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

                {/* ===== NATIVE PRODUCTS TAB (Phase 9) ===== */}
                {activeTab === 'Native Products' && <AdminProductsPage />}

                {/* ===== INVENTORY TAB (Phase 9) ===== */}
                {activeTab === 'Inventory' && <AdminInventoryPage />}

                {/* ===== COUPONS TAB (Phase 9) ===== */}
                {activeTab === 'Coupons' && <AdminCouponsPage />}

                {/* ===== ORDERS TAB (Phase 9) ===== */}
                {activeTab === 'Orders' && <AdminOrdersPage />}

                {/* ===== ANALYTICS TAB (Phase 9) ===== */}
                {activeTab === 'Analytics' && <AdminAnalyticsPage />}
            </div>
        </div>
    );
};

export default AdminWooCommercePage;


