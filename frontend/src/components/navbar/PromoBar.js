import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @typedef {Object} PromoBarProps
 * @property {string[]} messages - Array of promotional messages to rotate
 * @property {number} [interval=5000] - Rotation interval in milliseconds
 */

/**
 * Animated top bar for promotional messages with a luxury feel.
 * @param {PromoBarProps} props
 */
const PromoBar = ({ 
  messages = ["FREE SHIPPING ON ORDERS OVER ₹5000", "NEW COLLECTION LIVE: LUXURY ETHNIC WEAR"], 
  interval = 5000,
  variant = 'default',
  showDashboard = false,
  onDashboardClick,
  isHome = false,
  isScrolled = false
}) => {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <div className={`py-2 px-4 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase overflow-hidden relative border-b shadow-luxury-sm z-50 transition-all duration-700 ${
      (isHome && !isScrolled)
        ? 'bg-transparent text-white border-transparent shadow-none'
        : (variant === 'warning'
            ? 'bg-accent text-charcoal border-charcoal/10'
            : 'bg-royal-maroon text-ivory border-white/5 shimmer-effect')
    }`}>
      {/* Shimmer Overlay */}
      {(!isHome || isScrolled) && variant !== 'warning' && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
      )}
      <div className="max-w-7xl mx-auto flex justify-center items-center h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>

        {showDashboard && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
               onClick={onDashboardClick}
               className="flex items-center gap-1.5 rounded-full border border-ivory/20 bg-ivory/10 px-3 py-0.5 text-[8px] md:text-[9px] font-bold text-white shadow-sm transition-all hover:bg-ivory/20"
            >
              <div className="w-1 h-1 rounded-full bg-deep-emerald animate-pulse" />
              DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PromoBar);
