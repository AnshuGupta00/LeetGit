// ============================================================
// GITLEET - SERVICE WORKER
// ============================================================
// Automatic flow:
//
// LeetCode Accepted
//      ↓
// Read full Monaco source
//      ↓
// Push solution to GitHub
//      ↓
// Generate code-card image(s)
//      ↓
// Upload image(s) to LinkedIn
//      ↓
// Create LinkedIn post with image(s)
//      ↓
// Mark problem as posted
// ============================================================

importScripts('extract.js', 'linkedin.js');

// ============================================================
// CONFIG
// ============================================================

const CLIENT_ID = '8640xvc47jbkk1';
const REDIRECT_URI = chrome.identity.getRedirectURL();
const BACKEND_URL =
  'https://gitlinked-two.vercel.app/api/exchange-linkedin-code';

const PENDING_KEY = 'pendingShare';
const POSTED_KEY = 'postedSlugs';
const DAYS_KEY = 'solvedDays';
const NOTIFICATION_ID = 'gitleet-share';

// Prevent duplicate handling when both the fetch hook
// and DOM observer detect the same Accepted submission.
const handled = new Set();

// ============================================================
// NOTIFICATION
// ============================================================

function notify(
  message,
  {
    id = null,
    requireInteraction = false,
    title = 'GITLEET'
  } = {}
) {
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
  if (!msg || !msg.action) {
    return false;
  }

  // Manual/legacy LinkedIn call.
  // If another part of the extension sends only text,
  // this still creates a text-only post.
  if (msg.action === 'postToLinkedIn') {
    handlePostToLinkedInAPI(
      msg.text || '',
      msg.code || '',
      msg.language || 'plaintext',
      msg.title || 'LeetCode Solution'
    ).catch((error) => {
      console.error(
        '[GITLEET] Manual LinkedIn post failed:',
        error
      );

      notify(`❌ LinkedIn posting failed: ${error.message}`);
    });

    return false;
  }

  if (msg.action === 'authorizeLinkedin') {
    authorizeLinkedin();
    return false;
  }

  if (msg.action === 'solutionAccepted') {
    handleAccepted(
      msg.solution,
      sender,
      msg.source
    ).catch((error) => {
      console.error(
        '[GITLEET] Accepted handler failed:',
        error
      );

      notify(`❌ GITLEET failed: ${error.message}`);
    });

    return false;
  }

  if (msg.action === 'markPosted') {
    markPosted(msg.slug)
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        console.error(
          '[GITLEET] markPosted failed:',
          error
        );

        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }

  return false;
});

// ============================================================
// ACCEPTED VERDICT HANDLER
// ============================================================

