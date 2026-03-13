import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Package, User as UserIcon, LogOut } from 'lucide-react';
import { formatPrice } from '../utils';

const AccountPage = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ordersAPI.getMyOrders();
      // Handle different response formats
      const ordersData = response?.data?.orders || response?.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Unable to load orders. Please try again later.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) {
      return;
    }

    // Only redirect if absolutely no user and no token
    if (!user && !localStorage.getItem('token')) {
      navigate('/');
      return;
    }

    if (user) {
      fetchOrders();
    }
  }, [user, navigate, authLoading]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Show loading spinner while auth is being checked
  if (authLoading) {
    return (
      <div className="px-6 md:px-12 lg:px-24 py-12 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated (after auth loading completes)
  if (!user) {
    return (
      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to view your account</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="account-page" className="px-6 md:px-12 lg:px-24 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-heading font-medium tracking-tight mb-2">My Account</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button data-testid="logout-button" variant="destructive" onClick={handleLogout} className="shadow-lg">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger data-testid="orders-tab" value="orders">
            <Package className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger data-testid="profile-tab" value="profile">
            <UserIcon className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-8">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : error ? (
            <div data-testid="orders-error" className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground mb-4">{error}</p>
              <Button 
                data-testid="retry-button" 
                onClick={() => fetchOrders()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div data-testid="no-orders" className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground mb-4">No orders yet</p>
              <Button data-testid="start-shopping-button" onClick={() => navigate('/products')}>
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4" data-testid="orders-list">
              {orders.map((order) => (
                <div
                  key={order.id || order.order_id}
                  data-testid={`order-${order.id || order.order_id}`}
                  className="border border-border rounded p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-lg">Order #{order.order_number || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium">{formatPrice(order.grand_total || order.total || 0)}</p>
                      <span className="inline-block px-3 py-1 text-xs rounded bg-primary text-primary-foreground mt-1">
                        {order.status || order.order_status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.product_name || item.name || 'Item'} x{item.quantity}
                          </span>
                          <span>{formatPrice(item.total || item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {order.tracking_number && (
                    <p className="text-sm text-muted-foreground">
                      Tracking: <span className="font-medium">{order.tracking_number}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-8">
          <div className="max-w-2xl">
            <div className="border border-border rounded p-6 mb-6">
              <h2 className="text-xl font-heading font-medium mb-4">Personal Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                {user.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountPage;
