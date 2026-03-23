import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { cartAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trash2, Plus, Minus, ShoppingBag, Loader2, Tag, X } from 'lucide-react';
import { formatPrice, getSessionId } from '../utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const CartPage = () => {
  const { cart, fetchCart, appliedCoupon, discountAmount, applyCoupon, removeCoupon, calculateSubtotal } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [removingItems, setRemovingItems] = useState(new Set());
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    // Cart items from API already include name, image, price, attributes
    // No need for separate product fetches
    if (cart.items !== undefined) {
      setLoading(false);
    }
  }, [cart]);

  const getItemKey = (item) => `${item.productId || item.id}-${item.variantId || ''}`;

  const updateQuantity = async (item, newQuantity) => {
    const itemKey = getItemKey(item);

    if (newQuantity < 0) return;

    setUpdatingItems(prev => new Set(prev).add(itemKey));

    try {
      const sessionId = getSessionId();
      await cartAPI.updateQuantity(item.productId || item.id, newQuantity, sessionId);
      await fetchCart();

      if (newQuantity === 0) {
        toast.success('Item removed from cart');
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error(error.response?.data?.detail || 'Failed to update quantity');
      await fetchCart();
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleIncrease = (item) => {
    updateQuantity(item, item.quantity + 1);
  };

  const handleDecrease = (item) => {
    updateQuantity(item, item.quantity - 1);
  };

  const handleRemove = async (item) => {
    const itemKey = getItemKey(item);
    setRemovingItems(prev => new Set(prev).add(itemKey));

    try {
      const sessionId = getSessionId();
      await cartAPI.remove(item.productId || item.id, sessionId);
      await fetchCart();
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast.error('Failed to remove item');
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 999 ? 0 : 99;
  const total = subtotal - discountAmount + shipping;

  // Coupon handlers
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setApplyingCoupon(true);
    try {
      await applyCoupon(couponCode.trim());
      toast.success('Coupon applied successfully!');
      setCouponCode('');
    } catch (error) {
      toast.error(error.message || 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon();
      toast.success('Coupon removed');
    } catch (error) {
      toast.error('Failed to remove coupon');
    }
  };

  if (loading) {
    return (
      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div data-testid="empty-cart" className="px-6 md:px-12 lg:px-24 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto text-center py-16"
        >
          <ShoppingBag className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-heading font-medium mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Button data-testid="empty-cart-shop-button" asChild size="lg">
            <Link to="/products">Start Shopping</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div data-testid="cart-page" className="px-6 md:px-12 lg:px-24 py-12">
      <h1 className="text-4xl font-heading font-medium tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {cart.items.map((item) => {
                const itemKey = getItemKey(item);
                const isUpdating = updatingItems.has(itemKey);
                const isRemoving = removingItems.has(itemKey);
                const price = item.price || 0;
                const originalPrice = item.originalPrice || item.price || 0;
                const itemImage = item.image || item.thumbnail || '/uploads/woocommerce-placeholder.webp';
                const productId = item.productId || item.id;

                return (
                  <motion.div
                    key={itemKey}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: isRemoving ? 0.5 : 1, y: 0 }}
                    exit={{ opacity: 0, x: -100, height: 0 }}
                    transition={{ duration: 0.3 }}
                    data-testid={`cart-item-${itemKey}`}
                    className="flex gap-4 p-4 border border-border rounded bg-background hover:shadow-md transition-shadow"
                  >
                    <Link
                      to={`/products/${productId}`}
                      className="w-24 h-24 flex-shrink-0 overflow-hidden rounded"
                    >
                      <img
                        src={itemImage}
                        alt={item.name || 'Product'}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                        onError={(e) => { e.target.src = '/uploads/woocommerce-placeholder.webp'; }}
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${productId}`}
                        className="text-lg font-medium hover:text-primary transition-colors mb-1 block truncate"
                      >
                        {item.name || 'Product'}
                      </Link>
                      {item.attributes && (item.attributes.size || item.attributes.color) && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {[item.attributes.color, item.attributes.size].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      <p className="text-lg font-medium text-primary">{formatPrice(price)}</p>
                      {originalPrice > price && (
                        <p className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-border rounded">
                          <Button
                            data-testid={`decrease-quantity-${productId}`}
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-muted"
                            onClick={() => handleDecrease(item)}
                            disabled={isUpdating || isRemoving || item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>

                          <div className="h-9 w-12 flex items-center justify-center border-x border-border">
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <span
                                data-testid={`quantity-${itemKey}`}
                                className="font-medium"
                              >
                                {item.quantity}
                              </span>
                            )}
                          </div>

                          <Button
                            data-testid={`increase-quantity-${itemKey}`}
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-muted"
                            onClick={() => handleIncrease(item)}
                            disabled={isUpdating || isRemoving}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <Button
                        data-testid={`remove-item-${itemKey}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(item)}
                        disabled={isRemoving}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        {isRemoving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </Button>

                      <div className="text-right">
                        <div className="text-lg font-medium">
                          {formatPrice(price * item.quantity)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatPrice(price)} x {item.quantity}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border border-border rounded-lg p-6 sticky top-24 bg-background"
          >
            <h2 className="text-xl font-heading font-medium mb-6">Order Summary</h2>

            {/* Coupon Section */}
            <div className="mb-6">
              {appliedCoupon ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">{appliedCoupon.code}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      disabled={applyingCoupon}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Discount: -{formatPrice(discountAmount)}
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <Label htmlFor="coupon-code" className="text-sm font-medium">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={applyingCoupon}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={applyingCoupon || !couponCode.trim()}
                      className="whitespace-nowrap"
                    >
                      {applyingCoupon ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span data-testid="cart-subtotal" className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span data-testid="cart-shipping" className="font-medium">
                  {shipping === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(shipping)
                  )}
                </span>
              </div>
              {discountAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex justify-between text-green-600"
                >
                  <span className="text-muted-foreground">Discount</span>
                  <span data-testid="cart-discount" className="font-medium">-{formatPrice(discountAmount)}</span>
                </motion.div>
              )}
              {subtotal < 999 && shipping > 0 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-sm text-muted-foreground bg-accent p-3 rounded"
                >
                  Add {formatPrice(999 - subtotal)} more for free shipping! 🎉
                </motion.p>
              )}
              <div className="pt-3 border-t border-border flex justify-between text-lg font-medium">
                <span>Total</span>
                <span data-testid="cart-total" className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            <Button
              data-testid="checkout-button"
              className="w-full"
              size="lg"
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout
            </Button>

            <Button
              data-testid="continue-shopping-button"
              variant="outline"
              className="w-full mt-4"
              asChild
            >
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

