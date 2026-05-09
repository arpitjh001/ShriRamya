import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative mt-28 overflow-hidden border-t border-accent/20 bg-charcoal text-primary-foreground">
      <div className="absolute inset-0 bg-mandala opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-charcoal to-secondary/60" />

      <div className="relative z-10 px-6 py-20 md:px-12 lg:px-20">
        <div className="grid gap-8 rounded-[2rem] border border-accent/20 bg-primary-foreground/5 p-8 backdrop-blur-[14px] lg:grid-cols-4 lg:p-10">
          <div className="space-y-6 lg:col-span-1">
            <Link to="/" className="inline-block">
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="Shri Ramya"
                className="footer-logo"
              />
            </Link>
            <p className="text-sm leading-relaxed text-primary-foreground/78">
              House of handcrafted Indian attire curated for weddings, festivities, and timeless celebrations.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="glass-dark inline-flex h-10 w-10 items-center justify-center rounded-full text-accent transition-all hover:-translate-y-0.5 hover:bg-accent/20 hover:text-primary-foreground"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="glass-dark inline-flex h-10 w-10 items-center justify-center rounded-full text-accent transition-all hover:-translate-y-0.5 hover:bg-accent/20 hover:text-primary-foreground"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="glass-dark inline-flex h-10 w-10 items-center justify-center rounded-full text-accent transition-all hover:-translate-y-0.5 hover:bg-accent/20 hover:text-primary-foreground"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-6 text-2xl font-medium text-accent">Shop Collections</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/78">
              <li><Link to="/products?category=Sarees" className="hover:text-accent">Sarees</Link></li>
              <li><Link to="/products?category=Suits" className="hover:text-accent">Suits</Link></li>
              <li><Link to="/products?category=Dupattas" className="hover:text-accent">Dupattas</Link></li>
              <li><Link to="/lookbook" className="hover:text-accent">Lookbook</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-2xl font-medium text-accent">Guest Relations</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/78">
              <li><Link to="/about" className="hover:text-accent">Our Heritage</Link></li>
              <li><Link to="/track-order" className="hover:text-accent">Track Your Order</Link></li>
              <li><Link to="/fabric-care" className="hover:text-accent">Artisanal Care Guide</Link></li>
              <li><Link to="/contact" className="hover:text-accent">Visit Our Studio</Link></li>
              <li><Link to="/blog" className="hover:text-accent">The Heritage Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-2xl font-medium text-accent">Stay Connected</h4>
            <ul className="space-y-5 text-sm text-primary-foreground/78">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-accent" />
                <span>The Royal Studio, 123 Ethnic Street, Jaipur, Rajasthan 302001</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-accent" />
                <span>admin@shriramya.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-9 border-t border-accent/15 pt-6 text-center text-[11px] uppercase tracking-[0.24em] text-primary-foreground/45">
          <p>&copy; {new Date().getFullYear()} Shri Ramya. Handcrafted in India.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
