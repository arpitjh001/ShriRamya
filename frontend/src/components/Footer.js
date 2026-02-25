import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-muted border-t border-border mt-32">
      <div className="px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link to="/">
              <img
                src={`${process.env.PUBLIC_URL}/logo.svg`}
                alt="Shri Ramya"
                className="footer-logo mb-6"
              />
            </Link>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              Authentic handcrafted ethnic wear celebrating the rich heritage of Rajasthan and India.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-body font-semibold mb-4">Shop</h4>
            <ul className="space-y-2">
              <li><Link to="/products?category=Sarees" className="text-muted-foreground hover:text-primary transition-colors">Sarees</Link></li>
              <li><Link to="/products?category=Lehengas" className="text-muted-foreground hover:text-primary transition-colors">Lehengas</Link></li>
              <li><Link to="/products?category=Suits" className="text-muted-foreground hover:text-primary transition-colors">Suits</Link></li>
              <li><Link to="/products?category=Dupattas" className="text-muted-foreground hover:text-primary transition-colors">Dupattas</Link></li>
              <li><Link to="/lookbook" className="text-muted-foreground hover:text-primary transition-colors">Lookbook</Link></li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-body font-semibold mb-4">Customer Care</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/track-order" className="text-muted-foreground hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link to="/fabric-care" className="text-muted-foreground hover:text-primary transition-colors">Fabric Care</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-body font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>123 Ethnic Street, Jaipur, Rajasthan 302001</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-5 w-5 flex-shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <span>hello@shriramya.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Shri Ramya. All rights reserved. Crafted with love in India.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;