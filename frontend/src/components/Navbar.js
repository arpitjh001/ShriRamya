import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, Search, ExternalLink, BookOpen, Home, Shirt, FolderOpen, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import AuthDialog from './AuthDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const Navbar = () => {
  const { user, capabilities, isAdmin, isEditor, canViewDashboard } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const categories = [
    {
      name: 'Women Wear', path: '/category/women-wear', sub: [
        { name: 'Sarees', path: '/category/sarees' },
        { name: 'Kurtis', path: '/category/kurtis' },
        { name: 'Lehengas', path: '/category/lehengas' }
      ],
      icon: Shirt
    },
    {
      name: 'Home & Lifestyle', path: '/category/home-lifestyle', sub: [
        { name: 'Bedsheets', path: '/category/bedsheets' },
        { name: 'Pillow Covers', path: '/category/pillow-covers' }
      ],
      icon: FolderOpen
    },
    { name: 'Regional Collections', path: '/regional-collections', icon: FolderOpen },
    { name: 'Luxury Collection', path: '/luxury-collection', icon: FolderOpen },
    { name: 'Lookbook', path: '/lookbook', icon: BookOpen },
  ];

  const iconClass = 'h-5 w-5 text-primary-foreground/80 transition-colors group-hover:text-accent';

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-accent/20 bg-primary/88 backdrop-blur-[14px]">
        <div className="relative overflow-hidden border-b border-accent/20 bg-charcoal/45 px-4 py-2 text-[10px] font-medium text-primary-foreground/90 md:px-12 md:text-xs">
          <div className="absolute inset-0 bg-mandala opacity-10" />
          <div className="relative z-10 text-center uppercase tracking-[0.24em]">
            Complimentary shipping on orders above Rs. 999
          </div>
          {(isAdmin() || isEditor() || canViewDashboard()) && (
            <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2 md:right-12">
              <a
                href="/admin/woocommerce"
                className="dashboard-btn inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/90 px-3 py-1 text-[9px] font-bold text-charcoal shadow-md transition-all hover:bg-accent md:px-4 md:text-[10px]"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">DASHBOARD</span>
                <span className="sm:hidden">WP</span>
              </a>
            </div>
          )}
        </div>

        <div className="relative px-5 py-3 md:px-12 lg:px-20">
          <div className="absolute inset-0 bg-mandala opacity-10 pointer-events-none" />
          <div className="relative z-10 flex h-20 items-center justify-between rounded-full border border-accent/20 bg-primary/60 px-4 shadow-luxury backdrop-blur-[14px] md:px-8">
            <div className="flex items-center gap-6">
              <Link to="/" data-testid="logo" className="flex items-center justify-center">
                <img
                  src={`${process.env.PUBLIC_URL}/logo.png`}
                  alt="Shri Ramya"
                  className="site-logo"
                />
              </Link>

              <TooltipProvider>
                <div className="hidden xl:flex items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/" className="p-2 rounded-full hover:bg-accent/10 transition-colors">
                        <Home className={iconClass} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Home</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  {categories.map((cat, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div className="relative group">
                          <Link 
                            to={cat.path} 
                            className="p-2 rounded-full hover:bg-accent/10 transition-colors"
                          >
                            <cat.icon className={iconClass} />
                          </Link>
                          {cat.sub && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-primary/95 shadow-lg border border-accent/20 rounded-md py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                              {cat.sub.map(subCat => (
                                <Link
                                  key={subCat.name}
                                  to={subCat.path}
                                  className="block px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/80 hover:text-accent hover:bg-white/5"
                                >
                                  {subCat.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{cat.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/blog" className="p-2 rounded-full hover:bg-accent/10 transition-colors">
                        <BookOpen className={iconClass} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Blog</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  data-testid="search-button"
                  variant="ghost"
                  size="icon"
                  className="group hidden rounded-full border border-transparent bg-ivory/5 hover:border-accent/25 hover:bg-ivory/10 md:flex"
                  onClick={() => navigate('/products')}
                >
                  <Search className={iconClass} />
                </Button>

                <Button
                  data-testid="blog-icon-button"
                  variant="ghost"
                  size="icon"
                  className="group rounded-full border border-transparent bg-ivory/5 hover:border-accent/25 hover:bg-ivory/10"
                  onClick={() => navigate('/blog')}
                >
                  <BookOpen className={iconClass} />
                </Button>

                {user ? (
                  <>
                    <Button
                      data-testid="wishlist-button"
                      variant="ghost"
                      size="icon"
                      className="group rounded-full border border-transparent bg-ivory/5 hover:border-accent/25 hover:bg-ivory/10"
                      onClick={() => navigate('/wishlist')}
                    >
                      <Heart className={iconClass} />
                    </Button>
                    <Button
                      data-testid="account-button"
                      variant="ghost"
                      size="icon"
                      className="group rounded-full border border-transparent bg-ivory/5 hover:border-accent/25 hover:bg-ivory/10"
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
                    className="group rounded-full border border-transparent bg-ivory/5 hover:border-accent/25 hover:bg-ivory/10"
                    onClick={() => setAuthDialogOpen(true)}
                  >
                    <User className={iconClass} />
                  </Button>
                )}

                <Button
                  data-testid="cart-button"
                  variant="ghost"
                  size="icon"
                  className="group relative rounded-full border border-transparent bg-ivory/5 hover:border-accent/25 hover:bg-ivory/10"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCart className={iconClass} />
                  {cartCount > 0 && (
                    <span
                      data-testid="cart-count"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-primary/35 bg-accent text-[10px] font-bold text-charcoal shadow-md"
                    >
                      {cartCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden rounded-full border border-accent/20 bg-ivory/5 p-2 text-primary-foreground hover:bg-ivory/10"
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay - No Blur */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/70 xl:hidden"
            style={{
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu Panel */}
        <div
          className={`fixed top-0 left-0 z-50 h-full w-[320px] border-r border-accent/30 bg-gradient-to-b from-charcoal via-charcoal to-primary text-primary-foreground shadow-2xl transition-transform duration-300 ease-out xl:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div className="mt-16 flex flex-col gap-2 overflow-y-auto p-4">
            {/* Logo with subtle animation */}
            <div className="mb-6 px-2 transition-transform duration-500 hover:scale-105">
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="Shri Ramya"
                className="w-40 brightness-110 drop-shadow-lg"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-accent/30 bg-charcoal p-2 text-primary-foreground/70 transition-all duration-300 hover:border-accent hover:bg-charcoal hover:text-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Navigation Links */}
            <Link
              to="/"
              className="group relative overflow-hidden rounded-lg px-4 py-4 font-heading text-lg tracking-wide text-primary-foreground/85 transition-all duration-300 ease-out hover:bg-accent/10 hover:text-accent hover:pl-5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="relative z-10">Home</span>
              <div className="absolute inset-y-0 left-0 w-1 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>

            {categories.map((cat) => (
              <div key={cat.name} className="border-t border-accent/15">
                <Link
                  to={cat.path}
                  className="group relative block px-4 py-4 font-heading text-xl tracking-wide text-primary-foreground/85 transition-all duration-300 ease-out hover:bg-accent/10 hover:text-accent hover:pl-5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="relative z-10">{cat.name}</span>
                  <div className="absolute inset-y-0 left-0 w-1 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </Link>
                {cat.sub && (
                  <div className="ml-4 mt-1 flex flex-col border-l border-accent/20 pl-4">
                    {cat.sub.map(subCat => (
                      <Link
                        key={subCat.name}
                        to={subCat.path}
                        className="group relative block py-3 font-heading text-base tracking-wide text-primary-foreground/65 transition-all duration-300 ease-out hover:text-accent hover:pl-3"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="relative z-10">{subCat.name}</span>
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-accent/50 opacity-0 transition-all duration-300 group-hover:w-1 group-hover:opacity-100" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-accent/15">
              <Link
                to="/blog"
                className="group relative block px-4 py-4 font-heading text-xl tracking-wide text-primary-foreground/85 transition-all duration-300 ease-out hover:bg-accent/10 hover:text-accent hover:pl-5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Blog
                </span>
                <div className="absolute inset-y-0 left-0 w-1 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            </div>

            {/* User-specific links */}
            {user && (
              <>
                <div className="border-t border-accent/15">
                  <Link
                    to="/account"
                    className="group relative block px-4 py-4 font-heading text-lg tracking-wide text-primary-foreground/85 transition-all duration-300 ease-out hover:bg-accent/10 hover:text-accent hover:pl-5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">My Account</span>
                    <div className="absolute inset-y-0 left-0 w-1 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </Link>
                </div>
                <div className="border-t border-accent/15">
                  <Link
                    to="/orders"
                    className="group relative block px-4 py-4 font-heading text-lg tracking-wide text-primary-foreground/85 transition-all duration-300 ease-out hover:bg-accent/10 hover:text-accent hover:pl-5"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="relative z-10">My Orders</span>
                    <div className="absolute inset-y-0 left-0 w-1 bg-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </Link>
                </div>
              </>
            )}

            {/* Footer branding */}
            <div className="mt-8 border-t border-accent/20 pt-6 text-center">
              <p className="font-heading text-xs tracking-[0.2em] text-primary-foreground/40">
                LUXURY ETHNIC WEAR
              </p>
              <p className="mt-2 text-[10px] text-primary-foreground/30">
                © 2024 Shri Ramya
              </p>
            </div>
          </div>
        </div>
      </nav>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
};

export default Navbar;
