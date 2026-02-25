import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogAPI } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, Search, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { Button } from '../components/ui/button';

const HTMLRenderer = ({ html, className }) => {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

const BlogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
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
      if (response.data) {
        setPosts(response.data.posts || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
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
          ) : posts.length === 0 ? (
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
                  {posts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col h-full"
                    >
                      <Link to={`/blog/${post.id}`} className="block flex-1">
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
                          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-4">
                            <span className="flex items-center gap-1.5 bg-accent/10 px-2 py-1 rounded-md">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1.5 bg-accent/10 px-2 py-1 rounded-md">
                              <User className="h-3.5 w-3.5" />
                              {post.author}
                            </span>
                          </div>

                          <h2 className="text-2xl font-heading font-medium mb-3 group-hover:text-primary transition-colors line-clamp-2">
                            <HTMLRenderer html={post.title} />
                          </h2>

                          <div className="text-muted-foreground mb-6 line-clamp-3 text-sm leading-relaxed flex-1">
                            <HTMLRenderer html={post.excerpt} />
                          </div>

                          <div className="mt-auto">
                            <div className="h-[1px] w-full bg-border/50 mb-4" />
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
                    className="rounded-full w-10 h-10 border-muted-foreground/20 hover:border-primary hover:text-primary"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex gap-1">
                    {[...Array(pagination.total_pages)].map((_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "ghost"}
                          onClick={() => handlePageChange(page)}
                          className={`w-10 h-10 rounded-full font-medium ${currentPage === page ? 'shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.total_pages}
                    className="rounded-full w-10 h-10 border-muted-foreground/20 hover:border-primary hover:text-primary"
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
          {/* Search Widget */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-heading font-medium mb-4 relative z-10 flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Search
            </h3>
            <form onSubmit={handleSearch} className="relative z-10">
              <input
                type="text"
                placeholder="Find stories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
              <Button type="submit" size="sm" className="absolute right-1 top-1 py-2 h-auto rounded-lg px-4 font-medium">
                Go
              </Button>
            </form>
          </div>

          {/* Categories Widget */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-heading font-medium mb-5 relative z-10 flex items-center gap-2">
              <Tag className="h-5 w-5 text-secondary" /> Collections
            </h3>
            <div className="flex flex-col gap-2 relative z-10">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryFilter(cat.id.toString())}
                  className={`flex justify-between items-center py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${currentCategory === cat.id.toString()
                      ? 'bg-secondary/10 text-secondary'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                    }`}
                >
                  <span className="flex-1 text-left">{cat.name}</span>
                  <span className={`bg-background/80 px-2 py-0.5 rounded-md text-xs border ${currentCategory === cat.id.toString() ? 'border-secondary/20 text-secondary' : 'border-border'
                    }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground italic px-2">No collections available</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default BlogPage;