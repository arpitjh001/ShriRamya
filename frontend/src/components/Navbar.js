import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { wishlistAPI } from '../services/api';
import AuthDialog from './AuthDialog';

// Sub-components
import PromoBar from './navbar/PromoBar';
import NavIcons from './navbar/NavIcons';
import SearchAutocomplete from './navbar/SearchAutocomplete';
import MegaMenu from './navbar/MegaMenu';
import MobileNav from './navbar/MobileNav';

/**
 * Main Navbar Component - Transformed into a premium, modular, and animated navigation.
 * Features: React.memo, Scroll-aware behavior, Glassmorphism, Framer Motion animations.
 */
const Navbar = ({ isHome = false }) => {
  const { user, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Navigation State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  
  // Scroll State
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const promoBarRef = useRef(null);
  const [promoBarHeight, setPromoBarHeight] = useState(37);

  const refreshWishlistCount = useCallback(async () => {
    if (!user) {
      setWishlistCount(0);
      return;
    }

    const uid = user?.id || user?.userId || 'guest';
    try {
      const response = await wishlistAPI.get({ userId: uid });
      setWishlistCount((response.data || []).length);
    } catch {
      setWishlistCount(0);
    }
  }, [user]);

  // Fetch wishlist count
  useEffect(() => {
    refreshWishlistCount();
    window.addEventListener('wishlist:changed', refreshWishlistCount);
    return () => window.removeEventListener('wishlist:changed', refreshWishlistCount);
  }, [refreshWishlistCount, location.pathname]);

  // Constants & Data
  const categories = useMemo(() => [
    { 
      name: 'Women Wear', 
      slug: 'women-wear', 
      image: '/images/premium/saree_model_high_res_1773311100000_1773310975132.png',
      subcategories: ['Sarees', 'Suits', 'Kurtis', 'Kurti Material', 'Dupattas'] 
    },
    { 
      name: 'Luxury Collection', 
      slug: 'luxury-collection', 
      image: '/images/premium/lehenga_model_high_res_1773311100000_1773310991053.png',
      subcategories: ['Handcrafted Silk', 'Zardosi Work', 'Bridal Edit', 'Heritage Weaves'] 
    },
    { 
      name: 'Regional Collections', 
      slug: 'regional-collections', 
      image: '/images/premium/kurta_model_high_res_1773311100000_1773311153028.png',
      subcategories: ['Sanganeri', 'Bagru', 'Indigo', 'Kalamkari'] 
    },
    { 
      name: 'Home & Lifestyle', 
      slug: 'home-lifestyle', 
      image: '/images/premium/anarkali_model_high_res_1773311100000_1773311004972.png',
      subcategories: ['Bed Linen', 'Table Decor', 'Artisanal Gifts', 'Wellness'] 
    },
    { 
      name: 'Jewellery', 
      slug: 'jewellery', 
      image: '/images/premium/jewellery_model_high_res_1773311100000_1773311171859.png',
      subcategories: ['Necklaces', 'Earrings', 'Bangles', 'Rings', 'Set Pieces'] 
    }
  ], []);

  // Handle Scroll Behavior
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const isAdminPage = location.pathname.startsWith('/admin');
  const isProductDetail = location.pathname.startsWith('/products/');
  const overlapsHero = isHome && !isAdminPage;
  const navbarTop = overlapsHero ? (isScrolled ? 0 : promoBarHeight) : 0;

  useEffect(() => {
    const node = promoBarRef.current;
    if (!node) return;

    const updatePromoBarHeight = () => {
      setPromoBarHeight(Math.round(node.getBoundingClientRect().height));
    };

    updatePromoBarHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updatePromoBarHeight);
      return () => window.removeEventListener('resize', updatePromoBarHeight);
    }

    const observer = new ResizeObserver(updatePromoBarHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  // Navigation Logic: Scroll on Hover
  const handleCategoryHover = useCallback((slug) => {
    // As per user request: Scroll to the particular category on home page
    // Special case for 'women-wear' which should point to 'lookbook'
    const targetId = slug === 'women-wear' ? 'lookbook' : slug;
    const section = document.getElementById(targetId);
    if (section && location.pathname === '/') {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  // Navigate to category page only on click
  const handleCategoryClick = useCallback((slug) => {
    if (slug === 'women-wear') {
      if (location.pathname === '/') {
        const section = document.getElementById('lookbook');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      } else {
        navigate('/#lookbook');
        return;
      }
    }
    navigate(`/category/${slug}`);
  }, [navigate, location.pathname]);

  // Handle hash navigation on mount/pathname change
  useEffect(() => {
    if (location.hash && location.pathname === '/') {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const section = document.getElementById(id);
        if (section) section.scrollIntoView({ behavior: 'smooth' });
      }, 500); // Wait for page render
    }
  }, [location.pathname, location.hash]);

  return (
    <header className={`${overlapsHero ? 'relative' : 'sticky'} left-0 right-0 top-0 z-[110]`}>
      <div ref={promoBarRef}>
        <PromoBar
          messages={isHome 
          ? ["Experience Royal Elegance", "Use code: FESTIVE15 for 15% OFF", "Free shipping on orders above ₹2500"] 
            : ["Luxury Heritage Wear", "Use code: FESTIVE15 for 15% OFF"]
          }
          variant="default"
          showDashboard={user && isAdmin()}
          onDashboardClick={() => navigate('/admin/dashboard')}
          isHome={isHome}
          isScrolled={isScrolled}
        />
      </div>
      
      <motion.nav
        initial={{ y: 0 }}
        animate={{ 
          top: navbarTop,
          y: 0,
          backgroundColor: overlapsHero && !isScrolled
            ? "rgba(106, 30, 45, 0.28)"
            : "rgba(106, 30, 45, 0.58)",
          borderColor: overlapsHero && !isScrolled
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(255, 255, 255, 0.12)",
          boxShadow: (isScrolled || isAdminPage || !isHome)
            ? "0 20px 44px rgba(64, 13, 23, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.28)"
            : "0 16px 42px rgba(64, 13, 23, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.24)",
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`${overlapsHero ? 'fixed z-[110]' : 'relative'} left-0 right-0 w-full overflow-visible border-b backdrop-blur-[40px] transition-all duration-500 supports-[backdrop-filter]:bg-royal-maroon/45 ${
          isScrolled 
            ? 'py-3' 
            : (isAdminPage ? 'py-3' : 'py-4 md:py-5')
        }`}
      >
        <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 h-full">
          {/* Main Flex Layout matching Berdy.in (Logo Left, Links Center, Icons Right) */}
          <div className="flex items-center justify-between gap-3 lg:gap-5 w-full h-full relative">
            
            {/* Left: Hamburger (Mobile) + Logo (Desktop/Mobile) */}
            <div className="flex items-center justify-start flex-shrink-0 lg:w-12 xl:w-16">
               {/* Hamburger Menu (< 1024px) */}
               <motion.button
                 whileHover={{ scale: 1.1, rotate: 90 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="lg:hidden p-2 -ml-2 mr-1.5 hover:bg-white/10 rounded-full transition-all group"
                 aria-label="Open Menu"
               >
                 <Menu className="w-6 h-6 text-ivory group-hover:text-royal-gold transition-colors" />
               </motion.button>

               {/* Brand Logo - Mobile & Product Detail Desktop */}
               <Link 
                 to="/" 
                 className="flex lg:hidden items-center justify-center group" 
                 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
               >
                 <motion.img
                   animate={{ 
                     height: isScrolled ? 38 : 44,
                     scale: isScrolled ? 0.95 : 1 
                   }}
                   src="/logo_backup.png"
                   alt="Shri Ramya"
                   className="w-auto rounded-full object-cover transition-all duration-700 shadow-[0_10px_28px_rgba(64,13,23,0.24)] ring-1 ring-black/5 group-hover:shadow-[0_14px_34px_rgba(64,13,23,0.3)]"
                 />
               </Link>
            </div>

            {/* Brand Logo - Desktop Hanging Badge */}
            <Link
              to="/"
              className="hidden lg:flex absolute left-[-31px] xl:left-[-23px] top-full -translate-y-[34%] z-20 items-center justify-center group"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <motion.img
                animate={{
                  height: isScrolled ? 74 : 88,
                  scale: isScrolled ? 0.96 : 1
                }}
                src="/logo_backup.png"
                alt="Shri Ramya"
                className="w-auto rounded-full object-cover transition-all duration-700 shadow-[0_14px_36px_rgba(64,13,23,0.3)] ring-1 ring-black/5 group-hover:shadow-[0_18px_42px_rgba(64,13,23,0.36)]"
              />
            </Link>

            {/* Center: All Categories (Desktop Only) */}
            <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center transition-all duration-500 gap-x-2 lg:gap-x-3 xl:gap-x-6 2xl:gap-x-8 px-1 xl:px-4">
               {categories.map(cat => (
                 <button 
                  key={cat.slug}
                  onMouseEnter={() => handleCategoryHover(cat.slug)}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="relative text-[10px] lg:text-[11px] xl:text-[13px] uppercase font-heading font-medium tracking-[0.05em] xl:tracking-[0.12em] text-ivory/90 hover:text-royal-gold transition-all group whitespace-nowrap text-center"
                 >
                   {cat.name}
                   <span className="absolute bottom-[-10px] lg:bottom-[-6px] left-0 w-full h-[1.5px] bg-royal-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                 </button>
               ))}
               <Link 
                 to="/blog" 
                 className="relative text-[10px] lg:text-[11px] xl:text-[13px] uppercase font-heading font-medium tracking-[0.05em] xl:tracking-[0.12em] text-ivory/90 hover:text-royal-gold transition-all group whitespace-nowrap text-center"
               >
                 Journal
                 <span className="absolute bottom-[-10px] lg:bottom-[-6px] left-0 w-full h-[1.5px] bg-royal-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
               </Link>
            </div>

            {/* Right Side: Utility Icons */}
            <div className="flex min-w-0 items-center justify-end flex-shrink-0">
               <NavIcons 
                 cartCount={cartCount}
                 wishlistCount={wishlistCount}
                 hasNotifications={user && isAdmin()}
                 onSearchClick={() => setIsSearchOpen(true)} 
                 onAccountClick={() => (user ? navigate('/account') : setIsAuthDialogOpen(true))}
               />
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Overlays */}
      <SearchAutocomplete 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />

      <MobileNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        categories={categories}
        recentItems={[]} 
      />

      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </header>
  );
};

export default React.memo(Navbar);
