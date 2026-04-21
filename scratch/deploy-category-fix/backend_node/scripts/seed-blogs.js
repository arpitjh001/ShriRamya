/**
 * Blog Seed Script
 * Creates blog posts about traditional sarees
 * Run with: npm run seed:blogs
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Blog posts to seed
const BLOG_POSTS = [
    {
        title: 'Sanganeri Sarees: The Exquisite Art of Block Printing from Rajasthan',
        slug: 'sanganeri-sarees-block-printing-rajasthan',
        content: `
<h2>The Legacy of Sanganeri Printing</h2>

<p>Sanganeri sarees represent one of India's most celebrated textile traditions, originating from the small town of Sanganer, located just 16 kilometers from Jaipur, Rajasthan. This exquisite form of block printing has adorned the drapes of royalty and continues to captivate fashion enthusiasts worldwide with its delicate motifs and vibrant colors.</p>

<h2>What Makes Sanganeri Sarees Unique?</h2>

<p>Sanganeri printing is distinguished by its fine lines, intricate floral patterns, and the use of a white or light-colored background. The craftsmanship involves hand-carved wooden blocks that are dipped in natural dyes and stamped onto the fabric with remarkable precision.</p>

<h3>Key Characteristics:</h3>
<ul>
<li><strong>Delicate Floral Motifs:</strong> Inspired by Mughal gardens, featuring roses, lotuses, and jasmine</li>
<li><strong>Light Background:</strong> Typically white, cream, or pastel shades that make the colors pop</li>
<li><strong>Natural Dyes:</strong> Traditionally made from vegetables, minerals, and flowers</li>
<li><strong>Double-Sided Printing:</strong> The design appears equally vibrant on both sides</li>
</ul>

<h2>The Intricate Process</h2>

<p>Creating a Sanganeri saree is a labor-intensive process that can take several days to complete:</p>

<ol>
<li><strong>Fabric Preparation:</strong> The cotton or silk fabric is washed and treated with a mixture of goat dung and soda ash to prepare it for printing.</li>
<li><strong>Outline Printing:</strong> The master printer uses the outline block (called "gad") to create the basic design framework.</li>
<li><strong>Color Filling:</strong> Different blocks are used to fill in various colors, a technique known as "dattu."</li>
<li><strong>Drying:</strong> The printed fabric is dried in the sun to set the colors.</li>
<li><strong>Washing:</strong> Finally, the saree is washed in the flowing waters of the Chambal River (traditionally) or treated water to remove excess dye and bring out the brilliance of the colors.</li>
</ol>

<h2>Motifs and Their Meanings</h2>

<p>Every motif in Sanganeri printing tells a story:</p>
<ul>
<li><strong>Kalga (Paisley):</strong> Symbol of fertility and good fortune</li>
<li><strong>Lotus:</strong> Represents purity and divine beauty</li>
<li><strong>Peacock:</strong> The national bird, symbolizing grace and elegance</li>
<li><strong>Vines and Creepers:</strong> Represent growth and prosperity</li>
</ul>

<h2>Caring for Your Sanganeri Saree</h2>

<p>To preserve the beauty of your Sanganeri saree:</p>
<ul>
<li>Hand wash in cold water with mild detergent</li>
<li>Avoid direct sunlight while drying</li>
<li>Store in a cool, dry place</li>
<li>Iron on low heat from the reverse side</li>
</ul>

<h2>Why Choose Sanganeri?</h2>

<p>Sanganeri sarees are not just garments; they are wearable art pieces that carry centuries of tradition. Each saree supports the livelihood of skilled artisan families who have preserved this craft through generations. When you drape a Sanganeri saree, you're not just wearing fabric—you're wearing history, culture, and the dedication of master craftsmen.</p>

<p>At Shri Ramya, we work directly with Sanganer artisan communities to bring you authentic, hand-block printed sarees that honor this magnificent tradition while offering contemporary designs for the modern woman.</p>
        `,
        excerpt: 'Discover the timeless beauty of Sanganeri block printing—a 300-year-old Rajasthani craft featuring delicate florals on pristine backgrounds.',
        status: 'published',
        tags: ['Sanganeri', 'Block Print', 'Rajasthan', 'Traditional', 'Handloom'],
        category: 'Traditional Crafts',
        featured_image: '/images/blogs/sanganeri-saree.jpg'
    },
    {
        title: 'Kotadoria Sarees: The Royal Weave of Gujarat',
        slug: 'kotadoria-sarees-royal-weave-gujarat',
        content: `
<h2>The Heritage of Kotadoria Weaving</h2>

<p>Kotadoria sarees, also known as Kotaria or Kotadiya sarees, are a magnificent testament to Gujarat's rich textile heritage. These sarees originate from the Kutch region of Gujarat and are renowned for their distinctive tie-dye patterns and intricate weaving techniques that have been passed down through generations of skilled artisans.</p>

<h2>What Defines Kotadoria Sarees?</h2>

<p>Kotadoria sarees are characterized by their unique bandhani (tie-dye) work combined with traditional weaving patterns. The name "Kotadoria" is derived from the Gujarati words "Kot" (fort) and "Dori" (thread), symbolizing the strength and durability of these magnificent weaves.</p>

<h3>Distinguishing Features:</h3>
<ul>
<li><strong>Bandhani Work:</strong> Intricate tie-dye patterns creating dots, squares, and geometric designs</li>
<li><strong>Rich Color Palette:</strong> Deep reds, vibrant yellows, royal blues, and earthy blacks</li>
<li><strong>Silk and Cotton Blend:</strong> Traditional use of pure silk or cotton-silk blends</li>
<li><strong>Zari Borders:</strong> Elaborate gold and silver thread work on borders and pallu</li>
<li><strong>Double Ikat Technique:</strong> Both warp and weft threads are tie-dyed before weaving</li>
</ul>

<h2>The Artisan's Process</h2>

<p>Creating a Kotadoria saree is a meticulous process that requires exceptional skill:</p>

<ol>
<li><strong>Thread Preparation:</strong> Silk or cotton threads are carefully selected and prepared for dyeing.</li>
<li><strong>Tie-Dye (Bandhani):</strong> Artisans tie thousands of tiny knots in the fabric before dyeing. Each knot resists the dye, creating the characteristic dotted patterns.</li>
<li><strong>Multiple Dyeing:</strong> The fabric undergoes several rounds of dyeing, from lightest to darkest colors.</li>
<li><strong>Weaving:</strong> Master weavers use traditional pit looms to create the intricate patterns, often taking 3-5 days per saree.</li>
<li><strong>Finishing:</strong> The saree is washed, dried, and given final touches to enhance its luster.</li>
</ol>

<h2>Symbolism in Patterns</h2>

<p>Every pattern in Kotadoria weaving carries cultural significance:</p>
<ul>
<li><strong>Chandrakala (Moon):</strong> Represents beauty and tranquility</li>
<li><strong>Suryakala (Sun):</strong> Symbolizes energy and vitality</li>
<li><strong>Ladoo:</strong> Circular patterns representing sweetness and celebration</li>
<li><strong>Mor (Peacock):</strong> Grace and elegance</li>
<li><strong>Geometric Patterns:</strong> Represent the cosmic order and balance</li>
</ul>

<h2>Occasions for Kotadoria</h2>

<p>Kotadoria sarees are traditionally worn during:</p>
<ul>
<li>Weddings and wedding ceremonies</li>
<li>Navratri and Garba celebrations</li>
<li>Religious festivals and ceremonies</li>
<li>Special family gatherings</li>
</ul>

<h2>Preservation and Care</h2>

<p>To maintain the beauty of your Kotadoria saree:</p>
<ul>
<li>Dry clean only to preserve the delicate dyes and zari work</li>
<li>Store wrapped in muslin cloth to allow the fabric to breathe</li>
<li>Avoid direct contact with perfumes or deodorants</li>
<li>Refold periodically to prevent permanent creases</li>
<li>Keep away from moisture to prevent zari from tarnishing</li>
</ul>

<h2>The Artisan Connection</h2>

<p>Each Kotadoria saree represents the dedication of multiple artisan families—the tie-dye experts, the weavers, and the zari workers. These communities have preserved their ancestral skills despite the challenges of modernization and mass production.</p>

<p>At Shri Ramya, we partner directly with Kutch artisan cooperatives to ensure fair wages and sustainable practices. When you choose a Kotadoria saree, you're supporting the continuation of this magnificent craft and the livelihoods of the talented families who create these masterpieces.</p>

<h2>Styling Your Kotadoria</h2>

<p>Modern styling tips:</p>
<ul>
<li>Pair with a contrasting blouse for contemporary appeal</li>
<li>Accessorize with traditional silver jewelry for authentic look</li>
<li>Experiment with modern draping styles for fusion occasions</li>
<li>Combine with minimalist jewelry for a balanced, elegant look</li>
</ul>

<p>Embrace the royal legacy of Gujarat with a Kotadoria saree that speaks of tradition, craftsmanship, and timeless elegance.</p>
        `,
        excerpt: 'Explore the royal Kotadoria sarees of Gujarat—where bandhani tie-dye meets masterful weaving in a celebration of color and tradition.',
        status: 'published',
        tags: ['Kotadoria', 'Bandhani', 'Gujarat', 'Traditional', 'Silk', 'Wedding Wear'],
        category: 'Traditional Crafts',
        featured_image: '/images/blogs/kotadoria-saree.jpg'
    }
];

async function seedBlogs() {
    let pool;
    try {
        // Connect to MySQL
        const mysql = require('mysql2/promise');

        pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT) || 3307,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || 'rootpassword',
            database: process.env.MYSQL_DATABASE || 'shriramya',
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });

        console.log('✓ Connected to MySQL');

        // Clear existing blog posts
        console.log('Clearing existing blog posts...');
        await pool.query('DELETE FROM blogs');
        console.log('✓ Existing posts cleared');

        // Get author ID (default admin)
        const [authorRows] = await pool.query(
            'SELECT id FROM mysql_users WHERE email = ?',
            ['admin@shriramya.com']
        );
        const authorId = authorRows.length > 0 ? authorRows[0].id : 1;

        // Get or create category
        let [categoryRows] = await pool.query(
            'SELECT id FROM blog_categories WHERE name = ?',
            ['Traditional Crafts']
        );

        if (categoryRows.length === 0) {
            const [result] = await pool.query(
                'INSERT INTO blog_categories (name, slug) VALUES (?, ?)',
                ['Traditional Crafts', 'traditional-crafts']
            );
            categoryRows = [{ id: result.insertId }];
        }

        const categoryId = categoryRows[0].id;
        console.log(`✓ Using category ID: ${categoryId}`);

        // Insert blog posts
        for (const post of BLOG_POSTS) {
            const now = new Date();

            const [result] = await pool.query(`
                INSERT INTO blogs (
                    title, slug, content, excerpt, author_id,
                    status, featured_image, created_at, updated_at, tenant_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                post.title,
                post.slug,
                post.content,
                post.excerpt,
                authorId,
                post.status,
                post.featured_image,
                now,
                now,
                1 // tenant_id
            ]);

            console.log(`✓ Created blog post: "${post.title}" (ID: ${result.insertId})`);
        }

        console.log('\n✅ Blog seeding completed successfully!');
        console.log('\n=== Seeded Blog Posts ===');
        BLOG_POSTS.forEach((post, idx) => {
            console.log(`${idx + 1}. ${post.title}`);
            console.log(`   Slug: ${post.slug}`);
            console.log(`   Status: ${post.status}`);
        });
        console.log('========================\n');

    } catch (error) {
        console.error('❌ Error seeding blogs:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('Database connection closed');
        process.exit(0);
    }
}

// Run the seed script
seedBlogs();
