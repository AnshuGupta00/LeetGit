function getProblem() {
  const titleEl = document.querySelector('[data-cy="question-title"]')
    || document.querySelector('.text-title-large')
    || document.querySelector('a[href*="/problems/"]');
  const rawTitle = titleEl ? titleEl.textContent.trim() : document.title;

  const match = rawTitle.match(/^(\d+)\.\s*(.+)/);
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
  const match = document.body.innerText.match(/\b(Easy|Medium|Hard)\b/);
  return match ? match[1] : null;
}

function  getSubmissionStats() {
  const bodyText = document.body.innerText;
  const runtimeMatch = bodyText.match(/Runtime\s+([\d.]+\s?ms)/i);
  const memoryMatch = bodyText.match(/Memory\s+([\d.]+\s?MB)/i);
  const beatsMatches = [...bodyText.matchAll(/[Bb]eats\s+([\d.]+)%/g)];

return{
  runtime:runtimeMatch ?runtimeMatch[1]:null,
  memory : memoryMatch ? memoryMatch[1]:null,
  runtimeBeats: beatsMatches[0] ? beatsMatches[0][1]: null,
  memoryBeats: beatsMatches[1] ? beatsMatches[1][1]: null
};
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getSolution') {
    sendResponse({
      ...getProblem(),
      code: getCode(),
      language: detectLanguage(),
      difficulty: getDifficulty(),
      ...getSubmissionStats()
    });
  }
  return true;
});