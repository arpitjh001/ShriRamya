/**
 * AdminProductsPage.js - Redesigned Native Products Tab
 * Complete redesign with integrated category management
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productsAPI, uploadAPI, categoriesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import VariantGridInput from '../components/VariantGridInput';
import {
  Plus, Trash2, Edit, Save, X, Upload, Image as ImageIcon,
  Package, FolderPlus, Search, Eye, EyeOff, Sparkles, AlertTriangle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const PRODUCT_STATUS_VALUES = {
  publish: 'published',
  published: 'published',
  draft: 'draft',
  archived: 'archived'
};

const normalizeProductStatus = (status, fallback = 'draft') => {
  const normalized = String(status || '').toLowerCase();
  return PRODUCT_STATUS_VALUES[normalized] || fallback;
};

const getProductStatusBadgeClass = (status) => {
  switch (normalizeProductStatus(status, 'draft')) {
    case 'published':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'archived':
      return 'bg-amber-50 text-amber-600 border-amber-100';
    default:
      return 'bg-slate-50 text-muted-foreground border-border';
  }
};

const formatProductStatusLabel = (status) => {
  const normalized = normalizeProductStatus(status, 'draft');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getProductCategoryLabels = (product) => {
  const labels = Array.isArray(product?.categories)
    ? product.categories
        .map((category) => {
          if (!category) return null;
          if (typeof category === 'string' || typeof category === 'number') return null;
          return category.name || category.slug || null;
        })
        .filter(Boolean)
    : [];

  if (labels.length > 0) {
    return Array.from(new Set(labels));
  }

  const fallback = product?.categoryName || product?.category;
  return fallback ? [fallback] : ['Uncategorized'];
};

const serializeMaterialGuideList = (values = []) => (
  Array.isArray(values) ? values.filter(Boolean).join('\n') : ''
);

const parseMaterialGuideList = (value = '') => (
  String(value)
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
);

const AdminProductsPage = ({ initialTab = 'products' }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const getCategoryIdentifier = (category) => {
    const rawIdentifier = category?._id ?? category?.id ?? category?.slug ?? null;
    return rawIdentifier == null ? null : String(rawIdentifier);
  };

  const isPersistedObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));

  // State
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [stats, setStats] = useState(null);

  const getCouponTypeLabel = (type) => {
    const badges = {
      percentage: 'Percentage Off',
      fixed_amount: 'Fixed Amount',
      free_shipping: 'Free Shipping',
      buy_x_get_y: 'BOGO'
    };
    return badges[type] || type;
  };

  const getStatusVariant = (status) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      expired: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    status: 'published',
    fabric: '',
    modelWears: '',
    modelHeight: '',
    materialGuideDescription: '',
    materialGuideProperties: '',
    materialGuideCare: '',
    materialGuideOrigin: '',
    occasion: '',
    images: [],
    variants: [],
    categories: [], // Array of category IDs
    discountPrice: '',
    // Stock management fields
    totalStock: 0,
    lowStockThreshold: 5,
    sku: '' // Product-level SKU
  });

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: null
  });

  // Upload State
  const [uploadingImage, setUploadingImage] = useState(false);

  // Variant Selection State
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);

  // Predefined colors and sizes for clothing
  const availableColors = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Grey', 'Navy', 'Brown'];
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE_SIZE'];

  // Check admin access
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    if (!user) return;
    
    const userRole = user?.role?.toLowerCase();
    const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];

    if (!userRoles.includes('admin') && userRole !== 'admin') {
      toast.error('Access denied');
      navigate('/');
      return;
    }

    loadData();
  }, [user, navigate, authLoading]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProducts(1), loadCategories()]);
    setLoading(false);
  };

  // Debounced search for products
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      loadProducts(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [productSearch, filterStatus, filterCategory]);

  const loadProducts = async (page = 1, targetLimit = pagination.limit) => {
    try {
      setLoading(true);
      const searchParams = {
        page,
        limit: targetLimit,
        q: productSearch,
        all_statuses: filterStatus === 'all'
      };

      if (filterStatus !== 'all') {
        searchParams.status = filterStatus;
      }

      if (filterCategory !== 'all') {
        searchParams.category = filterCategory;
      }

      const response = await productsAPI.getAll(searchParams);
      const productsData = response.products || response.data || [];
      const serverStats = response.stats || null;
      
      setStats(serverStats);
      
      setPagination({
        page: response.pagination.page || page,
        limit: response.pagination.limit || targetLimit,
        total: response.pagination.total || 0,
        totalPages: response.pagination.totalPages || 1
      });

      const mappedProducts = productsData.map(product => {
        const priceValue = product.basePrice || product.base_price || product.price || 0;
        const basePrice = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;

        const normalizedImages = (product.images || [])
          .map(img => (typeof img === 'string' ? img : (img.src || img.url || '')))
          .filter(Boolean);

        if (typeof product.thumbnail === 'string' && product.thumbnail) {
          normalizedImages.push(product.thumbnail);
        }

        const uniqueImages = Array.from(new Set(normalizedImages));

        return {
          ...product,
          status: normalizeProductStatus(product.status, 'published'),
          images: uniqueImages,
          basePrice: basePrice,
          sku: product.sku || (product.variants?.[0]?.sku || 'N/A'),
          stock: product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || product.stock_quantity || product.stock || 0,
          categoryLabels: getProductCategoryLabels(product),
          categoryNames: getProductCategoryLabels(product).join(', ')
        };
      });

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadProducts(newPage);
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      // Handle the case where response is an array of categories
      // or an object with a 'categories' property
      const categoriesData = Array.isArray(response)
        ? response
        : (response?.categories || []);
      const normalizedCategories = categoriesData
        .map((category) => {
          const id = getCategoryIdentifier(category);
          if (!id) return null;
          return {
            ...category,
            id,
          };
        })
        .filter(Boolean);
      setCategories(normalizedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  // Product Handlers
  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      // Calculate total stock from variants
      const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
      const selectedCategoryIds = Array.from(new Set([
        ...(product.categories || []).map((category) => getCategoryIdentifier(category)),
        product.categoryId ? String(product.categoryId) : null
      ].filter(Boolean)));

      setProductForm({
        name: product.name || '',
        description: product.description || '',
        basePrice: product.basePrice?.toString() || '',
        status: normalizeProductStatus(product.status),
        fabric: product.fabric || '',
        modelWears: product.modelWears || '',
        modelHeight: product.modelHeight || '',
        materialGuideDescription: product.materialGuide?.description || '',
        materialGuideProperties: serializeMaterialGuideList(product.materialGuide?.properties),
        materialGuideCare: serializeMaterialGuideList(product.materialGuide?.care),
        materialGuideOrigin: product.materialGuide?.origin || '',
        occasion: product.occasion || '',
        images: product.images || [],
        variants: product.variants?.map(v => ({
          ...v,
          size: v.attributes?.size || v.size || '',
          color: v.attributes?.color || v.color || ''
        })) || [],
        categories: selectedCategoryIds,
        discountPrice: product.variants?.[0]?.discountPrice?.toString() || '',
        totalStock: totalStock.toString(),
        lowStockThreshold: product.variants?.[0]?.lowStockThreshold?.toString() || '5',
        sku: product.sku && product.sku !== 'N/A' ? product.sku : ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        basePrice: '',
        status: 'draft',
        fabric: '',
        modelWears: '',
        modelHeight: '',
        materialGuideDescription: '',
        materialGuideProperties: '',
        materialGuideCare: '',
        materialGuideOrigin: '',
        occasion: '',
        images: [],
        variants: [],
        categories: [],
        discountPrice: '',
        totalStock: '0',
        lowStockThreshold: '5',
        sku: ''
      });
    }
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    try {
      // Generate product-level SKU if not provided
      const productSku = productForm.sku || productForm.name?.substring(0, 3).toUpperCase() + '-' + Date.now().toString().substring(5);

      // Format variants with proper structure
      // All variants share the same product SKU
      const cleanVariants = (productForm.variants || []).map(v => {
        const variantPayload = {
          sku: productSku, // All variants share product SKU
          price: parseFloat(v.price) || parseFloat(productForm.basePrice) || 0,
          discountPrice: (productForm.discountPrice !== '' && productForm.discountPrice !== null) ? parseFloat(productForm.discountPrice) : null,
          stock: parseInt(v.stock, 10) || 0,
          image: v.image || '',
          color: v.color || '',
          size: v.size || '',
          attributes: {
            size: v.size || '',
            color: v.color || ''
          },
          lowStockThreshold: parseInt(v.lowStockThreshold || productForm.lowStockThreshold, 10) || 5
        };

        if (isPersistedObjectId(v.id)) {
          variantPayload.id = v.id;
        }

        return variantPayload;
      });

      const selectedCategoryIds = Array.from(new Set(
        (productForm.categories || []).map((categoryId) => String(categoryId)).filter(Boolean)
      ));

      const materialGuide = (() => {
        const description = productForm.materialGuideDescription?.trim() || '';
        const properties = parseMaterialGuideList(productForm.materialGuideProperties);
        const care = parseMaterialGuideList(productForm.materialGuideCare);
        const origin = productForm.materialGuideOrigin?.trim() || '';

        if (!description && !origin && properties.length === 0 && care.length === 0) {
          return null;
        }

        return {
          description,
          properties,
          care,
          origin
        };
      })();

      const productData = {
        name: productForm.name,
        description: productForm.description,
        fabric: productForm.fabric,
        modelWears: productForm.modelWears?.trim() || '',
        modelHeight: productForm.modelHeight?.trim() || '',
        materialGuide,
        occasion: productForm.occasion,
        basePrice: parseFloat(productForm.basePrice) || 0,
        status: normalizeProductStatus(productForm.status, 'published'),
        images: productForm.images,
        categories: selectedCategoryIds,
        sku: productSku, // Product-level SKU
        variants: editingProduct && cleanVariants.length === 0 ? undefined : cleanVariants
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct.id, productData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(productData);
        toast.success('Product created successfully');
      }

      setShowProductModal(false);
      await loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productsAPI.delete(productId);
      toast.success('Product deleted successfully');
      await loadProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploadingImage(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await uploadAPI.uploadImage(formData);
        const uploaded = response?.data || {};
        const imageUrl = uploaded?.cdn?.medium || uploaded?.medium || uploaded?.original || uploaded?.url;
        if (imageUrl) uploadedUrls.push(imageUrl);
      }
      
      if (uploadedUrls.length === 0) throw new Error('Upload succeeded but no image URL returned');
      
      setProductForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      toast.success(uploadedUrls.length > 1 ? 'Images uploaded successfully' : 'Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image(s)');
    } finally {
      setUploadingImage(false);
      // Reset file input back to empty
      e.target.value = null;
    }
  };

  // Category Handlers
  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        image: category.image || null
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        image: null
      });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const wasProductModalOpen = showProductModal;
      let savedCategory = null;
      if (editingCategory) {
        savedCategory = await categoriesAPI.update(editingCategory.id, categoryForm);
        toast.success('Category updated successfully');
      } else {
        savedCategory = await categoriesAPI.create(categoryForm);
        toast.success('Category created successfully');
      }

      setShowCategoryModal(false);
      await loadCategories();

      const savedCategoryId = getCategoryIdentifier(savedCategory);
      if (wasProductModalOpen && savedCategoryId && !editingCategory) {
        setProductForm((prev) => ({
          ...prev,
          categories: prev.categories.includes(savedCategoryId)
            ? prev.categories
            : [...prev.categories, savedCategoryId]
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await categoriesAPI.delete(categoryId);
      toast.success('Category deleted successfully');
      await loadCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleCategoryImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadAPI.uploadImage(formData);
      const uploaded = response?.data || {};
      const imageUrl = uploaded?.cdn?.medium || uploaded?.medium || uploaded?.original || uploaded?.url;
      if (!imageUrl) throw new Error('Upload succeeded but no image URL returned');
      setCategoryForm(prev => ({ ...prev, image: imageUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Variant Management Handlers
  const toggleColor = (color) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const toggleSize = (size) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleGenerateVariants = () => {
    const colors = selectedColors.length > 0 ? selectedColors : ['ONE_SIZE'];
    const sizes = selectedSizes.length > 0 ? selectedSizes : ['ONE_SIZE'];

    const variants = [];
    for (const color of colors) {
      for (const size of sizes) {
        variants.push({
          id: `variant_${color}_${size}_${Date.now()}`,
          color: color === 'ONE_SIZE' ? '' : color,
          size: size === 'ONE_SIZE' ? '' : size,
          stock: 0,
          price: parseFloat(productForm.basePrice) || 0,
          attributes: {}
        });
      }
    }

    setProductForm(prev => ({ ...prev, variants }));
    setSelectedColors([]);
    setSelectedSizes([]);
    toast.success(`Generated ${variants.length} variants`);
  };

  const updateVariantStock = (index, stock) => {
    const newVariants = [...productForm.variants];
    newVariants[index].stock = stock;
    setProductForm({ ...productForm, variants: newVariants });
  };

  const removeVariant = (index) => {
    const newVariants = productForm.variants.filter((_, i) => i !== index);
    setProductForm({ ...productForm, variants: newVariants });
  };

  const clearAllSelections = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setProductForm(prev => ({ ...prev, variants: [] }));
  };

  const getTotalStock = () => {
    return productForm.variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
  };

  // Filters
  const filteredProducts = products;

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const searchLow = categorySearch.toLowerCase();
    return categories.filter(cat => 
      cat.name?.toLowerCase().includes(searchLow) || 
      cat.slug?.toLowerCase().includes(searchLow) ||
      cat.description?.toLowerCase().includes(searchLow)
    );
  }, [categories, categorySearch]);

  const resolvedStats = useMemo(() => {
    if (stats) {
      return stats;
    }

    return {
      total: pagination.total || products.length,
      published: products.filter((product) => normalizeProductStatus(product.status, 'published') === 'published').length,
      draft: products.filter((product) => normalizeProductStatus(product.status, 'published') === 'draft').length,
      outOfStock: products.filter((product) => Number(product.stock || 0) <= 0).length
    };
  }, [stats, pagination.total, products]);


  return (
    <div className="admin-dashboard-shell min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Products" 
          value={resolvedStats.total || 0} 
          icon={Package} 
          color="maroon" 
          loading={loading && !stats && products.length === 0} 
          subtext="All inventory items"
        />
        <StatCard 
          title="Published" 
          value={resolvedStats.published || 0} 
          icon={Eye} 
          color="emerald" 
          loading={loading && !stats && products.length === 0} 
          subtext="Visible to customers"
        />
        <StatCard 
          title="Drafts" 
          value={resolvedStats.draft || 0} 
          icon={EyeOff} 
          color="gold" 
          loading={loading && !stats && products.length === 0} 
          subtext="In preparation"
        />
        <StatCard 
          title="Out of Stock" 
          value={resolvedStats.outOfStock || 0} 
          icon={AlertTriangle} 
          color="charcoal" 
          indicator="red"
          loading={loading && !stats && products.length === 0} 
          subtext="Needs restocking"
        />
      </div>

      {/* Header */}
      <div className="mb-8 p-6 bg-white shadow-luxury-sm border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground mb-2">Product Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your products and categories</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
            <TabsList className="bg-white/5 p-1 border border-white/10 w-full sm:w-auto">
              <TabsTrigger value="products" className="flex-1 gap-2 text-xs">
                <Package className="w-4 h-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex-1 gap-2 text-xs">
                <FolderPlus className="w-4 h-4" />
                Categories
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <Card className="bg-white shadow-luxury-sm border-border">
          <CardHeader className="border-b border-white/10 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-foreground text-2xl">All Products</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage counts: {pagination.total} products total
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 w-full bg-slate-50 border-border text-foreground focus:ring-royal-maroon focus:border-royal-maroon placeholder:text-slate-500"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[140px] bg-slate-50 border-border text-xs font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full sm:w-[160px] bg-slate-50 border-border text-xs font-medium">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id || cat.slug} value={cat.slug || cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => handleOpenProductModal()}
                  className="w-full sm:w-auto gap-2 bg-royal-maroon hover:bg-royal-maroon/90 text-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <Table className="min-w-[800px] md:min-w-full">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Product</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">SKU</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Price</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Stock</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Categories</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} className="border-border hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded-lg border border-white/10 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-border">
                                <Package className="w-5 h-5 text-slate-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-foreground text-sm">{product.name}</div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{String(product.id || '').slice(-6)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-foreground font-medium uppercase">{product.sku || 'N/A'}</TableCell>
                        <TableCell className="text-foreground font-bold">₹{product.basePrice?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.stock <= 5 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {product.stock} in stock
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-xs flex-wrap gap-1">
                            {(product.categoryLabels || getProductCategoryLabels(product)).map((categoryName) => (
                              <span
                                key={`${product.id}-${categoryName}`}
                                className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full text-[10px] font-medium border border-border"
                              >
                                {categoryName}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getProductStatusBadgeClass(product.status)} border text-[10px] font-bold transition-all`}>
                            {formatProductStatusLabel(product.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenProductModal(product)}
                              className="h-8 w-8 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="h-8 w-8 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {products.length === 0 && !loading && (
                  <div className="text-center py-12 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No products found</p>
                    <Button
                      variant="link"
                      onClick={() => handleOpenProductModal()}
                      className="text-indigo-400 mt-2"
                    >
                      Add your first product
                    </Button>
                  </div>
                )}
              </div>
            )}
                        {/* Pagination Controls */}
            {!loading && products.length > 0 && pagination.totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4 px-2">
                <div className="flex items-center gap-6">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Showing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="text-foreground">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="text-foreground">{pagination.total}</span> products
                  </div>
                  
                  {/* Items Per Page Selector */}
                  <div className="flex items-center gap-3 border-l border-border pl-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">View</span>
                    <select 
                      value={pagination.limit} 
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value);
                        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                        loadProducts(1, newLimit);
                      }}
                      className="h-8 w-[70px] bg-slate-50 border border-border rounded-md text-xs font-bold px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-royal-maroon/20"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px]"
                  >
                    Prev
                  </Button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum = pagination.page;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={pagination.page === pageNum ? 'bg-royal-maroon text-white font-bold' : 'text-muted-foreground hover:bg-slate-100'}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card className="bg-white shadow-luxury-sm border-border">
          <CardHeader className="border-b border-white/10 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <CardTitle className="text-foreground text-2xl">Category Management</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {filteredCategories.length} categories found
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="pl-10 w-full bg-slate-50 border-border text-foreground focus:ring-royal-maroon focus:border-royal-maroon placeholder:text-slate-500"
                  />
                </div>
                <Button
                  onClick={() => handleOpenCategoryModal()}
                  className="w-full sm:w-auto gap-2 bg-royal-maroon hover:bg-royal-maroon/90 text-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="rounded-md border border-white/10 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <Table className="min-w-[700px] md:min-w-full">
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Category</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Slug</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Description</TableHead>
                      <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id} className="border-border hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-12 h-12 object-cover rounded-lg border border-white/10 shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-border">
                                <FolderPlus className="w-6 h-6 text-slate-500" />
                              </div>
                            )}
                            <div>
                                <div className="font-semibold text-foreground text-sm">{category.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-slate-50 border border-border rounded text-[10px] text-royal-maroon font-mono">
                            {category.slug}
                          </code>
                        </TableCell>
                        <TableCell className="max-w-md text-muted-foreground text-sm">
                          {category.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCategoryModal(category)}
                              className="text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredCategories.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <FolderPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No categories found</p>
                    <Button
                      variant="link"
                      onClick={() => handleOpenCategoryModal()}
                      className="text-indigo-400 mt-2"
                    >
                      Add your first category
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-4xl bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury max-h-[95vh] flex flex-col">
          <DialogHeader className="border-b border-white/10 pb-3">
            <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
              {editingProduct ? 'Update' : 'Establish'} <span className="text-royal-maroon">Heritage</span> Chronicle
            </DialogTitle>
            <DialogDescription className="text-slate-500 italic font-medium">
              Updating the timeless ledger of Shri Ramya possessions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[55vh] overflow-y-auto px-1 custom-scrollbar scrollbar-hide">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Archive Identity (Name) *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g., Banarasi Heritage Silk"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">SKU identifier</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="e.g., BR-SLK-001"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Product Narrative</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="The tale of this creation..."
                rows={4}
                className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Base Valuation (Price) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <Input
                    type="number"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    className="pl-7 bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Sale Valuation (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <Input
                    type="number"
                    value={productForm.salePrice}
                    onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                    className="pl-7 bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Fabric Composition</Label>
                <Input
                  value={productForm.fabric}
                  onChange={(e) => setProductForm({ ...productForm, fabric: e.target.value })}
                  placeholder="e.g., Pure Katan Silk"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Heritage Occasion</Label>
                <Input
                  value={productForm.occasion}
                  onChange={(e) => setProductForm({ ...productForm, occasion: e.target.value })}
                  placeholder="e.g., Bridal"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Model Wears</Label>
                <Input
                  value={productForm.modelWears}
                  onChange={(e) => setProductForm({ ...productForm, modelWears: e.target.value })}
                  placeholder="e.g., Size S"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Model Height</Label>
                <Input
                  value={productForm.modelHeight}
                  onChange={(e) => setProductForm({ ...productForm, modelHeight: e.target.value })}
                  placeholder="e.g., 5'9&quot;"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Archive Imagery</Label>
                <div className="flex items-center gap-2">
                  {uploadingImage && <Loader2 className="w-4 h-4 animate-spin text-royal-maroon" />}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-royal-maroon/10 text-royal-maroon border border-royal-maroon/20 rounded-lg hover:bg-royal-maroon/20 transition-all text-[10px] font-bold uppercase tracking-widest">
                      <Upload className="w-3.5 h-3.5" />
                      Upload New
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      disabled={uploadingImage} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                <AnimatePresence>
                  {productForm.images?.map((img, idx) => (
                    <motion.div 
                      key={`${img}-${idx}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-[3/4] rounded-xl border border-white/10 overflow-hidden group shadow-sm bg-black/20"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                         <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newImages = [...productForm.images];
                            newImages.splice(idx, 1);
                            setProductForm({ ...productForm, images: newImages });
                          }}
                          className="p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {(productForm.images?.length === 0 || !productForm.images) && !uploadingImage && (
                  <div className="col-span-full py-8 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl text-slate-500">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No imagery archived</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Material Guide</Label>
                <p className="text-[10px] text-slate-500 ml-1">These values override the default fabric guide on the product details page.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Guide Description</Label>
                <Textarea
                  value={productForm.materialGuideDescription}
                  onChange={(e) => setProductForm({ ...productForm, materialGuideDescription: e.target.value })}
                  placeholder="Describe the material, texture, drape, and what makes it special."
                  rows={3}
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Key Properties</Label>
                  <Textarea
                    value={productForm.materialGuideProperties}
                    onChange={(e) => setProductForm({ ...productForm, materialGuideProperties: e.target.value })}
                    placeholder={'One property per line\nBreathable\nSoft drape'}
                    rows={4}
                    className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Care Instructions</Label>
                  <Textarea
                    value={productForm.materialGuideCare}
                    onChange={(e) => setProductForm({ ...productForm, materialGuideCare: e.target.value })}
                    placeholder={'One instruction per line\nDry clean only\nStore in muslin cloth'}
                    rows={4}
                    className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Material Origin</Label>
                <Input
                  value={productForm.materialGuideOrigin}
                  onChange={(e) => setProductForm({ ...productForm, materialGuideOrigin: e.target.value })}
                  placeholder="e.g., Varanasi, Uttar Pradesh"
                  className="bg-white/5 border-white/10 text-foreground placeholder:text-slate-600 focus:ring-royal-maroon/20 focus:border-royal-maroon/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Archive Classification</Label>
              <Select
                value={productForm.status}
                onValueChange={(value) => setProductForm({ ...productForm, status: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-foreground focus:ring-royal-maroon/20">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="draft" className="focus:bg-white/10 focus:text-foreground">Draft (Hidden)</SelectItem>
                  <SelectItem value="published" className="focus:bg-white/10 focus:text-foreground">Published (Public)</SelectItem>
                  <SelectItem value="archived" className="focus:bg-white/10 focus:text-foreground">Archived (Lock)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Heritage Segments</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenCategoryModal()}
                  className="h-7 px-2 text-royal-gold hover:text-royal-gold hover:bg-royal-gold/10 gap-1 text-[10px] font-bold uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3" />
                  New Category
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 rounded-2xl border border-white/5 bg-black/20 custom-scrollbar">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={productForm.categories?.includes(category.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setProductForm(prev => ({
                            ...prev,
                            categories: isChecked
                              ? [...(prev.categories || []), category.id]
                              : (prev.categories || []).filter(id => id !== category.id)
                          }));
                        }}
                        className="w-4 h-4 rounded-md border-white/10 bg-white/5 text-royal-maroon focus:ring-royal-maroon/30"
                      />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{category.name}</span>
                    </label>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenCategoryModal(category);
                        }}
                        className="p-1.5 text-slate-500 hover:text-royal-gold transition-colors"
                        title="Edit Category"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteCategory(category.id);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock Management Section */}
            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-royal-gold/10 border border-royal-gold/20">
                    <Package className="w-4 h-4 text-royal-gold" />
                  </div>
                  <Label className="text-sm font-heading font-bold uppercase tracking-widest text-foreground">Vault Inventory</Label>
                </div>
                {productForm.variants?.length > 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold">
                    {productForm.variants.length} Variants | {getTotalStock()} Units
                  </Badge>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Depletion Alert threshold</Label>
                  <div className="group relative">
                    <div className="p-1 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-help">
                      <Package className="w-2 h-2 text-slate-500" />
                    </div>
                  </div>
                </div>
                <Input
                  type="number"
                  min="0"
                  value={productForm.lowStockThreshold}
                  onChange={(e) => {
                    const next = parseInt(e.target.value, 10);
                    setProductForm({
                      ...productForm,
                      lowStockThreshold: Number.isNaN(next) ? 5 : Math.max(0, next),
                    });
                  }}
                  className="bg-black/20 border-white/10 text-foreground focus:ring-royal-maroon/20 w-32"
                />
                <p className="text-[9px] text-slate-500 italic">Alert will trigger when inventory drops below {productForm.lowStockThreshold ?? 5} units.</p>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Inventory Matrix (Color × Size)</Label>
                <VariantGridInput
                  variants={productForm.variants || []}
                  onChange={(newVariants) => setProductForm({ ...productForm, variants: newVariants })}
                  basePrice={parseFloat(productForm.basePrice) || 0}
                  lowStockThreshold={productForm.lowStockThreshold}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-border flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowProductModal(false)} className="h-10 px-6 font-bold uppercase tracking-widest text-[10px] border-border">
              Dismiss
            </Button>
            <Button onClick={handleSaveProduct} className="h-10 px-8 bg-royal-maroon hover:bg-royal-maroon/90 text-white font-bold uppercase tracking-widest text-[10px] shadow-md shadow-maroon/20">
              {editingProduct ? 'Synchronize Record' : 'Establish Artifact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 bg-white border-none shadow-luxury rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 bg-slate-50 border-b border-border">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingCategory ? 'Edit Realm' : 'Establish New'} <span className="text-royal-maroon">Segment</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Classifying the timeless heritage of the archive
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Segment Label *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="h-10 border-border bg-slate-50"
                  placeholder="e.g., Banarasi Excellence"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Resource Path (Slug)</Label>
                <Input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="h-10 border-border bg-slate-50"
                  placeholder="banarasi-excellence"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Segment Narrative</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="h-24 border-border bg-slate-50 resize-none"
                placeholder="The essence and history of this archival segment..."
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Identity Imagery</Label>
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <div className="flex items-center justify-center gap-2 w-full h-11 bg-slate-50 border border-dashed border-border rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-royal-maroon" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Set Archive Image</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleCategoryImageUpload} disabled={uploadingImage} className="hidden" />
                </label>
                {categoryForm.image && (
                  <div className="relative h-16 w-16 rounded-xl border border-border overflow-hidden group shadow-sm">
                    <img src={categoryForm.image} alt="" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCategoryForm({...categoryForm, image: ''})}
                      className="absolute inset-0 bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-border flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCategoryModal(false)} className="h-10 px-6 font-bold uppercase tracking-widest text-[10px] border-border">
              Dismiss
            </Button>
            <Button onClick={handleSaveCategory} className="h-10 px-8 bg-royal-maroon hover:bg-royal-maroon/90 text-white font-bold uppercase tracking-widest text-[10px] shadow-md shadow-maroon/20">
              <Save className="w-4 h-4 mr-2" />
              {editingCategory ? 'Certify Update' : 'Seal Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsPage;

// Premium Ivory Stat Card Component
const StatCard = (props) => {
  const { title, value, format, icon: Icon, color, trend, delay, loading, subtext, indicator } = props;

  const formatValue = () => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    }
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const schemeOptions = {
    maroon: { bg: 'bg-royal-maroon/10', text: 'text-royal-maroon', iconColor: 'text-royal-maroon' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', iconColor: 'text-emerald-600' },
    gold: { bg: 'bg-amber-500/10', text: 'text-amber-600', iconColor: 'text-amber-600' },
    charcoal: { bg: 'bg-slate-100', text: 'text-slate-900', iconColor: 'text-slate-500' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-luxury-sm transition-all hover:shadow-luxury hover:-translate-y-1`}>
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${scheme.bg} opacity-20 transition-transform group-hover:scale-150`} />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg} shadow-sm transition-transform group-hover:rotate-6`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-white/10 animate-pulse rounded mt-1" />
          ) : (
            <h3 className={`mt-1 text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};
