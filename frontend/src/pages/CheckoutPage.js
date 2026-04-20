import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { formatPrice } from '../utils';
import { toast } from 'sonner';
import { Tag, X, Loader2 } from 'lucide-react';

const CheckoutPage = () => {
  const { cart, clearCart, appliedCoupon, discountAmount, removeCoupon, calculateSubtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [removingCoupon, setRemovingCoupon] = useState(false);

  const [shippingData, setShippingData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [email, setEmail] = useState(user?.email || '');

  // Use cart item data directly — items already include name, image, price, attributes
  const subtotal = calculateSubtotal();
  const shipping = subtotal > 1000 ? 0 : 100;
  const total = Math.max(0, subtotal - discountAmount + shipping);

  const handleRemoveCoupon = async () => {
    setRemovingCoupon(true);
    try {
      await removeCoupon();
      toast.success('Coupon removed');
    } catch (error) {
      toast.error('Failed to remove coupon');
    } finally {
      setRemovingCoupon(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const finalizeOrder = async (orderId, paymentPayload) => {
    await ordersAPI.confirmPayment(orderId, paymentPayload);
    await clearCart();
    toast.success('Order placed successfully!');
    navigate(`/order-success/${orderId}`);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email || !shippingData.name || !shippingData.phone || !shippingData.address_line1 || !shippingData.city || !shippingData.state || !shippingData.pincode) {
        toast.error('Please fill all required fields');
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderData = {
        items: cart.items.map(item => ({
          productId: item.productId || item.id,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          attributes: item.attributes,
        })),
        shipping_address: shippingData,
        email,
        amount: total,
        couponCode: appliedCoupon?.code,
      };

      const orderResponse = await ordersAPI.create(orderData);
      const orderId = orderResponse.data?.order_id || orderResponse.data?.orderId;
      const razorpayOrderId = orderResponse.data?.razorpay_order_id || orderResponse.data?.razorpayOrderId;
      const amount = orderResponse.data?.amount;
      const razorpayKeyId = orderResponse.data?.razorpay_key_id || orderResponse.data?.key;
      const isMockPayment = Boolean(orderResponse.data?.is_mock || orderResponse.data?.isMock || razorpayKeyId === 'rzp_test_mock_key');

      if (!orderId) {
        throw new Error('Order creation response is missing order id');
      }

      if (isMockPayment) {
        await finalizeOrder(orderId, {
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: razorpayOrderId || `order_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        setLoading(false);
        return;
      }

      // Load Razorpay
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load');
        setLoading(false);
        return;
      }

      const options = {
        key: razorpayKeyId,
        amount: amount,
        currency: 'INR',
        name: 'Shri Ramya',
        description: 'Ethnic Wear Purchase',
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            await finalizeOrder(orderId, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: shippingData.name,
          email: email,
          contact: shippingData.phone,
        },
        theme: { color: '#800020' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function () {
        toast.error('Payment failed. Please try again.');
        setLoading(false);
      });
      paymentObject.open();
      setLoading(false);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return null;
  }

  return (
    <div data-testid="checkout-page" className="px-6 md:px-12 lg:px-24 py-12">
      <h1 className="text-4xl font-heading font-medium tracking-tight mb-8">Checkout</h1>

      <form onSubmit={handlePayment}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-border rounded p-6">
              <h2 className="text-xl font-heading font-medium mb-4">Contact Information</h2>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  data-testid="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="border border-border rounded p-6">
              <h2 className="text-xl font-heading font-medium mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" data-testid="checkout-name" value={shippingData.name} onChange={(e) => setShippingData({ ...shippingData, name: e.target.value })} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" data-testid="checkout-phone" value={shippingData.phone} onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value })} required className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <Input id="address1" data-testid="checkout-address1" value={shippingData.address_line1} onChange={(e) => setShippingData({ ...shippingData, address_line1: e.target.value })} required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input id="address2" data-testid="checkout-address2" value={shippingData.address_line2} onChange={(e) => setShippingData({ ...shippingData, address_line2: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" data-testid="checkout-city" value={shippingData.city} onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input id="state" data-testid="checkout-state" value={shippingData.state} onChange={(e) => setShippingData({ ...shippingData, state: e.target.value })} required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input id="pincode" data-testid="checkout-pincode" value={shippingData.pincode} onChange={(e) => setShippingData({ ...shippingData, pincode: e.target.value })} required className="mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="border border-border rounded p-6 sticky top-24">
              <h2 className="text-xl font-heading font-medium mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cart.items.map((item) => {
                  const price = item.price || 0;
                  const productId = item.productId || item.id;
                  const itemImage = item.image || item.thumbnail || '/uploads/woocommerce-placeholder.webp';

                  return (
                    <div key={`${productId}-${item.variantId || ''}`} data-testid={`checkout-item-${productId}`} className="flex gap-3">
                      <img
                        src={itemImage}
                        alt={item.name || 'Product'}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => { e.target.src = '/uploads/woocommerce-placeholder.webp'; }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name || 'Product'}</p>
                        {item.attributes && (item.attributes.size || item.attributes.color) && (
                          <p className="text-xs text-muted-foreground">
                            {[item.attributes.color, item.attributes.size].filter(Boolean).join(' / ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="text-sm font-medium">{formatPrice(price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-4 border-t border-border">
                {appliedCoupon && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-200 text-sm">{appliedCoupon.code}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} disabled={removingCoupon} className="h-6 w-6 p-0 text-green-600 hover:text-green-800">
                        {removingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="checkout-subtotal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span data-testid="checkout-shipping">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-muted-foreground">Discount</span>
                    <span data-testid="checkout-discount">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span data-testid="checkout-total">{formatPrice(total)}</span>
                </div>
              </div>

              <Button data-testid="place-order-button" type="submit" className="w-full mt-6" size="lg" disabled={loading}>
                {loading ? 'Processing...' : `Pay ${formatPrice(total)}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By placing your order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
