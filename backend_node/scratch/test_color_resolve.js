const axios = require('axios');

async function testColorPizza(name) {
  try {
    const response = await axios.get(`https://api.color.pizza/v1/names/?name=${encodeURIComponent(name)}`, { timeout: 3000 });
    if (response.data && response.data.colors && response.data.colors.length > 0) {
      console.log(`[ColorPizza] Resolved "${name}" to:`, response.data.colors[0].name, response.data.colors[0].hex);
      return response.data.colors[0].hex;
    }
  } catch (error) {
    console.error(`[ColorPizza] Error resolving "${name}":`, error.message);
  }
  return null;
}

async function testWebLookup(name) {
  const searchTerms = [
    `${name} hex code ColorHexa`,
    `${name} hex code Encycolorpedia`,
    `${name} hex code ColorKit`,
    `${name} color hex code`
  ];

  for (const term of searchTerms) {
    try {
      console.log(`[WebLookup] Searching for: "${term}"`);
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(term)}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 4000
      });

      const html = response.data;
      
      // Look for hex codes inside the page text/links
      // We look for patterns like #ffffff or in URLs like colorhexa.com/e0115f
      const hexRegexes = [
        /colorhexa\.com\/([a-f0-9]{6}|[a-f0-9]{3})\b/i,
        /encycolorpedia\.com\/([a-f0-9]{6}|[a-f0-9]{3})\b/i,
        /#([a-f0-9]{6}|[a-f0-9]{3})\b/i
      ];

      for (const regex of hexRegexes) {
        const match = html.match(regex);
        if (match) {
          const hex = match[1] || match[0];
          const formattedHex = hex.startsWith('#') ? hex : `#${hex}`;
          console.log(`[WebLookup] Match found: ${formattedHex} using regex ${regex}`);
          return formattedHex;
        }
      }
    } catch (error) {
      console.error(`[WebLookup] Error searching for "${term}":`, error.message);
    }
  }
  return null;
}

async function run() {
  console.log('--- Testing Rani Pink ---');
  await testColorPizza('Rani Pink');
  await testWebLookup('Rani Pink');

  console.log('\--- Testing Mustard Yellow ---');
  await testColorPizza('Mustard Yellow');
  await testWebLookup('Mustard Yellow');

  console.log('\--- Testing Gajri ---');
  await testColorPizza('Gajri');
  await testWebLookup('Gajri');
}

run();
