
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, CheckCircle2, Crown, Loader2, Mail, Sparkles, Star } from 'lucide-react';
import { insiderAPI, productsAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import ProductCard from '../components/ProductCard';
import RecentlyViewed from '../components/RecentlyViewed';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import SEOMeta from '../components/SEOMeta';
import { toast } from 'sonner';

const featuredCollectionTiles = [
  {
    title: 'Wedding Couture',
    subtitle: 'Regal silhouettes for grand ceremonies',
    image: '/images/premium/homepage/wedding_couture.png',
    link: '/luxury-collection',
  },
  {
    title: 'Heirloom Sarees',
    subtitle: 'Handloom drapes with intricate zari work',
    image: '/images/premium/homepage/sarees.png',
    link: '/category/sarees',
  },
  {
    title: 'Festive Classics',
    subtitle: 'Curated edits for every celebration',
    image: '/images/premium/homepage/festive_wear.png',
    link: '/category/festive-wear',
  },
];

const categoryTiles = [
  {
    name: 'Kurta Sets',
    category: 'kurta-sets',
    image: '/images/premium/homepage/kurta_sets.png',
  },
  {
    name: 'Sarees',
    category: 'sarees',
    image: '/images/premium/homepage/sarees.png',
  },
  {
    name: 'Kurti Material',
    category: 'kurti-material',
    image: 'https://images.unsplash.com/photo-1773846012458-e6a66c26e49f?auto=format&fit=crop&w=1400&q=80',
  },
  {
    name: 'Festive Wear',
    category: 'festive-wear',
    image: '/images/premium/homepage/festive_wear.png',
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

const jewelleryTiles = [
  {
    name: 'Statement Collections',
    category: 'jewellery',
    image: '/images/premium/semi_precious_jewellery_featured_1773308445473.png',
  },
  {
    name: 'Earrings & Jhumkas',
    category: 'earrings',
    image: '/images/premium/jewellery_earrings_tile_1773308475012.png',
  },
  {
    name: 'Luxury Bangles',
    category: 'bangles',
    image: '/images/premium/jewellery_bangles_tile_1773308496138.png',
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

const insiderBenefits = [
  {
    title: 'Weekly Collection Note',
    detail: 'A once-a-week digest with newly launched collections and fresh arrivals.',
    icon: CalendarDays,
  },
  {
    title: 'Early Access',
    detail: 'Private previews for festive edits, limited drops, and premium launches.',
    icon: Crown,
  },
  {
    title: 'Editorial Styling',
    detail: 'Curated notes on what to wear, gift, and collect next.',
    icon: Mail,
  },
];

const insiderInterestOptions = [
  { value: 'women-wear', label: 'Women Wear' },
  { value: 'festive-wear', label: 'Festive Wear' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'home-lifestyle', label: 'Home Lifestyle' },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [insiderForm, setInsiderForm] = useState({
    firstName: '',
    email: '',
    interests: ['women-wear', 'festive-wear'],
  });
  const [insiderSubmitting, setInsiderSubmitting] = useState(false);
  const [insiderSuccess, setInsiderSuccess] = useState(false);

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

    // Reset scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  const toggleInsiderInterest = (value) => {
    setInsiderForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((entry) => entry !== value)
        : [...current.interests, value],
    }));
  };

  const handleInsiderSubmit = async (event) => {
    event.preventDefault();

    if (!insiderForm.email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setInsiderSubmitting(true);

    try {
      await insiderAPI.subscribe({
        firstName: insiderForm.firstName,
        email: insiderForm.email,
        interests: insiderForm.interests,
        source: 'homepage',
        signupPage: 'homepage',
      });

      setInsiderSuccess(true);
      setInsiderForm((current) => ({
        ...current,
        email: '',
      }));
      toast.success('You are now part of the Insider Circle');
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Unable to join the Insider Circle');
    } finally {
      setInsiderSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30">
      <SEOMeta 
        title="Premium Indian Handloom Sarees & Ethnic Wear"
        description="Shop authentic Banarasi silk sarees, designer kurtis, and handcrafted ethnic wear at ShriRamya. Free shipping on orders above Rs 999."
        url="/"
        type="website"
      />
      <section className="relative min-h-[90vh] overflow-hidden">
        <img
          src="/images/premium/homepage/wedding_couture.png"
          alt="Royal Indian traditional fashion"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[10000ms] hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/50" />
        <div className="hero-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-mandala opacity-10 mix-blend-screen pulse" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto flex min-h-[90vh] max-w-7xl items-center px-6 md:px-12 lg:px-20"
        >
          <div className="glass-dark w-full max-w-2xl rounded-[2.5rem] p-10 text-primary-foreground md:p-16 shadow-2xl border border-white/10">
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-5 font-body text-xs uppercase tracking-[0.5em] text-accent font-bold"
            >
              Luxury Indian Atelier
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8 text-6xl font-medium leading-[1.1] md:text-8xl tracking-tight"
            >
              Timeless <br/><span className="italic font-serif text-accent">Elegance</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-10 max-w-xl text-lg text-primary-foreground/90 leading-relaxed"
            >
              Discover handcrafted sarees inspired by tradition and designed for modern royalty. Each piece tells a story of heritage craftsmanship.
            </motion.p>
            <div className="flex flex-col gap-5 sm:flex-row">
              <Button data-testid="hero-shop-button" asChild size="lg" className="btn-luxury px-10 rounded-full h-14 text-base shadow-luxury">
                <Link to="/category/sarees">
                  Shop Sarees <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button data-testid="hero-lookbook-button" asChild size="lg" variant="outline" className="border-white/30 bg-white/15 hover:bg-white/25 px-10 rounded-full h-14 text-base backdrop-blur-md transition-all">
                <Link to="/products">Explore Collection</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Luxury Collection / Heritage Edit */}
      <section id="women-wear" className="luxury-section bg-gradient-to-b from-primary to-charcoal px-6 text-primary-foreground md:px-12 lg:px-20 py-32">
        <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-[12px] uppercase tracking-[0.4em] text-accent font-bold">The Heritage Edit</p>
            <h2 className="text-5xl font-medium md:text-6xl tracking-tight">Regal Masterpieces</h2>
          </div>
          <Button data-testid="view-all-products-button" asChild variant="outline" className="btn-luxury-outline text-primary-foreground border-accent/40 hover:bg-accent/10 rounded-full px-8">
            <Link to="/products">View Entire Trousseau</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-luxury h-[480px] animate-pulse rounded-[2rem]" />
            ))}
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 1500,
                stopOnInteraction: false,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4 md:-ml-8" data-testid="featured-products-grid">
              {featuredProducts.map((product, index) => (
                <CarouselItem key={product.id} className="pl-4 md:pl-8 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                  >
                    <div className="transform transition-transform hover:-translate-y-2 duration-500">
                       <ProductCard product={product} />
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </section>

      {/* Featured Collections / Luxury Showcase */}
      <section id="luxury-collection" className="luxury-section px-6 md:px-12 lg:px-20 py-32 relative">
        {/* Clip decorative glow so it never creates horizontal page overflow (hides navbar icons on mobile/Chrome). */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1/3 translate-x-1/2 bg-accent/5 blur-3xl opacity-30" />
        </div>
        <div className="mb-16 flex items-end justify-between gap-8 border-b border-charcoal/5 pb-8">
          <div className="max-w-2xl">
            <p className="mb-4 text-[12px] uppercase tracking-[0.4em] text-secondary font-bold">Featured Collections</p>
            <h2 className="text-5xl font-medium text-primary md:text-6xl tracking-tight">Curated For Grand Occasions</h2>
            <p className="mt-4 text-muted-foreground text-lg">Hand-picked ensembles that define the essence of luxury and celebration.</p>
          </div>
          <Button asChild variant="ghost" className="hidden md:inline-flex group transition-all hover:bg-royal-maroon/5 text-royal-maroon font-bold tracking-widest uppercase text-xs">
            <Link to="/luxury-collection" className="flex items-center gap-2">
              Explore Luxury Edit <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 1500,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-4 md:-ml-10">
            {featuredCollectionTiles.map((tile, index) => (
              <CarouselItem key={tile.title} className="pl-4 md:pl-10 md:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, delay: index * 0.15 }}
                >
                  <Link
                    to={tile.link}
                    className="group relative block overflow-hidden rounded-[2rem] border border-accent/10 shadow-luxury-hover transition-all duration-700 hover:shadow-2xl"
                  >
                    <img
                      src={tile.image}
                      alt={tile.title}
                      className="h-[520px] w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/20 to-transparent opacity-90" />
                    <div className="absolute inset-x-0 bottom-0 p-10 text-primary-foreground transform transition-transform duration-500 group-hover:translate-y-[-10px]">
                      <h3 className="mb-3 text-4xl font-medium tracking-tight leading-none">{tile.title}</h3>
                      <p className="mb-6 text-base text-primary-foreground/75 font-body">{tile.subtitle}</p>
                      <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-accent font-bold group-hover:text-white transition-colors">
                        Discover <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <div className="mx-6 md:mx-12 lg:mx-20 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Category Lookbook Highlights */}
      <section id="lookbook" className="luxury-section px-6 md:px-12 lg:px-20 py-32 bg-charcoal/2">
        <div className="mb-20 text-center">
          <p className="mb-4 text-[12px] uppercase tracking-[0.4em] text-secondary font-bold">Category Showcase</p>
          <h2 className="text-5xl font-medium text-primary md:text-6xl tracking-tight">Lookbook Highlights</h2>
          <div className="w-24 h-1 bg-accent mx-auto mt-8 rounded-full" />
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          {categoryTiles.map((tile, index) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1, delay: index * 0.1 }}
            >
              <Link
                to={`/category/${encodeURIComponent(tile.category)}`}
                className="group relative block overflow-hidden rounded-[2.5rem] border border-accent/15 shadow-2xl"
              >
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="h-[440px] w-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent opacity-85 transition-opacity duration-700 group-hover:opacity-95" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-6 p-10">
                  <h3 className="text-5xl font-medium text-primary-foreground tracking-tight">{tile.name}</h3>
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-accent/20 border border-accent/40 backdrop-blur-md transform group-hover:scale-110 transition-transform duration-500">
                    <ArrowRight className="h-7 w-7 text-accent transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Regional Collections Placeholder Mapping */}
      <section id="regional-collections" className="py-2"></section>

      {/* Home & Lifestyle */}
      <section id="home-lifestyle" className="luxury-section bg-primary-foreground/50 px-6 md:px-12 lg:px-20 py-32 border-y border-charcoal/5">
        <div className="mb-16 text-center max-w-4xl mx-auto">
          <p className="mb-4 text-[12px] uppercase tracking-[0.4em] text-secondary font-bold">The Home Atelier</p>
          <h2 className="text-5xl font-medium text-primary md:text-6xl tracking-tight">Living In Grandeur</h2>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
            From artisanal textiles to heritage accents, discover luxury pieces choreographed to elevate your sanctuary.
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 1500,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-4 md:-ml-8">
            {homeLifestyleTiles.map((tile, index) => (
              <CarouselItem key={tile.name} className="pl-4 md:pl-8 md:basis-1/3">
                <motion.div
                  whileHover={{ y: -10 }}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                >
                  <Link
                    to={`/category/${encodeURIComponent(tile.category)}`}
                    className="group relative block overflow-hidden rounded-3xl border border-accent/20 shadow-lg hover:shadow-2xl transition-all duration-500"
                  >
                    <img
                      src={tile.image}
                      alt={tile.name}
                      className="h-[400px] w-full object-cover grayscale-[20%] transition-transform duration-1000 group-hover:scale-105 group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-8 text-center">
                      <h3 className="text-3xl font-medium text-primary-foreground">{tile.name}</h3>
                      <div className="mt-4 h-0.5 w-12 bg-accent mx-auto transform scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
                    </div>
                  </Link>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Semi Precious Jewellery */}
      <section id="jewellery" className="luxury-section bg-gradient-to-b from-charcoal/5 to-background px-6 md:px-12 lg:px-20 py-32 overflow-hidden">
        <div className="mb-20 flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-full bg-accent/10 border border-accent/20"
          >
            <Sparkles className="h-8 w-8 text-accent" />
          </motion.div>
          <p className="mb-4 text-[12px] uppercase tracking-[0.5em] text-secondary font-bold">Heritage Ornamentation</p>
          <h2 className="text-5xl font-medium text-primary md:text-7xl tracking-tighter">Semi Precious Jewellery</h2>
          <p className="mx-auto mt-8 max-w-3xl text-lg text-muted-foreground leading-relaxed">
            Ethereal craftsmanship meets modern brilliance. Each ornament is a tribute to the storied traditions of Indian royale.
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 1500,
              stopOnInteraction: false,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-4 md:-ml-10">
            {jewelleryTiles.map((tile, index) => (
              <CarouselItem key={tile.name} className="pl-4 md:pl-10 md:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 1.1, delay: index * 0.2 }}
                >
                  <Link
                    to={`/category/${encodeURIComponent(tile.category)}`}
                    className="group relative block overflow-hidden rounded-[2.5rem] border border-accent/30 shadow-2xl bg-white"
                  >
                    <div className="overflow-hidden relative">
                       <img
                        src={tile.image}
                        alt={tile.name}
                        className="h-[520px] w-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-primary/20 mix-blend-overlay group-hover:bg-transparent transition-colors duration-1000" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/100 via-primary/30 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute inset-x-0 bottom-0 p-10 transform translate-y-3 group-hover:translate-y-0 transition-all duration-700">
                      <h3 className="text-4xl font-medium text-primary-foreground mb-6 tracking-tight leading-none">{tile.name}</h3>
                      <div className="flex items-center gap-4 bg-accent/20 border border-accent/30 backdrop-blur-md rounded-full px-6 py-3 w-fit hover:bg-accent transition-colors group">
                        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-accent group-hover:text-primary-foreground">Legacy Collection</span>
                        <ArrowRight className="h-4 w-4 text-accent transform group-hover:translate-x-2 group-hover:text-primary-foreground transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Trending Products */}
      <section className="luxury-section bg-background px-6 md:px-12 lg:px-20 py-32 border-t border-charcoal/5">
        <div className="mb-20 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 text-[12px] uppercase tracking-[0.4em] text-secondary font-bold">Trending Right Now</p>
            <h2 className="text-5xl font-medium text-primary md:text-6xl tracking-tight">The Modern Muse</h2>
            <p className="mt-4 text-muted-foreground text-lg">Curated pieces that are defining contemporary luxury across the globe.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="glass-luxury rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-secondary border border-charcoal/10 shadow-glass">
              Limited Edition Weekly
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-luxury h-[480px] animate-pulse rounded-[2rem]" />
            ))}
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 1500,
                stopOnInteraction: false,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4 md:-ml-8" data-testid="trending-products-grid">
              {trendingProducts.map((product, index) => (
                <CarouselItem key={product.id} className="pl-4 md:pl-8 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <div className="hover-lift">
                      <ProductCard product={product} />
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </section>

      {/* Seasonal Promo */}
      <section className="luxury-section bg-primary px-6 text-primary-foreground md:px-12 lg:px-20 py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-mandala opacity-5 mix-blend-screen scale-150" />
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1 }}
          >
            <p className="mb-4 text-[13px] uppercase tracking-[0.5em] text-accent font-bold">Royal Traditions</p>
            <h2 className="mb-8 text-6xl font-medium md:text-7xl tracking-tighter leading-[0.95]">Seasonal <br/>Atelier Highlights</h2>
            <p className="mb-10 max-w-2xl text-xl text-primary-foreground/85 leading-relaxed font-body font-light">
              Limited-edition capsule releases inspired by the rhythmic beauty of our heritage. Rare hand-embroidery, pure gold zari, and fabrics sourced from India's most legendary looms.
            </p>
            <Button data-testid="about-us-button" asChild size="lg" className="btn-luxury px-12 rounded-full h-14 text-base">
              <Link to="/about">Our Craft Story</Link>
            </Button>
          </motion.div>

          <div className="grid gap-6">
            {promotions.map((promo, index) => (
              <motion.div
                key={promo.title}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, delay: index * 0.15 }}
                className="glass-dark-strong rounded-[2rem] p-8 border border-white/5 hover:border-accent/40 transition-all duration-500 hover:shadow-2xl"
              >
                <p className="mb-4 flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-accent font-bold">
                  <Sparkles className="h-5 w-5" />
                  {promo.title}
                </p>
                <p className="text-lg text-primary-foreground/90 font-light leading-relaxed">{promo.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter / Join The Heritage Circle */}
      <section className="luxury-section px-6 md:px-12 lg:px-20 py-24">
        <div className="glass-luxury-strong mx-auto max-w-6xl overflow-hidden rounded-[3rem] border border-accent/20 shadow-heavy">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden border-b border-accent/10 p-10 md:p-14 lg:border-b-0 lg:border-r">
              <div className="absolute -left-12 top-10 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
              <motion.div
                initial={{ rotate: -15 }}
                whileInView={{ rotate: 0 }}
                transition={{ duration: 1, type: "spring" }}
                className="relative"
              >
                <Star className="mb-8 h-12 w-12 text-accent" />
              </motion.div>
              <p className="mb-4 text-[12px] uppercase tracking-[0.35em] text-secondary font-bold">Insider Circle</p>
              <h2 className="mb-6 text-5xl font-medium text-primary md:text-6xl tracking-tight">Become An Insider</h2>
              <p className="max-w-2xl text-lg text-muted-foreground font-light leading-relaxed">
                Not just a newsletter. This should feel like a private front row pass to Shri Ramya:
                weekly collection notes, early-access drops, and editorial styling cues worth opening.
              </p>

              <div className="mt-10 grid gap-4">
                {insiderBenefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.6, delay: index * 0.08 }}
                      className="rounded-[1.75rem] border border-accent/10 bg-white/45 p-5 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-primary">{benefit.title}</p>
                          <p className="mt-1 text-sm leading-7 text-muted-foreground">{benefit.detail}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-white/80 via-[#fff8ef] to-[#f8efe3] p-10 md:p-14">
              <div className="mx-auto max-w-xl">
                <p className="mb-3 text-sm uppercase tracking-[0.28em] text-secondary font-bold">Weekly Edit</p>
                <h3 className="text-3xl font-medium text-primary tracking-tight">Join for curated updates, not noise</h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  We send a weekly roundup when new collections land. Tell us what you care about so the insider flow can become more tailored over time.
                </p>

                <form className="mt-8 space-y-5" onSubmit={handleInsiderSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">First Name</label>
                      <Input
                        type="text"
                        value={insiderForm.firstName}
                        onChange={(event) => setInsiderForm((current) => ({ ...current, firstName: event.target.value }))}
                        placeholder="Aarohi"
                        className="h-12 rounded-full border-accent/25 bg-white/80 px-5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Email</label>
                      <Input
                        type="email"
                        value={insiderForm.email}
                        onChange={(event) => {
                          setInsiderSuccess(false);
                          setInsiderForm((current) => ({ ...current, email: event.target.value }));
                        }}
                        placeholder="you@example.com"
                        data-testid="newsletter-input"
                        className="h-12 rounded-full border-accent/25 bg-white/80 px-5"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">What interests you most?</p>
                    <div className="flex flex-wrap gap-3">
                      {insiderInterestOptions.map((option) => {
                        const active = insiderForm.interests.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleInsiderInterest(option.value)}
                            className={`rounded-full border px-4 py-2 text-sm transition-all ${
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-md'
                                : 'border-accent/25 bg-white/70 text-foreground hover:border-accent/50 hover:bg-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    data-testid="newsletter-subscribe-button"
                    size="lg"
                    disabled={insiderSubmitting}
                    className="btn-luxury h-14 w-full rounded-full text-base"
                  >
                    {insiderSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining the circle
                      </>
                    ) : (
                      <>
                        Join Circle
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="rounded-[1.5rem] border border-accent/10 bg-white/55 p-4 text-sm leading-7 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className={`mt-1 h-5 w-5 shrink-0 ${insiderSuccess ? 'text-green-600' : 'text-accent'}`} />
                      <p>
                        {insiderSuccess
                          ? 'You are in. Watch for a welcome email and then one thoughtfully curated note each week.'
                          : 'Privacy is our philosophy. One weekly update, no clutter, and an unsubscribe link in every email.'}
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed Products */}
      <RecentlyViewed />
    </div>
  );
};

export default HomePage;
