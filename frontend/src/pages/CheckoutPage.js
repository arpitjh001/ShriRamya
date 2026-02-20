import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { productsAPI, ordersAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';

const CheckoutPage = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cartProducts, setCartProducts] = useState([]);

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

  useEffect(() => {
    if (!cart.items || cart.items.length === 0) {
      navigate('/cart');
      return;
    }

    const loadCartProducts = async () => {
      try {
        const productPromises = cart.items.map((item) =>
          productsAPI.getById(item.product_id)
        );
        const products = await Promise.all(productPromises);
        setCartProducts(products.map((res) => res.data));
      } catch (error) {
        console.error('Failed to load cart products:', error);
      }
    };

    loadCartProducts();
  }, [cart, navigate]);

  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => {
      const product = cartProducts.find((p) => String(p.id) === String(item.product_id));
      if (!product) return total;
      const price = product.sale_price || product.price;
      return total + price * item.quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal + shipping;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!email || !shippingData.name || !shippingData.phone || !shippingData.address_line1 || !shippingData.city || !shippingData.state || !shippingData.pincode) {
        toast.error('Please fill all required fields');
        setLoading(false);
        return;
      }

      // Create order
      const orderData = {
        items: cart.items,
        shipping_address: shippingData,
        email,
      };

      const orderResponse = await ordersAPI.create(orderData);
      const { order_id, razorpay_order_id, amount, razorpay_key_id } = orderResponse.data;

      // Load Razorpay
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load');
        setLoading(false);
        return;
      }

      // Configure Razorpay options
      const options = {
        key: razorpay_key_id,
        amount: amount,
        currency: 'INR',
        name: 'Shri Ramya',
        description: 'Ethnic Wear Purchase',
        order_id: razorpay_order_id,
        handler: async (response) => {
          try {
            // Confirm payment
            await ordersAPI.confirmPayment(order_id, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Clear cart
            await clearCart();

            toast.success('Order placed successfully!');
            navigate(`/order-success/${order_id}`);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: shippingData.name,
          email: email,
          contact: shippingData.phone,
        },
        theme: {
          color: '#800020',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
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
            {/* Contact Information */}
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

            {/* Shipping Address */}
            <div className="border border-border rounded p-6">
              <h2 className="text-xl font-heading font-medium mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      data-testid="checkout-name"
                      value={shippingData.name}
                      onChange={(e) => setShippingData({ ...shippingData, name: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      data-testid="checkout-phone"
                      value={shippingData.phone}
                      onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address1">Address Line 1 *</Label>
                  <Input
                    id="address1"
                    data-testid="checkout-address1"
                    value={shippingData.address_line1}
                    onChange={(e) => setShippingData({ ...shippingData, address_line1: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input
                    id="address2"
                    data-testid="checkout-address2"
                    value={shippingData.address_line2}
                    onChange={(e) => setShippingData({ ...shippingData, address_line2: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      data-testid="checkout-city"
                      value={shippingData.city}
                      onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      data-testid="checkout-state"
                      value={shippingData.state}
                      onChange={(e) => setShippingData({ ...shippingData, state: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      data-testid="checkout-pincode"
                      value={shippingData.pincode}
                      onChange={(e) => setShippingData({ ...shippingData, pincode: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="border border-border rounded p-6 sticky top-24">
              <h2 className="text-xl font-heading font-medium mb-6">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cart.items.map((item) => {
                  const product = cartProducts.find((p) => String(p.id) === String(item.product_id));
                  if (!product) return null;
                  const price = product.sale_price || product.price;

                  return (
                    <div key={item.product_id} className="flex gap-3">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="text-sm font-medium">{formatPrice(price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="checkout-subtotal">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span data-testid="checkout-shipping">
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span data-testid="checkout-total">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                data-testid="place-order-button"
                type="submit"
                className="w-full mt-6"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
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