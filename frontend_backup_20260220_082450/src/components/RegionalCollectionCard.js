import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const RegionalCollectionCard = ({ region, image, description, productCount }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <Link
        to={`/regional-collections?state=${encodeURIComponent(region)}`}
        className="block relative overflow-hidden rounded-lg aspect-[4/5]"
      >
        <img
          src={image}
          alt={`${region} Collection`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-2xl font-heading font-medium text-white mb-2">{region}</h3>
          <p className="text-white/80 text-sm font-accent italic mb-3">{description}</p>
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">{productCount} Products</span>
            <span className="text-white flex items-center gap-2 text-sm">
              Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RegionalCollectionCard;