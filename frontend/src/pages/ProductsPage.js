import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import SortDropdown from '../components/SortDropdown';
import MobileFilterDrawer from '../components/MobileFilterDrawer';
import { Button } from '../components/ui/button';
import { X, SlidersHorizontal } from 'lucide-react';
import SEOMeta from '../components/SEOMeta';

const PER_PAGE = 20;
const ARRAY_FILTER_KEYS = ['category', 'size', 'color', 'fabric', 'occasion', 'pattern', 'style', 'neck', 'sleeve', 'brand', 'material'];
const ALL_FILTER_KEYS = [...ARRAY_FILTER_KEYS, 'discount', 'rating', 'price_min', 'price_max', 'in_stock'];

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // selectedFilters: { size: ['S','M'], color: ['Red'], price_min: 999, ... }
  const [selectedFilters, setSelectedFilters] = useState({});
  // filterMetadata: { sizes: {S:38,M:38}, colors: {Red:5}, priceRange: {min:999,max:74999}, ... }
  const [filterMetadata, setFilterMetadata] = useState({});
  const [sortBy, setSortBy] = useState('popularity');
  const [sortOptions, setSortOptions] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from URL on mount
  useEffect(() => {
    const initial = {};
    ALL_FILTER_KEYS.forEach(key => {
      const value = searchParams.get(key);
      if (value) {
        initial[key] = ARRAY_FILTER_KEYS.includes(key) ? value.split(',') : value;
      }
    });
    const sort = searchParams.get('sort');
    if (sort) setSortBy(sort);
    if (Object.keys(initial).length > 0) setSelectedFilters(initial);
    setIsInitialized(true);
  }, []);

  // Sync to URL
  const syncToURL = useCallback((filters, sort) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (!Array.isArray(value)) {
          params.set(key, String(value));
        }
      }
    });
    if (sort && sort !== 'popularity') params.set('sort', sort);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Build API params
  const buildParams = useCallback((pg) => {
    const params = { page: pg, per_page: PER_PAGE, sort: sortBy };
    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = Array.isArray(value) ? value.join(',') : value;
      }
    });
    return params;
  }, [selectedFilters, sortBy]);

  // Fetch
  const fetchProducts = useCallback(async (pg = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const response = await productsAPI.getAll(buildParams(pg));
      const newProducts = response.data || [];

      if (reset) setProducts(newProducts);
      else setProducts(prev => [...prev, ...newProducts]);

      if (response.filters && Object.keys(response.filters).length > 0) {
        setFilterMetadata(response.filters);
      }
      if (response.sortOptions?.length > 0) setSortOptions(response.sortOptions);
      setTotalProducts(response.pagination?.total || response.totalProducts || 0);
      setHasMore(response.pagination?.hasNext || newProducts.length === PER_PAGE);
    } catch (err) {
      setError('Unable to load products. Please try again.');
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Re-fetch on filter/sort change
  useEffect(() => {
    if (!isInitialized) return;
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
    syncToURL(selectedFilters, sortBy);
  }, [selectedFilters, sortBy, isInitialized]);

  // Pagination
  useEffect(() => {
    if (page > 1) fetchProducts(page, false);
  }, [page]);

  // Infinite scroll
  const lastRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  // FilterSidebar calls onFilterChange({ key: value }) - merge into selectedFilters
  const handleFilterChange = useCallback((filterObj) => {
    setSelectedFilters(prev => {
      const next = { ...prev };
      Object.entries(filterObj).forEach(([key, value]) => {
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === '') {
          delete next[key];
        } else {
          next[key] = value;
        }
      });
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedFilters({});
    setSortBy('popularity');
  }, []);

  const handleRemoveChip = useCallback((key, value) => {
    setSelectedFilters(prev => {
      const next = { ...prev };
      if (Array.isArray(next[key])) {
        next[key] = next[key].filter(v => v !== value);
        if (next[key].length === 0) delete next[key];
      } else {
        delete next[key];
      }
      return next;
    });
  }, []);

  // Active filter count
  const activeCount = useMemo(() =>
    Object.values(selectedFilters).reduce((c, v) => c + (Array.isArray(v) ? v.length : v ? 1 : 0), 0),
    [selectedFilters]
  );

  // Filter chips
  const chips = useMemo(() => {
    const arr = [];
    Object.entries(selectedFilters).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(v => arr.push({ key, value: v, label: v }));
      } else if (key === 'price_min') {
        const max = selectedFilters.price_max;
        arr.push({ key: 'price', value: 'range', label: `₹${val}${max ? ` - ₹${max}` : '+'}` });
      } else if (key === 'price_max' && !selectedFilters.price_min) {
        arr.push({ key: 'price', value: 'range', label: `Up to ₹${val}` });
      } else if (key === 'discount') {
        arr.push({ key, value: val, label: `${val}%+ off` });
      } else if (key === 'in_stock') {
        arr.push({ key, value: val, label: 'In Stock' });
      } else if (key !== 'price_max') {
        arr.push({ key, value: val, label: String(val) });
      }
    });
    return arr;
  }, [selectedFilters]);

  // Title
  const pageTitle = useMemo(() => {
    const cats = selectedFilters.category;
    if (cats?.length === 1) return cats[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return 'All Products';
  }, [selectedFilters]);

  return (
    <div className="min-h-screen bg-background">
      <SEOMeta 
        title={pageTitle || 'Shop All Products'}
        description={`Browse ${totalProducts || ''} premium Indian handloom products at ShriRamya. Filter by fabric, color, occasion and more.`}
        url="/products"
      />
      {/* Sticky Header Bar */}
      <div className="border-b border-accent/10 bg-background/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <h1 data-testid="page-title" className="text-lg font-semibold text-primary">{pageTitle}</h1>
              {!loading && (
                <span data-testid="product-count" className="text-sm text-muted-foreground">
                  ({totalProducts} products)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <SortDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
              </div>
              <Button
                data-testid="mobile-filter-toggle"
                variant="outline"
                size="sm"
                className="lg:hidden flex items-center gap-2"
                onClick={() => setMobileFilterOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Unstitched Suits Fabric Ribbon */}
      {selectedFilters.category?.length === 1 && selectedFilters.category[0] === 'unstitched-suits' && (
        <div className="bg-background border-b border-accent/5">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap mr-2">
                Subcategories
              </span>
              {['Chanderi', 'Maheshwari', 'Linen', 'Kota Doria'].map((fabric) => {
                const isSelected = selectedFilters.fabric?.includes(fabric);
                return (
                  <button
                    key={fabric}
                    onClick={() => {
                      const currentFabrics = selectedFilters.fabric || [];
                      const newFabrics = isSelected 
                        ? currentFabrics.filter(f => f !== fabric)
                        : [...currentFabrics, fabric];
                      handleFilterChange({ fabric: newFabrics.length > 0 ? newFabrics : undefined });
                    }}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20' 
                        : 'bg-accent/5 text-primary hover:bg-accent/15 border border-accent/10'
                    }`}
                  >
                    {fabric}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Applied Filter Chips */}
      {chips.length > 0 && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3 border-b border-accent/5">
          <div className="flex items-center gap-2 flex-wrap" data-testid="filter-chips">
            {chips.map((chip, i) => (
              <button
                key={`${chip.key}-${chip.value}-${i}`}
                data-testid={`chip-${chip.key}`}
                onClick={() => {
                  if (chip.key === 'price') {
                    handleFilterChange({ price_min: undefined, price_max: undefined });
                  } else {
                    handleRemoveChip(chip.key, chip.value);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              data-testid="clear-all-filters"
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-primary underline ml-2"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-[260px] flex-shrink-0">
            <div className="sticky top-20">
              <FilterSidebar
                filters={selectedFilters}
                filterMetadata={filterMetadata}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearAll}
              />
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            <div className="sm:hidden mb-4">
              <SortDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="product-skeleton">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-muted rounded-lg mb-3" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="text-center py-16" data-testid="error-state">
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => fetchProducts(1, true)}>Retry</Button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && !error && products.length > 0 && (
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="product-grid">
                {products.map((product, index) => (
                  <div
                    key={product.id || index}
                    ref={index === products.length - 1 ? lastRef : null}
                    data-testid={`product-card-${product.id}`}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}

            {/* Loading More */}
            {loadingMore && (
              <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={`more-${i}`} className="animate-pulse">
                    <div className="aspect-[3/4] bg-muted rounded-lg mb-3" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-20" data-testid="empty-state">
                <p className="text-lg text-muted-foreground mb-2">No products found</p>
                <p className="text-sm text-muted-foreground mb-6">Try adjusting your filters.</p>
                <Button onClick={handleClearAll} variant="outline">Clear All Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={selectedFilters}
        filterMetadata={filterMetadata}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearAll}
        totalProducts={totalProducts}
      />
    </div>
  );
};

export default ProductsPage;
