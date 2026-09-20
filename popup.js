const statusEl = document.getElementById('status');
const linkedinStatusEl = document.getElementById('linkedinStatus');

// ========== INITIALIZATION ==========
window.addEventListener('DOMContentLoaded', loadAllSettings);

async function loadAllSettings() {
  chrome.storage.sync.get(['token', 'repo'], (data) => {
    if (data.token) document.getElementById('token').value = data.token;
    if (data.repo) document.getElementById('repo').value = data.repo;
  });

  chrome.storage.sync.get(['linkedinToken', 'linkedinMemberId'], (data) => {
    if (data.linkedinToken) {
      updateLinkedInStatus(true);
    } else {
      updateLinkedInStatus(false);
    }
  });
}

function updateLinkedInStatus(isAuthorized) {
  const authBtn = document.getElementById('linkedinAuthBtn');
  const clearBtn = document.getElementById('linkedinClearBtn');
  
  if (isAuthorized) {
    authBtn.textContent = '✅ LinkedIn Authorized';
    authBtn.disabled = true;
    authBtn.style.opacity = '0.6';
    clearBtn.style.display = 'block';
  } else {
    authBtn.textContent = '🔒 Authorize LinkedIn';
    authBtn.disabled = false;
    authBtn.style.opacity = '1';
    clearBtn.style.display = 'none';
  }
}

// ========== GITHUB SETUP ==========

document.getElementById('saveSettings').addEventListener('click', () => {
  const token = document.getElementById('token').value;
  const repo = document.getElementById('repo').value;
  
  if (!token || !repo) {
    statusEl.textContent = 'Please enter both token and repo';
    return;
  }
  
  chrome.storage.sync.set({ token, repo }, () => {
    statusEl.textContent = '✅ GitHub settings saved';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
  });
});

// ========== LINKEDIN AUTHORIZATION ==========

document.getElementById('linkedinAuthBtn').addEventListener('click', authorizeLinkedin);
document.getElementById('linkedinClearBtn').addEventListener('click', clearLinkedinAuth);

async function authorizeLinkedin() {
  linkedinStatusEl.textContent = '🔄 Opening LinkedIn authorization...';
  
  const clientId = '8640xvc47jbkk1';
  const redirectUri = chrome.identity.getRedirectURL();
  
  console.log('Redirect URI:', redirectUri);
  console.log('Backend URL:', BACKEND_URL);
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email%20w_member_social`;

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });

    console.log('Response URL received');

    const url = new URL(responseUrl);
    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error('No authorization code received from LinkedIn');
    }

    console.log('Auth code received, exchanging for token...');
    linkedinStatusEl.textContent = '⏳ Exchanging code for token...';

    if (BACKEND_URL.includes('your-')) {
      throw new Error('❌ Backend URL not configured! Update BACKEND_URL in popup.js');
    }

    const tokenEndpoint = `${BACKEND_URL}/exchange-linkedin-code`;
    console.log('Calling backend:', tokenEndpoint);
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code: code,
        redirectUri: redirectUri
      })
    });

    console.log('Backend response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error || `Backend error: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('No access token in response from backend');
    }

    console.log('✅ Access token received');

    chrome.storage.sync.set({
      linkedinToken: tokenData.access_token,
      linkedinMemberId: tokenData.member_id,
      linkedinExpiresIn: tokenData.expires_in,
      linkedinSavedAt: new Date().getTime()
    }, () => {
      console.log('✅ LinkedIn token saved to storage');
      linkedinStatusEl.textContent = '✅ LinkedIn authorized successfully!';
      updateLinkedInStatus(true);
      setTimeout(() => { linkedinStatusEl.textContent = ''; }, 3000);
    });

  } catch (error) {
    console.error('Authorization error:', error);
    linkedinStatusEl.textContent = `❌ Error: ${error.message}`;
    setTimeout(() => { linkedinStatusEl.textContent = ''; }, 5000);
  }
}

async function clearLinkedinAuth() {
  if (!confirm('Clear LinkedIn authorization?')) return;
  
  chrome.storage.sync.remove(['linkedinToken', 'linkedinMemberId', 'linkedinExpiresIn', 'linkedinSavedAt'], () => {
    console.log('LinkedIn auth cleared');
    linkedinStatusEl.textContent = '✅ LinkedIn authorization cleared';
    updateLinkedInStatus(false);
    setTimeout(() => { linkedinStatusEl.textContent = ''; }, 2000);
  });
}

// ========== GITHUB PUSH (manual) ==========
// Extraction + push live in extract.js, shared with background.js
// and share.html. Nothing is duplicated here any more.

async function pushCurrentSolution(statusTarget) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('leetcode.com/problems/')) {
    statusTarget.textContent = 'Open a LeetCode problem tab, then try again';
    return null;
  }

  const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSolution' }).catch(() => null);
  if (!response) {
    statusTarget.textContent = 'Refresh the LeetCode tab and try again';
    return null;
  }

  const data = await getFullCodeFromMonaco(tab.id);
  const fullCode = data?.code || response.code;
  if (!fullCode) {
    statusTarget.textContent = 'No code found on this page';
    return null;
  }

  const { token, repo } = await chrome.storage.sync.get(['token', 'repo']);
  if (!token || !repo) {
    statusTarget.textContent = 'Please save your token and repo settings first';
    return null;
  }

  const language = data?.language || response.language;
  const path = buildSolutionPath(response.slug, response.number, language);
  const commitTitle = response.number
    ? `${response.number}. ${response.title}`
    : response.title;

  statusTarget.textContent = 'Pushing to GitHub...';
  await pushToGithub(token, repo, path, fullCode, commitTitle);
  return { tab, response, path, language };
}

document.getElementById('push').addEventListener('click', async () => {
  statusEl.textContent = 'pushing...';
  try {
    const result = await pushCurrentSolution(statusEl);
    if (result) statusEl.textContent = '✅ Pushed to GitHub successfully';
  } catch (err) {
    console.error('Push failed:', err);
    statusEl.textContent = err.message?.includes('Receiving end does not exist')
      ? 'Refresh the LeetCode tab and try again'
      : `Error: ${err.message}`;
  }
});

// ========== AUTOMATION TOGGLES ==========

function wireToggle(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  chrome.storage.sync.get([key], data => {
    // Default both automations ON — that is the point of the extension.
    el.checked = data[key] !== false;
  });
  el.addEventListener('change', () => {
    chrome.storage.sync.set({ [key]: el.checked });
  });
}

wireToggle('autoPush', 'autoPush');
wireToggle('autoShare', 'autoShare');

// ========== SHARE ==========
// The card + caption live on their own page so the canvas engine
// runs in a real document and survives the popup closing.

document.getElementById('openShare').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('share.html') });
});
