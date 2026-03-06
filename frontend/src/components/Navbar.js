import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Menu, Search, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import AuthDialog from './AuthDialog';

const Navbar = () => {
  const { user, capabilities } = useAuth();
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
      ]
    },
    {
      name: 'Home & Lifestyle', path: '/category/home-lifestyle', sub: [
        { name: 'Bedsheets', path: '/category/bedsheets' },
        { name: 'Pillow Covers', path: '/category/pillow-covers' }
      ]
    },
    { name: 'Regional Collections', path: '/regional-collections' },
    { name: 'Luxury Collection', path: '/luxury-collection' },
    { name: 'Lookbook', path: '/lookbook' },
  ];

  const navLinkClass =
    'relative py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/80 transition-colors hover:text-accent after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-accent after:transition-all hover:after:w-full';
  const iconClass = 'h-5 w-5 text-primary-foreground/80 transition-colors group-hover:text-accent';

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-accent/20 bg-primary/88 backdrop-blur-[14px]">
        <div className="relative overflow-hidden border-b border-accent/20 bg-charcoal/45 px-4 py-2 text-[10px] font-medium text-primary-foreground/90 md:px-12 md:text-xs">
          <div className="absolute inset-0 bg-mandala opacity-10" />
          <div className="relative z-10 text-center uppercase tracking-[0.24em]">
            Complimentary shipping on orders above Rs. 999
          </div>
          {(user?.role === 'admin' || capabilities?.edit_posts) && (
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
            <div className="flex items-center gap-8">
              <Link to="/" data-testid="logo" className="flex items-center justify-center">
                <img
                  src={`${process.env.PUBLIC_URL}/logo.png`}
                  alt="Shri Ramya"
                  className="site-logo"
                />
              </Link>

              <div className="hidden xl:flex items-center gap-6">
                <Link to="/" className={navLinkClass}>Home</Link>
                {categories.map((cat) => (
                  <div key={cat.name} className="relative group">
                    <Link
                      to={cat.path}
                      data-testid={`nav-${cat.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                      className={navLinkClass}
                    >
                      {cat.name}
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
                ))}
                <Link to="/blog" data-testid="nav-blog" className={navLinkClass}>
                  Blog
                </Link>
              </div>
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

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="xl:hidden">
                  <Button
                    data-testid="mobile-menu-button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-accent/20 bg-ivory/5 text-primary-foreground hover:bg-ivory/10"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] border-accent/30 bg-primary/90 text-primary-foreground">
                  <div className="mt-12 flex flex-col gap-7">
                    <img
                      src={`${process.env.PUBLIC_URL}/logo.png`}
                      alt="Shri Ramya"
                      className="w-36 brightness-110"
                    />
                    <Link to="/" className="border-b border-accent/15 pb-3 font-heading text-xl tracking-wide text-primary-foreground/85 transition-colors hover:text-accent" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                    {categories.map((cat) => (
                      <div key={cat.name} className="flex flex-col border-b border-accent/15 pb-3">
                        <Link
                          to={cat.path}
                          data-testid={`mobile-nav-${cat.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                          className="font-heading text-xl tracking-wide text-primary-foreground/85 transition-colors hover:text-accent"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                        {cat.sub && (
                          <div className="ml-4 mt-2 flex flex-col gap-2">
                            {cat.sub.map(subCat => (
                              <Link
                                key={subCat.name}
                                to={subCat.path}
                                className="font-heading text-lg tracking-wide text-primary-foreground/70 transition-colors hover:text-accent"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                - {subCat.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <Link
                      to="/blog"
                      data-testid="mobile-nav-blog"
                      className="border-b border-accent/15 pb-3 font-heading text-xl tracking-wide text-primary-foreground/85 transition-colors hover:text-accent"
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
