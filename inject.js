// ============================================================
// GITLEET - ACCEPTED VERDICT DETECTOR
// ============================================================
// Runs in the MAIN world at document_start so it can patch
// fetch/XHR before LeetCode's app captures its own references.
// A content script in the default ISOLATED world cannot see the
// page's network calls at all, which is why this file exists
// separately from content.js.
//
// It only observes. It never blocks or alters a request.
// ============================================================

(() => {
  'use strict';

  if (window.__gitleetHooked) return;
  window.__gitleetHooked = true;

  const CHECK_URL = /\/submissions\/detail\/(\d+)\/check\/?/;

  // LeetCode polls the check endpoint every ~400ms while judging,
  // so the same submission id reports SUCCESS more than once.
  const announced = new Set();

  function announce(payload, source) {
    const id = payload.submission_id || payload.task_name || JSON.stringify(payload).slice(0, 64);
    if (announced.has(id)) return;
    announced.add(id);

    window.postMessage({
      __gitleet: true,
      type: 'ACCEPTED',
      source,
      verdict: payload
    }, '*');
  }

  function isAccepted(data) {
    return Boolean(
      data &&
      typeof data === 'object' &&
      data.state === 'SUCCESS' &&
      data.status_msg === 'Accepted'
    );
  }

  // ----------------------------------------------------------
  // fetch()
  // ----------------------------------------------------------

  const nativeFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await nativeFetch.apply(this, args);

    try {
      const url =
        typeof args[0] === 'string'
          ? args[0]
          : (args[0] && args[0].url) || response.url || '';

      if (CHECK_URL.test(url)) {
        // clone() so the page still gets to read the body
        response
          .clone()
          .json()
          .then(data => {
            if (isAccepted(data)) announce(data, 'fetch');
          })
          .catch(() => {});
      }
    } catch (_) {
      // never let observation break the page's request
    }

    return response;
  };

  // ----------------------------------------------------------
  // XMLHttpRequest  (older LeetCode paths still use it)
  // ----------------------------------------------------------

  const nativeOpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      if (CHECK_URL.test(String(url))) {
        this.addEventListener('load', () => {
          try {
            const data = JSON.parse(this.responseText);
            if (isAccepted(data)) announce(data, 'xhr');
          } catch (_) {}
        });
      }
    } catch (_) {}

    return nativeOpen.call(this, method, url, ...rest);
  };

  // ----------------------------------------------------------
  // DOM fallback
  // ----------------------------------------------------------
  // If LeetCode moves off the /check/ endpoint the hooks above go
  // quiet, and the extension would silently stop working. Watching
  // for the rendered verdict node is less precise but keeps things
  // alive. It carries no stats, so background.js falls back to
  // scraping those from the DOM.

  let domTimer = null;

  const observer = new MutationObserver(() => {
    if (domTimer) return;

    domTimer = setTimeout(() => {
      domTimer = null;

      const node = document.querySelector('[data-e2e-locator="submission-result"]');
      if (!node) return;
      if (node.textContent.trim() !== 'Accepted') return;

      // Key off the URL so a single verdict is not announced twice.
      announce(
        {
          state: 'SUCCESS',
          status_msg: 'Accepted',
          submission_id: 'dom:' + location.pathname,
          __fromDom: true
        },
        'dom'
      );
    }, 600);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  console.log('[GITLEET] verdict detector armed');
})();
