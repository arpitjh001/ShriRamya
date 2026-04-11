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

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const items = await inventoryAPI.getStockLevels();
      setInventory(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return inventory;

    return inventory.filter((item) => (
      item.productName?.toLowerCase().includes(query) ||
      item.categoryName?.toLowerCase().includes(query) ||
      item.color?.toLowerCase().includes(query) ||
      item.size?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query)
    ));
  }, [inventory, searchTerm]);

  const stockAlerts = useMemo(
    () => inventory.filter((item) => item.isLowStock || item.stock === 0),
    [inventory]
  );

  const stats = useMemo(() => ({
    totalVariants: inventory.filter((item) => (Number(item.stock) || 0) > 0).length,
    totalProducts: new Set(
      inventory
        .filter((item) => (Number(item.stock) || 0) > 0)
        .map((item) => item.productId)
        .filter(Boolean)
    ).size,
    lowStock: inventory.filter((item) => item.isLowStock).length,
    outOfStock: inventory.filter((item) => item.stock === 0).length,
    totalValue: inventory.reduce((sum, item) => sum + ((item.price || 0) * (item.stock || 0)), 0),
  }), [inventory]);

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
    <div className="min-h-screen bg-royal-veil p-4 md:p-8 font-body">
      {/* Premium Glass Header */}
      <div className="mb-8 animate-fade-in overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-luxury md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">
              Inventory <span className="text-royal-gold">Management</span>
            </h1>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
              Boutique Stock Control
            </p>
          </div>
          <Button
            onClick={loadInventory}
            variant="outline"
            className="border-white/10 bg-white/5 text-white shadow-luxury hover:bg-white/10"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-royal-gold ${loading ? 'animate-spin' : ''}`} />
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

        {stockAlerts.length > 0 && (
          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Inventory Alerts
              </CardTitle>
              <CardDescription className="text-slate-400">
                {stockAlerts.length} variants need attention right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stockAlerts.slice(0, 6).map((item) => (
                  <div key={item.variantId || item.id} className="p-3 rounded-lg bg-red-500/10">
                    <p className="font-medium text-white">{item.productName}</p>
                    <p className="text-xs text-slate-300">{item.color || 'Default'} / {item.size || 'Default'}</p>
                    <p className="text-xs text-slate-400 mt-1">SKU: {item.sku || 'N/A'}</p>
                    <div className="mt-2">{statusBadge(item)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">Stock Levels</CardTitle>
                <CardDescription className="text-slate-400">
                  Each row represents one sellable variant.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by product, category, color, size, SKU..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10 bg-white/5 text-slate-100 border-slate-400/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
              </div>
            ) : (
              <div className="rounded-md border border-slate-400/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-400/20">
                      <TableHead className="text-slate-200">Product</TableHead>
                      <TableHead className="text-slate-200">Categories</TableHead>
                      <TableHead className="text-slate-200">Variant</TableHead>
                      <TableHead className="text-slate-200">SKU</TableHead>
                      <TableHead className="text-slate-200">Price</TableHead>
                      <TableHead className="text-slate-200">Stock</TableHead>
                      <TableHead className="text-slate-200">Threshold</TableHead>
                      <TableHead className="text-slate-200">Status</TableHead>
                      <TableHead className="text-right text-slate-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.variantId || item.id} className="border-slate-400/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.thumbnail ? (
                              <img src={item.thumbnail} alt={item.productName} className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-white/10" />
                            )}
                            <div>
                              <div className="font-medium text-white">{item.productName}</div>
                              <div className="text-xs text-slate-400">Product total: {item.productTotalStock}</div>
                              {item.soldOffline && (
                                <Badge className="mt-1 bg-cyan-600 text-white hover:bg-cyan-600">Sold Offline</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 max-w-[180px]">{item.categoryName || 'Uncategorized'}</TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex flex-col">
                            <span>{item.color || 'Default'}</span>
                            <span className="text-xs text-slate-400">{item.size || 'Default'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300">{item.sku || 'N/A'}</TableCell>
                        <TableCell className="text-slate-300">Rs.{Number(item.price || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-white">{item.stock}</TableCell>
                        <TableCell className="text-slate-300">{item.lowStockThreshold}</TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openOfflineSaleModal(item)}
                              disabled={item.stock <= 0}
                              className="gap-2 border-cyan-400/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-40"
                            >
                              <ShoppingBag className="w-4 h-4" />
                              Sold Offline
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAdjustmentModal(item)}
                              className="border-slate-400/30 bg-transparent text-slate-100 hover:bg-white/10"
                            >
                              Adjust
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-slate-400">
                          No inventory rows matched your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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
    maroon: { bg: 'bg-royal-maroon/20', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-luxury' },
    emerald: { bg: 'bg-deep-emerald/20', text: 'text-emerald-400', iconColor: 'text-deep-emerald', glow: 'shadow-emerald-500/10' },
    gold: { bg: 'bg-royal-gold/20', text: 'text-royal-gold', iconColor: 'text-royal-gold', glow: 'shadow-gold-glow' },
    charcoal: { bg: 'bg-charcoal/40', text: 'text-white/80', iconColor: 'text-white/60', glow: 'shadow-glass' }
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
            <Skeleton className="mt-2 h-9 w-32 bg-white/10" />
          ) : (
            <h3 className={`mt-1 font-heading text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-white/40 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};
