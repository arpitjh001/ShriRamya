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
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1737514996816-a034a795febe?w=1920"
            alt="Ethnic Fashion"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
        </div>

        <div className="relative z-10 px-6 md:px-12 lg:px-24 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-sm tracking-widest uppercase text-secondary mb-4">Heritage Collection 2025</p>
            <h1 className="text-5xl md:text-7xl font-heading font-medium tracking-tight leading-tight mb-6">
              Timeless Elegance<br />in Every Thread
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-muted-foreground mb-8">
              Discover handcrafted Rajasthani treasures that celebrate tradition with a modern touch.
            </p>
            <div className="flex gap-4">
              <Button
                data-testid="hero-shop-button"
                asChild
                size="lg"
                className="group"
              >
                <Link to="/products">
                  Shop Collection
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                data-testid="hero-lookbook-button"
                asChild
                variant="outline"
                size="lg"
              >
                <Link to="/lookbook">View Lookbook</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4">
            Featured Collections
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Handpicked pieces from our latest arrivals
          </p>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[400px] bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="featured-products-grid">
              {featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
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
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24 bg-muted">
        <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight text-center mb-4">
          Women Ethnic Wear
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12">
          Handcrafted elegance for every occasion
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Sarees', image: 'https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=600', category: 'Sarees' },
            { name: 'Lehengas', image: 'https://images.unsplash.com/photo-1737514996816-a034a795febe?w=600', category: 'Lehengas' },
            { name: 'Suits', image: 'https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=600', category: 'Ladies Suits' },
            { name: 'Dupattas', image: 'https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=600', category: 'Dupattas' },
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
                data-testid={`category-${cat.name.toLowerCase()}`}
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

      {/* Trending Products */}
      <section className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4">
              Trending Now
            </h2>
            <p className="text-lg text-muted-foreground">
              What's popular this season
            </p>
          </div>
          <Button data-testid="view-all-products-button" asChild variant="outline">
            <Link to="/products">View All</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[400px] bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="trending-products-grid">
            {trendingProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

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