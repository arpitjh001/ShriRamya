import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { ShoppingCart, Heart, Truck, Shield, RefreshCw, Sparkles, ChevronDown, Layers, Star, MessageCircle, Share2 } from 'lucide-react';
import { formatPrice } from '../utils';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';
import CraftStorySection from '../components/CraftStorySection';
import LuxuryBadge from '../components/LuxuryBadge';
import TryOnModal from '../components/VirtualTryOn/TryOnModal';
import { motion, AnimatePresence } from 'framer-motion';
import { addToRecentlyViewed } from '../components/RecentlyViewed';
import { getFabricGuide } from '../utils/fabricGuide';
import SEOMeta from '../components/SEOMeta';

const SHIPPING_DELIVERY_COPY = 'Orders are dispatched within 24-48 hours across India. International orders may take 5-7 business days. Shipping charges are calculated at checkout.';

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

const normalizeMaterialGuide = (guide) => {
  if (!guide || typeof guide !== 'object') return null;

  const description = typeof guide.description === 'string' ? guide.description.trim() : '';
  const origin = typeof guide.origin === 'string' ? guide.origin.trim() : '';
  const normalizeList = (value) => (
    Array.isArray(value)
      ? value.map((entry) => String(entry || '').trim()).filter(Boolean)
      : []
  );

  const properties = normalizeList(guide.properties);
  const care = normalizeList(guide.care);

  if (!description && !origin && properties.length === 0 && care.length === 0) {
    return null;
  }

  return { description, origin, properties, care };
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [reviews, setReviews] = useState({ reviews: [], average: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [variantStock, setVariantStock] = useState(null);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState('description');
  const [wish, setWish] = useState(false);

  // Variant matrix state
  const [variantMatrix, setVariantMatrix] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const [productRes, recsRes] = await Promise.all([
          productsAPI.getById(id),
          productsAPI.getRecommendations(id),
        ]);
        setProduct(productRes.data);
        setRecommendations(recsRes.data || []);
        addToRecentlyViewed(id);

        // Fetch reviews
        try {
          const API_BASE = process.env.REACT_APP_BACKEND_URL;
          const reviewRes = await fetch(`${API_BASE}/api/v1/reviews/product/${id}`);
          const reviewData = await reviewRes.json();
          if (reviewData.success) setReviews(reviewData.data);
        } catch (e) { /* reviews optional */ }

        // Update page title for SEO
        if (productRes.data?.name) {
          document.title = `${productRes.data.name} | ShriRamya`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) metaDesc.setAttribute('content', productRes.data.description?.slice(0, 160) || `Buy ${productRes.data.name} at ShriRamya`);
        }

        // Fetch variant matrix
        try {
          const matrixRes = await productsAPI.getVariantMatrix(id);
          const variants = matrixRes.data?.variants || [];
          setVariantMatrix(variants);

          // Extract unique colors and sizes from variant attributes
          const colors = [...new Set(variants.map(getVariantColor).filter(Boolean))];
          const sizes = [...new Set(variants.map(getVariantSize).filter(Boolean))];
          setAvailableColors(colors);
          setAvailableSizes(sizes);

          // Auto-select variant only if both color and size exist
          if (variants.length > 0) {
            const firstInStockVariant = variants.find(v => getVariantStock(v) > 0) || variants[0];
            if (firstInStockVariant) {
              const variantColor = getVariantColor(firstInStockVariant);
              const variantSize = getVariantSize(firstInStockVariant);
              
              // Only auto-select if the variant has these attributes
              if (variantColor && colors.length > 0) {
                setSelectedColor(variantColor);
              }
              if (variantSize && sizes.length > 0) {
                setSelectedSize(variantSize);
              }
              setSelectedVariation(firstInStockVariant);
              
              if (variantColor && variantSize) {
                updateVariantStock(variantColor, variantSize);
              }
            }
          }
        } catch (err) {
          console.log('Variant matrix not available, using legacy variant system');
          const variantsData = productRes.data?.variants || productRes.data?.variations || [];
          if (variantsData.length > 0) {
            setSelectedVariation(variantsData[0]);
            // Extract colors and sizes from legacy variants
            const colors = [...new Set(variantsData.map(getVariantColor).filter(Boolean))];
            const sizes = [...new Set(variantsData.map(getVariantSize).filter(Boolean))];
            setAvailableColors(colors);
            setAvailableSizes(sizes);
          }
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (!user || !product) return;
      try {
        const API_BASE = process.env.REACT_APP_BACKEND_URL;
        const userId = user?.id || user?.userId || 'guest';
        const res = await fetch(`${API_BASE}/api/v1/wishlist?userId=${userId}`);
        const data = await res.json();
        const pid = product.productId || product.id;
        const isInWishlist = (data.data || []).some(item => String(item.productId) === String(pid));
        setWish(isInWishlist);
      } catch (err) {
        console.error('Error checking wishlist:', err);
      }
    };
    checkWishlist();
  }, [user, product]);

  // Update variant stock when color/size changes
  const updateVariantStock = (color, size) => {
    const variant = variantMatrix.find(v => getVariantColor(v) === color && getVariantSize(v) === size);
    if (variant) {
      const threshold = variant.lowStockThreshold || product.lowStockThreshold || 5;
      const stock = getVariantStock(variant);
      setVariantStock({
        stock,
        isOutOfStock: stock === 0,
        isLowStock: stock > 0 && stock <= threshold,
        stockStatus: stock === 0 ? 'out_of_stock' : stock <= threshold ? 'low_stock' : 'in_stock'
      });
    } else {
      setVariantStock(null);
    }
  };

  // Handle color selection
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    setSelectedSize(''); // Reset size when color changes
    setVariantStock(null);

    // Get available sizes for this color
    const sizesForColor = [...new Set(
      variantMatrix
        .filter(v => getVariantColor(v) === color && getVariantStock(v) > 0)
        .map(getVariantSize)
        .filter(Boolean)
    )];

    // Auto-select first available size if only one exists
    if (sizesForColor.length === 1) {
      setSelectedSize(sizesForColor[0]);
      updateVariantStock(color, sizesForColor[0]);
    }
  };

  // Handle size selection
  const handleSizeSelect = (size) => {
    setSelectedSize(size);
    if (selectedColor) {
      updateVariantStock(selectedColor, size);
      const variant = variantMatrix.find(v => getVariantColor(v) === selectedColor && getVariantSize(v) === size);
      setSelectedVariation(variant);
    }
  };

  // Check if a size is available for selected color
  const isSizeAvailable = (size) => {
    if (!selectedColor) return true;
    const variant = variantMatrix.find(v => getVariantColor(v) === selectedColor && getVariantSize(v) === size);
    return variant && getVariantStock(variant) > 0;
  };

  // Get stock count for a specific variant
  const getStockForSize = (size) => {
    if (!selectedColor) return 0;
    const variant = variantMatrix.find(v => getVariantColor(v) === selectedColor && getVariantSize(v) === size);
    return variant ? getVariantStock(variant) : 0;
  };

  const handleAddToCart = async () => {
    // Check if product has variants that require selection
    const hasColors = availableColors.length > 0;
    const hasSizes = availableSizes.length > 0;
    const hasVariants = variantMatrix.length > 0;
    
    // Only validate if variants exist and require selection
    if (hasVariants) {
      // Only require color selection if colors exist
      if (hasColors && !selectedColor) {
        toast.error('Please select a color');
        return;
      }
      // Only require size selection if sizes exist
      if (hasSizes && !selectedSize) {
        toast.error('Please select a size');
        return;
      }

      // Validate stock only if variant is selected
      if ((hasColors || hasSizes) && variantStock && variantStock.isOutOfStock) {
        toast.error('This variant is out of stock');
        return;
      }

      if (hasColors || hasSizes) {
        const matchedVariant = selectedVariation || variantMatrix.find(
          (variant) => (
            (!selectedColor || getVariantColor(variant) === selectedColor) &&
            (!selectedSize || getVariantSize(variant) === selectedSize)
          )
        );

        if (!matchedVariant || !getVariantId(matchedVariant)) {
          toast.error('Please select an available variant');
          return;
        }

        setSelectedVariation(matchedVariant);
      }
    }

    try {
      let variation = null;

      if (hasVariants && (selectedColor || selectedSize)) {
        const matchedVariant = selectedVariation || variantMatrix.find(
          (variant) => (
            (!selectedColor || getVariantColor(variant) === selectedColor) &&
            (!selectedSize || getVariantSize(variant) === selectedSize)
          )
        );
        variation = {
          variantId: getVariantId(matchedVariant),
          color: selectedColor || null,
          size: selectedSize || null,
          stock: variantStock?.stock || product.totalStock || 0
        };
      } else if (selectedVariation) {
        variation = selectedVariation;
      }

      await addToCart(product.id, 1, variation);
      toast.success('Added to cart!');
      return true;
    } catch (error) {
      if (error.response?.data?.code === 'INSUFFICIENT_STOCK') {
        toast.error(`Only ${error.response?.data?.availableStock} items available`);
      } else {
        toast.error('Failed to add to cart');
      }
      return false;
    }
  };

  // Toggle wishlist
  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error('Please log in to add items to wishlist');
      return;
    }

    try {
      const API_BASE = process.env.REACT_APP_BACKEND_URL;
      const userId = user?.id || user?.userId || 'guest';

      const pid = product.productId || product.id;

      if (wish) {
        // Remove from wishlist
        await fetch(`${API_BASE}/api/v1/wishlist/${pid}?userId=${userId}`, { method: 'DELETE' });
        setWish(false);
        toast.success('Removed from wishlist');
      } else {
        // Add to wishlist
        await fetch(`${API_BASE}/api/v1/wishlist/${pid}?userId=${userId}`, { method: 'POST' });
        setWish(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="aspect-[3/4] bg-charcoal/5 animate-pulse rounded-2xl" />
          <div className="space-y-6">
            <div className="h-4 w-1/4 bg-charcoal/5 animate-pulse rounded" />
            <div className="h-12 w-3/4 bg-charcoal/5 animate-pulse rounded" />
            <div className="h-8 w-1/2 bg-charcoal/5 animate-pulse rounded" />
            <div className="h-40 w-full bg-charcoal/5 animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <p className="text-2xl font-heading text-charcoal/50 mb-6">Product not found</p>
        <Button onClick={() => navigate('/')} variant="outline" className="border-charcoal/20">Return Home</Button>
      </div>
    );
  }

  const variantPrices = Array.isArray(product.variants)
    ? product.variants
      .map((variant) => Number(variant?.price || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
    : [];

  const variantDiscountedPrices = Array.isArray(product.variants)
    ? product.variants
      .map((variant) => {
        const regular = Number(variant?.price || 0);
        const effective = Number(variant?.effectivePrice ?? variant?.discountPrice ?? 0);
        return Number.isFinite(regular) && Number.isFinite(effective) && effective > 0 && effective < regular
          ? effective
          : null;
      })
      .filter(Boolean)
    : [];

  const regularPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : Number(product.price || 0);
  const salePrice = variantDiscountedPrices.length > 0
    ? Math.min(...variantDiscountedPrices)
    : Number(product.sale_price || 0);
  const hasDiscount = salePrice > 0 && salePrice < regularPrice;
  const displayPrice = hasDiscount ? salePrice : regularPrice;
  const modelDetails = [
    product.modelWears ? { label: 'Model wears', value: product.modelWears } : null,
    product.modelHeight ? { label: 'Height', value: product.modelHeight } : null,
  ].filter(Boolean);
  const customMaterialGuide = normalizeMaterialGuide(product.materialGuide);
  const materialGuide = customMaterialGuide || getFabricGuide(product.fabric);
  const materialGuideLabel = product.fabric || 'Material Guide';

  const toggleAccordion = (id) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="bg-[#F7F3EC] min-h-screen">
      <SEOMeta 
        title={product?.name}
        description={product?.description?.slice(0, 160) || `Buy ${product?.name} at ShriRamya - Premium Indian Handloom`}
        image={product?.images?.[0] || product?.thumbnail}
        url={`/products/${id}`}
        type="product"
      />
      {/* Breadcrumbs */}
      <nav className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-8 md:pt-12 pb-6">
        <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40">
          <li><Link to="/" className="hover:text-royal-maroon transition-colors">Home</Link></li>
          <li className="flex items-center gap-2">
            <span>/</span>
            <Link to={`/category/${product.category?.toLowerCase()}`} className="hover:text-royal-maroon transition-colors">{product.category}</Link>
          </li>
          <li className="flex min-w-0 items-center gap-2 text-charcoal/80 italic">
            <span>/</span>
            <span className="break-words">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Left Column: Media Gallery */}
          <div className="min-w-0 lg:col-span-7 space-y-4">
            <motion.div
              layoutId={`product-hero-${product.id}`}
              className="relative aspect-[3/4.5] overflow-hidden rounded-3xl group"
            >
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent pointer-events-none" />
              {product.luxury_collection && (
                <div className="absolute top-6 left-6">
                  <LuxuryBadge className="bg-white/80 backdrop-blur-md border-none px-4 py-2" />
                </div>
              )}
            </motion.div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                      selectedImage === index ? 'border-royal-maroon scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information (Sticky) */}
          <div className="min-w-0 lg:col-span-5 h-fit lg:sticky lg:top-32 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-[0.3em] text-royal-maroon/60">
                  {product.category}
                </span>
                <button 
                  onClick={handleToggleWishlist}
                  className={`p-2 hover:bg-white rounded-full transition-colors ${wish ? 'text-royal-maroon' : 'text-charcoal/40 hover:text-royal-maroon'}`}
                  data-testid="wishlist-btn"
                >
                  <Heart className={`w-5 h-5 ${wish ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-medium text-charcoal tracking-tight leading-tight break-words">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="text-3xl font-medium text-charcoal">{formatPrice(displayPrice)}</span>
                {hasDiscount && (
                  <>
                    <span className="text-xl text-charcoal/30 line-through decoration-royal-maroon/30">{formatPrice(regularPrice)}</span>
                    <span className="text-sm font-bold text-royal-maroon tracking-wider">
                      ({Math.round(((regularPrice - salePrice) / regularPrice) * 100)}% OFF)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Model Info */}
            {modelDetails.length > 0 && (
              <div className="bg-white/40 border border-white/60 p-5 rounded-2xl flex flex-wrap items-center gap-4 sm:gap-6">
                {modelDetails.map((detail, index) => (
                  <React.Fragment key={detail.label}>
                    {index > 0 && <div className="hidden sm:block w-[1px] h-8 bg-charcoal/10" />}
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-charcoal/40">{detail.label}</span>
                      <span className="text-sm font-medium text-charcoal">{detail.value}</span>
                    </div>
                  </React.Fragment>
                ))}
                <Sparkles className="sm:ml-auto w-5 h-5 text-royal-maroon/30 animate-pulse" />
              </div>
            )}

            {/* Selection Options - Variant Matrix System */}
            <div className="space-y-8">
              {/* Color Selection - Variant Matrix */}
              {availableColors.length > 0 && (
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-charcoal/80">
                    Color: <span className="text-charcoal/60 capitalize">{selectedColor || 'Choose'}</span>
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {availableColors.map((color, index) => {
                      const hasStock = variantMatrix.some(v => getVariantColor(v) === color && getVariantStock(v) > 0);
                      const isSelected = selectedColor === color;

                      return (
                        <button
                          key={index}
                          onClick={() => handleColorSelect(color)}
                          disabled={!hasStock}
                          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isSelected ? 'ring-2 ring-charcoal ring-offset-4 ring-offset-[#F7F3EC] scale-105' : ''
                          } ${!hasStock ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                          <div
                            className="w-full h-full rounded-full shadow-inner border border-charcoal/5"
                            style={{ backgroundColor: color.toLowerCase() }}
                          />
                          {!hasStock && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-full flex items-center justify-center">
                              <span className="text-[8px] font-bold text-charcoal">SOLD</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection - Variant Matrix */}
              {(availableSizes.length > 0 || product.size_stock?.length > 0) && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-charcoal/80">Select Size</label>
                    <button className="text-[10px] uppercase font-bold text-royal-maroon hover:underline tracking-widest opacity-60">Size Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {/* Use variant matrix sizes if available */}
                    {(availableSizes.length > 0 ? availableSizes : product.size_stock?.map(s => s.size) || []).map((size, index) => {
                      const isAvailable = variantMatrix.length > 0
                        ? isSizeAvailable(size)
                        : (product.size_stock?.find(s => s.size === size)?.qty || 0) > 0;
                      const isSelected = selectedSize === size;
                      const stockCount = variantMatrix.length > 0
                        ? getStockForSize(size)
                        : (product.size_stock?.find(s => s.size === size)?.qty || 0);

                      return (
                        <button
                          key={index}
                          disabled={!isAvailable}
                          onClick={() => handleSizeSelect(size)}
                          className={`min-w-[52px] px-3 h-[55px] rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 border relative ${
                            isSelected
                              ? 'bg-charcoal text-white border-charcoal shadow-lg shadow-charcoal/20'
                              : 'bg-white text-charcoal border-charcoal/5 hover:border-charcoal/20'
                          } ${!isAvailable ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                        >
                          {size}
                          {!isAvailable && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                              <span className="text-[9px] font-bold text-charcoal/50 rotate-12">SOLD OUT</span>
                            </div>
                          )}
                          {isAvailable && stockCount <= (product.lowStockThreshold || 5) && stockCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" title="Low stock" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stock message for selected variant */}
                  {selectedColor && selectedSize && variantStock && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-sm ${
                        variantStock.isOutOfStock
                          ? 'text-red-600 font-semibold'
                          : variantStock.isLowStock
                          ? 'text-orange-600 font-medium'
                          : 'text-green-600'
                      }`}
                    >
                      {variantStock.isOutOfStock
                        ? 'This variant is currently out of stock'
                        : variantStock.isLowStock
                        ? `Hurry! Only ${variantStock.stock} pieces left`
                        : 'In stock'}
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.in_stock}
                  className="w-full sm:flex-[2] h-16 rounded-2xl bg-charcoal text-white hover:bg-black transition-all text-sm uppercase font-bold tracking-[0.18em] sm:tracking-widest whitespace-normal text-center leading-tight px-4"
                >
                  <ShoppingCart className="w-5 h-5 shrink-0 mr-3" />
                  {product.in_stock ? 'Add to Shopping Bag' : 'Out of Stock'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={async () => {
                    const added = await handleAddToCart();
                    if (added) {
                      navigate('/checkout');
                    }
                  }}
                  className="w-full sm:flex-1 h-16 rounded-2xl border-charcoal/10 hover:border-charcoal bg-white transition-all text-sm uppercase font-bold tracking-[0.18em] sm:tracking-widest whitespace-normal text-center leading-tight px-4"
                >
                  Buy Now
                </Button>
              </div>
              
              {/* WhatsApp Share */}
              <button
                data-testid="whatsapp-share-btn"
                onClick={() => {
                  const url = window.location.href;
                  const text = `Check out ${product.name} at Rs.${(product.salePrice || product.price).toLocaleString()} on ShriRamya!`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-semibold"
              >
                <Share2 className="w-4 h-4" /> Share on WhatsApp
              </button>

              <div className="flex items-center justify-center gap-8 py-4 opacity-40 grayscale group-hover:grayscale-0 transition-all">
                <img src="/images/visa.png" alt="Visa" className="h-4 object-contain" />
                <img src="/images/mastercard.png" alt="Mastercard" className="h-4 object-contain" />
                <img src="/images/upi.png" alt="UPI" className="h-4 object-contain" />
              </div>
            </div>

            {/* Information Accordion (Maybell Inspired) */}
            <div className="border-t border-charcoal/10 pt-4 space-y-2 text-charcoal/80">
              {[
                { id: 'description', title: 'Product Details', content: product.description },
                ...(materialGuide ? [{
                  id: 'fabric-guide',
                  title: 'Material Guide',
                  isFabricGuide: true,
                }] : []),
                { id: 'shipping', title: 'Shipping & Delivery', content: SHIPPING_DELIVERY_COPY },
                { id: 'return', title: 'Returns & Exchanges', content: 'This product is returnable within 14 days of delivery. Returns are not applicable on styles under Sale Section. Please ensure labels are intact.' }
              ].map((item) => {
                return (
                <div key={item.id} className="group">
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    data-testid={`accordion-${item.id}`}
                    className="w-full py-4 flex items-center justify-between text-[11px] uppercase font-bold tracking-widest group-hover:text-charcoal"
                  >
                    <span className="flex items-center gap-2">
                      {item.isFabricGuide && <Layers className="w-3.5 h-3.5 text-royal-maroon/60" />}
                      {item.title}
                    </span>
                    <motion.span animate={{ rotate: activeAccordion === item.id ? 180 : 0 }}>
                      <ChevronDown className="w-3 h-3" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {activeAccordion === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {item.isFabricGuide && materialGuide ? (
                          <div data-testid="fabric-guide-content" className="pb-6 space-y-5">
                            {(product.fabric || materialGuide.description) && (
                              <div>
                                {product.fabric && (
                                  <span className="inline-block text-xs font-bold uppercase tracking-widest text-royal-maroon/70 bg-royal-maroon/5 px-3 py-1 rounded-full mb-3">
                                    {materialGuideLabel}
                                  </span>
                                )}
                                {materialGuide.description && (
                                  <p className="text-sm leading-relaxed text-charcoal/60 font-medium">
                                    {materialGuide.description}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Properties */}
                            {materialGuide.properties.length > 0 && (
                              <div>
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 mb-2">Key Properties</h4>
                                <div className="flex flex-wrap gap-2">
                                  {materialGuide.properties.map((prop, i) => (
                                    <span key={i} className="text-xs font-medium text-charcoal/70 bg-charcoal/[0.03] border border-charcoal/8 px-3 py-1.5 rounded-lg">
                                      {prop}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Care Instructions */}
                            {materialGuide.care.length > 0 && (
                              <div>
                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-charcoal/40 mb-2">Care Instructions</h4>
                                <ul className="space-y-1.5">
                                  {materialGuide.care.map((instruction, i) => (
                                    <li key={i} className="text-sm text-charcoal/60 font-medium flex items-start gap-2">
                                      <span className="w-1 h-1 rounded-full bg-royal-maroon/40 mt-2 flex-shrink-0" />
                                      {instruction}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Origin */}
                            {materialGuide.origin && (
                              <div className="pt-2 border-t border-charcoal/5">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/30">Origin: </span>
                                <span className="text-xs font-medium text-charcoal/50">{materialGuide.origin}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="pb-6 text-sm leading-relaxed text-charcoal/60 font-medium">
                            {item.content}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                );
              })}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 pt-10 border-t border-charcoal/5">
              {[
                { label: 'Fabric', value: product.fabric },
                { label: 'Craft Style', value: product.craft_style },
                { label: 'Origin', value: product.state_of_origin },
                { label: 'Occasion', value: product.occasion },
                { label: 'Wash Care', value: 'Dry Clean Only' }
              ].filter(s => s.value).map((spec, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-charcoal/30">{spec.label}</span>
                  <span className="text-sm font-medium text-charcoal">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Try-on Trigger */}
            {(product.category === 'Women Ethnic Wear' || product.subcategory?.includes('Saree')) && (
              <button 
                onClick={() => setTryOnModalOpen(true)}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-royal-maroon/5 to-charcoal/5 border border-charcoal/10 flex items-center justify-center gap-3 hover:shadow-lg transition-all"
              >
                <Sparkles className="w-5 h-5 text-royal-maroon" />
                <span className="text-sm font-bold uppercase tracking-widest text-charcoal">Virtual Try-On</span>
              </button>
            )}
            
            <TryOnModal
              open={tryOnModalOpen}
              onOpenChange={setTryOnModalOpen}
              product={product}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
        <CraftStorySection product={product} />
      </div>

      {/* Customer Reviews */}
      {reviews.total > 0 && (
        <section data-testid="reviews-section" className="bg-ivory py-16">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-heading tracking-tight">Customer Reviews</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-5 h-5 ${s <= Math.round(reviews.average) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">{reviews.average}</span>
                  <span className="text-muted-foreground">({reviews.total} reviews)</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.reviews.slice(0, 6).map((review, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-xl p-6 border border-charcoal/5 shadow-sm"
                  data-testid={`review-${i}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    {review.verified && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Verified</span>}
                  </div>
                  <p className="text-sm text-charcoal/80 mb-3 leading-relaxed">{review.comment}</p>
                  <p className="text-xs text-muted-foreground font-medium">{review.user}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="bg-white py-24">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
            <h2 className="text-4xl font-heading text-center mb-16 tracking-tight">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {recommendations.map((rec) => (
                <ProductCard key={rec.id} product={rec} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
