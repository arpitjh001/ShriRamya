import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useCart } from '../context/CartContext';
import { productsAPI } from '../services/api';
import { formatPrice } from '../utils';
import { getCartErrorMessage } from '../utils/cartError';
import { toast } from 'sonner';
import { ShoppingBag, Minus, Plus, Loader2, ChevronRight } from 'lucide-react';

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
  return Number(item.stock ?? item.stock_quantity ?? 0) || 0;
};

const QuickViewModal = ({ open, onOpenChange, productId }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  // Fetch product details when modal opens
  useEffect(() => {
    if (!open || !productId) return;
    setLoading(true);
    setSelectedColor(null);
    setSelectedSize(null);
    setQuantity(1);
    setActiveImage(0);

    productsAPI.getById(productId).then(res => {
      const p = res.data;
      setProduct(p);
      // Auto-select first color/size if available
      const variants = p.variants || [];
      const colors = [...new Set(variants.map(getVariantColor).filter(Boolean))];
      const sizes = [...new Set(variants.map(getVariantSize).filter(Boolean))];
      if (colors.length === 1) setSelectedColor(colors[0]);
      if (sizes.length === 1) setSelectedSize(sizes[0]);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load product');
      setLoading(false);
    });
  }, [open, productId]);

  const variants = useMemo(() => product?.variants || [], [product]);
  const colors = useMemo(() => [...new Set(variants.map(getVariantColor).filter(Boolean))], [variants]);
  const sizes = useMemo(() => [...new Set(variants.map(getVariantSize).filter(Boolean))], [variants]);
  const visibleSizes = useMemo(
    () => sizes.filter(size => String(size).toLowerCase() !== 'free size'),
    [sizes]
  );

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    if (colors.length > 0 && !selectedColor) return null;
    if (visibleSizes.length > 0 && !selectedSize) return null;

    return variants.find(v => {
      const vc = getVariantColor(v);
      const vs = getVariantSize(v);
      const colorMatch = !selectedColor || vc === selectedColor;
      const sizeMatch = !selectedSize || vs === selectedSize;
      return colorMatch && sizeMatch;
    }) || null;
  }, [colors.length, variants, selectedColor, selectedSize, visibleSizes.length]);

  const pricingVariant = selectedVariant || variants[0] || null;
  const price = pricingVariant?.price || product?.basePrice || product?.price || 0;
  const salePrice = pricingVariant?.discountPrice || pricingVariant?.effectivePrice || product?.salePrice || product?.sale_price || 0;
  const displayPrice = salePrice && salePrice < price ? salePrice : price;
  const hasDiscount = salePrice > 0 && salePrice < price;
  const images = product?.images || [];
  const discount = hasDiscount ? Math.round(((price - salePrice) / price) * 100) : 0;
  const missingOptions = variants.length > 0 && !selectedVariant;
  const selectedStock = selectedVariant ? getVariantStock(selectedVariant) : 0;
  const isOutOfStock = variants.length > 0 ? selectedVariant && selectedStock <= 0 : product?.in_stock === false;

  const isColorAvailable = (color) => variants.some((variant) => (
    getVariantColor(variant) === color && getVariantStock(variant) > 0
  ));

  const isSizeAvailable = (size) => variants.some((variant) => {
    const colorMatch = !selectedColor || getVariantColor(variant) === selectedColor;
    return colorMatch && getVariantSize(variant) === size && getVariantStock(variant) > 0;
  });

  const handleAddToCart = async () => {
    if (!product) return;
    if (variants.length > 0 && !selectedVariant) {
      toast.error('Please select available options');
      return;
    }
    if (isOutOfStock) {
      toast.error('This variant is out of stock');
      return;
    }

    setAddingToCart(true);
    try {
      const variantId = getVariantId(selectedVariant);
      await addToCart(product.id, quantity, variantId ? {
        variantId,
        color: selectedColor || getVariantColor(selectedVariant),
        size: selectedSize || getVariantSize(selectedVariant),
      } : null);
      toast.success('Added to cart!');
      onOpenChange(false);
    } catch (error) {
      toast.error(getCartErrorMessage(error));
    } finally {
      setAddingToCart(false);
    }
  };

  const handleViewFull = () => {
    onOpenChange(false);
    navigate(`/products/${productId}`);
  };

  const COLOR_MAP = {
    'Red': '#DC2626', 'Royal Blue': '#1D4ED8', 'Maroon': '#7F1D1D', 'Gold': '#D4A843',
    'Green': '#16A34A', 'Pink': '#EC4899', 'Yellow': '#EAB308', 'White': '#FFFFFF',
    'Black': '#1A1A1A', 'Purple': '#7C3AED', 'Orange': '#EA580C', 'Cream': '#FFFDD0',
    'Navy': '#1E3A5F', 'Coral': '#FF7F7F', 'Mint Green': '#98FF98', 'Teal': '#0D9488',
    'Beige': '#F5DEB3', 'Magenta': '#FF00FF', 'Indigo': '#4338CA', 'Peach': '#FFDAB9',
    'Mustard': '#E2B714', 'Wine': '#722F37', 'Ivory': '#FFFFF0', 'Rust': '#B7410E',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed bottom-0 left-0 right-0 top-auto z-[500] flex max-h-[95dvh] w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[2.5rem] border-x-0 border-b-0 border-t border-accent/20 bg-ivory/98 p-0 shadow-[0_-12px_44px_rgba(31,31,31,0.18)] backdrop-blur-xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[95vw] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border"
        data-testid="quick-view-modal"
      >
        <DialogTitle className="sr-only">Quick View</DialogTitle>
        <DialogDescription className="sr-only">
          Review product images, options, price, and cart actions.
        </DialogDescription>
        {loading ? (
          <div className="flex h-80 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : product ? (
          <div className="grid max-h-[95dvh] grid-cols-1 gap-4 overflow-y-auto bg-ivory/40 p-4 sm:p-6 md:max-h-[min(90vh,720px)] md:grid-cols-2 md:overflow-hidden md:p-8 lg:gap-10">
            {/* Image Gallery */}
            <div className="relative self-start rounded-2xl border border-accent/15 bg-gradient-to-br from-muted/30 via-ivory to-muted/20 p-2 shadow-luxury sm:p-3">
              <div className="h-[45dvh] max-h-[400px] w-full overflow-hidden rounded-xl bg-muted/25 sm:h-[50dvh] sm:max-h-[460px] md:h-auto md:aspect-[4/5]">
                <img
                  src={images[activeImage] || images[0] || '/uploads/woocommerce-placeholder.webp'}
                  alt={product.name}
                  className="h-full w-full object-cover object-top"
                  data-testid="quick-view-image"
                />
              </div>
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="scrollbar-hide mt-3 flex max-w-full justify-center gap-2 overflow-x-auto px-1 pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all sm:h-14 sm:w-14 ${i === activeImage ? 'border-primary ring-2 ring-primary/20' : 'border-accent/20 opacity-60 hover:opacity-100 hover:border-accent/40'}`}
                      aria-label={`View ${product.name} image ${i + 1}`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {hasDiscount && (
                <div className="absolute left-5 top-5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex min-h-0 flex-col px-1 pb-2 sm:px-1 md:max-h-[calc(min(90vh,720px)-4rem)] md:overflow-y-auto md:pr-4 custom-scrollbar">
              <p className="mb-1 pr-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/60">
                {product.categoryName || product.category || ''}
              </p>
              <h2 className="mb-2 pr-8 font-heading text-lg font-medium leading-tight text-charcoal sm:mb-3 sm:text-xl" data-testid="quick-view-name">
                {product.name}
              </h2>

              {/* Price */}
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mb-4">
                <span className="text-xl font-semibold text-primary sm:text-2xl" data-testid="quick-view-price">
                  {formatPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-base text-muted-foreground line-through">{formatPrice(price)}</span>
                )}
              </div>

              {product.shortDescription && (
                <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground sm:line-clamp-2">{product.shortDescription}</p>
              )}

              {/* Color Selection */}
              {colors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Color{selectedColor ? `: ${selectedColor}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        data-testid={`qv-color-${color}`}
                        onClick={() => setSelectedColor(color)}
                        disabled={!isColorAvailable(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border hover:scale-105'} ${!isColorAvailable(color) ? 'opacity-35 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: COLOR_MAP[color] || '#999' }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {visibleSizes.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {visibleSizes.map(size => (
                      <button
                        key={size}
                        data-testid={`qv-size-${size}`}
                        onClick={() => setSelectedSize(size)}
                        disabled={!isSizeAvailable(size)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedSize === size ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80 border border-border'} ${!isSizeAvailable(size) ? 'opacity-35 cursor-not-allowed line-through' : ''}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedVariant && (
                <p className={`mb-4 text-xs font-medium ${selectedStock <= 0 ? 'text-primary' : selectedStock <= 3 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                  {selectedStock <= 0 ? 'Out of stock' : selectedStock <= 3 ? `Only ${selectedStock} left` : 'In stock'}
                </p>
              )}

              {/* Quantity */}
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</p>
                  <div className="flex w-fit items-center overflow-hidden rounded-xl border border-accent/20 bg-muted/30 shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-secondary/70 hover:bg-accent/10 hover:text-secondary transition-colors"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span
                      data-testid="qv-quantity"
                      className="flex h-10 w-12 items-center justify-center border-x border-accent/15 bg-white/50 font-heading text-lg font-medium text-charcoal"
                    >
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-secondary/70 hover:bg-accent/10 hover:text-secondary transition-colors"
                      onClick={() => setQuantity(q => q + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>


              {/* Actions */}
              <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t border-accent/10 bg-ivory/95 pb-4 pt-5 backdrop-blur-md md:static md:border-t-0 md:bg-transparent md:pb-6 md:pt-2 md:backdrop-blur-0">
                <Button
                  data-testid="qv-add-to-cart"
                  className="group relative h-14 w-full overflow-hidden rounded-2xl bg-primary shadow-luxury transition-all hover:bg-primary/90 active:scale-[0.98]"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={addingToCart || missingOptions || isOutOfStock}
                >
                  <div className="flex items-center justify-center gap-2 font-medium">
                    {addingToCart ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                    )}
                    <span className="text-lg">
                      {addingToCart
                        ? 'Adding...'
                        : missingOptions
                        ? 'Select Options'
                        : isOutOfStock
                        ? 'Out of Stock'
                        : `Add to Cart • ${formatPrice(displayPrice * quantity)}`}
                    </span>
                  </div>
                </Button>
                <button
                  data-testid="qv-view-full"
                  onClick={handleViewFull}
                  className="flex items-center justify-center gap-1.5 py-2.5 font-medium text-secondary/60 transition-all hover:text-primary active:scale-95"
                >
                  <span className="text-sm tracking-wide">View Full Details</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-60 text-muted-foreground">Product not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};


export default QuickViewModal;
