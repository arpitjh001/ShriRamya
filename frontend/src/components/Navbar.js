import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
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
const Navbar = () => {
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
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch wishlist count
  useEffect(() => {
    if (!user) { setWishlistCount(0); return; }
    const uid = user?.id || user?.userId || 'guest';
    const API_BASE = process.env.REACT_APP_BACKEND_URL;
    fetch(`${API_BASE}/api/v1/wishlist?userId=${uid}`)
      .then(r => r.json())
      .then(d => setWishlistCount((d.data || []).length))
      .catch(() => {});
  }, [user, location.pathname]);

  // Constants & Data
  const categories = useMemo(() => [
    { 
      name: 'Women Wear', 
      slug: 'women-wear', 
      image: '/images/premium/saree_model_high_res_1773311100000_1773310975132.png',
      subcategories: ['Sarees', 'Lehengas', 'Suits', 'Kurtis', 'Kurti Material', 'Dupattas'] 
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
    // Shrink check
    setIsScrolled(latest > 50);

    // Visibility check (Hide on scroll down, Show on scroll up)
    if (latest > lastScrollY && latest > 150) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
    setLastScrollY(latest);
  });

  const isAdminPage = location.pathname.startsWith('/admin');

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  // Navigation Logic: Scroll on Hover
  const handleCategoryHover = useCallback((slug) => {
    // As per user request: Scroll to the particular category on home page
    const section = document.getElementById(slug);
    if (section && location.pathname === '/') {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname]);

  // Navigate to category page only on click
  const handleCategoryClick = useCallback((slug) => {
    navigate(`/category/${slug}`);
  }, [navigate]);

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
    <header className="relative z-[100]">
      <PromoBar 
        showDashboard={user && isAdmin()}
        onDashboardClick={() => navigate('/admin/dashboard')}
      />
      
      <motion.nav
        initial={{ y: 0 }}
        animate={{ 
          y: isVisible ? 0 : -140,
          backgroundColor: isScrolled ? "rgba(247, 243, 236, 0.85)" : "rgba(247, 243, 236, 0.98)",
          backdropFilter: isScrolled ? "blur(30px) saturate(200%)" : "blur(12px)",
          borderBottomColor: isScrolled ? "rgba(42, 42, 42, 0.12)" : "rgba(42, 42, 42, 0.05)",
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed left-0 right-0 top-[35px] md:top-[38px] transition-all duration-500 border-b ${
          (isScrolled || isAdminPage) ? 'py-3 shadow-glass' : 'py-4 md:py-5 shadow-none'
        }`}
      >
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8 xl:px-12 h-full">
          {/* Main Flex Layout matching Berdy.in (Logo Left, Links Center, Icons Right) */}
          <div className="flex items-center justify-between w-full h-full relative">
            
            {/* Left: Hamburger (Mobile) + Logo (Desktop/Mobile) */}
            <div className="flex items-center justify-start flex-shrink-0">
               {/* Hamburger Menu (< 1024px) */}
               <motion.button
                 whileHover={{ scale: 1.1, rotate: 90 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="lg:hidden p-2 -ml-2 mr-2 hover:bg-charcoal/5 rounded-full transition-all group"
                 aria-label="Open Menu"
               >
                 <Menu className="w-6 h-6 text-charcoal group-hover:text-royal-maroon transition-colors" />
               </motion.button>

               {/* Brand Logo */}
               <Link 
                 to="/" 
                 className="flex items-center justify-center group" 
                 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
               >
                 <motion.img
                   animate={{ 
                     height: isScrolled ? (window.innerWidth < 1024 ? 42 : 56) : (window.innerWidth < 1024 ? 52 : 78),
                     scale: isScrolled ? 0.95 : 1 
                   }}
                   src="/logo.png"
                   alt="Shri Ramya"
                   className="transition-all duration-700 drop-shadow-sm group-hover:drop-shadow-md object-contain h-auto site-logo"
                 />
               </Link>
            </div>

            {/* Center: All Categories (Desktop Only) */}
            <div className={`hidden lg:flex flex-1 items-center justify-center transition-all duration-500 gap-x-6 xl:gap-x-10 px-4`}>
               {categories.map(cat => (
                 <button 
                  key={cat.slug}
                  onMouseEnter={() => handleCategoryHover(cat.slug)}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="relative text-[13px] xl:text-[14px] uppercase font-heading font-medium tracking-[0.08em] xl:tracking-[0.14em] text-charcoal/90 hover:text-royal-maroon transition-all group whitespace-nowrap text-center"
                 >
                   {cat.name}
                   <span className="absolute bottom-[-10px] lg:bottom-[-6px] left-0 w-full h-[1.5px] bg-royal-maroon transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                 </button>
               ))}
               <Link 
                 to="/blog" 
                 className="relative text-[13px] xl:text-[14px] uppercase font-heading font-medium tracking-[0.08em] xl:tracking-[0.14em] text-charcoal/90 hover:text-royal-maroon transition-all group whitespace-nowrap text-center"
               >
                 Journal
                 <span className="absolute bottom-[-10px] lg:bottom-[-6px] left-0 w-full h-[1.5px] bg-royal-maroon transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
               </Link>
            </div>

            {/* Right Side: Utility Icons */}
            <div className="flex items-center justify-end flex-shrink-0">
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
