import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Search, Filter, ChevronDown, Eye, Truck, CheckCircle, XCircle, 
  Clock, ArrowUpDown, RefreshCw, TrendingUp, AlertTriangle, Users, ExternalLink, Download, ArrowRight, Save
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { ordersAPI } from '../services/api';
import adminOrderService from '../services/adminOrderService';
import XpressbeesShipmentModal from '../components/XpressbeesShipmentModal';


const API_BASE = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20', icon: RefreshCw },
  shipped: { label: 'Shipped', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', icon: RefreshCw },
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

  const [adminNotes, setAdminNotes] = useState('');
  const [adminStatus, setAdminStatus] = useState('');

  const [tempStatus, setTempStatus] = useState('');
  const [limit, setLimit] = useState(20);

  const fetchOrders = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: targetLimit };
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      
      const response = await ordersAPI.getAll(params);
      
      if (response) {
        setOrders(response.orders || []);
        setStats(response.stats || {});
        
        const paginationData = response.pagination || {};
        setPagination({
          page: paginationData.page || targetPage,
          limit: paginationData.limit || targetLimit,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 1
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
      setPage(1);
      fetchOrders(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPage(newPage);
    fetchOrders(newPage);
  };

  const updateOrderStatus = async (orderRecordId, newStatus, note = '') => {
    setUpdatingStatus(true);
    try {
      const res = await ordersAPI.updateStatus(orderRecordId, { status: newStatus, reason: note });
      if (res && (res.status === 200 || res.status === 204 || res.data)) {
        toast.success(`Order updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder?._id === orderRecordId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) { 
      console.error('Update status error:', err);
      toast.error('Failed to update status'); 
    }
    setUpdatingStatus(false);
  };

  const fetchShipmentDetails = async (orderRecordId) => {
    setFetchingShipment(true);
    try {
      const res = await ordersAPI.getShipments(orderRecordId);
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
          fetchShipmentDetails(selectedOrder._id);
          fetchOrders();
        }
      }
    } catch (err) {
      console.error('Sync shipment error:', err);
      toast.error('Failed to sync shipment');
    }
  };



  return (    <div data-testid="admin-orders-page" className="admin-dashboard-shell min-h-screen pt-24 pb-12 font-body">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 overflow-hidden rounded-2xl border border-border bg-white/85 backdrop-blur-sm shadow-luxury-sm space-y-4 md:space-y-0 p-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-heading font-bold text-foreground">Order <span className="text-royal-maroon">Management</span></h1>
            <p className="text-muted-foreground">Monitor and manage all customer orders</p>
          </div>
          <Button 
            onClick={() => fetchOrders(page, limit)} 
            variant="outline" 
            size="sm" 
            className="border-border bg-slate-50 text-foreground hover:bg-slate-100 transition-colors"
            data-testid="refresh-orders-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

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
            title="Pending Actions" 
            value={stats.pending || 0} 
            icon={Clock} 
            color="gold" 
            loading={loading && !stats.total} 
            subtext="Awaiting verification"
            indicator={stats.pending > 0 ? 'warning' : null}
          />
          <StatCard 
            title="In Transit" 
            value={stats.shipped || 0} 
            icon={Truck} 
            color="emerald" 
            loading={loading && !stats.total} 
            subtext="Active logicstics"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              data-testid="order-search-input"
              type="text"
              placeholder="Search by order ID, customer name, or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-royal-maroon/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
              <Button
                key={s}
                variant={filter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilter(s); setPage(1); }}
                className={filter === s 
                  ? "bg-royal-maroon text-white border-none shadow-md" 
                  : "border-border bg-slate-50 text-slate-500 hover:text-foreground hover:bg-slate-100 transition-all font-bold uppercase tracking-widest text-[10px]"}
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
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-border shadow-luxury-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No orders found in archive</p>
            <p className="text-[10px] text-slate-400 mt-1">Adjust your filters or synchronization settings</p>
          </div>
      ) : (
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-luxury-sm">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="orders-table">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Order ID</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Customer</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Items</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment</th>
                    <th className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Date</th>
                    <th className="text-right px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map(order => {
                    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <tr key={order.orderId} className="hover:bg-slate-50 transition-colors" data-testid={`order-row-${order.orderId}`}>
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs font-bold text-royal-maroon">{order.orderId?.slice(-8)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-foreground leading-none">{order.userName || order.shippingAddress?.name || 'Guest'}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{order.userEmail || ''}</p>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-600 font-bold uppercase tracking-widest">{order.items?.length || 0} items</td>
                        <td className="px-5 py-4 text-sm font-bold text-foreground">₹{(order.total || 0).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={`gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-1 rounded-full border-none ${order.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            {order.paymentStatus || 'pending'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-500">
                          {order.created_at || order.createdAt ? new Date(order.created_at || order.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={() => { 
                              setSelectedOrder(order); 
                              setAdminStatus(order.status);
                              setAdminNotes(order.internalNotes || '');
                              setShowDetail(true); 
                              fetchShipmentDetails(order._id);
                            }} className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-royal-maroon transition-all" data-testid={`view-order-${order.orderId}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'pending' && (
                              <Button size="sm" onClick={() => updateOrderStatus(order._id, 'confirmed', 'Confirmed by admin')} className="bg-royal-maroon hover:bg-royal-maroon/90 text-white font-bold uppercase tracking-widest text-[9px] h-7" disabled={updatingStatus}>
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

        {/* Pagination Controls */}
        {!loading && orders.length > 0 && pagination.totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between mt-8 gap-4 px-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 whitespace-nowrap">
              Showing <span className="text-royal-maroon font-bold">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="text-royal-maroon font-bold">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="text-royal-maroon font-bold">{pagination.total}</span> orders
            </div>
            
            {/* Items Per Page Selector */}
            <div className="flex items-center gap-3 border-l-0 md:border-l border-white/10 md:pl-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">View</span>
                <select 
                  value={limit} 
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setLimit(newLimit);
                    setPage(1);
                    fetchOrders(1, newLimit);
                  }}
                  className="h-8 w-[70px] bg-slate-50 border border-border rounded-md text-xs font-bold px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-royal-maroon/20"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="text-slate-500 hover:bg-slate-100 hover:text-royal-maroon font-bold uppercase tracking-widest text-[10px]"
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
                        : 'text-slate-400 hover:text-royal-maroon hover:bg-slate-100'
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
                className="text-slate-500 hover:bg-slate-100 hover:text-royal-maroon font-bold uppercase tracking-widest text-[10px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Standardized Order Archive Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 bg-white border-none shadow-luxury rounded-2xl overflow-hidden">
          {selectedOrder && (
            <>
              <DialogHeader className="p-6 bg-slate-50 border-b border-border sticky top-0 z-10 rounded-t-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      Order Archive: <span className="text-royal-maroon font-black">#{selectedOrder.orderId}</span>
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Archive Created: {new Date(selectedOrder.created_at || selectedOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                  </div>
                  <Badge className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${STATUS_CONFIG[selectedOrder.status]?.color || ''}`}>
                    {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* 1. Patron & Consignment Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-border bg-slate-50 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3 flex-row items-center gap-3 space-y-0">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Users className="w-4 h-4 text-royal-maroon" />
                      </div>
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Patron Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-bold text-foreground">{selectedOrder.userId?.name || selectedOrder.shippingAddress?.name || 'Anonymous Patron'}</p>
                        <p className="text-xs text-slate-500 font-medium">{selectedOrder.userId?.email || 'No electronic contact'}</p>
                        <p className="text-xs text-slate-500 font-medium">{selectedOrder.userId?.phone || 'No telephonic record'}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-slate-50 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3 flex-row items-center gap-3 space-y-0">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Package className="w-4 h-4 text-royal-maroon" />
                      </div>
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Consignment Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <address className="not-italic text-xs font-medium text-slate-600 leading-relaxed">
                        {selectedOrder.shippingAddress?.street},<br />
                        {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}<br />
                        <span className="font-bold text-royal-maroon underline decoration-1">{selectedOrder.shippingAddress?.zipCode}</span>
                      </address>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-slate-50 shadow-sm rounded-2xl">
                    <CardHeader className="pb-3 flex-row items-center gap-3 space-y-0">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Truck className="w-4 h-4 text-royal-maroon" />
                      </div>
                      <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Consignment Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {shipmentDetails ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Logistic ID</p>
                              <code className="text-[11px] font-mono font-bold text-royal-maroon">{shipmentDetails.awb_number}</code>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-[9px] font-bold uppercase tracking-widest gap-2 bg-white" onClick={() => window.open(`https://www.xpressbees.com/track/${shipmentDetails.awb_number}`, '_blank')}>
                              Track <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Fulfillment Partner</p>
                            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Xpressbees Logistics</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2 gap-2">
                           <Truck className="w-8 h-8 text-slate-200" />
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending Fulfillment</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Acquisition Manifest */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal-maroon">Acquisition Manifest</h3>
                  <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Product Entry</th>
                          <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Valuation</th>
                          <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Aggregate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedOrder.items?.map((item, idx) => (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-xl overflow-hidden border border-border/50 shadow-sm bg-slate-50">
                                  {item.image ? (
                                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                                      <Package className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-foreground leading-tight">{item.name}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[8px] font-bold border-border bg-white text-slate-500 rounded-md py-0 px-1.5 h-4">
                                      QTY: {item.quantity}
                                    </Badge>
                                    {item.selectedSize && (
                                      <Badge variant="outline" className="text-[8px] font-bold border-border bg-white text-slate-500 rounded-md py-0 px-1.5 h-4">
                                        SZ: {item.selectedSize}
                                      </Badge>
                                    )}
                                    {item.selectedColor && (
                                      <Badge variant="outline" className="text-[8px] font-bold border-border bg-white text-slate-500 rounded-md py-0 px-1.5 h-4">
                                        {item.selectedColor}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-[11px] font-bold text-slate-600">₹{(item.price || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-xs font-black text-foreground text-right italic">₹{(item.price * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Administrative Console */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4 text-royal-maroon" />
                     <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-royal-maroon">Administrative Oversight</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-border">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Status Override</Label>
                      <Select value={adminStatus} onValueChange={setAdminStatus}>
                        <SelectTrigger className="bg-white border-border text-foreground font-medium rounded-xl h-11">
                          <SelectValue placeholder="Override status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border">
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key} className="font-medium text-xs">
                              {cfg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-slate-400 italic">Caution: Manual status overrides bypass standard fulfillment logic.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Internal Ledger (Notes)</Label>
                      <Textarea 
                        placeholder="Establish administrative context for this archive..." 
                        className="bg-white border-border text-foreground text-xs min-h-[100px] rounded-xl resize-none focus:ring-royal-maroon/20"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 bg-slate-50 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 rounded-b-2xl">
                <div className="flex items-center gap-3">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-[10px] h-10 gap-2 shadow-md px-6 rounded-xl"
                    onClick={async () => {
                      setUpdatingStatus(true);
                      try {
                        const res = await ordersAPI.updateStatus(selectedOrder._id, { 
                          status: adminStatus, 
                          internalNotes: adminNotes 
                        });
                        if (res) {
                          toast.success('Archive successfully synchronized');
                          fetchOrders();
                          setSelectedOrder(prev => ({ ...prev, status: adminStatus, internalNotes: adminNotes }));
                        }
                      } catch (err) {
                        toast.error('Failed to commit administrative changes');
                      } finally {
                        setUpdatingStatus(false);
                      }
                    }}
                    disabled={updatingStatus}
                  >
                    <Save className="w-4 h-4" /> 
                    {updatingStatus ? 'Synchronizing...' : 'Commit Changes'}
                  </Button>
                  <Button variant="outline" className="font-bold uppercase tracking-widest text-[10px] h-10 border-border rounded-xl" onClick={() => window.print()}>
                    <Download className="w-4 h-4" /> Invoice
                  </Button>
                </div>
                
                <Button variant="ghost" onClick={() => setShowDetail(false)} className="font-bold uppercase tracking-widest text-[10px] h-10 text-slate-400 hover:text-foreground">
                  Dismiss Overlay
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Xpressbees Shipment Modal */}
      <AnimatePresence>
        {showShipmentModal && selectedOrder && (
          <XpressbeesShipmentModal
            order={selectedOrder}
            onClose={() => setShowShipmentModal(false)}
            onSuccess={(data) => {
              fetchShipmentDetails(selectedOrder._id);
              fetchOrders();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Premium Ivory Stat Card Component
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
    maroon: { bg: 'bg-royal-maroon/10', text: 'text-royal-maroon', iconColor: 'text-royal-maroon', glow: 'shadow-maroon-sm' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', iconColor: 'text-emerald-500', glow: 'shadow-emerald-sm' },
    gold: { bg: 'bg-amber-500/10', text: 'text-amber-600', iconColor: 'text-amber-500', glow: 'shadow-gold-sm' },
    charcoal: { bg: 'bg-slate-100', text: 'text-slate-900', iconColor: 'text-slate-500', glow: 'shadow-sm' }
  };

  const scheme = schemeOptions[color] || schemeOptions.charcoal;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-luxury-sm transition-all hover:shadow-luxury hover:-translate-y-1`}>
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${scheme.bg} opacity-20 transition-transform group-hover:scale-150`} />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${scheme.bg} shadow-sm transition-transform group-hover:rotate-6`}>
            <Icon className={`h-6 w-6 ${scheme.iconColor}`} />
          </div>
          <div className="flex flex-col items-end gap-1">
            {indicator && (
                <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-600 border-none px-2">
                    {indicator}
                </Badge>
            )}
            {trend && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20">
                {trend}
                </span>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-100 animate-pulse rounded mt-1" />
          ) : (
            <h3 className={`mt-1 text-2xl font-black tracking-tight ${scheme.text} font-heading`}>
              {formatValue()}
            </h3>
          )}
          {subtext && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{subtext}</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
