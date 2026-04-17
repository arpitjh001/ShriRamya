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
    return <Badge variant="destructive">Out of Stock</Badge>;
  }

  if (item.isLowStock) {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Low Stock</Badge>;
  }

  return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">In Stock</Badge>;
};

const AdminInventoryPage = () => {
  const { user } = useAuth();
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
    loadInventory(1);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadInventory(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadInventory = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        q: searchTerm
      };
      const response = await inventoryAPI.getStockLevels(params);
      
      const data = response.data || response;
      const items = data.items || [];
      setInventory(Array.isArray(items) ? items : []);
      
      if (data.stats) {
        setServerStats(data.stats);
      }
      
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          ...data.pagination,
          totalPages: data.pagination.total_pages || data.pagination.totalPages || 1,
          page: data.pagination.current_page || data.pagination.page || page
        }));
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
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
    
    // Fallback for UI if serverStats mapping isn't ready
    return {
      totalVariants: 0,
      totalProducts: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
    };
  }, [serverStats]);

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
    <div className="min-h-screen bg-background p-4 md:p-8 font-body">
      {/* Premium Header */}
      <div className="mb-8 animate-fade-in overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-6 shadow-luxury md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
              Inventory <span className="text-royal-maroon">Management</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-charcoal/60">
              Boutique Stock Control
            </p>
          </div>
          <Button
            onClick={loadInventory}
            variant="outline"
            className="border-charcoal/10 bg-white text-charcoal shadow-sm hover:bg-charcoal/5"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-royal-maroon ${loading ? 'animate-spin' : ''}`} />
            Sync Stock
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Variants" value={stats.totalVariants} icon={Layers} color="maroon" delay="delay-0" loading={loading} subtext="Active SKUs" />
          <StatCard title="Products" value={stats.totalProducts} icon={Package} color="gold" delay="delay-75" loading={loading} subtext="Unique items" />
          <StatCard title="Low Stock" value={stats.lowStock} icon={AlertTriangle} color="emerald" delay="delay-150" loading={loading} indicator="amber" />
          <StatCard title="Out of Stock" value={stats.outOfStock} icon={AlertTriangle} color="charcoal" delay="delay-200" loading={loading} indicator="red" />
          <StatCard title="Total Value" value={stats.totalValue} icon={TrendingUp} color="emerald" delay="delay-250" loading={loading} format="currency" />
        </div>

        {serverStats?.stockAlerts?.length > 0 && (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Inventory Alerts
              </CardTitle>
              <CardDescription className="text-red-600/70">
                {serverStats.stockAlerts.length} variants need attention right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {serverStats.stockAlerts.slice(0, 6).map((item) => (
                  <div key={item.variantId || item.id} className="p-3 rounded-xl border border-red-100 bg-white shadow-sm">
                    <p className="font-semibold text-charcoal">{item.productName}</p>
                    <p className="text-xs text-charcoal/60">{item.color || 'Default'} / {item.size || 'Default'}</p>
                    <p className="text-xs text-charcoal/40 mt-1">SKU: {item.sku || 'N/A'}</p>
                    <div className="mt-2 text-charcoal">{statusBadge(item)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-charcoal/10 bg-white shadow-luxury">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-charcoal">Stock Levels</CardTitle>
                <CardDescription className="text-charcoal/60">
                  Each row represents one sellable variant.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <Input
                  placeholder="Search by product, category, color, size, SKU..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10 bg-background text-charcoal border-charcoal/10"
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
              <div className="rounded-xl border border-charcoal/10 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-charcoal/[0.02]">
                    <TableRow className="border-charcoal/10">
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Product</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Categories</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Variant</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">SKU</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Price</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Stock</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Threshold</TableHead>
                      <TableHead className="text-charcoal font-bold uppercase tracking-wider text-[11px]">Status</TableHead>
                      <TableHead className="text-right text-charcoal font-bold uppercase tracking-wider text-[11px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.variantId || item.id} className="border-charcoal/5 hover:bg-charcoal/[0.01] transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.productName} className="w-10 h-10 rounded-lg object-cover ring-1 ring-charcoal/10" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                                <Package className="w-4 h-4 text-charcoal/20" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-charcoal">{item.productName}</div>
                              <div className="text-[10px] text-charcoal/40 uppercase tracking-tighter">Total Stock: {item.productTotalStock}</div>
                              {item.soldOffline && (
                                <Badge className="mt-1 bg-royal-maroon/10 text-royal-maroon border-none hover:bg-royal-maroon/20">Sold Offline</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-charcoal/70 text-xs font-medium max-w-[180px]">{item.categoryName || 'Uncategorized'}</TableCell>
                        <TableCell className="text-charcoal/70">
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs">{item.color || 'Default'}</span>
                            <span className="text-[10px] text-charcoal/40 font-medium uppercase">{item.size || 'Default'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-charcoal/50">{item.sku || 'N/A'}</TableCell>
                        <TableCell className="text-charcoal font-semibold text-xs">Rs.{Number(item.price || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`font-bold text-sm ${item.stock <= (item.lowStockThreshold || 5) ? 'text-red-600' : 'text-emerald-700'}`}>
                            {item.stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-charcoal/40 text-[11px] font-medium">{item.lowStockThreshold}</TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openOfflineSaleModal(item)}
                              disabled={item.stock <= 0}
                              className="gap-2 border-charcoal/10 bg-white text-charcoal hover:bg-royal-maroon hover:text-white transition-all disabled:opacity-30"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Sold Offline
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustmentModal(item)}
                              className="border-charcoal/10 bg-charcoal/5 text-charcoal hover:bg-charcoal/10"
                            >
                              Adjust
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-charcoal/40">
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
                  <div className="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
                    Showing <span className="text-charcoal">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="text-charcoal">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="text-charcoal">{pagination.total}</span> variants
                  </div>
                  
                  {/* Items Per Page Selector */}
                  <div className="flex items-center gap-3 border-l border-charcoal/10 pl-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 whitespace-nowrap">View</span>
                    <Select 
                      value={pagination.limit.toString()} 
                      onValueChange={(val) => {
                        setPagination(prev => ({ ...prev, limit: parseInt(val), page: 1 }));
                        loadInventory(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] bg-background border-charcoal/10 text-xs font-bold">
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
                    className="text-charcoal hover:bg-charcoal/5 font-bold uppercase tracking-widest text-[10px]"
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
                            ? 'bg-charcoal text-white shadow-md scale-110' 
                            : 'text-charcoal/40 hover:text-charcoal hover:bg-charcoal/5'
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
                    className="text-charcoal hover:bg-charcoal/5 font-bold uppercase tracking-widest text-[10px]"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem && (
              <>
                <div className="p-3 rounded-lg bg-slate-100">
                  <p className="font-medium">{selectedItem.productName}</p>
                  <p className="text-sm text-slate-500">{selectedItem.color || 'Default'} / {selectedItem.size || 'Default'}</p>
                  <p className="text-sm text-slate-500">SKU: {selectedItem.sku || 'N/A'}</p>
                  <p className="text-sm text-slate-500">Current Stock: {selectedItem.stock}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Adjustment Type</Label>
                    <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Stock</SelectItem>
                        <SelectItem value="remove">Remove Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={adjustmentQty}
                      onChange={(event) => setAdjustmentQty(parseInt(event.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-blue-50">
                  <p className="text-sm font-medium">New Stock Level</p>
                  <p className="text-2xl font-bold">
                    {adjustmentType === 'add'
                      ? selectedItem.stock + adjustmentQty
                      : Math.max(0, selectedItem.stock - adjustmentQty)}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockAdjustment}>
              <Save className="w-4 h-4 mr-2" />
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offlineSaleModal} onOpenChange={setOfflineSaleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Product Sold Offline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem && (
              <>
                <div className="p-3 rounded-lg bg-slate-100">
                  <p className="font-medium">{selectedItem.productName}</p>
                  <p className="text-sm text-slate-500">{selectedItem.color || 'Default'} / {selectedItem.size || 'Default'}</p>
                  <p className="text-sm text-slate-500">SKU: {selectedItem.sku || 'N/A'}</p>
                  <p className="text-sm text-slate-500">Available Stock: {selectedItem.stock}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity Sold Offline</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedItem.stock}
                      value={offlineSaleForm.quantity}
                      onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, quantity: parseInt(event.target.value, 10) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label>Sale Price</Label>
                    <Input
                      type="number"
                      min="0"
                      value={offlineSaleForm.salePrice}
                      onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Method</Label>
                    <Select
                      value={offlineSaleForm.paymentMethod}
                      onValueChange={(value) => setOfflineSaleForm((prev) => ({ ...prev, paymentMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Customer Name (optional)</Label>
                    <Input
                      value={offlineSaleForm.customerName}
                      onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, customerName: event.target.value }))}
                      placeholder="Walk-in customer"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={offlineSaleForm.notes}
                    onChange={(event) => setOfflineSaleForm((prev) => ({ ...prev, notes: event.target.value }))}
                    placeholder="Bill number, boutique name, etc."
                  />
                </div>

                <div className="p-3 rounded-lg bg-cyan-50">
                  <p className="text-sm font-medium">Inventory After Offline Sale</p>
                  <p className="text-2xl font-bold">
                    {Math.max(0, selectedItem.stock - (parseInt(offlineSaleForm.quantity, 10) || 0))}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfflineSaleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleOfflineSale} disabled={!selectedItem || selectedItem.stock <= 0}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Confirm Offline Sale
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
    maroon: { bg: 'bg-royal-maroon/[0.08]', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-sm' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconColor: 'text-emerald-600', glow: 'shadow-sm' },
    gold: { bg: 'bg-amber-50', text: 'text-amber-700', iconColor: 'text-amber-600', glow: 'shadow-sm' },
    charcoal: { bg: 'bg-charcoal/[0.05]', text: 'text-charcoal', iconColor: 'text-charcoal/60', glow: 'shadow-sm' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-6 shadow-luxury transition-all hover:shadow-xl`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-charcoal/[0.02] transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg} backdrop-blur-md`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {indicator && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              indicator === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {indicator === 'red' ? 'Alert' : 'Warning'}
            </span>
          )}
          {trend && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-32 bg-charcoal/5" />
          ) : (
            <h3 className={`mt-1 font-heading text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-charcoal/40 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};
