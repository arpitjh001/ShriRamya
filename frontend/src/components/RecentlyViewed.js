import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { productsAPI } from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'shriramya_recently_viewed';
const MAX_ITEMS = 12;

// Utility to get/set recently viewed product IDs
export const addToRecentlyViewed = (productId) => {
  if (!productId) return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = stored.filter(id => id !== productId);
    filtered.unshift(productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
};

export const getRecentlyViewedIds = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
};

const RecentlyViewed = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollPos, setScrollPos] = useState(0);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    const ids = getRecentlyViewedIds();
    if (ids.length === 0) { setLoading(false); return; }

    const fetchProducts = async () => {
      try {
        const promises = ids.slice(0, 8).map(id => productsAPI.getById(id).catch(() => null));
        const results = await Promise.all(promises);
        setProducts(results.filter(r => r?.data).map(r => r.data));
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setScrollPos(scrollRef.current.scrollLeft + amount);
  };

  if (loading || products.length === 0) return null;

  return (
    <section data-testid="recently-viewed-section" className="py-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-medium tracking-tight">Recently Viewed</h2>
          <div className="flex gap-2">
            <button
              data-testid="rv-scroll-left"
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              data-testid="rv-scroll-right"
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(product => (
            <div key={product.id} className="w-[calc((100vw-3rem)/2)] max-w-[220px] flex-shrink-0 sm:w-[220px]" data-testid={`rv-product-${product.id}`}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
