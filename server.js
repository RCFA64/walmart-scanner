// server.js

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/hello', (req, res) => res.send('👋 Hello World'));

app.get('/api/product', async (req, res) => {
  const upc = req.query.upc;
  if (!upc) return res.status(400).json({ error: 'Missing UPC' });

  const apiKey = process.env.WM_API_KEY;
  const endpoint =  
    `https://affiliate-api.walmart.com/affiliates/v1/product-lookup` +
    `?apiKey=${encodeURIComponent(apiKey)}` +
    `&upc=${encodeURIComponent(upc)}`;

  console.log('Proxying to Walmart endpoint:', endpoint);

  try {
    const walmartRes = await fetch(endpoint);
    console.log('Walmart responded with status:', walmartRes.status);

    if (!walmartRes.ok) {
      const errText = await walmartRes.text();
      console.error('Walmart error body:', errText);
      return res
        .status(walmartRes.status)
        .json({ error:`Walmart API ${walmartRes.status}`, details: errText });
    }

    const data = await walmartRes.json();
    return res.json(data);

  } catch (err) {
    console.error('Error fetching from Walmart:', err);
    return res.status(502).json({ error:'Failed to reach Walmart API', details: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
