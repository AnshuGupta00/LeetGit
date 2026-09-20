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

// ---- code screenshot card ----
// ============================================================
// GITLEET - FULL CODE IMAGE GENERATOR
// LANGUAGE-SPECIFIC SYNTAX HIGHLIGHTING
// ============================================================
// ============================================================
// CONFIGURATION
// ============================================================

const CODE_IMAGE_CONFIG = {

  fontSize: 16,

  lineHeight: 24,

  paddingX: 30,

  paddingY: 30,

  lineNumberWidth: 60,

  minWidth: 700,

  maxCanvasHeight: 30000,

  maxCanvasWidth: 16000,

  background: '#0D1117',

  defaultText: '#E6EDF3',

  lineNumberColor: '#6E7681',

  keywordColor: '#FF7B72',

  typeColor: '#79C0FF',

  stringColor: '#A5D6FF',
  numberColor: '#79C0FF',
  commentColor: '#8B949E',
  functionColor: '#D2A8FF',
  booleanColor: '#FF7B72',
  operatorColor: '#FF7B72',
  punctuationColor: '#C9D1D9'

};


// ============================================================
// ROUND RECTANGLE
// ============================================================

function roundRect(ctx, x, y, w, h, r) {

  const radius = Math.min(
    r,
    w / 2,
    h / 2
  );

  ctx.beginPath();

  ctx.moveTo(
    x + radius,
    y
  );

  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    radius
  );

  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    radius
  );

  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    radius
  );

  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    radius
  );

  ctx.closePath();
}


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
// LANGUAGE KEYWORDS
// ============================================================

