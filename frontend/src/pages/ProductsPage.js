import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Filter } from 'lucide-react';
import { formatPrice } from '../utils';

const MAX_PRICE = 100000;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = React.useRef();

  const lastProductElementRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prevPage) => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');

  const fetchProducts = useCallback(async (currentPage = 1, isReset = false) => {
    try {
      if (isReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = {
        page: currentPage,
        per_page: 12,
      };

      if (subcategory) {
        params.category = subcategory;
      } else if (category) {
        params.category = category;
      }

      const response = await productsAPI.getAll(params);
      const apiData = response?.data?.data || response?.data || [];
      const newProducts = Array.isArray(apiData) ? apiData : [];

      if (isReset) {
        setProducts(newProducts);
      } else {
        setProducts((prev) => [...prev, ...newProducts]);
      }

      setHasMore(newProducts.length === 12);
    } catch (err) {
      console.error('Product fetch failed:', err);
      setError('Unable to load products. Please try again.');
      if (isReset) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, subcategory]);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [fetchProducts]);

  useEffect(() => {
    if (page > 1) {
      fetchProducts(page, false);
    }
  }, [page, fetchProducts]);

  const filteredProducts = products.filter((p) => {
    const price = Number(p.sale_price || p.price || 0);
    return price >= priceRange[0] && price <= priceRange[1];
  });

  const formatTitle = (slug) => {
    if (!slug) return null;
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const pageTitle = formatTitle(subcategory) || formatTitle(category) || 'All Products';

  return (
    <div className="min-h-screen px-6 py-16 md:px-12 md:py-20 lg:px-20">
      <div className="mb-12 md:mb-14">
        <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-secondary">Luxury Catalogue</p>
        <h1 className="text-4xl font-medium text-primary md:text-5xl">{pageTitle}</h1>
        {!loading && (
          <p className="mt-3 text-sm text-muted-foreground">{filteredProducts.length} items found</p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className={`lg:sticky lg:top-32 lg:h-fit ${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="glass-luxury rounded-[1.5rem] p-6">
            <div className="mb-7 flex items-center justify-between">
              <h3 className="font-heading text-2xl text-primary">Refine</h3>
              <span className="text-[10px] uppercase tracking-[0.22em] text-secondary">Filters</span>
            </div>

            <div className="space-y-8">
              <div>
                <Button
                  className="w-full justify-start"
                  variant={!category && !subcategory ? 'default' : 'outline'}
                  onClick={() => setSearchParams({})}
                >
                  All Products
                </Button>
              </div>

              <div>
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-secondary">
                  Price Range
                </h4>
                <Slider
                  min={0}
                  max={MAX_PRICE}
                  step={1000}
                  value={priceRange}
                  onValueChange={setPriceRange}
                />
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="border-accent/35 bg-background/80"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {loading && (
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-luxury h-[430px] animate-pulse rounded-[1.4rem]" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="glass-luxury rounded-[1.5rem] py-16 text-center">
              <p className="text-red-500">{error}</p>
              <Button onClick={() => fetchProducts(1, true)} className="mt-4">
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product, index) => {
                const isLastElement = filteredProducts.length === index + 1;
                return (
                  <div key={product.id || index} ref={isLastElement ? lastProductElementRef : null}>
                    <ProductCard product={product} />
                  </div>
                );
              })}
            </div>
          )}

          {loadingMore && (
            <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={`loading-more-${i}`} className="glass-luxury h-[430px] animate-pulse rounded-[1.4rem]" />
              ))}
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="glass-luxury rounded-[1.5rem] py-16 text-center">
              <p className="mb-4 text-muted-foreground">No products found in this price range.</p>
              <Button asChild>
                <Link to="/products">View All</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
