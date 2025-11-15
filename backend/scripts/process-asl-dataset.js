/**
 * ASL Dataset Processor
 * 
 * This script processes the Kaggle ASL dataset and creates a word-to-video mapping.
 * 
 * Setup Instructions:
 * 1. Download the Kaggle ASL dataset: https://www.kaggle.com/datasets/ayuraj/asl-dataset
 * 2. Extract it to backend/data/asl-dataset/
 * 3. Run: node scripts/process-asl-dataset.js
 * 
 * The script will:
 * - Scan the dataset directory for video files
 * - Create a word-to-video mapping JSON file
 * - Generate an index for fast lookups
 */

const fs = require('fs');
const path = require('path');

// Try both folder name variations (asl-dataset or asl_dataset)
const ASL_DATASET_PATH_HYPHEN = path.join(__dirname, '../data/asl-dataset');
const ASL_DATASET_PATH_UNDERSCORE = path.join(__dirname, '../data/asl_dataset');
const ASL_DATASET_PATH = fs.existsSync(ASL_DATASET_PATH_UNDERSCORE) 
  ? ASL_DATASET_PATH_UNDERSCORE 
  : ASL_DATASET_PATH_HYPHEN;

const OUTPUT_INDEX_PATH = path.join(__dirname, '../data/asl-video-index.json');
const OUTPUT_MAPPING_PATH = path.join(__dirname, '../data/asl-word-mapping.json');

// Common ASL word variations and synonyms
const wordVariations = {
  'hello': ['hi', 'hey', 'greetings'],
  'thank': ['thanks', 'thank you', 'grateful'],
  'you': ['your', 'yours'],
  'yes': ['yeah', 'yep', 'sure'],
  'no': ['nope', 'nah', 'negative'],
  'please': ['pls', 'plz'],
  'welcome': ['welcoming'],
  'this': ['that', 'these', 'those'],
  'is': ['are', 'am', 'be'],
  'to': ['too', 'two'],
  'and': ['&', 'plus'],
  'how': ['how\'s', 'how\'re'],
  'what': ['what\'s', 'what\'re'],
  'where': ['where\'s', 'where\'re'],
  'when': ['when\'s', 'when\'re'],
  'why': ['why\'s', 'why\'re'],
  'who': ['who\'s', 'who\'re'],
  'can': ['could', 'may'],
  'will': ['would', 'shall'],
  'should': ['ought', 'must']
};

/**
 * Normalize word for lookup (lowercase, remove punctuation)
 */
