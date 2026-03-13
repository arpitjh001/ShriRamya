import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * @typedef {Object} Category
 * @property {string} name
 * @property {string} slug
 * @property {string} image
 * @property {string[]} subcategories
 */

/**
 * @typedef {Object} MegaMenuProps
 * @property {boolean} isOpen
 * @property {Category[]} categories
 * @property {Function} onClose
 */

/**
 * Animated desktop Mega Menu with image previews and luxury typography.
 * @param {MegaMenuProps} props
 */
const MegaMenu = ({ isOpen, categories = [], onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-[112px] bg-charcoal/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Menu Panel */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 right-0 top-[112px] bg-white shadow-luxury z-50 border-b border-charcoal/5"
            onMouseLeave={onClose}
          >
            <div className="max-w-7xl mx-auto px-12 py-16 grid grid-cols-4 gap-12">
              {categories.slice(0, 4).map((cat, idx) => (
                <motion.div
                  key={cat.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-8 group"
                >
                  <Link to={`/category/${cat.slug}`} onClick={onClose} className="block overflow-hidden rounded-2xl aspect-[4/5] relative">
                    <img 
                      src={cat.image || `https://images.unsplash.com/photo-1583394838336-acd977730f8a?q=80&w=400&auto=format&fit=crop`} 
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-charcoal/20 group-hover:bg-charcoal/40 transition-colors flex items-end p-6">
                      <h3 className="text-white font-heading text-2xl font-bold">{cat.name}</h3>
                    </div>
                  </Link>

                  <ul className="space-y-4">
                    {cat.subcategories.map((sub) => (
                      <li key={sub}>
                        <Link 
                          to={`/category/${sub.toLowerCase().replace(/ /g, '-')}`} 
                          onClick={onClose}
                          className="text-charcoal/60 hover:text-royal-maroon flex items-center justify-between group/link"
                        >
                          <span className="text-sm font-medium tracking-wide">{sub}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 -translate-x-2 group-hover/link:translate-x-0 transition-all text-royal-gold" />
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link 
                        to={`/category/${cat.slug}`} 
                        onClick={onClose}
                        className="text-royal-maroon text-[10px] font-bold uppercase tracking-[0.2em] border-b border-royal-maroon/20 hover:border-royal-maroon transition-all pt-2 inline-block"
                      >
                        Explore All
                      </Link>
                    </li>
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default React.memo(MegaMenu);
