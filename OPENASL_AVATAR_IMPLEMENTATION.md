# OpenASL Avatar Implementation Guide

## Overview

This guide explains how to implement real ASL videos from OpenASL dataset and create an avatar that maps to YouTube captions in real-time.

## Architecture

```
YouTube Caption → Extract Text → Backend API → OpenASL Video Lookup → Display Avatar Video
```

## Step 1: Download OpenASL Dataset

### Option A: OpenASL Dataset (Recommended)

1. **Clone OpenASL Repository:**
   ```bash
   git clone https://github.com/chevalierNoir/OpenASL.git
   cd OpenASL
   ```

2. **Download Videos:**
   ```bash
   # Download the dataset (requires Python)
   python prep/download.py --tsv data/openasl-v1.0.tsv --dest ./videos
   ```

3. **Process Videos (Crop to signer):**
   ```bash
   python prep/crop_video.py \
     --tsv data/openasl-v1.0.tsv \
     --bbox data/bbox-v1.0.json \
     --raw ./videos \
     --output ./processed_videos
   ```

4. **Copy to Backend:**
   ```bash
   # Copy processed videos to backend
   cp -r processed_videos/* /path/to/signify/backend/data/openasl-videos/
   ```

### Option B: Kaggle ASL Dataset (Easier)

1. Go to [Kaggle ASL Dataset](https://www.kaggle.com/datasets/ayuraj/asl-dataset)
2. Download and extract to `backend/data/asl-dataset/`
3. Videos are already organized by word

## Step 2: Process Dataset for Fast Lookup

Create a script to index all videos and map them to words/phrases:

```javascript
// backend/scripts/process-openasl.js
const fs = require('fs');
const path = require('path');

// This will create a mapping: word → video file paths
// Format: { "hello": ["/asl-videos/hello/video1.mp4", ...] }
```

## Step 3: Update Backend to Serve Videos

The backend already serves static files, but we need to:
1. Support video files (MP4)
2. Create proper video-to-word mappings
3. Handle phrase-level matching (not just single words)

## Step 4: Avatar Display Options

### Option A: Pre-recorded Video Clips (Current Approach)
- **Pros:** Simple, works with existing dataset
- **Cons:** Limited to words in dataset, no smooth transitions
- **Implementation:** Play video clips sequentially for each word

### Option B: Real-time Avatar (Advanced)
- **Pros:** Smooth, can sign any text, more natural
- **Cons:** Requires avatar rendering engine (SignLLM, etc.)
- **Implementation:** Use SignLLM or similar to generate avatar animations

## Step 5: Implementation Plan

### Phase 1: Video Support (Current)
✅ Backend serves videos
✅ Extension plays videos
✅ Word-to-video mapping

### Phase 2: Phrase Matching
- Match entire phrases, not just words
- Use OpenASL's phrase-level annotations
- Better context understanding

### Phase 3: Avatar System
- Single avatar window
- Smooth video transitions
- Synchronized with captions

## Next Steps

1. **Download OpenASL dataset**
2. **Process videos** to create word mappings
3. **Update backend** to prioritize videos over images
4. **Test with real videos**

