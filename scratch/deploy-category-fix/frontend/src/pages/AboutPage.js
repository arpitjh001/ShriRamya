import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Sparkles, Shield } from 'lucide-react';

const AboutPage = () => {
  const values = [
    {
      icon: Heart,
      title: 'Handcrafted with Love',
      description: 'Every piece is meticulously crafted by skilled artisans who pour their heart into their work.',
    },
    {
      icon: Users,
      title: 'Empowering Artisans',
      description: 'We work directly with local communities, ensuring fair wages and preserving traditional crafts.',
    },
    {
      icon: Sparkles,
      title: 'Authentic Heritage',
      description: 'Our collection celebrates genuine Rajasthani textiles and techniques passed down through generations.',
    },
    {
      icon: Shield,
      title: 'Quality Assured',
      description: 'We maintain the highest standards in materials, craftsmanship, and customer satisfaction.',
    },
  ];

  return (
    <div data-testid="about-page">
      {/* Hero */}
      <section className="relative h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1756483509164-e9e652cb51bb?auto=format&fit=crop&w=2400&q=80"
            alt="Shri Ramya Heritage"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 to-background/50" />
        </div>

        <div className="relative z-10 px-6 md:px-12 lg:px-24 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-heading font-medium tracking-tight leading-tight mb-6">
              Preserving Heritage,<br />Creating Timeless Beauty
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Since our inception, Shri Ramya has been dedicated to celebrating India's rich textile heritage through authentic, handcrafted ethnic wear.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="px-6 md:px-12 lg:px-24 py-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6 text-lg leading-relaxed"
          >
            <p className="font-accent italic text-2xl text-primary">
              "Our journey began with a simple vision: to bring the timeless beauty of Rajasthani craftsmanship to modern wardrobes while supporting the artisan communities that keep these traditions alive."
            </p>
            <p className="text-muted-foreground">
              At Shri Ramya, we believe that every saree, kurta set, and suit tells a story. The vibrant colors of Bandhani, the intricate patterns of Banarasi silk, the delicate block prints of Jaipuri cotton – each technique represents centuries of cultural heritage and artistic mastery.
            </p>
            <p className="text-muted-foreground">
              We work directly with artisan families across Rajasthan and India, ensuring fair compensation and helping preserve traditional techniques that might otherwise be lost to time. When you choose Shri Ramya, you're not just purchasing clothing; you're supporting a legacy of craftsmanship and empowering skilled artisans.
            </p>
            <p className="text-muted-foreground">
              Our collection spans from everyday elegance to bridal grandeur, each piece carefully selected or designed to honor tradition while embracing contemporary aesthetics. We're committed to quality, authenticity, and the belief that true luxury lies in the details – in the hands that weave, dye, and embroider each garment.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 md:px-12 lg:px-24 py-24 bg-muted">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4">
            Our Values
          </h2>
          <p className="text-lg text-muted-foreground">
            The principles that guide everything we do
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
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
                <h3 className="text-xl font-heading font-medium mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-24 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-4">
            Join Our Heritage Circle
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Experience the beauty of authentic Indian craftsmanship. Explore our collection and find pieces that resonate with your style and values.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
