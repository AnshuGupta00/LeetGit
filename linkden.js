const linkedinStatusEl = document.getElementById('linkedinStatus');
let lastProblemLink = '';

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
    const runtimeBeatsPart = response.runtimeBeats ? ` — beats ${response.runtimeBeats}%` : '';
    lines.push(`⏱️ Runtime: ${response.runtime}${runtimeBeatsPart}`);
  }
  if (response.memory) {
    const memoryBeatsPart = response.memoryBeats ? ` — beats ${response.memoryBeats}%` : '';
    lines.push(`💾 Memory: ${response.memory}${memoryBeatsPart}`);
  }
  lines.push('', '[Add your approach or insights]', '');
  if (githubLink) lines.push(`Code: ${githubLink}`);
  lines.push(`Problem: ${lastProblemLink}`, '');
  lines.push(`#LeetCode #${(response.language || '').replace(/[^a-zA-Z0-9]/g, '')} #100DaysOfCode #DSA`);
  return lines.join('\n');
}

// ======== CODE SCREENSHOT CARD ========

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

// ======== GENERATE LINKEDIN POST ========

const shareLinkedinBtn = document.getElementById('shareLinkedin');
if (shareLinkedinBtn) {
  shareLinkedinBtn.addEventListener('click', async () => {
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
}

// ======== POST TO LINKEDIN ========

const postBtn = document.getElementById('postButton');
if (postBtn) {
  postBtn.addEventListener('click', async () => {
    const text = document.getElementById('linkedinText').value;
    linkedinStatusEl.textContent = '⏳ Posting to LinkedIn...';

    const { linkedinToken } = await chrome.storage.sync.get(['linkedinToken']);

    if (!linkedinToken) {
      linkedinStatusEl.textContent = '❌ LinkedIn token not saved. Go to Settings and paste your token.';
      return;
    }

    try {
      const meResponse = await fetch('https://api.linkedin.com/rest/me', {
        headers: { 'Authorization': `Bearer ${linkedinToken}` }
      });

      if (!meResponse.ok) {
        linkedinStatusEl.textContent = '❌ Invalid LinkedIn token.';
        return;
      }

      const meData = await meResponse.json();
      const memberId = meData.id;

      const postResponse = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${linkedinToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: `urn:li:person:${memberId}`,
          commentary: text,
          visibility: 'PUBLIC',
          distribution: { feedDistribution: 'MAIN_FEED' },
          lifecycleState: 'PUBLISHED'
        })
      });

      if (postResponse.ok) {
        linkedinStatusEl.textContent = '✅ Posted to LinkedIn!';
        document.getElementById('linkedinText').value = '';
        document.getElementById('postButton').style.display = 'none';
        document.getElementById('cardPreview').style.display = 'none';
        setTimeout(() => { linkedinStatusEl.textContent = ''; }, 2000);
      } else {
        const error = await postResponse.json();
        linkedinStatusEl.textContent = `❌ Error: ${error.message || 'Unknown error'}`;
      }
    } catch (e) {
      linkedinStatusEl.textContent = `❌ ${e.message}`;
    }
  });
}