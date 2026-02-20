import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogAPI } from '../lib/api';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await blogAPI.getAll();
        setPosts(response.data);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div data-testid="blog-page" className="px-6 md:px-12 lg:px-24 py-12">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4">
          Stories & Inspirations
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore the world of ethnic fashion, styling tips, and heritage stories
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="blog-posts-grid">
          {posts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <Link to={`/blog/${post.slug}`} data-testid={`blog-post-${post.slug}`}>
                <div className="aspect-[4/3] overflow-hidden rounded mb-4">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(post.published_at), 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {post.author}
                  </span>
                </div>
                <h2 className="text-xl font-heading font-medium mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                <span className="text-primary text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                  Read More <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPage;