chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'postToLinkedIn') {
    handlePostToLinkedInAPI(msg.text);
  }
  if (msg.action === 'authorizeLinkedin') {
    authorizeLinkedin();
  }
  return false;
});

const CLIENT_ID = '8640xvc47jbkk1'; // You'll need to replace this with YOUR LinkedIn app Client ID
const REDIRECT_URI = chrome.identity.getRedirectURL();
const BACKEND_URL = 'https://gitlinked-two.vercel.app/api/exchange-linkedin-code';

function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'GITLEET',
    message
  });
}

// ---- LinkedIn OAuth Authorization ----
async function authorizeLinkedin() {
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=w_member_social%20openid%20profile&state=gitleet`;

  chrome.identity.launchWebAuthFlow(
    { url: authUrl, interactive: true },
    async (redirectUrl) => {
      if (!redirectUrl) {
        notify('❌ LinkedIn authorization cancelled');
        return;
      }

      try {
        const url = new URL(redirectUrl);
        const code = url.searchParams.get('code');
        
        if (!code) {
          notify('❌ Authorization failed: no code received');
          return;
        }

        // Exchange code for access token via backend
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirectUri: REDIRECT_URI })
        }).catch(async (e) => {
          notify('⚠️ Backend error. Check your internet connection.');
          console.error('Backend fetch error:', e);
          return null;
        });

        if (response && response.ok) {
          const { access_token, member_id } = await response.json();
          chrome.storage.sync.set({
            linkedinToken: access_token,
            linkedinMemberId: member_id,
            linkedinAuthTime: Date.now()
          });
          notify('✅ LinkedIn authorized successfully!');
        } else if (response) {
          const errorText = await response.text();
          console.error('Backend error response:', response.status, errorText);
          notify(`❌ Backend error (${response.status}). Check your env variables.`);
        }
      } catch (e) {
        console.error('Auth exchange error:', e);
        notify(`❌ Auth exchange failed: ${e.message}`);
      }
    }
  );
}

// ---- Post to LinkedIn via API ----
async function handlePostToLinkedInAPI(text) {
  const { linkedinToken, linkedinMemberId } = await chrome.storage.sync.get(['linkedinToken', 'linkedinMemberId']);

  if (!linkedinToken || !linkedinMemberId) {
    notify('❌ LinkedIn not authorized. Click "Authorize LinkedIn" in settings first.');
    return;
  }

  try {
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinToken}`,
        'LinkedIn-Version': '202608',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author: `urn:li:person:${linkedinMemberId}`,
        commentary: text,
        visibility: 'PUBLIC',
        distribution: { feedDistribution: 'MAIN_FEED' },
        lifecycleState: 'PUBLISHED'
      })
    });

    if (response.ok) {
      notify('✅ Posted to LinkedIn successfully!');
    } else if (response.status === 401) {
      notify('❌ LinkedIn token expired. Re-authorize in settings.');
      chrome.storage.sync.remove(['linkedinToken', 'linkedinMemberId']);
    } else {
      const error = await response.json();
      notify(`❌ LinkedIn API error: ${error.message || 'Unknown error'}`);
    }
  } catch (e) {
    notify(`❌ Post failed: ${e.message}`);
  }
}