
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star } from 'lucide-react';
import { productsAPI } from '../services/api';
import { Button } from '../components/ui/button';
import ProductCard from '../components/ProductCard';

const featuredCollectionTiles = [
  {
    title: 'Wedding Couture',
    subtitle: 'Regal silhouettes for grand ceremonies',
    image: 'https://images.unsplash.com/photo-1756483510889-dd6c3d9e0a17?auto=format&fit=crop&w=2400&q=80',
    link: '/luxury-collection',
  },
  {
    title: 'Heirloom Sarees',
    subtitle: 'Handloom drapes with intricate zari work',
    image: 'https://images.unsplash.com/photo-1756483492198-8ca91227489b?auto=format&fit=crop&w=2400&q=80',
    link: '/category/sarees',
  },
  {
    title: 'Festive Classics',
    subtitle: 'Curated edits for every celebration',
    image: 'https://images.unsplash.com/photo-1756483529841-a7e392fd7db1?auto=format&fit=crop&w=2400&q=80',
    link: '/category/festive-wear',
  },
];

const categoryTiles = [
  {
    name: 'Kurta Sets',
    category: 'kurta-sets',
    image: 'https://images.unsplash.com/photo-1756483527592-0b715e5bd08c?auto=format&fit=crop&w=2400&q=80',
  },
  {
    name: 'Sarees',
    category: 'sarees',
    image: 'https://images.unsplash.com/photo-1756483510830-878773b5a59d?auto=format&fit=crop&w=2400&q=80',
  },
  {
    name: 'Lehengas',
    category: 'lehengas',
    image: 'https://images.unsplash.com/photo-1756483510818-060b42c7cecc?auto=format&fit=crop&w=2400&q=80',
  },
  {
    name: 'Festive Wear',
    category: 'festive-wear',
    image: 'https://images.unsplash.com/photo-1756483509177-bbabd67a3234?auto=format&fit=crop&w=2400&q=80',
  },
];

const homeLifestyleTiles = [
  {
    name: 'Bedsheets',
    category: 'bedsheets',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=2400&q=80',
  },
  {
    name: 'Pillow Covers',
    category: 'pillow-covers',
    image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2400&q=80',
  },
  {
    name: 'Cushion Covers',
    category: 'cushion-covers',
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=2400&q=80',
  },
];

