import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const WishlistPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = user?.id || user?.userId || 'guest';

  useEffect(() => {
    fetchWishlist();
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/wishlist?userId=${userId}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch (err) { console.error('Fetch wishlist:', err); }
    setLoading(false);
  };

  const removeItem = async (productId) => {
    try {
      await fetch(`${API_BASE}/api/v1/wishlist/remove/${productId}?userId=${userId}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.productId !== productId));
      toast.success('Removed from wishlist');
    } catch (err) { toast.error('Failed to remove'); }
  };

  const moveToCart = async (item) => {
    try {
      const sessionId = localStorage.getItem('sessionId') || 'session_' + Date.now();
      localStorage.setItem('sessionId', sessionId);
      await fetch(`${API_BASE}/api/v1/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        body: JSON.stringify({ productId: item.productId, name: item.name, price: item.price, salePrice: item.salePrice, thumbnail: item.thumbnail, quantity: 1 }),
      });
      await fetch(`${API_BASE}/api/v1/wishlist/remove/${item.productId}?userId=${userId}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.productId !== item.productId));
      toast.success('Moved to cart');
    } catch (err) { toast.error('Failed to move to cart'); }
  };

  return (
    <div data-testid="wishlist-page" className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">{items.length} items saved</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] bg-muted/50 animate-pulse rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <Heart className="h-20 w-20 mx-auto mb-6 text-muted-foreground/30" />
            <p className="text-xl font-heading font-medium text-muted-foreground mb-2">Your wishlist is empty</p>
            <p className="text-sm text-muted-foreground mb-6">Save your favorite items to buy them later</p>
            <Button onClick={() => navigate('/products')} size="lg">
              <ShoppingBag className="w-5 h-5 mr-2" /> Browse Products
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(item => {
                const displayPrice = Number(item.salePrice ?? item.price ?? 0);
                const originalPrice = Number(item.price ?? 0);
                const showOriginal = originalPrice > 0 && originalPrice > displayPrice;

                return (
                  <motion.div key={item.productId} layout exit={{ opacity: 0, scale: 0.8 }} data-testid={`wishlist-product-${item.productId}`}
                    className="bg-card border border-border rounded-xl overflow-hidden group">
                  <Link to={`/products/${item.productId}`} className="block">
                    <div className="aspect-[3/4] overflow-hidden relative">
                      <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <button onClick={(e) => { e.preventDefault(); removeItem(item.productId); }}
                        className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                        data-testid={`remove-wishlist-${item.productId}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Link>
                  <div className="p-4">
                    <h3 className="text-sm font-medium line-clamp-2 mb-2">{item.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold">Rs.{displayPrice.toLocaleString()}</span>
                      {showOriginal && <span className="text-xs text-muted-foreground line-through">Rs.{originalPrice.toLocaleString()}</span>}
                    </div>
                    <Button size="sm" className="w-full" onClick={() => moveToCart(item)} data-testid={`move-to-cart-${item.productId}`}>
                      <ShoppingBag className="w-4 h-4 mr-2" /> Move to Cart
                    </Button>
                  </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
