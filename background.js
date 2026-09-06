// ============================================================
// GITLEET - SERVICE WORKER
// ============================================================
// Orchestrates the automatic path:
//   Accepted verdict -> push to GitHub -> stash payload -> notify
// Publishing to LinkedIn is deliberately NOT automatic; clicking
// the notification opens share.html to review first.
// ============================================================

importScripts('extract.js');

const CLIENT_ID = '8640xvc47jbkk1';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const BACKEND_URL = 'https://gitlinked-two.vercel.app/api/exchange-linkedin-code';

const PENDING_KEY = 'pendingShare';
const POSTED_KEY = 'postedSlugs';
const DAYS_KEY = 'solvedDays';
const NOTIFICATION_ID = 'gitleet-share';

// Guards against the same submission being handled twice when both
// the fetch hook and the DOM observer catch the same verdict.
const handled = new Set();

function notify(message, { id = null, requireInteraction = false, title = 'GITLEET' } = {}) {
  chrome.notifications.create(id || `gitleet-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    requireInteraction
  });
}

// ============================================================
// MESSAGE ROUTER
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'postToLinkedIn') {
    handlePostToLinkedInAPI(msg.text);
  }

  if (msg.action === 'authorizeLinkedin') {
    authorizeLinkedin();
  }

  if (msg.action === 'solutionAccepted') {
    handleAccepted(msg.solution, sender, msg.source);
  }

  if (msg.action === 'markPosted') {
    markPosted(msg.slug).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

// ============================================================
// ACCEPTED VERDICT HANDLER
// ============================================================

async function handleAccepted(solution, sender, source) {
  const tabId = sender?.tab?.id;
  if (!solution || !tabId) return;

  const dedupeKey = solution.submissionId
    ? `sub:${solution.submissionId}`
    : `slug:${solution.slug}:${Date.now() - (Date.now() % 60000)}`;

  if (handled.has(dedupeKey)) return;
  handled.add(dedupeKey);
  if (handled.size > 200) handled.clear();

  console.log('[GITLEET] Accepted via', source, '->', solution.slug);

  const settings = await chrome.storage.sync.get([
    'token', 'repo', 'autoPush', 'autoShare'
  ]);

  // Both automations default ON when the user has never touched them.
  const autoPush = settings.autoPush !== false;
  const autoShare = settings.autoShare !== false;

  if (!autoPush) return;

  if (!settings.token || !settings.repo) {
    notify('⚠️ Solved, but GitHub is not configured. Open GITLEET → GitHub to add a token and repo.');
    return;
  }

  // ----------------------------------------------------------
  // Read the full source out of Monaco
  // ----------------------------------------------------------
  // The DOM scrape in content.js only sees rendered lines, so a
  // long solution comes back truncated. getFullCodeFromMonaco
  // reads the editor model instead.

  const data = await getFullCodeFromMonaco(tabId);
  const code = data?.code || solution.code;

  if (!code || !code.trim()) {
    notify('⚠️ Solved, but no code could be read from the editor.');
    return;
  }

  const language = data?.language || solution.language;
  const path = buildSolutionPath(solution.slug, solution.number, language);
  const commitTitle = solution.number
    ? `${solution.number}. ${solution.title}`
    : solution.title;

  // ----------------------------------------------------------
  // Push
  // ----------------------------------------------------------

  let pushResult;
  try {
    pushResult = await pushToGithub(
      settings.token,
      settings.repo,
      path,
      code,
      commitTitle
    );
  } catch (e) {
    console.error('[GITLEET] push failed:', e);
    notify(`❌ GitHub push failed: ${e.message}`);
    return;
  }

  const githubLink = `https://github.com/${settings.repo}/blob/main/${path}`;
  await recordSolvedDay();

  // ----------------------------------------------------------
  // Offer the LinkedIn post
  // ----------------------------------------------------------

  if (!autoShare) {
    notify(`✅ Pushed ${commitTitle} to GitHub`);
    return;
  }

  const alreadyPosted = await hasPosted(solution.slug);

  if (alreadyPosted) {
    // Re-solves still update the file, they just do not nag to post
    // the same problem to LinkedIn again.
    notify(`✅ Updated ${commitTitle} on GitHub — already shared, so no post offered`);
    return;
  }

  await chrome.storage.local.set({
    [PENDING_KEY]: {
      solution: { ...solution, language },
      code,
      language,
      githubLink,
      path,
      dayNumber: await getDayNumber(),
      createdAt: Date.now()
    }
  });

  notify(
    `✅ Pushed ${commitTitle}. Click to review your LinkedIn post.`,
    { id: NOTIFICATION_ID, requireInteraction: true }
  );
}

// ============================================================
// NOTIFICATION -> SHARE PAGE
// ============================================================

chrome.notifications.onClicked.addListener(async notificationId => {
  if (notificationId !== NOTIFICATION_ID) return;
  chrome.notifications.clear(notificationId);
  chrome.tabs.create({ url: chrome.runtime.getURL('share.html') });
});

// ============================================================
// DEDUPE + STREAK STATE
// ============================================================

async function hasPosted(slug) {
  const data = await chrome.storage.local.get([POSTED_KEY]);
  return (data[POSTED_KEY] || []).includes(slug);
}

async function markPosted(slug) {
  const data = await chrome.storage.local.get([POSTED_KEY]);
  const list = data[POSTED_KEY] || [];
  if (!list.includes(slug)) {
    list.push(slug);
    await chrome.storage.local.set({ [POSTED_KEY]: list });
  }
}

// "Day N" counts distinct days on which something was solved, which
// is what #100DaysOfCode means — not the number of problems solved.
async function recordSolvedDay() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await chrome.storage.local.get([DAYS_KEY]);
  const days = data[DAYS_KEY] || [];
  if (!days.includes(today)) {
    days.push(today);
    await chrome.storage.local.set({ [DAYS_KEY]: days });
  }
}

async function getDayNumber() {
  const data = await chrome.storage.local.get([DAYS_KEY]);
  return (data[DAYS_KEY] || []).length || 1;
}

// ============================================================
// LINKEDIN OAUTH
// ============================================================

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

// ============================================================
// TEXT-ONLY LINKEDIN POST
// ============================================================
// Kept for callers that have no image. share.html uses its own
// image-attaching path.

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