async function handleAccepted(solution, sender, source) {
  const tabId = sender?.tab?.id;

  if (!solution || !tabId) {
    console.warn(
      '[GITLEET] Invalid Accepted message'
    );
    return;
  }

  // ----------------------------------------------------------
  // DEDUPE
  // ----------------------------------------------------------

  const dedupeKey = solution.submissionId
    ? `sub:${solution.submissionId}`
    : `slug:${solution.slug}:${Date.now() - (Date.now() % 60000)}`;

  if (handled.has(dedupeKey)) {
    console.log(
      '[GITLEET] Duplicate submission ignored:',
      dedupeKey
    );
    return;
  }

  handled.add(dedupeKey);

  if (handled.size > 200) {
    handled.clear();
  }

  console.log(
    '[GITLEET] Accepted via',
    source,
    '->',
    solution.slug
  );

  // ----------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------

  const settings = await chrome.storage.sync.get([
    'token',
    'repo',
    'autoPush',
    'autoShare'
  ]);

  // Default ON unless explicitly disabled.
  const autoPush = settings.autoPush !== false;
  const autoShare = settings.autoShare !== false;

  if (!autoPush) {
    console.log(
      '[GITLEET] Auto GitHub push disabled'
    );
    return;
  }

  if (!settings.token || !settings.repo) {
    notify(
      '⚠️ Solved, but GitHub is not configured. Open GITLEET and configure GitHub.'
    );

    return;
  }

  // ----------------------------------------------------------
  // GET FULL CODE FROM MONACO
  // ----------------------------------------------------------

  console.log(
    '[GITLEET] Reading full source from Monaco...'
  );

  const data = await getFullCodeFromMonaco(tabId);

  const code = data?.code || solution.code;

  if (!code || !code.trim()) {
    notify(
      '⚠️ Solved, but no code could be read from the editor.'
    );

    return;
  }

  const language =
    data?.language ||
    solution.language ||
    'plaintext';

  const path = buildSolutionPath(
    solution.slug,
    solution.number,
    language
  );

  const commitTitle = solution.number
    ? `${solution.number}. ${solution.title}`
    : solution.title;

  console.log(
    '[GITLEET] Language:',
    language
  );

  console.log(
    '[GITLEET] Code length:',
    code.length
  );

  // ----------------------------------------------------------
  // PUSH TO GITHUB
  // ----------------------------------------------------------

  let pushResult;

  try {
    console.log(
      '[GITLEET] Pushing to GitHub...'
    );

    pushResult = await pushToGithub(
      settings.token,
      settings.repo,
      path,
      code,
      commitTitle
    );

    console.log(
      '[GITLEET] GitHub push successful:',
      pushResult
    );
  } catch (error) {
    console.error(
      '[GITLEET] GitHub push failed:',
      error
    );

    notify(
      `❌ GitHub push failed: ${error.message}`
    );

    return;
  }

  // Keep this URL format from your existing project.
  const githubLink =
    `https://github.com/${settings.repo}/blob/main/${path}`;

  // Record today's solved day.
  await recordSolvedDay();

  // ----------------------------------------------------------
  // LINKEDIN DISABLED?
  // ----------------------------------------------------------

  if (!autoShare) {
    notify(
      `✅ Pushed ${commitTitle} to GitHub`
    );

    return;
  }

  // ----------------------------------------------------------
  // CHECK IF ALREADY POSTED
  // ----------------------------------------------------------

  const alreadyPosted =
    await hasPosted(solution.slug);

  if (alreadyPosted) {
    notify(
      `✅ Updated ${commitTitle} on GitHub — already shared on LinkedIn`
    );

    return;
  }

  // ----------------------------------------------------------
  // BUILD LINKEDIN TEXT
  // ----------------------------------------------------------

  const dayNumber =
    await getDayNumber();

  const linkedinText = `🚀 Day ${dayNumber} of #100DaysOfCode

Solved: ${commitTitle}

💻 Language: ${language}

🔗 GitHub:
${githubLink}

🔗 LeetCode:
https://leetcode.com/problems/${solution.slug}/

#LeetCode #GitHub #Coding #Programming`;

  // ----------------------------------------------------------
  // AUTOMATIC LINKEDIN POST
  // ----------------------------------------------------------

  try {
    console.log(
      '[GITLEET] Starting automatic LinkedIn post...'
    );

    // IMPORTANT:
    // Pass ALL FOUR arguments.
    await handlePostToLinkedInAPI(
      linkedinText,
      code,
      language,
      commitTitle
    );

    // Only mark as posted AFTER LinkedIn succeeds.
    await markPosted(solution.slug);

    console.log(
      '[GITLEET] LinkedIn post completed successfully.'
    );

    notify(
      `✅ ${commitTitle} pushed to GitHub and posted to LinkedIn!`
    );
  } catch (error) {
    console.error(
      '[GITLEET] Automatic LinkedIn posting failed:',
      error
    );

    // GitHub already succeeded.
    notify(
      `✅ GitHub updated, but LinkedIn posting failed: ${error.message}`
    );
  }
}

// ============================================================
// OPTIONAL PENDING SHARE SUPPORT
// ============================================================
// Kept for compatibility with your existing share.html flow.
// Automatic posting does not depend on this.

// ============================================================
// DEDUPE + STREAK STATE
// ============================================================

async function hasPosted(slug) {
  const data =
    await chrome.storage.local.get([
      POSTED_KEY
    ]);

  return (data[POSTED_KEY] || [])
    .includes(slug);
}

async function markPosted(slug) {
  const data =
    await chrome.storage.local.get([
      POSTED_KEY
    ]);

  const list =
    data[POSTED_KEY] || [];

  if (!list.includes(slug)) {
    list.push(slug);

    await chrome.storage.local.set({
      [POSTED_KEY]: list
    });
  }
}

// ============================================================
// SOLVED DAY
// ============================================================

async function recordSolvedDay() {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const data =
    await chrome.storage.local.get([
      DAYS_KEY
    ]);

  const days =
    data[DAYS_KEY] || [];

  if (!days.includes(today)) {
    days.push(today);

    await chrome.storage.local.set({
      [DAYS_KEY]: days
    });
  }
}

async function getDayNumber() {
  const data =
    await chrome.storage.local.get([
      DAYS_KEY
    ]);

  return (
    (data[DAYS_KEY] || []).length || 1
  );
}

// ============================================================
// LINKEDIN OAUTH
// ============================================================