const promotions = [
  {
    title: 'Royal Wedding Edit',
    detail: 'Exclusive bridal arrivals with hand embroidery and pure silk.',
  },
  {
    title: 'Spring Festive Capsule',
    detail: 'Statement pieces in jewel tones with limited seasonal drops.',
  },
  {
    title: 'Artisan Signature Week',
    detail: 'Spotlight on handcrafted pieces from regional ateliers.',
  },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [featured, trending] = await Promise.all([
          productsAPI.getAll({ featured: true, limit: 4 }),
          productsAPI.getAll({ category: 'most-desired', limit: 4 }),
        ]);
        setFeaturedProducts((featured.data || []).filter(p => p.status === 'published'));
        setTrendingProducts((trending.data || []).filter(p => p.status === 'published'));
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
      <section className="relative min-h-[82vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1771654104630-e3aeb6c15793?auto=format&fit=crop&w=2600&q=80"
          alt="Royal Indian traditional fashion"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/35 to-black/45" />
        <div className="hero-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-mandala opacity-20 mix-blend-screen" />

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1 }}
          className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl items-end px-6 pb-20 md:px-12 lg:px-20"
        >
          <div className="glass-dark w-full max-w-2xl rounded-[2rem] p-8 text-primary-foreground md:p-12">
            <p className="mb-5 font-body text-[11px] uppercase tracking-[0.4em] text-accent">
              Luxury Indian Atelier
            </p>
            <h1 className="mb-6 text-5xl font-medium leading-tight md:text-7xl">
              Timeless Elegance in Silk
            </h1>
            <p className="mb-8 max-w-xl text-sm text-primary-foreground/82 md:text-base">
              Discover handcrafted sarees inspired by tradition and designed for modern elegance.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button data-testid="hero-shop-button" asChild className="btn-luxury">
                <Link to="/category/sarees">
                  Shop Sarees <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button data-testid="hero-lookbook-button" asChild className="btn-luxury-outline">
                <Link to="/products">Explore Collection</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="luxury-section px-6 md:px-12 lg:px-20">
        <div className="mb-14 flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-secondary">Featured Collections</p>
            <h2 className="text-4xl font-medium text-primary md:text-5xl">Curated For Grand Occasions</h2>
          </div>
          <Button asChild variant="outline" className="hidden md:inline-flex">
            <Link to="/luxury-collection">Explore Luxury Edit</Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {featuredCollectionTiles.map((tile, index) => (
            <motion.div
              key={tile.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: index * 0.1 }}
            >
              <Link
                to={tile.link}
                className="group relative block overflow-hidden rounded-[1.6rem] border border-accent/20 shadow-luxury"
              >
                <img
                  src={tile.image}
                  alt={tile.title}
                  className="h-[420px] w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/18 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-primary-foreground">
                  <h3 className="mb-2 text-3xl font-medium">{tile.title}</h3>
                  <p className="mb-3 text-sm text-primary-foreground/80">{tile.subtitle}</p>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-accent">
                    Discover <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="gold-divider mx-6 md:mx-12 lg:mx-20" />

      <section className="luxury-section bg-gradient-to-b from-primary/95 to-charcoal px-6 text-primary-foreground md:px-12 lg:px-20">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-accent">Featured Products</p>
            <h2 className="text-4xl font-medium md:text-5xl">The Heritage Edit</h2>
          </div>
          <Button data-testid="view-all-products-button" asChild variant="outline" className="border-accent/40 bg-primary-foreground/10 text-primary-foreground hover:bg-accent/20 hover:text-primary-foreground">
            <Link to="/products">View Entire Trousseau</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-luxury h-[430px] animate-pulse rounded-[1.4rem]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4" data-testid="featured-products-grid">
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="luxury-section px-6 md:px-12 lg:px-20">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-secondary">Category Showcase</p>
          <h2 className="text-4xl font-medium text-primary md:text-5xl">Lookbook Highlights</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {categoryTiles.map((tile, index) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.65, delay: index * 0.08 }}
            >
              <Link
                to={`/category/${encodeURIComponent(tile.category)}`}
                data-testid={`category-${tile.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group relative block overflow-hidden rounded-[1.6rem] border border-accent/20 shadow-luxury"
              >
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="h-[360px] w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-7">
                  <h3 className="text-4xl font-medium text-primary-foreground">{tile.name}</h3>
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-accent">
                    Explore <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="luxury-section bg-background px-6 md:px-12 lg:px-20">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-secondary">Home Edit</p>
          <h2 className="text-4xl font-medium text-primary md:text-5xl">Home & Lifestyle</h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground">
            Luxury textiles to elevate your living space
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {homeLifestyleTiles.map((tile, index) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.65, delay: index * 0.08 }}
            >
              <Link
                to={`/category/${encodeURIComponent(tile.category)}`}
                data-testid={`home-lifestyle-${tile.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group relative block overflow-hidden rounded-[1.6rem] border border-accent/20 shadow-luxury"
              >
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="h-[360px] w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <h3 className="text-3xl font-medium text-primary-foreground">{tile.name}</h3>
                  <span className="mt-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-accent">
                    Shop Now <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="luxury-section bg-background px-6 md:px-12 lg:px-20">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-secondary">Trending Products</p>
            <h2 className="text-4xl font-medium text-primary md:text-5xl">Most Desired Right Now</h2>
          </div>
          <div className="glass-luxury rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-secondary">
            New Stories Weekly
          </div>
        </div>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-luxury h-[430px] animate-pulse rounded-[1.4rem]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4" data-testid="trending-products-grid">
            {trendingProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="luxury-section bg-primary px-6 text-primary-foreground md:px-12 lg:px-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
          >
            <p className="mb-3 text-[11px] uppercase tracking-[0.34em] text-accent">Festive Promotions</p>
            <h2 className="mb-6 text-4xl font-medium md:text-5xl">Seasonal Royal Calendar</h2>
            <p className="mb-8 max-w-2xl text-primary-foreground/82">
              Limited-edition festive launches inspired by Indian royalty, temple art, and heirloom craftsmanship.
            </p>
            <Button data-testid="about-us-button" asChild className="btn-luxury">
              <Link to="/about">Explore Our Story</Link>
            </Button>
          </motion.div>

          <div className="space-y-4">
            {promotions.map((promo, index) => (
              <motion.div
                key={promo.title}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="glass-dark rounded-2xl p-5"
              >
                <p className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-accent">
                  <Sparkles className="h-4 w-4" />
                  {promo.title}
                </p>
                <p className="text-sm text-primary-foreground/82">{promo.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="luxury-section px-6 md:px-12 lg:px-20">
        <div className="glass-luxury-strong mx-auto max-w-3xl rounded-[2rem] p-10 text-center md:p-14">
          <Star className="mx-auto mb-5 h-10 w-10 text-accent" />
          <h2 className="mb-4 text-4xl font-medium text-primary md:text-5xl">Join The Heritage Circle</h2>
          <p className="mb-8 text-sm text-muted-foreground md:text-base">
            Access first drops, private previews, and festive style notes from our atelier.
          </p>
          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Your email address"
              data-testid="newsletter-input"
              className="h-12 flex-1 rounded-full border border-accent/35 bg-background/80 px-5 text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-accent"
            />
            <Button data-testid="newsletter-subscribe-button" className="btn-luxury h-12">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
