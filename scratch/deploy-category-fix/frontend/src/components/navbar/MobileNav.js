import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Home, PenTool, Info, PhoneCall, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * @typedef {Object} MobileNavProps
 * @property {boolean} isOpen
 * @property {Function} onClose
 * @property {Object[]} categories
 * @property {Object[]} recentItems
 */

/**
 * Sidebar-style mobile navigation with smooth slide-in, micro-gestures, and tinted glass details.
 * @param {MobileNavProps} props
 */
const MobileNav = ({ isOpen, onClose, categories = [], recentItems = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-charcoal/40 backdrop-blur-sm"
          />

          {/* Sidebar Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-[120] w-[85vw] max-w-[320px] bg-ivory/95 backdrop-blur-xl border-r border-charcoal/5 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-charcoal/5">
              <Link to="/" onClick={onClose} className="block rounded-full">
                <img
                  src="/logo_backup.png"
                  alt="Shri Ramya"
                  className="h-14 w-14 rounded-full object-cover shadow-[0_10px_28px_rgba(64,13,23,0.24)] ring-1 ring-black/5"
                />
              </Link>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-charcoal/5 rounded-full transition-colors active:scale-95"
              >
                <X className="w-6 h-6 text-charcoal" />
              </button>
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 scrollbar-hide">
              <section className="space-y-6">
                 <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/40 pl-1">Collections</h4>
                 <nav className="space-y-1">
                   {categories.map((cat, idx) => (
                     <motion.div
                       key={cat.slug}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.05 }}
                     >
                       <Link 
                         to={`/category/${cat.slug}`} 
                         onClick={onClose}
                         className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-royal-maroon/5 group transition-all"
                       >
                         <span className="text-xl font-heading text-charcoal group-hover:text-royal-maroon transition-colors">{cat.name}</span>
                         <ChevronRight className="w-5 h-5 text-royal-gold/50 group-hover:text-royal-gold transition-colors" />
                       </Link>
                     </motion.div>
                   ))}
                 </nav>
              </section>

              <section className="space-y-6">
                 <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/40 pl-1">Essentials</h4>
                 <div className="grid grid-cols-2 gap-3">
                   {[
                     { name: 'Home', icon: Home, path: '/' },
                     { name: 'Journal', icon: PenTool, path: '/blog' },
                     { name: 'About', icon: Info, path: '/about' },
                     { name: 'Contact', icon: PhoneCall, path: '/contact' }
                   ].map((link) => (
                     <Link 
                      key={link.name} 
                      to={link.path} 
                      onClick={onClose}
                      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-charcoal/5 hover:bg-royal-maroon/5 transition-colors group"
                     >
                       <link.icon className="w-5 h-5 text-charcoal/70 group-hover:text-royal-maroon" />
                       <span className="text-[10px] font-bold tracking-widest uppercase">{link.name}</span>
                     </Link>
                   ))}
                 </div>
              </section>

              {recentItems.length > 0 && (
                <section className="space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-charcoal/40 pl-1">Recently Viewed</h4>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {recentItems.map((item) => (
                      <Link key={item.id} to={`/products/${item.id}`} onClick={onClose} className="min-w-[110px] space-y-2 group">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-charcoal/5">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-tighter truncate text-charcoal/60">{item.name}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Bottom Section */}
            <div className="p-6 bg-charcoal/[0.02] border-t border-charcoal/5 flex flex-col gap-6">
               {/* Logout Button if logged in */}
               {user && (
                 <button
                   onClick={handleLogout}
                   className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-charcoal text-white text-xs font-bold uppercase tracking-widest hover:bg-royal-maroon transition-colors"
                 >
                   <LogOut className="w-4 h-4" />
                   Logout
                 </button>
               )}

               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                 <span>© Shri Ramya 2024</span>
                 <div className="flex gap-4">
                   <span className="hover:text-royal-maroon cursor-pointer">IG</span>
                   <span className="hover:text-royal-maroon cursor-pointer">FB</span>
                 </div>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default React.memo(MobileNav);