function normalizeWord(word) {
  return word.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

/**
 * Find all video files in a directory recursively
 */
function findVideoFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`[ASL Processor] Directory not found: ${dir}`);
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findVideoFiles(filePath, fileList);
    } else {
      // Check if it's a video or image file
      const ext = path.extname(file).toLowerCase();
      if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Extract word from filename or directory name
 * Common patterns: "hello.mp4", "hello_1.mp4", "hello/sign.mp4", "01_hello.mp4"
 * For letter-based datasets: "a/", "0/", etc. - map to letter names
 */
function extractWordFromPath(filePath) {
  const relativePath = path.relative(ASL_DATASET_PATH, filePath);
  const parts = relativePath.split(path.sep);
  
  // For letter-based datasets (folders named "a", "b", "0", "1", etc.)
  if (parts.length >= 1 && parts[0].length === 1) {
    const letter = parts[0].toLowerCase();
    // Map single letters to their names
    const letterNames = {
      'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f',
      'g': 'g', 'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l',
      'm': 'm', 'n': 'n', 'o': 'o', 'p': 'p', 'q': 'q', 'r': 'r',
      's': 's', 't': 't', 'u': 'u', 'v': 'v', 'w': 'w', 'x': 'x',
      'y': 'y', 'z': 'z',
      '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
      '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
    };
    if (letterNames[letter]) {
      return normalizeWord(letterNames[letter]);
    }
    return normalizeWord(letter);
  }
  
  // Try to extract word from filename or directory
  for (const part of parts) {
    const nameWithoutExt = path.basename(part, path.extname(part));
    
    // Remove common prefixes/suffixes
    let word = nameWithoutExt
      .replace(/^\d+[-_\s]*/i, '') // Remove leading numbers
      .replace(/[-_\s]*\d+$/i, '') // Remove trailing numbers
      .replace(/[-_\s]+/g, ' ') // Replace separators with space
      .trim();
    
    // Split if multiple words and take first meaningful word
    const words = word.split(/\s+/);
    if (words.length > 0 && words[0].length > 1) {
      return normalizeWord(words[0]);
    }
  }
  
  return null;
}

/**
 * Process the ASL dataset and create mappings
 */
function processDataset() {
  console.log('[ASL Processor] Starting dataset processing...');
  console.log(`[ASL Processor] Dataset path: ${ASL_DATASET_PATH}`);

  if (!fs.existsSync(ASL_DATASET_PATH)) {
    console.error(`[ASL Processor] ERROR: Dataset directory not found: ${ASL_DATASET_PATH}`);
    console.error('[ASL Processor] Please download the Kaggle ASL dataset and extract it to this location.');
    console.error('[ASL Processor] Download from: https://www.kaggle.com/datasets/ayuraj/asl-dataset');
    return;
  }

  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_INDEX_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all video files
  console.log('[ASL Processor] Scanning for video files...');
  const videoFiles = findVideoFiles(ASL_DATASET_PATH);
  console.log(`[ASL Processor] Found ${videoFiles.length} video files`);

  if (videoFiles.length === 0) {
    console.error('[ASL Processor] ERROR: No video files found in dataset directory');
    return;
  }

  // Create word-to-video mappings
  const wordToVideos = {};
  const videoIndex = {};

  // Group images by letter/word for image sequences
  const imageGroups = {};
  
  videoFiles.forEach((filePath, index) => {
    const word = extractWordFromPath(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    
    if (word) {
      // Normalize path to be relative to backend directory
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);
      const mediaUrl = `/asl-videos/${relativePath.replace(/\\/g, '/')}`;
      
      if (!wordToVideos[word]) {
        wordToVideos[word] = [];
      }
      
      // For images, group them by word to create sequences
      if (isImage) {
        if (!imageGroups[word]) {
          imageGroups[word] = [];
        }
        imageGroups[word].push({
          path: relativePath,
          url: mediaUrl,
          index: index
        });
      } else {
        // For videos, add directly
        wordToVideos[word].push({
          path: relativePath,
          url: mediaUrl,
          index: index,
          type: 'video'
        });
      }

      videoIndex[relativePath] = {
        word: word,
        url: mediaUrl,
        index: index,
        type: isImage ? 'image' : 'video'
      };
    }
  });
  
  // For image sequences, use the first image as representative
  // (In production, you'd want to create animated sequences or use all images)
  Object.keys(imageGroups).forEach(word => {
    if (imageGroups[word].length > 0) {
      // Use first image as representative, or create a sequence
      const firstImage = imageGroups[word][0];
      wordToVideos[word].push({
        path: firstImage.path,
        url: firstImage.url,
        index: firstImage.index,
        type: 'image',
        sequenceCount: imageGroups[word].length,
        note: `Image sequence: ${imageGroups[word].length} images available`
      });
    }
  });

  // Add word variations
  Object.keys(wordVariations).forEach(mainWord => {
    if (wordToVideos[mainWord]) {
      wordVariations[mainWord].forEach(variant => {
        const normalizedVariant = normalizeWord(variant);
        if (!wordToVideos[normalizedVariant]) {
          wordToVideos[normalizedVariant] = wordToVideos[mainWord];
        }
      });
    }
  });

  // Save mappings
  fs.writeFileSync(OUTPUT_INDEX_PATH, JSON.stringify(videoIndex, null, 2));
  fs.writeFileSync(OUTPUT_MAPPING_PATH, JSON.stringify(wordToVideos, null, 2));

  console.log(`[ASL Processor] ✓ Created video index: ${OUTPUT_INDEX_PATH}`);
  console.log(`[ASL Processor] ✓ Created word mapping: ${OUTPUT_MAPPING_PATH}`);
  const totalMediaFiles = videoFiles.length;
  const videoCount = videoFiles.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'].includes(ext);
  }).length;
  const imageCount = totalMediaFiles - videoCount;
  
  console.log(`[ASL Processor] ✓ Mapped ${Object.keys(wordToVideos).length} unique words to ${totalMediaFiles} media files`);
  console.log(`[ASL Processor]   - Videos: ${videoCount}`);
  console.log(`[ASL Processor]   - Images: ${imageCount}`);
  
  // Show sample mappings
  const sampleWords = Object.keys(wordToVideos).slice(0, 10);
  console.log('\n[ASL Processor] Sample word mappings:');
  sampleWords.forEach(word => {
    const media = wordToVideos[word];
    const types = [...new Set(media.map(m => m.type || 'unknown'))];
    console.log(`  - "${word}": ${media.length} file(s) [${types.join(', ')}]`);
  });
  
  if (imageCount > 0) {
    console.log('\n[ASL Processor] ⚠️  NOTE: Dataset contains images, not videos.');
    console.log('[ASL Processor]    For best results, use a video-based ASL dataset.');
    console.log('[ASL Processor]    Current setup will use first image from each sequence.');
  }

  console.log('\n[ASL Processor] Processing complete!');
  console.log('[ASL Processor] The backend server will automatically use these mappings.');
}

// Run if called directly
if (require.main === module) {
  processDataset();
}

module.exports = { processDataset, normalizeWord };

