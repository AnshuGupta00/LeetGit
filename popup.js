const statusEl = document.getElementById('status');
const linkedinStatusEl = document.getElementById('linkedinStatus');
let lastProblemLink = '';

// ========== GITHUB SETUP ==========

chrome.storage.sync.get(['token', 'repo'], (data) => {
  if (data.token) document.getElementById('token').value = data.token;
  if (data.repo) document.getElementById('repo').value = data.repo;
});

document.getElementById('saveSettings').addEventListener('click', () => {
  const token = document.getElementById('token').value;
  const repo = document.getElementById('repo').value;
  chrome.storage.sync.set({ token, repo }, () => {
    statusEl.textContent = 'Settings saved';
  });
});

// ========== GITHUB PUSH ==========

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
    console.warn('Monaco extraction failed:', e);
    return null;
  }
}

async function getLanguageFromMonaco(tabId) {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (!window.monaco?.editor) return null;
        const models = window.monaco.editor.getModels();
        if (!models.length) return null;
        return models[0].getLanguageId?.() || null;
      }
    });
    return result;
  } catch (e) {
    console.warn('Monaco language extraction failed:', e);
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
  const map = {
    python3: 'py', python: 'py', javascript: 'js', typescript: 'ts', java: 'java',
    cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', 'c#': 'cs', golang: 'go', go: 'go',
    ruby: 'rb', swift: 'swift', kotlin: 'kt', rust: 'rs', php: 'php', scala: 'scala',
    racket: 'rkt', erlang: 'erl', elixir: 'ex', dart: 'dart', c: 'c',
  };
  if (map[normalized]) return map[normalized];
  for (const key of Object.keys(map)) {
    if (normalized.includes(key)) return map[key];
  }
  return 'txt';
}

async function pushToGithub(token, repo, path, content, message) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  let sha = undefined;
  const existing = await fetch(url, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  if (existing.status === 200) {
    const data = await existing.json();
    sha = data.sha;
  }
  const response = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Add solution for ${message}`,
      content: encodedContent,
      sha
    })
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Github API error.');
  }
}

// ========== LINKEDIN FUNCTIONS ==========

function languageToExtensionLI(language) {
  const normalized = (language || '').toLowerCase().trim();
  if (normalized.includes('typescript')) return 'ts';
  if (normalized.includes('javascript')) return 'js';
  if (normalized.includes('java')) return 'java';
  if (normalized.includes('python')) return 'py';
  if (normalized.includes('c++')) return 'cpp';
  if (normalized.includes('c#')) return 'cs';
  if (normalized.includes('go')) return 'go';
  if (normalized.includes('ruby')) return 'rb';
  if (normalized.includes('swift')) return 'swift';
  if (normalized.includes('kotlin')) return 'kt';
  if (normalized.includes('rust')) return 'rs';
  if (normalized.includes('php')) return 'php';
  if (normalized.includes('scala')) return 'scala';
  if (normalized === 'c') return 'c';
  return 'txt';
}

function buildLinkedInPost(response, githubLink) {
  const numberPart = response.number ? `#${response.number} ` : '';
  const difficultyPart = response.difficulty ? ` (${response.difficulty})` : '';
  const lines = [
    `Just solved ${numberPart}${response.title}${difficultyPart} on LeetCode 💡`,
    ''
  ];
  if (response.runtime) {
    const runtimeBeatsPart = response.runtimeBeats ? ` — beats ${response.runtimeBeats}% of ${response.language} submissions` : '';
    lines.push(`⏱️ Runtime: ${response.runtime}${runtimeBeatsPart}`);
  }
  if (response.memory) {
    const memoryBeatsPart = response.memoryBeats ? ` — beats ${response.memoryBeats}% of ${response.language} submissions` : '';
    lines.push(`💾 Memory: ${response.memory}${memoryBeatsPart}`);
  }
  lines.push('', '[Add a line here about your approach or what you learned]', '');
  if (githubLink) lines.push(`Code: ${githubLink}`);
  lines.push(`Problem: ${lastProblemLink}`, '');
  lines.push(`#LeetCode #${(response.language || '').replace(/[^a-zA-Z0-9]/g, '')} #100DaysOfCode #DSA`);
  return lines.join('\n');
}

// ========== CODE SCREENSHOT ==========

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function getEditorScreenshotRect(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      if (!window.monaco?.editor) return null;
      const editors = window.monaco.editor.getEditors?.() || [];
      const editable = editors.filter(ed => !ed.getOption?.(window.monaco.editor.EditorOption.readOnly));
      let best = null, bestArea = 0;
      for (const ed of (editable.length ? editable : editors)) {
        const node = ed.getDomNode();
        if (!node) continue;
        const r = node.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > bestArea) { bestArea = area; best = { left: r.left, top: r.top, width: r.width, height: r.height }; }
      }
      if (!best) return null;
      return { ...best, dpr: window.devicePixelRatio || 1 };
    }
  });
  return result;
}

