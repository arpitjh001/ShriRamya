const axios = require('axios');

async function testYahooResolve(colorName) {
  const searchTerms = [
    `${colorName} hex code ColorHexa`,
    `${colorName} hex code Encycolorpedia`,
    `${colorName} hex code ColorKit`,
    `${colorName} color hex code`
  ];

  for (const term of searchTerms) {
    try {
      const url = `https://search.yahoo.com/search?p=${encodeURIComponent(term)}`;
      console.log(`[Yahoo] Fetching query: "${term}"`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 5000
      });

      const html = response.data;
      
      // Matches both standard and URL-encoded formats
      const regexes = [
        /(?:colorhexa\.com|encycolorpedia\.com)(?:%2f|\/)([a-f0-9]{6})\b/i,
        /colorkit\.co(?:%2f|\/)color(?:%2f|\/)(?:[a-z0-9-]+-)?([a-f0-9]{6})\b/i,
        /#([a-f0-9]{6})\b/i
      ];

      for (const regex of regexes) {
        const match = html.match(regex);
        if (match) {
          const hex = match[1];
          const formattedHex = `#${hex.toLowerCase()}`;
          console.log(`[Yahoo] Resolved "${colorName}" to ${formattedHex} using term "${term}"`);
          return formattedHex;
        }
      }
    } catch (error) {
      console.error(`[Yahoo] Error:`, error.message);
    }
  }
  console.log(`[Yahoo] Failed to resolve "${colorName}"`);
  return null;
}

async function run() {
  await testYahooResolve('Rani Pink');
  await testYahooResolve('Mustard Yellow');
  await testYahooResolve('Mehendi Green');
  await testYahooResolve('Peacock Blue');
  await testYahooResolve('Haldi Yellow');
}

run();
