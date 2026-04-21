/**
 * Sanganeri Blog Post Page
 * Placeholder for Sanganeri print blog post
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

const SanganeriBlogPost = () => {
  return (
    <>
      <Helmet>
        <title>Sanganeri Print - Traditional Block Printing Art | ShriRamya</title>
        <meta name="description" content="Discover the art of Sanganeri block printing - a traditional Rajasthani craft featuring delicate floral patterns on textiles." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <article className="prose lg:prose-xl mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-gray-900">
            Sanganeri Print: The Art of Traditional Block Printing
          </h1>
          
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden bg-gray-100">
            <img 
              src="/placeholder-sanganeri.jpg" 
              alt="Sanganeri Block Printing"
              className="w-full h-full object-cover"
            />
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              What is Sanganeri Print?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Sanganeri printing is a traditional block printing technique originating from Sanganer, 
              a small town near Jaipur, Rajasthan. This exquisite art form is known for its delicate 
              floral patterns, fine lines, and vibrant colors on a white or light-colored background.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              History & Heritage
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Dating back to the 18th century, Sanganeri printing flourished under the patronage of 
              the royal families of Rajasthan. The craft was brought to Sanganer by skilled artisans 
              from Gujarat and has been passed down through generations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              The Process
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              The Sanganeri block printing process involves multiple steps including fabric preparation, 
              block carving, color preparation, printing, and fixing. Each block is hand-carved from 
              teak wood, and the printing is done manually with expert precision.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Explore Our Sanganeri Collection
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Discover our curated collection of authentic Sanganeri printed sarees, suits, and fabrics. 
              Each piece is crafted by skilled artisans preserving this centuries-old tradition.
            </p>
            <a 
              href="/collections/sanganeri" 
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Shop Sanganeri Collection
            </a>
          </section>
        </article>
      </div>
    </>
  );
};

export default SanganeriBlogPost;
