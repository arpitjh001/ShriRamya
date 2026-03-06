import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { productsAPI, cartAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag, Loader2 } from 'lucide-react';
import { formatPrice, getSessionId } from '../utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const CartPage = () => {
  const { cart, fetchCart } = useCart();
  const navigate = useNavigate();
  const [cartProducts, setCartProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set()); // Uses composite key: productId-variationStr
  const [removingItems, setRemovingItems] = useState(new Set()); // Uses composite key: productId-variationStr

  useEffect(() => {
    const loadCartProducts = async () => {
      if (!cart.items || cart.items.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const productPromises = cart.items.map((item) =>
          productsAPI.getById(item.product_id)
        );
        const products = await Promise.all(productPromises);
        setCartProducts(products.map((res) => res.data));
      } catch (error) {
        console.error('Failed to load cart products:', error);
        toast.error('Failed to load cart products');
      } finally {
        setLoading(false);
      }
    };

    loadCartProducts();
  }, [cart]);

  const updateQuantity = async (productId, newQuantity, variation = null) => {
    const product = cartProducts.find((p) => p.id === productId);
    const variationStr = variation ? JSON.stringify(variation) : "";
    const itemKey = `${productId}-${variationStr}`;

    // Validation
    if (newQuantity < 0) return;

    if (newQuantity > (product?.stock_quantity || 100)) {
      toast.error(`Only ${product?.stock_quantity || 100} items available in stock`);
      return;
    }

    // Optimistic update
    setUpdatingItems(prev => new Set(prev).add(itemKey));

    try {
      const sessionId = getSessionId();
      await cartAPI.updateQuantity(productId, newQuantity, sessionId, variation);
      await fetchCart();

      if (newQuantity === 0) {
        toast.success('Item removed from cart');
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error(error.response?.data?.detail || 'Failed to update quantity');
      // Revert optimistic update by refetching
      await fetchCart();
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleIncrease = (productId, variation = null) => {
    const cartItem = cart.items.find(item =>
      item.product_id === productId &&
      JSON.stringify(item.variation) === JSON.stringify(variation)
    );
    if (cartItem) {
      updateQuantity(productId, cartItem.quantity + 1, variation);
    }
  };

  const handleDecrease = (productId, variation = null) => {
    const cartItem = cart.items.find(item =>
      item.product_id === productId &&
      JSON.stringify(item.variation) === JSON.stringify(variation)
    );
    if (cartItem) {
      updateQuantity(productId, cartItem.quantity - 1, variation);
    }
  };

  const handleRemove = async (productId, variation = null) => {
    const variationStr = variation ? JSON.stringify(variation) : "";
    const itemKey = `${productId}-${variationStr}`;
    setRemovingItems(prev => new Set(prev).add(itemKey));

    try {
      const sessionId = getSessionId();
      await cartAPI.remove(productId, sessionId, variation);
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
                const product = cartProducts.find((p) => p.id === item.product_id);
                if (!product) return null;

                const price = product.sale_price || product.price;
                const variationStr = item.variation ? JSON.stringify(item.variation) : "";
                const itemKey = `${item.product_id}-${variationStr}`;
                const isUpdating = updatingItems.has(itemKey);
                const isRemoving = removingItems.has(itemKey);

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
                      to={`/products/${product.id}`}
                      className="w-24 h-24 flex-shrink-0 overflow-hidden rounded"
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${product.id}`}
                        className="text-lg font-medium hover:text-primary transition-colors mb-1 block truncate"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                      {item.variation && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.variation.size} - {item.variation.color}
                        </p>
                      )}
                      <p className="text-lg font-medium text-primary">{formatPrice(price)}</p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border border-border rounded">
                          <Button
                            data-testid={`decrease-quantity-${item.product_id}`}
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-muted"
                            onClick={() => handleDecrease(item.product_id, item.variation)}
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
                            onClick={() => handleIncrease(item.product_id, item.variation)}
                            disabled={isUpdating || isRemoving || item.quantity >= (product.stock_quantity || 100)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {product.stock_quantity && item.quantity >= product.stock_quantity && (
                          <span className="text-xs text-amber-600">Max stock reached</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <Button
                        data-testid={`remove-item-${itemKey}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(item.product_id, item.variation)}
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
                          {formatPrice(price)} × {item.quantity}
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

