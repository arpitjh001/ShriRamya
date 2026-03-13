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
const NavIcons = ({ cartCount, hasNotifications = false, onSearchClick, onAccountClick }) => {
  const iconVariants = {
    hover: { scale: 1.2, rotate: 5, transition: { type: "spring", stiffness: 400, damping: 10 } },
    tap: { scale: 0.9 }
  };

  return (
    <div className="flex items-center gap-4 md:gap-6">
      <motion.button
        variants={iconVariants}
        whileHover="hover"
        whileTap="tap"
        onClick={onSearchClick}
        className="text-charcoal hover:text-royal-maroon transition-colors"
        aria-label="Search"
      >
        <Search className="w-5 h-5 md:w-6 md:h-6" />
      </motion.button>

      <div className="hidden sm:flex items-center gap-4 md:gap-6">
        <motion.button 
          variants={iconVariants} 
          whileHover="hover" 
          whileTap="tap" 
          onClick={onAccountClick}
          className="relative text-charcoal hover:text-royal-maroon transition-colors"
          aria-label="Account"
        >
          <User className="w-5 h-5 md:w-6 md:h-6" />
          {hasNotifications && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-royal-maroon rounded-full border-2 border-ivory"
            />
          )}
        </motion.button>

        <motion.div variants={iconVariants} whileHover="hover" whileTap="tap">
          <Link to="/wishlist" className="text-charcoal hover:text-royal-maroon transition-colors" aria-label="Wishlist">
            <Heart className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </motion.div>
      </div>

      <motion.div variants={iconVariants} whileHover="hover" whileTap="tap" className="relative group">
        <Link to="/cart" className="text-charcoal group-hover:text-royal-maroon transition-colors" aria-label="Cart">
          <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
          <motion.span
            key={cartCount}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-2 -right-2 bg-royal-maroon text-white text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full px-1 shadow-sm"
          >
            {cartCount}
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
};

export default React.memo(NavIcons);
