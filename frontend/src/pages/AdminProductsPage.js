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
import {
  Plus, Trash2, Edit, Save, X, Upload, Image as ImageIcon,
  Package, FolderPlus, Search, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const AdminProductsPage = () => {
  const { user } = useAuth();
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
    variants: []
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

  // Check admin access
  useEffect(() => {
    const userRole = user?.role?.toLowerCase();
    const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
    
    if (!user || (!userRoles.includes('admin') && userRole !== 'admin')) {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadCategories()]);
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll({ per_page: 100 });
      const productsData = response.products || response.data || [];
      
      const mappedProducts = productsData.map(product => ({
        ...product,
        basePrice: typeof (product.basePrice || product.base_price || 0) === 'string' 
          ? parseFloat(product.basePrice || product.base_price || 0) 
          : (product.basePrice || product.base_price || 0),
        sku: product.sku || (product.variants?.[0]?.sku || 'N/A'),
        stock: product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0,
        categoryNames: product.categories?.map(cat => cat.name).join(', ') || product.category || 'Uncategorized'
      }));
      
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  // Product Handlers
  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        basePrice: product.basePrice?.toString() || '',
        status: product.status || 'published',
        fabric: product.fabric || '',
        occasion: product.occasion || '',
        images: product.images || [],
        variants: product.variants || []
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        basePrice: '',
        status: 'published',
        fabric: '',
        occasion: '',
        images: [],
        variants: []
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
      const productData = {
        ...productForm,
        basePrice: parseFloat(productForm.basePrice) || 0
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
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await uploadAPI.uploadImage(formData);
      setProductForm(prev => ({ ...prev, images: [...prev.images, response.url] }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
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
      formData.append('image', file);
      const response = await uploadAPI.uploadImage(formData);
      setCategoryForm(prev => ({ ...prev, image: response.url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
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
              <div>
                <Label style={{ color: '#e2e8f0' }}>Product Name *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g., Kanjeevaram Silk Saree"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0' }}
                />
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ color: '#e2e8f0' }}>Product Images</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  type="file"
                  accept="image/*"
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
