import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, X, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import AuthDialog from './AuthDialog';

const Navbar = () => {
  const { user, capabilities, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const categories = [
    { name: 'Women Wear', path: '/products?category=Women Ethnic Wear' },
    { name: 'Home & Lifestyle', path: '/products?category=Home %26 Lifestyle' },
    { name: 'Regional Collections', path: '/regional-collections' },
    { name: 'Luxury Collection', path: '/luxury-collection' },
    { name: 'Lookbook', path: '/lookbook' },
  ];

  const navLinkClass = "text-base font-heading font-semibold text-secondary hover:text-brand-ivory transition-colors px-2 py-1";
  const iconClass = "h-5 w-5 text-secondary hover:text-brand-ivory opacity-90 hover:opacity-100 transition-all";

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        {/* Top Bar */}
        <div className="bg-primary text-secondary py-2 text-xs md:text-sm font-medium px-6 md:px-12 lg:px-24 flex items-center justify-between border-b border-secondary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-mandala opacity-5" />
          <div className="flex-1 text-center relative z-10 tracking-[0.1em] uppercase">
            Free Shipping on Orders Above ₹999 | Authentic Handcrafted Collection
          </div>
          {(user?.role === 'admin' || capabilities?.edit_posts) && (
            <div className="flex items-center ml-4 relative z-10">
              <a
                href="/admin/woocommerce"
                className="dashboard-btn flex items-center gap-1.5 px-4 py-1.5 bg-secondary text-primary hover:bg-brand-ivory transition-all rounded-full text-[10px] md:text-xs font-bold shadow-md"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">DASHBOARD</span>
                <span className="sm:hidden">WP</span>
              </a>
            </div>
          )}
        </div>

        {/* Main Navbar - Maroon Strip */}
        <div className="bg-primary px-6 md:px-12 lg:px-24 py-2 relative shadow-xl border-b border-secondary/10">
          <div className="absolute inset-0 bg-mandala opacity-5 pointer-events-none" />
          <div className="flex items-center justify-between relative z-10 h-24">
            {/* Left side: Logo + Desktop Menu */}
            <div className="flex items-center gap-12">
              <Link
                to="/"
                data-testid="logo"
                className="flex items-center justify-center mr-4 transform hover:scale-105 transition-all duration-300"
              >
                <img
                  src={`${process.env.PUBLIC_URL}/logo.png`}
                  alt="Shri Ramya"
                  className="site-logo"
                />
              </Link>

              {/* Desktop Menu - Next to Logo */}
              <div className="hidden lg:flex items-center gap-8">
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={cat.path}
                    data-testid={`nav-${cat.name.toLowerCase()}`}
                    className={navLinkClass}
                  >
                    {cat.name}
                  </Link>
                ))}
                <Link
                  to="/blog"
                  data-testid="nav-blog"
                  className={navLinkClass}
                >
                  Blog
                </Link>
              </div>
            </div>

            {/* Right side: Icons + Mobile Menu Trigger */}
            <div className="flex items-center gap-6">
              {/* Desktop Icons */}
              <div className="flex items-center gap-5">
                <Button
                  data-testid="search-button"
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex hover:bg-white/10"
                  onClick={() => navigate('/products')}
                >
                  <Search className={iconClass} />
                </Button>

                {user ? (
                  <>
                    <Button
                      data-testid="wishlist-button"
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10"
                      onClick={() => navigate('/wishlist')}
                    >
                      <Heart className={iconClass} />
                    </Button>
                    <Button
                      data-testid="account-button"
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10"
                      onClick={() => navigate('/account')}
                    >
                      <User className={iconClass} />
                    </Button>
                  </>
                ) : (
                  <Button
                    data-testid="login-button"
                    variant="ghost"
                    size="icon"
                    className="hover:bg-white/10"
                    onClick={() => setAuthDialogOpen(true)}
                  >
                    <User className={iconClass} />
                  </Button>
                )}

                <Button
                  data-testid="cart-button"
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-white/10"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCart className={iconClass} />
                  {cartCount > 0 && (
                    <span data-testid="cart-count" className="absolute -top-1 -right-1 bg-secondary text-primary text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md border border-primary/20">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button data-testid="mobile-menu-button" variant="ghost" size="icon" className="text-secondary hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] bg-primary text-secondary border-secondary/20">
                  <div className="flex flex-col gap-6 mt-12">
                    <img
                      src={`${process.env.PUBLIC_URL}/logo.png`}
                      alt="Shri Ramya"
                      className="w-32 mb-8 brightness-110"
                    />
                    {categories.map((cat) => (
                      <Link
                        key={cat.name}
                        to={cat.path}
                        data-testid={`mobile-nav-${cat.name.toLowerCase()}`}
                        className="text-xl font-heading font-medium hover:text-brand-ivory transition-colors border-b border-secondary/10 pb-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {cat.name}
                      </Link>
                    ))}
                    <Link
                      to="/blog"
                      data-testid="mobile-nav-blog"
                      className="text-xl font-heading font-medium hover:text-brand-ivory transition-colors border-b border-secondary/10 pb-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Blog
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
};

export default Navbar;