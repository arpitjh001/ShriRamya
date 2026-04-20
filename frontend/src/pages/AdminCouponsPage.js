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
    limit: 20,
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
        per_page: pagination.limit,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined
      };
      const response = await couponsAPI.getAll(params);

      setCoupons(response.coupons || []);
      setStats(response.stats || null);

      const paginationData = response.pagination || {};
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
      await couponsAPI.update(selectedCoupon.id || selectedCoupon._id, submitData);
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
      await couponsAPI.delete(selectedCoupon.id || selectedCoupon._id);
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

  const openDeleteDialog = (coupon) => {
    setSelectedCoupon(coupon);
    setShowDeleteDialog(true);
  };

  // Data is now filtered server-side
  const displayedCoupons = coupons;

  return (
    <div className="admin-dashboard-shell min-h-screen pt-24 pb-12 font-body px-6">
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

      {/* Header & Controls Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-luxury-sm border-border space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Coupon Management</h1>
            <p className="text-muted-foreground">Manage discount codes and promotional offers</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-royal-maroon text-white hover:bg-royal-maroon/90 shadow-lg px-6">
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury scrollbar-hide">
              <DialogHeader className="border-b border-border pb-6">
                <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
                  Establish <span className="text-royal-maroon">Vault</span> Token
                </DialogTitle>
                <DialogDescription className="text-muted-foreground italic font-medium">
                  Inscribe a new promotional privilege into the archives.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-6 py-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Archive Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., HERITAGE20"
                      className="bg-slate-50 border-border text-foreground placeholder:text-slate-400 focus:ring-royal-maroon/20 focus:border-royal-maroon/50 h-11 uppercase font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Privilege Type *</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="bg-slate-50 border-border text-foreground focus:ring-royal-maroon/20 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border text-foreground">
                        <SelectItem value="percentage" className="focus:bg-slate-100 focus:text-foreground text-xs">Percentage (%)</SelectItem>
                        <SelectItem value="flat" className="focus:bg-slate-100 focus:text-foreground text-xs">Flat Valuation (₹)</SelectItem>
                        <SelectItem value="free_shipping" className="focus:bg-slate-100 focus:text-foreground text-xs">Free Logistics</SelectItem>
                        <SelectItem value="buy_x_get_y" className="focus:bg-slate-100 focus:text-foreground text-xs">BOGO / Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="value" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Privilege Valuation *</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="e.g., 20"
                      className="bg-slate-50 border-border text-foreground placeholder:text-slate-400 focus:ring-royal-maroon/20 h-11 font-mono"
                      required={formData.type !== 'free_shipping'}
                    />
                  </div>
                  {formData.type === 'percentage' && (
                    <div className="space-y-2">
                      <Label htmlFor="max_discount" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Ceiling Valuation</Label>
                      <Input
                        id="max_discount"
                        type="number"
                        step="0.01"
                        value={formData.max_discount}
                        onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                        placeholder="e.g., 500"
                        className="bg-slate-50 border-border text-foreground placeholder:text-slate-400 focus:ring-royal-maroon/20 h-11 font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Temporal Constraints</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="starts_at" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Valid From</Label>
                      <Input
                        id="starts_at"
                        type="datetime-local"
                        value={formData.starts_at}
                        onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                        className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-10 text-xs custom-calendar-icon"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires_at" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Expires At</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                        className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-10 text-xs custom-calendar-icon"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="min_cart_value" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Min acquisition Valuation</Label>
                    <Input
                      id="min_cart_value"
                      type="number"
                      step="0.01"
                      value={formData.min_cart_value}
                      onChange={(e) => setFormData({ ...formData, min_cart_value: e.target.value })}
                      placeholder="e.g., 1000"
                      className="bg-slate-50 border-border text-foreground h-11 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usage_limit" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Reservation Limit</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      placeholder="e.g., 50"
                      className="bg-slate-50 border-border text-foreground h-11 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Initial Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="bg-slate-50 border-border text-foreground h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border text-foreground">
                        <SelectItem value="active" className="focus:bg-slate-100 focus:text-foreground text-xs">Active (Public)</SelectItem>
                        <SelectItem value="inactive" className="focus:bg-slate-100 focus:text-foreground text-xs">Inactive (Hidden)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.type === 'buy_x_get_y' && (
                    <div className="col-span-2 grid grid-cols-2 gap-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="space-y-2">
                        <Label htmlFor="buy_x_qty" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Buy Quantity</Label>
                        <Input
                          id="buy_x_qty"
                          type="number"
                          value={formData.buy_x_qty}
                          onChange={(e) => setFormData({ ...formData, buy_x_qty: e.target.value })}
                          className="bg-white border-border text-foreground h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="get_y_qty" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Privilege Quantity</Label>
                        <Input
                          id="get_y_qty"
                          type="number"
                          value={formData.get_y_qty}
                          onChange={(e) => setFormData({ ...formData, get_y_qty: e.target.value })}
                          className="bg-white border-border text-foreground h-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="border-t border-border pt-6">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowCreateDialog(false)} 
                    className="text-muted-foreground hover:text-foreground hover:bg-slate-100 px-6 font-bold uppercase tracking-widest text-[10px]"
                  >
                    Discard
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-royal-maroon hover:bg-royal-maroon/90 text-white px-8 shadow-luxury font-bold uppercase tracking-widest text-[10px] rounded-xl border-none h-11"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Seal privilege'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 border-border text-foreground placeholder:text-slate-400"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-slate-50 border-border text-foreground">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border-border text-foreground">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] bg-slate-50 border-border text-foreground">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-white border-border text-foreground">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="flat">Flat</SelectItem>
              <SelectItem value="free_shipping">Free Shipping</SelectItem>
              <SelectItem value="buy_x_get_y">BOGO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-white overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <Table className="min-w-[900px] lg:min-w-full">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Code</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Value</TableHead>
                <TableHead className="text-muted-foreground">Min Cart</TableHead>
                <TableHead className="text-muted-foreground">Usage</TableHead>
                <TableHead className="text-muted-foreground">Valid Until</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-foreground">
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
                  <TableRow key={coupon.id} className="border-border hover:bg-slate-50">
                    <TableCell className="font-mono font-bold text-foreground">{coupon.code}</TableCell>
                    <TableCell className="capitalize text-slate-600">{coupon.type?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200 text-foreground">{getTypeBadge(coupon.type, coupon.value)}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{coupon.min_cart_value ? `₹${coupon.min_cart_value}` : '₹0'}</TableCell>
                    <TableCell className="text-slate-600">
                      {coupon.used_count} / {coupon.usage_limit || '∞'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(coupon.status)} className="capitalize">
                        {coupon.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(coupon)}
                          className="text-slate-400 hover:text-foreground"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(coupon)}
                          className="text-red-400 hover:text-red-600"
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Showing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="text-foreground">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="text-foreground">{pagination.total}</span> coupons
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="text-muted-foreground hover:text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px]"
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
                    className={`min-w-[32px] h-8 text-[11px] font-bold transition-all ${
                      pagination.page === pageNum 
                        ? 'bg-foreground text-white shadow-md scale-110' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-slate-100'
                    }`}
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
                className="text-muted-foreground hover:text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-xl bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury scrollbar-hide">
          <DialogHeader className="border-b border-border pb-6">
            <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
              Amend <span className="text-royal-maroon">Vault</span> Token
            </DialogTitle>
            <DialogDescription className="text-muted-foreground italic font-medium">
              Updating historical promotional archives.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-6 py-8 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-code" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Archive Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="bg-slate-50 border-border text-foreground focus:ring-royal-maroon/20 h-11 uppercase font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Privilege Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-slate-50 border-border text-foreground h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border text-foreground">
                    <SelectItem value="percentage" className="focus:bg-slate-100 focus:text-foreground text-xs">Percentage (%)</SelectItem>
                    <SelectItem value="flat" className="focus:bg-slate-100 focus:text-foreground text-xs">Flat Valuation (₹)</SelectItem>
                    <SelectItem value="free_shipping" className="focus:bg-slate-100 focus:text-foreground text-xs">Free Logistics</SelectItem>
                    <SelectItem value="buy_x_get_y" className="focus:bg-slate-100 focus:text-foreground text-xs">BOGO / Volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-value" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Privilege Valuation *</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="bg-slate-50 border-border text-foreground h-11 font-mono"
                  required={formData.type !== 'free_shipping'}
                />
              </div>
              {formData.type === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-max_discount" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Ceiling Valuation</Label>
                  <Input
                    id="edit-max_discount"
                    type="number"
                    step="0.01"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    className="bg-slate-50 border-border text-foreground h-11 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Temporal Constraints</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-starts_at" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Valid From</Label>
                  <Input
                    id="edit-starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="bg-white border-border text-foreground h-10 text-xs custom-calendar-icon"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-expires_at" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Expires At</Label>
                  <Input
                    id="edit-expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="bg-white border-border text-foreground h-10 text-xs custom-calendar-icon"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-min_cart_value" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Min acquisition Valuation</Label>
                <Input
                  id="edit-min_cart_value"
                  type="number"
                  step="0.01"
                  value={formData.min_cart_value}
                  onChange={(e) => setFormData({ ...formData, min_cart_value: e.target.value })}
                  className="bg-slate-50 border-border text-foreground h-11 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-usage_limit" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Reservation Limit</Label>
                <Input
                  id="edit-usage_limit"
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  className="bg-slate-50 border-border text-foreground h-11 font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-status" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Current Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-slate-50 border-border text-foreground h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-foreground">
                  <SelectItem value="active" className="focus:bg-slate-100 focus:text-foreground text-xs">Active (Public)</SelectItem>
                  <SelectItem value="inactive" className="focus:bg-slate-100 focus:text-foreground text-xs">Inactive (Hidden)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="border-t border-border pt-6">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowEditDialog(false)} 
                className="text-muted-foreground hover:text-foreground hover:bg-slate-100 px-6 font-bold uppercase tracking-widest text-[10px]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving} 
                className="bg-royal-gold hover:bg-royal-gold/90 text-slate-900 px-8 shadow-luxury font-bold uppercase tracking-widest text-[10px] rounded-xl border-none h-11"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Amendments'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-white border border-rose-100 text-foreground rounded-3xl overflow-hidden shadow-2xl">
          <DialogHeader className="pt-4 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
              Revoke <span className="text-rose-500">Privilege</span>?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-4 px-4">
              Are you certain you wish to purge the token <span className="text-foreground font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">"{selectedCoupon?.code}"</span> from the vault? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-8 pb-4">
            <Button 
                variant="ghost" 
                onClick={() => setShowDeleteDialog(false)} 
                className="flex-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px] h-11"
            >
              Preserve
            </Button>
            <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={saving}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg border-none"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dissolve Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCouponsPage;

// Premium Stat Card Component
const StatCard = ({ title, value, format, icon: Icon, color, trend, delay, loading, subtext }) => {
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
    maroon: { bg: 'bg-royal-maroon/5', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-luxury' },
    emerald: { bg: 'bg-emerald-500/5', text: 'text-emerald-600', iconColor: 'text-emerald-500', glow: 'shadow-emerald-500/10' },
    gold: { bg: 'bg-amber-500/5', text: 'text-amber-600', iconColor: 'text-amber-500', glow: 'shadow-gold-glow' },
    charcoal: { bg: 'bg-slate-50', text: 'text-foreground', iconColor: 'text-slate-400', glow: 'shadow-glass' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-border bg-white shadow-luxury-sm hover:scale-[1.02] transition-all`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-slate-50 transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
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
