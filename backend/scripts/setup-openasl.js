/**
 * Setup script for OpenASL dataset
 * This script helps download and process OpenASL videos for the Signify extension
 */

const fs = require('fs');
const path = require('path');

const OPENASL_DATA_DIR = path.join(__dirname, '..', 'data', 'openasl');
const OUTPUT_MAPPING = path.join(__dirname, '..', 'data', 'openasl-word-mapping.json');

console.log('OpenASL Setup Script');
console.log('===================');
console.log('');
console.log('This script helps set up OpenASL dataset for Signify.');
console.log('');
console.log('Steps to set up OpenASL:');
console.log('');
console.log('1. Clone OpenASL repository:');
console.log('   git clone https://github.com/chevalierNoir/OpenASL.git');
console.log('   cd OpenASL');
console.log('');
console.log('2. Download videos:');
console.log('   python prep/download.py --tsv data/openasl-v1.0.tsv --dest ./videos');
console.log('');
console.log('3. Process videos (crop to signer):');
console.log('   python prep/crop_video.py \\');
console.log('     --tsv data/openasl-v1.0.tsv \\');
console.log('     --bbox data/bbox-v1.0.json \\');
console.log('     --raw ./videos \\');
console.log('     --output ./processed_videos');
console.log('');
console.log('4. Copy processed videos to backend:');
console.log('   cp -r processed_videos/* ' + OPENASL_DATA_DIR);
console.log('');
console.log('5. Run processing script:');
console.log('   node scripts/process-openasl-videos.js');
console.log('');
console.log('For more information, see: OPENASL_AVATAR_IMPLEMENTATION.md');

