// ============================================================
// GITLEET - PAGE SCRAPER + BRIDGE
// ============================================================
// Runs in the default ISOLATED world. Two jobs:
//   1. answer `getSolution` for the popup / share page
//   2. relay Accepted verdicts from inject.js (MAIN world) to
//      the service worker, which cannot receive postMessage
// ============================================================

function getProblem() {
  const titleEl = document.querySelector('[data-cy="question-title"]')
    || document.querySelector('.text-title-large')
    || document.querySelector('a[href*="/problems/"]');
  const rawTitle = titleEl ? titleEl.textContent.trim() : document.title;

 const match = rawTitle.match(/^(\d+)\.\s*(.+?)(?:\s*-\s*LeetCode)?$/i);
  const number = match ? match[1] : null;
  const title = match ? match[2] : rawTitle.replace(/\s*-\s*LeetCode$/, '');

  const slug = window.location.pathname.split('/problems/')[1]?.split('/')[0] || 'unknown';

  return { title, slug, number };
}

function getCode() {
  const lines = document.querySelectorAll('.view-line');
  if (lines.length === 0) return null;
  return Array.from(lines).map(l => l.textContent).join('\n');
}

function detectLanguage() {
  const langBtn = document.querySelector('[id^="headlessui-listbox-button"]') ||
    document.querySelector('.rounded.item-center.whitespace-nowrap');
  return langBtn ? langBtn.textContent.trim() : 'txt';
}

function getDifficulty() {
  const el = document.querySelector('[class*="text-difficulty"]');
  if (el) {
    const text = el.textContent.trim();
    if (/^(Easy|Medium|Hard)$/.test(text)) return text;
  }
  // Fall back to a body scan. Loose, but the targeted selector above
  // depends on Tailwind class names that LeetCode churns often.
  const match = document.body.innerText.match(/\b(Easy|Medium|Hard)\b/);
  return match ? match[1] : null;
}

// Topic tags feed both the caption hashtags and the approach line.
// They sit behind a collapsed "Topics" section, but the anchors are
// in the DOM either way.
function getTopics() {
  const anchors = document.querySelectorAll('a[href^="/tag/"]');
  const topics = [];
  const seen = new Set();

  for (const a of anchors) {
    const name = a.textContent.trim();
    if (!name || name.length > 40) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(name);
  }

  return topics.slice(0, 6);
}

function getSubmissionStats() {
  const bodyText = document.body.innerText;
  const runtimeMatch = bodyText.match(/Runtime\s+([\d.]+\s?ms)/i);
  const memoryMatch = bodyText.match(/Memory\s+([\d.]+\s?MB)/i);
  const beatsMatches = [...bodyText.matchAll(/[Bb]eats\s+([\d.]+)%/g)];

  return {
    runtime: runtimeMatch ? runtimeMatch[1] : null,
    memory: memoryMatch ? memoryMatch[1] : null,
    runtimeBeats: beatsMatches[0] ? beatsMatches[0][1] : null,
    memoryBeats: beatsMatches[1] ? beatsMatches[1][1] : null
  };
}

function collectSolution() {
  return {
    ...getProblem(),
    code: getCode(),
    language: detectLanguage(),
    difficulty: getDifficulty(),
    topics: getTopics(),
    ...getSubmissionStats()
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getSolution') {
    sendResponse(collectSolution());
  }
  return true;
});

// ------------------------------------------------------------
// Bridge: inject.js -> service worker
// ------------------------------------------------------------

window.addEventListener('message', async event => {
  if (event.source !== window) return;

  const data = event.data;
  if (!data || data.__gitleet !== true || data.type !== 'ACCEPTED') return;

  const verdict = data.verdict || {};

  // The /check/ response carries the stats directly, so that path needs
  // no waiting. The DOM fallback has none, and LeetCode paints the
  // runtime/memory numbers a beat after the verdict text — so give the
  // page a moment before scraping, or they come back null.
  if (verdict.__fromDom) {
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  // Prefer the response over the DOM regexes wherever both exist.
  const scraped = collectSolution();

  const stats = {
    runtime: verdict.status_runtime || scraped.runtime,
    memory: verdict.status_memory || scraped.memory,
    runtimeBeats: verdict.runtime_percentile != null
      ? Number(verdict.runtime_percentile).toFixed(2).replace(/\.?0+$/, '')
      : scraped.runtimeBeats,
    memoryBeats: verdict.memory_percentile != null
      ? Number(verdict.memory_percentile).toFixed(2).replace(/\.?0+$/, '')
      : scraped.memoryBeats
  };

  chrome.runtime.sendMessage({
    action: 'solutionAccepted',
    source: data.source,
    solution: {
      ...scraped,
      ...stats,
      language: verdict.pretty_lang || verdict.lang || scraped.language,
      submissionId: verdict.submission_id || null,
      problemUrl: `https://leetcode.com/problems/${scraped.slug}/`
    }
  }).catch(() => {
    // Service worker asleep mid-handshake; the next verdict wakes it.
    // Nothing useful to do here.
  });
});

console.log('[GITLEET] content bridge ready');
