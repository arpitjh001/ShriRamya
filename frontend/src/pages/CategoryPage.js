import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import { categoriesAPI, productsAPI } from '../services/api';
import { trackAnalyticsEvent } from '../services/analyticsTracker';

const titleizeCategorySlug = (value = '') => {
    const decodedValue = (() => {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    })();

    return decodedValue
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const buildFallbackCategory = (slug = '') => ({
    id: slug,
    slug,
    name: titleizeCategorySlug(slug) || 'Collection',
    description: '',
    image: null,
    product_count: 0,
});

const normalizeCategorySlug = (value = '') => String(value).trim().toLowerCase();

const findCategoryBySlug = (categories = [], slug = '') => {
    const normalizedSlug = normalizeCategorySlug(slug);
    return categories.find((categoryItem) => {
        return [
            categoryItem?.slug,
            categoryItem?.id,
            categoryItem?._id,
        ].some((candidate) => normalizeCategorySlug(candidate) === normalizedSlug);
    }) || null;
};

const getProductKey = (product = {}, index) => (
    product.productId ||
    product.id ||
    product._id ||
    product.slug ||
    `category-product-${index}`
);

const CategoryPage = () => {
    const { slug } = useParams();
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [fabricFilter, setFabricFilter] = useState('');
    const [availableFabrics, setAvailableFabrics] = useState([]);
    const observer = useRef();

    const lastProductRef = useCallback(node => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchCategoryData = useCallback(async (pageNum = 1, isInitial = false) => {
        if (isInitial) setLoading(true);
        else setLoadingMore(true);

        try {
            // Fetch category details only on initial load
            if (isInitial) {
                let categoryData = null;
                try {
                    const categories = await categoriesAPI.getAll();
                    categoryData = findCategoryBySlug(categories, slug);
                } catch (categoryError) {
                    console.warn('Unable to load category summary:', categoryError?.message || categoryError);
                }
                const resolvedCategory = categoryData || buildFallbackCategory(slug);
                setCategory(resolvedCategory);
                trackAnalyticsEvent('category_view', {
                    category_id: resolvedCategory.id || resolvedCategory._id || resolvedCategory.slug || slug,
                    metadata: {
                        category_name: resolvedCategory.name,
                        category_slug: resolvedCategory.slug || slug,
                    },
                });
                document.title = `${resolvedCategory.name} | ShriRamya`;
                let metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    metaDesc = document.createElement('meta');
                    metaDesc.name = 'description';
                    document.head.appendChild(metaDesc);
                }
                metaDesc.content = resolvedCategory.description || `Explore our high-quality ${resolvedCategory.name} collection at ShriRamya.`;
            }

            // Fetch products for this category
            const params = {
                category: slug,
                per_page: 20,
                page: pageNum,
                sort: sortOption,
                fabric: fabricFilter || undefined,
            };
            const prodRes = await productsAPI.getAll(params);
            const fetchedProducts = prodRes.data || [];
            
            // Extract available fabrics for this category on initial load
            if (isInitial) {
                try {
                    const filterRes = await categoriesAPI.getCategoryFilters(slug);
                    if (filterRes && filterRes.filters?.fabrics) {
                        setAvailableFabrics(filterRes.filters.fabrics);
                    } else {
                        setAvailableFabrics([]);
                    }
                } catch (filterError) {
                    console.warn('Unable to load category fabric filters:', filterError?.message || filterError);
                    setAvailableFabrics([]);
                }
            }
            
            setProducts(prev => isInitial ? fetchedProducts : [...prev, ...fetchedProducts]);
            setHasMore(fetchedProducts.length === 20);

        } catch (err) {
            console.error(err);
            setError('Failed to fetch category data.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [slug, sortOption, fabricFilter]);

    useEffect(() => {
        setFabricFilter('');
    }, [slug]);

    useEffect(() => {
        if (slug) {
            setError('');
            setProducts([]);
            setPage(1);
            setHasMore(true);
            fetchCategoryData(1, true);
        }
    }, [slug, sortOption, fabricFilter, fetchCategoryData]);

    useEffect(() => {
        if (page > 1) {
            fetchCategoryData(page, false);
        }
    }, [page, fetchCategoryData]);

    if (loading && page === 1) return (
        <div className="flex items-center justify-center min-h-screen bg-[#FAF9F6]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#181C14]"></div>
        </div>
    );

    if (error) return <div className="text-center py-20 text-red-500 bg-[#FAF9F6] min-h-screen">{error}</div>;
    if (!category) return <div className="text-center py-20 bg-[#FAF9F6] min-h-screen">Category not found</div>;

    return (
        <div className="bg-[#FAF9F6] min-h-screen">
            {category.image ? (
                <div className="w-full h-64 md:h-96 relative bg-[#3C3D37] flex items-center justify-center">
                    <img src={category.image} alt={category.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    <div className="relative z-10 text-center text-white p-4">
                        <h1 className="text-4xl md:text-5xl font-['Playfair_Display'] capitalize">{category.name}</h1>
                        {category.description && <p className="mt-4 max-w-2xl mx-auto">{category.description}</p>}
                    </div>
                </div>
            ) : (
                <div className="w-full bg-[#ECDFCC] py-16 px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-['Playfair_Display'] text-[#181C14] capitalize">{category.name}</h1>
                    {category.description && <p className="mt-4 text-[#3C3D37] max-w-2xl mx-auto">{category.description}</p>}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="sticky top-[101px] md:top-[85px] z-30 bg-[#FAF9F6]/95 backdrop-blur-sm flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4 pt-2 border-[#697565]/30 transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-[#181C14]">Products</h2>
                        <span className="text-sm text-[#697565]">({products.length} loaded)</span>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        {availableFabrics.length > 0 && (
                            <select
                                value={fabricFilter}
                                onChange={(e) => setFabricFilter(e.target.value)}
                                className="bg-white border text-sm rounded-md px-3 py-2 text-[#3C3D37] focus:outline-none focus:ring-1 focus:ring-[#3C3D37]"
                            >
                                <option value="">All Fabrics</option>
                                {availableFabrics.map((fabric) => (
                                    <option key={fabric.value} value={fabric.value}>
                                        {fabric.label} {fabric.count > 0 ? `(${fabric.count})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-white border text-sm rounded-md px-3 py-2 text-[#3C3D37] focus:outline-none focus:ring-1 focus:ring-[#3C3D37]"
                        >
                            <option value="newest">Newest Additions</option>
                            <option value="price_low">Price: Low to High</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="popular">Popularity</option>
                        </select>
                    </div>
                </div>

                {products.length === 0 && !loading ? (
                    <div className="text-center py-16 text-[#697565]">
                        <p>No products found in this category.</p>
                        <Link to="/" className="inline-block mt-4 px-6 py-2 bg-[#181C14] text-white rounded-md hover:bg-[#3C3D37]">
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" data-testid="category-product-grid">
                            {products.map((product, index) => (
                                <div key={getProductKey(product, index)} ref={index === products.length - 1 ? lastProductRef : null}>
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>

                        {loadingMore && (
                            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" data-testid="category-loading-more">
                                {[...Array(4)].map((_, i) => (
                                    <ProductCardSkeleton key={`category-more-${i}`} />
                                ))}
                            </div>
                        )}
                        
                        {!hasMore && products.length > 0 && (
                            <p className="text-center text-[#697565] mt-12 italic">You've reached the end of the collection.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CategoryPage;
