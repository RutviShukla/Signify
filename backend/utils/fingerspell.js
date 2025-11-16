/**
 * Fingerspelling Fallback
 * Converts words to letter-by-letter finger-spelling
 */

const path = require('path');
const fs = require('fs');

// Path to fingerspelling images/videos
const FINGERSPELL_DIR = path.join(__dirname, '..', 'data', 'fingerspelling');
const ASL_LETTER_DIR = path.join(__dirname, '..', 'data', 'asl_dataset');

/**
 * Check if a letter file exists
 * @param {string} letter - The letter (a-z, 0-9)
 * @returns {string|null} - Path to file if exists, null otherwise
 */
function findLetterFile(letter) {
  const lowerLetter = letter.toLowerCase();
  
  // Try fingerspelling directory first
  const fingerspellPath = path.join(FINGERSPELL_DIR, `${lowerLetter}.png`);
  if (fs.existsSync(fingerspellPath)) {
    return `/fingerspelling/${lowerLetter}.png`;
  }
  
  // Try asl_dataset letter folders (for existing dataset)
  const aslLetterPath = path.join(ASL_LETTER_DIR, lowerLetter);
  if (fs.existsSync(aslLetterPath)) {
    // Look for any image file in the letter folder
    try {
      const files = fs.readdirSync(aslLetterPath);
      const imageFile = files.find(f => 
        f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')
      );
      if (imageFile) {
        return `/asl/${lowerLetter}/${imageFile}`;
      }
    } catch (err) {
      // Directory doesn't exist or can't read
    }
  }
  
  return null;
}

/**
 * Convert a word to finger-spelling sequence
 * @param {string} word - The word to finger-spell
 * @returns {Array<{type: string, url: string, letter: string}>} - Array of letter media
 */
function fingerspell(word) {
  if (!word || typeof word !== 'string') {
    return [];
  }
  
  // Remove non-alphanumeric characters
  const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (cleanWord.length === 0) {
    return [];
  }
  
  const sequence = [];
  
  for (const letter of cleanWord) {
    const filePath = findLetterFile(letter);
    
    if (filePath) {
      sequence.push({
        type: 'image',
        url: filePath,
        letter: letter
      });
    } else {
      // Letter not found - skip or use placeholder
      console.warn(`[Fingerspell] Letter "${letter}" not found in dataset`);
    }
  }
  
  return sequence;
}

/**
 * Check if fingerspelling resources are available
 * @returns {boolean}
 */
function isAvailable() {
  return fs.existsSync(FINGERSPELL_DIR) || fs.existsSync(ASL_LETTER_DIR);
}

module.exports = {
  fingerspell,
  isAvailable,
  findLetterFile
};

