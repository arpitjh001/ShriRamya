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

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        {/* Top Bar */}
        <div className="bg-primary text-primary-foreground py-2 text-xs md:text-sm font-body px-6 md:px-12 lg:px-24 flex items-center justify-between">
          <div className="flex-1 text-center">
            Free Shipping on Orders Above ₹999 | Authentic Handcrafted Collection
          </div>
          {(user?.role === 'admin' || capabilities?.edit_posts) && (
            <div className="flex items-center ml-4">
              <a
                href="/wp/wp-admin/admin.php?page=wc-admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md border border-white/10 transition-all text-[10px] md:text-xs font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">WP Admin</span>
                <span className="sm:hidden">WP</span>
              </a>
            </div>
          )}
        </div>

        {/* Main Navbar */}
        <div className="px-6 md:px-12 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button data-testid="mobile-menu-button" variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <div className="flex flex-col gap-6 mt-8">
                  {categories.map((cat) => (
                    <Link
                      key={cat.name}
                      to={cat.path}
                      data-testid={`mobile-nav-${cat.name.toLowerCase()}`}
                      className="text-lg font-body hover:text-primary transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                  <Link
                    to="/blog"
                    data-testid="mobile-nav-blog"
                    className="text-lg font-body hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Blog
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link
              to="/"
              data-testid="logo"
              className="flex items-center justify-center"
            >
              <img
                src={`${process.env.PUBLIC_URL}/logo.svg`}
                alt="Shri Ramya"
                className="site-logo"
              />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.path}
                  data-testid={`nav-${cat.name.toLowerCase()}`}
                  className="text-base font-body hover:text-primary transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                to="/blog"
                data-testid="nav-blog"
                className="text-base font-body hover:text-primary transition-colors"
              >
                Blog
              </Link>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-4">
              <Button
                data-testid="search-button"
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={() => navigate('/products')}
              >
                <Search className="h-5 w-5" />
              </Button>

              {user ? (
                <>
                  <Button
                    data-testid="wishlist-button"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/wishlist')}
                  >
                    <Heart className="h-5 w-5" />
                  </Button>
                  <Button
                    data-testid="account-button"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/account')}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Button
                  data-testid="login-button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAuthDialogOpen(true)}
                >
                  <User className="h-5 w-5" />
                </Button>
              )}

              <Button
                data-testid="cart-button"
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/cart')}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span data-testid="cart-count" className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
};

export default Navbar;