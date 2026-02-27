import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-primary text-brand-ivory border-t border-secondary/20 mt-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-mandala opacity-5" />
      <div className="px-6 md:px-12 lg:px-24 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="inline-block hover:scale-105 transition-transform duration-500">
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="Shri Ramya"
                className="footer-logo"
              />
            </Link>
            <p className="text-brand-ivory/80 leading-relaxed font-body italic text-lg">
              "Authentic handcrafted ethnic wear celebrating the rich heritage of Rajasthan and the soul of India."
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-secondary hover:text-brand-ivory transition-colors transform hover:scale-110 duration-300">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-secondary hover:text-brand-ivory transition-colors transform hover:scale-110 duration-300">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-secondary hover:text-brand-ivory transition-colors transform hover:scale-110 duration-300">
                <Twitter className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-heading text-xl font-medium text-secondary mb-8 underline underline-offset-8 decoration-secondary/30">Shop Collections</h4>
            <ul className="space-y-4 font-body text-brand-ivory/80">
              <li><Link to="/products?category=Sarees" className="hover:text-secondary transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-secondary scale-0 group-hover:scale-100 transition-transform" /> Sarees</Link></li>
              <li><Link to="/products?category=Lehengas" className="hover:text-secondary transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-secondary scale-0 group-hover:scale-100 transition-transform" /> Lehengas</Link></li>
              <li><Link to="/products?category=Suits" className="hover:text-secondary transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-secondary scale-0 group-hover:scale-100 transition-transform" /> Suits</Link></li>
              <li><Link to="/products?category=Dupattas" className="hover:text-secondary transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-secondary scale-0 group-hover:scale-100 transition-transform" /> Dupattas</Link></li>
              <li><Link to="/lookbook" className="hover:text-secondary transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-secondary scale-0 group-hover:scale-100 transition-transform" /> Lookbook</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-heading text-xl font-medium text-secondary mb-8 underline underline-offset-8 decoration-secondary/30">Guest Relations</h4>
            <ul className="space-y-4 font-body text-brand-ivory/80">
              <li><Link to="/about" className="hover:text-secondary transition-colors">Our Heritage</Link></li>
              <li><Link to="/track-order" className="hover:text-secondary transition-colors">Track Your Order</Link></li>
              <li><Link to="/fabric-care" className="hover:text-secondary transition-colors">Artisanal Care Guide</Link></li>
              <li><Link to="/contact" className="hover:text-secondary transition-colors">Visit Our Studio</Link></li>
              <li><Link to="/blog" className="hover:text-secondary transition-colors">The Heritage Blog</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-xl font-medium text-secondary mb-8 underline underline-offset-8 decoration-secondary/30">Stay Connected</h4>
            <ul className="space-y-6 text-brand-ivory/70 font-body">
              <li className="flex items-start gap-4 group">
                <MapPin className="h-6 w-6 mt-1 flex-shrink-0 text-secondary group-hover:scale-110 transition-transform" />
                <span className="leading-relaxed">The Royal Studio, 123 Ethnic Street,<br />Jaipur, Rajasthan 302001</span>
              </li>
              <li className="flex items-center gap-4 group">
                <Phone className="h-6 w-6 flex-shrink-0 text-secondary group-hover:scale-110 transition-transform" />
                <span className="font-medium">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-4 group">
                <Mail className="h-6 w-6 flex-shrink-0 text-secondary group-hover:scale-110 transition-transform" />
                <span className="font-medium">concierge@shriramya.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-20 pt-10 border-t border-secondary/10 text-center text-sm font-body tracking-widest text-brand-ivory/40">
          <p className="uppercase">&copy; {new Date().getFullYear()} Shri Ramya. All rights reserved. Handcrafted with Royal Love in India.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;