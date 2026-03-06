import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wishlistAPI, productsAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';

const WishlistPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchWishlist = async () => {
      try {
        const wishlistRes = await wishlistAPI.get();
        if (wishlistRes.data.items.length > 0) {
          const productPromises = wishlistRes.data.items.map((item) =>
            productsAPI.getById(item.product_id)
          );
          const products = await Promise.all(productPromises);
          setWishlistProducts(products.map((res) => res.data));
        }
      } catch (error) {
        console.error('Failed to fetch wishlist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="h-64 flex items-center justify-center">
          <p className="text-lg text-muted-foreground">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="wishlist-page" className="px-6 md:px-12 lg:px-24 py-12">
      <h1 className="text-4xl font-heading font-medium tracking-tight mb-8">My Wishlist</h1>

      {wishlistProducts.length === 0 ? (
        <div data-testid="empty-wishlist" className="max-w-md mx-auto text-center py-16">
          <Heart className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h2 className="text-2xl font-heading font-medium mb-4">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-8">Save items you love to your wishlist.</p>
          <Button data-testid="empty-wishlist-shop-button" onClick={() => navigate('/products')} size="lg">
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="wishlist-products-grid">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
