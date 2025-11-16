# Signify Setup Instructions

## Quick Start

### 1. Chrome Extension Setup

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `extension/` folder from this project

**Note**: You'll need to create icon files for the extension:
- `extension/icons/icon16.png` (16x16 pixels)
- `extension/icons/icon48.png` (48x48 pixels)
- `extension/icons/icon128.png` (128x128 pixels)

For now, you can use placeholder images or create simple colored squares with "DF" text.

### 2. Backend Server Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file (optional - for OpenAI API)
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY if you have one

# Start the server
npm start
```

The server will run on `http://localhost:3000`

### 3. Test the Extension

1. Open a YouTube video with captions enabled
2. Click the Signify extension icon
3. Toggle "Enhanced Captions" ON
4. Toggle "ASL Window" ON
5. Play the video and observe the enhanced captions and ASL window

## Troubleshooting

### Extension not loading
- Make sure you selected the `extension/` folder (not the root folder)
- Check Chrome's extension page for error messages
- Ensure manifest.json is valid JSON

### Backend not connecting
- Verify the server is running: `curl http://localhost:3000/api/health`
- Check that port 3000 is not in use by another application
- Review backend console logs for errors

### Captions not appearing
- Ensure the YouTube video has captions enabled
- Check browser console (F12) for JavaScript errors
- Verify content script is injected (check in DevTools → Sources)

### ASL window not showing
- Check that the toggle is enabled in popup
- Verify backend is running and accessible
- Check browser console for fetch errors

## Development Mode

For development with auto-reload:

```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

For Chrome extension development:
- After making changes, go to `chrome://extensions/`
- Click the refresh icon on the Signify extension card

## Next Steps

1. **Add Real Icons**: Create proper icon files for the extension
2. **Integrate ASL Dataset**: Connect to SignLLM, OpenASL, or Kaggle ASL
3. **Add More Platforms**: Extend support to Vimeo, Coursera, etc.
4. **Improve Caption Extraction**: Use YouTube Data API for better caption access
5. **Add Settings Page**: Create options.html for user preferences

## Production Deployment

### Backend
- Deploy to Heroku, Railway, or AWS
- Update CORS settings for production domain
- Set up environment variables securely

### Extension
- Package extension: `chrome://extensions/` → Pack extension
- Submit to Chrome Web Store (requires developer account)

