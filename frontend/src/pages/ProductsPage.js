import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { productsAPI } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import { Filter } from "lucide-react";
import { formatPrice } from "../lib/utils";

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);

  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");

  // -------------------------
  // FETCH PRODUCTS
  // -------------------------

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (category) params.category = category;
      if (subcategory) params.subcategory = subcategory;

      const response = await productsAPI.getAll(params);

      setProducts(Array.isArray(response.data) ? response.data : []);

    } catch (err) {
      console.error(err);
      setError("Unable to load products");
    } finally {
      setLoading(false);
    }
  }, [category, subcategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // -------------------------
  // PRICE FILTER
  // -------------------------

  const filteredProducts = products.filter((p) => {
    const price = Number(p.sale_price || p.price || 0);
    return price >= priceRange[0] && price <= priceRange[1];
  });

  const mainCategories = [
    { label: "Women Ethnic Wear", value: "Women Ethnic Wear" },
    { label: "Home & Lifestyle", value: "Home & Lifestyle" },
  ];

  const ethnicSubcategories = [
    { label: "Sarees", value: "Sarees" },
    { label: "Lehengas", value: "Lehengas" },
    { label: "Ladies Suits", value: "Ladies Suits" },
    { label: "Dupattas", value: "Dupattas" },
    { label: "Ready-to-Wear", value: "Ready-to-Wear Sarees" },
  ];

  const homeSubcategories = [
    { label: "Bedsheets", value: "Bedsheets" },
    { label: "Pillow Covers", value: "Pillow Covers" },
    { label: "Cushion Covers", value: "Cushion Covers" },
    { label: "Dohar", value: "Dohar" },
  ];

  // Determine which category section to show based on current filter
  const isHomeLifestyle = category === "Home & Lifestyle" || 
    homeSubcategories.some(sub => sub.value === subcategory);
  const isWomenEthnic = category === "Women Ethnic Wear" || 
    ethnicSubcategories.some(sub => sub.value === subcategory);
  const showAllCategories = !category && !subcategory;

  const pageTitle = subcategory || category || "All Products";

  return (
    <div className="px-6 md:px-12 lg:px-24 py-12" data-testid="products-page">

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

        {/* FILTER SIDEBAR */}
        <aside className={`${showFilters ? "block" : "hidden"} lg:block w-64 shrink-0`}>

          <div className="space-y-8">

            {/* ALL PRODUCTS */}
            <div>
              <Button
                className="w-full justify-start"
                variant={!category && !subcategory ? "default" : "ghost"}
                onClick={() => setSearchParams({})}
                data-testid="filter-all-products"
              >
                All Products
              </Button>
            </div>

            {/* WOMEN ETHNIC WEAR - Show when viewing All Products, Women Ethnic Wear, or its subcategories */}
            {(showAllCategories || isWomenEthnic) && (
              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Women Ethnic Wear</h3>

                <Button
                  className="w-full justify-start"
                  variant={category === "Women Ethnic Wear" && !subcategory ? "default" : "ghost"}
                  onClick={() => setSearchParams({ category: "Women Ethnic Wear" })}
                  data-testid="filter-women-ethnic"
                >
                  All Ethnic Wear
                </Button>

                {ethnicSubcategories.map((sub) => (
                  <Button
                    key={sub.value}
                    className="w-full justify-start mt-1 pl-6"
                    variant={subcategory === sub.value ? "default" : "ghost"}
                    onClick={() => setSearchParams({ subcategory: sub.value })}
                    data-testid={`filter-${sub.value.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {sub.label}
                  </Button>
                ))}
              </div>
            )}

            {/* HOME & LIFESTYLE - Show when viewing All Products, Home & Lifestyle, or its subcategories */}
            {(showAllCategories || isHomeLifestyle) && (
              <div>
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Home & Lifestyle</h3>

                <Button
                  className="w-full justify-start"
                  variant={category === "Home & Lifestyle" && !subcategory ? "default" : "ghost"}
                  onClick={() => setSearchParams({ category: "Home & Lifestyle" })}
                  data-testid="filter-home-lifestyle"
                >
                  All Home & Lifestyle
                </Button>

                {homeSubcategories.map((sub) => (
                  <Button
                    key={sub.value}
                    className="w-full justify-start mt-1 pl-6"
                    variant={subcategory === sub.value ? "default" : "ghost"}
                    onClick={() => setSearchParams({ subcategory: sub.value })}
                    data-testid={`filter-${sub.value.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {sub.label}
                  </Button>
                ))}
              </div>
            )}

            {/* PRICE FILTER */}
            <div>
              <h3 className="font-semibold mb-4">Price Range</h3>

              <Slider
                min={0}
                max={50000}
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

        {/* PRODUCTS GRID */}
        <div className="flex-1">

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
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
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
