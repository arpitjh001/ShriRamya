import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productsAPI, wishlistAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import {
  ShoppingBag,
  Heart,
  Sparkles,
  ChevronDown,
  Layers,
  Star,
  Share2,
  PackageCheck,
  Palette,
  Ruler,
  Tag,
  UserRound,
  BadgeCheck,
  Truck,
  RotateCcw,
  ShieldCheck,
  Gem,
} from 'lucide-react';
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
import { getCartErrorMessage } from '../utils/cartError';
import { trackAnalyticsEvent } from '../services/analyticsTracker';

const SHIPPING_DELIVERY_COPY = 'Orders are dispatched within 24-48 hours across India. International orders may take 5-7 business days. Shipping charges are calculated at checkout.';
const PRODUCT_IMAGE_FALLBACK = '/uploads/woocommerce-placeholder.webp';

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

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')   // Remove all non-word chars
    .replace(/--+/g, '-');      // Replace multiple - with single -
};

const formatDisplayList = (values = [], fallback = '') => {
  const list = Array.isArray(values) ? values : [values];
  const normalized = Array.from(new Set(
    list
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  ));

  if (normalized.length === 0) return fallback;
  if (normalized.length <= 3) return normalized.join(', ');
  return `${normalized.slice(0, 3).join(', ')} +${normalized.length - 3}`;
};

const getCategoryLabel = (product = {}) => {
  if (Array.isArray(product.categories) && product.categories.length > 0) {
    const categoryNames = product.categories
      .map((category) => category?.name || category?.slug)
      .filter(Boolean);

    if (categoryNames.length > 0) {
      return categoryNames.join(', ');
    }
  }

  return product.category || product.categoryName || 'Collection';
};

const COLOR_SWATCHES = {
  black: '#1A1A1A',
  white: '#FFFFFF',
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  yellow: '#EAB308',
  pink: '#EC4899',
  purple: '#7C3AED',
  orange: '#EA580C',
  grey: '#6B7280',
  gray: '#6B7280',
  navy: '#1E3A5F',
  brown: '#92400E',
  maroon: '#7F1D1D',
  gold: '#D4A843',
  cream: '#FFFDD0',
  ivory: '#FFFFF0',
  wine: '#722F37',
  mustard: '#E2B714',

  // Curated fashion & ethnic colors
  'mustard yellow': '#FFDB58',
  'haldi': '#F6C324',
  'haldi yellow': '#F6C324',
  'rani': '#E0115F',
  'rani pink': '#E0115F',
  'mehendi': '#556B2F',
  'mehendi green': '#556B2F',
  'wine red': '#722F37',
  'peacock blue': '#005F69',
  'off white': '#FAF9F6',
  'onion pink': '#E6A8A8',
  'gajri': '#F28C8C',
  'peach': '#FFE5B4',
  'fuchsia': '#FF00FF',
  'magenta': '#FF00FF',
  'turquoise': '#40E0D0',
  'teal': '#008080',
  'coral': '#FF7F50',
  'rust': '#B7410E',
  'olive green': '#808000',
  'bottle green': '#006A4E',
  'emerald green': '#50C878',
  'sage green': '#9CAF88',
  'lavender': '#E6E6FA',
  'mauve': '#E0B0FF',
  'lilac': '#C8A2C8',
  'navy blue': '#000080',
  'royal blue': '#4169E1',
  'sky blue': '#87CEEB',
  'golden': '#FFD700',
  'copper': '#B87333',
  'bronze': '#CD7F32',
  'charcoal': '#36454F'
};