function cropToCanvas(dataUrl, rect) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const dpr = rect.dpr || 1;
      const sx = rect.left * dpr, sy = rect.top * dpr, sw = rect.width * dpr, sh = rect.height * dpr;
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function buildCodeCard(croppedCanvas, title) {
  const OUTER = 30, TITLEBAR = 56, INNER = 20;
  const codeW = croppedCanvas.width, codeH = croppedCanvas.height;
  const winW = codeW + INNER * 2;
  const winH = TITLEBAR + codeH + INNER;
  const W = winW + OUTER * 2, H = winH + OUTER * 2;
  const out = document.getElementById('cardCanvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1E3A5F');
  grad.addColorStop(1, '#0B1220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  roundRect(ctx, OUTER, OUTER, winW, winH, 16);
  ctx.fillStyle = '#161B22';
  ctx.fill();
  const dotY = OUTER + 28;
  ['#FF5F56', '#FFBD2E', '#27C93F'].forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(OUTER + 26 + i * 22, dotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  let titleFont = 18;
  ctx.font = `${titleFont}px Arial`;
  while (ctx.measureText(title).width > winW - 110 && titleFont > 11) {
    titleFont -= 1;
    ctx.font = `${titleFont}px Arial`;
  }
  ctx.fillStyle = '#C9D1D9';
  ctx.textAlign = 'center';
  ctx.fillText(title, OUTER + winW / 2, dotY + 6);
  ctx.textAlign = 'left';
  const codeX = OUTER + INNER, codeY = OUTER + TITLEBAR;
  ctx.save();
  roundRect(ctx, codeX, codeY, codeW, codeH, 8);
  ctx.clip();
  ctx.drawImage(croppedCanvas, codeX, codeY);
  ctx.restore();
  ctx.fillStyle = 'rgba(148,163,184,0.7)';
  ctx.font = '13px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('Solved via GITLEET', W - OUTER - 8, H - 10);
  ctx.textAlign = 'left';
  return out.toDataURL('image/png');
}

async function generateCodeCard(tab, title) {
  const rect = await getEditorScreenshotRect(tab.id);
  if (!rect) return null;
  const screenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const cropped = await cropToCanvas(screenshotUrl, rect);
  return buildCodeCard(cropped, title);
}

// ========== LINKEDIN POST GENERATION & POSTING ==========

document.getElementById('shareLinkedin').addEventListener('click', async () => {
  linkedinStatusEl.textContent = '';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('leetcode.com/problems/')) {
    linkedinStatusEl.textContent = 'Open a LeetCode problem tab first';
    return;
  }
  const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSolution' }).catch(() => null);
  if (!response) {
    linkedinStatusEl.textContent = 'Could not read the page — refresh and try again';
    return;
  }
  const { repo } = await chrome.storage.sync.get(['repo']);
  const ext = languageToExtensionLI(response.language);
  const paddedNumber = response.number ? response.number.padStart(4, '0') : null;
  const githubPath = paddedNumber
    ? `${paddedNumber}-${response.slug}/${response.slug}.${ext}`
    : `${response.slug}/${response.slug}.${ext}`;
  const githubLink = repo ? `https://github.com/${repo}/blob/main/${githubPath}` : '';
  lastProblemLink = `https://leetcode.com/problems/${response.slug}/`;
  document.getElementById('linkedinText').value = buildLinkedInPost(response, githubLink);
  document.getElementById('linkedinText').style.display = 'block';
  document.getElementById('postButton').style.display = 'block';
  try {
    const dataUrl = await generateCodeCard(tab, response.title);
    if (dataUrl) {
      document.getElementById('cardPreview').src = dataUrl;
      document.getElementById('cardPreview').style.display = 'block';
      document.getElementById('downloadImage').href = dataUrl;
      document.getElementById('downloadImage').style.display = 'block';
    }
  } catch (e) {
    console.warn('Card generation failed:', e);
  }
  linkedinStatusEl.textContent = response.runtime ? '' : 'No runtime found — generate right after a successful Submit';
});

document.getElementById('postButton').addEventListener('click', async () => {
  const text = document.getElementById('linkedinText').value;
  const canvas = document.getElementById('cardCanvas');
  linkedinStatusEl.textContent = '⏳ Posting to LinkedIn...';
  const { linkedinToken, linkedinMemberId } = await chrome.storage.sync.get(['linkedinToken', 'linkedinMemberId']);
  if (!linkedinToken || !linkedinMemberId) {
    linkedinStatusEl.textContent = '❌ LinkedIn token not saved. Go to Settings and paste your token.';
    return;
  }
  try {
    const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!imageBlob) {
      linkedinStatusEl.textContent = '❌ Could not generate image';
      return;
    }
    linkedinStatusEl.textContent = '⏳ Uploading code image...';
    const assetResponse = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinToken}`,
        'LinkedIn-Version': '202608',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${linkedinMemberId}`
        }
      })
    });
    if (!assetResponse.ok) {
      const error = await assetResponse.json();
      linkedinStatusEl.textContent = `❌ Image registration failed: ${error.message}`;
      return;
    }
    const assetData = await assetResponse.json();
    const imageAssetUrn = assetData.value.image;
    const uploadUrl = assetData.value.uploadMechanism['com.linkedin.digitalmedia_mediaUploadHttpRequest'].uploadUrl;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: imageBlob
    });
    if (!uploadResponse.ok) {
      linkedinStatusEl.textContent = '❌ Image upload failed';
      return;
    }
    linkedinStatusEl.textContent = '⏳ Creating post...';
    const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
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
        content: {
          media: {
            id: imageAssetUrn
          }
        },
        lifecycleState: 'PUBLISHED'
      })
    });
    if (postResponse.ok) {
      linkedinStatusEl.textContent = '✅ Posted to LinkedIn with code image!';
      document.getElementById('linkedinText').value = '';
      document.getElementById('postButton').style.display = 'none';
      document.getElementById('cardPreview').style.display = 'none';
      setTimeout(() => { linkedinStatusEl.textContent = ''; }, 3000);
    } else {
      const error = await postResponse.json();
      linkedinStatusEl.textContent = `❌ Post failed: ${error.message || 'Unknown error'}`;
    }
  } catch (e) {
    console.error('LinkedIn posting error:', e);
    linkedinStatusEl.textContent = `❌ Error: ${e.message}`;
  }
});