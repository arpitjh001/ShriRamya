import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { formatPrice, getCartItemPrice, getShippingCharge } from '../utils';
import { toast } from 'sonner';
import { Tag, X, Loader2 } from 'lucide-react';

const CheckoutPage = () => {
  const { cart, clearCart, appliedCoupon, discountAmount, removeCoupon, calculateSubtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [removingCoupon, setRemovingCoupon] = useState(false);

  const [shippingData, setShippingData] = useState({
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  const subtotal = calculateSubtotal();
  const shipping = getShippingCharge(subtotal);
  const total = Math.max(0, subtotal - discountAmount + shipping);

  useEffect(() => {
    if (user) {
      console.log('[Checkout] Pre-filling user data:', user);
      setShippingData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[Checkout] ${name} changed to:`, value);
    setShippingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

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

  const normalizeRazorpayAmount = (paymentData, fallbackRupees) => {
    const explicitPaise = Number(paymentData?.amount_in_paise ?? paymentData?.amountInPaise);
    if (Number.isFinite(explicitPaise) && explicitPaise > 0) {
      return Math.round(explicitPaise);
    }

    const rawAmount = Number(paymentData?.amount);
    const displayAmount = Number(
      paymentData?.display_amount
      ?? paymentData?.displayAmount
      ?? paymentData?.total
      ?? paymentData?.total_amount
      ?? fallbackRupees
    );

    if (Number.isFinite(rawAmount) && rawAmount > 0) {
      const amountLooksLikeRupees = Number.isFinite(displayAmount)
        && displayAmount > 0
        && Math.abs(rawAmount - displayAmount) < 0.01;

      return amountLooksLikeRupees ? Math.round(rawAmount * 100) : Math.round(rawAmount);
    }

    if (Number.isFinite(displayAmount) && displayAmount > 0) {
      return Math.round(displayAmount * 100);
    }

    return null;
  };

  const finalizeOrder = async (orderId, paymentPayload) => {
    await ordersAPI.confirmPayment(orderId, paymentPayload);
    await clearCart();
    toast.success('Order placed successfully!');
    navigate(`/order-success/${orderId}`);
  };

  const handlePayment = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      console.log('[Checkout] Attempting payment with data:', shippingData);

      // Direct DOM check as a safety net
      const domData = {
        email: document.getElementById('email')?.value,
        name: document.getElementById('name')?.value,
        phone: document.getElementById('phone')?.value,
        address_line1: document.getElementById('address1')?.value,
        city: document.getElementById('city')?.value,
        state: document.getElementById('state')?.value,
        pincode: document.getElementById('pincode')?.value,
      };

      const finalData = {
        ...shippingData,
        email: shippingData.email || domData.email,
        name: shippingData.name || domData.name,
        phone: shippingData.phone || domData.phone,
        address_line1: shippingData.address_line1 || domData.address_line1,
        city: shippingData.city || domData.city,
        state: shippingData.state || domData.state,
        pincode: shippingData.pincode || domData.pincode,
      };

      const missingFields = [];
      if (!finalData.email) missingFields.push('email');
      if (!finalData.name) missingFields.push('name');
      if (!finalData.phone) missingFields.push('phone');
      if (!finalData.address_line1) missingFields.push('address_line1');
      if (!finalData.city) missingFields.push('city');
      if (!finalData.state) missingFields.push('state');
      if (!finalData.pincode) missingFields.push('pincode');

      if (missingFields.length > 0) {
        console.error('[Checkout] Validation failed. Missing:', missingFields);
        toast.error(`Please fill all required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderPayload = {
        items: cart.items.map(item => ({
          productId: item.productId._id || item.productId || item.id,
          variantId: item.variantId?._id || item.variantId,
          name: item.name,
          price: getCartItemPrice(item),
          quantity: item.quantity,
          image: item.image || item.thumbnail,
          attributes: item.attributes || {},
        })),
        shipping_address: finalData,
        email: finalData.email,
        amount: total,
        couponCode: appliedCoupon?.code,
        paymentMethod: 'razorpay'
      };

      console.log('[Checkout] Sending order payload:', orderPayload);

      const orderResponse = await ordersAPI.create(orderPayload);
      const orderId = orderResponse.data?.order_id || orderResponse.data?.orderId || orderResponse.data?._id;
      const razorpayOrderId = orderResponse.data?.razorpay_order_id || orderResponse.data?.razorpayOrderId;
      const amount = normalizeRazorpayAmount(orderResponse.data, total);
      const razorpayKeyId = orderResponse.data?.razorpay_key_id || orderResponse.data?.key;
      const isMockPayment = Boolean(orderResponse.data?.is_mock || orderResponse.data?.isMock || razorpayKeyId === 'rzp_test_mock_key');

      if (!orderId) {
        throw new Error('Order creation response is missing order id');
      }

      if (!amount) {
        throw new Error('Order creation response is missing Razorpay amount');
      }

      if (isMockPayment) {
        console.log('[Checkout] Processing mock payment');
        await finalizeOrder(orderId, {
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: razorpayOrderId || `order_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        setLoading(false);
        return;
      }

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
            console.log('[Checkout] Razorpay success:', response);
            await finalizeOrder(orderId, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
          } catch (error) {
            console.error('[Checkout] Verification failed:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: finalData.name,
          email: finalData.email,
          contact: finalData.phone,
        },
        theme: { color: '#800020' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (resp) {
        console.error('[Checkout] Razorpay failed:', resp.error);
        toast.error('Payment failed: ' + resp.error.description);
        setLoading(false);
      });
      paymentObject.open();
      setLoading(false);
    } catch (error) {
      console.error('[Checkout] Error:', error);
      toast.error(error.response?.data?.message || 'Checkout failed. Please try again.');
      setLoading(false);
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h2 className="text-2xl font-heading font-medium mb-4">Your cart is empty</h2>
        <Button onClick={() => navigate('/shop')} variant="primary">Return to Shop</Button>
      </div>
    );
  }

  return (
    <div data-testid="checkout-page" className="px-6 md:px-12 lg:px-24 py-12">
      <h1 className="text-4xl font-heading font-medium tracking-tight mb-8">Checkout</h1>

      <form onSubmit={handlePayment}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-border rounded p-6">
              <h2 className="text-xl font-heading font-medium mb-4">Contact Information</h2>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  data-testid="checkout-email"
                  type="email"
                  value={shippingData.email}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="border border-border rounded p-6">
              <h2 className="text-xl font-heading font-medium mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      data-testid="checkout-name"
                      value={shippingData.name}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      data-testid="checkout-phone"
                      value={shippingData.phone}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <Input
                    id="address1"
                    name="address_line1"
                    data-testid="checkout-address1"
                    value={shippingData.address_line1}
                    onChange={handleChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                  <Input
                    id="address2"
                    name="address_line2"
                    data-testid="checkout-address2"
                    value={shippingData.address_line2}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      data-testid="checkout-city"
                      value={shippingData.city}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      data-testid="checkout-state"
                      value={shippingData.state}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      data-testid="checkout-pincode"
                      value={shippingData.pincode}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border border-border rounded p-6 sticky top-24 bg-card">
              <h2 className="text-xl font-heading font-medium mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
                {cart.items.map((item) => {
                  const price = getCartItemPrice(item);
                  const productId = item.productId?._id || item.productId || item.id;
                  const itemImage = item.image || item.thumbnail || '/uploads/woocommerce-placeholder.webp';

                  return (
                    <div key={`${productId}-${item.variantId || ''}`} className="flex gap-4">
                      <div className="relative w-16 h-20 bg-muted rounded overflow-hidden">
                        <img
                          src={itemImage}
                          alt={item.name || 'Product'}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/uploads/woocommerce-placeholder.webp'; }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.name || 'Product'}</p>
                        {item.attributes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.values(item.attributes).filter(Boolean).join(' / ')}
                          </p>
                        )}
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          <p className="text-sm font-medium">{formatPrice(price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-6 border-t border-border">
                {appliedCoupon && (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-2 rounded text-xs text-green-700 dark:text-green-400">
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{appliedCoupon.code}</span>
                    </div>
                    <button onClick={handleRemoveCoupon} disabled={removingCoupon} className="hover:text-red-500">
                      {removingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    </button>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatPrice(shipping)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-white"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatPrice(total)}`
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center mt-4 uppercase tracking-wider">
                Secure SSL Encrypted Payment
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
