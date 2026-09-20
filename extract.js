// ============================================================
// GITLEET - SHARED EXTRACTION + GITHUB LAYER
// ============================================================
// DOM-free on purpose. Loaded by:
//   - background.js  via importScripts()  (MV3 service worker)
//   - popup.html / share.html  via <script>
// Nothing in here may touch `document` or `window`, or the
// service worker will throw on import.
// ============================================================


// ============================================================
// EXECUTE SCRIPT IN LEETCODE PAGE
// ============================================================

async function executeInPage(tabId, func) {

  try {

    const results =
      await chrome.scripting.executeScript({

        target: {
          tabId
        },

        world: 'MAIN',

        func

      });


    return (
      results &&
      results[0]
        ? results[0].result
        : null
    );

  } catch (error) {

    console.error(
      'executeScript error:',
      error
    );

    return null;
  }
}


// ============================================================
// GET LANGUAGE + COMPLETE CODE FROM MONACO
// ============================================================

async function getMonacoData(tabId) {

  const result =
    await executeInPage(
      tabId,
      () => {

        try {

          if (
            !window.monaco ||
            !window.monaco.editor
          ) {

            return null;
          }


          let editors = [];


          // --------------------------------------------------
          // Get editors
          // --------------------------------------------------

          try {

            if (
              typeof window.monaco.editor.getEditors ===
              'function'
            ) {

              editors =
                window.monaco.editor.getEditors();
            }

          } catch (error) {

            console.warn(
              'Could not get editors:',
              error
            );
          }


          const candidates = [];


          // --------------------------------------------------
          // Read editor models
          // --------------------------------------------------

          for (
            const editor of editors
          ) {

            try {

              const model =
                editor.getModel?.();


              if (!model) {
                continue;
              }


              const code =
                model.getValue();


              if (
                typeof code === 'string' &&
                code.trim().length > 0
              ) {

                candidates.push({

                  code,

                  language:
                    model.getLanguageId?.() ||
                    'plaintext'

                });
              }

            } catch (error) {

              console.warn(
                'Editor model failed:',
                error
              );
            }
          }


          // --------------------------------------------------
          // Monaco models fallback
          // --------------------------------------------------

          if (
            candidates.length === 0 &&
            typeof window.monaco.editor.getModels ===
              'function'
          ) {

            try {

              const models =
                window.monaco.editor.getModels();


              for (
                const model of models
              ) {

                try {

                  const code =
                    model.getValue();


                  if (
                    typeof code === 'string' &&
                    code.trim().length > 0
                  ) {

                    candidates.push({

                      code,

                      language:
                        model.getLanguageId?.() ||
                        'plaintext'

                    });
                  }

                } catch (error) {

                  console.warn(
                    'Model read failed:',
                    error
                  );
                }
              }

            } catch (error) {

              console.warn(
                'getModels failed:',
                error
              );
            }
          }


          if (
            candidates.length === 0
          ) {

            return null;
          }


          // --------------------------------------------------
          // Choose longest code
          // --------------------------------------------------

          const best =
            candidates.reduce(
              (
                longest,
                current
              ) => {

                return current.code.length >
                  longest.code.length
                  ? current
                  : longest;

              },
              {
                code: '',
                language: 'plaintext'
              }
            );


          return {

            code: best.code,

            language:
              best.language || 'plaintext'

          };

        } catch (error) {

          console.error(
            'Monaco extraction failed:',
            error
          );

          return null;
        }
      }
    );


  return result;
}


// ============================================================
// MONACO DOM FALLBACK
// ============================================================

async function getMonacoDOMData(tabId) {

  const result =
    await executeInPage(
      tabId,
      () => {

        try {

          const lines =
            document.querySelectorAll(
              '.view-lines .view-line'
            );


          if (
            lines.length === 0
          ) {

            return null;
          }


          const code =
            Array.from(lines)
              .map(
                line =>
                  (
                    line.innerText ||
                    line.textContent ||
                    ''
                  ).replace(
                    /\u00a0/g,
                    ' '
                  )
              )
              .join('\n');


          if (
            !code.trim()
          ) {

            return null;
          }


          // Try to determine language
          let language =
            'plaintext';


          const languageElement =
            document.querySelector(
              '[data-mode-id]'
            );


          if (
            languageElement
          ) {

            language =
              languageElement
                .getAttribute(
                  'data-mode-id'
                ) ||
              'plaintext';
          }


          return {

            code,

            language

          };

        } catch (error) {

          console.error(
            'DOM extraction failed:',
            error
          );

          return null;
        }
      }
    );


  return result;
}