const LANGUAGE_KEYWORDS = {

  java: new Set([

    'abstract',
    'assert',
    'boolean',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'default',
    'do',
    'double',
    'else',
    'enum',
    'extends',
    'final',
    'finally',
    'float',
    'for',
    'goto',
    'if',
    'implements',
    'import',
    'instanceof',
    'int',
    'interface',
    'long',
    'native',
    'new',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'static',
    'strictfp',
    'super',
    'switch',
    'synchronized',
    'this',
    'throw',
    'throws',
    'transient',
    'try',
    'void',
    'volatile',
    'while',
    'record',
    'sealed',
    'permits',
    'var'

  ]),


  cpp: new Set([

    'alignas',
    'alignof',
    'and',
    'asm',
    'auto',
    'bool',
    'break',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'constexpr',
    'continue',
    'default',
    'delete',
    'do',
    'double',
    'else',
    'enum',
    'explicit',
    'export',
    'extern',
    'false',
    'float',
    'for',
    'friend',
    'goto',
    'if',
    'inline',
    'int',
    'long',
    'namespace',
    'new',
    'noexcept',
    'nullptr',
    'operator',
    'private',
    'protected',
    'public',
    'return',
    'short',
    'signed',
    'sizeof',
    'static',
    'struct',
    'switch',
    'template',
    'this',
    'throw',
    'true',
    'try',
    'typedef',
    'typename',
    'union',
    'unsigned',
    'using',
    'virtual',
    'void',
    'volatile',
    'while'

  ]),


  c: new Set([

    'auto',
    'break',
    'case',
    'char',
    'const',
    'continue',
    'default',
    'do',
    'double',
    'else',
    'enum',
    'extern',
    'float',
    'for',
    'goto',
    'if',
    'inline',
    'int',
    'long',
    'register',
    'restrict',
    'return',
    'short',
    'signed',
    'sizeof',
    'static',
    'struct',
    'switch',
    'typedef',
    'union',
    'unsigned',
    'void',
    'volatile',
    'while'

  ]),


  python: new Set([

    'and',
    'as',
    'assert',
    'async',
    'await',
    'break',
    'case',
    'class',
    'continue',
    'def',
    'del',
    'elif',
    'else',
    'except',
    'finally',
    'for',
    'from',
    'global',
    'if',
    'import',
    'in',
    'is',
    'lambda',
    'match',
    'nonlocal',
    'not',
    'or',
    'pass',
    'raise',
    'return',
    'try',
    'while',
    'with',
    'yield'

  ]),


  javascript: new Set([

    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'from',
    'function',
    'get',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'of',
    'return',
    'set',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
    'async',
    'await'

  ]),


  typescript: new Set([

    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'from',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'interface',
    'let',
    'new',
    'private',
    'protected',
    'public',
    'readonly',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
    'async',
    'await',
    'type',
    'implements',
    'namespace',
    'enum'

  ]),


  go: new Set([

    'break',
    'default',
    'func',
    'interface',
    'select',
    'case',
    'defer',
    'go',
    'map',
    'struct',
    'chan',
    'else',
    'goto',
    'package',
    'switch',
    'const',
    'fallthrough',
    'if',
    'range',
    'type',
    'continue',
    'for',
    'import',
    'return',
    'var'

  ]),


  rust: new Set([

    'as',
    'break',
    'const',
    'continue',
    'crate',
    'else',
    'enum',
    'extern',
    'false',
    'fn',
    'for',
    'if',
    'impl',
    'in',
    'let',
    'loop',
    'match',
    'mod',
    'move',
    'mut',
    'pub',
    'ref',
    'return',
    'self',
    'Self',
    'static',
    'struct',
    'super',
    'trait',
    'true',
    'type',
    'unsafe',
    'use',
    'where',
    'while',
    'async',
    'await',
    'dyn'

  ]),


  kotlin: new Set([

    'as',
    'break',
    'class',
    'continue',
    'do',
    'else',
    'false',
    'for',
    'fun',
    'if',
    'in',
    'interface',
    'is',
    'null',
    'object',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'super',
    'this',
    'throw',
    'true',
    'try',
    'typealias',
    'typeof',
    'val',
    'var',
    'when',
    'while'

  ]),


  swift: new Set([

    'associatedtype',
    'class',
    'deinit',
    'enum',
    'extension',
    'fileprivate',
    'func',
    'import',
    'init',
    'inout',
    'internal',
    'let',
    'open',
    'operator',
    'private',
    'protocol',
    'public',
    'rethrows',
    'static',
    'struct',
    'subscript',
    'typealias',
    'var',
    'break',
    'case',
    'continue',
    'default',
    'defer',
    'do',
    'else',
    'fallthrough',
    'for',
    'guard',
    'if',
    'in',
    'repeat',
    'return',
    'switch',
    'where',
    'while',
    'as',
    'Any',
    'catch',
    'false',
    'is',
    'nil',
    'super',
    'self',
    'Self',
    'throw',
    'throws',
    'true',
    'try'

  ]),


  csharp: new Set([

    'abstract',
    'as',
    'base',
    'bool',
    'break',
    'byte',
    'case',
    'catch',
    'char',
    'class',
    'const',
    'continue',
    'decimal',
    'default',
    'delegate',
    'do',
    'double',
    'else',
    'enum',
    'event',
    'explicit',
    'extern',
    'false',
    'finally',
    'fixed',
    'float',
    'for',
    'foreach',
    'goto',
    'if',
    'implicit',
    'in',
    'int',
    'interface',
    'internal',
    'is',
    'lock',
    'long',
    'namespace',
    'new',
    'null',
    'object',
    'operator',
    'out',
    'override',
    'params',
    'private',
    'protected',
    'public',
    'readonly',
    'ref',
    'return',
    'sbyte',
    'sealed',
    'short',
    'sizeof',
    'stackalloc',
    'static',
    'string',
    'struct',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'uint',
    'ulong',
    'unchecked',
    'unsafe',
    'ushort',
    'using',
    'virtual',
    'void',
    'volatile',
    'while',
    'var'

  ])

};


// ============================================================
// TYPE KEYWORDS
// ============================================================

