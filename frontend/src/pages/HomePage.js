import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { productsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';
import { formatPrice } from '../lib/utils';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [featured, trending] = await Promise.all([
          productsAPI.getAll({ featured: true, limit: 4 }),
          productsAPI.getAll({ trending: true, limit: 4 }),
        ]);
        setFeaturedProducts(featured.data);
        setTrendingProducts(trending.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Refined Hero Section - Header Only */}
      <section className="bg-primary pt-20 pb-12 text-center px-6 relative">
        <div className="absolute inset-0 bg-mandala opacity-10 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl mx-auto"
        >
          <h1 className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] font-heading font-bold tracking-[0.03em] mb-8 text-secondary drop-shadow-sm leading-[1.2] text-center max-w-4xl mx-auto">
            Timeless Royalty,<br />Handcrafted for You
          </h1>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              data-testid="hero-shop-button"
              asChild
              className="btn-luxury h-12 px-10 text-base font-bold rounded-full shadow-lg"
            >
              <Link to="/products">
                Shop The Collection
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              data-testid="hero-lookbook-button"
              asChild
              variant="outline"
              className="h-12 px-10 border-brand-ivory text-brand-ivory hover:bg-brand-ivory hover:text-primary text-base font-medium transition-all rounded-full"
            >
              <Link to="/lookbook">View Lookbook</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Elevated Heritage Model Section - Now directly below heading */}
      <section className="relative w-full h-[450px] md:h-[700px] bg-[#FAF5F0] overflow-hidden flex items-center justify-center">
        <img
          src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2000"
          alt="Heritage Indian Model"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.85] contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-primary/50" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 text-center px-8 py-12 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 max-w-4xl mx-auto shadow-2xl"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-heading font-medium text-brand-ivory mb-4 drop-shadow-2xl">
            Experience the Elegance of Heritage
          </h2>
          <div className="w-32 h-1 bg-secondary mx-auto mb-8 shadow-glow" />
          <p className="text-secondary text-xl md:text-2xl font-body font-bold tracking-[0.4em] uppercase drop-shadow-md">
            Authentic Indian Royalty
          </p>
        </motion.div>
      </section>

      <div className="heritage-divider" />

      {/* Featured Collections - Ivory Background */}
      <section className="px-6 md:px-12 lg:px-24 py-24 bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-mandala opacity-5 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4 text-primary">
              The Heritage Edit
            </h2>
            <div className="w-20 h-0.5 bg-secondary mb-6" />
            <p className="text-lg text-muted-foreground font-body max-w-xl">
              Handpicked pieces from our latest arrivals, crafted with precision and love.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[450px] bg-muted/50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" data-testid="featured-products-grid">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Women Ethnic Wear Categories */}
      <section className="px-6 md:px-12 lg:px-24 py-20 bg-mandala bg-primary text-primary-foreground relative">
        <div className="absolute inset-0 bg-primary/80 backdrop-blur-[2px]" />
        <div className="relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight mb-4">
              Women Ethnic Wear
            </h2>
            <div className="w-24 h-1 bg-secondary mx-auto mb-6" />
            <p className="text-xl opacity-80 max-w-2xl mx-auto">
              Handcrafted elegance for every occasion, celebrating the true essence of Indian womanhood.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Sarees', image: 'https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=600', category: 'Sarees' },
              { name: 'Lehengas', image: 'https://images.unsplash.com/photo-1737514996816-a034a795febe?w=600', category: 'Lehengas' },
              { name: 'Suits', image: 'https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=600', category: 'Ladies Suits' },
              { name: 'Dupattas', image: 'https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=600', category: 'Dupattas' },
            ].map((cat, index) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <Link
                  to={`/products?subcategory=${encodeURIComponent(cat.category)}`}
                  data-testid={`category-${cat.name.toLowerCase()}`}
                  className="block relative overflow-hidden rounded-2xl aspect-[3/4] shadow-2xl"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-white/10 backdrop-blur-sm">
                    <h3 className="text-2xl font-heading font-medium text-white mb-2">{cat.name}</h3>
                    <span className="text-secondary text-sm flex items-center gap-2 group-hover:gap-4 transition-all uppercase tracking-widest font-medium">
                      Explore Collection <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="heritage-divider" />

      {/* Home & Lifestyle Categories */}
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
        <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight text-center mb-4">
          Home & Lifestyle
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Transform your space with traditional craftsmanship
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Bedsheets', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600', category: 'Bedsheets' },
            { name: 'Pillow Covers', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600', category: 'Pillow Covers' },
            { name: 'Cushion Covers', image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600', category: 'Cushion Covers' },
            { name: 'Dohar', image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600', category: 'Dohar' },
          ].map((cat, index) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                to={`/products?subcategory=${encodeURIComponent(cat.category)}`}
                data-testid={`category-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group block relative overflow-hidden rounded aspect-[3/4]"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-heading font-medium text-white mb-2">{cat.name}</h3>
                  <span className="text-white/80 text-sm flex items-center gap-2">
                    Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending Products - Ivory Background */}
      <section className="px-6 md:px-12 lg:px-24 py-24 bg-background border-y border-secondary/10">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="max-w-xl">
            <p className="text-secondary font-bold uppercase tracking-[0.2em] text-xs mb-4">Most Desired</p>
            <h2 className="text-4xl md:text-6xl font-heading font-medium tracking-tight text-primary">
              Trending Stories
            </h2>
          </div>
          <Button data-testid="view-all-products-button" asChild variant="outline" className="border-secondary text-primary hover:bg-secondary hover:text-primary rounded-full px-8 py-6 font-bold shadow-sm transition-all">
            <Link to="/products">VIEW ENTIRE TROUSSEAU</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[450px] bg-muted/50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10" data-testid="trending-products-grid">
            {trendingProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <div className="heritage-divider" />

      {/* Brand Story */}
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24 bg-accent">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-sm tracking-widest uppercase text-secondary mb-4">Our Story</p>
            <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-6">
              Preserving Heritage,<br />Creating Timeless Beauty
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground mb-6 font-accent italic">
              "At Shri Ramya, we celebrate the rich tapestry of Rajasthani craftsmanship. Each piece is a labor of love, handcrafted by skilled artisans who pour their heart into every stitch and weave."
            </p>
            <p className="text-base leading-relaxed text-muted-foreground mb-8">
              From the vibrant hues of Bandhani to the regal elegance of Banarasi silk, our collection is a tribute to India's textile heritage. We work directly with local artisans, ensuring fair practices and preserving traditional techniques for generations to come.
            </p>
            <Button data-testid="about-us-button" asChild variant="outline" size="lg">
              <Link to="/about">Learn More About Us</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <img
              src="https://images.unsplash.com/photo-1651132164857-b61aa4cf7472?w=800"
              alt="Craftsmanship"
              className="w-full rounded"
            />
          </motion.div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center">
          <Star className="h-12 w-12 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-4">
            Join Our Heritage Circle
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Subscribe to receive exclusive offers, styling tips, and stories from our artisan community.
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              data-testid="newsletter-input"
              className="flex-1 px-4 py-3 rounded bg-primary-foreground text-foreground"
            />
            <Button data-testid="newsletter-subscribe-button" variant="secondary" size="lg">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;