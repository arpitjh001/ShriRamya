import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Package, AlertTriangle, TrendingUp, Warehouse, 
  Search, RefreshCw, Plus, Minus, Save
} from 'lucide-react';
import { toast } from 'sonner';

const AdminInventoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [stockAlerts, setStockAlerts] = useState([]);
  
  // Stock adjustment
  const [adjustmentModal, setAdjustmentModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentType, setAdjustmentType] = useState('add');

  const API_BASE = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const userRole = user?.role?.toLowerCase();
    const userRoles = user?.roles?.map(r => r.toLowerCase()) || [];
    if (!user || (!userRoles.includes('admin') && userRole !== 'admin')) {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    loadInventory();
    loadWarehouses();
  }, [user]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/inventory`);
      const data = await res.json();
      if (data.success) {
        setInventory(data.data.products || []);
        setStockAlerts(data.data.products.filter(p => p.isLowStock));
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally { setLoading(false); }
  };

  const loadWarehouses = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/warehouses`);
      const data = await res.json();
      setWarehouses(data.data || []);
    } catch (error) { console.error('Failed to load warehouses:', error); }
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant || adjustmentQty <= 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/inventory/${selectedVariant.productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment: adjustmentQty, type: adjustmentType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Stock ${adjustmentType === 'add' ? 'added' : 'reduced'}: ${data.data.name} now has ${data.data.stock} units`);
        setAdjustmentModal(false);
        loadInventory();
      } else { toast.error(data.message); }
    } catch (error) { toast.error('Failed to update stock'); }
  };

  const openAdjustmentModal = (variant) => {
    setSelectedVariant(variant);
    setAdjustmentQty(0);
    setAdjustmentType('add');
    setAdjustmentModal(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    totalProducts: inventory.length,
    lowStock: inventory.filter(i => i.isLowStock).length,
    outOfStock: inventory.filter(i => i.stock === 0).length,
    totalValue: inventory.reduce((sum, i) => sum + ((i.salePrice || i.price) * i.stock), 0)
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '24px' }}>
      {/* Header */}
      <div style={{ background: 'transparent', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Inventory</h1>
              <p className="text-sm text-gray-300 mt-1">
                Manage stock levels and warehouse allocation
              </p>
            </div>
            <Button 
              onClick={loadInventory} 
              variant="outline" 
              size="sm" 
              className="gap-2"
              style={{ background: 'transparent', borderColor: 'rgba(148, 163, 184, 0.3)', color: '#e2e8f0' }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Total Products</CardTitle>
              <Package className="h-4 w-4" style={{ color: '#94a3b8' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#ffffff' }}>{stats.totalProducts}</div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Across all warehouses
              </p>
            </CardContent>
          </Card>

          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4" style={{ color: '#f59e0b' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.lowStock}</div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Items below threshold
              </p>
            </CardContent>
          </Card>

          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4" style={{ color: '#ef4444' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats.outOfStock}</div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Need immediate attention
              </p>
            </CardContent>
          </Card>

          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Total Value</CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#10b981' }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>
                ₹{stats.totalValue.toLocaleString()}
              </div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Based on current stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Alerts */}
        {stockAlerts.length > 0 && (
          <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#ef4444' }}>
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription style={{ color: '#94a3b8' }}>
                {stockAlerts.length} items need immediate restocking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stockAlerts.slice(0, 6).map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-3" style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                    <div>
                      <p className="font-medium text-sm">{alert.productName}</p>
                      <p className="text-xs text-muted-foreground">SKU: {alert.sku}</p>
                    </div>
                    <Badge variant="destructive">{alert.availableStock} left</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Table */}
        <Card style={{ background: 'rgba(30, 27, 75, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle style={{ color: '#ffffff' }}>Stock Levels</CardTitle>
                <CardDescription style={{ color: '#94a3b8' }}>
                  Manage inventory across all products
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.3)' }}
                  />
                </div>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-48" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#e2e8f0', borderColor: 'rgba(148, 163, 184, 0.3)' }}>
                    <SelectValue placeholder="All Warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map(wh => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#6366f1' }}></div>
              </div>
            ) : (
              <div className="rounded-md border" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderBottomColor: 'rgba(148, 163, 184, 0.2)' }}>
                      <TableHead style={{ color: '#e2e8f0' }}>Product</TableHead>
                      <TableHead style={{ color: '#e2e8f0' }}>SKU</TableHead>
                      <TableHead style={{ color: '#e2e8f0' }}>Warehouse</TableHead>
                      <TableHead style={{ color: '#e2e8f0' }}>Stock</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.thumbnail && <img src={item.thumbnail} alt={item.name} className="w-10 h-10 rounded object-cover" />}
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.categoryName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">PROD-{item.productId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-gray-400" />
                            <span>Main</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.stock}</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell className="font-medium">{item.stock}</TableCell>
                        <TableCell>
                          {item.stock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : item.isLowStock ? (
                            <Badge variant="warning">Low Stock</Badge>
                          ) : (
                            <Badge variant="default">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAdjustmentModal(item)}
                            data-testid={`adjust-stock-${item.productId}`}
                          >
                            {item.stock === 0 ? (
                              <>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Stock
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Adjust
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Adjustment Modal */}
      <Dialog open={adjustmentModal} onOpenChange={setAdjustmentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedVariant && (
              <>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="font-medium">{selectedVariant.productName}</p>
                  <p className="text-sm text-gray-500">SKU: {selectedVariant.sku}</p>
                  <p className="text-sm text-gray-500">Current Stock: {selectedVariant.stock}</p>
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
                      value={adjustmentQty}
                      onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                      min="1"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm font-medium">New Stock Level</p>
                  <p className="text-2xl font-bold">
                    {adjustmentType === 'add' 
                      ? selectedVariant.stock + adjustmentQty 
                      : Math.max(0, selectedVariant.stock - adjustmentQty)}
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
    </div>
  );
};

export default AdminInventoryPage;