const TYPE_WORDS = new Set([

  'int',
  'long',
  'short',
  'byte',
  'float',
  'double',
  'char',
  'boolean',
  'bool',
  'void',
  'string',
  'String',
  'Integer',
  'Long',
  'Double',
  'Float',
  'Character',
  'Object',
  'Array',
  'List',
  'Map',
  'Set',
  'Vector',
  'Stack',
  'Queue',
  'Deque',
  'HashMap',
  'HashSet',
  'ArrayList',
  'LinkedList',
  'TreeMap',
  'TreeSet',
  'Optional',
  'Promise',
  'Node',
  'int64',
  'uint',
  'usize',
  'isize',
  'i32',
  'i64',
  'u32',
  'u64',
  'f32',
  'f64',
  'str'

]);


// ============================================================
// BOOLEAN / NULL WORDS
// ============================================================

const SPECIAL_WORDS = new Set([

  'true',
  'false',
  'null',
  'nullptr',
  'None',
  'nil',
  'undefined',
  'NaN',
  'Infinity'

]);


// ============================================================
// TOKENIZE LINE
// ============================================================

function tokenizeLine(
  line,
  language
) {

  const tokens = [];

  let i = 0;


  const keywords =
    LANGUAGE_KEYWORDS[
      language
    ] ||
    new Set();


  while (
    i < line.length
  ) {

    const char =
      line[i];


    // --------------------------------------------------------
    // Whitespace
    // --------------------------------------------------------

    if (
      /\s/.test(char)
    ) {

      let value = '';


      while (
        i < line.length &&
        /\s/.test(line[i])
      ) {

        value +=
          line[i];

        i++;
      }


      tokens.push({
        text: value,
        type: 'text'
      });


      continue;
    }


    // --------------------------------------------------------
    // Single-line comments
    // --------------------------------------------------------

    if (
      line.startsWith(
        '//',
        i
      )
    ) {

      tokens.push({

        text:
          line.substring(i),

        type:
          'comment'

      });


      break;
    }


    // --------------------------------------------------------
    // Python comments
    // --------------------------------------------------------

    if (
      language === 'python' &&
      char === '#'
    ) {

      tokens.push({

        text:
          line.substring(i),

        type:
          'comment'

      });


      break;
    }


    // --------------------------------------------------------
    // Strings
    // --------------------------------------------------------

    if (
      char === '"' ||
      char === "'" ||
      char === '`'
    ) {

      const quote =
        char;


      let value =
        char;


      i++;


      while (
        i < line.length
      ) {

        value +=
          line[i];


        if (
          line[i] === '\\' &&
          i + 1 < line.length
        ) {

          i++;

          value +=
            line[i];

          i++;

          continue;
        }


        if (
          line[i] === quote
        ) {

          i++;

          break;
        }


        i++;
      }


      tokens.push({

        text: value,

        type: 'string'

      });


      continue;
    }


    // --------------------------------------------------------
    // Numbers
    // --------------------------------------------------------

    if (
      /[0-9]/.test(char)
    ) {

      let value = '';


      while (
        i < line.length &&
        /[0-9a-fA-F_xX.eE+-]/.test(
          line[i]
        )
      ) {

        value +=
          line[i];

        i++;
      }


      tokens.push({

        text: value,

        type: 'number'

      });


      continue;
    }


    // --------------------------------------------------------
    // Identifier
    // --------------------------------------------------------

    if (
      /[A-Za-z_$]/.test(char)
    ) {

      let value = '';


      while (
        i < line.length &&
        /[A-Za-z0-9_$]/.test(
          line[i]
        )
      ) {

        value +=
          line[i];

        i++;
      }


      // ------------------------------------------------------
      // Keyword
      // ------------------------------------------------------

      if (
        keywords.has(value)
      ) {

        tokens.push({

          text: value,

          type: 'keyword'

        });

        continue;
      }


      // ------------------------------------------------------
      // Special values
      // ------------------------------------------------------

      if (
        SPECIAL_WORDS.has(value)
      ) {

        tokens.push({

          text: value,

          type: 'boolean'

        });

        continue;
      }


      // ------------------------------------------------------
      // Types
      // ------------------------------------------------------

      if (
        TYPE_WORDS.has(value)
      ) {

        tokens.push({

          text: value,

          type: 'type'

        });

        continue;
      }


      // ------------------------------------------------------
      // Function detection
      // ------------------------------------------------------

      let nextIndex =
        i;


      while (
        nextIndex < line.length &&
        /\s/.test(
          line[nextIndex]
        )
      ) {

        nextIndex++;
      }


      if (
        line[nextIndex] === '('
      ) {

        tokens.push({

          text: value,

          type: 'function'

        });

        continue;
      }


      // ------------------------------------------------------
      // Normal identifier
      // ------------------------------------------------------

      tokens.push({

        text: value,

        type: 'text'

      });


      continue;
    }


    // --------------------------------------------------------
    // Operators
    // --------------------------------------------------------

    const twoCharOperator =
      line.substring(
        i,
        i + 2
      );


    const threeCharOperator =
      line.substring(
        i,
        i + 3
      );


    if (
      [
        '===',
        '!==',
        '>>>',
        '<<=',
        '>>=',
        '...',
        '=>',
        '==',
        '!=',
        '<=',
        '>=',
        '&&',
        '||',
        '++',
        '--',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '<<',
        '>>',
        '->',
        '::',
        '??',
        '?.'
      ].includes(
        threeCharOperator
      )
    ) {

      tokens.push({

        text:
          threeCharOperator,

        type:
          'operator'

      });


      i += 3;

      continue;
    }


    if (
      [
        '=>',
        '==',
        '!=',
        '<=',
        '>=',
        '&&',
        '||',
        '++',
        '--',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '<<',
        '>>',
        '->',
        '::',
        '??',
        '?.'
      ].includes(
        twoCharOperator
      )
    ) {

      tokens.push({

        text:
          twoCharOperator,

        type:
          'operator'

      });


      i += 2;

      continue;
    }


    if (
      '+-*/%=<>!&|^~?:'.includes(
        char
      )
    ) {

      tokens.push({

        text: char,

        type: 'operator'

      });


      i++;

      continue;
    }


    // --------------------------------------------------------
    // Punctuation
    // --------------------------------------------------------

    if (
      '{}[]();,.'.includes(
        char
      )
    ) {

      tokens.push({

        text: char,

        type:
          'punctuation'

      });


      i++;

      continue;
    }


    // --------------------------------------------------------
    // Fallback character
    // --------------------------------------------------------

    tokens.push({

      text: char,

      type: 'text'

    });


    i++;
  }


  return tokens;
}


