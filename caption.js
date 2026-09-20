// ============================================================
// GITLEET - LINKEDIN CAPTION BUILDER
// ============================================================
// DOM-free on purpose — background.js pulls this in via
// importScripts(). Nothing here may touch `document`/`window`.
//
// Replaces the old buildLinkedInPost() from linkden.js, which
// emitted a literal "[Add a line here about your approach]"
// placeholder. That was fine when a human reviewed every post
// before sending; under automatic posting it would publish the
// placeholder verbatim, so the approach line is generated from
// the topic tags content.js already scrapes.
// ============================================================

const LANGUAGE_HASHTAGS = {
  cpp: 'CPlusPlus',
  c: 'C',
  csharp: 'CSharp',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  go: 'Golang',
  rust: 'Rust',
  kotlin: 'Kotlin',
  swift: 'Swift',
  ruby: 'Ruby',
  php: 'PHP',
  scala: 'Scala'
};

function languageHashtag(language) {
  const normalized = (language || '').toLowerCase().trim();
  if (LANGUAGE_HASHTAGS[normalized]) return LANGUAGE_HASHTAGS[normalized];

  // Unknown language: strip anything a hashtag cannot carry.
  const cleaned = normalized.replace(/[^a-z0-9]/g, '');
  if (!cleaned) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// "Hash Table" -> "HashTable", "Two Pointers" -> "TwoPointers"
function topicHashtag(topic) {
  return topic
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function buildCaption({ solution, githubLink, dayNumber }) {
  const numberPart = solution.number ? `#${solution.number} ` : '';
  const difficultyPart = solution.difficulty ? ` (${solution.difficulty})` : '';
  const topics = Array.isArray(solution.topics) ? solution.topics : [];

  const lines = [];

  if (dayNumber) {
    lines.push(`Day ${dayNumber} of #100DaysOfCode`, '');
  }

  lines.push(
    `Just solved ${numberPart}${solution.title}${difficultyPart} on LeetCode 💡`,
    ''
  );

  if (solution.runtime) {
    const beats = solution.runtimeBeats
      ? ` — beats ${solution.runtimeBeats}% of submissions`
      : '';
    lines.push(`⏱️ Runtime: ${solution.runtime}${beats}`);
  }

  if (solution.memory) {
    const beats = solution.memoryBeats
      ? ` — beats ${solution.memoryBeats}% of submissions`
      : '';
    lines.push(`💾 Memory: ${solution.memory}${beats}`);
  }

  if (solution.runtime || solution.memory) {
    lines.push('');
  }

  if (topics.length > 0) {
    lines.push(`Approach: ${topics.join(' · ')}`, '');
  }

  if (githubLink) {
    lines.push(`Code: ${githubLink}`);
  }

  if (solution.problemUrl) {
    lines.push(`Problem: ${solution.problemUrl}`);
  }

  lines.push('');

  // Dedupe: #100DaysOfCode is already in the "Day N" opener, and a
  // topic can collide with the language (e.g. a "Go" tag).
  const tags = ['LeetCode', 'DSA', 'Coding'];

  const language = languageHashtag(solution.language);
  if (language) tags.push(language);

  for (const topic of topics.slice(0, 4)) {
    const tag = topicHashtag(topic);
    if (tag) tags.push(tag);
  }

  const seen = new Set(['100daysofcode']);
  const unique = tags.filter(tag => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  lines.push(unique.map(tag => `#${tag}`).join(' '));

  return lines.join('\n');
}
