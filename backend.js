// backend.js (Deploy on Replit or Vercel)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ========== CORS CONFIGURATION ==========
// Allow requests from Chrome extension
const corsOptions = {
  origin: [
    'chrome-extension://khbikoeinfnkfcnmfkhkpmnlicjeionc', // Your extension ID
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
// Note: app.use(cors(...)) above already answers OPTIONS preflight requests
// for all routes, so no explicit app.options() handler is needed.

// ========== ENVIRONMENT VARIABLES ==========
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Validate on startup
if (!CLIENT_SECRET || !CLIENT_ID || !REDIRECT_URI) {
  console.error('❌ Missing required environment variables!');
  console.error('Required: LINKEDIN_CLIENT_SECRET, LINKEDIN_CLIENT_ID, REDIRECT_URI');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('Client ID:', CLIENT_ID.substring(0, 10) + '...');

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({ status: 'LinkedIn OAuth Backend is running ✅' });
});

// ========== EXCHANGE AUTHORIZATION CODE FOR TOKEN ==========
app.post('/exchange-linkedin-code', async (req, res) => {
  const { code, redirectUri } = req.body;

  console.log('📨 Received authorization code:', code.substring(0, 20) + '...');

  if (!code) {
    console.error('❌ No code provided');
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    console.log('🔄 Exchanging code for token...');
    
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error('❌ LinkedIn token error:', tokenData);
      throw new Error(tokenData.error_description || `LinkedIn error: ${tokenData.error}`);
    }

    if (!tokenData.access_token) {
      console.error('❌ No access token in response');
      throw new Error('Failed to get access token from LinkedIn');
    }

    console.log('✅ Access token received');

    // Get member ID via OpenID Connect userinfo endpoint.
    // The requested scopes (openid/profile/email) are OIDC scopes, so the
    // member identifier comes back as `sub` from /v2/userinfo — not `id` from /rest/me.
    console.log('🔄 Fetching member info...');

    const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!meRes.ok) {
      const errBody = await meRes.text().catch(() => '');
      console.error('❌ Failed to get member info:', meRes.status, meRes.statusText, errBody);
      throw new Error(`Failed to get user info: ${meRes.status} ${meRes.statusText} ${errBody}`);
    }

    const meData = await meRes.json();

    if (!meData.sub) {
      console.error('❌ No member ID in response:', meData);
      throw new Error('No member ID (sub) in LinkedIn userinfo response');
    }

    console.log('✅ Member info retrieved. ID:', meData.sub);

    // Send success response with CORS headers
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin,
      'Access-Control-Allow-Credentials': 'true'
    });

    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      member_id: meData.sub,
      success: true
    });

  } catch (e) {
    console.error('❌ Authorization error:', e.message);
    
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin,
      'Access-Control-Allow-Credentials': 'true'
    });
    
    res.status(400).json({ 
      error: e.message,
      success: false
    });
  }
});

// ========== CREATE LINKEDIN POST ==========
app.post('/create-post', async (req, res) => {
  const { accessToken, text, memberId } = req.body;

  if (!accessToken || !text || !memberId) {
    return res.status(400).json({ error: 'Missing required fields: accessToken, text, memberId' });
  }

  try {
    console.log('📝 Creating post for member:', memberId);

    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'LinkedIn-Version': '202608'
      },
      body: JSON.stringify({
        author: `urn:li:person:${memberId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.PublishOpen': {
            commerceMediaContent: {}
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        },
        text: {
          text: text
        }
      })
    });

    if (!postRes.ok) {
      const error = await postRes.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `Post failed: ${postRes.statusText}`);
    }

    const postData = await postRes.json();
    
    console.log('✅ Post created:', postData.id);

    res.json({ 
      success: true, 
      postId: postData.id 
    });

  } catch (e) {
    console.error('❌ Post error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// ========== REACT/LIKE POST ==========
app.post('/react-to-post', async (req, res) => {
  const { accessToken, postId, reactionType } = req.body;

  if (!accessToken || !postId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const reactRes = await fetch(
      `https://api.linkedin.com/rest/socialActions/${postId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reactionType: reactionType || 'LIKE'
        })
      }
    );

    if (!reactRes.ok) {
      throw new Error(`Reaction failed: ${reactRes.statusText}`);
    }

    res.json({ success: true });

  } catch (e) {
    console.error('❌ Reaction error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ LinkedIn OAuth Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`🔗 Token endpoint: http://localhost:${PORT}/exchange-linkedin-code`);
  console.log(`\n✅ CORS enabled for Chrome extension ID: khbikoeinfnkfcnmfkhkpmnlicjeionc\n`);
});