// ============================================================
// TOKEN COLOR
// ============================================================

function getTokenColor(type) {

  switch (type) {

    case 'keyword':
      return CODE_IMAGE_CONFIG.keywordColor;

    case 'type':
      return CODE_IMAGE_CONFIG.typeColor;

    case 'string':
      return CODE_IMAGE_CONFIG.stringColor;

    case 'number':
      return CODE_IMAGE_CONFIG.numberColor;

    case 'comment':
      return CODE_IMAGE_CONFIG.commentColor;

    case 'function':
      return CODE_IMAGE_CONFIG.functionColor;

    case 'boolean':
      return CODE_IMAGE_CONFIG.booleanColor;

    case 'operator':
      return CODE_IMAGE_CONFIG.operatorColor;

    case 'punctuation':
      return CODE_IMAGE_CONFIG.punctuationColor;

    default:
      return CODE_IMAGE_CONFIG.defaultText;
  }
}


// ============================================================
// CALCULATE CODE WIDTH
// ============================================================

function calculateCodeWidth(
  lines,
  ctx
) {

  let maxWidth = 0;


  for (
    const line of lines
  ) {

    const width =
      ctx.measureText(
        line
      ).width;


    if (
      width > maxWidth
    ) {

      maxWidth =
        width;
    }
  }


  return Math.max(

    CODE_IMAGE_CONFIG.minWidth,

    Math.min(

      CODE_IMAGE_CONFIG.maxCanvasWidth,

      Math.ceil(

        CODE_IMAGE_CONFIG.lineNumberWidth +

        maxWidth +

        CODE_IMAGE_CONFIG.paddingX * 2

      )

    )

  );
}


