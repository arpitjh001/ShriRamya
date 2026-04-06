/**
 * AdminProductsPage.js - Redesigned Native Products Tab
 * Complete redesign with integrated category management
 */

import React, { useState, useEffect } from 'react';
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
  Package, FolderPlus, Search, Eye, EyeOff, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const AdminProductsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    status: 'published',
    fabric: '',
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
    await Promise.all([loadProducts(), loadCategories()]);
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll({ per_page: 100, all_statuses: true });
      // response.products is the raw data, response.data is the transformed data
      const productsData = response.products || response.data || [];

      const mappedProducts = productsData.map(product => {
        // Correctly handle basePrice from multiple possible fields
        const priceValue = product.basePrice || product.base_price || product.price || 0;
        const basePrice = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;

        // Normalize images array to always be strings
        const normalizedImages = (product.images || []).map(img => 
           typeof img === 'string' ? img : (img.src || img.url || '')
        ).filter(Boolean);

        return {
          ...product,
          images: normalizedImages,
          basePrice: basePrice,
          sku: product.sku || (product.variants?.[0]?.sku || 'N/A'),
          stock: product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || product.stock_quantity || product.stock || 0,
          categoryNames: product.categories?.map(cat => cat.name).join(', ') || product.category || product.categoryName || 'Uncategorized'
        };
      });

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      // Handle the case where response is an array of categories
      // or an object with a 'categories' property
      const categoriesData = Array.isArray(response)
        ? response
        : (response?.categories || []);
      setCategories(categoriesData);
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
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        basePrice: product.basePrice?.toString() || '',
        status: product.status || 'draft',
        fabric: product.fabric || '',
        occasion: product.occasion || '',
        images: product.images || [],
        variants: product.variants?.map(v => ({
          ...v,
          size: v.attributes?.size || v.size || '',
          color: v.attributes?.color || v.color || ''
        })) || [],
        categories: product.categories?.map(c => c.id.toString()) || [],
        discountPrice: product.variants?.[0]?.discountPrice?.toString() || '',
        totalStock: totalStock.toString(),
        lowStockThreshold: product.variants?.[0]?.lowStockThreshold?.toString() || '5',
        sku: product.sku || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        basePrice: '',
        status: 'draft',
        fabric: '',
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
        return {
          id: v.id,
          sku: productSku, // All variants share product SKU
          price: parseFloat(v.price) || parseFloat(productForm.basePrice) || 0,
          discountPrice: (productForm.discountPrice !== '' && productForm.discountPrice !== null) ? parseFloat(productForm.discountPrice) : null,
          stock: parseInt(v.stock, 10) || 0,
          image: v.image || '',
          attributes: {
            size: v.size || '',
            color: v.color || ''
          },
          lowStockThreshold: parseInt(v.lowStockThreshold || productForm.lowStockThreshold, 10) || 5
        };
      });

      const productData = {
        name: productForm.name,
        description: productForm.description,
        fabric: productForm.fabric,
        occasion: productForm.occasion,
        basePrice: parseFloat(productForm.basePrice) || 0,
        status: productForm.status,
        images: productForm.images,
        categories: productForm.categories,
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
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await categoriesAPI.create(categoryForm);
        toast.success('Category created successfully');
      }

      setShowCategoryModal(false);
      await loadCategories();
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
  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.categoryNames?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCategories = categories.filter(c =>
    c.name?.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.slug?.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.description?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      padding: '32px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Product Dashboard</h1>
            <p className="text-sm text-gray-300">Manage your products and categories</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
              <TabsTrigger value="products" className="gap-2">
                <Package className="w-4 h-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <FolderPlus className="w-4 h-4" />
                Categories
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <Card style={{
          background: 'rgba(30, 27, 75, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.2)'
        }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle style={{ color: '#ffffff' }}>All Products</CardTitle>
                <CardDescription style={{ color: '#94a3b8' }}>
                  {filteredProducts.length} products found
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 w-72"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#e2e8f0',
                      borderColor: 'rgba(148, 163, 184, 0.3)'
                    }}
                  />
                </div>
                <Button
                  onClick={() => handleOpenProductModal()}
                  className="gap-2"
                  style={{ background: '#6366f1' }}
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
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-300">Product</TableHead>
                      <TableHead className="text-gray-300">SKU</TableHead>
                      <TableHead className="text-gray-300">Price</TableHead>
                      <TableHead className="text-gray-300">Stock</TableHead>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-right text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} className="border-gray-700">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-white">{product.name}</div>
                              <div className="text-xs text-gray-400">{product.description?.substring(0, 50) || 'No description'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-300">{product.sku}</TableCell>
                        <TableCell className="text-white">₹{product.basePrice?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <Badge variant={product.stock <= 5 ? 'destructive' : 'default'}>
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{product.categoryNames}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenProductModal(product)}
                              className="hover:bg-indigo-500/20 hover:text-indigo-400"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="hover:bg-red-500/20 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
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
          </CardContent>
        </Card>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card style={{
          background: 'rgba(30, 27, 75, 0.6)',
          border: '1px solid rgba(148, 163, 184, 0.2)'
        }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle style={{ color: '#ffffff' }}>Category Management</CardTitle>
                <CardDescription style={{ color: '#94a3b8' }}>
                  {filteredCategories.length} categories found
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="pl-10 w-72"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#e2e8f0',
                      borderColor: 'rgba(148, 163, 184, 0.3)'
                    }}
                  />
                </div>
                <Button
                  onClick={() => handleOpenCategoryModal()}
                  className="gap-2"
                  style={{ background: '#6366f1' }}
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
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-300">Category</TableHead>
                      <TableHead className="text-gray-300">Slug</TableHead>
                      <TableHead className="text-gray-300">Description</TableHead>
                      <TableHead className="text-right text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((category) => (
                      <TableRow key={category.id} className="border-gray-700">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {category.image ? (
                              <img
                                src={category.image}
                                alt={category.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                                <FolderPlus className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-white">{category.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-800 rounded text-xs text-indigo-400">
                            {category.slug}
                          </code>
                        </TableCell>
                        <TableCell className="max-w-md text-gray-300">
                          {category.description || 'No description'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCategoryModal(category)}
                              className="hover:bg-indigo-500/20 hover:text-indigo-400"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="hover:bg-red-500/20 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredCategories.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
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

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: '#ffffff' }}>
              {editingProduct ? 'Edit Product' : 'Create Product'}
            </DialogTitle>
            <DialogDescription style={{ color: '#94a3b8' }}>
              {editingProduct ? 'Update product details' : 'Add a new product to your catalog'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label style={{ color: '#e2e8f0' }}>Product Name *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g., Kanjeevaram Silk Saree"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
              </div>
              <div>
                <Label style={{ color: '#e2e8f0' }}>Product SKU</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                  placeholder="e.g., SRE-BANA-001"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', fontFamily: 'monospace' }}
                />
                <p className="text-xs text-gray-400 mt-1">Auto-generated if left blank</p>
              </div>
              <div>
                <Label style={{ color: '#e2e8f0' }}>Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.basePrice}
                  onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                  placeholder="999"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
              </div>
            </div>
            <div>
              <Label style={{ color: '#e2e8f0' }}>Discount Price (₹)</Label>
              <Input
                type="number"
                value={productForm.discountPrice}
                onChange={(e) => setProductForm({ ...productForm, discountPrice: e.target.value })}
                placeholder="799"
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
              />
            </div>
            <div>
              <Label style={{ color: '#e2e8f0' }}>Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: '#e2e8f0' }}>Fabric</Label>
                <Input
                  value={productForm.fabric}
                  onChange={(e) => setProductForm({ ...productForm, fabric: e.target.value })}
                  placeholder="e.g., Pure Silk"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
              </div>
              <div>
                <Label style={{ color: '#e2e8f0' }}>Occasion</Label>
                <Input
                  value={productForm.occasion}
                  onChange={(e) => setProductForm({ ...productForm, occasion: e.target.value })}
                  placeholder="e.g., Wedding"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
              </div>
            </div>
            <div>
              <Label style={{ color: '#e2e8f0' }}>Status</Label>
              <Select
                value={productForm.status}
                onValueChange={(value) => setProductForm({ ...productForm, status: value })}
              >
                <SelectTrigger style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label style={{ color: '#e2e8f0' }}>Categories</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenCategoryModal()}
                  className="h-7 px-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  New Category
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded border"
                style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(148, 163, 184, 0.3)' }}>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-white/10 transition-colors group"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1" style={{ color: '#e2e8f0' }}>
                      <input
                        type="checkbox"
                        checked={productForm.categories?.includes(category.id.toString())}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setProductForm(prev => ({
                            ...prev,
                            categories: isChecked
                              ? [...(prev.categories || []), category.id.toString()]
                              : (prev.categories || []).filter(id => id !== category.id.toString())
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm truncate">{category.name}</span>
                    </label>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenCategoryModal(category);
                        }}
                        className="p-1 text-gray-400 hover:text-indigo-400"
                        title="Edit Category"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteCategory(category.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-gray-400 text-sm col-span-2 text-center py-4">
                    No categories available. Create a category first.
                  </p>
                )}
              </div>
              {productForm.categories?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {productForm.categories.map(catId => {
                    const cat = categories.find(c => c.id.toString() === catId);
                    return cat ? (
                      <Badge key={catId} variant="secondary" className="gap-1">
                        {cat.name}
                        <button
                          onClick={() => setProductForm(prev => ({
                            ...prev,
                            categories: prev.categories.filter(id => id !== catId)
                          }))}
                          className="hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Stock Management Section - Variant Grid */}
            <div className="border-t pt-4" style={{ borderColor: 'rgba(148, 163, 184, 0.3)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5" style={{ color: '#6366f1' }} />
                  <Label className="text-base" style={{ color: '#e2e8f0' }}>Variant Inventory (Color × Size)</Label>
                </div>
                {productForm.variants?.length > 0 && (
                  <Badge variant="default" className="bg-green-600">
                    {productForm.variants.length} variants | {getTotalStock()} total stock
                  </Badge>
                )}
              </div>

              {/* Variant Grid Input Component */}
              <VariantGridInput
                variants={productForm.variants || []}
                onChange={(newVariants) => setProductForm({ ...productForm, variants: newVariants })}
                basePrice={parseFloat(productForm.basePrice) || 0}
              />
            </div>

            {/* Product Images */}
            <div>
              <Label style={{ color: '#e2e8f0' }}>Product Images</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
                {uploadingImage && (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                )}
              </div>
              {productForm.images?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {productForm.images.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt="Product" className="w-20 h-20 object-cover rounded" />
                      <button
                        onClick={() => setProductForm(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx)
                        }))}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} style={{ background: '#6366f1' }}>
              <Save className="w-4 h-4 mr-2" />
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: '#ffffff' }}>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription style={{ color: '#94a3b8' }}>
              {editingCategory ? 'Update category details' : 'Add a new product category'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: '#e2e8f0' }}>Category Name *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Silk Sarees"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
              </div>
              <div>
                <Label style={{ color: '#e2e8f0' }}>Slug</Label>
                <Input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="e.g., silk-sarees"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
              </div>
            </div>
            <div>
              <Label style={{ color: '#e2e8f0' }}>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Category description..."
                rows={3}
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
              />
            </div>
            <div>
              <Label style={{ color: '#e2e8f0' }}>Category Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleCategoryImageUpload}
                disabled={uploadingImage}
                style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
              />
              {categoryForm.image && (
                <img src={categoryForm.image} alt="Category" className="w-32 h-32 object-cover rounded mt-2" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} style={{ background: '#6366f1' }}>
              <Save className="w-4 h-4 mr-2" />
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsPage;
