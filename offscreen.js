// ============================================================
// GITLEET - OFFSCREEN RENDER HOST
// ============================================================
// Bridges the service worker to the canvas engine in card.js.
// Only answers messages addressed to `target: 'offscreen'`, so
// it never swallows traffic meant for background.js.
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;

  if (msg.action === 'renderCards') {
    renderCards(msg.code, msg.language, msg.title)
      .then(images => sendResponse({ ok: true, images }))
      .catch(error => {
        console.error('[GITLEET] card render failed:', error);
        sendResponse({ ok: false, error: error.message });
      });

    // Keep the channel open for the async render.
    return true;
  }

  return false;
});

console.log('[GITLEET] offscreen renderer ready');
