import React from 'react';
import { motion } from 'framer-motion';
import { Search, User, Heart, ShoppingBag } from 'lucide-react';
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
  const actionIconClass = "relative inline-flex shrink-0 items-center justify-center text-charcoal hover:text-royal-maroon transition-colors";
  const iconClass = "w-[18px] h-[18px] sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] lg:w-6 lg:h-6 stroke-[2.2]";

  const iconVariants = {
    hover: { scale: 1.2, rotate: 5, transition: { type: "spring", stiffness: 400, damping: 10 } },
    tap: { scale: 0.9 }
  };

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 xl:gap-5">
      <motion.button
        variants={iconVariants}
        whileHover="hover"
        whileTap="tap"
        onClick={onSearchClick}
        className={actionIconClass}
        aria-label="Search"
      >
        <Search className={iconClass} strokeWidth={2.4} />
      </motion.button>

      <motion.button 
        variants={iconVariants} 
        whileHover="hover" 
        whileTap="tap" 
        onClick={onAccountClick}
        className={actionIconClass}
        aria-label="Account"
      >
        <User className={iconClass} strokeWidth={2.4} />
        {hasNotifications && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-royal-maroon rounded-full border-2 border-ivory"
          />
        )}
      </motion.button>

      <motion.div variants={iconVariants} whileHover="hover" whileTap="tap">
        <Link to="/wishlist" className={actionIconClass} aria-label="Wishlist" data-testid="navbar-wishlist-icon">
          <Heart className={iconClass} strokeWidth={2.4} />
          {wishlistCount > 0 && (
            <motion.span
              key={wishlistCount}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-1.5 -right-1.5 bg-royal-maroon text-white text-[9px] font-bold min-w-4 h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm"
            >
              {wishlistCount}
            </motion.span>
          )}
        </Link>
      </motion.div>

      <motion.div variants={iconVariants} whileHover="hover" whileTap="tap" className="relative group">
        <Link to="/cart" className={actionIconClass} aria-label="Cart">
          <ShoppingBag className={iconClass} strokeWidth={2.4} />
          <motion.span
            key={cartCount}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-1.5 -right-1.5 bg-royal-maroon text-white text-[9px] font-bold min-w-4 h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm"
          >
            {cartCount}
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
};

export default React.memo(NavIcons);
