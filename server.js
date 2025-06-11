// server.js

// ─────── DEV ONLY: ignore the Mashery cert alt-name mismatch ───────
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve your static front-end from /public
app.use(express.static(path.join(__dirname, 'public')));

// (Optional) sanity check route
app.get('/hello', (req, res) => {
  res.send('👋 Hello World');
});

// API proxy for UPC lookups
app.get('/api/product', async (req, res) => {
  const upc = req.query.upc;
  if (!upc) {
    return res.status(400).json({ error: 'Missing UPC' });
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
