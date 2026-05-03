import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI } from '../services/api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import RegionalCollectionCard from '../components/RegionalCollectionCard';
import { motion } from 'framer-motion';

const RegionalCollectionsPage = () => {
  const [searchParams] = useSearchParams();
  const selectedState = searchParams.get('state');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const regions = [
    {
      name: 'Rajasthan',
      image: 'https://images.unsplash.com/photo-1756483509177-bbabd67a3234?auto=format&fit=crop&w=2400&q=80',
      description: 'Bandhej, Leheriya, and Block Prints',
      count: 0,
    },
    {
      name: 'Uttar Pradesh',
      image: 'https://images.unsplash.com/photo-1756483492198-8ca91227489b?auto=format&fit=crop&w=2400&q=80',
      description: 'Banarasi Silk and Chikankari',
      count: 0,
    },
    {
      name: 'Tamil Nadu',
      image: 'https://images.unsplash.com/photo-1756483510830-878773b5a59d?auto=format&fit=crop&w=2400&q=80',
      description: 'Kanjeevaram Silk',
      count: 0,
    },
    {
      name: 'Punjab',
      image: 'https://images.unsplash.com/photo-1756483527592-0b715e5bd08c?auto=format&fit=crop&w=2400&q=80',
      description: 'Phulkari Embroidery',
      count: 0,
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (selectedState) {
        setLoading(true);
        try {
          // In real implementation, this would filter by state_of_origin
          const response = await productsAPI.getAll({ limit: 50 });
          const filtered = response.data.filter(p => p.state_of_origin === selectedState);
          setProducts(filtered);
        } catch (error) {
          console.error('Failed to fetch products:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // Fetch all products to count by region
        try {
          const response = await productsAPI.getAll({ limit: 100 });
          const allProducts = response.data;
          regions.forEach(region => {
            region.count = allProducts.filter(p => p.state_of_origin === region.name).length;
          });
        } catch (error) {
          console.error('Failed to fetch products:', error);
        }
      }
    };
    fetchData();
  }, [selectedState]);

  return (
    <div data-testid="regional-collections-page" className="px-6 md:px-12 lg:px-24 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm tracking-widest uppercase text-secondary mb-4">Crafted Across India</p>
          <h1 className="text-5xl md:text-6xl font-heading font-medium tracking-tight mb-6">
            Regional Collections
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Explore authentic handcrafted textiles from different states of India, each telling a unique story of heritage and artistry.
          </p>
        </motion.div>
      </div>

      {selectedState ? (
        // Show products from selected state
        <div>
          <div className="mb-8">
            <h2 className="text-3xl font-heading font-medium mb-2">{selectedState} Collection</h2>
            <p className="text-muted-foreground">
              {products.length} {products.length === 1 ? 'product' : 'products'} from {selectedState}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">No products found from {selectedState}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" data-testid="regional-products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Show all regions
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="regions-grid">
          {regions.map((region, index) => (
            <motion.div
              key={region.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <RegionalCollectionCard
                region={region.name}
                image={region.image}
                description={region.description}
                productCount={region.count}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Cultural Significance Section */}
      <section className="mt-24 bg-accent rounded-lg p-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-6">
            Celebrating India's Textile Heritage
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground mb-4">
            Each region of India has developed its own unique textile traditions over centuries. From the vibrant tie-dye techniques of Rajasthan to the intricate silk weaving of Varanasi, these crafts represent the cultural identity and artistic excellence of their communities.
          </p>
          <p className="text-muted-foreground font-accent italic">
            "By choosing these handcrafted pieces, you're not just buying beautiful clothing – you're supporting traditional artisans and helping preserve centuries-old techniques for future generations."
          </p>
        </div>
      </section>
    </div>
  );
};

export default RegionalCollectionsPage;