// ============================================================
// PREPARE LONG LINES
// ============================================================

function prepareCodeLines(
  code,
  ctx
) {

  const lines =
    code.split('\n');


  const availableWidth =
    CODE_IMAGE_CONFIG.maxCanvasWidth -
    CODE_IMAGE_CONFIG.lineNumberWidth -
    CODE_IMAGE_CONFIG.paddingX * 2;


  const prepared = [];


  for (
    let index = 0;
    index < lines.length;
    index++
  ) {

    const line =
      lines[index];


    // --------------------------------------------------------
    // Empty line
    // --------------------------------------------------------

    if (
      line.length === 0
    ) {

      prepared.push({

        text: '',

        originalLine:
          index + 1

      });


      continue;
    }


    // --------------------------------------------------------
    // Normal line
    // --------------------------------------------------------

    if (
      ctx.measureText(line).width <=
      availableWidth
    ) {

      prepared.push({

        text: line,

        originalLine:
          index + 1

      });


      continue;
    }


    // --------------------------------------------------------
    // Long line
    // --------------------------------------------------------

    let current =
      '';


    for (
      const char of line
    ) {

      const test =
        current + char;


      if (
        ctx.measureText(test).width >
          availableWidth &&
        current.length > 0
      ) {

        prepared.push({

          text: current,

          originalLine:
            index + 1

        });


        current =
          char;

      } else {

        current =
          test;
      }
    }


    if (
      current.length > 0
    ) {

      prepared.push({

        text: current,

        originalLine:
          index + 1

      });
    }
  }


  return prepared;
}


// ============================================================
// RENDER SYNTAX-HIGHLIGHTED LINE
// ============================================================

function renderHighlightedLine(
  ctx,
  line,
  language,
  x,
  y
) {

  const tokens =
    tokenizeLine(
      line,
      language
    );


  let currentX =
    x;


  for (
    const token of tokens
  ) {

    ctx.fillStyle =
      getTokenColor(
        token.type
      );


    ctx.textAlign =
      'left';


    ctx.fillText(
      token.text,
      currentX,
      y
    );


    currentX +=
      ctx.measureText(
        token.text
      ).width;
  }
}


// ============================================================
// RENDER ONE CODE PAGE
// ============================================================