// ============================================================
// GENERIC EDITOR FALLBACK
// ============================================================

async function getEditorFallback(tabId) {

  const result =
    await executeInPage(
      tabId,
      () => {

        try {

          const textareas =
            Array.from(
              document.querySelectorAll(
                'textarea'
              )
            );


          const values =
            textareas
              .map(
                el =>
                  el.value || ''
              )
              .filter(
                value =>
                  value.trim().length > 0
              );


          if (
            values.length > 0
          ) {

            const code =
              values.reduce(
                (
                  longest,
                  current
                ) =>
                  current.length >
                  longest.length
                    ? current
                    : longest,
                ''
              );


            return {

              code,

              language:
                'plaintext'

            };
          }


          return null;

        } catch (error) {

          console.error(
            'Fallback failed:',
            error
          );

          return null;
        }
      }
    );


  return result;
}


// ============================================================
// NORMALIZE LANGUAGE
// ============================================================

function normalizeLanguage(language) {

  if (
    !language
  ) {

    return 'plaintext';
  }


  const lang =
    language
      .toLowerCase()
      .trim();


  const aliases = {

    'java': 'java',

    'cpp': 'cpp',

    'c++': 'cpp',

    'c-plus-plus': 'cpp',

    'c': 'c',

    'python': 'python',

    'python3': 'python',

    'py': 'python',

    'javascript': 'javascript',

    'js': 'javascript',

    'typescript': 'typescript',

    'ts': 'typescript',

    'golang': 'go',

    'go': 'go',

    'rust': 'rust',

    'rustlang': 'rust',

    'kotlin': 'kotlin',

    'swift': 'swift',

    'csharp': 'csharp',

    'c#': 'csharp',

    'plaintext': 'plaintext',

    'text': 'plaintext'

  };


  return (
    aliases[lang] ||
    lang
  );
}


// ============================================================
// GET COMPLETE CODE + LANGUAGE
// ============================================================

async function getFullCodeFromMonaco(tabId) {

  console.log(
    'GITLEET: Getting complete Monaco code...'
  );


  // ----------------------------------------------------------
  // 1. Monaco API
  // ----------------------------------------------------------

  let data =
    await getMonacoData(
      tabId
    );


  if (
    data &&
    data.code
  ) {

    data.code =
      normalizeCode(
        data.code
      );


    data.language =
      normalizeLanguage(
        data.language
      );


    console.log(
      'Code source: Monaco API'
    );


    console.log(
      'Language:',
      data.language
    );


    console.log(
      'Lines:',
      data.code.split('\n').length
    );


    return data;
  }


  // ----------------------------------------------------------
  // 2. Monaco DOM
  // ----------------------------------------------------------

  data =
    await getMonacoDOMData(
      tabId
    );


  if (
    data &&
    data.code
  ) {

    data.code =
      normalizeCode(
        data.code
      );


    data.language =
      normalizeLanguage(
        data.language
      );


    console.log(
      'Code source: Monaco DOM'
    );


    console.log(
      'Language:',
      data.language
    );


    return data;
  }


  // ----------------------------------------------------------
  // 3. Generic fallback
  // ----------------------------------------------------------

  data =
    await getEditorFallback(
      tabId
    );


  if (
    data &&
    data.code
  ) {

    data.code =
      normalizeCode(
        data.code
      );


    data.language =
      normalizeLanguage(
        data.language
      );


    console.log(
      'Code source: editor fallback'
    );


    return data;
  }


  console.error(
    'GITLEET: Complete code not found.'
  );


  return null;
}


// ============================================================
// NORMALIZE CODE
// ============================================================

function normalizeCode(code) {

  if (
    typeof code !== 'string'
  ) {

    return '';
  }


  return code
    .replace(
      /\r\n/g,
      '\n'
    )
    .replace(
      /\r/g,
      '\n'
    )
    .replace(
      /[\u200B-\u200D\uFEFF]/g,
      ''
    );
}

// ============================================================
// LANGUAGE -> FILE EXTENSION
// ============================================================

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


// ============================================================
// SOLUTION PATH  (0001-two-sum/two-sum.py)
// ============================================================

function buildSolutionPath(slug, number, language) {
  const ext = languageToExtension(language);
  const paddedNumber = number ? String(number).padStart(4, '0') : null;
  return paddedNumber
    ? `${paddedNumber}-${slug}/${slug}.${ext}`
    : `${slug}/${slug}.${ext}`;
}


// ============================================================
// PUSH TO GITHUB  (create or update)
// ============================================================

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
  return { path, updated: Boolean(sha) };
}
