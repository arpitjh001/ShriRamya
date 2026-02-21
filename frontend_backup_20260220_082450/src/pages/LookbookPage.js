import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight } from 'lucide-react';

const LookbookPage = () => {
  const lookbookImages = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=800',
      title: 'Royal Heritage',
      description: 'Traditional elegance meets contemporary grace',
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1595841953288-12d1cefc7fc5?w=800',
      title: 'Festive Glamour',
      description: 'Celebrate in style with handcrafted splendor',
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1638964327749-53436bcccdca?w=800',
      title: 'Bridal Majesty',
      description: 'Your dream wedding ensemble awaits',
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1737514996816-a034a795febe?w=800',
      title: 'Regal Collection',
      description: 'Timeless pieces for special moments',
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=800',
      title: 'Silk Symphony',
      description: 'Pure silk sarees in vibrant hues',
    },
    {
      id: 6,
      image: 'https://images.unsplash.com/photo-1757598077205-69a927f0240f?w=800',
      title: 'Golden Hour',
      description: 'Luxurious lehengas with intricate work',
    },
  ];

  return (
    <div data-testid="lookbook-page">
      {/* Hero */}
      <section className="px-6 md:px-12 lg:px-24 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm tracking-widest uppercase text-secondary mb-4">Lookbook 2025</p>
          <h1 className="text-5xl md:text-6xl font-heading font-medium tracking-tight mb-6">
            Stories Woven in Threads
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our carefully curated collection styled to inspire your ethnic wardrobe
          </p>
        </motion.div>
      </section>

      {/* Lookbook Grid */}
      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lookbookImages.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${index === 0 || index === 5 ? 'md:col-span-2 md:row-span-2' : ''} group relative overflow-hidden rounded aspect-square cursor-pointer`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="text-2xl font-heading font-medium text-white mb-2">{item.title}</h3>
                  <p className="text-white/90 font-accent italic mb-4">{item.description}</p>
                  <Button data-testid={`lookbook-item-${item.id}`} asChild variant="secondary" size="sm">
                    <Link to="/products">
                      Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-24 py-16 bg-accent">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-4">
            Inspired by Our Collection?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Discover the full range of handcrafted ethnic wear and find your perfect piece
          </p>
          <Button data-testid="lookbook-shop-collection-button" asChild size="lg">
            <Link to="/products">Shop Full Collection</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LookbookPage;