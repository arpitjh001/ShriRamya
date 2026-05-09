import React, { useState } from 'react';
import { ordersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Package, Search, CheckCircle, Truck, Box, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import OrderTrackingTimeline from '../components/OrderTrackingTimeline';

const normalizeTrackingData = (rawData = {}, fallbackOrderNumber = '') => {
  const shipment = rawData.shipment || {};
  const order = rawData.order || shipment.order || {};
  const statusHistory = rawData.statusHistory || rawData.status_history || rawData.history || shipment.history || [];
  const createdAt = rawData.created_at || rawData.createdAt || order.created_at || order.createdAt || shipment.createdAt || shipment.updatedAt;

  return {
    ...rawData,
    order_number: rawData.order_number || rawData.orderId || rawData.order_id || order.orderId || shipment.orderId || fallbackOrderNumber,
    created_at: createdAt,
    status: rawData.status || shipment.status || order.status || 'pending',
    tracking_number: rawData.tracking_number || rawData.trackingNumber || shipment.trackingNumber || '',
    tracking_url: rawData.tracking_url || rawData.trackingUrl || shipment.trackingUrl || '',
    statusHistory,
  };
};

const TrackOrderPage = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const displayStatus = String(orderData?.status || 'pending').replace(/_/g, ' ');
  const placedDate = orderData?.created_at ? dayjs(orderData.created_at) : null;

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      toast.error('Please enter order number');
      return;
    }

    setLoading(true);
    try {
      const response = await ordersAPI.track(orderNumber);
      setOrderData(normalizeTrackingData(response.data || {}, orderNumber.trim()));
    } catch (error) {
      toast.error('Order not found. Please check the order number.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = String(status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'processing':
        return <Box className="h-8 w-8 text-primary" />;
      case 'confirmed':
        return <CheckCircle className="h-8 w-8 text-primary" />;
      case 'shipped':
      case 'in_transit':
      case 'out_for_delivery':
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
              {placedDate?.isValid() && (
                <p className="text-muted-foreground">
                  Placed on {placedDate.format('MMM DD, YYYY')}
                </p>
              )}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-muted rounded">
                <span className="font-medium">Order Status</span>
                <span className="px-4 py-2 bg-primary text-primary-foreground rounded capitalize">
                  {displayStatus}
                </span>
              </div>

              {orderData.tracking_number && (
                <div className="flex items-center justify-between p-4 bg-muted rounded">
                  <span className="font-medium">Tracking Number</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-sm">{orderData.tracking_number}</span>
                    {orderData.tracking_url && (
                      <a
                        href={orderData.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        Track on Courier Site <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tracking Timeline */}
            <div className="border-t border-border pt-8 mt-8">
              <OrderTrackingTimeline
                history={orderData.statusHistory || orderData.status_history || []}
                currentStatus={orderData.status}
              />
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
