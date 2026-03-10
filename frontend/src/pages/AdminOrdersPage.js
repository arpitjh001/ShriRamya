import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ShoppingCart, Package, DollarSign, Clock, Eye } from 'lucide-react';
import { ordersAPI } from '../services/api';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ordersAPI.getAll();
      const list = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
      setOrders(list);
    } catch (e) {
      setError(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleView = (order) => {
    toast.info(`Order ${order.order_number || order.id}`);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'secondary',
      confirmed: 'default',
      processing: 'default',
      shipped: 'default',
      delivered: 'default',
      cancelled: 'destructive',
      refunded: 'secondary'
    };
    return { variant: variants[status] || 'secondary', label: status };
  };

  const getPaymentBadge = (status) => {
    const variants = {
      pending: 'secondary',
      paid: 'default',
      failed: 'destructive',
      refunded: 'secondary'
    };
    return { variant: variants[status] || 'secondary', label: status };
  };

  const stats = useMemo(() => {
    const getStatus = (o) => (o.order_status || o.status || '').toString().toLowerCase();
    const getTotal = (o) => Number(o.total_amount ?? o.total ?? 0) || 0;
    return {
      total: orders.length,
      pending: orders.filter(o => getStatus(o) === 'pending').length,
      processing: orders.filter(o => getStatus(o) === 'processing').length,
      delivered: orders.filter(o => getStatus(o) === 'delivered').length,
      revenue: orders
        .filter(o => !['cancelled', 'refunded'].includes(getStatus(o)))
        .reduce((sum, o) => sum + getTotal(o), 0),
    };
  }, [orders]);

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">₹{stats.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                Manage and track customer orders
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadOrders} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <div className="font-medium text-destructive">Failed to load orders</div>
              <div className="text-muted-foreground">{error}</div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Loading orders…
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const statusValue = (order.order_status || order.status || 'pending').toString().toLowerCase();
                    const paymentValue = (order.payment_status || order.paymentStatus || 'pending').toString().toLowerCase();
                    const status = getStatusBadge(statusValue);
                    const payment = getPaymentBadge(paymentValue);
                    const total = Number(order.total_amount ?? order.total ?? 0) || 0;

                    return (
                      <TableRow key={order.id || order.order_number}>
                        <TableCell className="font-mono">{order.order_number || order.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer_name || order.customer?.name || '—'}</div>
                            <div className="text-sm text-gray-500">{order.customer_email || order.customer?.email || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">₹{total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={payment.variant}>{payment.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleView(order)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrdersPage;
