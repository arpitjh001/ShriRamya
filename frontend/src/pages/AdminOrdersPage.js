import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Search, Filter, ChevronDown, Eye, Truck, CheckCircle, XCircle, Clock, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-indigo-100 text-indigo-800', icon: RefreshCw },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
};

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total_pages: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);
      const res = await fetch(`${API_BASE}/api/v1/admin/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders || []);
        setPagination(data.data.pagination || {});
        setStats(data.data.stats || {});
      }
    } catch (err) { console.error('Fetch orders error:', err); }
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateOrderStatus = async (orderId, newStatus, note = '') => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Order ${orderId} updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) { toast.error('Failed to update status'); }
    setUpdatingStatus(false);
  };

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-heading font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div data-testid="admin-orders-page" className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-semibold">Order Management</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage all customer orders</p>
          </div>
          <Button onClick={fetchOrders} variant="outline" size="sm" data-testid="refresh-orders-btn">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total" value={stats.total || 0} icon={Package} color="bg-primary/10 text-primary" />
          <StatCard label="Pending" value={stats.pending || 0} icon={Clock} color="bg-amber-50 text-amber-600" />
          <StatCard label="Confirmed" value={stats.confirmed || 0} icon={CheckCircle} color="bg-blue-50 text-blue-600" />
          <StatCard label="Shipped" value={stats.shipped || 0} icon={Truck} color="bg-purple-50 text-purple-600" />
          <StatCard label="Delivered" value={stats.delivered || 0} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Cancelled" value={stats.cancelled || 0} icon={XCircle} color="bg-red-50 text-red-600" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              data-testid="order-search-input"
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
              <Button
                key={s}
                variant={filter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilter(s); setPage(1); }}
                data-testid={`filter-${s}-btn`}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="orders-table">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map(order => {
                    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <tr key={order.orderId} className="hover:bg-muted/20 transition-colors" data-testid={`order-row-${order.orderId}`}>
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm font-medium">{order.orderId?.slice(0, 18)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium">{order.userName || order.shippingAddress?.name || 'Guest'}</p>
                          <p className="text-xs text-muted-foreground">{order.userEmail || ''}</p>
                        </td>
                        <td className="px-5 py-4 text-sm">{order.items?.length || 0} items</td>
                        <td className="px-5 py-4 text-sm font-semibold">Rs.{(order.total || 0).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {order.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedOrder(order); setShowDetail(true); }} data-testid={`view-order-${order.orderId}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.orderId, 'confirmed', 'Confirmed by admin')} disabled={updatingStatus}>
                                Confirm
                              </Button>
                            )}
                            {order.status === 'confirmed' && (
                              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.orderId, 'shipped', 'Shipped by admin')} disabled={updatingStatus}>
                                Ship
                              </Button>
                            )}
                            {order.status === 'shipped' && (
                              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.orderId, 'delivered', 'Delivered')} disabled={updatingStatus}>
                                Deliver
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="flex items-center px-3 text-sm">Page {page} of {pagination.total_pages}</span>
            <Button variant="outline" size="sm" disabled={page === pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            data-testid="order-detail-modal"
          >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-semibold">Order Details</h2>
                  <p className="text-sm text-muted-foreground font-mono mt-1">{selectedOrder.orderId}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetail(false)}>Close</Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + Payment */}
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).color}`}>
                    {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment</p>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2">Customer</h3>
                <p className="text-sm">{selectedOrder.userName || selectedOrder.shippingAddress?.name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.userEmail || ''}</p>
                {selectedOrder.shippingAddress && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {[selectedOrder.shippingAddress.street, selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state, selectedOrder.shippingAddress.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Items ({selectedOrder.items?.length || 0})</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
                      {item.thumbnail && <img src={item.thumbnail} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} | Size: {item.size || '-'}</p>
                      </div>
                      <p className="text-sm font-semibold">Rs.{((item.salePrice || item.price) * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs.{(selectedOrder.subtotal || 0).toLocaleString()}</span></div>
                {selectedOrder.discount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-Rs.{selectedOrder.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-sm"><span>Shipping</span><span>{selectedOrder.shipping ? `Rs.${selectedOrder.shipping}` : 'Free'}</span></div>
                <div className="flex justify-between font-semibold text-lg border-t border-border pt-2"><span>Total</span><span>Rs.{(selectedOrder.total || 0).toLocaleString()}</span></div>
              </div>

              {/* Status History */}
              {selectedOrder.statusHistory?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Status History</h3>
                  <div className="space-y-2">
                    {selectedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-medium capitalize">{h.status}</span>
                        <span className="text-muted-foreground">{h.note}</span>
                        <span className="text-muted-foreground ml-auto text-xs">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                {selectedOrder.status === 'pending' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.orderId, 'confirmed'); setShowDetail(false); }} disabled={updatingStatus}>
                    Confirm Order
                  </Button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.orderId, 'shipped'); setShowDetail(false); }} disabled={updatingStatus}>
                    Mark as Shipped
                  </Button>
                )}
                {selectedOrder.status === 'shipped' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.orderId, 'delivered'); setShowDetail(false); }} disabled={updatingStatus}>
                    Mark as Delivered
                  </Button>
                )}
                {['pending', 'confirmed'].includes(selectedOrder.status) && (
                  <Button variant="destructive" onClick={() => { updateOrderStatus(selectedOrder.orderId, 'cancelled', 'Cancelled by admin'); setShowDetail(false); }} disabled={updatingStatus}>
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
