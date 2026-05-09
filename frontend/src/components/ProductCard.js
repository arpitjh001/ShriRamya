import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Loader2, ShoppingBag, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { wishlistAPI } from '../services/api';
import { toast } from 'sonner';
import QuickViewModal from './QuickViewModal';
import { cn, formatPrice } from '../utils';
import { getCartErrorMessage } from '../utils/cartError';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1756483510798-c1fe4e476ecd?auto=format&fit=crop&w=2400&q=80';

const toNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    const next = toNumber(value);
    if (next !== null) return next;
  }
  return null;
};

const getProductId = (product = {}) => {
  const item = product || {};
  return item.id || item._id || item.productId;
};
const getWishlistProductId = (product = {}) => {
  const item = product || {};
  return item.productId || item.id || item._id;
};
const getVariantId = (variant = {}) => {
  const item = variant || {};
  return item.id || item._id || item.variantId;
};
const getVariantColor = (variant = {}) => {
  const item = variant || {};
  return item.color || item.attributes?.color || item.attributes?.Color || null;
};
const getVariantSize = (variant = {}) => {
  const item = variant || {};
  return item.size || item.attributes?.size || item.attributes?.Size || null;
};
const getVariantStock = (variant = {}) => {
  const item = variant || {};
  return firstFiniteNumber(item.stock, item.stock_quantity) || 0;
};

const buildImage = (product = {}) => {
  const firstImage = product.images?.[0];
  return (
    (typeof firstImage === 'string' ? firstImage : firstImage?.src) ||
    product.thumbnail ||
    product.image ||
    FALLBACK_IMAGE
  );
};

const isRecent = (product = {}) => {
  const rawDate = product.created_at || product.createdAt;
  if (!rawDate) return false;
  const createdAt = new Date(rawDate).getTime();
  if (Number.isNaN(createdAt)) return false;
  const thirtyDays = 1000 * 60 * 60 * 24 * 30;
  return Date.now() - createdAt <= thirtyDays;
};

