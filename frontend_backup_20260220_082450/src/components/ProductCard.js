import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { wishlistAPI } from '../lib/api';
import { Button } from './ui/button';
import { toast } from 'sonner';
import LuxuryBadge from './LuxuryBadge';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addToCart(product.id, 1);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to add to wishlist');
      return;
    }
    try {
      if (isWishlisted) {
        await wishlistAPI.remove(product.id);
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(product.id);
        setIsWishlisted(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;

  return (
    <Link
      to={`/products/${product.id}`}
      data-testid={`product-card-${product.id}`}
      className="group block"
    >
      <div className="relative overflow-hidden rounded aspect-[3/4] mb-4">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.luxury_collection && <LuxuryBadge />}
          {hasDiscount && (
            <div className="bg-primary text-primary-foreground px-3 py-1 text-sm font-medium rounded">
              {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
            </div>
          )}
          {product.handmade && (
            <div className="bg-secondary/90 text-secondary-foreground px-3 py-1 text-xs font-medium rounded">
              HANDCRAFTED
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-foreground/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex gap-2">
            <Button
              data-testid={`add-to-cart-${product.id}`}
              size="sm"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={loading}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
            <Button
              data-testid={`wishlist-${product.id}`}
              size="sm"
              variant="secondary"
              onClick={handleWishlist}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">{product.category}</p>
        <h3 className="font-body font-medium mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-medium">{formatPrice(displayPrice)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;