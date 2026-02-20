import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productsAPI } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Filter } from 'lucide-react';
import { formatPrice } from '../lib/utils';

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (category) params.category = category;
        if (subcategory) params.subcategory = subcategory;
        
        const response = await productsAPI.getAll(params);
        setProducts(response.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category, subcategory]);

  const categories = ['Sarees', 'Lehengas', 'Suits', 'Dupattas'];
  const subcategories = {
    Sarees: ['Banarasi', 'Leheriya', 'Festive'],
    Lehengas: ['Bridal', 'Festive'],
    Suits: ['Jaipuri', 'Anarkali'],
    Dupattas: ['Bandhani', 'Silk'],
  };

  const filteredProducts = products.filter(
    (p) => (p.price >= priceRange[0] && p.price <= priceRange[1]) || (p.sale_price >= priceRange[0] && p.sale_price <= priceRange[1])
  );

  return (
    <div data-testid="products-page" className="px-6 md:px-12 lg:px-24 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4">
          {category || 'All Products'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'} found
        </p>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-64 flex-shrink-0`}>
          <div className="sticky top-24">
            <div className="space-y-8">
              {/* Category Filter */}
              <div>
                <h3 className="font-body font-semibold mb-4">Category</h3>
                <div className="space-y-2">
                  <Button
                    data-testid="category-all"
                    variant={!category ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSearchParams({})}
                  >
                    All Products
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      data-testid={`category-filter-${cat.toLowerCase()}`}
                      variant={category === cat ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSearchParams({ category: cat })}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subcategory Filter */}
              {category && subcategories[category] && (
                <div>
                  <h3 className="font-body font-semibold mb-4">Type</h3>
                  <div className="space-y-2">
                    {subcategories[category].map((sub) => (
                      <Button
                        key={sub}
                        data-testid={`subcategory-filter-${sub.toLowerCase()}`}
                        variant={subcategory === sub ? 'default' : 'ghost'}
                        className="w-full justify-start text-sm"
                        onClick={() => setSearchParams({ category, subcategory: sub })}
                      >
                        {sub}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div>
                <h3 className="font-body font-semibold mb-4">Price Range</h3>
                <div className="space-y-4">
                  <Slider
                    data-testid="price-range-slider"
                    min={0}
                    max={50000}
                    step={1000}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatPrice(priceRange[0])}</span>
                    <span>{formatPrice(priceRange[1])}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6">
            <Button
              data-testid="toggle-filters-button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[400px] bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div data-testid="no-products-found" className="text-center py-16">
              <p className="text-xl text-muted-foreground mb-4">No products found</p>
              <Button asChild>
                <Link to="/products">View All Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;