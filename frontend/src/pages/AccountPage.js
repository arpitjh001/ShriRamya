import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Package, User as UserIcon, MapPin, LogOut } from 'lucide-react';
import { formatPrice } from '../utils';
import { format } from 'date-fns';

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await ordersAPI.getAll();
        setOrders(response.data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div data-testid="account-page" className="px-6 md:px-12 lg:px-24 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-heading font-medium tracking-tight mb-2">My Account</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Button data-testid="logout-button" variant="outline" onClick={handleLogout}>
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
                  key={order.id}
                  data-testid={`order-${order.id}`}
                  className="border border-border rounded p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-lg">Order #{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Placed on {format(new Date(order.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium">{formatPrice(order.total)}</p>
                      <span className="inline-block px-3 py-1 text-xs rounded bg-primary text-primary-foreground mt-1">
                        {order.order_status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} x{item.quantity}
                        </span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

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
