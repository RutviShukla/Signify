# WLASL Dataset Setup Guide

## Overview

This guide explains how to set up the WLASL (Word-Level American Sign Language) dataset for the Signify extension.

## Prerequisites

1. **Download WLASL Dataset**:
   - Visit: https://github.com/dxli94/WLASL
   - Download `WLASL_v0.3.json` (metadata)
   - Download video files (or use provided subset)

2. **Required Files**:
   - `backend/data/WLASL_v0.3.json` - Metadata file
   - `backend/data/WLASL_videos/` - Directory with video files
   - `backend/data/missing.txt` (optional) - List of missing video IDs

## Setup Steps

### Step 1: Download WLASL Dataset

```bash
# Create data directory
mkdir -p backend/data/WLASL_videos

# Download metadata (you'll need to get this from WLASL repository)
# Place WLASL_v0.3.json in backend/data/

# Download videos (or use a subset)
# Place video files in backend/data/WLASL_videos/
```

### Step 2: Generate Mapping

```bash
cd backend
node scripts/generate-wlasl-mapping.js
```

This script will:
- Load WLASL metadata
- Filter out missing videos
- Check which videos exist on disk
- Create `mapping.json` with only valid videos
- Filter to MVP vocabulary (top 200 words)

**Output**: `backend/data/mapping.json`

### Step 3: Copy Videos to Organized Structure

```bash
node scripts/copy-wlasl-videos.js
```

This script will:
- Read `mapping.json`
- Create folders: `backend/data/asl_dataset/{gloss}/`
- Copy each video to the appropriate folder

**Output**: Organized video structure in `backend/data/asl_dataset/`

### Step 4: Restart Backend

```bash
npm start
```

The backend will now use the WLASL mapping for word lookups.

## File Structure After Setup

```
backend/data/
├── WLASL_v0.3.json          # Original metadata
├── WLASL_videos/            # Original video files
│   ├── 02001.mp4
│   ├── 02002.mp4
│   └── ...
├── mapping.json             # Generated mapping (gloss → video files)
├── mvp_vocab.json          # Top 200 words list
├── asl_dataset/            # Organized videos
│   ├── hello/
│   │   ├── 02001.mp4
│   │   └── 02002.mp4
│   ├── world/
│   │   └── 03112.mp4
│   └── ...
└── fingerspelling/         # Letter images (optional)
    ├── a.png
    ├── b.png
    └── ...
```

## Mapping.json Format

```json
{
  "hello": ["02001.mp4", "02002.mp4"],
  "world": ["03112.mp4"],
  "thanks": ["15440.mp4", "15441.mp4"]
}
```

## How It Works

1. **Word Normalization**: English words → ASL glosses
   - "running" → "run"
   - "thanks" → "thank"
   - "hi" → "hello"

2. **WLASL Lookup**: Gloss → video files from mapping.json

3. **Finger-spelling Fallback**: If gloss not found, spell letter-by-letter

4. **Sequence Generation**: Returns array of videos/images to play

## Troubleshooting

### "Mapping file not found"
- Run: `node scripts/generate-wlasl-mapping.js`

### "Videos directory not found"
- Create `backend/data/WLASL_videos/` and add video files

### "No videos found"
- Check that videos exist in `WLASL_videos/` directory
- Verify video IDs match metadata

### "Gloss not in MVP vocab"
- Edit `mvp_vocab.json` to add more words
- Or modify script to include all glosses

## Next Steps

After setup, the extension will:
- Automatically use WLASL videos for matched words
- Fall back to finger-spelling for unmatched words
- Display signs synchronized with YouTube captions

