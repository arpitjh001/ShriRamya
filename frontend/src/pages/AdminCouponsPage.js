import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Tag, Edit, Trash2, Plus, Search, Loader2, Clock, CheckCircle, XCircle, TrendingUp, Megaphone, Eye } from 'lucide-react';
import { couponsAPI, categoriesAPI, promoBarsAPI } from '../services/api';
import { toast } from 'sonner';

const PROMO_LOCATIONS = [
  { value: 'all', label: 'All pages' },
  { value: 'home', label: 'Home' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'cart', label: 'Cart' },
  { value: 'checkout', label: 'Checkout' },
];

const emptyPromoBarForm = {
  title: '',
  promoText: '',
  couponCode: '',
  displayLocation: 'all',
  isActive: true,
  startDate: '',
  endDate: '',
  priority: '0',
  backgroundColor: '',
  textColor: '',
};

const toDateTimeLocalInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part) => String(part).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoFromDateTimeLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [promoBars, setPromoBars] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoBarsLoading, setPromoBarsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('coupons');
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
  const [showPromoCreateDialog, setShowPromoCreateDialog] = useState(false);
  const [showPromoEditDialog, setShowPromoEditDialog] = useState(false);
  const [showPromoDeleteDialog, setShowPromoDeleteDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [selectedPromoBar, setSelectedPromoBar] = useState(null);
  
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
  const [promoFormData, setPromoFormData] = useState({ ...emptyPromoBarForm });

  useEffect(() => {
    loadCoupons(1);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeSection === 'promo-bars') {
      loadPromoBars();
    }
  }, [activeSection]);

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

  const loadPromoBars = async () => {
    setPromoBarsLoading(true);
    try {
      const response = await promoBarsAPI.getAll();
      setPromoBars(response.promoBars || []);
    } catch (error) {
      console.error('Failed to load promo bars:', error);
      toast.error('Failed to load promo bars');
    } finally {
      setPromoBarsLoading(false);
    }
  };

  const getCategoryIdentifier = (category) => {
    const rawIdentifier = category?._id ?? category?.id ?? category;
    return rawIdentifier == null ? null : String(rawIdentifier);
  };

  const getCouponCategoryIds = (coupon) => (
    Array.isArray(coupon?.applicable_categories)
      ? coupon.applicable_categories.map(getCategoryIdentifier).filter(Boolean)
      : []
  );

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      const categoryData = Array.isArray(response)
        ? response
        : (response?.categories || response?.data?.categories || []);
      setCategories(
        categoryData
          .map((category) => {
            const id = getCategoryIdentifier(category);
            return id ? { ...category, id } : null;
          })
          .filter(Boolean)
      );
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const getCouponScopeLabel = (coupon) => {
    const categoryIds = getCouponCategoryIds(coupon);
    if (categoryIds.length === 0) return 'All categories';

    const categoryNames = categoryIds.map((categoryId) => {
      const populatedCategory = (coupon.applicable_categories || [])
        .find((category) => getCategoryIdentifier(category) === categoryId);
      const knownCategory = categories.find((category) => category.id === categoryId);
      return populatedCategory?.name || knownCategory?.name || 'Category';
    });

    return categoryNames.join(', ');
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

  const resetPromoForm = () => {
    setPromoFormData({ ...emptyPromoBarForm });
  };

  const buildPromoBarPayload = () => ({
    title: promoFormData.title?.trim() || '',
    promoText: promoFormData.promoText?.trim(),
    couponCode: promoFormData.couponCode?.trim() || null,
    displayLocation: promoFormData.displayLocation,
    isActive: Boolean(promoFormData.isActive),
    startDate: toIsoFromDateTimeLocalInput(promoFormData.startDate),
    endDate: toIsoFromDateTimeLocalInput(promoFormData.endDate),
    priority: promoFormData.priority === '' ? 0 : Number(promoFormData.priority),
    backgroundColor: promoFormData.backgroundColor?.trim() || '',
    textColor: promoFormData.textColor?.trim() || '',
  });

  const handleCreatePromoBar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await promoBarsAPI.create(buildPromoBarPayload());
      toast.success('Promo bar created successfully');
      setShowPromoCreateDialog(false);
      resetPromoForm();
      loadPromoBars();
    } catch (error) {
      console.error('Failed to create promo bar:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create promo bar');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePromoBar = async (e) => {
    e.preventDefault();
    if (!selectedPromoBar) return;
    setSaving(true);
    try {
      await promoBarsAPI.update(selectedPromoBar.id || selectedPromoBar._id, buildPromoBarPayload());
      toast.success('Promo bar updated successfully');
      setShowPromoEditDialog(false);
      setSelectedPromoBar(null);
      resetPromoForm();
      loadPromoBars();
    } catch (error) {
      console.error('Failed to update promo bar:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update promo bar');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePromoBar = async (promoBar, isActive) => {
    const id = promoBar.id || promoBar._id;
    try {
      setPromoBars((current) => current.map((item) => (
        (item.id || item._id) === id ? { ...item, isActive } : item
      )));
      await promoBarsAPI.toggle(id, isActive);
      toast.success(isActive ? 'Promo bar enabled' : 'Promo bar disabled');
      loadPromoBars();
    } catch (error) {
      console.error('Failed to toggle promo bar:', error);
      toast.error('Failed to update promo bar status');
      loadPromoBars();
    }
  };

  const handleDeletePromoBar = async () => {
    if (!selectedPromoBar) return;
    setSaving(true);
    try {
      await promoBarsAPI.delete(selectedPromoBar.id || selectedPromoBar._id);
      toast.success('Promo bar deleted successfully');
      setShowPromoDeleteDialog(false);
      setSelectedPromoBar(null);
      loadPromoBars();
    } catch (error) {
      console.error('Failed to delete promo bar:', error);
      toast.error('Failed to delete promo bar');
    } finally {
      setSaving(false);
    }
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
      applicable_categories: getCouponCategoryIds(coupon),
      buy_x_qty: coupon.buy_x_qty || 1,
      get_y_qty: coupon.get_y_qty || 1,
    });
    setShowEditDialog(true);
  };

  const openPromoEditDialog = (promoBar) => {
    setSelectedPromoBar(promoBar);
    setPromoFormData({
      title: promoBar.title || '',
      promoText: promoBar.promoText || '',
      couponCode: promoBar.couponCode || '',
      displayLocation: promoBar.displayLocation || 'all',
      isActive: Boolean(promoBar.isActive),
      startDate: toDateTimeLocalInputValue(promoBar.startDate),
      endDate: toDateTimeLocalInputValue(promoBar.endDate),
      priority: String(promoBar.priority ?? 0),
      backgroundColor: promoBar.backgroundColor || '',
      textColor: promoBar.textColor || '',
    });
    setShowPromoEditDialog(true);
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

  const openPromoDeleteDialog = (promoBar) => {
    setSelectedPromoBar(promoBar);
    setShowPromoDeleteDialog(true);
  };

  // Data is now filtered server-side
  const displayedCoupons = coupons;
  const activePromoBarsCount = promoBars.filter((promoBar) => promoBar.isActive).length;

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

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <TabsList className="h-auto rounded-2xl border border-border bg-white p-1 shadow-luxury-sm">
          <TabsTrigger
            value="coupons"
            className="gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-700 data-[state=active]:!bg-blue-950 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-950/20"
          >
            <Tag className="h-4 w-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger
            value="promo-bars"
            className="gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-700 data-[state=active]:!bg-blue-950 data-[state=active]:!text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-950/20"
          >
            <Megaphone className="h-4 w-4" />
            Promo Bar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-0">
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

                <CategoryTargetField
                  categories={categories}
                  selectedCategoryIds={formData.applicable_categories}
                  onChange={(nextCategoryIds) => setFormData({ ...formData, applicable_categories: nextCategoryIds })}
                />

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
                <TableHead className="text-muted-foreground">Scope</TableHead>
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
                  <TableCell colSpan={9} className="h-24 text-center text-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : displayedCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No coupons found
                  </TableCell>
                </TableRow>
              ) : (
                displayedCoupons.map((coupon) => (
                  <TableRow key={coupon.id || coupon._id} className="border-border hover:bg-slate-50">
                    <TableCell className="font-mono font-bold text-foreground">{coupon.code}</TableCell>
                    <TableCell className="capitalize text-slate-600">{coupon.type?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200 text-foreground">{getTypeBadge(coupon.type, coupon.value)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-slate-600" title={getCouponScopeLabel(coupon)}>
                      {getCouponScopeLabel(coupon)}
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
        </TabsContent>

        <TabsContent value="promo-bars" className="mt-0">
          <PromoBarAdminSection
            promoBars={promoBars}
            coupons={coupons}
            loading={promoBarsLoading}
            saving={saving}
            activeCount={activePromoBarsCount}
            showCreateDialog={showPromoCreateDialog}
            setShowCreateDialog={setShowPromoCreateDialog}
            showEditDialog={showPromoEditDialog}
            setShowEditDialog={setShowPromoEditDialog}
            showDeleteDialog={showPromoDeleteDialog}
            setShowDeleteDialog={setShowPromoDeleteDialog}
            promoFormData={promoFormData}
            setPromoFormData={setPromoFormData}
            onCreate={handleCreatePromoBar}
            onEdit={handleUpdatePromoBar}
            onDelete={handleDeletePromoBar}
            onToggle={handleTogglePromoBar}
            onOpenEdit={openPromoEditDialog}
            onOpenDelete={openPromoDeleteDialog}
            resetPromoForm={resetPromoForm}
          />
        </TabsContent>
      </Tabs>

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

            <CategoryTargetField
              categories={categories}
              selectedCategoryIds={formData.applicable_categories}
              onChange={(nextCategoryIds) => setFormData({ ...formData, applicable_categories: nextCategoryIds })}
            />

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

const CategoryTargetField = ({ categories = [], selectedCategoryIds = [], onChange }) => {
  const selectedIds = selectedCategoryIds.map((id) => String(id));

  const toggleCategory = (categoryId, checked) => {
    const normalizedId = String(categoryId);
    const nextIds = checked
      ? Array.from(new Set([...selectedIds, normalizedId]))
      : selectedIds.filter((id) => id !== normalizedId);
    onChange(nextIds);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Category Scope
        </Label>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {selectedIds.length ? `${selectedIds.length} selected` : 'All categories'}
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-xs font-medium text-slate-500">
          No categories available
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-xl border border-border bg-white p-2">
          {categories.map((category) => {
            const categoryId = String(category.id || category._id);
            const checked = selectedIds.includes(categoryId);

            return (
              <label
                key={categoryId}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleCategory(categoryId, value === true)}
                  className="border-slate-300 data-[state=checked]:bg-royal-maroon data-[state=checked]:text-white"
                />
                <span className="min-w-0 flex-1 truncate">{category.name || category.slug || 'Category'}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PromoBarAdminSection = ({
  promoBars = [],
  coupons = [],
  loading,
  saving,
  activeCount,
  showCreateDialog,
  setShowCreateDialog,
  showEditDialog,
  setShowEditDialog,
  showDeleteDialog,
  setShowDeleteDialog,
  promoFormData,
  setPromoFormData,
  onCreate,
  onEdit,
  onDelete,
  onToggle,
  onOpenEdit,
  onOpenDelete,
  resetPromoForm,
}) => {
  const formatDate = (value) => {
    if (!value) return 'Open';
    return new Date(value).toLocaleDateString();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-luxury-sm space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold text-foreground">Promo Bar</h2>
          <p className="text-muted-foreground">Manage storefront announcement text and coupon nudges.</p>
        </div>
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) resetPromoForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-royal-maroon text-white hover:bg-royal-maroon/90 shadow-lg px-6">
              <Plus className="w-4 h-4 mr-2" />
              Add Promo Bar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury scrollbar-hide">
            <DialogHeader className="border-b border-border pb-6">
              <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
                New <span className="text-royal-maroon">Promo</span> Bar
              </DialogTitle>
              <DialogDescription className="text-muted-foreground italic font-medium">
                Configure the announcement shown across the storefront.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-6 py-6 max-h-[72vh] overflow-y-auto px-1 custom-scrollbar">
              <PromoBarFormFields
                formData={promoFormData}
                setFormData={setPromoFormData}
                coupons={coupons}
              />
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
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Promo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total messages</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{promoBars.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Enabled</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Priority rule</p>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
            Highest priority wins for each location.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <Table className="min-w-[980px] lg:min-w-full">
          <TableHeader className="bg-slate-50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Title</TableHead>
              <TableHead className="text-muted-foreground">Coupon</TableHead>
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Priority</TableHead>
              <TableHead className="text-muted-foreground">Schedule</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Preview</TableHead>
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
            ) : promoBars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No promo bar entries found
                </TableCell>
              </TableRow>
            ) : (
              promoBars.map((promoBar) => (
                <TableRow key={promoBar.id || promoBar._id} className="border-border hover:bg-slate-50">
                  <TableCell className="max-w-[300px]">
                    <div className="font-semibold text-foreground truncate" title={promoBar.title || 'Untitled promo'}>
                      {promoBar.title || 'Untitled promo'}
                    </div>
                    {promoBar.promoText && (
                      <div className="mt-1 text-xs text-slate-500 truncate" title={promoBar.promoText}>
                        {promoBar.promoText}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-600">
                    {promoBar.couponCode || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 text-foreground capitalize">
                      {PROMO_LOCATIONS.find((item) => item.value === promoBar.displayLocation)?.label || promoBar.displayLocation}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{promoBar.priority ?? 0}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {formatDate(promoBar.startDate)} - {formatDate(promoBar.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={Boolean(promoBar.isActive)}
                        onCheckedChange={(checked) => onToggle(promoBar, checked)}
                        className="data-[state=checked]:bg-royal-maroon"
                      />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        {promoBar.isActive ? 'On' : 'Off'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PromoBarPreview promoBar={promoBar} compact />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenEdit(promoBar)}
                        className="text-slate-400 hover:text-foreground"
                        aria-label="Edit promo bar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenDelete(promoBar)}
                        className="text-red-400 hover:text-red-600"
                        aria-label="Delete promo bar"
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury scrollbar-hide">
          <DialogHeader className="border-b border-border pb-6">
            <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
              Edit <span className="text-royal-maroon">Promo</span> Bar
            </DialogTitle>
            <DialogDescription className="text-muted-foreground italic font-medium">
              Update storefront announcement settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onEdit} className="space-y-6 py-6 max-h-[72vh] overflow-y-auto px-1 custom-scrollbar">
            <PromoBarFormFields
              formData={promoFormData}
              setFormData={setPromoFormData}
              coupons={coupons}
            />
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Promo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-white border border-rose-100 text-foreground rounded-3xl overflow-hidden shadow-2xl">
          <DialogHeader className="pt-4 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-heading font-bold text-foreground tracking-tight">
              Delete <span className="text-rose-500">Promo</span> Bar?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-4 px-4">
              This will remove the selected promo bar entry from storefront configuration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 pt-8 pb-4">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px] h-11"
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={saving}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg border-none"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PromoBarFormFields = ({ formData, setFormData, coupons = [] }) => {
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="promoText" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
          Promo Text *
        </Label>
        <Textarea
          id="promoText"
          value={formData.promoText}
          onChange={(e) => updateField('promoText', e.target.value)}
          placeholder="Enter storefront announcement"
          className="min-h-[88px] bg-slate-50 border-border text-foreground placeholder:text-slate-400 focus:ring-royal-maroon/20"
          required
          maxLength={240}
        />
        <div className="text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {formData.promoText.length}/240
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="promoTitle" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Title
          </Label>
          <Input
            id="promoTitle"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Internal label"
            className="bg-slate-50 border-border text-foreground h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="couponCode" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Coupon Code
          </Label>
          <Input
            id="couponCode"
            list="promo-coupon-codes"
            value={formData.couponCode}
            onChange={(e) => updateField('couponCode', e.target.value.toUpperCase())}
            placeholder="Optional"
            className="bg-slate-50 border-border text-foreground h-11 uppercase font-mono"
          />
          <datalist id="promo-coupon-codes">
            {coupons.map((coupon) => (
              <option key={coupon.id || coupon._id || coupon.code} value={coupon.code} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Display Location
          </Label>
          <Select value={formData.displayLocation} onValueChange={(value) => updateField('displayLocation', value)}>
            <SelectTrigger className="bg-slate-50 border-border text-foreground h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-border text-foreground">
              {PROMO_LOCATIONS.map((location) => (
                <SelectItem key={location.value} value={location.value}>
                  {location.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Priority
          </Label>
          <Input
            id="priority"
            type="number"
            min="0"
            value={formData.priority}
            onChange={(e) => updateField('priority', e.target.value)}
            className="bg-slate-50 border-border text-foreground h-11 font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Active
          </Label>
          <div className="flex h-11 items-center gap-3 rounded-md border border-border bg-slate-50 px-3">
            <Switch
              checked={Boolean(formData.isActive)}
              onCheckedChange={(checked) => updateField('isActive', checked)}
              className="data-[state=checked]:bg-royal-maroon"
            />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {formData.isActive ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Schedule</span>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="promoStartDate" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Start Date
            </Label>
            <Input
              id="promoStartDate"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
              className="bg-white border-border text-foreground h-10 text-xs custom-calendar-icon"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promoEndDate" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              End Date
            </Label>
            <Input
              id="promoEndDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
              className="bg-white border-border text-foreground h-10 text-xs custom-calendar-icon"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="backgroundColor" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Background Color
          </Label>
          <Input
            id="backgroundColor"
            value={formData.backgroundColor}
            onChange={(e) => updateField('backgroundColor', e.target.value)}
            placeholder="Optional color"
            className="bg-slate-50 border-border text-foreground h-11 font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="textColor" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
            Text Color
          </Label>
          <Input
            id="textColor"
            value={formData.textColor}
            onChange={(e) => updateField('textColor', e.target.value)}
            placeholder="Optional color"
            className="bg-slate-50 border-border text-foreground h-11 font-mono"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview
        </div>
        <PromoBarPreview promoBar={formData} />
      </div>
    </>
  );
};

const PromoBarPreview = ({ promoBar, compact = false }) => {
  const style = {
    ...(promoBar.backgroundColor ? { backgroundColor: promoBar.backgroundColor } : {}),
    ...(promoBar.textColor ? { color: promoBar.textColor } : {}),
  };
  const text = promoBar.promoText || 'Preview';

  return (
    <div
      style={style}
      className={`relative overflow-hidden border border-white/15 bg-royal-maroon text-ivory shadow-[0_10px_28px_rgba(64,13,23,0.18)] ${
        compact
          ? 'max-w-[260px] rounded-xl px-3 py-2 text-[9px]'
          : 'rounded-2xl px-4 py-3 text-[10px] md:text-xs'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative z-10 flex min-w-0 items-center justify-center gap-2 text-center font-bold uppercase tracking-[0.24em]">
        <span className="min-w-0 truncate">{text}</span>
        {promoBar.couponCode && (
          <span className="shrink-0 rounded-full border border-current/25 px-2 py-0.5 font-mono tracking-widest">
            {promoBar.couponCode}
          </span>
        )}
      </div>
    </div>
  );
};

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