const getColorSwatch = (color) => {
  if (!color) return '#CCCCCC';
  const cleanColor = String(color).trim().toLowerCase();
  return COLOR_SWATCHES[cleanColor] || cleanColor;
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
        trackAnalyticsEvent('product_view', {
          user_id: user?._id || user?.id || null,
          product_id: productRes.data?.id || productRes.data?._id || productRes.data?.productId || id,
          category_id: productRes.data?.categoryId || productRes.data?.category || productRes.data?.categories?.[0]?._id || null,
          metadata: {
            product_name: productRes.data?.name,
            sku: productRes.data?.sku,
          },
        });

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
        const pid = product.productId || product.id;
        const res = await wishlistAPI.check(pid);
        setWish(Boolean(res?.data?.inWishlist));
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

  const hasTrackedProductStock = product
    ? product.totalStock !== undefined || product.stock_quantity !== undefined || product.stock !== undefined
    : false;
  const productStock = Number(product?.totalStock ?? product?.stock_quantity ?? product?.stock ?? 0) || 0;
  const variantMatrixStock = variantMatrix.reduce((sum, variant) => sum + getVariantStock(variant), 0);
  const selectedVariantOutOfStock = variantStock?.isOutOfStock === true;
  const productOutOfStock = variantMatrix.length > 0
    ? variantMatrixStock <= 0 || selectedVariantOutOfStock
    : hasTrackedProductStock
    ? productStock <= 0
    : product?.in_stock === false || product?.stock_status === 'outofstock';

  const handleAddToCart = async () => {
    if (productOutOfStock) {
      toast.error('This product is out of stock');
      return false;
    }

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
      toast.error(getCartErrorMessage(error));
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
      const pid = product.productId || product.id;

      if (wish) {
        await wishlistAPI.remove(pid);
        setWish(false);
        toast.success('Removed from wishlist');
      } else {
        await wishlistAPI.add(pid);
        setWish(true);
        trackAnalyticsEvent('wishlist_added', {
          user_id: user?._id || user?.id || null,
          product_id: product.id || product._id || product.productId || pid,
          metadata: { product_name: product.name },
        });
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
  const customMaterialGuide = normalizeMaterialGuide(product.materialGuide);
  const materialGuide = customMaterialGuide || getFabricGuide(product.fabric);
  const materialGuideLabel = product.fabric || 'Material Guide';
  const productImages = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.thumbnail,
    product.image,
  ].filter(Boolean);
  const displayImages = [...new Set(productImages.length > 0 ? productImages : [PRODUCT_IMAGE_FALLBACK])];
  const activeImage = displayImages[selectedImage] || displayImages[0];
  const galleryImages = displayImages.slice(0, 6);
  const categoryLabel = getCategoryLabel(product);
  const visibleSizeOptions = availableSizes.filter(size => String(size).toLowerCase() !== 'free size');
  const colorSummary = formatDisplayList(availableColors, product.color || 'Curated tones');
  const sizeSummary = formatDisplayList(visibleSizeOptions, product.sizes?.length ? formatDisplayList(product.sizes) : 'Free size');
  const aggregateStock = variantMatrix.length > 0 ? variantMatrixStock : productStock;
  const stockSummary = productOutOfStock
    ? 'Out of stock'
    : aggregateStock > 0
    ? `${aggregateStock} available`
    : 'Ready to ship';
  const selectedSku = selectedVariation?.sku || product.sku;
  const productHighlights = [
    {
      label: 'Availability',
      value: stockSummary,
      icon: PackageCheck,
      className: productOutOfStock ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    { label: 'Colors', value: colorSummary, icon: Palette, className: 'text-secondary bg-secondary/5 border-secondary/15' },
    { label: 'Sizes', value: sizeSummary, icon: Ruler, className: 'text-primary bg-primary/5 border-primary/15' },
    { label: 'SKU', value: selectedSku || 'N/A', icon: Tag, className: 'text-charcoal bg-charcoal/[0.03] border-charcoal/10' },
  ];
  const fitDetails = [
    product.modelWears ? { label: 'Model wears', value: product.modelWears, icon: UserRound } : null,
    product.modelHeight ? { label: 'Model height', value: product.modelHeight, icon: Ruler } : null,
  ].filter(Boolean);
  const productSpecs = [
    { label: 'Fabric', value: product.fabric, icon: Layers },
    { label: 'Occasion', value: product.occasion, icon: Sparkles },
    { label: 'Category', value: categoryLabel, icon: BadgeCheck },
    { label: 'Work', value: product.work, icon: Gem },
    { label: 'Origin', value: materialGuide?.origin || product.state_of_origin, icon: BadgeCheck },
    { label: 'Brand', value: product.brand, icon: Gem },
    { label: 'Model wears', value: product.modelWears, icon: UserRound },
    { label: 'Model height', value: product.modelHeight, icon: Ruler },
  ].filter((spec) => spec.value);
  const serviceNotes = [
    { label: 'Dispatch', value: '24-48 hours', icon: Truck },
    { label: 'Returns', value: '14 days', icon: RotateCcw },
    { label: 'Payments', value: 'Secure checkout', icon: ShieldCheck },
  ];

  const toggleAccordion = (id) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="bg-white min-h-screen">
      <SEOMeta 
        title={product?.name}
        description={product?.description?.slice(0, 160) || `Buy ${product?.name} at ShriRamya - Premium Indian Handloom`}
        image={activeImage}
        url={`/products/${id}`}
        type="product"
      />
      {/* Breadcrumbs */}
      <nav className="max-w-[1320px] mx-auto px-4 md:px-6 lg:px-8 pt-5 md:pt-7 pb-4">
        <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40">
          <li><Link to="/" className="hover:text-royal-maroon transition-colors">Home</Link></li>
          <li className="flex items-center gap-2">
            <span>/</span>
            <Link 
              to={`/category/${product.categorySlug || slugify(product.category || product.categoryName)}`} 
              className="hover:text-royal-maroon transition-colors"
            >
              {categoryLabel}
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-2 text-charcoal/80 italic">
            <span>/</span>
            <span className="break-words">{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Left Column: Media Gallery */}
          <div className="min-w-0 lg:col-span-7">
            <div className="lg:sticky lg:top-24">
              <div className="mx-auto w-full max-w-[480px]">
                <motion.div
                  layoutId={`product-hero-${product.id}`}
                  className="relative overflow-hidden rounded-2xl border border-accent/15 bg-white p-2 shadow-[0_24px_70px_rgba(31,31,31,0.12)]"
                  data-testid="product-detail-image-frame"
                >
                  <div className="pointer-events-none absolute inset-2 z-10 rounded-xl ring-1 ring-inset ring-white/50" />
                  <div className="absolute left-4 top-4 z-20 rounded-full border border-white/60 bg-charcoal/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
                    Standard Fit
                  </div>
                  {hasDiscount && (
                    <div className="absolute right-4 top-4 z-20 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm">
                      {Math.round(((regularPrice - salePrice) / regularPrice) * 100)}% Off
                    </div>
                  )}
                  {product.luxury_collection && (
                    <div className="absolute bottom-4 left-4 z-20">
                      <LuxuryBadge className="border-white/50 bg-white/85 px-3 py-1.5 backdrop-blur-md" />
                    </div>
                  )}
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f7f4ef]">
                    <img
                      src={activeImage}
                      alt={product.name}
                      className="h-full w-full object-contain object-center p-2 transition-transform duration-700 hover:scale-[1.015] sm:p-3"
                      data-testid="product-detail-main-image"
                    />
                  </div>
                </motion.div>

                {displayImages.length > 1 && (
                  <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-6 lg:overflow-visible">
                    {galleryImages.map((img, index) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => setSelectedImage(index)}
                        className={`h-[74px] w-[58px] shrink-0 overflow-hidden rounded-xl border bg-white p-1 transition-all duration-300 sm:h-[92px] sm:w-[74px] lg:h-auto lg:w-full lg:aspect-[4/5] ${
                          selectedImage === index
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-accent/20 opacity-75 hover:border-accent/50 hover:opacity-100'
                        }`}
                        aria-label={`View ${product.name} image ${index + 1}`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} ${index + 1}`}
                          className="h-full w-full rounded-lg object-cover object-center"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Information (Sticky) */}
          <div className="min-w-0 lg:col-span-5 h-fit lg:sticky lg:top-24 space-y-5 lg:max-w-[500px]">
            <div className="rounded-2xl border border-accent/10 bg-white/90 p-4 shadow-[0_18px_50px_rgba(31,31,31,0.07)] backdrop-blur sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <span className="rounded-full bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/75">
                  {categoryLabel}
                </span>
                <button
                  onClick={handleToggleWishlist}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/15 bg-white shadow-sm transition-colors ${wish ? 'text-royal-maroon' : 'text-charcoal/45 hover:text-royal-maroon'}`}
                  data-testid="wishlist-btn"
                  aria-label={wish ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`w-5 h-5 ${wish ? 'fill-current' : ''}`} />
                </button>
              </div>

              <h1 className="text-2xl font-heading font-medium leading-tight text-charcoal break-words sm:text-[30px]">
                {product.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="text-2xl font-semibold text-primary sm:text-3xl">{formatPrice(displayPrice)}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-charcoal/35 line-through decoration-royal-maroon/30">{formatPrice(regularPrice)}</span>
                    <span className="rounded-full bg-royal-maroon/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-royal-maroon">
                      {Math.round(((regularPrice - salePrice) / regularPrice) * 100)}% Off
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs font-medium text-charcoal/45">Inclusive of all taxes</p>

              {product.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-charcoal/60">
                  {product.description}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {productHighlights.map((highlight) => {
                  const Icon = highlight.icon;
                  return (
                    <div key={highlight.label} className={`min-w-0 rounded-xl border px-3 py-3 ${highlight.className}`}>
                      <Icon className="mb-1.5 h-4 w-4" />
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-60">{highlight.label}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-charcoal">{highlight.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {fitDetails.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {fitDetails.map((detail) => {
                  const Icon = detail.icon;
                  return (
                    <div key={detail.label} className="flex items-center gap-3 rounded-xl border border-accent/15 bg-muted/20 px-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/40">{detail.label}</span>
                        <span className="block truncate text-sm font-semibold text-charcoal">{detail.value}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selection Options - Variant Matrix System */}
            <div className="space-y-5 rounded-2xl border border-accent/10 bg-white/80 p-4 shadow-sm">
              {/* Color Selection - Variant Matrix */}
              {availableColors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/70">
                      Color
                    </label>
                    <span className="text-xs font-semibold text-charcoal/50">{selectedColor || 'Choose a tone'}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {availableColors.map((color, index) => {
                      const hasStock = variantMatrix.some(v => getVariantColor(v) === color && getVariantStock(v) > 0);
                      const isSelected = selectedColor === color;
                      const matchedVariant = variantMatrix.find(v => getVariantColor(v) === color);
                      const resolvedHex = matchedVariant?.hexCode || matchedVariant?.attributes?.hexCode;
                      const swatchBg = (resolvedHex && resolvedHex !== '#CCCCCC') ? resolvedHex : getColorSwatch(color);

                      return (
                        <button
                          key={index}
                          onClick={() => handleColorSelect(color)}
                          disabled={!hasStock}
                          className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 shadow-sm transition-all duration-300 ${
                            isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-white scale-105' : 'ring-1 ring-accent/15'
                          } ${!hasStock ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'}`}
                          aria-label={`Select ${color}`}
                        >
                          <div
                            className="h-full w-full rounded-full border border-charcoal/10 shadow-inner"
                            style={{ backgroundColor: swatchBg }}
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
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/70">Select Size</label>
                    <button className="text-[10px] uppercase font-bold text-royal-maroon hover:underline tracking-widest opacity-70">Size Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
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
                          className={`relative flex h-11 min-w-[48px] items-center justify-center rounded-xl border px-3 text-sm font-bold transition-all duration-300 ${
                            isSelected
                              ? 'bg-charcoal text-white border-charcoal shadow-md'
                              : 'bg-white text-charcoal border-accent/20 hover:border-charcoal/60'
                          } ${!isAvailable ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                        >
                          {size}
                          {!isAvailable && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                              <span className="text-[8px] font-bold text-charcoal/50 rotate-12">SOLD OUT</span>
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={productOutOfStock}
                  className="h-12 w-full rounded-xl bg-charcoal px-4 text-center text-xs font-bold uppercase leading-tight tracking-[0.14em] text-white shadow-[0_16px_34px_rgba(31,31,31,0.18)] transition-all hover:bg-black disabled:cursor-not-allowed disabled:bg-charcoal/20 disabled:text-charcoal/45 sm:flex-[2]"
                >
                  <ShoppingBag className="mr-3 h-5 w-5 shrink-0" />
                  {productOutOfStock ? 'Out of Stock' : 'Add to Shopping Bag'}
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
                  disabled={productOutOfStock}
                  className="h-12 w-full rounded-xl border-charcoal/25 bg-white px-4 text-center text-xs font-bold uppercase leading-tight tracking-[0.14em] transition-all hover:border-charcoal hover:bg-muted/30 disabled:cursor-not-allowed disabled:border-charcoal/10 disabled:bg-charcoal/5 disabled:text-charcoal/40 sm:flex-1"
                >
                  Buy Now
                </Button>
              </div>
              
              {/* WhatsApp Share */}
              <button
                data-testid="whatsapp-share-btn"
                onClick={() => {
                  const url = window.location.href;
                  const text = `Check out ${product.name} at Rs.${displayPrice.toLocaleString()} on ShriRamya!`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/20 bg-[#25D366]/10 py-3 text-sm font-semibold text-[#1E9F53] transition-colors hover:bg-[#25D366]/20"
              >
                <Share2 className="w-4 h-4" /> Share on WhatsApp
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {serviceNotes.map((note) => {
                const Icon = note.icon;
                return (
                  <div key={note.label} className="rounded-xl border border-accent/10 bg-muted/20 px-2.5 py-3 text-center">
                    <Icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/40">{note.label}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-charcoal/75">{note.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Information Accordion (Maybell Inspired) */}
            <div className="space-y-2 text-charcoal/80">
              {[
                { id: 'description', title: 'Product Details', content: product.description, icon: Gem },
                ...(materialGuide ? [{
                  id: 'fabric-guide',
                  title: 'Material Guide',
                  isFabricGuide: true,
                  icon: Layers,
                }] : []),
                { id: 'shipping', title: 'Shipping & Delivery', content: SHIPPING_DELIVERY_COPY, icon: Truck },
                { id: 'return', title: 'Returns & Exchanges', content: 'This product is returnable within 14 days of delivery. Returns are not applicable on styles under Sale Section. Please ensure labels are intact.', icon: RotateCcw }
              ].map((item) => {
                const Icon = item.icon;
                return (
                <div key={item.id} className="group rounded-2xl border border-accent/10 bg-white/70 px-4">
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    data-testid={`accordion-${item.id}`}
                    className="w-full py-4 flex items-center justify-between text-[11px] uppercase font-bold tracking-widest group-hover:text-charcoal"
                  >
                    <span className="flex items-center gap-2">
                      {Icon && <Icon className="w-3.5 h-3.5 text-royal-maroon/60" />}
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
            {productSpecs.length > 0 && (
              <div className="rounded-2xl border border-accent/10 bg-muted/15 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal/70">Product Parameters</h2>
                  <Sparkles className="h-4 w-4 text-primary/45" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {productSpecs.map((spec) => {
                    const Icon = spec.icon;
                    return (
                      <div key={`${spec.label}-${spec.value}`} className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-3 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/40">{spec.label}</span>
                          <span className="block truncate text-sm font-semibold text-charcoal">{spec.value}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
