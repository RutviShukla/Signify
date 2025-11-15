 # Avatar Implementation Guide

## Overview

This guide explains how to implement an ASL avatar that maps YouTube captions to sign language videos in real-time.

## Architecture

```
YouTube Video
    ↓
Captions Extracted (Real-time)
    ↓
Text Sent to Backend
    ↓
Backend: Match Text → ASL Videos
    ↓
Extension: Display Videos in Avatar Window
    ↓
Avatar Shows ASL Signs Synchronized with Video
```

## Implementation Options

### Option 1: Pre-recorded Video Clips (Current - Recommended for Hackathon)

**How it works:**
- Each word/phrase has a pre-recorded ASL video
- Videos play sequentially as captions appear
- Simple, works with existing datasets

**Pros:**
- ✅ Simple to implement
- ✅ Works with OpenASL/Kaggle datasets
- ✅ No complex rendering needed
- ✅ Fast and reliable

**Cons:**
- ❌ Limited to words in dataset
- ❌ No smooth transitions between words
- ❌ Can't handle new words

**Implementation:**
- Use OpenASL or Kaggle ASL dataset
- Map words to video files
- Play videos in sequence

### Option 2: Real-time Avatar (Advanced - Future)

**How it works:**
- Use SignLLM or similar to generate avatar animations
- Avatar renders signs in real-time
- Smooth, natural signing

**Pros:**
- ✅ Can sign any text
- ✅ Smooth transitions
- ✅ More natural appearance

**Cons:**
- ❌ Complex to implement
- ❌ Requires avatar rendering engine
- ❌ May need GPU/cloud processing

**Implementation:**
- Integrate SignLLM API
- Or use avatar rendering library
- Generate animations on-the-fly

## Current Implementation (Option 1)

### Step 1: Dataset Setup

1. **Download OpenASL or Kaggle ASL dataset**
2. **Process videos** to create word mappings
3. **Store in `backend/data/asl-dataset/`**

### Step 2: Backend Processing

The backend:
- Serves videos from `/asl-videos/` endpoint
- Maps words to video files
- Returns video URLs for each word

### Step 3: Extension Display

The extension:
- Receives video URLs from backend
- Plays videos sequentially in avatar window
- Synchronizes with YouTube captions

## How Caption Mapping Works

### Example Flow:

1. **Caption appears:** "Hello, how are you?"
2. **Words extracted:** ["hello", "how", "are", "you"]
3. **Backend lookup:**
   - "hello" → `/asl-videos/hello/video1.mp4`
   - "how" → `/asl-videos/how/video1.mp4`
   - "are" → (not found, skip or finger-spell)
   - "you" → `/asl-videos/you/video1.mp4`
4. **Videos queued:** [hello.mp4, how.mp4, you.mp4]
5. **Avatar plays videos in sequence**

## Avatar Window Features

- **Position:** Bottom-right corner (customizable)
- **Size:** 300x400px (adjustable)
- **Display:** Shows ASL videos matching captions
- **Synchronization:** Updates as captions change
- **Controls:** Close button, can be toggled on/off

## Next Steps for Full Implementation

### Phase 1: Video Support ✅
- [x] Backend serves video files
- [x] Extension plays videos
- [x] Word-to-video mapping

### Phase 2: Phrase Matching
- [ ] Match entire phrases (not just words)
- [ ] Use OpenASL phrase-level annotations
- [ ] Better context understanding

### Phase 3: Smooth Transitions
- [ ] Fade between videos
- [ ] Better timing synchronization
- [ ] Handle missing words gracefully

### Phase 4: Avatar Enhancement (Optional)
- [ ] Single continuous video stream
- [ ] Real-time avatar rendering
- [ ] Customizable avatar appearance

## Quick Start

1. **Download ASL dataset:**
   ```bash
   # Option A: Kaggle (easier)
   # Download from: https://www.kaggle.com/datasets/ayuraj/asl-dataset
   # Extract to: backend/data/asl-dataset/
   
   # Option B: OpenASL (more comprehensive)
   git clone https://github.com/chevalierNoir/OpenASL.git
   # Follow OpenASL setup instructions
   ```

2. **Process dataset:**
   ```bash
   cd backend
   node scripts/process-asl-dataset.js
   ```

3. **Restart backend:**
   ```bash
   npm start
   ```

4. **Test:**
   - Go to YouTube with captions
   - Toggle ASL Window ON
   - Watch avatar sign along with captions!

## For Hackathon Demo

**What to say:**
- "Our extension extracts captions in real-time from YouTube"
- "Maps each word to ASL sign language videos from OpenASL dataset"
- "Displays an avatar that signs along with the video"
- "Currently using pre-recorded videos; future: real-time avatar generation"

**Demo flow:**
1. Show YouTube video with captions
2. Toggle ASL Window ON
3. Point out avatar signing along with captions
4. Explain: "Each word maps to an ASL video from our dataset"

