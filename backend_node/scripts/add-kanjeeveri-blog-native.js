/**
 * Add Kanjeeveram Silk Saree Blog Post (Native)
 * This script adds a native blog post about the craftsmanship of Kanjeeveram sarees.
 */

const { mysqlPool } = require('../src/config/db');

const blogData = {
    tenant_id: 1,
    title: 'The Art of Kanjeeveram: A Masterpiece of Craftsmanship',
    slug: 'craftsmanship-of-kanjeeveram-silk-sarees',
    excerpt: 'Explore the intricate process behind the creation of Kanjeeveram silk sarees, from the selection of pure mulberry silk to the meticulous hand-weaving by master craftsmen.',
    content: `
<div class="blog-content">
    <p class="lead">Kanjeeveram silk sarees, often referred to as the "Queen of Silks," are not just garments; they are a legacy of Indian heritage, woven with threads of tradition and artistry. Originating from the temple town of Kanchipuram in Tamil Nadu, these sarees are celebrated worldwide for their lustrous texture, rich colors, and unparalleled durability.</p>
    
    <h2>1. The Foundation: Pure Mulberry Silk</h2>
    <p>The journey begins with the selection of the finest mulberry silk. The silk used in Kanjeeveram sarees is known for its strength and silkiness. Before weaving, the silk threads are twisted together and dyed in vibrant hues using traditional techniques that ensure deep, lasting colors.</p>
    
    <h2>2. The Soul of the Saree: Gold and Silver Zari</h2>
    <p>What sets a Kanjeeveram apart is its exquisite Zari work. Traditional Kanjeeveram sarees use pure silk thread wrapped with a silver wire and سپس dipped in 22-carat gold. This unique combination gives the Zari its signature brilliance and prevents it from tarnishing over time.</p>
    
    <h2>3. The Technique: Korvai and Three-Shuttle Weaving</h2>
    <p>The most distinctive feature of a Kanjeeveram saree is the <strong>Korvai</strong> technique. This involves weaving the border and pallu separately and then skillfully joining them to the body of the saree. The joint is so strong that even if the saree tears, the border will stay intact.</p>
    <p>Authentic Kanjeeveram weaving often requires two weavers sitting on either side of the loom, using three shuttles to manage the complex patterns of the body and the border simultaneously. This labor-intensive process is what creates the "petni" (the contrast joint) between the body and the pallu.</p>
    
    <h2>4. Motifs Inspired by Divinity</h2>
    <p>The designs on a Kanjeeveram saree are deeply rooted in South Indian culture and temple architecture. Common motifs include:</p>
    <ul>
        <li><strong>Mayil (Peacock):</strong> Symbolizing grace and beauty.</li>
        <li><strong>Hamsam (Swan):</strong> Representing purity and wisdom.</li>
        <li><strong>Gopuram:</strong> Inspired by the monumental towers of South Indian temples.</li>
        <li><strong>Rudraksham:</strong> Symbolizing divinity and protection.</li>
    </ul>
    
    <h2>5. A Labor of Love</h2>
    <p>A single Kanjeeveram saree can take anywhere from 10 days to several weeks to complete, depending on the complexity of the design. Every weave is a testament to the weaver's patience, precision, and dedication to preserving an ancient craft.</p>
    
    <blockquote class="craftsman-quote">
        "Every thread we weave carries the stories of our ancestors. A Kanjeeveram is not just made; it is born from the loom." - A Master Weaver from Kanchipuram
    </blockquote>

    <h2>Conclusion</h2>
    <p>Draping a Kanjeeveram is like wearing a piece of history. It is a tribute to the craftsmen who keep this magnificent tradition alive. At Shri Ramya, we take pride in bringing you authentic, handcrafted Kanjeeveram sarees that celebrate the soul of Indian craftsmanship.</p>
</div>
    `,
    featured_image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1200', // Placeholder or high-quality image URL
    author_id: 1,
    status: 'published',
    meta_title: 'How Kanjeeveram Silk Sarees are Made | Shri Ramya Blog',
    meta_description: 'Discover the traditional process of Kanjeeveram silk saree weaving, from Korvai technique to gold zari work and divine motifs.'
};

async function addBlog() {
    try {
        console.log('🚀 Adding Kanjeeveram blog post...');

        // 1. Ensure author exists in mysql_users (if table exists and is used)
        try {
            const [users] = await mysqlPool.query('SELECT id FROM mysql_users WHERE id = 1');
            if (users.length === 0) {
                console.log('Creating default author...');
                await mysqlPool.query(
                    'INSERT INTO mysql_users (id, name, email, role) VALUES (1, "Admin", "admin@shriramya.com", "admin")'
                );
            }
        } catch (e) {
            console.log('Note: mysql_users check skipped or table doesn\'t exist.');
        }

        // 2. Insert blog post
        const [result] = await mysqlPool.query(
            `INSERT INTO blogs (
                tenant_id, title, slug, content, excerpt, featured_image,
                author_id, status, published_at, meta_title, meta_description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [
                blogData.tenant_id,
                blogData.title,
                blogData.slug,
                blogData.content,
                blogData.excerpt,
                blogData.featured_image,
                blogData.author_id,
                blogData.status,
                blogData.meta_title,
                blogData.meta_description
            ]
        );

        console.log('✅ Blog post added successfully!');
        console.log('Insert ID:', result.insertId);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding blog post:', error.message);
        process.exit(1);
    }
}

addBlog();