function renderCodePage(
  preparedLines,
  startIndex,
  endIndex,
  language
) {

  const FONT_SIZE =
    CODE_IMAGE_CONFIG.fontSize;

  const LINE_HEIGHT =
    CODE_IMAGE_CONFIG.lineHeight;

  const PADDING_X =
    CODE_IMAGE_CONFIG.paddingX;

  const PADDING_Y =
    CODE_IMAGE_CONFIG.paddingY;

  const LINE_NUMBER_WIDTH =
    CODE_IMAGE_CONFIG.lineNumberWidth;


  const font =
    `${FONT_SIZE}px Consolas, "Courier New", monospace`;


  // ----------------------------------------------------------
  // Measurement
  // ----------------------------------------------------------

  const measureCanvas =
    document.createElement(
      'canvas'
    );


  const measureCtx =
    measureCanvas.getContext(
      '2d'
    );


  measureCtx.font =
    font;


  let maxTextWidth =
    0;


  for (
    let i = startIndex;
    i < endIndex;
    i++
  ) {

    const width =
      measureCtx.measureText(
        preparedLines[i].text
      ).width;


    maxTextWidth =
      Math.max(
        maxTextWidth,
        width
      );
  }


  // ----------------------------------------------------------
  // Dimensions
  // ----------------------------------------------------------

  const width =
    Math.max(

      CODE_IMAGE_CONFIG.minWidth,

      Math.min(

        CODE_IMAGE_CONFIG.maxCanvasWidth,

        Math.ceil(

          LINE_NUMBER_WIDTH +

          maxTextWidth +

          PADDING_X * 2

        )

      )

    );


  const lineCount =
    endIndex -
    startIndex;


  const height =
    Math.max(

      200,

      Math.min(

        CODE_IMAGE_CONFIG.maxCanvasHeight,

        Math.ceil(

          lineCount *
          LINE_HEIGHT +

          PADDING_Y * 2

        )

      )

    );


  // ----------------------------------------------------------
  // Canvas
  // ----------------------------------------------------------

  const canvas =
    document.createElement(
      'canvas'
    );


  canvas.width =
    width;

  canvas.height =
    height;


  const ctx =
    canvas.getContext(
      '2d'
    );


  if (!ctx) {

    return null;
  }


  // ----------------------------------------------------------
  // Background
  // ----------------------------------------------------------

  ctx.fillStyle =
    CODE_IMAGE_CONFIG.background;


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  // ----------------------------------------------------------
  // Font
  // ----------------------------------------------------------

  ctx.font =
    font;


  ctx.textBaseline =
    'top';


  // ----------------------------------------------------------
  // Render lines
  // ----------------------------------------------------------

  for (
    let i = startIndex;
    i < endIndex;
    i++
  ) {

    const item =
      preparedLines[i];


    const pageLine =
      i -
      startIndex;


    const y =
      PADDING_Y +
      pageLine *
      LINE_HEIGHT;


    // ------------------------------------------------------
    // Line number
    // ------------------------------------------------------

    ctx.textAlign =
      'right';


    ctx.fillStyle =
      CODE_IMAGE_CONFIG.lineNumberColor;


    ctx.fillText(

      String(
        item.originalLine
      ),

      PADDING_X +
      LINE_NUMBER_WIDTH -
      10,

      y

    );


    // ------------------------------------------------------
    // Syntax highlighted code
    // ------------------------------------------------------

    renderHighlightedLine(

      ctx,

      item.text,

      language,

      PADDING_X +
      LINE_NUMBER_WIDTH,

      y

    );
  }


  return canvas;
}


// ============================================================
// RENDER COMPLETE CODE
// ============================================================

async function renderFullCodeToCanvases(
  code,
  language
) {

  if (
    !code
  ) {

    return [];
  }


  // ----------------------------------------------------------
  // Measurement
  // ----------------------------------------------------------

  const measureCanvas =
    document.createElement(
      'canvas'
    );


  const measureCtx =
    measureCanvas.getContext(
      '2d'
    );


  measureCtx.font =
    `${CODE_IMAGE_CONFIG.fontSize}px Consolas, "Courier New", monospace`;


  // ----------------------------------------------------------
  // Prepare lines
  // ----------------------------------------------------------

  const preparedLines =
    prepareCodeLines(
      code,
      measureCtx
    );


  // ----------------------------------------------------------
  // Maximum lines per page
  // ----------------------------------------------------------

  const maxLinesPerPage =
    Math.floor(

      (
        CODE_IMAGE_CONFIG.maxCanvasHeight -
        CODE_IMAGE_CONFIG.paddingY * 2
      ) /

      CODE_IMAGE_CONFIG.lineHeight

    );


  const canvases = [];


  let startIndex =
    0;


  // ----------------------------------------------------------
  // Generate pages
  // ----------------------------------------------------------

  while (
    startIndex <
    preparedLines.length
  ) {

    const endIndex =
      Math.min(

        startIndex +
        maxLinesPerPage,

        preparedLines.length

      );


    console.log(

      `Rendering lines ${startIndex + 1} - ${endIndex}`

    );


    const canvas =
      renderCodePage(

        preparedLines,

        startIndex,

        endIndex,

        language

      );


    if (
      canvas
    ) {

      canvases.push(
        canvas
      );
    }


    startIndex =
      endIndex;


    // Allow browser to breathe
    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          0
        )
    );
  }


  return canvases;
}


