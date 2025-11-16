/**
 * Gloss Normalizer
 * Maps English words to ASL glosses (sign language vocabulary)
 */

// Common word form conversions
const wordForms = {
  // Verb forms
  'running': 'run',
  'ran': 'run',
  'runs': 'run',
  'walking': 'walk',
  'walked': 'walk',
  'walks': 'walk',
  'going': 'go',
  'went': 'go',
  'goes': 'go',
  'coming': 'come',
  'came': 'come',
  'comes': 'come',
  'doing': 'do',
  'did': 'do',
  'does': 'do',
  'done': 'do',
  'saying': 'say',
  'said': 'say',
  'says': 'say',
  'telling': 'tell',
  'told': 'tell',
  'tells': 'tell',
  'seeing': 'see',
  'saw': 'see',
  'sees': 'see',
  'looking': 'look',
  'looked': 'look',
  'looks': 'look',
  'watching': 'watch',
  'watched': 'watch',
  'watches': 'watch',
  'knowing': 'know',
  'knew': 'know',
  'knows': 'know',
  'thinking': 'think',
  'thought': 'think',
  'thinks': 'think',
  'feeling': 'feel',
  'felt': 'feel',
  'feels': 'feel',
  'wanting': 'want',
  'wanted': 'want',
  'wants': 'want',
  'needing': 'need',
  'needed': 'need',
  'needs': 'need',
  'liking': 'like',
  'liked': 'like',
  'likes': 'like',
  'loving': 'love',
  'loved': 'love',
  'loves': 'love',
  'getting': 'get',
  'got': 'get',
  'gets': 'get',
  'giving': 'give',
  'gave': 'give',
  'gives': 'give',
  'taking': 'take',
  'took': 'take',
  'takes': 'take',
  'making': 'make',
  'made': 'make',
  'makes': 'make',
  
  // Common variations
  'yeah': 'yes',
  'yep': 'yes',
  'yup': 'yes',
  'nope': 'no',
  'nah': 'no',
  'hi': 'hello',
  'hey': 'hello',
  'thanks': 'thank',
  'thankyou': 'thank',
  'thank-you': 'thank',
  'welcome': 'welcome',
  'okay': 'ok',
  'ok': 'ok',
  
  // Plural to singular
  'hands': 'hand',
  'people': 'person',
  'children': 'child',
  'men': 'man',
  'women': 'woman',
  'friends': 'friend',
  'families': 'family',
  'things': 'thing',
  'ways': 'way',
  'places': 'place',
  'parts': 'part',
  'kinds': 'kind',
  'sorts': 'sort',
  'types': 'type',
  'days': 'day',
  'weeks': 'week',
  'months': 'month',
  'years': 'year',
  'hours': 'hour',
  'minutes': 'minute',
  'seconds': 'second',
  'countries': 'country',
  'cities': 'city',
  'homes': 'home',
  'houses': 'house',
  'schools': 'school',
  'works': 'work',
};

// Stop words to ignore (common words without distinct ASL signs)
const stopWords = new Set([
  'a', 'an', 'the',
  'to', 'of', 'for', 'with', 'on', 'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'and', 'or', 'but', 'so', 'if', 'then', 'than', 'because',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those',
  'very', 'really', 'quite', 'too', 'also', 'just', 'only', 'even', 'still', 'yet'
]);

/**
 * Normalize a word to an ASL gloss
 * @param {string} word - The input word
 * @returns {string|null} - The normalized gloss, or null if should be ignored
 */
function normalizeWord(word) {
  if (!word || typeof word !== 'string') {
    return null;
  }
  
  // Lowercase and trim
  let normalized = word.toLowerCase().trim();
  
  // Remove punctuation
  normalized = normalized.replace(/[^\w\s']/g, '');
  
  // Remove apostrophes
  normalized = normalized.replace(/'/g, '');
  
  // Check if it's a stop word (ignore)
  if (stopWords.has(normalized)) {
    return null;
  }
  
  // Check direct word form mapping
  if (wordForms[normalized]) {
    return wordForms[normalized];
  }
  
  // Handle plural forms (simple -s removal)
  if (normalized.endsWith('s') && normalized.length > 3) {
    const singular = normalized.slice(0, -1);
    // If singular form exists in wordForms, use it
    if (wordForms[`${singular}s`] === singular) {
      return singular;
    }
  }
  
  // Handle -ing forms
  if (normalized.endsWith('ing') && normalized.length > 4) {
    const base = normalized.slice(0, -3);
    if (wordForms[`${base}ing`] === base) {
      return base;
    }
  }
  
  // Handle -ed forms
  if (normalized.endsWith('ed') && normalized.length > 3) {
    const base = normalized.slice(0, -2);
    if (wordForms[`${base}ed`] === base) {
      return base;
    }
  }
  
  // Return normalized word as-is (might be a valid gloss)
  return normalized;
}

/**
 * Normalize multiple words and return unique glosses
 * @param {string[]} words - Array of words
 * @returns {string[]} - Array of normalized glosses (no nulls, no duplicates)
 */
function normalizeWords(words) {
  if (!Array.isArray(words)) {
    return [];
  }
  
  const glosses = new Set();
  
  for (const word of words) {
    const gloss = normalizeWord(word);
    if (gloss) {
      glosses.add(gloss);
    }
  }
  
  return Array.from(glosses);
}

module.exports = {
  normalizeWord,
  normalizeWords
};

