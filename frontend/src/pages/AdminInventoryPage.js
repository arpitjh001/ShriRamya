import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertTriangle, Layers, Package, RefreshCw, Save, Search, ShoppingBag, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const statusBadge = (item) => {
  if (item.stock === 0) {
    return <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20">Out of Stock</Badge>;
  }

  if (item.isLowStock) {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Low Stock</Badge>;
  }

  return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">In Stock</Badge>;
};

const AdminInventoryPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [offlineSaleModal, setOfflineSaleModal] = useState(false);
  const [offlineSaleForm, setOfflineSaleForm] = useState({
    quantity: 1,
    salePrice: '',
    paymentMethod: 'cash',
    customerName: '',
    notes: '',
  });

  const [serverStats, setServerStats] = useState(null);

  useEffect(() => {
    if (user) {
      loadInventory(1);
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        loadInventory(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, user]);

  const loadInventory = async (page = 1, limit = pagination.limit) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: searchTerm
      };
      const response = await inventoryAPI.getStockLevels(params);
      
      const items = response.items || (Array.isArray(response) ? response : []);
      setInventory(items);
      
      if (response.stats) {
        setServerStats(response.stats);
      }
      
      if (response.pagination) {
        setPagination({
          page: response.pagination.page || page,
          limit: response.pagination.limit || limit,
          total: response.pagination.total || 0,
          totalPages: response.pagination.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      // Let the global api interceptor and AdminProtectedRoute handle 401/403
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        toast.error('Failed to load inventory data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadInventory(newPage);
  };

  const filteredInventory = inventory; // Now filtered server-side

  const stats = useMemo(() => {
    if (serverStats) return serverStats;
    
    // Fallback for UI if server stats are temporarily unavailable.
    return {
      totalVariants: inventory.length,
      totalProducts: new Set(inventory.map((item) => item.productId)).size,
      lowStock: inventory.filter((item) => item.isLowStock).length,
      outOfStock: inventory.filter((item) => item.stock === 0).length,
      totalValue: inventory.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0),
      stockAlerts: inventory.filter((item) => item.isLowStock || item.isOutOfStock),
    };
  }, [inventory, serverStats]);

  const openAdjustmentModal = (item) => {
    setSelectedItem(item);
    setAdjustmentQty(0);
    setAdjustmentType('add');
    setAdjustmentModal(true);
  };

  const openOfflineSaleModal = (item) => {
    setSelectedItem(item);
    setOfflineSaleForm({
      quantity: 1,
      salePrice: item.price?.toString() || '',
      paymentMethod: 'cash',
      customerName: '',
      notes: '',
    });
    setOfflineSaleModal(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || adjustmentQty <= 0) return;

    const nextStockLevel = adjustmentType === 'add'
      ? selectedItem.stock + adjustmentQty
      : Math.max(0, selectedItem.stock - adjustmentQty);

    try {
      await inventoryAPI.updateStockLevel(selectedItem.variantId || selectedItem.id, {
        stockLevel: nextStockLevel,
        lowStockThreshold: selectedItem.lowStockThreshold || 5,
      });

      toast.success(`${selectedItem.productName} ${selectedItem.color || ''} ${selectedItem.size || ''} updated to ${nextStockLevel} units`);
      setAdjustmentModal(false);
      await loadInventory();
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast.error(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const handleOfflineSale = async () => {
    if (!selectedItem) return;

    const quantity = parseInt(offlineSaleForm.quantity, 10) || 0;
    if (quantity < 1) {
      toast.error('Sale quantity must be at least 1');
      return;
    }

    if (quantity > selectedItem.stock) {
      toast.error(`Only ${selectedItem.stock} units are available`);
      return;
    }

    try {
      await inventoryAPI.recordOfflineSale({
        productId: selectedItem.productId,
        variantId: selectedItem.variantId || selectedItem.id,
        quantity,
        salePrice: offlineSaleForm.salePrice,
        paymentMethod: offlineSaleForm.paymentMethod,
        customerName: offlineSaleForm.customerName,
        notes: offlineSaleForm.notes,
      });

      toast.success(`${selectedItem.productName} marked as sold offline`);
      setOfflineSaleModal(false);
      await loadInventory();
    } catch (error) {
      console.error('Failed to record offline sale:', error);
      toast.error(error.response?.data?.message || 'Failed to mark sold offline');
    }
  };

  return (
    <div className="admin-dashboard-shell min-h-screen pt-24 pb-12 font-body">
      {/* Premium Header */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-luxury-sm border-border">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Inventory <span className="text-royal-maroon">Management</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Boutique Stock Control
            </p>
          </div>
          <Button
            onClick={() => loadInventory(pagination.page, pagination.limit)}
            variant="outline"
            className="border-border bg-white shadow-luxury-sm text-foreground"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-royal-maroon ${loading ? 'animate-spin' : ''}`} />
            Sync Stock
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <StatCard title="Variants" value={stats.totalVariants} icon={Layers} color="maroon" delay="delay-0" loading={loading} subtext="Active SKUs" />
          <StatCard title="Products" value={stats.totalProducts} icon={Package} color="gold" delay="delay-75" loading={loading} subtext="Unique items" />
          <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} color="emerald" delay="delay-150" loading={loading} indicator="amber" />
          <StatCard title="Out of Stock" value={stats.outOfStock} icon={AlertTriangle} color="charcoal" delay="delay-200" loading={loading} indicator="red" />
          <StatCard title="Total Value" value={stats.totalValue} icon={TrendingUp} color="emerald" delay="delay-250" loading={loading} format="currency" />
        </div>

        {serverStats?.stockAlerts?.length > 0 && (
          <Card className="border-royal-maroon/40 bg-royal-maroon shadow-luxury-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                Inventory Alerts
              </CardTitle>
              <CardDescription className="text-rose-100/90">
                {serverStats.stockAlerts.length} variants need attention right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {serverStats.stockAlerts.slice(0, 6).map((item) => (
                  <div key={item.variantId || item.id} className="p-3 rounded-xl border border-rose-200/20 bg-rose-950/20 shadow-sm backdrop-blur-sm">
                    <p className="font-semibold text-white">{item.productName}</p>
                    <p className="text-xs text-rose-100/85">{item.color || 'Default'} / {item.size || 'Default'}</p>
                    <p className="text-xs text-rose-200/70 mt-1 uppercase tracking-tighter">SKU: {item.sku || 'N/A'}</p>
                    <div className="mt-2">{statusBadge(item)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-white/10 bg-white shadow-luxury-sm border-border">
          <CardHeader className="border-b border-white/10 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-foreground text-2xl">Stock Levels</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Each row represents one sellable variant.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Search by product, category, color, size, SKU..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10 w-full bg-slate-50 border-border text-foreground focus:ring-royal-maroon focus:border-royal-maroon placeholder:text-slate-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-maroon" />
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent shadow-sm">
                <Table className="min-w-[1000px] lg:min-w-full">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Product</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Categories</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Variant</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">SKU</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Price</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Stock</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Threshold</TableHead>
                      <TableHead className="text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground font-bold uppercase tracking-tighter text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.variantId || item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.productName} className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 border border-white/10" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                <Package className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-foreground">{item.productName}</div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Total Stock: {item.productTotalStock}</div>
                              {item.soldOffline && (
                                <Badge className="mt-1 bg-royal-maroon/10 text-royal-maroon border-royal-maroon/20">Sold Offline</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {item.categories && item.categories.length > 0 ? (
                              item.categories.map((cat) => (
                                <span
                                  key={`${item.id}-${cat.id || cat._id}`}
                                  className="px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded-full text-[9px] font-bold border border-border whitespace-nowrap"
                                >
                                  {cat.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs font-medium">{item.categoryName || 'Uncategorized'}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-foreground">{item.color || 'Default'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{item.size || 'Standard'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{item.sku || 'N/A'}</TableCell>
                        <TableCell className="text-foreground font-bold">₹{item.price?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <span className={`font-bold text-sm ${item.stock <= (item.lowStockThreshold || 5) ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {item.stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px] font-medium">{item.lowStockThreshold}</TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openOfflineSaleModal(item)}
                              disabled={item.stock <= 0}
                              className="gap-2 border-border bg-white text-foreground hover:bg-royal-maroon hover:text-white transition-all disabled:opacity-30"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Sold Offline
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustmentModal(item)}
                              className="border-border bg-white text-muted-foreground hover:text-foreground hover:bg-slate-50"
                            >
                              Adjust
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                          No inventory rows matched your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && pagination.totalPages > 1 && (
              <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4 px-2">
                <div className="flex items-center gap-6">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Showing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="text-foreground">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="text-foreground">{pagination.total}</span> variants
                  </div>
                  
                  {/* Items Per Page Selector */}
                  <div className="flex items-center gap-3 border-l border-border pl-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">View</span>
                    <Select 
                      value={pagination.limit.toString()} 
                      onValueChange={(val) => {
                        const nextLimit = parseInt(val, 10);
                        setPagination(prev => ({ ...prev, limit: nextLimit, page: 1 }));
                        loadInventory(1, nextLimit);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] bg-white border-border text-foreground text-xs font-bold focus:ring-1 focus:ring-royal-maroon/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
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
                        className={`min-w-[32px] h-8 text-[11px] font-bold transition-all ${
                          pagination.page === pageNum 
                            ? 'bg-royal-maroon text-white shadow-md scale-110' 
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
                    className="text-foreground hover:bg-slate-100 font-bold uppercase tracking-widest text-[10px]"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={adjustmentModal} onOpenChange={setAdjustmentModal}>
        <DialogContent className="max-w-md bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury scrollbar-hide">
          <DialogHeader className="border-b border-border pb-6">
            <DialogTitle className="text-2xl font-heading font-bold text-foreground">Stock <span className="text-royal-maroon">Adjustment</span></DialogTitle>
            <CardDescription className="text-muted-foreground italic">Modify inventory levels with precision.</CardDescription>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            {selectedItem && (
              <>
                <div className="p-5 rounded-2xl bg-slate-50 border border-border shadow-sm space-y-2">
                  <p className="text-sm font-bold text-foreground uppercase tracking-wide">{selectedItem.productName}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{selectedItem.color || 'Default'} / {selectedItem.size || 'Default'}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">SKU: {selectedItem.sku || 'N/A'}</span>
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Current Inventory</span>
                    <span className="text-lg font-bold text-foreground">{selectedItem.stock} <span className="text-[10px] text-muted-foreground">Units</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Operation</Label>
                    <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                      <SelectTrigger className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border text-foreground">
                        <SelectItem value="add" className="focus:bg-slate-50 focus:text-foreground">Inscribe (Add)</SelectItem>
                        <SelectItem value="remove" className="focus:bg-slate-50 focus:text-foreground">Withdraw (Remove)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={adjustmentQty}
                      onChange={(event) => setAdjustmentQty(parseInt(event.target.value, 10) || 0)}
                      className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-11"
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-royal-maroon/5 border border-royal-maroon/10 shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-royal-maroon/70">Projected Inventory</p>
                    <p className="text-xs text-muted-foreground font-medium italic">Post-operation calculation</p>
                  </div>
                  <p className="text-3xl font-heading font-bold text-foreground">
                    {adjustmentType === 'add'
                      ? selectedItem.stock + adjustmentQty
                      : Math.max(0, selectedItem.stock - adjustmentQty)}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="border-t border-border pt-6">
            <Button 
                variant="ghost" 
                onClick={() => setAdjustmentModal(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-slate-50 px-6 font-bold uppercase tracking-widest text-[10px]"
            >
              Cancel
            </Button>
            <Button 
                onClick={handleStockAdjustment}
                className="bg-royal-maroon hover:bg-royal-maroon/90 text-white px-8 shadow-luxury font-bold uppercase tracking-widest text-[10px] rounded-xl border-none h-11"
            >
              <Save className="w-4 h-4 mr-2" />
              Certify Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offlineSaleModal} onOpenChange={setOfflineSaleModal}>
        <DialogContent className="max-w-4xl bg-white border-border text-foreground rounded-3xl overflow-hidden shadow-luxury">
          <DialogHeader className="border-b border-border pb-6">
            <DialogTitle className="text-2xl font-heading font-bold text-foreground">
              Record <span className="text-royal-maroon">Offline</span> Acquisition
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            {selectedItem && (
              <>
                <div className="p-5 rounded-2xl bg-slate-50 border border-border shadow-sm space-y-2">
                  <p className="text-sm font-bold text-foreground uppercase tracking-wide">{selectedItem.productName}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{selectedItem.color || 'Default'} / {selectedItem.size || 'Default'}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">SKU: {selectedItem.sku || 'N/A'}</span>
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Available Reserve</span>
                    <span className="text-lg font-bold text-emerald-600">{selectedItem.stock} <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Units</span></span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Acquisition Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedItem.stock}
                      value={offlineSaleForm.quantity}
                      onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, quantity: parseInt(event.target.value, 10) || 1 }))}
                      className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Acquisition Valuation (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={offlineSaleForm.salePrice}
                      onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                      className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Payment Protocol</Label>
                    <Select
                      value={offlineSaleForm.paymentMethod}
                      onValueChange={(value) => setOfflineSaleForm((prev) => ({ ...prev, paymentMethod: value }))}
                    >
                      <SelectTrigger className="bg-white border-border text-foreground focus:ring-royal-maroon/20 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border text-foreground">
                        <SelectItem value="cash" className="focus:bg-slate-50 focus:text-foreground">Cash Treasury</SelectItem>
                        <SelectItem value="upi" className="focus:bg-slate-50 focus:text-foreground">Digital UPI</SelectItem>
                        <SelectItem value="card" className="focus:bg-slate-50 focus:text-foreground">Credit/Debit Card</SelectItem>
                        <SelectItem value="bank_transfer" className="focus:bg-slate-50 focus:text-foreground">Direct Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Patron Identity (Optional)</Label>
                    <Input
                      value={offlineSaleForm.customerName}
                      onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, customerName: event.target.value }))}
                      placeholder="e.g., Guest Member"
                      className="bg-white border-border text-foreground placeholder:text-slate-400 focus:ring-royal-maroon/20 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Archive Notes (Optional)</Label>
                  <Input
                    value={offlineSaleForm.notes}
                    onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Reference detail, boutique location, etc."
                    className="bg-white border-border text-foreground placeholder:text-slate-400 focus:ring-royal-maroon/20 h-11"
                  />
                </div>

                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/70">Remaining Reserves</p>
                    <p className="text-xs text-muted-foreground font-medium italic">Estimated vault status</p>
                  </div>
                  <p className="text-3xl font-heading font-bold text-foreground">
                    {Math.max(0, selectedItem.stock - (parseInt(offlineSaleForm.quantity, 10) || 0))}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="border-t border-border pt-6">
            <Button 
                variant="ghost" 
                onClick={() => setOfflineSaleModal(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-slate-50 px-6 font-bold uppercase tracking-widest text-[10px]"
            >
              Cancel
            </Button>
            <Button 
                onClick={handleOfflineSale} 
                disabled={!selectedItem || selectedItem.stock <= 0}
                className="bg-royal-maroon hover:bg-royal-maroon/90 text-white px-8 shadow-luxury font-bold uppercase tracking-widest text-[10px] rounded-xl border-none h-11"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Confirm Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInventoryPage;

// Premium Stat Card
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
    maroon: { bg: 'bg-royal-maroon/5', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-luxury' },
    emerald: { bg: 'bg-emerald-500/5', text: 'text-emerald-600', iconColor: 'text-emerald-500', glow: 'shadow-emerald-500/10' },
    gold: { bg: 'bg-amber-500/5', text: 'text-amber-600', iconColor: 'text-amber-500', glow: 'shadow-gold-glow' },
    charcoal: { bg: 'bg-slate-100', text: 'text-foreground', iconColor: 'text-muted-foreground', glow: 'shadow-glass' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-luxury-sm transition-all hover:scale-[1.02] hover:shadow-luxury`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/5 transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {indicator && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              indicator === 'red' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
            }`}>
              {indicator === 'red' ? 'Alert' : 'Warning'}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <h3 className={`mt-1 font-heading text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-muted-foreground mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};
