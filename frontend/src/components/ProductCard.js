import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { wishlistAPI } from '../services/api';
import { Button } from './ui/button';
import { toast } from 'sonner';
import LuxuryBadge from './LuxuryBadge';
import QuickViewModal from './QuickViewModal';
import { formatPrice } from '../utils';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1756483510798-c1fe4e476ecd?auto=format&fit=crop&w=2400&q=80';

const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const image = useMemo(() => {
    const firstImage = product?.images?.[0];
    const imageUrl =
      (typeof firstImage === 'string' ? firstImage : firstImage?.src) ||
      product?.image ||
      FALLBACK_IMAGE;
    return imageUrl;
  }, [product]);

  const variantPricing = useMemo(() => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length === 0) {
      return null;
    }

    const prices = variants
      .map((variant) => Number(variant?.price || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    const discounted = variants
      .map((variant) => {
        const regular = Number(variant?.price || 0);
        const effective = Number(variant?.effectivePrice ?? variant?.discountPrice ?? 0);
        return Number.isFinite(regular) && Number.isFinite(effective) && effective > 0 && effective < regular
          ? { regular, effective }
          : null;
      })
      .filter(Boolean);

    if (prices.length === 0) {
      return null;
    }

    const regularPrice = Math.min(...prices);
    const salePrice = discounted.length > 0 ? Math.min(...discounted.map((item) => item.effective)) : null;

    return { regularPrice, salePrice };
  }, [product]);

  const price = Number(variantPricing?.regularPrice ?? product?.regular_price ?? product?.price ?? 0);
  const salePrice = Number(variantPricing?.salePrice ?? product?.sale_price ?? 0);
  const displayPrice = salePrice > 0 ? salePrice : price;
  const hasDiscount = salePrice > 0 && salePrice < price;

  const category =
    product?.categories?.[0]?.name ||
    (Array.isArray(product?.category) ? product.category[0] : product?.category) ||
    '';

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login first');
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
    } catch {
      toast.error('Wishlist action failed');
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product?.id) return;

    setAddingToCart(true);
    try {
      await addToCart(product.id, 1);
      toast.success('Added to cart');
    } catch {
      toast.error('Select options from quick view if size is required');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  if (!product) return null;

  return (
    <Link to={`/products/${product.id}`} className="group block premium-card" data-testid={`product-card-${product.id}`}>
      <article className="glass-luxury overflow-hidden rounded-[1.4rem] border border-accent/20">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={image || ''}
            alt={product?.name || 'Product'}
            className="h-full w-full object-cover transition-transform duration-1000 ease-luxury group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/60 via-charcoal/5 to-transparent opacity-80" />

          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {product?.luxury_collection && <LuxuryBadge />}
            {hasDiscount && (
              <div className="rounded-full border border-accent/35 bg-primary/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                {Math.round(((price - salePrice) / price) * 100)}% Off
              </div>
            )}
          </div>

          <div className="absolute right-4 top-4 flex translate-x-4 flex-col gap-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="outline"
              className="glass-luxury h-10 w-10 border-accent/35 bg-ivory/50 text-charcoal hover:bg-accent/20"
              onClick={handleWishlist}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current text-primary' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="glass-luxury h-10 w-10 border-accent/35 bg-ivory/50 text-charcoal hover:bg-accent/20"
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute inset-x-4 bottom-4 translate-y-6 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              className="w-full border border-accent/30 bg-accent text-charcoal hover:bg-gold-mist"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              <ShoppingBag className="h-4 w-4" />
              {addingToCart ? 'Adding...' : 'Add To Cart'}
            </Button>
          </div>
        </div>

        <div className="space-y-2 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary/75">{category || 'Heritage Edit'}</p>
          <h3 className="line-clamp-1 font-heading text-xl font-medium text-charcoal transition-colors group-hover:text-primary">
            {product?.name || 'Unnamed Product'}
          </h3>
          <div className="flex items-center gap-2 pt-1">
            <span className="font-accent text-2xl font-semibold text-primary">{formatPrice(displayPrice)}</span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(price)}</span>
            )}
          </div>
        </div>
      </article>
      <QuickViewModal
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        productId={product?.id}
      />
    </Link>
  );
};

export default ProductCard;
