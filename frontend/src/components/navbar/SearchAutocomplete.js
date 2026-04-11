import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * @typedef {Object} SearchAutocompleteProps
 * @property {boolean} isOpen - Whether the search is open
 * @property {Function} onClose - Callback to close the search
 */

/**
 * Premium search overlay with autocomplete, recent searches, and trending products.
 * @param {SearchAutocompleteProps} props
 */
const SearchAutocomplete = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(['Banarasi Silk', 'Maheshwari Kurti Material', 'Cotton Saree']);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    // Logic for saving recent search
    if (!recentSearches.includes(query)) {
      setRecentSearches([query, ...recentSearches.slice(0, 4)]);
    }
    
    navigate(`/products?search=${encodeURIComponent(query)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[100] bg-charcoal/40 backdrop-blur-luxury flex flex-col items-center pt-24 px-4"
           onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-3xl bg-ivory rounded-3xl shadow-luxury-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Section */}
            <div className="flex items-center p-6 border-b border-charcoal/5">
              <Search className="w-6 h-6 text-charcoal/40 mr-4" />
              <form onSubmit={handleSearch} className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What are you looking for today?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xl font-body text-charcoal placeholder:text-charcoal/30"
                />
              </form>
              <button 
                onClick={onClose}
                className="ml-4 p-2 hover:bg-charcoal/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-charcoal" />
              </button>
            </div>

            {/* Suggestions Section */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                  <History className="w-3.5 h-3.5" />
                  Recent Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      onClick={() => { setQuery(item); }}
                      className="px-4 py-2 bg-charcoal/5 hover:bg-royal-maroon hover:text-white rounded-full text-sm transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Trending Collections
                </div>
                <div className="space-y-4">
                  {['Wedding Wear Edit', 'Embroidered Suits', 'Handloom Sarees'].map((item) => (
                    <button
                      key={item}
                      onClick={() => { setQuery(item); }}
                      className="flex items-center gap-3 w-full text-left group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-royal-gold group-hover:scale-150 transition-transform" />
                      <span className="text-sm border-b border-transparent group-hover:border-royal-gold group-hover:text-royal-gold transition-all">
                        {item}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-charcoal/5 text-center text-[10px] uppercase tracking-widest text-charcoal/30 font-bold">
              Press Enter to search all results
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(SearchAutocomplete);
