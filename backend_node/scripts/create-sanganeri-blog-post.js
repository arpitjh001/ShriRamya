/**
 * Create Sanganeri Print Blog Post
 * This script creates a blog post about Sanganeri block printing on sarees
 */

const axios = require('axios');
require('dotenv').config();

const WORDPRESS_URL = process.env.WOOCOMMERCE_URL || 'http://woocommerce';
const WP_USER = process.env.WP_ADMIN_USER || 'shriramya';
const WP_PASSWORD = process.env.WP_APP_PASSWORD || '';

const blogPost = {
  title: 'The Art of Sanganeri Printing: How Traditional Block Prints Transform Silk Sarees',
  content: `
<!-- wp:paragraph {"className":"lead"} -->
<p class="lead">Discover the centuries-old craft of Sanganeri block printing, where skilled artisans transform luxurious silk sarees into wearable masterpieces using hand-carved wooden blocks and natural dyes.</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>What is Sanganeri Print?</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Sanganeri printing is a traditional block printing technique that originated in Sanganer, a small town near Jaipur, Rajasthan, dating back to the 16th century. This exquisite craft received the prestigious Geographical Indication (GI) tag in 2009, recognizing its unique cultural heritage and craftsmanship.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>What sets Sanganeri apart from other block printing styles is its distinctive characteristics:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul>
<li><strong>Delicate floral motifs</strong> - Inspired by Mughal gardens and Rajasthani culture</li>
<li><strong>Red and black outlines</strong> - Created using natural dyes</li>
<li><strong>White or light backgrounds</strong> - Achieved through special bleaching techniques</li>
<li><strong>Double-sided printing</strong> - Patterns appear identically on both sides</li>
</ul>
<!-- /wp:list -->

<!-- wp:heading -->
<h2>The Dyeing Process: A Step-by-Step Journey</h2>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3>Step 1: Fabric Preparation (Bleaching)</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Before any printing begins, the silk saree undergoes meticulous preparation:</p>
<!-- /wp:paragraph -->

<!-- wp:list {"ordered":true} -->
<ol>
<li><strong>Washing:</strong> The raw silk is washed multiple times to remove impurities and natural gums</li>
<li><strong>Bleaching:</strong> Traditionally, the fabric is soaked in a mixture of goat dung and soda ash for 10-12 hours. This natural bleaching process gives Sanganeri prints their characteristic white background</li>
<li><strong>Drying:</strong> The bleached fabric is spread under the Rajasthani sun, turning it into a perfect canvas for printing</li>
</ol>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>Step 2: Block Carving</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>The heart of Sanganeri printing lies in its hand-carved wooden blocks:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul>
<li><strong>Wood selection:</strong> Seasoned teak or sheesham wood is chosen for durability</li>
<li><strong>Design transfer:</strong> Master artisans sketch intricate patterns on the wood</li>
<li><strong>Carving:</strong> Using chisels and hammers, artisans carve the design in relief (raised portions)</li>
<li><strong>Handles:</strong> Blocks are fitted with handles for precise grip during printing</li>
</ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>A single design may require 3-5 different blocks for outlines, fills, and borders.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>Step 3: Color Preparation</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Sanganeri artisans use natural dyes derived from:</p>
<!-- /wp:paragraph -->

<!-- wp:list -->
<ul>
<li><strong>Red:</strong> Alizarin from madder roots (Rubia cordifolia)</li>
<li><strong>Black:</strong> Iron rust (ferrous sulfate) mixed with jaggery</li>
<li><strong>Yellow:</strong> Pomegranate rinds or turmeric</li>
<li><strong>Blue:</strong> Indigo leaves</li>
<li><strong>Green:</strong> Combination of indigo and pomegranate</li>
</ul>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>These natural dyes are mixed with natural thickeners to achieve the right consistency for printing.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>Step 4: The Printing Process</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>This is where magic happens:</p>
<!-- /wp:paragraph -->

<!-- wp:list {"ordered":true} -->
<ol>
<li><strong>Setting up:</strong> The bleached silk saree is spread on a long printing table padded with multiple layers of fabric</li>
<li><strong>Outline printing (Rekh):</strong> The master printer dips the outline block into black dye and stamps it firmly on the fabric with a single tap</li>
<li><strong>Fill printing (Datta):</strong> Different blocks are used to fill colors within the outlines</li>
<li><strong>Perfect alignment:</strong> Artisans use registration pins (small holes in blocks) to ensure patterns align perfectly</li>
<li><strong>Drying between colors:</strong> Each color is dried before the next is applied to prevent bleeding</li>
</ol>
<!-- /wp:list -->

<!-- wp:paragraph -->
<p>A single silk saree can take 2-3 days to print, depending on the complexity of the design.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>Step 5: Fixing the Colors (Steaming)</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>After printing, the saree undergoes a crucial fixing process:</p>
<!-- /wp:paragraph -->

<!-- wp:list {"ordered":true} -->
<ol>
<li><strong>Wrapping:</strong> The printed saree is wrapped in clean white cloth</li>
<li><strong>Steaming:</strong> It's placed in a steam chamber for 2-3 hours at controlled temperature</li>
<li><strong>Color bonding:</strong> The steam helps the natural dyes penetrate deep into the silk fibers</li>
</ol>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>Step 6: Washing and Finishing</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>The final steps bring out the true beauty:</p>
<!-- /wp:paragraph -->

<!-- wp:list {"ordered":true} -->
<ol>
<li><strong>Washing:</strong> The saree is washed in running water to remove excess dye and bleaching agents</li>
<li><strong>Sun drying:</strong> Spread under the sun, which naturally brightens the colors</li>
<li><strong>Calendering:</strong> The saree is passed through heavy rollers to give it a smooth, lustrous finish</li>
</ol>
<!-- /wp:list -->

<!-- wp:heading -->
<h2>Why Sanganeri Silk Sarees Are Special</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
<li><strong>Eco-friendly:</strong> Uses only natural dyes and processes</li>
<li><strong>Unique:</strong> Each piece has slight variations, making it one-of-a-kind</li>
<li><strong>Durable:</strong> Natural dyes don't fade easily and actually improve with washing</li>
<li><strong>Cultural heritage:</strong> Supports traditional artisan communities</li>
<li><strong>Versatile:</strong> Perfect for weddings, festivals, and special occasions</li>
</ul>
<!-- /wp:list -->

<!-- wp:heading -->
<h2>Caring for Your Sanganeri Silk Saree</h2>
<!-- /wp:heading -->

<!-- wp:list {"ordered":true} -->
<ol>
<li><strong>Dry clean only</strong> for the first few uses</li>
<li><strong>Hand wash gently</strong> in cold water with mild detergent</li>
<li><strong>Avoid direct sunlight</strong> while drying</li>
<li><strong>Store in muslin cloth</strong> to allow the fabric to breathe</li>
<li><strong>Iron on low heat</strong> from the reverse side</li>
</ol>
<!-- /wp:list -->

<!-- wp:heading -->
<h2>The Artisan's Touch</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>What truly makes Sanganeri printing special is the human element. Each block is carved by master craftsmen who have inherited this skill through generations. The printers themselves are artists who have spent decades perfecting their technique. When you drape a Sanganeri printed silk saree, you're not just wearing fabric—you're wearing centuries of tradition, artistry, and cultural heritage.</p>
<!-- /wp:paragraph -->

<!-- wp:quote -->
<blockquote class="wp-block-quote">
<p>"The beauty of Sanganeri lies not just in its patterns, but in the patience and precision of the artisans who bring each design to life, one block at a time."</p>
</blockquote>
<!-- /wp:quote -->

<!-- wp:heading -->
<h2>Explore Our Sanganeri Collection</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>At Shri Ramya, we work directly with Sanganer artisan communities to bring you authentic, hand-block printed silk sarees. Each piece in our collection tells a story of tradition, craftsmanship, and timeless elegance.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><a href="/collections/sanganeri" class="wp-block-button__link">Shop Sanganeri Silk Sarees →</a></p>
<!-- /wp:paragraph -->
`,
  excerpt: 'Discover the centuries-old craft of Sanganeri block printing, where skilled artisans transform luxurious silk sarees into wearable masterpieces using hand-carved wooden blocks and natural dyes.',
  status: 'publish',
  categories: [1],
  tags: ['Sanganeri', 'Block Print', 'Silk Sarees', 'Traditional Craft', 'Rajasthani Art', 'Handmade', 'Natural Dyes', 'Indian Heritage'],
  featured_media: 0
};

