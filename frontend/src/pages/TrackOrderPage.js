import React, { useState } from 'react';
import { ordersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Package, Search, CheckCircle, Truck, Box } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

const TrackOrderPage = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      toast.error('Please enter order number');
      return;
    }

    setLoading(true);
    try {
      const response = await ordersAPI.track(orderNumber);
      setOrderData(response.data);
    } catch (error) {
      toast.error('Order not found. Please check the order number.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Box className="h-8 w-8 text-primary" />;
      case 'confirmed':
        return <CheckCircle className="h-8 w-8 text-primary" />;
      case 'shipped':
        return <Truck className="h-8 w-8 text-primary" />;
      case 'delivered':
        return <Package className="h-8 w-8 text-primary" />;
      default:
        return <Package className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <div data-testid="track-order-page" className="px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-heading font-medium tracking-tight mb-4">Track Your Order</h1>
          <p className="text-lg text-muted-foreground">
            Enter your order number to check the status of your delivery
          </p>
        </div>

        <form onSubmit={handleTrack} className="mb-12">
          <div className="space-y-4">
            <div>
              <Label htmlFor="orderNumber">Order Number</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="orderNumber"
                  data-testid="track-order-input"
                  placeholder="e.g., ORD12345678"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="flex-1"
                />
                <Button data-testid="track-order-button" type="submit" disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? 'Tracking...' : 'Track'}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {orderData && (
          <div data-testid="order-tracking-result" className="border border-border rounded p-8">
            <div className="text-center mb-8">
              {getStatusIcon(orderData.status)}
              <h2 className="text-2xl font-heading font-medium mt-4 mb-2">
                Order #{orderData.order_number}
              </h2>
              <p className="text-muted-foreground">
                Placed on {dayjs(orderData.created_at).format('MMM DD, YYYY')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded">
                <span className="font-medium">Order Status</span>
                <span className="px-4 py-2 bg-primary text-primary-foreground rounded capitalize">
                  {orderData.status}
                </span>
              </div>

              {orderData.tracking_number && (
                <div className="flex items-center justify-between p-4 bg-muted rounded">
                  <span className="font-medium">Tracking Number</span>
                  <span className="font-mono text-sm">{orderData.tracking_number}</span>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 bg-accent rounded">
              <p className="text-sm text-muted-foreground text-center">
                You will receive email updates about your order status. For any queries, please contact our support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
