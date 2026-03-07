import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ShoppingCart, Package, DollarSign, Clock, Eye } from 'lucide-react';

// Demo orders data (since API endpoint doesn't exist yet)
const demoOrders = [
  { id: 1, order_number: 'ORD-2024-001', customer_name: 'John Doe', customer_email: 'john@example.com', total_amount: 5999, payment_status: 'paid', status: 'delivered', created_at: '2024-03-01T10:30:00Z' },
  { id: 2, order_number: 'ORD-2024-002', customer_name: 'Jane Smith', customer_email: 'jane@example.com', total_amount: 3499, payment_status: 'paid', status: 'processing', created_at: '2024-03-02T14:20:00Z' },
  { id: 3, order_number: 'ORD-2024-003', customer_name: 'Mike Johnson', customer_email: 'mike@example.com', total_amount: 8999, payment_status: 'pending', status: 'pending', created_at: '2024-03-03T09:15:00Z' },
  { id: 4, order_number: 'ORD-2024-004', customer_name: 'Sarah Williams', customer_email: 'sarah@example.com', total_amount: 2799, payment_status: 'paid', status: 'shipped', created_at: '2024-03-04T16:45:00Z' },
  { id: 5, order_number: 'ORD-2024-005', customer_name: 'David Brown', customer_email: 'david@example.com', total_amount: 12999, payment_status: 'paid', status: 'delivered', created_at: '2024-03-05T11:00:00Z' },
];

const AdminOrdersPage = () => {
  const handleView = (order) => {
    toast.info(`View order ${order.order_number} (demo)`);
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

  const stats = {
    total: demoOrders.length,
    pending: demoOrders.filter(o => o.status === 'pending').length,
    processing: demoOrders.filter(o => o.status === 'processing').length,
    delivered: demoOrders.filter(o => o.status === 'delivered').length,
    revenue: demoOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
  };

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
          </div>
        </CardHeader>
        <CardContent>
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
                {demoOrders.map((order) => {
                  const status = getStatusBadge(order.status);
                  const payment = getPaymentBadge(order.payment_status);
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-sm text-gray-500">{order.customer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">₹{order.total_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={payment.variant}>{payment.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleView(order)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This is a demo view with sample orders. Connect to the backend API to see real orders.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrdersPage;
