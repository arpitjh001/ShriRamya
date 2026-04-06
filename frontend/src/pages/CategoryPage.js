import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import api, { productsAPI } from '../services/api';

const CategoryPage = () => {
    const { slug } = useParams();
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [sortedProducts, setSortedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortOption, setSortOption] = useState('newest');

    useEffect(() => {
        const fetchCategoryData = async () => {
            setLoading(true);
            try {
                // Fetch category details
                const catRes = await api.get(`/categories/${slug}`);
                setCategory(catRes.data);

                // Fetch products for this category using the consolidated productsAPI
                const prodRes = await productsAPI.getAll({ category: slug, per_page: 100 });
                const fetchedProducts = prodRes.data || [];
                setProducts(fetchedProducts);
                setSortedProducts(fetchedProducts);

                // Update document title for SEO
                document.title = `${catRes.data.name} | ShriRamya`;

                // Set meta description
                let metaDesc = document.querySelector('meta[name="description"]');
                if (!metaDesc) {
                    metaDesc = document.createElement('meta');
                    metaDesc.name = 'description';
                    document.head.appendChild(metaDesc);
                }
                metaDesc.content = catRes.data.description || `Explore our high-quality ${catRes.data.name} collection at ShriRamya.`;

            } catch (err) {
                console.error(err);
                setError('Failed to fetch category data.');
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchCategoryData();
        }
    }, [slug]);

    useEffect(() => {
        let sorted = [...products];
        if (sortOption === 'price_low') {
            sorted.sort((a, b) => (Number(a.sale_price || a.price || 0)) - (Number(b.sale_price || b.price || 0)));
        } else if (sortOption === 'price_high') {
            sorted.sort((a, b) => (Number(b.sale_price || b.price || 0)) - (Number(a.sale_price || a.price || 0)));
        } else if (sortOption === 'newest') {
            sorted.sort((a, b) => new Date(b.created_at || b.date_created) - new Date(a.created_at || a.date_created));
        }
        setSortedProducts(sorted);
    }, [sortOption, products]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
    if (!category) return <div className="text-center py-20">Category not found</div>;

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
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4 border-[#697565]/30">
                    <h2 className="text-2xl font-semibold text-[#181C14]">Products</h2>
                    <div className="mt-4 md:mt-0">
                        {/* Example filter UI */}
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

                {sortedProducts.length === 0 ? (
                    <div className="text-center py-16 text-[#697565]">
                        <p>No products found in this category.</p>
                        <Link to="/" className="inline-block mt-4 px-6 py-2 bg-[#181C14] text-white rounded-md hover:bg-[#3C3D37]">
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {sortedProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryPage;
