import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Search, Filter, ChevronDown, Eye, Truck, CheckCircle, XCircle, Clock, ArrowUpDown, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ordersAPI } from '../services/api';
import adminOrderService from '../services/adminOrderService';
import XpressbeesShipmentModal from '../components/XpressbeesShipmentModal';
import { ExternalLink, Download, ArrowRight } from 'lucide-react';

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
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [fetchingShipment, setFetchingShipment] = useState(false);

  const [limit, setLimit] = useState(20);

  const fetchOrders = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: targetLimit };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      
      const data = await ordersAPI.getAll(params);
      
      if (data) {
        setOrders(data.orders || []);
        setStats(data.stats || {});
        
        const paginationData = data.meta?.pagination || data.pagination || {};
        setPagination({
          page: paginationData.page || targetPage,
          limit: paginationData.limit || targetLimit,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || paginationData.total_pages || 1
        });
      }
    } catch (err) { 
      console.error('Fetch orders error:', err);
      toast.error('Failed to load orders');
    }
    setLoading(false);
  }, [filter, search, page, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
    fetchOrders(newPage);
  };

  const updateOrderStatus = async (orderId, newStatus, note = '') => {
    setUpdatingStatus(true);
    try {
      const res = await ordersAPI.updateStatus(orderId, { status: newStatus, note });
      if (res && (res.status === 200 || res.status === 204 || res.data)) {
        toast.success(`Order updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) { 
      console.error('Update status error:', err);
      toast.error('Failed to update status'); 
    }
    setUpdatingStatus(false);
  };

  const fetchShipmentDetails = async (orderId) => {
    setFetchingShipment(true);
    try {
      const res = await ordersAPI.getShipments(orderId);
      if (res.data && res.data.length > 0) {
        setShipmentDetails(res.data[0]); // Take the first active shipment
      } else {
        setShipmentDetails(null);
      }
    } catch (err) {
      console.error('Fetch shipment details error:', err);
    }
    setFetchingShipment(false);
  };

  const handleSyncShipment = async (shipmentId) => {
    try {
      const res = await adminOrderService.syncShipment(shipmentId);
      if (res.data) {
        toast.success('Shipment synced successfully');
        if (selectedOrder) {
          fetchShipmentDetails(selectedOrder.orderId);
          fetchOrders();
        }
      }
    } catch (err) {
      console.error('Sync shipment error:', err);
      toast.error('Failed to sync shipment');
    }
  };



  return (
    <div data-testid="admin-orders-page" className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-semibold text-charcoal">Order Management</h1>
            <p className="text-charcoal/60 mt-1">Monitor and manage all customer orders</p>
          </div>
          <Button 
            onClick={() => fetchOrders(page)} 
            variant="outline" 
            size="sm" 
            className="border-royal-maroon/20 text-royal-maroon hover:bg-royal-maroon/5"
            data-testid="refresh-orders-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Revenue" 
            value={stats.totalRevenue || 0} 
            format="currency"
            icon={TrendingUp} 
            color="emerald" 
            loading={loading && !stats.total} 
            subtext="Gross sales revenue"
          />
          <StatCard 
            title="Total Orders" 
            value={stats.total || 0} 
            icon={Package} 
            color="maroon" 
            loading={loading && !stats.total} 
            subtext="All time orders"
          />
          <StatCard 
            title="Pending" 
            value={stats.pending || 0} 
            icon={Clock} 
            color="gold" 
            loading={loading && !stats.total} 
            subtext="Awaiting action"
          />
          <StatCard 
            title="Shipped" 
            value={stats.shipped || 0} 
            icon={Truck} 
            color="emerald" 
            loading={loading && !stats.total} 
            subtext="In transit"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
            <input
              data-testid="order-search-input"
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-royal-maroon/10 rounded-lg text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-royal-maroon/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
              <Button
                key={s}
                variant={filter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilter(s); setPage(1); }}
                className={filter === s 
                  ? "bg-royal-maroon text-white" 
                  : "border-royal-maroon/10 text-charcoal hover:bg-royal-maroon/5"}
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
          <div className="bg-white border border-royal-maroon/10 rounded-xl overflow-hidden shadow-luxury">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="orders-table">
                <thead className="bg-royal-maroon/[0.04] border-b border-royal-maroon/10">
                  <tr>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Order ID</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Customer</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Items</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Total</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Status</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Payment</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Date</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-charcoal/70">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royal-maroon/5">
                  {orders.map(order => {
                    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <tr key={order.orderId} className="hover:bg-royal-maroon/[0.02] transition-colors" data-testid={`order-row-${order.orderId}`}>
                        <td className="px-5 py-4">
                          <span className="font-mono text-sm font-medium text-charcoal/90">{order.orderId?.slice(0, 18)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-charcoal">{order.userName || order.shippingAddress?.name || 'Guest'}</p>
                          <p className="text-xs text-charcoal/50">{order.userEmail || ''}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-charcoal/70">{order.items?.length || 0} items</td>
                        <td className="px-5 py-4 text-sm font-bold text-charcoal">Rs.{(order.total || 0).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {order.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-charcoal/50">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { 
                              setSelectedOrder(order); 
                              setShowDetail(true); 
                              fetchShipmentDetails(order.orderId);
                            }} className="text-royal-maroon hover:bg-royal-maroon/10" data-testid={`view-order-${order.orderId}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => updateOrderStatus(order.orderId, 'confirmed', 'Confirmed by admin')} className="border-royal-maroon/20 text-royal-maroon hover:bg-royal-maroon/5" disabled={updatingStatus}>
                                Confirm
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
        {orders.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4 px-2">
            <div className="flex items-center gap-4 text-sm text-charcoal/50">
              <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setLimit(newLimit);
                    setPage(1);
                    fetchOrders(1, newLimit);
                  }}
                  className="bg-white border border-royal-maroon/10 rounded px-2 py-1 text-charcoal focus:outline-none focus:ring-1 focus:ring-royal-maroon"
                >
                  {[10, 20, 50, 100].map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
              <div>
                Showing <span className="font-bold text-charcoal">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                <span className="font-bold text-charcoal">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-bold text-charcoal">{pagination.total}</span> orders
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="border-royal-maroon/10 bg-white text-royal-maroon hover:bg-royal-maroon/5"
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum = 1;
                if (pagination.totalPages <= 5) pageNum = i + 1;
                else if (pagination.page <= 3) pageNum = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                else pageNum = pagination.page - 2 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className={pagination.page === pageNum 
                      ? 'bg-royal-maroon text-white hover:bg-royal-maroon/90' 
                      : 'border-royal-maroon/10 bg-white text-charcoal hover:bg-royal-maroon/5'}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="border-royal-maroon/10 bg-white text-royal-maroon hover:bg-royal-maroon/5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-royal-maroon/20 backdrop-blur-sm px-4" onClick={() => setShowDetail(false)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-royal-maroon/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid="order-detail-modal"
          >
            <div className="p-6 border-b border-royal-maroon/10 bg-royal-maroon/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-heading font-bold text-charcoal">Order Details</h2>
                  <p className="text-sm text-charcoal/50 font-mono mt-1">{selectedOrder.orderId}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetail(false)} className="text-charcoal hover:bg-royal-maroon/10">✕</Button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Status + Payment */}
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).color}`}>
                    {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold mb-1">Payment</p>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-background rounded-xl p-4 border border-royal-maroon/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">Customer Information</h3>
                <p className="text-sm font-bold text-charcoal">{selectedOrder.userName || selectedOrder.shippingAddress?.name || 'Guest'}</p>
                <p className="text-sm text-charcoal/60">{selectedOrder.userEmail || ''}</p>
                {selectedOrder.shippingAddress && (
                  <p className="text-sm text-charcoal/60 mt-2">
                    {[selectedOrder.shippingAddress.street, selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state, selectedOrder.shippingAddress.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-3">Order Items ({selectedOrder.items?.length || 0})</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 bg-background rounded-xl p-3 border border-royal-maroon/5 hover:border-royal-maroon/20 transition-all">
                      {item.thumbnail && <img src={item.thumbnail} alt={item.name} className="w-16 h-16 rounded-lg object-cover shadow-sm" />}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-charcoal">{item.name}</p>
                        <p className="text-[11px] text-charcoal/50">Qty: {item.quantity} | Size: {item.size || '-'}</p>
                      </div>
                      <p className="text-sm font-bold text-royal-maroon">Rs.{((item.salePrice || item.price) * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-royal-maroon/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-charcoal/70"><span>Subtotal</span><span>Rs.{(selectedOrder.subtotal || 0).toLocaleString()}</span></div>
                {selectedOrder.discount > 0 && <div className="flex justify-between text-sm text-emerald-600 font-bold"><span>Discount</span><span>-Rs.{selectedOrder.discount.toLocaleString()}</span></div>}
                <div className="flex justify-between text-sm text-charcoal/70"><span>Shipping</span><span>{selectedOrder.shipping ? `Rs.${selectedOrder.shipping}` : 'Free'}</span></div>
                <div className="flex justify-between font-bold text-xl border-t border-royal-maroon/20 pt-2 text-charcoal"><span>Total</span><span>Rs.{(selectedOrder.total || 0).toLocaleString()}</span></div>
              </div>

              {/* Status History */}
              {selectedOrder.statusHistory?.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold mb-3">Fulfillment History</h3>
                  <div className="space-y-3 pl-2 border-l-2 border-background">
                    {selectedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="relative flex flex-col text-sm">
                        <div className="absolute -left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-royal-maroon" />
                        <div className="flex items-center gap-2">
                          <span className="font-bold capitalize text-charcoal">{h.status}</span>
                          <span className="text-[10px] text-charcoal/40 ml-auto">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</span>
                        </div>
                        <span className="text-xs text-charcoal/60 mt-1">{h.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-4 pt-4 border-t border-royal-maroon/10">
                {['confirmed', 'shipped'].includes(selectedOrder.status) && (
                  <div data-testid="tracking-section">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 block mb-2">Tracking Information</label>
                    <div className="flex gap-2">
                      <input
                        data-testid="tracking-number-input"
                        type="text"
                        placeholder="Enter courier AWB number..."
                        defaultValue={selectedOrder.trackingNumber || ''}
                        id="tracking-input"
                        className="flex-1 px-3 py-2 border border-royal-maroon/10 rounded-lg bg-background text-sm text-charcoal placeholder:text-charcoal/30 focus:ring-2 focus:ring-royal-maroon/20 focus:outline-none"
                      />
                      <Button size="sm" variant="outline"
                        className="border-royal-maroon/20 text-royal-maroon hover:bg-royal-maroon/5"
                        data-testid="save-tracking-btn"
                        onClick={() => {
                          const tn = document.getElementById('tracking-input').value;
                          if (tn) updateOrderStatus(selectedOrder.orderId, selectedOrder.status, `Tracking: ${tn}`);
                        }}
                      >
                        <Truck className="w-4 h-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                )}

                {/* Xpressbees Shipment Display */}
                {shipmentDetails && (
                  <div className="bg-royal-maroon/[0.03] rounded-xl p-4 border border-royal-maroon/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-royal-maroon" />
                        <h4 className="text-sm font-bold text-charcoal">Xpressbees Shipment</h4>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        shipmentDetails.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-royal-maroon/10 text-royal-maroon'
                      }`}>
                        {shipmentDetails.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-charcoal/40 font-bold">AWB Number</p>
                        <p className="text-sm font-mono font-medium text-charcoal">{shipmentDetails.awb_number || 'Pending'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-charcoal/40 font-bold">Courier</p>
                        <p className="text-sm font-medium text-charcoal">{shipmentDetails.courier_name || 'Xpressbees'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {shipmentDetails.label_url && (
                        <a 
                          href={shipmentDetails.label_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-royal-maroon/20 rounded-lg text-xs font-bold text-royal-maroon hover:bg-royal-maroon/5 transition-all shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Label
                        </a>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleSyncShipment(shipmentDetails._id)}
                        className="text-royal-maroon hover:bg-royal-maroon/5 p-2 h-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap pb-4">
                {selectedOrder.status === 'pending' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.orderId, 'confirmed'); setShowDetail(false); }} className="bg-royal-maroon text-white hover:bg-royal-maroon/90" disabled={updatingStatus}>
                    Confirm Order
                  </Button>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <div className="flex flex-col w-full gap-3">
                    {!shipmentDetails && (
                      <Button 
                        onClick={() => setShowShipmentModal(true)} 
                        className="w-full bg-charcoal text-white hover:bg-charcoal/90 flex items-center justify-center gap-2 font-bold"
                      >
                        <Truck className="w-4 h-4" /> Ship via Xpressbees
                      </Button>
                    )}
                    <Button onClick={() => {
                      const tn = document.getElementById('tracking-input')?.value || '';
                      updateOrderStatus(selectedOrder.orderId, 'shipped', tn ? `Tracking: ${tn}` : 'Shipped by admin');
                      setShowDetail(false);
                    }} className="w-full bg-royal-maroon text-white hover:bg-royal-maroon/90" disabled={updatingStatus}>
                      <Truck className="w-4 h-4 mr-2" /> Mark as Shipped (Manual)
                    </Button>
                  </div>
                )}
                {selectedOrder.status === 'shipped' && (
                  <Button onClick={() => { updateOrderStatus(selectedOrder.orderId, 'delivered'); setShowDetail(false); }} className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={updatingStatus}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark as Delivered
                  </Button>
                )}
                {['pending', 'confirmed'].includes(selectedOrder.status) && (
                  <Button variant="ghost" onClick={() => { updateOrderStatus(selectedOrder.orderId, 'cancelled', 'Cancelled by admin'); setShowDetail(false); }} className="text-red-600 hover:bg-red-50 ml-auto" disabled={updatingStatus}>
                    Cancel Order
                  </Button>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Xpressbees Shipment Modal */}
      <AnimatePresence>
        {showShipmentModal && selectedOrder && (
          <XpressbeesShipmentModal
            order={selectedOrder}
            onClose={() => setShowShipmentModal(false)}
            onSuccess={(data) => {
              fetchShipmentDetails(selectedOrder.orderId);
              fetchOrders();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrdersPage;

// Premium Stat Card Component
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
    emerald: { bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-700', iconColor: 'text-emerald-600', glow: 'shadow-sm' },
    gold: { bg: 'bg-royal-gold/[0.15]', text: 'text-royal-gold', iconColor: 'text-royal-gold', glow: 'shadow-sm' },
    charcoal: { bg: 'bg-charcoal/[0.05]', text: 'text-charcoal', iconColor: 'text-charcoal/60', glow: 'shadow-sm' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`animate-scale-in ${delay} group relative overflow-hidden rounded-2xl border border-royal-maroon/5 bg-white p-6 shadow-luxury transition-all hover:scale-[1.02] hover:bg-background`}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-royal-maroon/[0.02] transition-transform group-hover:scale-150" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg}`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          {indicator && (
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
              indicator === 'red' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
            }`}>
              {indicator === 'red' ? 'Alert' : 'Warning'}
            </span>
          )}
          {trend && (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600">
              {trend}
            </span>
          )}
        </div>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-charcoal/40">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-royal-maroon/[0.05] animate-pulse rounded mt-1" />
          ) : (
            <h3 className={`mt-1 text-3xl font-bold tracking-tight ${scheme.text}`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[11px] text-charcoal/40 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};
