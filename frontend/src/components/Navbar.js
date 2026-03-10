import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

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
                href="/admin/dashboard"
                className="dashboard-btn inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/90 px-3 py-1 text-[9px] font-bold text-charcoal shadow-md transition-all hover:bg-accent md:px-4 md:text-[10px]"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">DASHBOARD</span>
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

                  {categories.map((cat) => (
                    <Tooltip key={cat.name}>
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
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-panel"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay (Moved outside of nav) */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md xl:hidden transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu Panel (Moved outside of nav) */}
        <div
          id="mobile-nav-panel"
          className={`fixed top-0 left-0 z-[70] h-screen w-[85vw] max-w-[320px] border-r border-white/10 bg-black shadow-2xl transition-all duration-500 ease-in-out xl:hidden ${mobileMenuOpen ? 'translate-x-0 shadow-black/80' : '-translate-x-full shadow-none'
            }`}
        >
          <div className="flex h-full flex-col overflow-y-auto p-4 pt-16">
            {/* Logo */}
            <div className="mb-8 px-2">
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="Shri Ramya"
                className="w-40 brightness-110"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-4 top-6 rounded-full border border-white/20 bg-white/10 p-2 text-white/70 transition-all hover:bg-white/20"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Nav Links */}
            <div className="flex flex-col gap-1">
              <Link
                to="/"
                className="group relative px-4 py-4 text-lg font-medium text-white/90 hover:bg-white/5 rounded-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>

              {categories.map((cat) => (
                <div key={cat.name} className="flex flex-col">
                  <Link
                    to={cat.path}
                    className="group relative px-4 py-4 text-xl font-semibold text-white hover:bg-white/5 rounded-lg transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {cat.name}
                  </Link>
                  {cat.sub && (
                    <div className="ml-4 border-l border-white/10 pl-4 mb-2">
                      {cat.sub.map(subCat => (
                        <Link
                          key={subCat.name}
                          to={subCat.path}
                          className="block py-3 text-white/60 hover:text-white transition-all"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {subCat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Link
                to="/blog"
                className="group relative px-4 py-4 text-xl font-semibold text-white hover:bg-white/5 rounded-lg transition-all flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookOpen className="w-5 h-5" />
                Blog
              </Link>

              {user && (
                <div className="mt-4 border-t border-white/10 pt-4 flex flex-col gap-1">
                  <Link
                    to="/account"
                    className="px-4 py-4 text-lg text-white/80 hover:bg-white/5 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Account
                  </Link>
                  <Link
                    to="/account"
                    className="px-4 py-4 text-lg text-white/80 hover:bg-white/5 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-white/10 pt-8 pb-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                Luxury Ethnic Wear
              </p>
              <p className="mt-2 text-[9px] text-white/20">
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
