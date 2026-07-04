import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { formatPrice } from '../utils';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const AllProductsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('grid'); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState('name');
    const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [priceRange, setPriceRange] = useState([0, 100000]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterCategory) params.category = filterCategory;
            const res = await productsAPI.getAll(params);
            const productsData = Array.isArray(res.data) ? res.data : [];

            // Enhance products with calculated stock from variants
            const enhancedProducts = productsData.map(product => ({
                ...product,
                // Calculate total stock from all variants
                stock_quantity: product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0)
                    ?? product.stock_quantity
                    ?? product.stock
                    ?? 0,
                // Use first variant's SKU if product doesn't have one
                sku: product.sku ?? product.variants?.[0]?.sku ?? 'N/A',
            }));

            setProducts(enhancedProducts);
        } catch (err) {
            console.error('Failed to load products:', err);
            setProducts([]);
        }
        setLoading(false);
    }, [filterCategory]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Get unique categories from products
    const allCategories = [...new Set(
        products.flatMap(p => {
            if (p.categories && Array.isArray(p.categories)) return p.categories.map(c => c.name || c);
            if (p.category) return [p.category];
            if (p.subcategory) return [p.subcategory];
            return [];
        }).filter(Boolean)
    )];

    // Filter and sort
    const filtered = products
        .filter(p => {
            const price = Number(p.sale_price || p.price || 0);
            if (price < priceRange[0] || price > priceRange[1]) return false;
            if (p.status && p.status !== 'published' && p.status !== 'publish') return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (p.name || '').toLowerCase().includes(q) ||
                    (p.description || '').toLowerCase().includes(q) ||
                    (p.fabric || '').toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'price-low') return (a.sale_price || a.price || 0) - (b.sale_price || b.price || 0);
            if (sortBy === 'price-high') return (b.sale_price || b.price || 0) - (a.sale_price || a.price || 0);
            if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            return (a.name || '').localeCompare(b.name || '');
        });

    const getImageUrl = (product) => {
        if (product.images && product.images.length > 0) {
            const img = product.images[0];
            const src = typeof img === 'string' ? img : img.src;
            if (src && src.startsWith('/')) return `${BACKEND}${src}`;
            return src;
        }
        return null;
    };

    const getProductCategory = (product) => {
        if (product.categories?.length > 0) return product.categories.map(c => c.name || c).join(', ');
        return product.category || product.subcategory || '—';
    };

    const inputStyle = {
        padding: '0.6rem 1rem', borderRadius: 10,
        border: '1px solid #e2e8f0', background: '#fff',
        color: '#1e293b', fontSize: '0.9rem', outline: 'none',
        transition: 'border-color 0.2s',
    };

    return (
        <div style={{ minHeight: '100vh', background: '#faf9f7', fontFamily: "'Inter', sans-serif" }}>
            {/* Hero Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                padding: '3rem 2rem', color: '#fff', textAlign: 'center',
            }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: 8 }}>
                    Our Collection
                </h1>
                <p style={{ color: '#c4b5fd', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto' }}>
                    Discover handcrafted ethnic wear and home textiles — each piece a celebration of Indian artistry.
                </p>
            </div>

            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem' }}>

                {/* Top Controls Bar */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                    marginBottom: '2rem', padding: '1rem 1.5rem',
                    background: '#fff', borderRadius: 16,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    {/* Search */}
                    <div style={{ flex: '1 1 250px' }}>
                        <input
                            placeholder="🔍 Search products..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ ...inputStyle, width: '100%' }}
                        />
                    </div>

                    {/* Category Filter */}
                    <select value={filterCategory}
                        onChange={e => { setFilterCategory(e.target.value); setSearchParams(e.target.value ? { category: e.target.value } : {}); }}
                        style={{ ...inputStyle, minWidth: 160 }}>
                        <option value="">All Categories</option>
                        {allCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        style={{ ...inputStyle, minWidth: 140 }}>
                        <option value="name">Sort: A-Z</option>
                        <option value="price-low">Price: Low → High</option>
                        <option value="price-high">Price: High → Low</option>
                        <option value="newest">Newest First</option>
                    </select>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
                        <button onClick={() => setView('grid')}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: view === 'grid' ? '#fff' : 'transparent', color: '#1e293b',
                                fontWeight: view === 'grid' ? 600 : 400, fontSize: '0.85rem',
                                boxShadow: view === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            }}>▦ Grid</button>
                        <button onClick={() => setView('list')}
                            style={{
                                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: view === 'list' ? '#fff' : 'transparent', color: '#1e293b',
                                fontWeight: view === 'list' ? 600 : 400, fontSize: '0.85rem',
                                boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            }}>☰ List</button>
                    </div>

                    {/* Count */}
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                        {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} style={{
                                background: '#fff', borderRadius: 16, overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}>
                                <div style={{ height: 280, background: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
                                <div style={{ padding: '1.25rem' }}>
                                    <div style={{ height: 16, background: '#f1f5f9', borderRadius: 8, marginBottom: 8, width: '70%' }} />
                                    <div style={{ height: 14, background: '#f1f5f9', borderRadius: 8, width: '40%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grid View */}
                {!loading && view === 'grid' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                        {filtered.map(product => {
                            const imgUrl = getImageUrl(product);
                            const hasSale = product.sale_price && Number(product.sale_price) > 0;
                            const discount = hasSale ? Math.round((1 - Number(product.sale_price) / Number(product.price || product.regular_price)) * 100) : 0;

                            return (
                                <Link to={`/products/${product.id}`} key={product.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{
                                        background: '#fff', borderRadius: 16, overflow: 'hidden',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                        transition: 'transform 0.25s, box-shadow 0.25s', cursor: 'pointer',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}>
                                        {/* Image */}
                                        <div style={{ height: 300, background: '#f8f7f5', position: 'relative', overflow: 'hidden' }}>
                                            {imgUrl ? (
                                                <img src={imgUrl} alt={product.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                                                    onError={e => { e.target.src = ''; e.target.style.display = 'none'; }}
                                                    onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                                                    onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '3rem' }}></div>
                                            )}
                                            {hasSale && discount > 0 && (
                                                <span style={{
                                                    position: 'absolute', top: 12, right: 12, padding: '4px 10px',
                                                    borderRadius: 20, background: '#dc2626', color: '#fff',
                                                    fontSize: '0.75rem', fontWeight: 700,
                                                }}>{discount}% OFF</span>
                                            )}
                                            {product.status === 'draft' && (
                                                <span style={{
                                                    position: 'absolute', top: 12, left: 12, padding: '4px 10px',
                                                    borderRadius: 20, background: '#f59e0b', color: '#fff',
                                                    fontSize: '0.75rem', fontWeight: 700,
                                                }}>Draft</span>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div style={{ padding: '1.25rem' }}>
                                            {/* Category Tags */}
                                            <div style={{ marginBottom: 8 }}>
                                                {(product.categories || []).slice(0, 2).map((c, i) => (
                                                    <span key={i} style={{
                                                        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                                                        background: '#ede9fe', color: '#7c3aed', fontSize: '0.7rem',
                                                        fontWeight: 600, marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    }}>{typeof c === 'string' ? c : c.name}</span>
                                                ))}
                                                {!product.categories?.length && product.category && (
                                                    <span style={{
                                                        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                                                        background: '#ede9fe', color: '#7c3aed', fontSize: '0.7rem',
                                                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    }}>{product.category}</span>
                                                )}
                                            </div>

                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 4, lineHeight: 1.3 }}>
                                                {product.name}
                                            </h3>

                                            {product.fabric && (
                                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 8 }}>
                                                    {product.fabric}
                                                </p>
                                            )}

                                            {/* Price */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {hasSale ? (
                                                    <>
                                                        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#dc2626' }}>
                                                            {formatPrice(product.sale_price)}
                                                        </span>
                                                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                                                            {formatPrice(product.price || product.regular_price)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                                                        {formatPrice(product.price || product.regular_price || 0)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Stock */}
                                            {product.stock_quantity !== undefined && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: product.stock_quantity > 0 ? '#16a34a' : '#dc2626',
                                                        fontWeight: 500,
                                                        padding: '2px 8px',
                                                        borderRadius: 12,
                                                        background: product.stock_quantity > 0 ? '#dcfce7' : '#fee2e2',
                                                    }}>
                                                        {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Sold Out'}
                                                    </span>
                                                    {product.variants && product.variants.length > 1 && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            color: '#64748b',
                                                            background: '#f1f5f9',
                                                            padding: '2px 6px',
                                                            borderRadius: 8,
                                                        }}>
                                                            {product.variants.length} variants
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* List View */}
                {!loading && view === 'list' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 80px',
                            gap: 16, padding: '0.75rem 1.5rem', background: '#f1f5f9', borderRadius: 12,
                            fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                            <span>Image</span>
                            <span>Product</span>
                            <span>Category</span>
                            <span>Price</span>
                            <span>Stock</span>
                            <span>Status</span>
                        </div>

                        {filtered.map(product => {
                            const imgUrl = getImageUrl(product);
                            const hasSale = product.sale_price && Number(product.sale_price) > 0;

                            return (
                                <Link to={`/products/${product.id}`} key={product.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 80px',
                                        gap: 16, padding: '1rem 1.5rem', background: '#fff', borderRadius: 12,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', alignItems: 'center',
                                        transition: 'box-shadow 0.2s', cursor: 'pointer',
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}>
                                        {/* Image */}
                                        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: '#f8f7f5', flexShrink: 0 }}>
                                            {imgUrl ? (
                                                <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={e => { e.target.style.display = 'none'; }} />
                                            ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}></div>}
                                        </div>

                                        {/* Name & Details */}
                                        <div>
                                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>{product.name}</h3>
                                            {product.fabric && <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{product.fabric}</span>}
                                            {product.sku && <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginLeft: 8 }}>SKU: {product.sku}</span>}
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{getProductCategory(product)}</span>
                                        </div>

                                        {/* Price */}
                                        <div>
                                            {hasSale ? (
                                                <div>
                                                    <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>{formatPrice(product.sale_price)}</span>
                                                    <br />
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'line-through' }}>{formatPrice(product.price || product.regular_price)}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{formatPrice(product.price || product.regular_price || 0)}</span>
                                            )}
                                        </div>

                                        {/* Stock */}
                                        <div>
                                            {product.stock_quantity !== undefined ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500,
                                                        background: product.stock_quantity > 0 ? '#dcfce7' : '#fee2e2',
                                                        color: product.stock_quantity > 0 ? '#16a34a' : '#dc2626',
                                                    }}>
                                                        {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Sold Out'}
                                                    </span>
                                                    {product.variants && product.variants.length > 1 && (
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            color: '#64748b',
                                                            background: '#f1f5f9',
                                                            padding: '2px 6px',
                                                            borderRadius: 8,
                                                        }}>
                                                            {product.variants.length} variants
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <span style={{
                                                width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 6,
                                                background: (product.status === 'publish' || !product.status) ? '#16a34a' : '#f59e0b',
                                            }} />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filtered.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '4rem 2rem', background: '#fff',
                        borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛍️</div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>No products found</h3>
                        <p style={{ color: '#94a3b8', marginBottom: 24 }}>Try adjusting your filters or search query.</p>
                        <button onClick={() => { setSearchQuery(''); setFilterCategory(''); setPriceRange([0, 100000]); }}
                            style={{
                                padding: '0.6rem 1.5rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', fontWeight: 600,
                            }}>Clear Filters</button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default AllProductsPage;