async function createBlogPost() {
  try {
    console.log('📝 Creating Sanganeri Print blog post...');
    console.log('WordPress URL:', WORDPRESS_URL);
    
    // Create the post via WordPress REST API
    const response = await axios.post(
      `${WORDPRESS_URL}/wp-json/wp/v2/posts`,
      blogPost,
      {
        auth: {
          username: WP_USER,
          password: WP_PASSWORD
        },
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Blog post created successfully!');
    console.log('Post ID:', response.data.id);
    console.log('Title:', response.data.title.rendered);
    console.log('Status:', response.data.status);
    console.log('URL:', `${WORDPRESS_URL}/?p=${response.data.id}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error creating blog post:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('Timeout: WordPress API did not respond in time');
      console.error('This is expected if WordPress is not properly configured');
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Run the script
createBlogPost()
  .then(result => {
    if (result) {
      console.log('\n🎉 Blog post created successfully!');
      console.log('\nTo view the blog post:');
      console.log(`Frontend: http://localhost:8080/blog/${result.id}`);
      console.log(`WordPress: ${WORDPRESS_URL}/wp-admin/post.php?post=${result.id}&action=edit`);
    } else {
      console.log('\n⚠️  Blog post creation failed');
      console.log('This is likely because WordPress integration is not fully configured.');
      console.log('You can manually create the blog post in WordPress admin panel.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
