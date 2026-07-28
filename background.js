chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'postToLinkedIn') {
    handlePostToLinkedIn(msg.text);
  }
  return false;
});

function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;
    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === 'complete' && !done) {
        done = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      if (!done) {
        done = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }, timeoutMs);
  });
}

async function handlePostToLinkedIn(text) {
  const newTab = await chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
  await waitForTabComplete(newTab.id);
  await new Promise(r => setTimeout(r, 1500));

  await chrome.scripting.executeScript({
    target: { tabId: newTab.id },
    func: (postText) => {
      function clickStartPost() {
        const allEls = Array.from(document.querySelectorAll('*'));
        const match = allEls.find(el => {
          if (el.children.length > 0) return false;
          if (!/start a post/i.test(el.textContent || '')) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        if (match) { match.click(); return true; }
        return false;
      }
      function insertWhenReady(attempt) {
        const box = document.querySelector('div[role="textbox"][contenteditable="true"]')
          || document.querySelector('[data-placeholder][contenteditable="true"]')
          || document.querySelector('div[contenteditable="true"]');
        if (box) {
          box.focus();
          document.execCommand('insertText', false, postText);
          return;
        }
        if (attempt < 20) setTimeout(() => insertWhenReady(attempt + 1), 500);
      }
      const started = clickStartPost();
      setTimeout(() => insertWhenReady(0), started ? 1200 : 0);
    },
    args: [text]
  });
} 