const axios = require('axios');

async function testYahoo(query) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    
    // Find all links containing colorhexa, encycolorpedia, or colorkit
    const hrefRegex = /href="([^"]+)"/g;
    let match;
    const links = [];
    while ((match = hrefRegex.exec(response.data)) !== null) {
      links.push(match[1]);
    }
    console.log('Yahoo found links containing target sites:', links.filter(l => l.includes('colorhexa') || l.includes('encycolorpedia') || l.includes('colorkit')));

    // Find any hex patterns like #ffffff or #ff00ff or similar in text
    // E.g., we look for # followed by 6 hex chars
    const hexRegex = /#([a-f0-9]{6})\b/gi;
    const hexes = [];
    while ((match = hexRegex.exec(response.data)) !== null) {
      hexes.push(match[0]);
    }
    console.log('Yahoo found hex codes in text:', [...new Set(hexes)].slice(0, 10));
  } catch (error) {
    console.error('Yahoo error:', error.message);
  }
}

async function testBing(query) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    
    // Find all links containing colorhexa, encycolorpedia, or colorkit
    const hrefRegex = /href="([^"]+)"/g;
    let match;
    const links = [];
    while ((match = hrefRegex.exec(response.data)) !== null) {
      links.push(match[1]);
    }
    console.log('Bing found links containing target sites:', links.filter(l => l.includes('colorhexa') || l.includes('encycolorpedia') || l.includes('colorkit')));

    // Find any hex patterns in text
    const hexRegex = /#([a-f0-9]{6})\b/gi;
    const hexes = [];
    while ((match = hexRegex.exec(response.data)) !== null) {
      hexes.push(match[0]);
    }
    console.log('Bing found hex codes in text:', [...new Set(hexes)].slice(0, 10));
  } catch (error) {
    console.error('Bing error:', error.message);
  }
}

async function run() {
  const query = 'Rani Pink hex code ColorHexa';
  await testYahoo(query);
  console.log('---------------------------------------------');
  await testBing(query);
}

run();
