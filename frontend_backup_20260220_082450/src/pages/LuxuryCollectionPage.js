import React, { useEffect, useState } from 'react';
import { productsAPI } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { motion } from 'framer-motion';
import { Sparkles, Award, Users } from 'lucide-react';

const LuxuryCollectionPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // In real implementation, filter by luxury_collection attribute
        const response = await productsAPI.getAll({ limit: 100 });
        const luxuryProducts = response.data.filter(p => p.luxury_collection);
        setProducts(luxuryProducts);
      } catch (error) {
        console.error('Failed to fetch luxury products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const luxuryFeatures = [
    {
      icon: Sparkles,
      title: 'Handpicked Excellence',
      description: 'Each piece in our luxury collection is carefully selected for its exceptional craftsmanship and rare beauty.',
    },
    {
      icon: Award,
      title: 'Premium Materials',
      description: 'Only the finest fabrics – pure silk, zari, and premium cotton – make it into our luxury range.',
    },
    {
      icon: Users,
      title: 'Master Artisans',
      description: 'Crafted by experienced artisans with decades of expertise in traditional techniques.',
    },
  ];

  return (
    <div data-testid="luxury-collection-page">
      {/* Hero */}
      <section className="relative h-[70vh] flex items-center overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM4MDAwMjAiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDEtMyAzLTNoMmMxIDAgMyAxIDMgM3YyYzAgMS0xIDMtMyAzaC0yYy0yIDAtMy0yLTMtM3YtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        </div>

        <div className="relative z-10 px-6 md:px-12 lg:px-24 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Sparkles className="h-16 w-16 mx-auto mb-6 text-secondary" />
            <h1 className="text-6xl md:text-7xl font-heading font-medium tracking-tight leading-tight mb-6">
              Luxury Collection
            </h1>
            <p className="text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              Discover our most exquisite pieces – handcrafted masterpieces that represent the pinnacle of Indian textile artistry.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Luxury Features */}
      <section className="px-6 md:px-12 lg:px-24 py-16 bg-muted">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {luxuryFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-medium mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Products */}
      <section className="px-6 md:px-12 lg:px-24 py-16">
        <div className="mb-12">
          <h2 className="text-4xl font-heading font-medium tracking-tight mb-4">
            Exquisite Pieces
          </h2>
          <p className="text-lg text-muted-foreground">
            {products.length} handpicked luxury {products.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[400px] bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">No luxury products available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="luxury-products-grid">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Craftsmanship Story */}
      <section className="px-6 md:px-12 lg:px-24 py-16 bg-accent">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-6 text-center">
            The Art of Luxury Craftsmanship
          </h2>
          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p className="font-accent italic text-xl text-primary text-center mb-6">
              "True luxury lies not in the price tag, but in the hours of dedicated craftsmanship, the purity of materials, and the preservation of ancient techniques."
            </p>
            <p>
              Our luxury collection represents the finest examples of Indian textile heritage. Each piece is the result of weeks or even months of meticulous work by master artisans who have inherited their skills through generations.
            </p>
            <p>
              From the pure Banarasi silk woven on traditional looms to the intricate Zardozi embroidery done entirely by hand, these are not just garments – they are wearable art, investment pieces, and treasured heirlooms.
            </p>
            <p className="text-center text-base mt-8">
              When you choose a piece from our luxury collection, you're investing in timeless elegance and supporting the preservation of India's precious craft traditions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LuxuryCollectionPage;