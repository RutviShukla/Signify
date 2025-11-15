# Signify (Deaflix) - ASL-First Education Chrome Extension

**CS Girlies November Hackathon - Make Learning Cool Again!**

## Project Overview

**Signify** (formerly Deaflix) is a Chrome extension designed to make educational video content more accessible for the Deaf and hard-of-hearing community. The extension enhances video captions and provides ASL (American Sign Language) support through an intelligent overlay system.

### Key Features

1. **Caption Enhancement**: 
   - Extracts existing captions from video platforms (YouTube, etc.)
   - Sends captions to AI backend for cleaning and enhancement
   - Displays improved, high-contrast captions in a customizable overlay

2. **ASL Support**:
   - Toggleable ASL video window
   - Displays pre-recorded ASL clips synchronized with video content
   - Mock demo mode for hackathon presentation

3. **User-Friendly Interface**:
   - Simple popup controls
   - Real-time caption overlay
   - Customizable display settings

## Tech Stack

### Frontend (Chrome Extension)
- **Manifest V3** - Modern Chrome extension architecture
- **Vanilla JavaScript** - No framework dependencies for lightweight extension
- **CSS3** - High-contrast, accessible styling
- **Chrome APIs**: 
  - `chrome.tabs` - Tab management
  - `chrome.storage` - Settings persistence
  - `chrome.runtime` - Message passing

### Backend
- **Node.js + Express** - RESTful API server
- **Python (Alternative)** - For AI/ML caption processing
- **OpenAI API / GPT-4** - Caption enhancement and cleaning
- **Sign Language Datasets**:
  - SignLLM (for ASL video generation)
  - Kaggle American Sign Language Dataset
  - OpenASL Dataset

### Data Processing
- **YouTube Data API** - Caption extraction
- **Web Speech API** - Fallback caption generation
- **Video.js / Plyr** - Video player integration (if needed)

## Project Structure

```
signify/
├── extension/          # Chrome extension files
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── popup.css
│   ├── content.js      # Injected into video pages
│   ├── background.js   # Service worker
│   ├── styles/
│   │   └── overlay.css
│   └── icons/
├── backend/            # API server
│   ├── server.js
│   ├── package.json
│   ├── routes/
│   │   ├── captions.js
│   │   └── asl.js
│   └── utils/
│       └── captionProcessor.js
└── README.md
```

## Installation & Setup

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

## Usage

1. Navigate to a supported video platform (YouTube, etc.)
2. Click the Deaflix extension icon
3. Toggle "Enhanced Captions" to enable caption overlay
4. Toggle "ASL Window" to show ASL video support
5. Captions are automatically extracted and enhanced

## Demo Flow

See `DEMO.md` for detailed demo instructions for judges.

## Future Enhancements

- Real-time ASL video generation using SignLLM
- Support for multiple video platforms
- Customizable caption styling
- ASL vocabulary learning mode
- Community-contributed ASL clips

## License

MIT License - Hackathon Project
