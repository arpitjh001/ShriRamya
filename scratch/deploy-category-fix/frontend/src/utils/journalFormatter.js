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

  // PRE-PROCESS: Convert non-breaking spaces to regular spaces to ensure word wrapping works
  // This handles the issue where browsers treat paragraphs as single long words
  const sanitizedHtml = html.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');

  // Use DOMParser to manipulate the HTML structure safely in the browser context
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedHtml, 'text/html');
  const body = doc.body;

  // 1. Add Drop Cap to the first paragraph and mark it as Intro
  const paragraphs = body.querySelectorAll('p');
  let introApplied = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.textContent.trim();
    
    // Only apply to the first paragraph with a decent amount of text
    if (text.length > 30 && !introApplied) {
      const firstChar = text.charAt(0);
      const remainingText = p.innerHTML.trim().substring(firstChar.length === 1 ? 1 : 0);
      
      // Mark as intro for special typography
      p.classList.add('journal-intro');
      
      // Ensure we don't break nesting if the first char is inside a tag
      if (p.firstChild && p.firstChild.nodeType === Node.TEXT_NODE) {
        p.innerHTML = `<span class="journal-dropcap">${firstChar}</span>${remainingText}`;
        introApplied = true;
        break; 
      }
    }
  }

  // 2. Handle Image Alignments and Alternating Layouts
  const images = body.querySelectorAll('img');
  images.forEach((img, index) => {
    const layoutClass = index % 2 === 0 ? 'journal-img-right' : 'journal-img-left';
    
    // Create a figure container
    const figure = doc.createElement('figure');
    figure.className = `journal-figure ${layoutClass}`;
    
    let targetToReplace = img;
    const parent = img.parentElement;
    
    if (parent && (parent.tagName === 'P' || parent.tagName === 'DIV') && parent.children.length === 1 && parent.textContent.trim() === '') {
      targetToReplace = parent;
    }
    
    img.style.width = ''; 
    img.style.height = '';
    
    if (targetToReplace.parentNode) {
      targetToReplace.parentNode.replaceChild(figure, targetToReplace);
      figure.appendChild(img);
      
      if (img.alt && img.alt.length > 3 && !img.alt.includes('untitled')) {
        const caption = doc.createElement('figcaption');
        caption.className = 'journal-caption';
        caption.textContent = img.alt;
        figure.appendChild(caption);
      }
    }
  });

  return body.innerHTML;
};
