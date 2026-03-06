import React from 'react';
import { Droplet, Sun, Wind, Shield } from 'lucide-react';

const FabricCarePage = () => {
  const careGuides = [
    {
      fabric: 'Banarasi Silk',
      icon: Droplet,
      care: [
        'Dry clean only for best results',
        'If hand washing, use cold water with mild detergent',
        'Do not wring or twist the fabric',
        'Dry in shade, away from direct sunlight',
        'Iron on low heat while slightly damp',
        'Store in a muslin cloth to allow fabric to breathe',
      ],
    },
    {
      fabric: 'Cotton (Jaipuri Block Print)',
      icon: Sun,
      care: [
        'Hand wash in cold water separately for first few washes',
        'Use mild detergent to preserve print colors',
        'Avoid soaking for extended periods',
        'Dry in shade to prevent color fading',
        'Iron on medium heat',
        'Colors may bleed initially, wash separately',
      ],
    },
    {
      fabric: 'Georgette & Chiffon',
      icon: Wind,
      care: [
        'Dry clean recommended for embroidered pieces',
        'Hand wash gently in cold water if needed',
        'Do not scrub or wring',
        'Roll in towel to remove excess water',
        'Dry flat or hang in shade',
        'Steam iron on low setting',
      ],
    },
    {
      fabric: 'Bandhani & Tie-Dye',
      icon: Shield,
      care: [
        'Always wash separately to prevent color transfer',
        'Hand wash in cold water with mild detergent',
        'Do not bleach or use harsh chemicals',
        'Dry in shade to maintain vibrancy',
        'Iron on reverse side with low heat',
        'First wash may release excess dye, this is normal',
      ],
    },
  ];

  return (
    <div data-testid="fabric-care-page" className="px-6 md:px-12 lg:px-24 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-medium tracking-tight mb-4">
            Fabric Care Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Preserve the beauty and longevity of your ethnic wear with proper care
          </p>
        </div>

        <div className="space-y-8 mb-16">
          {careGuides.map((guide, index) => {
            const Icon = guide.icon;
            return (
              <div key={index} className="border border-border rounded-lg p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-heading font-medium">{guide.fabric}</h2>
                </div>
                <ul className="space-y-3">
                  {guide.care.map((instruction, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-primary mt-1.5 flex-shrink-0">•</span>
                      <span className="text-muted-foreground">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="bg-accent rounded-lg p-8">
          <h3 className="text-xl font-heading font-medium mb-4">General Tips</h3>
          <div className="space-y-3 text-muted-foreground">
            <p>• Always check the care label on your garment for specific instructions</p>
            <p>• Store ethnic wear in breathable cotton or muslin bags</p>
            <p>• Avoid plastic bags as they can trap moisture and cause yellowing</p>
            <p>• Keep away from direct sunlight during storage</p>
            <p>• For heavily embellished pieces, consider professional dry cleaning</p>
            <p>• Air out your garments occasionally to prevent musty odors</p>
            <p>• For silk sarees, refold differently after each use to prevent permanent creases</p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Have questions about caring for a specific piece? <br />
            <a href="/contact" className="text-primary hover:underline">Contact our support team</a> for personalized advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FabricCarePage;
