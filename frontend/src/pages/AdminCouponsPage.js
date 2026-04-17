import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tag, Edit, Trash2, Plus, Search, Loader2, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { couponsAPI } from '../services/api';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });
  const [stats, setStats] = useState(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  
  // Form states
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    min_cart_value: '',
    max_discount: '',
    usage_limit: '',
    starts_at: '',
    expires_at: '',
    status: 'active',
    applicable_products: [],
    applicable_categories: [],
    buy_x_qty: 1,
    get_y_qty: 1,
  });

  useEffect(() => {
    loadCoupons(1);
  }, [statusFilter, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCoupons(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadCoupons = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      };
      const response = await couponsAPI.getAll(params);
      
      const data = response.data || response;
      setCoupons(data.coupons || []);
      setStats(data.stats || null);
      
      const paginationData = data.meta?.pagination || data.pagination || {};
      setPagination(prev => ({
        ...prev,
        ...paginationData,
        totalPages: paginationData.totalPages || paginationData.total_pages || 1
      }));
    } catch (error) {
      console.error('Failed to load coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadCoupons(newPage);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      min_cart_value: '',
      max_discount: '',
      usage_limit: '',
      starts_at: '',
      expires_at: '',
      status: 'active',
      applicable_products: [],
      applicable_categories: [],
      buy_x_qty: 1,
      get_y_qty: 1,
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Prepare data - convert empty strings to null/undefined for optional fields
    const submitData = {
      ...formData,
      value: Number(formData.value),
      min_cart_value: formData.min_cart_value ? Number(formData.min_cart_value) : undefined,
      max_discount: formData.max_discount ? Number(formData.max_discount) : undefined,
      usage_limit: formData.usage_limit ? Number(formData.usage_limit) : undefined,
      starts_at: formData.starts_at || undefined,
      expires_at: formData.expires_at || undefined,
      buy_x_qty: formData.buy_x_qty ? Number(formData.buy_x_qty) : undefined,
      get_y_qty: formData.get_y_qty ? Number(formData.get_y_qty) : undefined,
    };

    try {
      await couponsAPI.create(submitData);
      toast.success('Coupon created successfully');
      setShowCreateDialog(false);
      resetForm();
      loadCoupons();
    } catch (error) {
      console.error('Failed to create coupon:', error);
      toast.error(error.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Prepare data - convert empty strings to null/undefined for optional fields
    const submitData = {
      ...formData,
      value: formData.value ? Number(formData.value) : undefined,
      min_cart_value: formData.min_cart_value ? Number(formData.min_cart_value) : undefined,
      max_discount: formData.max_discount ? Number(formData.max_discount) : undefined,
      usage_limit: formData.usage_limit ? Number(formData.usage_limit) : undefined,
      starts_at: formData.starts_at || undefined,
      expires_at: formData.expires_at || undefined,
      buy_x_qty: formData.buy_x_qty ? Number(formData.buy_x_qty) : undefined,
      get_y_qty: formData.get_y_qty ? Number(formData.get_y_qty) : undefined,
    };

    try {
      await couponsAPI.update(selectedCoupon.id, submitData);
      toast.success('Coupon updated successfully');
      setShowEditDialog(false);
      setSelectedCoupon(null);
      resetForm();
      loadCoupons();
    } catch (error) {
      console.error('Failed to update coupon:', error);
      toast.error(error.response?.data?.message || 'Failed to update coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await couponsAPI.delete(selectedCoupon.id);
      toast.success('Coupon deleted successfully');
      setShowDeleteDialog(false);
      setSelectedCoupon(null);
      loadCoupons();
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      toast.error('Failed to delete coupon');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value?.toString() || '',
      min_cart_value: coupon.min_cart_value?.toString() || '',
      max_discount: coupon.max_discount?.toString() || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      starts_at: coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : '',
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : '',
      status: coupon.status,
      applicable_products: coupon.applicable_products || [],
      applicable_categories: coupon.applicable_categories || [],
      buy_x_qty: coupon.buy_x_qty || 1,
      get_y_qty: coupon.get_y_qty || 1,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (coupon) => {
    setSelectedCoupon(coupon);
    setShowDeleteDialog(true);
  };

  const getTypeBadge = (type, value) => {
    const badges = {
      percentage: `${value}% OFF`,
      flat: `₹${value} OFF`,
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

  // Data is now filtered server-side
  const displayedCoupons = coupons;

  return (
    <div className="p-6 space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Coupons" 
          value={stats?.total || 0} 
          icon={Tag} 
          color="maroon" 
          loading={loading && !stats} 
          subtext="All discount codes"
        />
        <StatCard 
          title="Active" 
          value={stats?.active || 0} 
          icon={CheckCircle} 
          color="emerald" 
          loading={loading && !stats} 
          subtext="Available for use"
        />
        <StatCard 
          title="Expired" 
          value={stats?.expired || 0} 
          icon={XCircle} 
          color="gold" 
          loading={loading && !stats} 
          subtext="Past validity dates"
        />
        <StatCard 
          title="Total Usage" 
          value={stats?.totalUsage || 0} 
          icon={TrendingUp} 
          color="emerald" 
          loading={loading && !stats} 
          subtext="Times coupons redeemed"
        />
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Coupons
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Manage discount codes and promotional offers</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Coupon
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Coupon</DialogTitle>
                  <DialogDescription>
                    Create a new discount coupon for your store
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Coupon Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="WELCOME20"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Discount Type *</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="flat">Flat Amount</SelectItem>
                          <SelectItem value="free_shipping">Free Shipping</SelectItem>
                          <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="value">Discount Value *</Label>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        placeholder="20"
                        required={formData.type !== 'free_shipping'}
                      />
                    </div>
                    {formData.type === 'percentage' && (
                      <div>
                        <Label htmlFor="max_discount">Max Discount Amount</Label>
                        <Input
                          id="max_discount"
                          type="number"
                          step="0.01"
                          value={formData.max_discount}
                          onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                          placeholder="200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min_cart_value">Minimum Cart Value</Label>
                      <Input
                        id="min_cart_value"
                        type="number"
                        step="0.01"
                        value={formData.min_cart_value}
                        onChange={(e) => setFormData({ ...formData, min_cart_value: e.target.value })}
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="usage_limit">Usage Limit</Label>
                      <Input
                        id="usage_limit"
                        type="number"
                        value={formData.usage_limit}
                        onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="starts_at">Valid From</Label>
                      <Input
                        id="starts_at"
                        type="datetime-local"
                        value={formData.starts_at}
                        onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expires_at">Expires At</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.type === 'buy_x_get_y' && (
                      <>
                        <div>
                          <Label htmlFor="buy_x_qty">Buy Quantity</Label>
                          <Input
                            id="buy_x_qty"
                            type="number"
                            value={formData.buy_x_qty}
                            onChange={(e) => setFormData({ ...formData, buy_x_qty: e.target.value })}
                            placeholder="2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="get_y_qty">Get Quantity</Label>
                          <Input
                            id="get_y_qty"
                            type="number"
                            value={formData.get_y_qty}
                            onChange={(e) => setFormData({ ...formData, get_y_qty: e.target.value })}
                            placeholder="1"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Coupon'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="free_shipping">Free Shipping</SelectItem>
                <SelectItem value="buy_x_get_y">BOGO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Min Cart</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : displayedCoupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold text-primary">{coupon.code}</TableCell>
                      <TableCell className="capitalize">{coupon.type?.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <Badge variant="default">{getTypeBadge(coupon.type, coupon.value)}</Badge>
                      </TableCell>
                      <TableCell>{coupon.min_cart_value ? `₹${coupon.min_cart_value}` : '₹0'}</TableCell>
                      <TableCell>
                        {coupon.used_count} / {coupon.usage_limit || '∞'}
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(coupon.status)}>
                          {coupon.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(coupon)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-medium text-foreground">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium text-foreground">{pagination.total}</span> coupons
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
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
                      variant={pagination.page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={pagination.page === pageNum ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Update coupon details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Coupon Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Discount Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-value">Discount Value *</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required={formData.type !== 'free_shipping'}
                />
              </div>
              {formData.type === 'percentage' && (
                <div>
                  <Label htmlFor="edit-max_discount">Max Discount Amount</Label>
                  <Input
                    id="edit-max_discount"
                    type="number"
                    step="0.01"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-min_cart_value">Minimum Cart Value</Label>
                <Input
                  id="edit-min_cart_value"
                  type="number"
                  step="0.01"
                  value={formData.min_cart_value}
                  onChange={(e) => setFormData({ ...formData, min_cart_value: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-usage_limit">Usage Limit</Label>
                <Input
                  id="edit-usage_limit"
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-starts_at">Valid From</Label>
                <Input
                  id="edit-starts_at"
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-expires_at">Expires At</Label>
                <Input
                  id="edit-expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete coupon "{selectedCoupon?.code}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCouponsPage;

// Premium Stat Card Component
const StatCard = ({ title, value, format, icon: Icon, color, trend, delay, loading, subtext, indicator }) => {
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
    maroon: { bg: 'bg-indigo-900/40', text: 'text-indigo-100', iconColor: 'text-indigo-400', glow: 'shadow-luxury' },
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', iconColor: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    gold: { bg: 'bg-amber-500/20', text: 'text-amber-400', iconColor: 'text-amber-400', glow: 'shadow-gold-glow' },
    charcoal: { bg: 'bg-slate-700/40', text: 'text-white/80', iconColor: 'text-white/60', glow: 'shadow-glass' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-luxury transition-all hover:scale-[1.02] hover:bg-white/10`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg} backdrop-blur-md`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {indicator && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              indicator === 'red' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {indicator === 'red' ? 'Alert' : 'Warning'}
            </span>
          )}
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-white/10 animate-pulse rounded mt-1" />
          ) : (
            <h3 className={`mt-1 text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-white/40 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};
