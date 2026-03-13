import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { ShoppingCart, Heart, Truck, Shield, RefreshCw, Sparkles } from 'lucide-react';
import { formatPrice } from '../utils';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';
import CraftStorySection from '../components/CraftStorySection';
import LuxuryBadge from '../components/LuxuryBadge';
import TryOnModal from '../components/VirtualTryOn/TryOnModal';
import { motion } from 'framer-motion';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState('description');

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

        const variantsData = productRes.data?.variants || productRes.data?.variations || [];
        if (variantsData.length > 0) {
          setSelectedVariation(variantsData[0]);
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

  const handleAddToCart = async () => {
    if ((product.size_stock?.length > 0 && !selectedSize) || (product.color_stock?.length > 0 && !selectedColor)) {
      toast.error('Please select both size and color');
      return;
    }
    try {
      const hasCustomVariations = product.size_stock?.length > 0 || product.color_stock?.length > 0;
      let variation = hasCustomVariations
        ? { size: selectedSize, color: selectedColor }
        : selectedVariation;

      if (variation && !variation.size && !variation.color) {
        variation = null;
      }

      await addToCart(product.id, 1, variation);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
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

  const toggleAccordion = (id) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="bg-[#F7F3EC] min-h-screen">
      {/* Breadcrumbs */}
      <nav className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-12 pb-6">
        <ol className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-charcoal/40">
          <li><Link to="/" className="hover:text-royal-maroon transition-colors">Home</Link></li>
          <li className="flex items-center gap-2">
            <span>/</span>
            <Link to={`/category/${product.category?.toLowerCase()}`} className="hover:text-royal-maroon transition-colors">{product.category}</Link>
          </li>
          <li className="flex items-center gap-2 text-charcoal/80 italic">
            <span>/</span>
            <span>{product.name}</span>
          </li>
        </ol>
      </nav>

      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          
          {/* Left Column: Media Gallery */}
          <div className="lg:col-span-7 space-y-4">
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
          <div className="lg:col-span-5 h-fit lg:sticky lg:top-32 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-[0.3em] text-royal-maroon/60">
                  {product.category}
                </span>
                <button className="p-2 hover:bg-white rounded-full transition-colors text-charcoal/40 hover:text-royal-maroon">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-heading font-medium text-charcoal tracking-tight leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-4">
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

            {/* Model Info (Inspiration from Maybell) */}
            <div className="bg-white/40 border border-white/60 p-5 rounded-2xl flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold tracking-widest text-charcoal/40">Model wears</span>
                <span className="text-sm font-medium text-charcoal">Size S (Medium)</span>
              </div>
              <div className="w-[1px] h-8 bg-charcoal/10" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold tracking-widest text-charcoal/40">Height</span>
                <span className="text-sm font-medium text-charcoal">5'9" ft</span>
              </div>
              <Sparkles className="ml-auto w-5 h-5 text-royal-maroon/30 animate-pulse" />
            </div>

            {/* Selection Options */}
            <div className="space-y-8">
              {/* Size Select */}
              {product.size_stock?.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-charcoal/80">Select Size</label>
                    <button className="text-[10px] uppercase font-bold text-royal-maroon hover:underline tracking-widest opacity-60">Size Guide</button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.size_stock.map((item, index) => (
                      <button
                        key={index}
                        disabled={item.qty === 0}
                        onClick={() => setSelectedSize(item.size)}
                        className={`min-w-[50px] h-[50px] rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 border ${
                          selectedSize === item.size 
                            ? 'bg-charcoal text-white border-charcoal shadow-lg shadow-charcoal/20' 
                            : 'bg-white text-charcoal border-charcoal/5 hover:border-charcoal/20'
                        } ${item.qty === 0 ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
                      >
                        {item.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Swatches */}
              {product.color_stock?.length > 0 && (
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-charcoal/80">Color: <span className="text-charcoal/60 capitalize">{selectedColor || 'Choose'}</span></label>
                  <div className="flex flex-wrap gap-4">
                    {product.color_stock.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedColor(item.color)}
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          selectedColor === item.color ? 'ring-2 ring-charcoal ring-offset-4 ring-offset-[#F7F3EC]' : ''
                        }`}
                      >
                         <div 
                          className="w-full h-full rounded-full shadow-inner border border-charcoal/5"
                          style={{ backgroundColor: item.color }}
                         />
                         {item.qty === 0 && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-full flex items-center justify-center text-[10px] font-bold text-charcoal opacity-50">SOLD</div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.in_stock}
                  className="flex-[2] h-16 rounded-2xl bg-charcoal text-white hover:bg-black transition-all text-sm uppercase font-bold tracking-widest"
                >
                  <ShoppingCart className="w-5 h-5 mr-3" />
                  {product.in_stock ? 'Add to Shopping Bag' : 'Out of Stock'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-16 rounded-2xl border-charcoal/10 hover:border-charcoal bg-white transition-all text-sm uppercase font-bold tracking-widest"
                >
                  Buy Now
                </Button>
              </div>
              
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
                { id: 'shipping', title: 'Shipping & Delivery', content: 'Orders are dispatched within 24-48 hours across India. International orders may take 5-7 business days. We offer free shipping on prepaid orders over ₹999.' },
                { id: 'return', title: 'Returns & Exchanges', content: 'This product is returnable within 14 days of delivery. Returns are not applicable on styles under Sale Section. Please ensure labels are intact.' }
              ].map((item) => (
                <div key={item.id} className="group">
                  <button 
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full py-4 flex items-center justify-between text-[11px] uppercase font-bold tracking-widest group-hover:text-charcoal"
                  >
                    {item.title}
                    <motion.span animate={{ rotate: activeAccordion === item.id ? 180 : 0 }}>
                      <Menu className="w-3 h-3" />
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
                        <p className="pb-6 text-sm leading-relaxed text-charcoal/60 font-medium">
                          {item.content}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-y-6 pt-10 border-t border-charcoal/5">
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="bg-white py-24">
          <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
            <h2 className="text-4xl font-heading text-center mb-16 tracking-tight">You May Also Like</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
