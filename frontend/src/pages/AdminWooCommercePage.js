import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI, productsAPI, analyticsAPI, warehouseAPI, couponsAPI, ordersAPI, categoriesAPI, userManagementService, uploadAPI } from '../services/api';
import { formatPrice } from '../utils';
import { toast } from 'sonner';

// Import Phase 9 admin components
import AdminProductsPage from './AdminProductsPage';
import AdminInventoryPage from './AdminInventoryPage';
import AdminCouponsPage from './AdminCouponsPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminAnalyticsPage from './AdminAnalyticsPage';
import AdminBlogsPage from './AdminBlogsPage';

// Updated TABS - Native APIs only
const TABS = ['Native Products', 'Categories', 'Inventory', 'Coupons', 'Journal', 'Orders', 'Analytics'];

// View modes for Products tab
const VIEW_MODES = {
    DETAILED: 'detailed', // View B - Dashboard style with badges
    LIST: 'list' // View A - Compact list view
};

const AdminDashboardPage = () => {
    const { user, login, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Native Products');
    const [viewMode, setViewMode] = useState(VIEW_MODES.DETAILED); // Default to detailed view (View B)
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

    const hasAdminRole = (candidate) => {
        if (!candidate) return false;

        const userRole = (candidate.role || '').toLowerCase();
        const userRoles = (candidate.roles || []).map(role => role.toLowerCase());

        return userRole === 'admin' || userRoles.includes('admin');
    };

    // Resolve the access gate immediately from the decoded token when possible.
    useEffect(() => {
        if (authLoading) {
            setAdminCheck('checking');
            return;
        }

        if (!user) {
            setAdminCheck('login');
            return;
        }

        if (hasAdminRole(user)) {
            setAdminCheck('admin');
            return;
        }

        checkAdminAccess();
    }, [user, authLoading]);

    const checkAdminAccess = async () => {
        if (authLoading) return;

        if (!user) {
            setAdminCheck('login');
            return;
        }

        if (hasAdminRole(user)) {
            setAdminCheck('admin');
            return;
        }

        try {
            const res = await authAPI.checkAdmin();
            // Response data is unwrapped by interceptor: res.data = { is_admin: true }
            if (res.data && res.data.is_admin) {
                setAdminCheck('admin');
            } else {
                setAdminCheck('denied');
            }
        } catch (err) {
            console.error('Admin check failed:', err);
            if (err.response?.status === 401) {
                setAdminCheck('login');
            } else if (err.response?.status === 403) {
                setAdminCheck('denied');
            } else {
                // For other errors, check user role directly as fallback
                const userRole = (user.role || '').toLowerCase();
                const userRoles = (user.roles || []).map(r => r.toLowerCase());
                if (userRole === 'admin' || userRoles.includes('admin')) {
                    setAdminCheck('admin');
                } else {
                    setAdminCheck('denied');
                }
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
            // Fix: Use correct error field from backend response
            setLoginError(err.response?.data?.message || err.message || 'Login failed');
        }
        setLoginLoading(false);
    };

    useEffect(() => {
        if (adminCheck !== 'admin') return;
        if (activeTab === 'Native Products') loadProducts();
        if (activeTab === 'Categories') loadCategories();
        if (activeTab === 'Orders') loadOrders();
        if (activeTab === 'Customers') loadCustomers();
        if (activeTab === 'Coupons') loadCoupons();
    }, [activeTab, adminCheck]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            // Load from native products API
            const data = await productsAPI.getAll({ per_page: 100 });
            const productsData = data.products || data.data || [];

            // Map API response to frontend format with correct price mapping
            const mappedProducts = productsData.map(product => {
                // Fix: Correctly map basePrice from product.basePrice or product.base_price
                const priceValue = product.basePrice || product.base_price || product.price || 0;
                const basePrice = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;

                // Get SKU from product or first variant
                const sku = product.sku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : 'N/A');

                // Calculate total stock from all variants
                const stock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

                // Get category names for display
                const categoryNames = product.categories
                    ? product.categories.map(cat => cat.name).join(', ')
                    : (product.category || 'Uncategorized');

                return {
                    ...product,
                    basePrice: basePrice || 0,
                    sku: sku,
                    stock: stock,
                    category: categoryNames,
                    variants: product.variants || []
                };
            });

            setProducts(mappedProducts);
        } catch (err) {
            toast.error('Failed to load products');
        }
        setLoading(false);
    };

    const loadCategories = async () => {
        setLoading(true);
        try {
            const catData = await categoriesAPI.getAll();
            setCategories(Array.isArray(catData) ? catData : (catData?.categories || []));
        } catch { toast.error('Failed to load categories'); }
        setLoading(false);
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await ordersAPI.getAll({ per_page: 50 });
            setOrders(data.orders || []);
        } catch { toast.error('Failed to load orders'); }
        setLoading(false);
    };

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await userManagementService.getAllUsers({ per_page: 50 });
            // res.data is the array of users/customers
            setCustomers(res.data || []);
        } catch { toast.error('Failed to load customers'); }
        setLoading(false);
    };

    const loadCoupons = async () => {
        setLoading(true);
        try {
            const data = await couponsAPI.getAll();
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
                await productsAPI.update(editProduct.id, data);
                toast.success('Product updated!');
            } else {
                await productsAPI.create(data);
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
            await productsAPI.delete(id);
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
            const result = await categoriesAPI.create({ name: newCategoryName.trim() });
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
            await categoriesAPI.delete(id);
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
        const res = await uploadAPI.uploadImage(formData);
        return res.data;
    };

    const handleImageUpload = async (file) => {
        setUploadingImage(true);
        try {
            const data = await uploadImageToServer(file);
            const imageUrl = data?.cdn?.medium || data?.medium || data?.original || data?.url;
            if (!imageUrl) throw new Error('Upload succeeded but no image URL returned');
            const current = productForm.images.filter(Boolean);
            setProductForm(prev => ({ ...prev, images: [...current, imageUrl] }));
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
            const imageUrl = data?.cdn?.medium || data?.medium || data?.original || data?.url;
            if (!imageUrl) throw new Error('Upload succeeded but no image URL returned');
            updateVariantField(variantIndex, 'image', imageUrl);
            toast.success(`Variant image "${file.name}" uploaded!`);
        } catch (err) {
            toast.error(err.message || 'Variant image upload failed');
        }
        setUploadingVariantIndex(null);
    };

    // --- Order Status ---
    const handleOrderStatus = async (orderId, newStatus) => {
        try {
            await ordersAPI.updateStatus(orderId, newStatus);
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
            await couponsAPI.create(data);
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
            <div className="min-h-screen flex items-center justify-center bg-slate-950 font-body relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-royal-maroon/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-royal-gold/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

                <div className="relative z-10 w-full max-w-md p-8 rounded-3xl border border-white/10 bg-slate-900/40 shadow-luxury backdrop-blur-xl">
                    <div className="text-center space-y-4 mb-8">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-royal-maroon/10 border border-royal-maroon/20 mb-2">
                             <span className="text-4xl">🔐</span>
                        </div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
                            Admin <span className="text-royal-maroon">Vault</span>
                        </h1>
                        <p className="text-sm text-slate-400 font-medium uppercase tracking-[0.2em]">
                            Luxury Dashboard Access
                        </p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Admin Credentials</label>
                            <input 
                                type="email" 
                                placeholder="Admin Email" 
                                required
                                value={loginForm.email}
                                onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 transition-all font-mono"
                            />
                        </div>
                        <div className="space-y-4">
                            <input 
                                type="password" 
                                placeholder="Secure Password" 
                                required
                                value={loginForm.password}
                                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 transition-all font-mono"
                            />
                            {loginError && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                                    <p className="text-rose-400 text-xs text-center font-bold tracking-tight">{loginError}</p>
                                </div>
                            )}
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loginLoading} 
                            className="w-full h-12 bg-royal-maroon text-white font-bold rounded-xl shadow-luxury hover:bg-royal-maroon/90 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {loginLoading ? 'Unlocking...' : 'Unlock Dashboard'}
                        </button>
                    </form>

                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full mt-8 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                        ← Return to Boutique
                    </button>
                </div>
            </div>
        );
    }

    // Access Gate: denied (logged in but not admin)
    if (adminCheck === 'denied') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 font-body px-4">
                <div className="w-full max-w-md p-8 rounded-3xl border border-rose-500/20 bg-slate-900/40 shadow-rose-900/40 backdrop-blur-xl text-center space-y-6">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 mb-2">
                        <span className="text-4xl">🚫</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-rose-400">Access Restricted</h1>
                        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                            Your account <span className="text-white font-bold">{user?.email}</span> is not authorized to enter the Admin Dashboard.
                        </p>
                    </div>
                    
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Requirement</p>
                        <p className="text-xs text-slate-300">Administrative clearance is required for this area of the vault.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={async () => {
                                await authAPI.logout();
                                setAdminCheck('login');
                            }}
                            className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
                        >
                            Log into another account
                        </button>
                        <button 
                            onClick={() => navigate('/')} 
                            className="w-full py-3 bg-royal-maroon text-white rounded-xl text-sm font-bold shadow-lg hover:bg-royal-maroon/90 transition-all font-heading"
                        >
                            ← Return to Boutique
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="admin-dashboard-stage min-h-screen text-foreground font-body selection:bg-royal-maroon/10 selection:text-foreground">
            {/* Global Gradient Overlays */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-royal-maroon/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 p-4 md:p-8">
                <div className="mx-auto max-w-[1600px] space-y-8">
                    {/* Navigation Bar */}
                    <div className="admin-dashboard-nav sticky top-2 z-50 rounded-[1.75rem] p-2 shadow-luxury flex flex-wrap items-center gap-2">
                        {TABS.map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)} 
                                className={`px-6 py-2.5 rounded-xl font-heading text-xs uppercase tracking-widest font-bold transition-all duration-300 ${
                                    activeTab === tab 
                                        ? 'bg-royal-maroon text-white shadow-lg shadow-royal-maroon/20 border border-royal-maroon/20' 
                                        : 'text-slate-600 hover:text-foreground hover:bg-white/70 border border-transparent'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                        
                        {loading && (
                            <div className="ml-auto pr-4 flex items-center gap-2 text-royal-maroon animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-royal-maroon" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Processing</span>
                            </div>
                        )}
                    </div>

                    {/* Dashboard Screen */}
                    <div className="animate-fade-in">
                        {/* ===== NATIVE PRODUCTS TAB (Phase 9) ===== */}
                        {activeTab === 'Native Products' && <AdminProductsPage />}

                        {/* ===== CATEGORIES TAB (Integrated) ===== */}
                        {activeTab === 'Categories' && <AdminProductsPage initialTab="categories" />}

                        {/* ===== INVENTORY TAB (Phase 9) ===== */}
                        {activeTab === 'Inventory' && <AdminInventoryPage />}

                        {/* ===== COUPONS TAB (Phase 9) ===== */}
                        {activeTab === 'Coupons' && <AdminCouponsPage />}

                        {/* ===== ORDERS TAB (Phase 9) ===== */}
                        {activeTab === 'Orders' && <AdminOrdersPage />}

                        {/* ===== JOURNAL TAB (Phase 10) ===== */}
                        {activeTab === 'Journal' && <AdminBlogsPage />}

                        {/* ===== ANALYTICS TAB (Phase 9) ===== */}
                        {activeTab === 'Analytics' && <AdminAnalyticsPage />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
