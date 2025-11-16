# Signify - Complete Architecture Overview

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Technical Stack](#technical-stack)
6. [File Structure](#file-structure)
7. [API Architecture](#api-architecture)
8. [Extension Architecture](#extension-architecture)
9. [Backend Architecture](#backend-architecture)
10. [Integration Points](#integration-points)
11. [Security & Performance](#security--performance)

---

## Project Overview

**Signify** is an ASL-first education Chrome extension that enhances video accessibility for the Deaf and hard-of-hearing community. The extension extracts captions from educational video platforms, enhances them using AI, and displays them alongside real-time ASL sign language interpretation.

### Core Mission
Make educational video content accessible through:
- **Enhanced Captions**: AI-powered cleaning and high-contrast display
- **ASL Support**: Real-time sign language interpretation synchronized with video
- **Universal Access**: Works with any video platform that has captions

### Key Features
1. Real-time caption extraction from YouTube
2. AI-powered caption enhancement and cleaning
3. ASL video/avatar display synchronized with captions
4. High-contrast, customizable caption overlay
5. Toggleable ASL window with sign language interpretation

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    YouTube Video Platform                     │
│              (HTTPS - https://youtube.com)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Captions in DOM
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Chrome Extension (Content Script)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Content Script (content.js)                         │  │
│  │  - Extracts captions from DOM                        │  │
│  │  - Monitors caption changes (MutationObserver)       │  │
│  │  - Displays caption overlay                          │  │
│  │  - Manages ASL window                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Service Worker (background.js)            │  │
│  │  - Proxies HTTP requests (HTTPS→HTTP)                 │  │
│  │  - Converts media to data URLs                        │  │
│  │  - Handles extension lifecycle                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Popup UI (popup.html/js/css)                        │  │
│  │  - User controls (toggles)                           │  │
│  │  - Status indicators                                 │  │
│  │  - Settings management                               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP Requests (proxied)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Server (Node.js/Express)            │
│              (HTTP - http://localhost:3000)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                        │  │
│  │  - POST /api/captions/enhance                        │  │
│  │  - POST /api/asl/openasl                             │  │
│  │  - GET  /api/health                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ASL Dataset Processing                              │  │
│  │  - Word-to-video mapping                             │  │
│  │  - Static file serving                               │  │
│  │  - Video/image lookup                                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ File Access
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              ASL Dataset Storage                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  backend/data/asl_dataset/                           │  │
│  │  - Letter folders (a/, b/, c/, ...)                  │  │
│  │  - Word folders (hello/, thank/, ...)                │  │
│  │  - Video files (.mp4)                                │  │
│  │  - Image files (.jpeg)                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Mapping Files                                        │  │
│  │  - asl-word-mapping.json                             │  │
│  │  - asl-video-index.json                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Chrome Extension Components

#### A. Content Script (`extension/content.js`)
**Purpose**: Main logic injected into video pages

**Key Responsibilities**:
- Caption extraction from YouTube DOM
- Real-time caption monitoring (MutationObserver)
- Caption overlay creation and management
- ASL window creation and video/image playback
- Communication with background script and popup

**Key Functions**:
- `extractCurrentCaption()` - Extracts caption text from DOM
- `updateASLAvatar()` - Updates ASL display based on captions
- `playNextVideoInSequence()` - Plays ASL media sequentially
- `stopASLSequence()` - Stops current ASL playback
- `createASLWindow()` - Creates ASL avatar window
- `createCaptionOverlay()` - Creates enhanced caption overlay

**State Management**:
```javascript
- captionsEnabled: boolean
- aslEnabled: boolean
- currentCaptionText: string
- aslVideoQueue: array
- currentVideoIndex: number
- isPlayingSequence: boolean
```

#### B. Background Service Worker (`extension/background.js`)
**Purpose**: Handles cross-origin requests and media proxying

**Key Responsibilities**:
- Proxy API requests (HTTPS→HTTP)
- Proxy media files (images/videos) to avoid mixed content
- Convert media to data URLs (base64)
- Extension lifecycle management

**Key Functions**:
- `proxyRequest` - Proxies API calls to backend
- `proxyMedia` - Fetches and converts media to data URLs

**Why Needed**:
- YouTube is HTTPS, backend is HTTP
- Browsers block mixed content (HTTPS page loading HTTP resources)
- Service workers can make HTTP requests and convert to safe data URLs

#### C. Popup UI (`extension/popup.html/js/css`)
**Purpose**: User interface for controlling extension

**Components**:
- Toggle switches for Enhanced Captions and ASL Window
- Status indicators
- Current page detection
- Settings button

**Communication**:
- Sends messages to content script via `chrome.tabs.sendMessage()`
- Stores settings in `chrome.storage.sync`
- Receives status updates from content script

#### D. Manifest (`extension/manifest.json`)
**Purpose**: Extension configuration

**Key Settings**:
- Manifest V3
- Permissions: `activeTab`, `storage`, `scripting`
- Host permissions: `https://*/*`, `http://localhost/*`
- Content scripts: Injected into YouTube pages
- Service worker: Background script

---

### 2. Backend API Server

#### A. Express Server (`backend/server.js`)
**Purpose**: RESTful API for caption enhancement and ASL video lookup

**Key Responsibilities**:
- Serve static ASL media files
- Process caption enhancement requests
- Map words to ASL videos/images
- Handle CORS for extension requests

**Middleware**:
- `cors()` - Cross-origin resource sharing
- `express.json()` - JSON body parsing
- `express.static()` - Serve ASL dataset files

#### B. API Endpoints

**1. Health Check**
```
GET /api/health
Response: { status: 'ok', message: 'Signify API is running' }
```

**2. Caption Enhancement**
```
POST /api/captions/enhance
Body: {
  captions: string[],
  videoId: string,
  platform: string
}
Response: {
  success: true,
  enhancedCaptions: array,
  originalCount: number,
  enhancedCount: number
}
```

**Process**:
- Cleans captions (removes [music], (laughter), etc.)
- Fixes grammar and formatting
- Optional: Uses OpenAI API for advanced enhancement
- Returns enhanced captions with timing

**3. ASL Video Lookup**
```
POST /api/asl/openasl
Body: {
  text: string,
  words: string[],
  videoId: string
}
Response: {
  success: true,
  videos: string[],
  words: string[],
  wordMappings: array,
  source: string
}
```

**Process**:
1. Extract words from text
2. Look up each word in ASL dataset mapping
3. Prioritize videos over images
4. Fall back to finger-spelling (letter-by-letter)
5. Return video/image URLs

#### C. ASL Dataset Processing

**File Structure**:
```
backend/data/
├── asl_dataset/
│   ├── a/
│   │   ├── hand1_a_bot_seg_1_cropped.jpeg
│   │   └── ...
│   ├── b/
│   ├── hello/
│   │   └── hello_video.mp4
│   └── ...
├── asl-word-mapping.json
└── asl-video-index.json
```

**Mapping Format** (`asl-word-mapping.json`):
```json
{
  "hello": [
    {
      "path": "data/asl_dataset/hello/video1.mp4",
      "url": "/asl-videos/hello/video1.mp4",
      "type": "video",
      "index": 0
    }
  ],
  "a": [
    {
      "path": "data/asl_dataset/a/hand1_a_bot_seg_1_cropped.jpeg",
      "url": "/asl-videos/a/hand1_a_bot_seg_1_cropped.jpeg",
      "type": "image",
      "index": 0
    }
  ]
}
```

---

## Data Flow

### Flow 1: Caption Enhancement

```
1. User enables "Enhanced Captions" toggle
   ↓
2. Content script detects YouTube captions
   ↓
3. Extracts caption text from DOM
   ↓
4. Sends to backend: POST /api/captions/enhance
   ↓
5. Backend processes:
   - Cleans text (removes [music], etc.)
   - Fixes grammar
   - Optional: AI enhancement (OpenAI)
   ↓
6. Returns enhanced captions
   ↓
7. Content script displays in overlay
```

### Flow 2: ASL Avatar Display

```
1. User enables "ASL Window" toggle
   ↓
2. Content script creates ASL window
   ↓
3. Caption appears: "Hello, how are you?"
   ↓
4. Content script extracts words: ["hello", "how", "are", "you"]
   ↓
5. Sends to backend via background proxy:
   POST /api/asl/openasl
   {
     text: "Hello, how are you?",
     words: ["hello", "how", "are", "you"]
   }
   ↓
6. Backend processes:
   - Looks up "hello" → finds video
   - Looks up "how" → finds video
   - Looks up "are" → not found, skip
   - Looks up "you" → finds video
   ↓
7. Returns video URLs:
   [
     "/asl-videos/hello/video1.mp4",
     "/asl-videos/how/video1.mp4",
     "/asl-videos/you/video1.mp4"
   ]
   ↓
8. Content script queues videos
   ↓
9. For each video:
   a. Sends to background: proxyMedia
   b. Background fetches from HTTP backend
   c. Converts to base64 data URL
   d. Returns data URL to content script
   e. Content script plays video/image
   ↓
10. Videos play sequentially in ASL window
```

### Flow 3: Real-Time Caption Monitoring

```
1. MutationObserver watches caption DOM
   ↓
2. Caption text changes detected
   ↓
3. extractCurrentCaption() extracts new text
   ↓
4. If text changed:
   - stopASLSequence() - stops old videos
   - updateASLAvatar(newText) - fetches new ASL videos
   - Updates caption overlay
   ↓
5. New ASL videos play
```

---

## Technical Stack

### Frontend (Chrome Extension)
- **Language**: Vanilla JavaScript (ES6+)
- **APIs**: Chrome Extension APIs (Manifest V3)
- **Storage**: `chrome.storage.sync` for settings
- **Communication**: `chrome.runtime.sendMessage()` for messaging
- **DOM Manipulation**: Native DOM APIs
- **Real-time Monitoring**: MutationObserver API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Dependencies**:
  - `express` - Web server
  - `cors` - Cross-origin resource sharing
  - `dotenv` - Environment variables
  - `axios` - HTTP client (if needed)
  - `openai` - OpenAI API (optional)

### Data Storage
- **ASL Dataset**: File system (`backend/data/asl_dataset/`)
- **Mappings**: JSON files (`asl-word-mapping.json`)
- **Settings**: Chrome sync storage

### External Services (Optional)
- **OpenAI API**: Caption enhancement
- **OpenASL Dataset**: ASL video source
- **Kaggle ASL Dataset**: Alternative ASL video source
- **SignLLM**: Real-time ASL generation (future)

---

## File Structure

```
signify/
├── extension/                    # Chrome Extension
│   ├── manifest.json             # Extension configuration
│   ├── popup.html                # Popup UI
│   ├── popup.js                  # Popup logic
│   ├── popup.css                 # Popup styling
│   ├── content.js                # Main content script (injected)
│   ├── background.js             # Service worker
│   ├── styles/
│   │   └── overlay.css           # Caption/ASL window styles
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── backend/                      # Node.js API Server
│   ├── server.js                 # Express server
│   ├── package.json              # Dependencies
│   ├── .env.example              # Environment variables template
│   ├── data/
│   │   ├── asl_dataset/          # ASL video/image files
│   │   ├── asl-word-mapping.json # Word-to-video mapping
│   │   └── asl-video-index.json  # Video index
│   └── scripts/
│       ├── process-asl-dataset.js # Dataset processing
│       └── setup-openasl.js      # OpenASL setup helper
│
└── Documentation/
    ├── README.md                 # Project overview
    ├── ARCHITECTURE.md           # This file
    ├── SETUP.md                  # Setup instructions
    ├── DEMO.md                   # Demo flow
    ├── DEPLOYMENT.md             # Deployment guide
    ├── HOW_IT_WORKS.md           # Technical explanation
    ├── AVATAR_IMPLEMENTATION.md  # Avatar implementation
    ├── OPENASL_AVATAR_IMPLEMENTATION.md
    ├── ASL_VIDEO_FIX.md          # Troubleshooting
    └── POPUP_TROUBLESHOOTING.md
```

---

## API Architecture

### Request/Response Patterns

#### Caption Enhancement API

**Request**:
```http
POST http://localhost:3000/api/captions/enhance
Content-Type: application/json

{
  "captions": [
    "[Music] Hello, welcome to this video.",
    "Today we'll learn about science."
  ],
  "videoId": "abc123",
  "platform": "youtube"
}
```

**Response**:
```json
{
  "success": true,
  "originalCount": 2,
  "enhancedCount": 2,
  "enhancedCaptions": [
    {
      "text": "Hello, welcome to this video.",
      "start": 0,
      "end": 3,
      "original": "[Music] Hello, welcome to this video."
    },
    {
      "text": "Today we'll learn about science.",
      "start": 3,
      "end": 6,
      "original": "Today we'll learn about science."
    }
  ],
  "videoId": "abc123",
  "platform": "youtube"
}
```

#### ASL Video Lookup API

**Request**:
```http
POST http://localhost:3000/api/asl/openasl
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "words": ["hello", "how", "are", "you"],
  "videoId": "abc123"
}
```

**Response**:
```json
{
  "success": true,
  "text": "Hello, how are you?",
  "words": ["hello", "how", "are", "you"],
  "videos": [
    "http://localhost:3000/asl-videos/hello/video1.mp4",
    "http://localhost:3000/asl-videos/how/video1.mp4",
    "http://localhost:3000/asl-videos/you/video1.mp4"
  ],
  "wordMappings": [
    {
      "word": "hello",
      "videoUrl": "http://localhost:3000/asl-videos/hello/video1.mp4",
      "source": "asl-dataset-video"
    },
    {
      "word": "how",
      "videoUrl": "http://localhost:3000/asl-videos/how/video1.mp4",
      "source": "asl-dataset-video"
    },
    {
      "word": "you",
      "videoUrl": "http://localhost:3000/asl-videos/you/video1.mp4",
      "source": "asl-dataset-video"
    }
  ],
  "source": ["asl-dataset-video"],
  "videoId": "abc123"
}
```

---

## Extension Architecture

### Content Script Lifecycle

```
1. Extension loads
   ↓
2. Content script injected into YouTube page
   ↓
3. init() called:
   - Loads settings from chrome.storage
   - Waits for video element
   - Sets up event listeners
   ↓
4. Real-time caption monitoring starts:
   - MutationObserver watches caption DOM
   - extractCurrentCaption() called on changes
   ↓
5. When captions detected:
   - Updates caption overlay (if enabled)
   - Updates ASL avatar (if enabled)
   ↓
6. User toggles features:
   - Popup sends message
   - Content script receives message
   - Enables/disables features
```

### Message Passing Architecture

```
Popup UI
  ↓ chrome.tabs.sendMessage()
Content Script
  ↓ chrome.runtime.sendMessage()
Background Service Worker
  ↓ fetch()
Backend API
```

**Message Types**:
1. `toggleCaptions` - Enable/disable caption overlay
2. `toggleASL` - Enable/disable ASL window
3. `proxyRequest` - Proxy API call to backend
4. `proxyMedia` - Proxy media file to data URL
5. `updateStatus` - Status update from content to popup

### Storage Architecture

**Chrome Sync Storage**:
```javascript
{
  captionsEnabled: boolean,
  aslEnabled: boolean,
  backendUrl: string
}
```

**Local State** (Content Script):
```javascript
{
  currentCaptionText: string,
  aslVideoQueue: array,
  currentVideoIndex: number,
  isPlayingSequence: boolean
}
```

---

## Backend Architecture

### Server Initialization

```
1. Load environment variables (.env)
   ↓
2. Initialize Express app
   ↓
3. Configure CORS
   ↓
4. Set up static file serving:
   - Serve ASL dataset from /asl-videos/
   - Set proper content-type headers
   ↓
5. Load ASL word mapping:
   - Read asl-word-mapping.json
   - Create lookup index
   ↓
6. Register API routes:
   - /api/health
   - /api/captions/enhance
   - /api/asl/openasl
   ↓
7. Start listening on port 3000
```

### ASL Video Lookup Algorithm

```
Input: words = ["hello", "how", "are", "you"]

For each word:
  1. Normalize: "hello" → "hello"
  2. Check aslDatasetMapping["hello"]
     - If found: Return video/image URL
     - If not found: Continue
  3. Check aslVideoDatabase["hello"]
     - If found: Return video URL
     - If not found: Continue
  4. Finger-spell word:
     - Split: "hello" → ["h", "e", "l", "l", "o"]
     - Look up each letter
     - Return sequence of letter images
  5. If nothing found: Skip word

Return: Array of video/image URLs
```

### Static File Serving

**Route**: `/asl-videos/*`

**Mapping**:
- Request: `/asl-videos/hello/video1.mp4`
- File: `backend/data/asl_dataset/hello/video1.mp4`
- Response: Video file with proper content-type

**CORS Headers**:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
```

---

## Integration Points

### 1. YouTube Integration

**Caption Extraction**:
- Selectors: `.ytp-caption-segment`, `.ytp-caption-window-container`
- Method: DOM querying + MutationObserver
- Real-time: Updates as captions change

**Video Detection**:
- Selector: `video` element
- Events: `play`, `pause`, `timeupdate`
- Synchronization: ASL videos sync with main video

### 2. ASL Dataset Integration

**Current**: File-based dataset
- Videos/images stored in `backend/data/asl_dataset/`
- JSON mapping file for fast lookups
- Static file serving via Express

**Future Options**:
- **OpenASL**: Large-scale dataset with phrase-level annotations
- **SignLLM**: Real-time ASL generation API
- **Kaggle ASL**: Pre-processed word-level videos

### 3. AI Integration (Optional)

**OpenAI API**:
- Endpoint: `/api/captions/enhance`
- Model: GPT-4
- Purpose: Advanced caption cleaning and enhancement
- Fallback: Basic text processing if API unavailable

---

## Security & Performance

### Security Considerations

1. **Mixed Content**:
   - Problem: HTTPS YouTube can't load HTTP backend
   - Solution: Background script proxies all requests
   - Media converted to data URLs (base64)

2. **CORS**:
   - Backend configured with `cors()` middleware
   - Allows all origins (for development)
   - Production: Restrict to extension origin

3. **Content Script Isolation**:
   - Runs in isolated world
   - Can't access page JavaScript
   - Safe DOM manipulation

### Performance Optimizations

1. **Caching**:
   - ASL video URLs cached in content script
   - Mapping file loaded once at startup
   - Settings cached in chrome.storage

2. **Efficient Media Loading**:
   - Videos/images loaded on-demand
   - Base64 conversion in background (non-blocking)
   - Chunked base64 encoding for large files

3. **Real-time Processing**:
   - MutationObserver for efficient DOM watching
   - Debounced caption extraction
   - Queue-based video playback

### Limitations & Trade-offs

1. **Base64 Encoding**:
   - Pros: Works across HTTPS/HTTP boundary
   - Cons: ~33% size increase, slower for large videos
   - Solution: Works well for images, acceptable for short videos

2. **Dataset Size**:
   - Current: File-based, limited by disk space
   - Future: Cloud storage or CDN

3. **Real-time Generation**:
   - Current: Pre-recorded videos only
   - Future: SignLLM for real-time ASL generation

---

## Deployment Architecture

### Development
```
Local Machine
├── Chrome Extension (unpacked)
├── Backend Server (localhost:3000)
└── ASL Dataset (local files)
```

### Production (Recommended)
```
Cloud Server (Railway/Render/AWS)
├── Backend API (HTTPS)
└── ASL Dataset (CDN or cloud storage)

Chrome Web Store
└── Extension Package (.crx)
```

### Environment Variables

**Backend** (`.env`):
```
PORT=3000
BACKEND_URL=http://localhost:3000
OPENAI_API_KEY=your_key_here (optional)
```

**Extension**:
- Stored in `chrome.storage.sync`
- Default: `http://localhost:3000`
- Can be updated via popup settings

---

## Future Enhancements

### Phase 1: Multi-Platform Support
- Vimeo integration
- Coursera integration
- Generic video player support

### Phase 2: Advanced ASL
- Real-time avatar generation (SignLLM)
- Phrase-level ASL matching
- Smooth video transitions

### Phase 3: User Features
- Customizable caption styling
- ASL vocabulary learning mode
- Community-contributed ASL clips
- Multiple ASL avatar options

### Phase 4: AI Enhancements
- Automatic caption generation (speech-to-text)
- Context-aware caption enhancement
- Multi-language support

---

## Technical Decisions

### Why Manifest V3?
- Modern Chrome extension standard
- Better security model
- Service workers for background tasks
- Required for Chrome Web Store

### Why Background Script Proxy?
- HTTPS pages can't load HTTP resources
- Service workers can make HTTP requests
- Converts to safe data URLs
- No CORS issues

### Why Data URLs for Media?
- Works across service worker/content script boundary
- No mixed content errors
- Simple implementation
- Trade-off: Larger payload size

### Why File-Based Dataset?
- Simple to set up
- No external API dependencies
- Fast lookups with JSON mapping
- Easy to update/add videos

---

## Troubleshooting Guide

### Common Issues

1. **Mixed Content Errors**
   - Cause: HTTPS page loading HTTP resources
   - Solution: Media proxied through background script

2. **Captions Not Detected**
   - Check: Captions enabled on YouTube video
   - Check: Console for selector errors
   - Solution: Update caption selectors in content.js

3. **ASL Videos Not Loading**
   - Check: Backend running on port 3000
   - Check: ASL dataset in correct location
   - Check: Mapping file exists and is valid JSON

4. **Extension Not Loading**
   - Check: manifest.json is valid
   - Check: All files present
   - Check: Chrome extensions page for errors

---

## API Reference

### Backend Endpoints

#### `GET /api/health`
Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "message": "Signify API is running"
}
```

#### `POST /api/captions/enhance`
Enhance and clean video captions.

**Request Body**:
```json
{
  "captions": ["caption text 1", "caption text 2"],
  "videoId": "youtube_video_id",
  "platform": "youtube"
}
```

**Response**:
```json
{
  "success": true,
  "originalCount": 2,
  "enhancedCount": 2,
  "enhancedCaptions": [
    {
      "text": "Enhanced caption 1",
      "start": 0,
      "end": 3,
      "original": "caption text 1"
    }
  ],
  "videoId": "youtube_video_id",
  "platform": "youtube"
}
```

#### `POST /api/asl/openasl`
Get ASL videos for text/phrases.

**Request Body**:
```json
{
  "text": "Hello, how are you?",
  "words": ["hello", "how", "are", "you"],
  "videoId": "youtube_video_id"
}
```

**Response**:
```json
{
  "success": true,
  "text": "Hello, how are you?",
  "words": ["hello", "how", "are", "you"],
  "videos": [
    "http://localhost:3000/asl-videos/hello/video1.mp4",
    "http://localhost:3000/asl-videos/how/video1.mp4",
    "http://localhost:3000/asl-videos/you/video1.mp4"
  ],
  "wordMappings": [
    {
      "word": "hello",
      "videoUrl": "http://localhost:3000/asl-videos/hello/video1.mp4",
      "source": "asl-dataset-video"
    }
  ],
  "source": ["asl-dataset-video"],
  "videoId": "youtube_video_id"
}
```

---

## Data Structures

### ASL Word Mapping Format

```json
{
  "word": [
    {
      "path": "relative/path/to/file.mp4",
      "url": "/asl-videos/word/file.mp4",
      "type": "video",
      "index": 0,
      "sequenceCount": 1
    }
  ]
}
```

### Caption Format

```json
{
  "text": "Enhanced caption text",
  "start": 0,
  "end": 3,
  "original": "Original caption text"
}
```

---

## Development Workflow

### Local Development

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Load Extension**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extension/` folder

3. **Test**:
   - Go to YouTube video with captions
   - Click extension icon
   - Toggle features ON
   - Check console for debug messages

### Adding New Features

1. **Extension Changes**:
   - Edit `content.js` for page logic
   - Edit `popup.js` for UI logic
   - Edit `background.js` for background tasks
   - Reload extension to test

2. **Backend Changes**:
   - Edit `server.js` for API changes
   - Restart server: `npm start`
   - Test with curl or Postman

3. **ASL Dataset Updates**:
   - Add videos to `backend/data/asl_dataset/`
   - Run: `node backend/scripts/process-asl-dataset.js`
   - Restart backend server

---

## Performance Metrics

### Expected Performance

- **Caption Extraction**: < 100ms
- **Backend API Response**: < 500ms
- **Media Proxy**: < 1s per image, < 3s per video
- **ASL Video Playback**: Real-time (synchronized)

### Optimization Opportunities

1. **Media Caching**: Cache data URLs in content script
2. **Batch Requests**: Request multiple videos at once
3. **Lazy Loading**: Load ASL videos only when needed
4. **CDN**: Use CDN for ASL dataset in production

---

## Security Best Practices

1. **Input Validation**: Validate all API inputs
2. **Rate Limiting**: Prevent API abuse
3. **Error Handling**: Don't expose sensitive info in errors
4. **HTTPS**: Use HTTPS in production
5. **Content Security Policy**: Configure CSP for extension

---

## Conclusion

Signify is a comprehensive accessibility solution that bridges the gap between educational video content and the Deaf/hard-of-hearing community. The architecture is designed to be:

- **Modular**: Components can be updated independently
- **Extensible**: Easy to add new features and platforms
- **Performant**: Optimized for real-time caption processing
- **Accessible**: Works with existing video platforms

The system successfully demonstrates how modern web technologies can be combined to create meaningful accessibility tools.

---

**Last Updated**: November 2024  
**Version**: 1.0.0  
**License**: MIT

