export default async function handler(req, res) {
  const { code, redirectUri } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
  const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: "8640xvc47jbkk1",
        client_secret: "WPL_AP1.P2lk9YUsrAp2j4Ul.ryLb/g==",
        redirect_uri: "https://khbikoeinfnkfcnmfkhkpmnlicjeionc.chromiumapp.org/"
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return res.status(400).json({ error: errorData.error_description || 'Token exchange failed' });
    }

    const tokenData = await tokenResponse.json();

    const meResponse = await fetch('https://api.linkedin.com/rest/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!meResponse.ok) {
      return res.status(400).json({ error: 'Failed to get member info' });
    }

    const meData = await meResponse.json();

    res.json({
      access_token: tokenData.access_token,
      member_id: meData.id
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
}