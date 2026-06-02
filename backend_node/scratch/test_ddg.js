const axios = require('axios');

async function checkDdg() {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent('Rani Pink hex code ColorHexa')}`;
    console.log('Fetching', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    console.log('Status:', response.status);
    console.log('HTML length:', response.data.length);
    console.log('Includes colorhexa:', response.data.toLowerCase().includes('colorhexa'));
    
    // Check if there are elements with class result__snippet
    const snippets = [];
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = snippetRegex.exec(response.data)) !== null) {
      snippets.push(match[1]);
    }
    console.log('Found snippets:', snippets.length);
    if (snippets.length > 0) {
      console.log('First snippet:', snippets[0].substring(0, 200));
    } else {
      console.log('Sample body:', response.data.substring(response.data.indexOf('<body>'), response.data.indexOf('<body>') + 1000));
    }
    
    // Look for any links with href containing colorhexa
    const links = [];
    const hrefRegex = /href="([^"]+)"/g;
    while ((match = hrefRegex.exec(response.data)) !== null) {
      links.push(match[1]);
    }
    console.log('Links containing colorhexa:', links.filter(l => l.includes('colorhexa')));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDdg();
