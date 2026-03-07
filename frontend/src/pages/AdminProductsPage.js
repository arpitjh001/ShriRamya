import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productsAPI, uploadAPI, categoriesAPI } from '../services/api';
import CategoriesPage from './CategoriesPage';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Plus, Trash2, Edit, Save, X, Upload, Image as ImageIcon,
  Package, Tag, AlignLeft, DollarSign, Layers, ChevronRight,
  Search, Filter, MoreVertical, Eye, EyeOff, FolderPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const AdminProductsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  
  // Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    status: 'draft',
    categoryId: '',
    categories: [],
    tags: '',
    fabric: '',
    occasion: '',
    brand: '',
    images: [],
    variants: []
  });

  // Variant being edited
  const [editingVariant, setEditingVariant] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    loadProducts();
    loadCategories();
  }, [user]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getAll({ per_page: 100 });
      const productsData = response.products || response.data || [];

      console.log('Raw API Response:', productsData[0]); // Debug log

      // Map API response to frontend format
      const mappedProducts = productsData.map(product => {
        // Handle both base_price (string) and basePrice formats
        const priceValue = product.basePrice || product.base_price || 0;
        const price = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;

        // Get SKU from product or first variant
        const sku = product.sku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : 'N/A');

        // Calculate total stock from all variants
        const stock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

        // Get category names
        const categoryNames = product.categories 
          ? product.categories.map(cat => cat.name).join(', ')
          : (product.category || 'Uncategorized');

        return {
          ...product,
          basePrice: price || 0,
          sku: sku,
          stock: stock,
          category: categoryNames,
          variants: product.variants || []
        };
      });

      console.log('Mapped Products:', mappedProducts[0]); // Debug log
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      // TODO: Add categoriesAPI to api.js
      // For now, use empty array or fetch from products
      setCategories([]);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCreateProduct = () => {
    setProductForm({
      name: '',
      description: '',
      basePrice: '',
      status: 'draft',
      categoryId: '',
      categories: [],
      tags: '',
      fabric: '',
      occasion: '',
      brand: '',
      images: [],
      variants: []
    });
    setIsCreating(true);
    setActiveTab('form');
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      basePrice: product.basePrice || product.base_price || '',
      status: product.status || 'draft',
      categoryId: product.categoryId || product.category_id || '',
      categories: product.categories || [],
      tags: product.tags || '',
      fabric: product.fabric || '',
      occasion: product.occasion || '',
      brand: product.brand || '',
      images: product.images || [],
      variants: product.variants || []
    });
    setIsEditing(true);
    setActiveTab('form');
  };

  const handleSaveProduct = async () => {
    // Validation
    if (!productForm.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!productForm.basePrice || parseFloat(productForm.basePrice) <= 0) {
      toast.error('Valid base price is required');
      return;
    }

    try {
      const payload = {
        name: productForm.name,
        description: productForm.description,
        basePrice: parseFloat(productForm.basePrice) || 0,
        status: productForm.status,
        fabric: productForm.fabric,
        occasion: productForm.occasion,
        brand: productForm.brand,
        categoryId: productForm.categoryId || productForm.categories[0] || null,
        categories: productForm.categories.length > 0
          ? productForm.categories
          : productForm.categoryId ? [productForm.categoryId] : [],
        variants: productForm.variants.map(v => ({
          sku: v.sku,
          price: parseFloat(v.price) || 0,
          discountPrice: v.discountPrice ? parseFloat(v.discountPrice) : null,
          stock: parseInt(v.stock) || 0,
          attributes: v.attributes || {},
          image: v.image || null,
          lowStockThreshold: v.lowStockThreshold || 5
        }))
      };

      console.log('Saving product with payload:', payload);

      if (isCreating) {
        await productsAPI.create(payload);
        toast.success('Product created successfully');
      } else {
        await productsAPI.update(selectedProduct.id, payload);
        toast.success('Product updated successfully');
      }

      setIsCreating(false);
      setIsEditing(false);
      setSelectedProduct(null);
      setActiveTab('list');
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await productsAPI.delete(productId);
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  // Variant Management
  const handleAddVariant = () => {
    const newVariant = {
      sku: `SKU-${Date.now()}`,
      price: 0,
      discountPrice: null,
      stock: 0,
      attributes: { color: '', size: '', fabric: '' },
      image: null,
      lowStockThreshold: 5
    };
    setProductForm(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
    setEditingVariant(newVariant);
  };

  const handleUpdateVariant = (index, updatedVariant) => {
    const newVariants = [...productForm.variants];
    newVariants[index] = updatedVariant;
    setProductForm(prev => ({
      ...prev,
      variants: newVariants
    }));
  };

  const handleDeleteVariant = (index) => {
    const newVariants = productForm.variants.filter((_, i) => i !== index);
    setProductForm(prev => ({
      ...prev,
      variants: newVariants
    }));
    if (editingVariant && productForm.variants[index] === editingVariant) {
      setEditingVariant(null);
    }
  };

  // Image Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'products');

      const response = await uploadAPI.uploadImage(formData);
      const imageUrl = response.data?.cdn?.medium || response.data?.medium;
      
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, imageUrl]
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Filter products
  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '24px' }}>
      {/* Header */}
      <div style={{ background: 'transparent', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {activeTab === 'categories' ? 'Categories' : 'Products'}
                </h1>
                <p className="text-sm text-gray-300 mt-1">
                  {activeTab === 'categories'
                    ? 'Manage product categories and their slugs'
                    : 'Manage your product catalog'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'list' || activeTab === 'form' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('list')}
                  style={{ background: activeTab === 'list' || activeTab === 'form' ? '#6366f1' : 'transparent', borderColor: 'rgba(148, 163, 184, 0.3)' }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Products
                </Button>
                <Button
                  variant={activeTab === 'categories' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('categories')}
                  style={{ background: activeTab === 'categories' ? '#6366f1' : 'transparent', borderColor: 'rgba(148, 163, 184, 0.3)' }}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Categories
                </Button>
              </div>
            </div>
            {activeTab !== 'categories' && (
              <Button onClick={handleCreateProduct} className="gap-2" style={{ background: '#6366f1' }}>
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'categories' ? (
          <CategoriesPage />
        ) : activeTab === 'list' ? (
          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle style={{ color: '#ffffff' }}>All Products</CardTitle>
                  <CardDescription style={{ color: '#94a3b8' }}>
                    {filteredProducts.length} products found
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.3)' }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Variants</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.images?.[0] && (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.category}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.sku || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>₹{product.basePrice || 0}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock > 10 ? 'default' : 'destructive'}>
                              {product.stock || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{product.variants?.length || 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Product Form */}
            <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle style={{ color: '#ffffff' }}>{isCreating ? 'Create Product' : 'Edit Product'}</CardTitle>
                    <CardDescription style={{ color: '#94a3b8' }}>
                      Fill in the product details below
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setActiveTab('list');
                    }} style={{ background: 'transparent', borderColor: 'rgba(148, 163, 184, 0.3)', color: '#e2e8f0' }}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProduct} className="gap-2" style={{ background: '#6366f1', color: '#ffffff' }}>
                      <Save className="w-4 h-4" />
                      Save Product
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                    <TabsTrigger value="basic" style={{ color: '#e2e8f0' }}>Basic Info</TabsTrigger>
                    <TabsTrigger value="variants">Variants</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="organization">Organization</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          value={productForm.name}
                          onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={productForm.description}
                          onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Product description"
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="basePrice">Base Price (₹)</Label>
                          <Input
                            id="basePrice"
                            type="number"
                            value={productForm.basePrice}
                            onChange={(e) => setProductForm(prev => ({ ...prev, basePrice: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={productForm.status}
                            onValueChange={(value) => setProductForm(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="variants" className="mt-4">
                    <VariantEditor
                      variants={productForm.variants}
                      onAddVariant={handleAddVariant}
                      onUpdateVariant={handleUpdateVariant}
                      onDeleteVariant={handleDeleteVariant}
                      editingVariant={editingVariant}
                      setEditingVariant={setEditingVariant}
                    />
                  </TabsContent>

                  <TabsContent value="media" className="mt-4">
                    <MediaUploader
                      images={productForm.images}
                      onUpload={handleImageUpload}
                      onRemove={handleRemoveImage}
                      uploading={uploadingImage}
                    />
                  </TabsContent>

                  <TabsContent value="organization" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={productForm.categoryId}
                          onValueChange={(value) => setProductForm(prev => ({ ...prev, categoryId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tags">Tags</Label>
                        <Input
                          id="tags"
                          value={productForm.tags}
                          onChange={(e) => setProductForm(prev => ({ ...prev, tags: e.target.value }))}
                          placeholder="saree, silk, wedding"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="fabric">Fabric</Label>
                        <Input
                          id="fabric"
                          value={productForm.fabric}
                          onChange={(e) => setProductForm(prev => ({ ...prev, fabric: e.target.value }))}
                          placeholder="Silk, Cotton, etc."
                        />
                      </div>
                      <div>
                        <Label htmlFor="occasion">Occasion</Label>
                        <Input
                          id="occasion"
                          value={productForm.occasion}
                          onChange={(e) => setProductForm(prev => ({ ...prev, occasion: e.target.value }))}
                          placeholder="Wedding, Party, etc."
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={productForm.brand}
                          onChange={(e) => setProductForm(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="Brand name"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Variant Editor Component
const VariantEditor = ({ variants, onAddVariant, onUpdateVariant, onDeleteVariant, editingVariant, setEditingVariant }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Variants</h3>
          <p className="text-sm text-gray-500">Different versions of your product (size, color, etc.)</p>
        </div>
        <Button onClick={onAddVariant} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Variant
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant, index) => (
              <TableRow key={index}>
                <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                <TableCell>₹{variant.price}</TableCell>
                <TableCell>
                  {variant.discountPrice ? (
                    <Badge variant="default">₹{variant.discountPrice}</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={variant.stock <= variant.lowStockThreshold ? 'destructive' : 'default'}>
                    {variant.stock}
                  </Badge>
                </TableCell>
                <TableCell>{variant.attributes?.color || '-'}</TableCell>
                <TableCell>{variant.attributes?.size || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingVariant(editingVariant === variant ? null : variant)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteVariant(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AnimatePresence>
        {editingVariant && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <VariantForm
              variant={editingVariant}
              index={variants.indexOf(editingVariant)}
              onUpdate={onUpdateVariant}
              onClose={() => setEditingVariant(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Variant Form Component
const VariantForm = ({ variant, index, onUpdate, onClose }) => {
  const [formData, setFormData] = useState(variant);

  const handleSave = () => {
    onUpdate(index, formData);
    onClose();
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Edit Variant</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>SKU</Label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
            />
          </div>
          <div>
            <Label>Price (₹)</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Discount Price (₹)</Label>
            <Input
              type="number"
              value={formData.discountPrice || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, discountPrice: parseFloat(e.target.value) || null }))}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <Label>Color</Label>
            <Input
              value={formData.attributes?.color || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                attributes: { ...prev.attributes, color: e.target.value }
              }))}
            />
          </div>
          <div>
            <Label>Size</Label>
            <Input
              value={formData.attributes?.size || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                attributes: { ...prev.attributes, size: e.target.value }
              }))}
            />
          </div>
          <div>
            <Label>Fabric</Label>
            <Input
              value={formData.attributes?.fabric || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                attributes: { ...prev.attributes, fabric: e.target.value }
              }))}
            />
          </div>
          <div>
            <Label>Low Stock Threshold</Label>
            <Input
              type="number"
              value={formData.lowStockThreshold || 5}
              onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 5 }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Variant</Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Media Uploader Component
const MediaUploader = ({ images, onUpload, onRemove, uploading }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Product Images</h3>
        <p className="text-sm text-gray-500 mb-4">Upload high-quality images of your product</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
              <img src={image} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {index === 0 && (
                <Badge className="absolute bottom-2 left-2">Primary</Badge>
              )}
            </div>
          ))}
          
          <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Upload Image</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdminProductsPage;
