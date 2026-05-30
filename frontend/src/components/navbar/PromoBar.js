import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PromoBar = ({
  promoBar = null,
  loading = false,
  variant = 'default',
  showDashboard = false,
  onDashboardClick,
  isHome = false,
  isScrolled = false
}) => {
  const promoText = promoBar?.promoText || '';
  const customStyle = {
    ...(promoBar?.backgroundColor ? { backgroundColor: promoBar.backgroundColor } : {}),
    ...(promoBar?.textColor ? { color: promoBar.textColor } : {}),
  };

  if (!loading && !promoText) {
    return null;
  }

  return (
    <div
      style={customStyle}
      className={`py-2 px-4 text-[10px] md:text-xs font-bold tracking-[0.24em] uppercase overflow-hidden relative border-b z-50 transition-all duration-700 backdrop-blur-[32px] ${
        variant === 'warning'
          ? 'bg-royal-maroon/85 text-ivory border-white/15 shadow-[0_10px_28px_rgba(64,13,23,0.22)]'
          : (isHome && !isScrolled
              ? 'bg-royal-maroon/25 text-ivory border-white/20 shadow-[0_10px_30px_rgba(64,13,23,0.16)] shimmer-effect'
              : 'bg-royal-maroon/60 text-ivory border-white/15 shadow-[0_10px_28px_rgba(64,13,23,0.22)] shimmer-effect')
      }`}
    >
      {variant !== 'warning' && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
      )}

      <div className="max-w-7xl mx-auto flex min-h-5 justify-center items-center">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="promo-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-3 w-48 max-w-[70vw] rounded-full bg-white/20"
            />
          ) : promoText ? (
            <motion.p
              key={promoText}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-full text-center leading-relaxed break-words"
            >
              {promoText}
              {promoBar?.couponCode && (
                <span className="ml-2 inline-flex rounded-full border border-current/30 px-2 py-0.5 font-mono tracking-[0.2em]">
                  {promoBar.couponCode}
                </span>
              )}
            </motion.p>
          ) : null}
        </AnimatePresence>

        {showDashboard && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
              onClick={onDashboardClick}
              className="flex items-center gap-1.5 rounded-full border border-ivory/25 bg-ivory/10 px-3 py-0.5 text-[8px] md:text-[9px] font-bold text-white shadow-sm backdrop-blur-md transition-all hover:bg-ivory/20"
            >
              <div className="w-1 h-1 rounded-full bg-royal-gold animate-pulse" />
              DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(PromoBar);
