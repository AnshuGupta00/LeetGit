const statusEl = document.getElementById('status');

chrome.storage.sync.get(['token', 'repo', 'linkedinMemberId'], (data) => {
  if (data.token) document.getElementById('token').value = data.token;
  if (data.repo) document.getElementById('repo').value = data.repo;
  if (data.linkedinMemberId) {
    document.getElementById('linkedinStatus').textContent = '✅ LinkedIn authorized';
  }
});

document.getElementById('saveSettings').addEventListener('click', () => {
  const token = document.getElementById('token').value;
  const repo = document.getElementById('repo').value;

  chrome.storage.sync.set({ token, repo }, () => {
    statusEl.textContent = 'Settings saved';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
  });
});

// ---- LinkedIn Authorization ----
document.getElementById('authLinkedin').addEventListener('click', () => {
  document.getElementById('linkedinStatus').textContent = '⏳ Opening LinkedIn authorization...';
  chrome.runtime.sendMessage({ action: 'authorizeLinkedin' });
});

document.getElementById('clearLinkedin').addEventListener('click', () => {
  chrome.storage.sync.remove(['linkedinToken', 'linkedinMemberId'], () => {
    document.getElementById('linkedinStatus').textContent = '❌ LinkedIn authorization cleared';
    setTimeout(() => { document.getElementById('linkedinStatus').textContent = ''; }, 2000);
  });
});

// fOR debugging, you can use this function to extract code from Monaco editor if needed
async function getCodeFromMonaco(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (!window.monaco?.editor) return null;

        const editors = window.monaco.editor.getEditors?.() || [];
        const candidates = editors
          .filter(ed => !ed.getOption?.(window.monaco.editor.EditorOption.readOnly))
          .map(ed => ed.getModel()?.getValue() || '')
          .filter(v => v.trim().length > 0);

        if (candidates.length > 0) {
          return candidates.reduce((longest, v) => v.length > longest.length ? v : longest, '');
        }

        const models = window.monaco.editor.getModels();
        return models[0]?.getValue() || null;
      }
    });
    return result;
  } catch (e) {
    console.warn('Monaco extraction failed, falling back to DOM scrape:', e);
    return null;
  }
}

// Get the actual language ID Monaco is using internally — far more reliable
// than scraping the language-selector button text off the page, since that
// text/DOM structure changes whenever LeetCode ships a redesign.
async function getLanguageFromMonaco(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (!window.monaco?.editor) return null;
        const models = window.monaco.editor.getModels();
        if (!models.length) return null;
        // languageId comes straight from Monaco, e.g. "python", "cpp", "java"
        return models[0].getLanguageId?.() || null;
      }
    });
    return result;
  } catch (e) {
    console.warn('Monaco language extraction failed, falling back to DOM scrape:', e);
    return null;
  }
}

document.getElementById('push').addEventListener('click', async () => {
  statusEl.textContent = 'pushing...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('leetcode.com/problems/')) {
      statusEl.textContent = 'Open a LeetCode problem tab, then try again';
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSolution' });
    const fullCode = (await getCodeFromMonaco(tab.id)) || response?.code;

    if (!fullCode) {
      statusEl.textContent = 'No code found on this page';
      return;
    }

    const { token, repo } = await chrome.storage.sync.get(['token', 'repo']);
    if (!token || !repo) {
      statusEl.textContent = 'Please save your token and repo settings first';
      return;
    }

    // Prefer the language Monaco itself reports; fall back to the
    // DOM-scraped language from content.js only if Monaco isn't reachable.
    const monacoLang = await getLanguageFromMonaco(tab.id);
    const languageForExt = monacoLang || response.language;

    const ext = languageToExtension(languageForExt);
    const paddedNumber = response.number ? response.number.padStart(4, '0') : null;
    const path = paddedNumber
      ? `${paddedNumber}-${response.slug}/${response.slug}.${ext}`
      : `${response.slug}/${response.slug}.${ext}`;
    const commitTitle = response.number
      ? `${response.number}. ${response.title}`
      : response.title;

    statusEl.textContent = 'Pushing to GitHub...';
    await pushToGithub(token, repo, path, fullCode, commitTitle);
    statusEl.textContent = 'Pushed to GitHub Successfully';

  } catch (err) {
    console.error('Push failed:', err);
    statusEl.textContent = err.message?.includes('Receiving end does not exist')
      ? 'Refresh the LeetCode tab and try again'
      : `Error: ${err.message}`;
  }
});

function languageToExtension(language) {
  const normalized = (language || '').toLowerCase().trim();

  // Covers both Monaco languageId values (e.g. "python", "cpp") and
  // LeetCode's display text (e.g. "Python3", "C++") as a fallback.
  const map = {
    python3: 'py',
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    csharp: 'cs',
    'c#': 'cs',
    golang: 'go',
    go: 'go',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    rust: 'rs',
    php: 'php',
    scala: 'scala',
    racket: 'rkt',
    erlang: 'erl',
    elixir: 'ex',
    dart: 'dart',
    c: 'c',
  };

  if (map[normalized]) return map[normalized];

  // Substring fallback in case of unexpected formatting (e.g. "C++20")
  for (const key of Object.keys(map)) {
    if (normalized.includes(key)) return map[key];
  }

  return 'txt';
}

async function pushToGithub(token, repo, path, content, message) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const encodedContent = btoa(unescape(encodeURIComponent(content)));

  // Check if the file already exists to get its SHA
  let sha = undefined;
  const existing = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (existing.status === 200) {
    const data = await existing.json();
    sha = data.sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Add solution for ${message}`,
      content: encodedContent,
      sha
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    const neededPerm = response.headers.get('x-accepted-github-permissions');
    const detail = neededPerm ? ` (token needs: ${neededPerm})` : '';
    throw new Error((errorData.message || 'Github API error.') + detail);
  }
}