// ============================================================
// BUILD FINAL CODE CARD
// ============================================================

function buildCodeCard(
  codeCanvas,
  title,
  language,
  pageNumber,
  totalPages
) {

  const OUTER =
    30;

  const TITLEBAR =
    60;

  const INNER =
    20;


  const codeW =
    codeCanvas.width;

  const codeH =
    codeCanvas.height;


  const winW =
    codeW +
    INNER * 2;


  const winH =
    TITLEBAR +
    codeH +
    INNER;


  const W =
    winW +
    OUTER * 2;


  const H =
    winH +
    OUTER * 2;


  // ----------------------------------------------------------
  // Safety check
  // ----------------------------------------------------------

  if (
    W > 30000 ||
    H > 30000
  ) {

    console.error(
      'Canvas is too large:',
      W,
      H
    );


    return null;
  }


  // ----------------------------------------------------------
  // Create canvas
  // ----------------------------------------------------------

  const out =
    document.createElement(
      'canvas'
    );


  out.id =
    'cardCanvas';


  out.width =
    W;

  out.height =
    H;


  const ctx =
    out.getContext(
      '2d'
    );


  if (!ctx) {

    return null;
  }


  // ----------------------------------------------------------
  // Background gradient
  // ----------------------------------------------------------

  const gradient =
    ctx.createLinearGradient(

      0,
      0,

      W,
      H

    );


  gradient.addColorStop(
    0,
    '#1E3A5F'
  );


  gradient.addColorStop(
    1,
    '#0B1220'
  );


  ctx.fillStyle =
    gradient;


  ctx.fillRect(
    0,
    0,
    W,
    H
  );


  // ----------------------------------------------------------
  // Window
  // ----------------------------------------------------------

  roundRect(

    ctx,

    OUTER,
    OUTER,

    winW,
    winH,

    16

  );


  ctx.fillStyle =
    '#161B22';


  ctx.fill();


  // ----------------------------------------------------------
  // Window buttons
  // ----------------------------------------------------------

  const dotY =
    OUTER +
    30;


  const buttons = [

    '#FF5F56',

    '#FFBD2E',

    '#27C93F'

  ];


  buttons.forEach(
    (
      color,
      index
    ) => {

      ctx.beginPath();


      ctx.arc(

        OUTER +
        26 +
        index * 22,

        dotY,

        6,

        0,

        Math.PI * 2

      );


      ctx.fillStyle =
        color;


      ctx.fill();
    }
  );


  // ----------------------------------------------------------
  // Language badge
  // ----------------------------------------------------------

  const languageName =
    language === 'cpp'
      ? 'C++'
      : language === 'csharp'
        ? 'C#'
        : language === 'javascript'
          ? 'JavaScript'
          : language === 'typescript'
            ? 'TypeScript'
            : language.charAt(0).toUpperCase() +
              language.slice(1);


  ctx.font =
    '12px Arial';


  ctx.fillStyle =
    '#8B949E';


  ctx.textAlign =
    'left';


  ctx.textBaseline =
    'middle';


  ctx.fillText(

    languageName,

    OUTER +
    105,

    dotY

  );


  // ----------------------------------------------------------
  // Title
  // ----------------------------------------------------------

  const safeTitle =
    String(
      title ||
      'LeetCode Solution'
    );


  let titleFont =
    18;


  ctx.font =
    `${titleFont}px Arial`;


  while (

    ctx.measureText(
      safeTitle
    ).width >

      winW -
      230 &&

    titleFont >
      11

  ) {

    titleFont--;


    ctx.font =
      `${titleFont}px Arial`;
  }


  ctx.fillStyle =
    '#C9D1D9';


  ctx.textAlign =
    'center';


  ctx.fillText(

    safeTitle,

    OUTER +
    winW / 2,

    dotY

  );


  // ----------------------------------------------------------
  // Page number
  // ----------------------------------------------------------

  if (
    totalPages > 1
  ) {

    ctx.font =
      '12px Arial';


    ctx.fillStyle =
      '#8B949E';


    ctx.textAlign =
      'right';


    ctx.fillText(

      `Page ${pageNumber}/${totalPages}`,

      OUTER +
      winW -
      15,

      dotY

    );
  }


  // ----------------------------------------------------------
  // Code
  // ----------------------------------------------------------

  ctx.drawImage(

    codeCanvas,

    OUTER +
    INNER,

    OUTER +
    TITLEBAR

  );


  // ----------------------------------------------------------
  // Footer
  // ----------------------------------------------------------

  ctx.font =
    '13px Arial';


  ctx.fillStyle =
    'rgba(148,163,184,0.7)';


  ctx.textAlign =
    'right';


  ctx.textBaseline =
    'alphabetic';


  ctx.fillText(

    'Solved via GITLEET',

    W -
    OUTER -
    8,

    H -
    10

  );


  // ----------------------------------------------------------
  // Convert to PNG
  // ----------------------------------------------------------

  try {

    return out.toDataURL(
      'image/png'
    );

  } catch (error) {

    console.error(
      'PNG conversion failed:',
      error
    );


    return null;
  }
}


