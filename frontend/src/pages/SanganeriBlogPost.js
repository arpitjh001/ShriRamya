import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SanganeriBlogPost = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 pb-24">
      <div className="px-6 md:px-12 lg:px-24 pt-16 pb-12 max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-10">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Journal
          </Link>
        </div>

        {/* Article */}
        <article className="bg-card rounded-2xl border border-border shadow-luxury-lg overflow-hidden">
          {/* Header */}
          <div className="p-8 md:p-12 border-b border-border bg-accent/5">
            <h1 className="text-3xl md:text-4xl font-heading font-medium tracking-tight mb-4">
              The Art of Sanganeri Printing: How Traditional Block Prints Transform Silk Sarees
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Discover the centuries-old craft of Sanganeri block printing, where skilled artisans 
              transform luxurious silk sarees into wearable masterpieces using hand-carved wooden 
              blocks and natural dyes.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-muted-foreground">
              <span>📅 March 7, 2026</span>
              <span>🏷️ Traditional Crafts</span>
              <span>⏱️ 8 min read</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12 prose prose-lg max-w-none">
            <p className="lead text-xl text-muted-foreground italic border-l-4 border-primary pl-6 my-8">
              Discover the centuries-old craft of Sanganeri block printing, where skilled artisans 
              transform luxurious silk sarees into wearable masterpieces using hand-carved wooden 
              blocks and natural dyes.
            </p>

            <h2 className="text-2xl font-heading font-medium mt-12 mb-6">What is Sanganeri Print?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sanganeri printing is a traditional block printing technique that originated in Sanganer, 
              a small town near Jaipur, Rajasthan, dating back to the 16th century. This exquisite craft 
              received the prestigious <strong className="text-primary">Geographical Indication (GI) tag</strong> in 2009, 
              recognizing its unique cultural heritage and craftsmanship.
            </p>

            <p className="text-muted-foreground leading-relaxed mb-4">
              What sets Sanganeri apart from other block printing styles is its distinctive characteristics:
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Delicate floral motifs</strong> - Inspired by Mughal gardens and Rajasthani culture</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Red and black outlines</strong> - Created using natural dyes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>White or light backgrounds</strong> - Achieved through special bleaching techniques</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Double-sided printing</strong> - Patterns appear identically on both sides</span>
              </li>
            </ul>

            <h2 className="text-2xl font-heading font-medium mt-12 mb-6">The Dyeing Process: A Step-by-Step Journey</h2>

            <h3 className="text-xl font-heading font-medium mt-8 mb-4">Step 1: Fabric Preparation (Bleaching)</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Before any printing begins, the silk saree undergoes meticulous preparation:
            </p>
            <ol className="space-y-4 mb-8 list-decimal list-inside">
              <li className="text-muted-foreground leading-relaxed">
                <strong>Washing:</strong> The raw silk is washed multiple times to remove impurities and natural gums
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Bleaching:</strong> Traditionally, the fabric is soaked in a mixture of goat dung and soda ash 
                for 10-12 hours. This natural bleaching process gives Sanganeri prints their characteristic white background
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Drying:</strong> The bleached fabric is spread under the Rajasthani sun, turning it into a 
                perfect canvas for printing
              </li>
            </ol>

            <h3 className="text-xl font-heading font-medium mt-8 mb-4">Step 2: Block Carving</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The heart of Sanganeri printing lies in its hand-carved wooden blocks:
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Wood selection:</strong> Seasoned teak or sheesham wood is chosen for durability</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Design transfer:</strong> Master artisans sketch intricate patterns on the wood</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Carving:</strong> Using chisels and hammers, artisans carve the design in relief (raised portions)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Handles:</strong> Blocks are fitted with handles for precise grip during printing</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A single design may require 3-5 different blocks for outlines, fills, and borders.
            </p>

            <h3 className="text-xl font-heading font-medium mt-8 mb-4">Step 3: Color Preparation</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sanganeri artisans use natural dyes derived from:
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Red:</strong> Alizarin from madder roots (Rubia cordifolia)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Black:</strong> Iron rust (ferrous sulfate) mixed with jaggery</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Yellow:</strong> Pomegranate rinds or turmeric</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Blue:</strong> Indigo leaves</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Green:</strong> Combination of indigo and pomegranate</span>
              </li>
            </ul>

            <h3 className="text-xl font-heading font-medium mt-8 mb-4">Step 4: The Printing Process</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              This is where magic happens:
            </p>
            <ol className="space-y-4 mb-8 list-decimal list-inside">
              <li className="text-muted-foreground leading-relaxed">
                <strong>Setting up:</strong> The bleached silk saree is spread on a long printing table padded with 
                multiple layers of fabric
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Outline printing (Rekh):</strong> The master printer dips the outline block into black dye 
                and stamps it firmly on the fabric with a single tap
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Fill printing (Datta):</strong> Different blocks are used to fill colors within the outlines
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Perfect alignment:</strong> Artisans use registration pins (small holes in blocks) to ensure 
                patterns align perfectly
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Drying between colors:</strong> Each color is dried before the next is applied to prevent bleeding
              </li>
            </ol>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A single silk saree can take 2-3 days to print, depending on the complexity of the design.
            </p>

            <h3 className="text-xl font-heading font-medium mt-8 mb-4">Step 5: Fixing the Colors (Steaming)</h3>
            <ol className="space-y-4 mb-8 list-decimal list-inside">
              <li className="text-muted-foreground leading-relaxed">
                <strong>Wrapping:</strong> The printed saree is wrapped in clean white cloth
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Steaming:</strong> It's placed in a steam chamber for 2-3 hours at controlled temperature
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Color bonding:</strong> The steam helps the natural dyes penetrate deep into the silk fibers
              </li>
            </ol>

            <h3 className="text-xl font-heading font-medium mt-8 mb-4">Step 6: Washing and Finishing</h3>
            <ol className="space-y-4 mb-8 list-decimal list-inside">
              <li className="text-muted-foreground leading-relaxed">
                <strong>Washing:</strong> The saree is washed in running water to remove excess dye and bleaching agents
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Sun drying:</strong> Spread under the sun, which naturally brightens the colors
              </li>
              <li className="text-muted-foreground leading-relaxed">
                <strong>Calendering:</strong> The saree is passed through heavy rollers to give it a smooth, lustrous finish
              </li>
            </ol>

            <h2 className="text-2xl font-heading font-medium mt-12 mb-6">Why Sanganeri Silk Sarees Are Special</h2>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Eco-friendly:</strong> Uses only natural dyes and processes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Unique:</strong> Each piece has slight variations, making it one-of-a-kind</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Durable:</strong> Natural dyes don't fade easily and actually improve with washing</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Cultural heritage:</strong> Supports traditional artisan communities</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">✦</span>
                <span><strong>Versatile:</strong> Perfect for weddings, festivals, and special occasions</span>
              </li>
            </ul>

            <h2 className="text-2xl font-heading font-medium mt-12 mb-6">Caring for Your Sanganeri Silk Saree</h2>
            <ol className="space-y-4 mb-8 list-decimal list-inside">
              <li className="text-muted-foreground leading-relaxed"><strong>Dry clean only</strong> for the first few uses</li>
              <li className="text-muted-foreground leading-relaxed"><strong>Hand wash gently</strong> in cold water with mild detergent</li>
              <li className="text-muted-foreground leading-relaxed"><strong>Avoid direct sunlight</strong> while drying</li>
              <li className="text-muted-foreground leading-relaxed"><strong>Store in muslin cloth</strong> to allow the fabric to breathe</li>
              <li className="text-muted-foreground leading-relaxed"><strong>Iron on low heat</strong> from the reverse side</li>
            </ol>

            <h2 className="text-2xl font-heading font-medium mt-12 mb-6">The Artisan's Touch</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              What truly makes Sanganeri printing special is the human element. Each block is carved by master 
              craftsmen who have inherited this skill through generations. The printers themselves are artists 
              who have spent decades perfecting their technique. When you drape a Sanganeri printed silk saree, 
              you're not just wearing fabric—you're wearing centuries of tradition, artistry, and cultural heritage.
            </p>

            <blockquote className="border-l-4 border-primary pl-6 py-4 my-8 italic text-lg text-muted-foreground bg-accent/5 rounded-r-lg">
              "The beauty of Sanganeri lies not just in its patterns, but in the patience and precision of the 
              artisans who bring each design to life, one block at a time."
            </blockquote>

            <h2 className="text-2xl font-heading font-medium mt-12 mb-6">Explore Our Sanganeri Collection</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              At Shri Ramya, we work directly with Sanganer artisan communities to bring you authentic, 
              hand-block printed silk sarees. Each piece in our collection tells a story of tradition, 
              craftsmanship, and timeless elegance.
            </p>

            <div className="mt-12 p-8 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20 text-center">
              <h3 className="text-xl font-heading font-medium mb-4">Shop Authentic Sanganeri Silk Sarees</h3>
              <p className="text-muted-foreground mb-6">
                Explore our curated collection of hand-block printed Sanganeri silk sarees
              </p>
              <Link 
                to="/collections/sanganeri" 
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Shop Sanganeri Collection →
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default SanganeriBlogPost;
