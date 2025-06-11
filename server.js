// server.js

// ─────── DEV ONLY: ignore the Mashery cert alt-name mismatch ───────
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Serve your front-end
app.use(express.static(path.join(__dirname, 'public')));

// 1a) Sanity check
app.get('/hello', (req, res) => {
  res.send('👋 Hello World');
});

// 2) Proxy route for UPC lookups
app.get('/api/product', async (req, res) => {
  const upc = req.query.upc;
  if (!upc) {
    return res.status(400).json({ error: 'Missing UPC parameter' });
  }

  const apiKey = process.env.WM_API_KEY;
  const endpoint =
    `https://api.walmartlabs.com/v1/items` +
    `?apiKey=${encodeURIComponent(apiKey)}` +
    `&upc=${encodeURIComponent(upc)}` +
    `&format=json`;

  console.log('Proxying to Walmart endpoint:', endpoint);

  try {
    const walmartRes = await fetch(endpoint);
    console.log('Walmart responded with status:', walmartRes.status);

    // If we didn’t get a 2xx, grab the text (often HTML) and return it as an error
    if (!walmartRes.ok) {
      const errText = await walmartRes.text();
      console.error('Walmart error body:', errText);
      return res
        .status(walmartRes.status)
        .json({ error: `Walmart API returned ${walmartRes.status}`, details: errText });
    }

    // Otherwise parse JSON normally
    const data = await walmartRes.json();
    return res.json(data);

  } catch (err) {
    console.error('Error fetching from Walmart:', err);
    return res.status(502).json({
      error: 'Failed to reach Walmart API',
      details: err.message,
    });
  }
});

// 3) Start listening
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
