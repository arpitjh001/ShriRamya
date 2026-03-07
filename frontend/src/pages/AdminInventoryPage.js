import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { productsAPI, warehouseAPI } from '../services/api';
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

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    loadInventory();
    loadWarehouses();
    loadStockAlerts();
  }, [user]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getAll({ per_page: 100 });
      const products = response.products || response.data || [];
      
      // Flatten variants into inventory items
      const inventoryItems = [];
      products.forEach(product => {
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(variant => {
            inventoryItems.push({
              id: variant.id,
              productId: product.id,
              productName: product.name,
              sku: variant.sku,
              price: variant.price,
              stock: variant.stock,
              reservedStock: variant.reservedStock || 0,
              availableStock: variant.stock - (variant.reservedStock || 0),
              attributes: variant.attributes,
              lowStockThreshold: variant.lowStockThreshold || 5,
              isLowStock: variant.stock <= (variant.lowStockThreshold || 5)
            });
          });
        } else {
          // Product without variants
          inventoryItems.push({
            id: product.id,
            productId: product.id,
            productName: product.name,
            sku: product.sku || `PROD-${product.id}`,
            price: product.basePrice,
            stock: product.stock || 0,
            reservedStock: 0,
            availableStock: product.stock || 0,
            attributes: {},
            lowStockThreshold: 5,
            isLowStock: (product.stock || 0) <= 5
          });
        }
      });
      
      setInventory(inventoryItems);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await warehouseAPI.getAll();
      setWarehouses(response.data || []);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadStockAlerts = async () => {
    try {
      const response = await warehouseAPI.getLowStockAlerts({ threshold: 10 });
      setStockAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to load stock alerts:', error);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedVariant) return;

    try {
      const qty = adjustmentType === 'add' ? adjustmentQty : -adjustmentQty;
      
      // Update variant stock
      await productsAPI.updateVariant(
        selectedVariant.productId,
        selectedVariant.id,
        {
          ...selectedVariant,
          stock: selectedVariant.stock + qty
        }
      );

      toast.success(`Stock ${adjustmentType === 'add' ? 'added' : 'reduced'} successfully`);
      setAdjustmentModal(false);
      loadInventory();
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const openAdjustmentModal = (variant) => {
    setSelectedVariant(variant);
    setAdjustmentQty(0);
    setAdjustmentType('add');
    setAdjustmentModal(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = selectedWarehouse === 'all' || 
                            item.warehouseId === selectedWarehouse;
    return matchesSearch && matchesWarehouse;
  });

  const stats = {
    totalProducts: inventory.length,
    lowStock: inventory.filter(i => i.isLowStock).length,
    outOfStock: inventory.filter(i => i.stock === 0).length,
    totalValue: inventory.reduce((sum, i) => sum + (i.price * i.stock), 0)
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '24px' }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage stock levels and warehouse allocation
              </p>
            </div>
            <Button onClick={loadInventory} variant="outline" size="sm" className="gap-2">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                Across all warehouses
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">
                Items below threshold
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.outOfStock}</div>
              <p className="text-xs text-muted-foreground">
                Need immediate attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                ₹{stats.totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on current stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Alerts */}
        {stockAlerts.length > 0 && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                {stockAlerts.length} items need immediate restocking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stockAlerts.slice(0, 6).map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Stock Levels</CardTitle>
                <CardDescription>
                  Manage inventory across all products
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
                  />
                </div>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-48">
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            {item.attributes?.color && (
                              <div className="text-xs text-gray-500">
                                {item.attributes.color} {item.attributes.size && `/ ${item.attributes.size}`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-gray-400" />
                            <span>Main</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.stock}</TableCell>
                        <TableCell>{item.reservedStock}</TableCell>
                        <TableCell className="font-medium">{item.availableStock}</TableCell>
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
