/**
 * Copy WLASL videos to organized folder structure
 * 
 * This script:
 * 1. Reads mapping.json
 * 2. Creates folders: backend/data/asl_dataset/{gloss}/
 * 3. Copies each video to the appropriate folder
 */

const fs = require('fs');
const path = require('path');

// Paths - Updated to use wasl-dataset directory
const MAPPING_PATH = path.join(__dirname, '..', 'data', 'mapping.json');
const WLASL_DATASET_DIR = path.join(__dirname, '..', 'data', 'wasl-dataset');
const WLASL_VIDEOS_DIR = path.join(WLASL_DATASET_DIR, 'videos');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'asl_dataset');

console.log('[Copy] Starting video copy process...\n');

// Load mapping
if (!fs.existsSync(MAPPING_PATH)) {
  console.error(`[Copy] ERROR: mapping.json not found at: ${MAPPING_PATH}`);
  console.error('[Copy] Run "node scripts/generate-wlasl-mapping.js" first');
  process.exit(1);
}

const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
console.log(`[Copy] Loaded mapping: ${Object.keys(mapping).length} glosses\n`);

// Check source directory
if (!fs.existsSync(WLASL_VIDEOS_DIR)) {
  console.error(`[Copy] ERROR: WLASL videos directory not found at: ${WLASL_VIDEOS_DIR}`);
  console.error('[Copy] Please ensure videos are in backend/data/wasl-dataset/videos/');
  process.exit(1);
}

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`[Copy] Created output directory: ${OUTPUT_DIR}\n`);
}

let totalCopied = 0;
let totalSkipped = 0;
let totalErrors = 0;

// Process each gloss
for (const [gloss, videos] of Object.entries(mapping)) {
  const glossDir = path.join(OUTPUT_DIR, gloss);
  
  // Create gloss folder
  if (!fs.existsSync(glossDir)) {
    fs.mkdirSync(glossDir, { recursive: true });
  }
  
  console.log(`[Copy] Processing "${gloss}": ${videos.length} video(s)`);
  
  for (const videoFile of videos) {
    const sourcePath = path.join(WLASL_VIDEOS_DIR, videoFile);
    const destPath = path.join(glossDir, videoFile);
    
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[Copy] ⚠️  Source not found: ${videoFile}`);
      totalSkipped++;
      continue;
    }
    
    // Check if already copied
    if (fs.existsSync(destPath)) {
      console.log(`[Copy]   ✓ Already exists: ${videoFile}`);
      totalSkipped++;
      continue;
    }
    
    // Copy file
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[Copy]   ✓ Copied: ${videoFile}`);
      totalCopied++;
    } catch (error) {
      console.error(`[Copy]   ❌ Error copying ${videoFile}:`, error.message);
      totalErrors++;
    }
  }
}

console.log(`\n[Copy] Summary:`);
console.log(`  Copied: ${totalCopied} videos`);
console.log(`  Skipped: ${totalSkipped} videos (already exist or missing)`);
console.log(`  Errors: ${totalErrors}`);
console.log(`\n[Copy] ✅ Copy process complete!`);

