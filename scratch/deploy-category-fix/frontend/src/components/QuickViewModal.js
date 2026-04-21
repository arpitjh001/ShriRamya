import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useCart } from '../context/CartContext';
import { productsAPI } from '../services/api';
import { formatPrice } from '../utils';
import { toast } from 'sonner';
import { ShoppingBag, Minus, Plus, Loader2, ChevronRight } from 'lucide-react';

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
      const colors = [...new Set(variants.map(v => v.color || v.attributes?.color).filter(Boolean))];
      const sizes = [...new Set(variants.map(v => v.size || v.attributes?.size).filter(Boolean))];
      if (colors.length === 1) setSelectedColor(colors[0]);
      if (sizes.length === 1) setSelectedSize(sizes[0]);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load product');
      setLoading(false);
    });
  }, [open, productId]);

  const variants = useMemo(() => product?.variants || [], [product]);
  const colors = useMemo(() => [...new Set(variants.map(v => v.color || v.attributes?.color).filter(Boolean))], [variants]);
  const sizes = useMemo(() => [...new Set(variants.map(v => v.size || v.attributes?.size).filter(Boolean))], [variants]);

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find(v => {
      const vc = v.color || v.attributes?.color;
      const vs = v.size || v.attributes?.size;
      const colorMatch = !selectedColor || vc === selectedColor;
      const sizeMatch = !selectedSize || vs === selectedSize;
      return colorMatch && sizeMatch;
    }) || variants[0];
  }, [variants, selectedColor, selectedSize]);

  const price = selectedVariant?.price || product?.basePrice || product?.price || 0;
  const salePrice = selectedVariant?.discountPrice || selectedVariant?.effectivePrice || product?.salePrice || product?.sale_price || 0;
  const displayPrice = salePrice && salePrice < price ? salePrice : price;
  const hasDiscount = salePrice > 0 && salePrice < price;
  const images = product?.images || [];
  const discount = hasDiscount ? Math.round(((price - salePrice) / price) * 100) : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      const variantId = selectedVariant?.id || null;
      await addToCart(product.id, quantity, variantId);
      toast.success('Added to cart!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to add to cart');
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden" data-testid="quick-view-modal">
        <DialogTitle className="sr-only">Quick View</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : product ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Image Gallery */}
            <div className="relative bg-muted/30">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={images[activeImage] || images[0] || '/uploads/woocommerce-placeholder.webp'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  data-testid="quick-view-image"
                />
              </div>
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${i === activeImage ? 'border-primary ring-1 ring-primary' : 'border-white/50 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
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
            <div className="p-6 flex flex-col">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/60 mb-1">
                {product.categoryName || product.category || ''}
              </p>
              <h2 className="font-heading text-xl font-medium text-charcoal mb-3" data-testid="quick-view-name">
                {product.name}
              </h2>

              {/* Price */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-semibold text-primary" data-testid="quick-view-price">
                  {formatPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-base text-muted-foreground line-through">{formatPrice(price)}</span>
                )}
              </div>

              {product.shortDescription && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{product.shortDescription}</p>
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
                        className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border hover:scale-105'}`}
                        style={{ backgroundColor: COLOR_MAP[color] || '#999' }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {sizes.length > 0 && !(sizes.length === 1 && sizes[0] === 'Free Size') && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Size</p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(size => (
                      <button
                        key={size}
                        data-testid={`qv-size-${size}`}
                        onClick={() => setSelectedSize(size)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedSize === size ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80 border border-border'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
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
              <div className="mt-auto space-y-3">
                <Button
                  data-testid="qv-add-to-cart"
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                >
                  {addingToCart ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 mr-2" />
                  )}
                  {addingToCart ? 'Adding...' : `Add to Cart - ${formatPrice(displayPrice * quantity)}`}
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
