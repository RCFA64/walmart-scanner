//
// server.js
//

// ─── DEV ONLY: ignore the Mashery cert alt-name mismatch ───
// (unsafe, but needed until Walmart certs are consistent)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Serve static UI from public/
app.use(express.static(path.join(__dirname, 'public')));

// 1a) Optional sanity route
app.get('/hello', (req, res) => res.send('👋 Hello World'));

// 2) UPC lookup proxy
app.get('/api/product', async (req, res) => {
  const upc = req.query.upc;
  if (!upc) return res.status(400).json({ error: 'Missing UPC parameter' });

  const apiKey = process.env.WM_API_KEY;
  // Official Product Lookup endpoint
  const lookupUrl =
    `https://affiliate-api.walmart.com/affiliates/v1/product-lookup` +
    `?apiKey=${encodeURIComponent(apiKey)}` +
    `&upc=${encodeURIComponent(upc)}`;

  console.log('➜ Attempting affiliate lookup:', lookupUrl);
  try {
    const affiliateRes = await fetch(lookupUrl);
    console.log('🌐 affiliate-api status', affiliateRes.status);

    if (affiliateRes.ok) {
      const affiliateData = await affiliateRes.json();
      return res.json({ source: 'affiliate-api', data: affiliateData });
    }

    // Non-2xx from affiliate-api → treat as fallback
    const errHtml = await affiliateRes.text();
    console.warn('⚠️ affiliate-api error:', affiliateRes.status, errHtml);
    throw new Error(`affiliate-api ${affiliateRes.status}`);
  } catch (affiliateErr) {
    console.warn('🔄 Falling back to WalmartLabs search:', affiliateErr.message);

    // Legacy search endpoint on WalmartLabs
    const searchUrl =
      `https://api.walmartlabs.com/v1/search` +
      `?apiKey=${encodeURIComponent(apiKey)}` +
      `&query=${encodeURIComponent(upc)}` +
      `&format=json`;

    console.log('➜ Searching via walmartlabs:', searchUrl);
    try {
      const searchRes = await fetch(searchUrl);
      console.log('🌐 search-api status', searchRes.status);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        return res.json({ source: 'search-api', data: searchData });
      }

      const searchErr = await searchRes.text();
      return res
        .status(searchRes.status)
        .json({ error: `Search API ${searchRes.status}`, details: searchErr });
    } catch (searchErr) {
      console.error('❌ Search API unreachable:', searchErr);
      return res
        .status(502)
        .json({ error: 'Failed to reach Search API', details: searchErr.message });
    }
  }
});

// 3) Launch
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
