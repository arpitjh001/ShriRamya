/**
 * Journal Formatter Utility
 * Handles editorial transformations for blog post HTML content.
 */

/**
 * Transforms raw HTML into a structured editorial layout.
 * @param {string} html Raw HTML from the editor
 * @returns {string} Processed HTML with layout classes
 */
export const formatJournalContent = (html) => {
  if (!html) return '';

  // Use DOMParser to manipulate the HTML structure safely in the browser context
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // 1. Add Drop Cap to the first paragraph
  const paragraphs = body.querySelectorAll('p');
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.textContent.trim();
    
    // Only apply drop cap to paragraphs with a decent amount of text
    if (text.length > 50) {
      const firstChar = text.charAt(0);
      const remainingText = p.innerHTML.trim().substring(firstChar.length === 1 ? 1 : 0);
      
      // Ensure we don't break nesting if the first char is inside a tag
      // For simplicity, we only apply if the first child is a text node
      if (p.firstChild && p.firstChild.nodeType === Node.TEXT_NODE) {
        p.innerHTML = `<span class="journal-dropcap">${firstChar}</span>${remainingText}`;
        break; // Only first paragraph gets a drop cap
      }
    }
  }

  // 2. Handle Image Alignments and Alternating Layouts
  const images = body.querySelectorAll('img');
  images.forEach((img, index) => {
    // Determine layout based on index (alternating)
    // We only alternate if the image is a direct child of body or inside a simple p
    const isDirect = img.parentElement === body || img.parentElement.tagName === 'P';
    
    if (isDirect) {
      const layoutClass = index % 2 === 0 ? 'journal-img-right' : 'journal-img-left';
      
      // Create a figure container for editorial styling
      const figure = doc.createElement('figure');
      figure.className = `journal-figure ${layoutClass}`;
      
      // Move image into figure
      img.parentNode.replaceChild(figure, img);
      figure.appendChild(img);
      
      // Add caption if alt text exists
      if (img.alt && img.alt.length > 3 && !img.alt.includes('untitled')) {
        const caption = doc.createElement('figcaption');
        caption.className = 'journal-caption';
        caption.textContent = img.alt;
        figure.appendChild(caption);
      }
    }
  });

  // 3. Justify text is handled by the parent container's CSS, 
  // but we can ensure all paragraphs have a base class if needed.
  
  return body.innerHTML;
};
