import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Search, ChevronLeft, ChevronRight, Tag, Plus, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import SEOMeta from '../components/SEOMeta';

// Static blog posts for homepage
const STATIC_POSTS = [
  {
    id: 'sanganeri-print',
    title: 'The Art of Sanganeri Printing: How Traditional Block Prints Transform Silk Sarees',
    excerpt: 'Discover the centuries-old craft of Sanganeri block printing, where skilled artisans transform luxurious silk sarees into wearable masterpieces using hand-carved wooden blocks and natural dyes.',
    date: '2026-03-07',
    author: 'Shri Ramya Team',
    categories: ['Traditional Crafts', 'Silk Sarees'],
    image: null,
    slug: 'sanganeri-print',
    isStatic: true
  }
];

const BlogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { capabilities } = useAuth();

  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]); // Combined static + native blog posts
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1 });
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Extract parameters from URL
  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = searchParams.get('category') || '';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPosts();
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const response = await blogAPI.getCategories();
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch blog categories:', error);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: 9
      };

      const categoryParam = searchParams.get('category');
      if (categoryParam) {
        params.category = categoryParam;
      }

      const searchParam = searchParams.get('search');
      if (searchParam) {
        params.search = searchParam;
      }

      const response = await blogAPI.getPosts(params);
      let nativePosts = [];
      let paginationData = { current_page: 1, total_pages: 1 };

      // Response is already unwrapped by interceptor
      // response.data is the actual data from backend
      if (response.data) {
        nativePosts = response.data.posts || [];
        if (response.data.pagination) {
          paginationData = response.data.pagination;
        }
      }

      // Combine static posts with native blog posts
      // Static posts always appear first
      // Ensure native posts have slug field for routing
      const normalizedNativePosts = nativePosts.map((post) => {
        const image =
          post?.image ||
          post?.featured_image ||
          post?.featuredImage ||
          (Array.isArray(post?.images) ? post.images.find(Boolean) : null) ||
          null;

        return {
          ...post,
          slug: post.slug || `post-${post.id}`,
          image,
        };
      });

      const combinedPosts = [...STATIC_POSTS, ...normalizedNativePosts];
      setAllPosts(combinedPosts);
      setPosts(normalizedNativePosts);
      setPagination(paginationData);
    } catch (error) {
      console.error('Failed to fetch blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm) {
      searchParams.set('search', searchTerm);
      searchParams.set('page', '1');
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
  };

  const handleCategoryFilter = (categoryId) => {
    if (categoryId === currentCategory) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    searchParams.set('page', '1');
    setSearchParams(searchParams);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      searchParams.set('page', newPage.toString());
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <SEOMeta
        title="Journal of Heritage & Craft"
        description="Discover the stories of Shri Ramya heritage, traditional weaving crafts, and timeless silk sarees."
        url="/blog"
      />
      <div className="px-6 md:px-12 lg:px-24 py-16 bg-gradient-to-b from-background to-accent/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-secondary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Stories & Heritage
          </motion.h1>
          <motion.p
            className="text-lg text-muted-foreground font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Explore the world of ethnic fashion, masterful craftsmanship, and inspiring styling tips.
          </motion.p>

          {capabilities.edit_posts && (
            <motion.div
              className="mt-8 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button asChild className="rounded-full px-8 py-6 shadow-luxury-lg hover:shadow-luxury transition-all duration-300">
                <Link to="/admin/blog/new" className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Story
                </Link>
              </Button>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[450px] bg-muted/50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : allPosts.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-2xl border border-border/50 shadow-sm">
                <p className="text-xl text-muted-foreground font-medium mb-4">No stories found</p>
                <Button onClick={() => { setSearchParams({}); setSearchTerm(''); }} variant="outline">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <AnimatePresence mode="popLayout">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {allPosts.map((post, index) => (
                      <motion.article
                        key={post.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col h-full"
                      >
                        <Link to={`/blog/${post.slug}`} className="block flex-1">
                          <div className="aspect-[4/3] overflow-hidden relative">
                            {post.image ? (
                              <img
                                src={post.image}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              />
                            ) : (
                              <div className="w-full h-full bg-accent/20 flex items-center justify-center">
                                <span className="text-muted-foreground font-medium">Shri Ramya</span>
                              </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                              {post.categories?.slice(0, 2).map((cat, i) => (
                                <span key={i} className="bg-background/90 backdrop-blur text-foreground text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="p-8 flex flex-col flex-1">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
                              <span className="flex items-center gap-1.5 px-2 py-1 bg-accent/5 rounded-md">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(post.publishedAt || post.published_at || post.createdAt || post.created_at || post.date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1.5 px-2 py-1 bg-accent/5 rounded-md">
                                <User className="h-3.5 w-3.5" />
                                {post.author?.name || post.author_name || post.author || 'Shri Ramya Team'}
                              </span>
                              {(post.reading_time || post.readingTime) > 0 && (
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-accent/5 rounded-md">
                                  <Clock className="h-3.5 w-3.5" />
                                  {post.reading_time || post.readingTime} min
                                </span>
                              )}
                            </div>

                            <h2 className="text-2xl font-heading font-medium mb-3 group-hover:text-primary transition-colors line-clamp-2">
                              {post.title}
                            </h2>

                            <p className="text-muted-foreground mb-6 line-clamp-3 text-sm leading-relaxed flex-1">
                              {post.excerpt}
                            </p>

                            <div className="mt-auto pt-4 border-t border-border/50">
                              <span className="text-secondary font-medium text-sm flex items-center group-hover:tracking-wide transition-all uppercase tracking-wider">
                                Read Full Story
                                <span className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                  →
                                </span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      </motion.article>
                    ))}
                  </div>
                </AnimatePresence>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-16 pt-8 border-t border-border">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-full w-10 h-10"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <div className="flex gap-1">
                      {[...Array(pagination.total_pages)].map((_, i) => (
                        <Button
                          key={i + 1}
                          variant={currentPage === (i + 1) ? "default" : "ghost"}
                          onClick={() => handlePageChange(i + 1)}
                          className="w-10 h-10 rounded-full"
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pagination.total_pages}
                      className="rounded-full w-10 h-10"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-8 lg:sticky lg:top-32 self-start">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-xl font-heading font-medium mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" /> Search
              </h3>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Find stories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
                <Button type="submit" size="sm" className="absolute right-1 top-1 py-2 h-auto rounded-lg">
                  Go
                </Button>
              </form>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h3 className="text-xl font-heading font-medium mb-5 flex items-center gap-2">
                <Tag className="h-5 w-5 text-secondary" /> Collections
              </h3>
              <div className="flex flex-col gap-2">
                {categories.map((cat, idx) => {
                  const catId = typeof cat === 'string' ? cat : (cat.id || cat.name);
                  const catName = typeof cat === 'string' ? cat : cat.name;
                  const catCount = typeof cat === 'string' ? '' : cat.count;
                  return (
                  <button
                    key={catId || idx}
                    onClick={() => handleCategoryFilter(String(catId))}
                    className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${currentCategory === String(catId)
                      ? 'bg-secondary/10 text-secondary'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                      }`}
                  >
                    <span className="flex-1 text-left">{catName}</span>
                    {catCount && (
                    <span className="bg-background/80 px-2 py-0.5 rounded-md text-xs border border-border">
                      {catCount}
                    </span>
                    )}
                  </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
