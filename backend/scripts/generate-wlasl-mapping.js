/**
 * Generate clean mapping.json from WLASL dataset
 * 
 * This script:
 * 1. Loads WLASL metadata (WLASL_v0.3.json)
 * 2. Filters out missing videos (missing.txt)
 * 3. Checks which videos exist on disk
 * 4. Creates mapping.json with only valid videos
 * 5. Filters to MVP vocabulary (top 200 words)
 */

const fs = require('fs');
const path = require('path');

// Paths - Updated to use wasl-dataset directory
const WLASL_DATASET_DIR = path.join(__dirname, '..', 'data', 'wasl-dataset');
const WLASL_METADATA_PATH = path.join(WLASL_DATASET_DIR, 'WLASL_v0.3.json');
const MISSING_VIDEOS_PATH = path.join(WLASL_DATASET_DIR, 'missing.txt');
const WLASL_VIDEOS_DIR = path.join(WLASL_DATASET_DIR, 'videos');
const MVP_VOCAB_PATH = path.join(__dirname, '..', 'data', 'mvp_vocab.json');
const OUTPUT_MAPPING_PATH = path.join(__dirname, '..', 'data', 'mapping.json');

console.log('[WLASL] Starting mapping generation...\n');

// Load MVP vocabulary
let mvpVocab = [];
if (fs.existsSync(MVP_VOCAB_PATH)) {
  mvpVocab = JSON.parse(fs.readFileSync(MVP_VOCAB_PATH, 'utf8'));
  console.log(`[WLASL] Loaded MVP vocabulary: ${mvpVocab.length} words`);
} else {
  console.warn('[WLASL] MVP vocabulary not found, will include all glosses');
}

// Load missing videos list
let missingVideos = new Set();
if (fs.existsSync(MISSING_VIDEOS_PATH)) {
  const missingText = fs.readFileSync(MISSING_VIDEOS_PATH, 'utf8');
  missingText.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed) {
      missingVideos.add(trimmed);
    }
  });
  console.log(`[WLASL] Loaded ${missingVideos.size} missing video IDs`);
}

// Load WLASL metadata
if (!fs.existsSync(WLASL_METADATA_PATH)) {
  console.error(`[WLASL] ERROR: Metadata file not found at: ${WLASL_METADATA_PATH}`);
  console.error('[WLASL] Please ensure WLASL_v0.3.json is in backend/data/wasl-dataset/');
  process.exit(1);
}

const wlaslData = JSON.parse(fs.readFileSync(WLASL_METADATA_PATH, 'utf8'));
console.log(`[WLASL] Loaded WLASL metadata: ${wlaslData.length} entries\n`);

// Check if videos directory exists
if (!fs.existsSync(WLASL_VIDEOS_DIR)) {
  console.warn(`[WLASL] WARNING: Videos directory not found at: ${WLASL_VIDEOS_DIR}`);
  console.warn('[WLASL] Will create mapping based on metadata only (videos may not exist)');
}

// Get list of available video files
const availableVideos = new Set();
if (fs.existsSync(WLASL_VIDEOS_DIR)) {
  const videoFiles = fs.readdirSync(WLASL_VIDEOS_DIR);
  videoFiles.forEach(file => {
    if (file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mov')) {
      // Remove extension for matching
      const videoId = file.replace(/\.(mp4|avi|mov)$/i, '');
      availableVideos.add(videoId);
    }
  });
  console.log(`[WLASL] Found ${availableVideos.size} video files on disk\n`);
}

// Build mapping
const mapping = {};
let totalInstances = 0;
let validInstances = 0;
let skippedGlosses = 0;

for (const entry of wlaslData) {
  const gloss = entry.gloss.toLowerCase().trim();
  
  // Filter to MVP vocabulary if provided
  if (mvpVocab.length > 0 && !mvpVocab.includes(gloss)) {
    skippedGlosses++;
    continue;
  }
  
  if (!entry.instances || !Array.isArray(entry.instances)) {
    continue;
  }
  
  const validVideos = [];
  
  for (const instance of entry.instances) {
    totalInstances++;
    const videoId = instance.video_id;
    
    // Check if video is missing
    if (missingVideos.has(videoId)) {
      continue;
    }
    
    // Check if video exists on disk
    if (availableVideos.size > 0 && !availableVideos.has(videoId)) {
      continue;
    }
    
    // Determine file extension
    let extension = '.mp4';
    if (fs.existsSync(WLASL_VIDEOS_DIR)) {
      const possibleFiles = [`${videoId}.mp4`, `${videoId}.avi`, `${videoId}.mov`];
      const foundFile = possibleFiles.find(f => {
        try {
          return fs.existsSync(path.join(WLASL_VIDEOS_DIR, f));
        } catch {
          return false;
        }
      });
      if (foundFile) {
        extension = path.extname(foundFile);
      }
    }
    
    validVideos.push(`${videoId}${extension}`);
    validInstances++;
  }
  
  // Only include glosses with at least 1 valid video
  if (validVideos.length > 0) {
    mapping[gloss] = validVideos;
    console.log(`[WLASL] ✅ ${gloss}: ${validVideos.length} video(s)`);
  }
}

console.log(`\n[WLASL] Summary:`);
console.log(`  Total instances in metadata: ${totalInstances}`);
console.log(`  Valid instances: ${validInstances}`);
console.log(`  Glosses with videos: ${Object.keys(mapping).length}`);
console.log(`  Skipped (not in MVP vocab): ${skippedGlosses}`);

// Write mapping.json
fs.writeFileSync(OUTPUT_MAPPING_PATH, JSON.stringify(mapping, null, 2));
console.log(`\n[WLASL] ✅ Mapping written to: ${OUTPUT_MAPPING_PATH}`);
console.log(`[WLASL] Next step: Run 'node scripts/copy-wlasl-videos.js' to copy videos`);