const ProductCard = ({
  product,
  className,
  initialWishlisted = false,
  onWishlistChange,
  onQuickAction,
  quickActionLabel,
  showQuickAction = true,
}) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(() => buildImage(product));
  const [addingToCart, setAddingToCart] = useState(false);

  const productId = getProductId(product);
  const productPath = productId ? `/products/${productId}` : '/products';

  useEffect(() => {
    setIsWishlisted(initialWishlisted);
  }, [initialWishlisted]);

  useEffect(() => {
    setImageLoaded(false);
    setImageSrc(buildImage(product));
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

  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product]);
  const totalVariantStock = useMemo(
    () => variants.reduce((sum, variant) => sum + getVariantStock(variant), 0),
    [variants]
  );
  const explicitProductStock = firstFiniteNumber(product?.totalStock, product?.stock_quantity, product?.stock);
  const productStockKnown = typeof product?.stockKnown === 'boolean' ? product.stockKnown : explicitProductStock !== null;
  const stockKnown = variants.length > 0 || productStockKnown;
  const totalStock = variants.length > 0 ? totalVariantStock : explicitProductStock;
  const isOutOfStock = stockKnown
    ? Number(totalStock || 0) <= 0
    : product?.in_stock === false || product?.stock_status === 'outofstock';
  const lowStockThreshold = firstFiniteNumber(product?.lowStockThreshold, product?.low_stock_threshold) || 5;
  const isLimitedStock = !isOutOfStock && stockKnown && Number(totalStock || 0) <= lowStockThreshold;
  const quickAddVariant = variants.length === 1 ? variants[0] : null;
  const directVariantId = product?.defaultVariantId || product?.default_variant_id || product?.variantId;
  const quickAddVariantId = getVariantId(quickAddVariant) || directVariantId;
  const hasVariantChoices = variants.length > 1;

  const price = Number(variantPricing?.regularPrice ?? product?.regular_price ?? product?.price ?? product?.basePrice ?? 0);
  const salePrice = Number(variantPricing?.salePrice ?? product?.sale_price ?? product?.salePrice ?? 0);
  const displayPrice = salePrice > 0 ? salePrice : price;
  const hasDiscount = salePrice > 0 && salePrice < price;
  const discountPercent = hasDiscount ? Math.round(((price - salePrice) / price) * 100) : 0;

  const category =
    product?.categories?.[0]?.name ||
    (Array.isArray(product?.category) ? product.category[0] : product?.category) ||
    '';

  const badges = useMemo(() => {
    const nextBadges = [];
    const occasion = String(product?.occasion || category || '').toLowerCase();

    if (product?.isNew || product?.newArrival || isRecent(product)) nextBadges.push('New Arrival');
    if (product?.isTrending || product?.bestseller || product?.bestSeller) nextBadges.push('Bestseller');
    if (product?.handmade || product?.handcrafted) nextBadges.push('Handcrafted');
    if (product?.luxury_collection || occasion.includes('festive')) nextBadges.push('Festive Pick');
    if (isLimitedStock) nextBadges.push('Limited Stock');

    return [...new Set(nextBadges)].slice(0, 2);
  }, [category, isLimitedStock, product]);

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nextWishlisted = !isWishlisted;

    if (onWishlistChange) {
      try {
        await onWishlistChange(nextWishlisted, product);
        setIsWishlisted(nextWishlisted);
      } catch {
        toast.error('Wishlist action failed');
      }
      return;
    }

    if (!user) {
      toast.error('Please login first');
      return;
    }

    try {
      const wishlistProductId = getWishlistProductId(product);
      if (!wishlistProductId) return;

      if (isWishlisted) {
        await wishlistAPI.remove(wishlistProductId);
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(wishlistProductId);
        setIsWishlisted(true);
        toast.success('Added to wishlist');
      }
    } catch {
      toast.error('Wishlist action failed');
    }
  };

  const handleQuickAction = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || addingToCart) return;

    if (onQuickAction) {
      setAddingToCart(true);
      try {
        await onQuickAction(product);
      } finally {
        setAddingToCart(false);
      }
      return;
    }

    // Always open QuickView for "View" action
    setQuickViewOpen(true);
  };

  if (!product) return null;

  const quickActionText = isOutOfStock
    ? 'Out'
    : quickActionLabel || 'View';
  const wishlistLabel = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist';

  return (
    <article
      className={cn(
        'group h-full min-w-0 overflow-hidden rounded-2xl bg-ivory/95 ring-1 ring-accent/15 shadow-[0_10px_26px_rgba(31,31,31,0.08)] transition-transform duration-500 ease-luxury md:hover:-translate-y-1',
        className
      )}
      data-testid={`product-card-${productId}`}
    >
      <div className="relative">
        <Link
          to={productPath}
          className="block overflow-hidden rounded-t-2xl bg-muted/50"
          aria-label={`View ${product?.name || 'product'}`}
        >
          <div className="relative aspect-[3/4] overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-ivory to-muted/70" />
            )}
            <img
              src={imageSrc || ''}
              alt={product?.name || 'Product'}
              loading="lazy"
              decoding="async"
              className={cn(
                'h-full w-full object-cover object-top transition duration-700 ease-luxury md:group-hover:scale-[1.035]',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.currentTarget.onerror = null;
                setImageLoaded(true);
                setImageSrc(FALLBACK_IMAGE);
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-charcoal/38 backdrop-blur-[1px]">
                <span className="rounded-full border border-ivory/50 bg-ivory/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal">
                  Out of Stock
                </span>
              </div>
            )}
          </div>
        </Link>

        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.25rem)] flex-col gap-1.5 sm:left-3 sm:top-3">
            {badges.map((badge) => (
              <span
                key={badge}
                className="w-fit rounded-full border border-accent/25 bg-ivory/90 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur-md sm:text-[9px]"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          className={cn(
            'absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-ivory/70 bg-ivory/85 text-charcoal shadow-sm backdrop-blur-md transition-all duration-300 hover:border-accent/50 hover:bg-ivory sm:right-3 sm:top-3',
            isWishlisted && 'border-primary/25 bg-primary text-primary-foreground'
          )}
          onClick={handleWishlist}
          aria-label={wishlistLabel}
          aria-pressed={isWishlisted}
          title={wishlistLabel}
          data-testid={`wishlist-toggle-${getWishlistProductId(product) || productId}`}
        >
          <Heart className={cn('h-4 w-4', isWishlisted && 'fill-current')} />
        </button>
      </div>

      <div className="px-2.5 pb-2.5 pt-2.5 sm:px-3 sm:pb-3">
        <p className="line-clamp-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-secondary/70 sm:text-[9px]">
          {category || 'Heritage Edit'}
        </p>
        <Link to={productPath} className="mt-1 block">
          <h3 className="line-clamp-2 min-h-[2.15rem] text-[13px] font-medium leading-snug text-charcoal transition-colors group-hover:text-primary sm:text-sm">
            {product?.name || 'Unnamed Product'}
          </h3>
        </Link>

        <div className="mt-1.5 flex min-h-[1.2rem] flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {displayPrice > 0 ? (
            <span className="text-sm font-semibold leading-none text-primary sm:text-[15px]">{formatPrice(displayPrice)}</span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Price on request</span>
          )}
          {hasDiscount && (
            <>
              <span className="text-[10px] leading-none text-muted-foreground line-through sm:text-[11px]">{formatPrice(price)}</span>
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.08em] text-secondary">
                {discountPercent}% Off
              </span>
            </>
          )}
        </div>

        {showQuickAction && (
          <button
            type="button"
            className={cn(
              'mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-accent/25 bg-white/72 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-accent/45 hover:bg-accent/12 sm:h-9',
              isOutOfStock && 'cursor-not-allowed border-charcoal/10 bg-charcoal/5 text-charcoal/45 hover:bg-charcoal/5'
            )}
            onClick={handleQuickAction}
            disabled={isOutOfStock || addingToCart}
            data-testid={`product-card-action-${productId}`}
            aria-label={`${quickActionText} ${product?.name || 'product'}`}
          >
            {addingToCart ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            <span>{addingToCart ? 'Adding' : quickActionText}</span>
          </button>
        )}
      </div>

      <QuickViewModal
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        productId={productId}
      />
    </article>
  );
};

export const ProductCardSkeleton = ({ className }) => (
  <div
    className={cn(
      'overflow-hidden rounded-2xl bg-ivory/90 ring-1 ring-accent/15 shadow-[0_10px_26px_rgba(31,31,31,0.06)]',
      className
    )}
    data-testid="product-card-skeleton"
  >
    <div className="aspect-[3/4] animate-pulse bg-gradient-to-br from-muted via-ivory to-muted/70" />
    <div className="space-y-2 px-2.5 py-3 sm:px-3">
      <div className="h-2.5 w-16 rounded-full bg-muted" />
      <div className="h-3 w-full rounded-full bg-muted" />
      <div className="h-3 w-2/3 rounded-full bg-muted" />
      <div className="h-4 w-28 rounded-full bg-muted" />
      <div className="h-8 w-full rounded-full bg-muted/80" />
    </div>
  </div>
);

export default ProductCard;
