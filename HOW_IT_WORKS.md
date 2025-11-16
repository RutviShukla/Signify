# How Signify Works - Technical Explanation


## Overview

Signify extracts captions from videos in **real-time** and matches them to ASL videos. Here's how it works:

## Caption Extraction Flow

### 1. **Real-Time Caption Monitoring**
- Uses `MutationObserver` to watch YouTube's caption DOM elements
- Detects when captions appear/change on screen
- Extracts text from `.ytp-caption-segment` elements (YouTube's caption container)
- Updates every time captions change (real-time, not just once)

### 2. **What Happens When Captions Are Found**

**If Enhanced Captions is ON:**
- Caption text is extracted from DOM
- Text is sent to backend API for cleaning/enhancement
- Enhanced caption is displayed in high-contrast overlay
- Overlay updates in real-time as new captions appear

**If ASL Window is ON:**
- Caption text is extracted
- Key phrases are extracted from the caption (first 3-5 words)
- Phrase is sent to backend API: `POST /api/asl/video`
- Backend looks up ASL video for that phrase
- ASL video is displayed in the window
- Videos are cached to avoid repeated API calls

### 3. **What Happens When NO Captions Exist**

Currently, the extension:
- Shows a message: "No captions found. Please enable captions on the video."
- Cannot generate ASL videos without caption text
- Requires user to enable captions on the video platform

**Future Enhancement Options:**
- Use Web Speech API for speech-to-text (requires microphone permission)
- Use YouTube Data API to fetch full transcript if available
- Use AI transcription services (Google Cloud Speech, AWS Transcribe)

## ASL Video Matching

### Current Implementation (Demo)
1. Caption text: "Hello, welcome to this educational video"
2. Extract key phrase: "hello welcome to this educational"
3. Send to backend: `{ phrase: "hello welcome to this educational", videoId: "..." }`
4. Backend checks mock database or ASL dataset
5. Returns ASL video URL
6. Extension displays video in ASL window

### For Production (With Real ASL Datasets)

**Option 1: SignLLM Integration**
```javascript
// Backend would call SignLLM API
const aslVideo = await signLLM.generateVideo(phrase);
```

**Option 2: OpenASL Dataset**
```javascript
// Query OpenASL dataset for matching phrase
const aslVideo = await openASL.findVideo(phrase);
```

**Option 3: Kaggle ASL Dataset**
- Download dataset locally
- Create lookup index by phrase/word
- Return video file path or URL

## Code Flow Diagram

```
User enables "Enhanced Captions" or "ASL Window"
    ↓
startRealTimeCaptionExtraction() called
    ↓
MutationObserver watches caption DOM
    ↓
Caption text changes detected
    ↓
extractCurrentCaption() extracts text
    ↓
┌─────────────────┬─────────────────┐
│ Enhanced Captions│   ASL Window    │
│                  │                 │
│ Send to backend  │ Extract phrases │
│ for enhancement  │                 │
│                  │ Send to backend │
│ Display overlay  │ Get ASL video │
│                  │                 │
│                  │ Display video   │
└─────────────────┴─────────────────┘
```

## Key Functions

### `startRealTimeCaptionExtraction()`
- Sets up MutationObserver on YouTube caption container
- Watches for DOM changes (new captions appearing)
- Calls `extractCurrentCaption()` when changes detected

### `extractCurrentCaption()`
- Queries multiple CSS selectors to find caption text
- Updates `currentCaptionText` variable
- Triggers caption overlay update
- Triggers ASL video update

### `updateASLVideo(captionText)`
- Extracts key phrases from caption
- Checks cache first (avoid duplicate API calls)
- Fetches ASL video from backend
- Updates ASL window video element

### `extractKeyPhrases(text)`
- Simple NLP: splits text, filters short words
- Returns first 3-5 words as main phrase
- Can be improved with proper NLP library

## Limitations & Solutions

### Current Limitations

1. **Requires Existing Captions**
   - Solution: Add speech-to-text fallback
   - Solution: Use YouTube Data API for transcripts

2. **Simple Phrase Extraction**
   - Solution: Use NLP library (Natural, Compromise.js) for better phrase extraction
   - Solution: Use sentence-level matching instead of word-level

3. **Mock ASL Videos**
   - Solution: Integrate real ASL datasets (SignLLM, OpenASL, Kaggle)

4. **No Offline Support**
   - Solution: Cache ASL videos locally
   - Solution: Pre-download common phrases

### For Hackathon Demo

**What Works:**
- ✅ Real-time caption extraction from YouTube
- ✅ Caption overlay display
- ✅ ASL window with video placeholder
- ✅ Backend API structure ready for ASL dataset integration

**What to Explain:**
- "Currently uses mock ASL videos for demo"
- "Production would integrate SignLLM/OpenASL datasets"
- "Real-time caption extraction enables live ASL translation"
- "Extension works with any video that has captions enabled"

## Testing

1. **Test with Captions:**
   - Go to YouTube video with captions ON
   - Enable extension features
   - Watch captions update in real-time
   - See ASL window (with placeholder)

2. **Test without Captions:**
   - Go to video with captions OFF
   - Extension shows message
   - User must enable captions first

3. **Test Backend:**
   - Start backend: `cd backend && npm start`
   - Check health: `curl http://localhost:3000/api/health`
   - Test ASL endpoint: `curl -X POST http://localhost:3000/api/asl/video -H "Content-Type: application/json" -d '{"phrase":"hello"}'`

