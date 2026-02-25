import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { productsAPI } from '../lib/api';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { ShoppingCart, Heart, Truck, Shield, RefreshCw, Sparkles } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';
import CraftStorySection from '../components/CraftStorySection';
import LuxuryBadge from '../components/LuxuryBadge';
import TryOnModal from '../components/VirtualTryOn/TryOnModal';
import { motion } from 'framer-motion';

const ProductDetailPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const [productRes, recsRes] = await Promise.all([
          productsAPI.getById(id),
          productsAPI.getRecommendations(id),
        ]);
        setProduct(productRes.data);
        setRecommendations(recsRes.data);
        if (productRes.data.variations?.length > 0) {
          setSelectedVariation(productRes.data.variations[0]);
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

  useEffect(() => {
    if (product) {
      console.log('--- Product Debug Info ---');
      console.log('ID:', product.id);
      console.log('Raw size_stock:', product.size_stock);
      console.log('Raw color_stock:', product.color_stock);
      console.log('Raw variations:', product.variations);
    }
  }, [product]);

  const handleAddToCart = async () => {
    if ((product.size_stock?.length > 0 && !selectedSize) || (product.color_stock?.length > 0 && !selectedColor)) {
      toast.error('Please select both size and color');
      return;
    }
    try {
      // Choose between custom variations (size/color) or legacy variations array
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
      <div className="px-6 md:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-[600px] bg-muted animate-pulse rounded" />
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-6 md:px-12 lg:px-24 py-12 text-center">
        <p className="text-xl text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const displayPrice = product.sale_price || product.price;
  const hasDiscount = product.sale_price && product.sale_price < product.price;

  return (
    <div data-testid="product-detail-page" className="px-6 md:px-12 lg:px-24 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
        {/* Images */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-[3/4] overflow-hidden rounded mb-4"
          >
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </motion.div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  data-testid={`product-image-${index}`}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square overflow-hidden rounded border-2 ${selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                >
                  <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm text-muted-foreground">{product.category}</p>
            {product.luxury_collection && <LuxuryBadge />}
          </div>
          <h1 className="text-4xl font-heading font-medium tracking-tight mb-4">{product.name}</h1>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-medium">{formatPrice(displayPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <span className="bg-primary text-primary-foreground px-2 py-1 text-sm rounded">
                  {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          <p className="text-lg leading-relaxed text-muted-foreground mb-8">{product.description}</p>

          {/* Custom Size Selection */}
          {product.size_stock?.length > 0 ? (
            <div className="mb-6">
              <h3 className="font-body font-semibold mb-3">Select Size</h3>
              <div className="flex flex-wrap gap-2">
                {product.size_stock.map((item, index) => (
                  <Button
                    key={index}
                    variant={selectedSize === item.size ? 'default' : 'outline'}
                    onClick={() => setSelectedSize(item.size)}
                    disabled={item.qty === 0}
                    className={`min-w-[3rem] ${item.qty === 0 ? 'opacity-50 line-through' : ''}`}
                  >
                    {item.size}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            product.color_stock?.length > 0 && <div className="mb-2 text-sm text-muted-foreground">Standard size available</div>
          )}

          {/* Custom Color Selection */}
          {product.color_stock?.length > 0 && (
            <div className="mb-8">
              <h3 className="font-body font-semibold mb-3">Select Color</h3>
              <div className="flex flex-wrap gap-3">
                {product.color_stock.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedColor(item.color)}
                    disabled={item.qty === 0}
                    title={item.color}
                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${selectedColor === item.color ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                      } ${item.qty === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-black/10"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.qty === 0 && <div className="absolute w-10 h-[1px] bg-red-500 rotate-45" />}
                  </button>
                ))}
              </div>
              {selectedColor && <p className="text-sm mt-2 text-muted-foreground capitalize">Selected: {selectedColor}</p>}
            </div>
          )}

          {/* Legacy Variations fallback */}
          {(!product.size_stock?.length && !product.color_stock?.length && product.variations?.length > 0) && (
            <div className="mb-8">
              <h3 className="font-body font-semibold mb-4">Select Variation</h3>
              <div className="flex flex-wrap gap-2">
                {product.variations.map((variation, index) => (
                  <Button
                    key={index}
                    variant={selectedVariation === variation ? 'default' : 'outline'}
                    onClick={() => setSelectedVariation(variation)}
                  >
                    {variation.size} - {variation.color}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mb-4">
            <Button
              data-testid="add-to-cart-button"
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={!product.in_stock}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            <Button data-testid="wishlist-button" variant="outline" size="lg">
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          {/* Virtual Try-On Button - Only for clothing items */}
          {(product.category === 'Women Ethnic Wear' || product.subcategory?.includes('Saree') || product.subcategory?.includes('Lehenga')) && (
            <Button
              data-testid="try-on-button"
              variant="secondary"
              size="lg"
              className="w-full mb-8"
              onClick={() => setTryOnModalOpen(true)}
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Virtual Try-On
            </Button>
          )}

          {/* Try-On Modal */}
          <TryOnModal
            open={tryOnModalOpen}
            onOpenChange={setTryOnModalOpen}
            product={product}
          />

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 py-8 border-y border-border mb-8">
            <div className="text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Free Shipping</p>
              <p className="text-xs text-muted-foreground">Above ₹999</p>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Authentic</p>
              <p className="text-xs text-muted-foreground">Handcrafted</p>
            </div>
            <div className="text-center">
              <RefreshCw className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Easy Returns</p>
              <p className="text-xs text-muted-foreground">7 Days</p>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {product.fabric && (
              <div>
                <h3 className="font-body font-semibold mb-2">Fabric</h3>
                <p className="text-muted-foreground font-accent italic">{product.fabric}</p>
              </div>
            )}
            {product.craft_style && (
              <div>
                <h3 className="font-body font-semibold mb-2">Craft Style</h3>
                <p className="text-muted-foreground">{product.craft_style}</p>
              </div>
            )}
            {product.state_of_origin && (
              <div>
                <h3 className="font-body font-semibold mb-2">Origin</h3>
                <p className="text-muted-foreground">{product.state_of_origin}, India</p>
              </div>
            )}
            {product.occasion && (
              <div>
                <h3 className="font-body font-semibold mb-2">Occasion</h3>
                <p className="text-muted-foreground">{product.occasion}</p>
              </div>
            )}
            {product.care_instructions && (
              <div>
                <h3 className="font-body font-semibold mb-2">Care Instructions</h3>
                <p className="text-muted-foreground">{product.care_instructions}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Craft Story Section */}
      <div className="mb-16">
        <CraftStorySection product={product} />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="recommendations-grid">
            {recommendations.map((rec) => (
              <ProductCard key={rec.id} product={rec} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;