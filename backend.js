// backend.js (deploy on Replit or Vercel)
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET; // Set in Replit secrets
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

app.post('/exchange-linkedin-code', async (req, res) => {
  const { code } = req.body;

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('No token in response');

    // Get member ID
    const meRes = await fetch('https://api.linkedin.com/rest/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const meData = await meRes.json();

    res.json({
      access_token: tokenData.access_token,
      member_id: meData.id
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('LinkedIn auth server running'));