import React from 'react';
import { motion } from 'framer-motion';
import { Search, User, Heart, ShoppingBag, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * @typedef {Object} NavIconsProps
 * @property {number} cartCount - Number of items in the cart
 * @property {boolean} [hasNotifications=false] - Whether there are unread notifications
 * @property {Function} onSearchClick - Callback for search icon click
 */

/**
 * High-end action icons with micro-interactions for the Navbar.
 * @param {NavIconsProps} props
 */
const NavIcons = ({ cartCount, wishlistCount = 0, hasNotifications = false, onSearchClick, onAccountClick }) => {
  const actionIconClass = "relative inline-flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full border border-charcoal/15 bg-ivory/90 text-charcoal shadow-[0_5px_16px_rgba(31,31,31,0.12)] hover:border-royal-maroon/35 hover:bg-white hover:text-royal-maroon hover:shadow-[0_8px_22px_rgba(106,30,45,0.18)] transition-all";
  const iconClass = "w-5 h-5 md:w-6 md:h-6 text-charcoal stroke-[2.5] group-hover:text-royal-maroon";

  const iconVariants = {
    hover: { scale: 1.2, rotate: 5, transition: { type: "spring", stiffness: 400, damping: 10 } },
    tap: { scale: 0.9 }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
      <motion.button
        variants={iconVariants}
        whileHover="hover"
        whileTap="tap"
        onClick={onSearchClick}
        className={actionIconClass}
        aria-label="Search"
      >
        <Search className={`${iconClass} text-charcoal`} strokeWidth={2.6} />
      </motion.button>

      <div className="hidden sm:flex items-center gap-2 md:gap-4">
        <motion.button 
          variants={iconVariants} 
          whileHover="hover" 
          whileTap="tap" 
          onClick={onAccountClick}
          className={actionIconClass}
          aria-label="Account"
        >
          <User className={`${iconClass} text-charcoal`} strokeWidth={2.6} />
          {hasNotifications && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-royal-maroon rounded-full border-2 border-ivory"
            />
          )}
        </motion.button>

      </div>

      <motion.div variants={iconVariants} whileHover="hover" whileTap="tap">
        <Link to="/wishlist" className={actionIconClass} aria-label="Wishlist" data-testid="navbar-wishlist-icon">
          <Heart className={`${iconClass} text-charcoal`} strokeWidth={2.7} />
          {wishlistCount > 0 && (
            <motion.span
              key={wishlistCount}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-2 -right-2 bg-royal-maroon text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 shadow-md ring-2 ring-ivory"
            >
              {wishlistCount}
            </motion.span>
          )}
        </Link>
      </motion.div>

      <motion.div variants={iconVariants} whileHover="hover" whileTap="tap" className="relative group">
        <Link to="/cart" className={actionIconClass} aria-label="Cart">
          <ShoppingBag className={`${iconClass} text-charcoal`} strokeWidth={2.7} />
          <motion.span
            key={cartCount}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-2 -right-2 bg-royal-maroon text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 shadow-md ring-2 ring-ivory"
          >
            {cartCount}
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
};

export default React.memo(NavIcons);
