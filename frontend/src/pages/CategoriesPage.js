import React, { useState, useEffect } from 'react';
import { categoriesAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Link, FolderPlus } from 'lucide-react';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parent_id: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.categories || response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const payload = {
        ...categoryForm,
        slug: categoryForm.slug || generateSlug(categoryForm.name)
      };

      await categoriesAPI.create(payload);
      toast.success('Category created successfully');
      setShowCreateModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory) return;

    try {
      const payload = {
        ...categoryForm,
        slug: categoryForm.slug || generateSlug(categoryForm.name)
      };

      await categoriesAPI.update(selectedCategory.id, payload);
      toast.success('Category updated successfully');
      setShowEditModal(false);
      setSelectedCategory(null);
      resetForm();
      loadCategories();
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? This cannot be undone.')) return;

    try {
      await categoriesAPI.delete(id);
      toast.success('Category deleted successfully');
      loadCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      parent_id: category.parent_id || ''
    });
    setShowEditModal(true);
  };

  const handleView = (category) => {
    setSelectedCategory(category);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      image: '',
      parent_id: ''
    });
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setCategoryForm(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name)
    }));
  };

  const stats = {
    total: categories.length,
    withDescription: categories.filter(c => c.description).length,
    withImage: categories.filter(c => c.image).length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage product categories and their slugs</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-gray-500">Total Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.withDescription}</div>
            <p className="text-sm text-gray-500">With Description</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.withImage}</div>
            <p className="text-sm text-gray-500">With Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderPlus className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link className="w-3 h-3 text-gray-400" />
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                            {category.slug}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-500">
                          {category.description || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.product_count || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(category)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No categories found. Click "Add Category" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new product category with automatic slug generation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={categoryForm.name}
                onChange={handleNameChange}
                placeholder="e.g., Women's Sarees"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (URL-friendly name)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="slug"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="womens-sarees"
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryForm(prev => ({ ...prev, slug: generateSlug(prev.name) }))}
                >
                  Auto
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Auto-generated from name if left empty</p>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Category description"
              />
            </div>
            <div>
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={categoryForm.image}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category details and slug
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={categoryForm.name}
                onChange={handleNameChange}
              />
            </div>
            <div>
              <Label htmlFor="edit-slug">Slug</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-slug"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryForm(prev => ({ ...prev, slug: generateSlug(prev.name) }))}
                >
                  Auto
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-image">Image URL</Label>
              <Input
                id="edit-image"
                value={categoryForm.image}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, image: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Category Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Name</h4>
                <p className="text-lg">{selectedCategory.name}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Slug</h4>
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                  {selectedCategory.slug}
                </code>
              </div>
              <div>
                <h4 className="text-sm font-medium">Description</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCategory.description || 'No description'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Products</h4>
                <Badge variant="outline">{selectedCategory.product_count || 0} products</Badge>
              </div>
              {selectedCategory.image && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Image</h4>
                  <img
                    src={selectedCategory.image}
                    alt={selectedCategory.name}
                    className="w-full h-48 object-cover rounded"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesPage;
