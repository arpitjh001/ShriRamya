import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import { productsAPI } from '../services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

const WishlistPage = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
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

  const removeItem = async (productId, options = {}) => {
    try {
      await fetch(`${API_BASE}/api/v1/wishlist/remove/${productId}?userId=${userId}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.productId !== productId));
      if (!options.silent) toast.success('Removed from wishlist');
    } catch (err) { toast.error('Failed to remove'); }
  };

  const moveToCart = async (item) => {
    try {
      const productRes = await productsAPI.getById(item.productId);
      const product = productRes.data;
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const inStockVariants = variants.filter((variant) => Number(variant.stock ?? variant.stock_quantity ?? 0) > 0);

      if (variants.length === 0 || inStockVariants.length === 0) {
        toast.error('This item is currently out of stock');
        return;
      }

      if (variants.length > 1) {
        toast.info('Choose size or color to add this piece');
        navigate(`/products/${item.productId}`);
        return;
      }

      const variant = inStockVariants[0];
      await addToCart(product.id, 1, {
        variantId: variant.id || variant._id || variant.variantId,
        color: variant.color || variant.attributes?.color || variant.attributes?.Color,
        size: variant.size || variant.attributes?.size || variant.attributes?.Size,
      });
      await removeItem(item.productId, { silent: true });
      toast.success('Moved to cart');
    } catch (err) { toast.error('Failed to move to cart'); }
  };

  const mapWishlistProduct = (item) => {
    const displayPrice = Number(item.salePrice ?? item.price ?? 0);
    const originalPrice = Number(item.price ?? 0);

    return {
      id: item.productId,
      productId: item.productId,
      name: item.name,
      images: item.thumbnail ? [item.thumbnail] : [],
      thumbnail: item.thumbnail,
      price: originalPrice,
      sale_price: originalPrice > displayPrice ? displayPrice : null,
      category: item.category || item.categoryName || 'Wishlist',
      in_stock: item.in_stock !== false,
    };
  };

  return (
    <div data-testid="wishlist-page" className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-medium tracking-tight">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">{items.length} items saved</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)}
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {items.map(item => (
                <motion.div
                  key={item.productId}
                  layout
                  exit={{ opacity: 0, scale: 0.8 }}
                  data-testid={`wishlist-product-${item.productId}`}
                >
                  <ProductCard
                    product={mapWishlistProduct(item)}
                    initialWishlisted
                    quickActionLabel="Move"
                    onQuickAction={() => moveToCart(item)}
                    onWishlistChange={(nextWishlisted) => {
                      if (!nextWishlisted) return removeItem(item.productId);
                      return null;
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
