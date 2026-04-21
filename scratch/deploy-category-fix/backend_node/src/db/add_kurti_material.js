const { connectDB } = require('./mongodb');
const { Product } = require('../models');

const kurtiMaterialProducts = [
  {
    productId: 51,
    name: 'Chanderi Silk Kurti Material - Mauve Bloom',
    slug: 'chanderi-silk-kurti-material-mauve-bloom',
    description: 'Premium unstitched Chanderi silk kurti material in a beautiful mauve shade with delicate gold butti work. Lightweight and breathable, perfect for festive kurtas. Includes 2.5 meters of top fabric.',
    price: 1899,
    salePrice: 1499,
    discount: 21,
    categoryName: 'Kurti Material',
    categorySlug: 'kurti-material',
    fabric: 'Chanderi',
    color: 'Purple',
    occasion: 'Festive',
    work: 'Butti Work',
    brand: 'Shri Ramya',
    images: [
      'https://images.unsplash.com/photo-1698657169271-5b569ff3234e?w=800&q=80',
      'https://images.unsplash.com/photo-1652722464455-ec026ef74703?w=800&q=80'
    ],
    thumbnail: 'https://images.unsplash.com/photo-1698657169271-5b569ff3234e?w=400&q=80',
    stock: 40,
    rating: 4.5,
    reviewCount: 32,
    tags: ['kurti-material', 'chanderi', 'unstitched', 'festive', 'silk', 'fabric'],
    sizes: ['2.5 Meters'],
    isNew: true,
    isTrending: false,
    isFeatured: true,
  },
  {
    productId: 52,
    name: 'Pure Cotton Block Print Kurti Material - Jaipur Rose',
    slug: 'pure-cotton-block-print-kurti-material-jaipur-rose',
    description: 'Hand block printed pure cotton kurti material from Jaipur. Features traditional rose motifs in vibrant pink on a cream base. Ideal for casual and daily wear kurtas. Includes 2.5 meters top fabric.',
    price: 999,
    salePrice: 749,
    discount: 25,
    categoryName: 'Kurti Material',
    categorySlug: 'kurti-material',
    fabric: 'Cotton',
    color: 'Pink',
    occasion: 'Casual',
    work: 'Block Print',
    brand: 'Shri Ramya',
    images: [
      'https://images.unsplash.com/photo-1767590518755-0e4bd5404e1f?w=800&q=80',
      'https://images.unsplash.com/photo-1652722464455-ec026ef74703?w=800&q=80'
    ],
    thumbnail: 'https://images.unsplash.com/photo-1767590518755-0e4bd5404e1f?w=400&q=80',
    stock: 60,
    rating: 4.3,
    reviewCount: 58,
    tags: ['kurti-material', 'cotton', 'block-print', 'jaipur', 'unstitched', 'casual'],
    sizes: ['2.5 Meters'],
    isNew: true,
    isTrending: true,
    isFeatured: true,
  },
  {
    productId: 53,
    name: 'Embroidered Georgette Kurti Material - Royal Black',
    slug: 'embroidered-georgette-kurti-material-royal-black',
    description: 'Luxurious unstitched georgette kurti material in black with intricate silver thread embroidery and floral motifs. Perfect for party wear and evening occasions. Includes 2.5 meters top fabric with matching dupatta fabric.',
    price: 2499,
    salePrice: 1999,
    discount: 20,
    categoryName: 'Kurti Material',
    categorySlug: 'kurti-material',
    fabric: 'Georgette',
    color: 'Black',
    occasion: 'Party',
    work: 'Embroidery',
    brand: 'Shri Ramya',
    images: [
      'https://images.unsplash.com/photo-1758278212585-c050f6ee5742?w=800&q=80',
      'https://images.unsplash.com/photo-1698657169271-5b569ff3234e?w=800&q=80'
    ],
    thumbnail: 'https://images.unsplash.com/photo-1758278212585-c050f6ee5742?w=400&q=80',
    stock: 25,
    rating: 4.7,
    reviewCount: 41,
    tags: ['kurti-material', 'georgette', 'embroidery', 'party-wear', 'black', 'unstitched'],
    sizes: ['2.5 Meters'],
    isNew: true,
    isTrending: true,
    isFeatured: false,
  },
  {
    productId: 54,
    name: 'Rayon Floral Kurti Material - Teal Garden',
    slug: 'rayon-floral-kurti-material-teal-garden',
    description: 'Soft and flowy rayon kurti material with all-over floral digital print in teal and multicolor. Easy to stitch and comfortable for daily wear. Includes 2.5 meters of fabric.',
    price: 799,
    salePrice: 599,
    discount: 25,
    categoryName: 'Kurti Material',
    categorySlug: 'kurti-material',
    fabric: 'Rayon',
    color: 'Teal',
    occasion: 'Daily Wear',
    work: 'Digital Print',
    brand: 'Shri Ramya',
    images: [
      'https://images.unsplash.com/photo-1669194722837-06fbe316a1eb?w=800&q=80',
      'https://images.unsplash.com/photo-1740992556357-f7fe9afff763?w=800&q=80'
    ],
    thumbnail: 'https://images.unsplash.com/photo-1669194722837-06fbe316a1eb?w=400&q=80',
    stock: 75,
    rating: 4.1,
    reviewCount: 92,
    tags: ['kurti-material', 'rayon', 'floral', 'daily-wear', 'digital-print', 'unstitched'],
    sizes: ['2.5 Meters'],
    isNew: false,
    isTrending: true,
    isFeatured: false,
  },
  {
    productId: 55,
    name: 'Chikankari Lucknowi Kurti Material - Ivory Elegance',
    slug: 'chikankari-lucknowi-kurti-material-ivory-elegance',
    description: 'Exquisite hand-embroidered Chikankari kurti material from Lucknow on fine cotton fabric. Features intricate shadow work and jaali patterns in classic ivory. A timeless piece for every wardrobe. Includes 2.5 meters top fabric.',
    price: 2999,
    salePrice: 2499,
    discount: 17,
    categoryName: 'Kurti Material',
    categorySlug: 'kurti-material',
    fabric: 'Cotton',
    color: 'White',
    occasion: 'Festive',
    work: 'Chikankari',
    brand: 'Shri Ramya',
    images: [
      'https://images.unsplash.com/photo-1652722464455-ec026ef74703?w=800&q=80',
      'https://images.unsplash.com/photo-1764740185240-58527413f572?w=800&q=80'
    ],
    thumbnail: 'https://images.unsplash.com/photo-1652722464455-ec026ef74703?w=400&q=80',
    stock: 20,
    rating: 4.9,
    reviewCount: 67,
    tags: ['kurti-material', 'chikankari', 'lucknow', 'handwork', 'cotton', 'festive', 'unstitched'],
    sizes: ['2.5 Meters'],
    isNew: true,
    isTrending: false,
    isFeatured: true,
  }
];

async function addKurtiMaterial() {
  try {
    await connectDB();
    
    // Remove existing kurti material products (if re-running)
    await Product.deleteMany({ categorySlug: 'kurti-material' });
    console.log('Cleared existing kurti material products');
    
    // Insert new products
    await Product.insertMany(kurtiMaterialProducts, { ordered: false });
    console.log(`Successfully added ${kurtiMaterialProducts.length} Kurti Material products!`);
    
    // Verify
    const count = await Product.countDocuments({ categorySlug: 'kurti-material' });
    console.log(`Kurti Material category now has ${count} products`);
    
    const totalProducts = await Product.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addKurtiMaterial();