async function authorizeLinkedin() {
  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=w_member_social%20openid%20profile` +
    `&state=gitleet`;

  chrome.identity.launchWebAuthFlow(
    {
      url: authUrl,
      interactive: true
    },
    async (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[GITLEET] OAuth error:',
          chrome.runtime.lastError
        );

        notify(
          `❌ LinkedIn authorization failed: ${chrome.runtime.lastError.message}`
        );

        return;
      }

      if (!redirectUrl) {
        notify(
          '❌ LinkedIn authorization cancelled'
        );

        return;
      }

      try {
        const url =
          new URL(redirectUrl);

        const error =
          url.searchParams.get('error');

        if (error) {
          const description =
            url.searchParams.get(
              'error_description'
            ) || error;

          throw new Error(
            `LinkedIn OAuth error: ${description}`
          );
        }

        const code =
          url.searchParams.get('code');

        if (!code) {
          throw new Error(
            'No authorization code received from LinkedIn.'
          );
        }

        console.log(
          '[GITLEET] Exchanging LinkedIn authorization code...'
        );

        const response =
          await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              code,
              redirectUri: REDIRECT_URI
            })
          });

        if (!response.ok) {
          const errorText =
            await response.text();

          console.error(
            '[GITLEET] Backend error:',
            response.status,
            errorText
          );

          throw new Error(
            `Backend error ${response.status}: ${errorText}`
          );
        }

        const {
          access_token,
          member_id
        } = await response.json();

        if (!access_token || !member_id) {
          throw new Error(
            'Backend did not return access_token and member_id.'
          );
        }

        // IMPORTANT:
        // Await storage so the credentials are definitely
        // saved before any LinkedIn post happens.
        await chrome.storage.sync.set({
          linkedinToken: access_token,
          linkedinMemberId: member_id,
          linkedinAuthTime: Date.now()
        });

        console.log(
          '[GITLEET] LinkedIn credentials saved.'
        );

        notify(
          '✅ LinkedIn authorized successfully!'
        );
      } catch (error) {
        console.error(
          '[GITLEET] Auth exchange error:',
          error
        );

        notify(
          `❌ LinkedIn authorization failed: ${error.message}`
        );
      }
    }
  );
}

// ============================================================
// RENDER CODE CARDS IN OFFSCREEN DOCUMENT
// ============================================================

async function renderLinkedInCards(
  code,
  language,
  title
) {
  const offscreenUrl =
    chrome.runtime.getURL(
      'offscreen.html'
    );

  let documentCreated = false;

  try {
    // --------------------------------------------------------
    // Check existing offscreen document
    // --------------------------------------------------------

    const contexts =
      await chrome.runtime.getContexts({
        contextTypes: [
          'OFFSCREEN_DOCUMENT'
        ],
        documentUrls: [
          offscreenUrl
        ]
      });

    // --------------------------------------------------------
    // Create renderer if necessary
    // --------------------------------------------------------

    if (contexts.length === 0) {
      console.log(
        '[GITLEET] Creating offscreen renderer...'
      );

      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['BLOBS'],
        justification:
          'Render LeetCode solution code cards for LinkedIn'
      });

      documentCreated = true;
    }

    // Give the offscreen page a moment to initialize.
    await new Promise(
      (resolve) => setTimeout(resolve, 100)
    );

    // --------------------------------------------------------
    // Ask offscreen page to render cards
    // --------------------------------------------------------

    const response =
      await chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'renderCards',
        code,
        language,
        title
      });

    if (!response?.ok) {
      throw new Error(
        response?.error ||
          'Code card rendering failed.'
      );
    }

    const images =
      response.images || [];

    console.log(
      '[GITLEET] Generated LinkedIn cards:',
      images.length
    );

    if (images.length === 0) {
      throw new Error(
        'Code card renderer returned zero images.'
      );
    }

    return images;
  } catch (error) {
    console.error(
      '[GITLEET] Code-card rendering failed:',
      error
    );

    // IMPORTANT:
    // Do NOT silently continue with a text-only post.
    throw error;
  } finally {
    // --------------------------------------------------------
    // Close offscreen renderer
    // --------------------------------------------------------

    if (documentCreated) {
      try {
        await chrome.offscreen.closeDocument();

        console.log(
          '[GITLEET] Offscreen renderer closed.'
        );
      } catch (error) {
        console.warn(
          '[GITLEET] Could not close offscreen document:',
          error
        );
      }
    }
  }
}

// ============================================================
// LINKEDIN POST WITH CODE IMAGE
// ============================================================

async function handlePostToLinkedInAPI(
  text,
  code,
  language,
  title
) {
  // ----------------------------------------------------------
  // GET LINKEDIN CREDENTIALS
  // ----------------------------------------------------------

  const {
    linkedinToken,
    linkedinMemberId
  } = await chrome.storage.sync.get([
    'linkedinToken',
    'linkedinMemberId'
  ]);

  if (
    !linkedinToken ||
    !linkedinMemberId
  ) {
    throw new Error(
      'LinkedIn is not authorized. Please authorize LinkedIn in settings.'
    );
  }

  console.log(
    '[GITLEET] LinkedIn token found:',
    true
  );

  console.log(
    '[GITLEET] LinkedIn member ID found:',
    true
  );

  // ----------------------------------------------------------
  // GENERATE CODE CARDS
  // ----------------------------------------------------------

  let images = [];

  if (code && code.trim()) {
    images =
      await renderLinkedInCards(
        code,
        language,
        title
      );
  }

  console.log(
    '[GITLEET] Images ready for LinkedIn:',
    images.length
  );

  if (images.length === 0) {
    throw new Error(
      'No code-card image was generated. LinkedIn post cancelled to prevent a text-only post.'
    );
  }

  // ----------------------------------------------------------
  // PUBLISH TEXT + IMAGES
  // ----------------------------------------------------------

  const result =
    await publishToLinkedIn({
      token: linkedinToken,
      memberId: linkedinMemberId,
      text,
      images,
      altText:
        `LeetCode solution - ${title}`
    });

  console.log(
    '[GITLEET] LinkedIn post published:',
    result?.url ||
      result?.urn ||
      result ||
      'success'
  );

  return result;
}