import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Package, User as UserIcon, LogOut, Heart, MapPin, Phone, Mail, Edit2, Save, X, Eye, Truck, CheckCircle, Clock, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { wishlistAPI } from '../services/api';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-emerald-100 text-emerald-700',
};

const AccountPage = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', address: { street: '', city: '', state: '', pincode: '' } });
  const [saving, setSaving] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const userId = user?.id || user?.userId || 'customer_001';

  useEffect(() => {
    if (authLoading) return;
    if (!user && !localStorage.getItem('token')) { navigate('/'); return; }
    if (user) {
      fetchOrders();
      fetchWishlist();
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/orders?userId=${userId}`);
      const data = await res.json();
      setOrders(data.data?.orders || []);
    } catch (err) { console.error('Fetch orders:', err); }
    setLoading(false);
  };

  const fetchWishlist = async () => {
    try {
      const res = await wishlistAPI.get({ userId });
      setWishlist(res.data || []);
    } catch (err) { console.error('Fetch wishlist:', err); }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/profile?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setEditData({
          name: data.data.name || '',
          phone: data.data.phone || '',
          address: data.data.address || { street: '', city: '', state: '', pincode: '' }
        });
      }
    } catch (err) { console.error('Fetch profile:', err); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...editData }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setEditing(false);
        toast.success('Profile updated successfully');
      }
    } catch (err) { toast.error('Failed to update profile'); }
    setSaving(false);
  };

  const removeFromWishlist = async (productId) => {
    try {
      await wishlistAPI.remove(productId);
      setWishlist(prev => prev.filter(w => w.productId !== productId));
      toast.success('Removed from wishlist');
    } catch (err) { toast.error('Failed to remove'); }
  };

  const cancelOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order cancelled');
        fetchOrders();
      }
    } catch (err) { toast.error('Failed to cancel order'); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-6 md:px-12 lg:px-24 py-12 text-center">
        <p className="text-muted-foreground mb-4">Please log in to view your account</p>
        <Button onClick={() => navigate('/')}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div data-testid="account-page" className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight">My Account</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
          <Button data-testid="logout-button" variant="outline" onClick={() => { logout(); navigate('/'); }} className="text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger data-testid="orders-tab" value="orders" className="rounded-lg"><Package className="h-4 w-4 mr-2" /> Orders</TabsTrigger>
            <TabsTrigger data-testid="wishlist-tab" value="wishlist" className="rounded-lg"><Heart className="h-4 w-4 mr-2" /> Wishlist ({wishlist.length})</TabsTrigger>
            <TabsTrigger data-testid="profile-tab" value="profile" className="rounded-lg"><UserIcon className="h-4 w-4 mr-2" /> Profile</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-xl" />)}</div>
            ) : orders.length === 0 ? (
              <div data-testid="no-orders" className="text-center py-16 bg-card rounded-2xl border border-border">
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No orders yet</p>
                <p className="text-sm text-muted-foreground mb-6">Start shopping to see your orders here</p>
                <Button data-testid="start-shopping-button" onClick={() => navigate('/products')}>Start Shopping</Button>
              </div>
            ) : (
              <div className="space-y-4" data-testid="orders-list">
                {orders.map(order => (
                  <div key={order.orderId} data-testid={`order-${order.orderId}`} className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-md">
                    <div className="p-5 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.orderId ? null : order.orderId)}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-medium">{order.orderId}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                            <span className="mx-2">|</span>
                            {order.items?.length || 0} items
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                          </span>
                          <span className="text-lg font-semibold">Rs.{(order.total || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {expandedOrder === order.orderId && (
                      <div className="border-t border-border p-5 bg-muted/10">
                        <div className="space-y-3 mb-4">
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              {item.thumbnail && <img src={item.thumbnail} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity} {item.size ? `| Size: ${item.size}` : ''}</p>
                              </div>
                              <p className="text-sm font-medium">Rs.{((item.salePrice || item.price) * item.quantity).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                        
                        {/* Order Tracking Timeline */}
                        {order.statusHistory?.length > 0 && (
                          <div data-testid={`order-tracking-${order.orderId}`} className="mb-4 p-4 bg-muted/20 rounded-lg">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Order Tracking</h4>
                            <div className="space-y-3">
                              {order.statusHistory.map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium capitalize">{step.status}</p>
                                    <p className="text-xs text-muted-foreground">{step.note || ''}</p>
                                    {step.timestamp && <p className="text-xs text-muted-foreground/60">{new Date(step.timestamp).toLocaleString('en-IN')}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {order.trackingNumber && (
                          <p className="text-sm text-muted-foreground mb-3">Tracking: <span className="font-mono font-medium">{order.trackingNumber}</span></p>
                        )}
                        
                        {/* Shipping Address */}
                        {order.shippingAddress && (
                          <div className="mb-4 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground text-sm mb-1">Shipping Address</p>
                            <p>{order.shippingAddress.name}, {order.shippingAddress.address}</p>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {['pending', 'confirmed'].includes(order.status) && (
                            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); cancelOrder(order.orderId); }} data-testid={`cancel-order-${order.orderId}`}>
                              Cancel Order
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="mt-6">
            {wishlist.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">Your wishlist is empty</p>
                <p className="text-sm text-muted-foreground mb-6">Save items you love to purchase later</p>
                <Button onClick={() => navigate('/products')}>Browse Products</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="wishlist-grid">
                {wishlist.map(item => (
                  <div key={item.productId} data-testid={`wishlist-item-${item.productId}`} className="bg-card border border-border rounded-xl overflow-hidden group">
                    <Link to={`/products/${item.productId}`}>
                      <div className="aspect-[3/4] overflow-hidden">
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </Link>
                    <div className="p-4">
                      <h3 className="text-sm font-medium line-clamp-1">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold">Rs.{(item.salePrice || item.price).toLocaleString()}</span>
                        {item.price > item.salePrice && <span className="text-xs text-muted-foreground line-through">Rs.{item.price.toLocaleString()}</span>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1" onClick={() => navigate(`/products/${item.productId}`)}>View</Button>
                        <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeFromWishlist(item.productId)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-heading font-semibold">Personal Information</h2>
                  {!editing ? (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="edit-profile-btn">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveProfile} disabled={saving} data-testid="save-profile-btn">
                        <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  )}
                </div>

                {!editing ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <UserIcon className="w-5 h-5 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{profile?.name || user.name}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{profile?.email || user.email}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{profile?.phone || 'Not set'}</p></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Name</label>
                      <input data-testid="edit-name-input" type="text" value={editData.name} onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Phone</label>
                      <input data-testid="edit-phone-input" type="tel" value={editData.phone} onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Address Section */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-heading font-semibold mb-5 flex items-center gap-2"><MapPin className="w-5 h-5" /> Shipping Address</h2>
                {!editing ? (
                  <div>
                    {profile?.address?.street ? (
                      <div className="text-sm space-y-1">
                        <p>{profile.address.street}</p>
                        <p>{[profile.address.city, profile.address.state, profile.address.pincode].filter(Boolean).join(', ')}</p>
                        <p>{profile.address.country || 'India'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address saved. Click Edit to add one.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Street Address</label>
                      <input data-testid="edit-street-input" type="text" value={editData.address?.street || ''} onChange={(e) => setEditData(p => ({ ...p, address: { ...p.address, street: e.target.value } }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Street address" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">City</label>
                        <input data-testid="edit-city-input" type="text" value={editData.address?.city || ''} onChange={(e) => setEditData(p => ({ ...p, address: { ...p.address, city: e.target.value } }))}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="City" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">State</label>
                        <input data-testid="edit-state-input" type="text" value={editData.address?.state || ''} onChange={(e) => setEditData(p => ({ ...p, address: { ...p.address, state: e.target.value } }))}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="State" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Pincode</label>
                      <input data-testid="edit-pincode-input" type="text" value={editData.address?.pincode || ''} onChange={(e) => setEditData(p => ({ ...p, address: { ...p.address, pincode: e.target.value } }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none" placeholder="Pincode" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccountPage;
