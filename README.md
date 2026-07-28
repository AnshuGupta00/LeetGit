# LeetGit — Auto-push LeetCode solutions to GitHub

Detects when you get an "Accepted" verdict on LeetCode, grabs your code, and
pushes it straight to a GitHub repo — organized as `Difficulty/language/slug.ext`.

## How it works

- A script injected into LeetCode's page hooks `fetch()` to watch for the
  submission-check response that says `state: SUCCESS` and `status_msg: Accepted`.
- Once that fires, the content script scrapes the problem title, difficulty,
  language, and the code currently in the editor.
- That data goes to the background service worker, which uses GitHub's
  Contents API to create or update the file in your repo.

## 1. Create a GitHub Personal Access Token

You need a **fine-grained token** (recommended) or a classic token with `repo` scope.

**Fine-grained (recommended):**
1. Go to https://github.com/settings/personal-access-tokens/new
2. Under "Repository access," select "Only select repositories" and choose your
   solutions repo (create an empty one first if you don't have one).
3. Under "Permissions" → "Repository permissions," set **Contents** to
   **Read and write**.
4. Generate the token and copy it — you won't see it again.

**Classic (simpler, broader access):**
1. Go to https://github.com/settings/tokens/new
2. Check the `repo` scope.
3. Generate and copy the token.

The popup has a "How do I create one?" link that opens the classic-token page
pre-filled with the `repo` scope for convenience.

## 2. Load the extension

### Chrome / Edge / Brave (Chromium)
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this folder
4. Pin the LeetGit icon to your toolbar if you want quick access

### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…"
3. Select the `manifest.json` file inside this folder

Note: Firefox's "Load Temporary Add-on" unloads the extension when you close
the browser. For a persistent Firefox install, you'd need to sign the
extension through Mozilla's Add-on Developer Hub (`addons.mozilla.org`) — fine
to skip for personal use, but worth knowing before you rely on it daily.

## 3. Configure

1. Click the LeetGit icon in your toolbar
2. Paste your GitHub token
3. Enter your GitHub username (or org) and the repo name (must already exist
   on GitHub — the extension writes files into it but doesn't create repos)
4. Click "Test Connection" to confirm it can reach the repo
5. Click "Save Settings"

## 4. Solve problems as usual

Submit any problem on LeetCode. Once it's Accepted, LeetGit pushes it
automatically and shows a browser notification. Check "Recent Pushes" in the
popup to see history.

## Repo structure produced

```
your-repo/
├── Easy/
│   ├── python3/
│   │   └── two-sum.py
│   └── javascript/
│       └── valid-parentheses.js
├── Medium/
│   └── java/
│       └── add-two-numbers.java
└── Hard/
    └── cpp/
        └── median-of-two-sorted-arrays.cpp
```

Each file includes a header comment with the problem title, difficulty,
runtime/memory stats (if LeetCode reported them), and a link back to the
problem.

## Known limitations

- **Code scraping reads the rendered editor DOM** (Monaco), not an internal
  API, since LeetCode doesn't expose your source through the submission-check
  response. This is generally reliable but can occasionally miss a line if
  the editor is mid-render — if a push looks truncated, it's worth a quick
  diff against what's in the editor.
- **LeetCode's DOM structure changes** occasionally (class names especially),
  which can break the title/difficulty/language selectors in `content.js`.
  If pushes stop including a difficulty or language, that's usually why —
  open the LeetCode page's dev console and check for `[LeetGit]` warnings.
- **Only the currently selected language** for a submission gets pushed. If
  you resubmit the same problem in a different language, it lands in a
  separate folder rather than replacing the previous one.
- **Firefox temporary add-ons** don't persist across browser restarts (see
  above) — this only matters if you close Firefox often.

## Permissions used

- `storage` — save your token/repo settings and push history locally
- `notifications` — show a confirmation when a push succeeds
- `host_permissions` for `leetcode.com` and `api.github.com` — read the page
  and call GitHub's API

Your token is stored in `chrome.storage.sync` (synced across your signed-in
browser instances, encrypted at rest by the browser) and is never sent
anywhere except `api.github.com`.
