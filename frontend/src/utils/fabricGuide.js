/**
 * Fabric Guide data for product detail pages.
 * Each entry includes a description, key properties, and care instructions.
 */
const FABRIC_GUIDE = {
  'Silk': {
    description: 'Pure silk is a natural protein fibre known for its lustrous sheen and soft texture. Prized for centuries in Indian textile traditions, silk drapes beautifully and holds vibrant dyes exceptionally well.',
    properties: ['Naturally lustrous', 'Breathable & temperature-regulating', 'Strong yet lightweight', 'Hypoallergenic'],
    care: ['Dry clean recommended', 'Store in muslin cloth away from direct sunlight', 'Iron on low heat with a pressing cloth', 'Avoid spraying perfume directly on fabric'],
    origin: 'India, China',
  },
  'Cotton': {
    description: 'Cotton is a soft, breathable natural fibre that is ideal for everyday wear, especially in warm climates. Indian cotton is celebrated worldwide for its fineness and comfort.',
    properties: ['Highly breathable', 'Soft against skin', 'Absorbs moisture', 'Durable & easy to wash'],
    care: ['Machine wash in cold water', 'Tumble dry on low or line dry', 'Iron on medium heat', 'Wash dark colours separately'],
    origin: 'India, Egypt',
  },
  'Chanderi': {
    description: 'Chanderi is a lightweight, sheer fabric traditionally woven in Chanderi, Madhya Pradesh. It blends silk and cotton with a distinctive gold or silver zari border, creating a subtle sheen perfect for elegant ethnic wear.',
    properties: ['Lightweight & sheer', 'Signature zari borders', 'Subtle sheen', 'GI-tagged heritage fabric'],
    care: ['Dry clean only', 'Store flat or loosely rolled', 'Iron on low heat from the reverse side', 'Keep away from moisture'],
    origin: 'Chanderi, Madhya Pradesh',
  },
  'Georgette': {
    description: 'Georgette is a sheer, lightweight crepe fabric with a slightly dull, matte texture and a beautiful drape. It is perfect for layered and flowing silhouettes in party and festive wear.',
    properties: ['Sheer & flowing drape', 'Crinkled texture', 'Lightweight', 'Holds embroidery well'],
    care: ['Hand wash gently or dry clean', 'Do not wring or twist', 'Hang dry in shade', 'Iron on low heat or steam'],
    origin: 'France (origin), widely produced in India',
  },
  'Rayon': {
    description: 'Rayon is a semi-synthetic fibre made from natural cellulose. It mimics the feel of silk and cotton, offering a soft, smooth drape at an affordable price point. Ideal for everyday and casual ethnic wear.',
    properties: ['Silky soft feel', 'Excellent drape', 'Absorbs dyes vibrantly', 'Affordable luxury'],
    care: ['Hand wash in cold water', 'Do not bleach or wring', 'Line dry in shade', 'Iron on medium-low heat while slightly damp'],
    origin: 'Widely produced globally',
  },
  'Chiffon': {
    description: 'Chiffon is an elegant, sheer fabric with a soft, flowing drape. Originally made from silk, modern chiffon also uses synthetic fibres. It is a favourite for dupattas, sarees, and layered outfits.',
    properties: ['Ultra-sheer & lightweight', 'Beautiful fluid drape', 'Slightly rough texture', 'Elegant for layering'],
    care: ['Hand wash or dry clean', 'Do not twist or wring', 'Hang dry away from sunlight', 'Iron on lowest setting or use steamer'],
    origin: 'France (origin)',
  },
  'Banarasi': {
    description: 'Banarasi fabric is a world-renowned handwoven silk from Varanasi (Banaras), Uttar Pradesh. Famous for its gold and silver brocade, zari, and opulent designs inspired by Mughal art.',
    properties: ['Heavy & rich texture', 'Gold/silver zari work', 'Mughal-inspired motifs', 'GI-tagged heritage weave'],
    care: ['Dry clean only', 'Store wrapped in muslin, not plastic', 'Refold periodically to prevent crease marks', 'Keep silica gel sachets to absorb moisture'],
    origin: 'Varanasi, Uttar Pradesh',
  },
  'Kanjivaram': {
    description: 'Kanjivaram silk is a premium handwoven silk from Kanchipuram, Tamil Nadu. Known for its durability, brilliant colours, and wide contrast borders, it is the most iconic bridal saree fabric in South India.',
    properties: ['Heavy pure silk', 'Wide contrast borders', 'Extremely durable', 'GI-tagged temple town weave'],
    care: ['Dry clean only', 'Air out after each wear before storing', 'Store in soft cotton cloth', 'Never fold on zari lines'],
    origin: 'Kanchipuram, Tamil Nadu',
  },
  'Linen': {
    description: 'Linen is a natural fibre made from the flax plant. It is exceptionally cool and breathable, with a characteristic crisp texture that softens with each wash. Perfect for summer ethnic wear.',
    properties: ['Extremely breathable', 'Natural crisp texture', 'Softens with wear', 'Eco-friendly & sustainable'],
    care: ['Machine wash in lukewarm water', 'Tumble dry on low', 'Iron while slightly damp', 'Wrinkles are natural and add character'],
    origin: 'Belgium, France, India',
  },
  'Crepe': {
    description: 'Crepe is a fabric with a distinctive crinkled, pebbled surface texture. It drapes beautifully and is commonly used for elegant ethnic and fusion wear.',
    properties: ['Crinkled texture', 'Excellent drape', 'Wrinkle-resistant', 'Versatile for all occasions'],
    care: ['Hand wash or dry clean', 'Do not wring', 'Iron on low heat from reverse', 'Store hanging to maintain drape'],
    origin: 'Widely produced',
  },
  'Velvet': {
    description: 'Velvet is a luxurious woven fabric with a dense, soft pile that creates a rich, opulent texture. It is a favourite for winter festive wear and bridal ensembles.',
    properties: ['Rich pile texture', 'Warm & luxurious', 'Deep colour saturation', 'Royal aesthetic'],
    care: ['Dry clean only', 'Steam to remove wrinkles (never iron directly)', 'Store hanging or rolled (never folded)', 'Brush gently to maintain pile'],
    origin: 'Italy (origin), produced in India',
  },
  'Organza': {
    description: 'Organza is a thin, sheer, plain-weave fabric traditionally made from silk. It has a crisp, stiff texture and a subtle shimmer, making it perfect for layered and structured ethnic wear.',
    properties: ['Sheer & crisp', 'Subtle shimmer', 'Holds structure well', 'Beautiful for layering'],
    care: ['Dry clean recommended', 'Iron on very low heat with a cloth', 'Store flat to prevent crushing', 'Handle with care — snags easily'],
    origin: 'Turkestan (origin), India',
  },
  'Jacquard': {
    description: 'Jacquard is a fabric with intricate patterns woven directly into the fabric rather than printed or embroidered. The technique creates beautiful textured designs with a rich, premium feel.',
    properties: ['Woven-in patterns', 'Rich textured surface', 'Durable & premium', 'Reversible design'],
    care: ['Dry clean recommended', 'Iron on medium heat from reverse', 'Store folded in soft cloth', 'Avoid harsh detergents'],
    origin: 'France (Jacquard loom), India',
  },
  'Net': {
    description: 'Net is an open-weave fabric with a distinctive mesh texture. It is lightweight, semi-transparent, and widely used for dupattas, overlays, and embroidered ethnic wear.',
    properties: ['Open mesh weave', 'Lightweight & airy', 'Perfect for embroidery base', 'Semi-transparent'],
    care: ['Hand wash gently', 'Do not twist or wring', 'Dry flat or hang', 'Iron on lowest heat with cloth'],
    origin: 'Widely produced',
  },
  'Tussar': {
    description: 'Tussar (also Tussah) is a wild silk variety with a rich, textured feel and a natural golden sheen. It is produced from wild silkworms in the forests of Jharkhand, Bihar, and Chhattisgarh.',
    properties: ['Natural golden sheen', 'Rich textured feel', 'Wild silk variety', 'Eco-friendly & handwoven'],
    care: ['Dry clean only', 'Store in muslin cloth', 'Iron on low heat', 'Handle gently — more delicate than mulberry silk'],
    origin: 'Jharkhand, Bihar, Chhattisgarh',
  },
};

/**
 * Get fabric guide for a given fabric name.
 * Falls back to a generic guide if fabric is not in the database.
 */
export const getFabricGuide = (fabricName) => {
  if (!fabricName) return null;
  
  // Try exact match first, then partial match
  const guide = FABRIC_GUIDE[fabricName] || 
    Object.entries(FABRIC_GUIDE).find(([key]) => 
      fabricName.toLowerCase().includes(key.toLowerCase()) || 
      key.toLowerCase().includes(fabricName.toLowerCase())
    )?.[1];

  return guide || {
    description: `${fabricName} is a quality fabric selected for its texture, comfort, and suitability for ethnic wear. Each piece is carefully chosen to ensure the best drape and finish.`,
    properties: ['Quality fabric', 'Comfortable wear', 'Good drape'],
    care: ['Follow the care label instructions', 'Dry clean recommended for first wash', 'Iron on appropriate heat setting'],
    origin: 'India',
  };
};

export default FABRIC_GUIDE;
