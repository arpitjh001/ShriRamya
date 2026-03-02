import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { productsAPI } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import { Filter } from "lucide-react";
import { formatPrice } from "../lib/utils";

const MAX_PRICE = 100000;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);

  // Pagination & Infinite Scroll State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = React.useRef();

  const lastProductElementRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");

  // =========================
  // FETCH PRODUCTS
  // =========================

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
        per_page: 12  // Changed from 50 to 12 as requested
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
        setProducts(prev => [...prev, ...newProducts]);
      }

      // Stop infinite loading if less than requested chunk was returned
      setHasMore(newProducts.length === 12);

    } catch (err) {
      console.error("Product fetch failed:", err);
      setError("Unable to load products. Please try again.");
      if (isReset) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, subcategory]);

  // Handle URL change (category switch)
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [fetchProducts]);

  // Handle Pagination triggered by IntersectionObserver
  useEffect(() => {
    if (page > 1) {
      fetchProducts(page, false);
    }
  }, [page, fetchProducts]);

  // =========================
  // PRICE FILTER (Frontend Only)
  // =========================

  const filteredProducts = products.filter((p) => {
    const price = Number(p.sale_price || p.price || 0);
    return price >= priceRange[0] && price <= priceRange[1];
  });

  const pageTitle = subcategory || category || "All Products";

  return (
    <div className="px-6 md:px-12 lg:px-24 py-12">

      {/* HEADER */}
      <div className="mb-12">
        <h1 className="text-4xl font-heading font-medium">
          {pageTitle}
        </h1>

        {!loading && (
          <p className="text-muted-foreground">
            {filteredProducts.length} items found
          </p>
        )}
      </div>

      <div className="flex gap-8">

        {/* SIDEBAR */}
        <aside className={`${showFilters ? "block" : "hidden"} lg:block w-64 shrink-0`}>

          <div className="space-y-8">

            <div>
              <Button
                className="w-full justify-start"
                variant={!category && !subcategory ? "default" : "ghost"}
                onClick={() => setSearchParams({})}
              >
                All Products
              </Button>
            </div>

            {/* PRICE FILTER */}
            <div>
              <h3 className="font-semibold mb-4">Price Range</h3>

              <Slider
                min={0}
                max={MAX_PRICE}
                step={1000}
                value={priceRange}
                onValueChange={setPriceRange}
              />

              <div className="flex justify-between text-sm mt-2 text-muted-foreground">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>

          </div>
        </aside>

        {/* PRODUCTS */}
        <div className="flex-1">

          {/* MOBILE FILTER BUTTON */}
          <div className="lg:hidden mb-6">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[400px] bg-muted animate-pulse rounded" />
              ))}
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="text-center py-16">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchProducts} className="mt-4">
                Retry
              </Button>
            </div>
          )}

          {/* PRODUCTS */}
          {!loading && !error && filteredProducts.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
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

          {/* LOADING MORE STATE */}
          {loadingMore && (
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              {[...Array(3)].map((_, i) => (
                <div key={`loading-more-${i}`} className="h-[400px] bg-muted animate-pulse rounded" />
              ))}
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p>No products found</p>
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