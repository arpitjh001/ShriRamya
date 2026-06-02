const axios = require('axios');

async function testYahoo(query) {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    console.log('Fetching Yahoo:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    console.log('Yahoo Status:', response.status);
    console.log('Yahoo Length:', response.data.length);
    console.log('Yahoo ColorHexa in HTML:', response.data.toLowerCase().includes('colorhexa'));
    
    // Check for hex codes
    const match = response.data.match(/colorhexa\.com\/([a-f0-9]{6})\b/i);
    if (match) {
      console.log('Yahoo found hex:', match[1]);
      return match[1];
    }
  } catch (error) {
    console.error('Yahoo error:', error.message);
  }
  return null;
}

async function testBing(query) {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    console.log('Fetching Bing:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    console.log('Bing Status:', response.status);
    console.log('Bing Length:', response.data.length);
    console.log('Bing ColorHexa in HTML:', response.data.toLowerCase().includes('colorhexa'));
    
    // Check for hex codes
    const match = response.data.match(/colorhexa\.com\/([a-f0-9]{6})\b/i);
    if (match) {
      console.log('Bing found hex:', match[1]);
      return match[1];
    }
  } catch (error) {
    console.error('Bing error:', error.message);
  }
  return null;
}

async function testAsk(query) {
  try {
    const url = `https://www.ask.com/web?q=${encodeURIComponent(query)}`;
    console.log('Fetching Ask.com:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });
    console.log('Ask Status:', response.status);
    console.log('Ask Length:', response.data.length);
    console.log('Ask ColorHexa in HTML:', response.data.toLowerCase().includes('colorhexa'));
    
    // Check for hex codes
    const match = response.data.match(/colorhexa\.com\/([a-f0-9]{6})\b/i);
    if (match) {
      console.log('Ask found hex:', match[1]);
      return match[1];
    }
  } catch (error) {
    console.error('Ask error:', error.message);
  }
  return null;
}

async function run() {
  const query = 'Rani Pink hex code ColorHexa';
  await testYahoo(query);
  await testBing(query);
  await testAsk(query);
}

run();
