import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Scissors } from 'lucide-react';

const CraftStorySection = ({ product }) => {
  if (!product.craft_style && !product.state_of_origin) return null;

  const stateStories = {
    'Rajasthan': {
      description: 'From the vibrant deserts of Rajasthan, where artisans have perfected their craft over centuries.',
      heritage: 'Rajasthani textiles are known for their bold colors, intricate patterns, and traditional techniques like Bandhej and block printing.',
    },
    'Uttar Pradesh': {
      description: 'The holy city of Varanasi, home to the legendary Banarasi weavers who create silk magic.',
      heritage: 'Banarasi silk has been a symbol of Indian luxury since the Mughal era, with each saree taking weeks to weave.',
    },
    'Tamil Nadu': {
      description: 'From the temple towns of Tamil Nadu, where silk weaving is a sacred tradition.',
      heritage: 'Kanjeevaram silk sarees are treasured heirlooms, woven with pure silk and gold zari threads.',
    },
    'Punjab': {
      description: 'The land of five rivers, where vibrant Phulkari embroidery blooms on fabric.',
      heritage: 'Phulkari means "flower work" - each piece is hand-embroidered with silk threads creating stunning floral patterns.',
    },
  };

  const story = stateStories[product.state_of_origin];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-accent rounded-lg p-8 my-8"
    >
      <h3 className="text-2xl font-heading font-medium mb-6 flex items-center gap-3">
        <Scissors className="h-6 w-6 text-primary" />
        Craft Heritage
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {product.state_of_origin && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-secondary" />
              <h4 className="font-body font-semibold">Origin: {product.state_of_origin}</h4>
            </div>
            {story && (
              <div className="space-y-3">
                <p className="text-muted-foreground font-accent italic">
                  "{story.description}"
                </p>
                <p className="text-sm text-muted-foreground">
                  {story.heritage}
                </p>
              </div>
            )}
          </div>
        )}

        {product.craft_style && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-secondary" />
              <h4 className="font-body font-semibold">Craft: {product.craft_style}</h4>
            </div>
            <div className="space-y-2">
              {product.handmade && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Handcrafted by skilled artisans</span>
                </div>
              )}
              {product.fabric && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Made with {product.fabric}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Authentic traditional technique</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CraftStorySection;