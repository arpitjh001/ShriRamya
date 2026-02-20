import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { productsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';

const CartPage = () => {
  const { cart, removeFromCart, fetchCart } = useCart();
  const navigate = useNavigate();
  const [cartProducts, setCartProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    loadCartProducts();
  }, [cart]);

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const calculateSubtotal = () => {
    return cart.items.reduce((total, item) => {
      const product = cartProducts.find((p) => p.id === item.product_id);
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
          <p className="text-lg text-muted-foreground">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div data-testid="empty-cart" className="px-6 md:px-12 lg:px-24 py-12">
        <div className="max-w-md mx-auto text-center py-16">
          <ShoppingBag className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-heading font-medium mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Button data-testid="empty-cart-shop-button" asChild size="lg">
            <Link to="/products">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="cart-page" className="px-6 md:px-12 lg:px-24 py-12">
      <h1 className="text-4xl font-heading font-medium tracking-tight mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {cart.items.map((item) => {
              const product = cartProducts.find((p) => p.id === item.product_id);
              if (!product) return null;

              const price = product.sale_price || product.price;

              return (
                <div
                  key={item.product_id}
                  data-testid={`cart-item-${item.product_id}`}
                  className="flex gap-4 p-4 border border-border rounded"
                >
                  <Link to={`/products/${product.id}`} className="w-24 h-24 flex-shrink-0 overflow-hidden rounded">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="flex-1">
                    <Link
                      to={`/products/${product.id}`}
                      className="text-lg font-medium hover:text-primary transition-colors mb-1 block"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                    {item.variation && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.variation.size} - {item.variation.color}
                      </p>
                    )}
                    <p className="text-lg font-medium">{formatPrice(price)}</p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <Button
                      data-testid={`remove-item-${item.product_id}`}
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.product_id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <div className="text-lg font-medium">
                      {formatPrice(price * item.quantity)}
                    </div>
                    <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="border border-border rounded p-6 sticky top-24">
            <h2 className="text-xl font-heading font-medium mb-6">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span data-testid="cart-subtotal">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span data-testid="cart-shipping">
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </span>
              </div>
              {subtotal < 999 && shipping > 0 && (
                <p className="text-sm text-muted-foreground">
                  Add {formatPrice(999 - subtotal)} more for free shipping
                </p>
              )}
              <div className="pt-3 border-t border-border flex justify-between text-lg font-medium">
                <span>Total</span>
                <span data-testid="cart-total">{formatPrice(total)}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;