const { connectDB, mongoose } = require('../db/mongodb');
const { Product, Blog } = require('../models');
const { productCatalog } = require('../mock/productCatalog');

const seedDatabase = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    // Seed products if empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const products = productCatalog.map((p, i) => ({
        ...p,
        productId: p.id || i + 1,
        categorySlug: (p.categoryName || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        price: p.price || Math.round(p.salePrice * 100 / (100 - (p.discount || 1))),
        color: p.color || 'Multi',
        work: p.work || 'Handwoven',
        brand: p.brand || 'Shri Ramya',
        isFeatured: i < 8,
        isTrending: i >= 4 && i < 12,
        isNew: i >= (productCatalog.length - 10),
      }));
      await Product.insertMany(products, { ordered: false });
      console.log(`Seeded ${products.length} products into MongoDB`);
    } else {
      console.log(`Products already seeded: ${productCount} found`);
    }

    // Seed users using raw collection (to work with existing User model)
    const usersCol = db.collection('users');
    const userCount = await usersCol.countDocuments();
    if (userCount < 2) {
      const bcrypt = require('bcryptjs');
      const adminHash = await bcrypt.hash('Admin@123', 8);
      const customerHash = await bcrypt.hash('Test@123', 8);

      const users = [
        {
          email: 'admin@shriramya.com',
          password: adminHash,
          name: 'Admin User',
          phone: '+91-9876543210',
          role: 'admin',
          is_active: true,
          shipping: { first_name: 'Admin', city: 'Jaipur', state: 'Rajasthan', postcode: '302001', country: 'India' },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          email: 'customer@test.com',
          password: customerHash,
          name: 'Test Customer',
          phone: '+91-9876543211',
          role: 'user',
          is_active: true,
          shipping: { first_name: 'Test', last_name: 'Customer', address_1: '123 MG Road', city: 'Jaipur', state: 'Rajasthan', postcode: '302001', country: 'India' },
          created_at: new Date(),
          updated_at: new Date(),
        }
      ];

      for (const u of users) {
        const exists = await usersCol.findOne({ email: u.email });
        if (!exists) await usersCol.insertOne(u);
      }
      console.log('Seeded users into MongoDB');
    } else {
      console.log(`Users already seeded: ${userCount} found`);
    }

    // Seed blogs if empty
    const blogCount = await Blog.countDocuments();
    if (blogCount === 0) {
      const seedBlogs = [
        {
          title: 'The Art of Sanganeri Printing',
          slug: 'art-of-sanganeri-printing',
          content: '<p>Sanganeri printing is a traditional form of hand block printing that originated in the town of Sanganer, near Jaipur, Rajasthan.</p>',
          excerpt: 'Discover the centuries-old craft of Sanganeri block printing.',
          author: { id: 'admin', name: 'Shri Ramya Team' },
          categories: ['Traditional Crafts', 'Silk Sarees'],
          tags: ['sanganeri', 'block-printing', 'rajasthan'],
          status: 'published', views: 245, commentsCount: 12, publishedAt: new Date('2026-03-01'),
        },
        {
          title: 'Styling Your Silk Saree for Every Occasion',
          slug: 'styling-silk-saree-occasions',
          content: '<p>A silk saree is a versatile garment that can be styled for various occasions.</p>',
          excerpt: 'Learn how to style your silk saree for weddings, festivals, and everyday elegance.',
          author: { id: 'admin', name: 'Shri Ramya Team' },
          categories: ['Style Guide', 'Silk Sarees'],
          tags: ['styling', 'silk-saree', 'fashion-tips'],
          status: 'published', views: 189, commentsCount: 8, publishedAt: new Date('2026-03-10'),
        },
        {
          title: 'Sustainable Fashion: The Handloom Story',
          slug: 'sustainable-fashion-handloom',
          content: '<p>Handloom weaving is one of the most sustainable forms of textile production.</p>',
          excerpt: 'How choosing handloom supports artisan communities and protects the environment.',
          author: { id: 'admin', name: 'Shri Ramya Team' },
          categories: ['Sustainability', 'Handloom'],
          tags: ['sustainability', 'handloom', 'eco-fashion'],
          status: 'published', views: 0, commentsCount: 0, publishedAt: new Date('2026-03-15'),
        }
      ];
      await Blog.insertMany(seedBlogs, { ordered: false });
      console.log(`Seeded ${seedBlogs.length} blogs into MongoDB`);
    } else {
      console.log(`Blogs already seeded: ${blogCount} found`);
    }

    console.log('Database seeding complete!');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = { seedDatabase };
