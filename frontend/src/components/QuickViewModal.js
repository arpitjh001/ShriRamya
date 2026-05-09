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
        className="bottom-0 top-auto max-h-[92dvh] w-[calc(100vw-0.75rem)] max-w-3xl translate-y-0 gap-0 overflow-hidden rounded-t-2xl p-0 sm:bottom-auto sm:top-[50%] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:translate-y-[-50%] sm:rounded-2xl"
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
          <div className="grid max-h-[92dvh] grid-cols-1 overflow-y-auto bg-ivory sm:max-h-[calc(100dvh-2rem)] md:grid-cols-2 md:overflow-hidden">
            {/* Image Gallery */}
            <div className="relative bg-muted/30 md:min-h-full">
              <div className="aspect-[4/3] max-h-[38dvh] overflow-hidden sm:aspect-[16/10] md:aspect-[3/4] md:max-h-none md:h-full">
                <img
                  src={images[activeImage] || images[0] || '/uploads/woocommerce-placeholder.webp'}
                  alt={product.name}
                  className="h-full w-full object-cover object-top"
                  data-testid="quick-view-image"
                />
              </div>
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="scrollbar-hide absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-2 overflow-x-auto px-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`h-11 w-11 shrink-0 overflow-hidden rounded border-2 transition-all sm:h-12 sm:w-12 ${i === activeImage ? 'border-primary ring-1 ring-primary' : 'border-white/50 opacity-70 hover:opacity-100'}`}
                      aria-label={`View ${product.name} image ${i + 1}`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                  {discount}% OFF
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex min-h-0 flex-col p-4 pb-0 sm:p-6 sm:pb-0 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto">
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
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quantity</p>
                <div className="flex items-center border border-border rounded w-fit">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span data-testid="qv-quantity" className="h-9 w-10 flex items-center justify-center font-medium border-x border-border">{quantity}</span>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 mt-auto space-y-3 border-t border-border/40 bg-ivory/95 py-3 backdrop-blur md:static md:border-t-0 md:bg-transparent md:pb-6 md:backdrop-blur-0">
                <Button
                  data-testid="qv-add-to-cart"
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={addingToCart || missingOptions || isOutOfStock}
                >
                  {addingToCart ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 mr-2" />
                  )}
                  {addingToCart
                    ? 'Adding...'
                    : missingOptions
                    ? 'Select Options'
                    : isOutOfStock
                    ? 'Out of Stock'
                    : `Add to Cart - ${formatPrice(displayPrice * quantity)}`}
                </Button>
                <button
                  data-testid="qv-view-full"
                  onClick={handleViewFull}
                  className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                >
                  View Full Details <ChevronRight className="h-3 w-3" />
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