// ============================================================
// GENERATE ALL CODE IMAGES
// ============================================================

async function generateCodeCards(
  tab,
  title
) {

  if (
    !tab ||
    !tab.id
  ) {

    console.error(
      'Invalid tab.'
    );


    return [];
  }


  // ----------------------------------------------------------
  // GET COMPLETE CODE
  // ----------------------------------------------------------

  const data =
    await getFullCodeFromMonaco(
      tab.id
    );


  if (
    !data ||
    !data.code
  ) {

    console.error(
      'No complete code found.'
    );


    return [];
  }


  const code =
    data.code;


  const language =
    data.language;


  console.log(
    '========================================'
  );


  console.log(
    'GITLEET CODE EXTRACTION'
  );


  console.log(
    'Language:',
    language
  );


  console.log(
    'Characters:',
    code.length
  );


  console.log(
    'Lines:',
    code.split('\n').length
  );


  console.log(
    '========================================'
  );


  // ----------------------------------------------------------
  // RENDER CODE
  // ----------------------------------------------------------

  const codeCanvases =
    await renderFullCodeToCanvases(

      code,

      language

    );


  if (
    codeCanvases.length === 0
  ) {

    console.error(
      'Code rendering failed.'
    );


    return [];
  }


  // ----------------------------------------------------------
  // CREATE FINAL IMAGES
  // ----------------------------------------------------------

  const images = [];


  for (
    let i = 0;
    i < codeCanvases.length;
    i++
  ) {

    const image =
      buildCodeCard(

        codeCanvases[i],

        title,

        language,

        i + 1,

        codeCanvases.length

      );


    if (
      image
    ) {

      images.push(
        image
      );
    }


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          0
        )
    );
  }


  console.log(
    `Generated ${images.length} image(s)`
  );


  return images;
}


// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================
//
// Existing code can still use:
//
// const image = await generateCodeCard(tab, title);
//
// ============================================================

async function generateCodeCard(
  tab,
  title
) {

  const images =
    await generateCodeCards(
      tab,
      title
    );


  if (
    images.length === 0
  ) {

    return null;
  }


  return images[0];
}


// ============================================================
// END OF GITLEET CODE IMAGE GENERATOR
// ============================================================
// ---- generate ----

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
  document.getElementById('copyAndOpen').style.display = 'block';

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