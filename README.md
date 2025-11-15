# Deaflix - ASL-First Accessibility Layer

Chrome extension that enhances YouTube captions and provides ASL (American Sign Language) support through an intelligent overlay system.

## Features

- **Real-time Caption Extraction**: Extracts captions from YouTube videos using MutationObserver
- **Caption Enhancement**: Sends captions to backend for cleaning and enhancement
- **High-Contrast Overlay**: Displays enhanced captions in a customizable overlay
- **ASL Avatar Window**: Toggleable ASL video window that plays sign language videos sequentially
- **Background Proxy**: Uses service worker to proxy HTTP requests (avoids mixed content errors)

## Project Structure

```
deaflix/
├── extension/
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   ├── content.js
│   ├── background.js
│   ├── styles/
│   │   └── overlay.css
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── backend/
│   ├── server.js
│   ├── package.json
│   └── data/
│       ├── asl_dataset/
│       │   ├── hello/
│       │   │   └── hello.mp4
│       │   ├── world/
│       │   │   └── world.mp4
│       │   └── ...
│       └── mapping.json
└── README.md
```

## Installation

### Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

### Backend Server

```bash
cd backend
npm install
npm start
```

The server will run on `http://localhost:3000`

## ASL Dataset Setup

1. Create folders for each word in `backend/data/asl_dataset/`
2. Place video files (`.mp4`) in each folder
3. Update `backend/data/mapping.json` with word-to-path mappings:

```json
{
  "hello": "hello/hello.mp4",
  "world": "world/world.mp4"
}
```

## Usage

1. Navigate to a YouTube video with captions enabled
2. Click the Deaflix extension icon
3. Toggle "Enhanced Captions" to enable caption overlay
4. Toggle "ASL Avatar" to show ASL video window
5. Captions are automatically extracted and ASL videos play sequentially

## API Endpoints

### `POST /api/asl/video-map`

Maps words to ASL video URLs.

**Request:**
```json
{
  "words": ["hello", "world"]
}
```

**Response:**
```json
{
  "success": true,
  "videos": [
    "http://localhost:3000/asl/hello/hello.mp4",
    "http://localhost:3000/asl/world/world.mp4"
  ],
  "wordsFound": 2,
  "wordsTotal": 2
}
```

### `POST /api/captions/enhance`

Enhances and cleans captions.

**Request:**
```json
{
  "captions": ["[Music] Hello, welcome to this video."]
}
```

**Response:**
```json
{
  "success": true,
  "originalCount": 1,
  "enhancedCount": 1,
  "enhancedCaptions": ["Hello, welcome to this video."]
}
```

### `GET /asl/*`

Serves static ASL video files from `backend/data/asl_dataset/`

## Development

### Extension Files

- `content.js`: Main logic injected into YouTube pages
  - Extracts captions via MutationObserver
  - Manages caption overlay and ASL window
  - Communicates with backend via background worker

- `background.js`: Service worker
  - Proxies API requests to backend
  - Converts media files to data URLs (avoids mixed content)

- `popup.js`: UI controls
  - Toggles for Enhanced Captions and ASL Avatar
  - Sends messages to content script

### Backend Files

- `server.js`: Express server
  - `/api/asl/video-map`: Maps words to video URLs
  - `/api/captions/enhance`: Cleans captions
  - `/asl/*`: Serves static files

## License

MIT
