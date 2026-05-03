import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TextileBackgroundWrapper - A premium background system for ShriRamya.
 * Rotates through subtle Indian handloom-inspired patterns with elegant transitions.
 */
const patterns = [
  '/images/patterns/banarasi.png',
  '/images/patterns/ajrakh.png',
  '/images/patterns/kalamkari.png',
  '/images/patterns/kalamkari_v2.png',
  '/images/patterns/muga_silk.png',
  '/images/patterns/eri_silk.png',
  '/images/patterns/paat_silk.png',
  '/images/patterns/phulkari.png',
  '/images/patterns/chanderi.png'
];

const TextileBackgroundWrapper = ({ children }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % patterns.length);
    }, 8000); // Faster rotation every 8 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-[#f7f3ec]">
      {/* Dynamic Pattern Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={patterns[index]}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: 0.28, // More prominent patterns
              scale: 1,
              x: [0, -30, 0], // Slightly more movement
              y: [0, -15, 0],
              transition: { 
                opacity: { duration: 3, ease: "easeInOut" },
                scale: { duration: 3, ease: "easeInOut" },
                x: { duration: 20, ease: "linear", repeat: Infinity },
                y: { duration: 25, ease: "linear", repeat: Infinity }
              }
            }}
            exit={{ 
              opacity: 0,
              transition: { duration: 3, ease: "easeInOut" }
            }}
            className="absolute inset-[-150px] z-0"
            style={{
              backgroundImage: `url(${patterns[index]})`,
              backgroundSize: '500px', // Larger patterns for more presence
              backgroundRepeat: 'repeat',
              filter: 'sepia(30%) contrast(105%) opacity(0.8)', // Richer colors
            }}
          />
        </AnimatePresence>
        
        {/* Refined Overlays */}
        {/* Subtle vignette and gradient for depth, using Ivory instead of White */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f3ec]/80 via-transparent to-[#f7f3ec]/80 opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f7f3ec]/10 via-transparent to-[#f7f3ec]/10" />
        <div className="absolute inset-0 bg-accent/5 mix-blend-multiply" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default TextileBackgroundWrapper;
