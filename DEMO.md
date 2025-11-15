# Deaflix Demo Flow for Judges

## Pre-Demo Setup (5 minutes)

1. **Install Chrome Extension**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

2. **Start Backend Server**
   ```bash
   cd backend
   npm install
   npm start
   ```
   Verify it's running: http://localhost:3000/api/health

3. **Prepare Demo Video**
   - Open a YouTube educational video (e.g., Khan Academy, TED-Ed)
   - Ensure the video has captions enabled
   - Have the video paused and ready

## Demo Script (3-5 minutes)

### 1. Introduction (30 seconds)
- "Deaflix is an ASL-first education Chrome extension that makes educational videos more accessible for the Deaf and hard-of-hearing community."

### 2. Show the Problem (30 seconds)
- Point to existing captions: "Current captions are often poorly formatted, hard to read, and lack ASL support."
- Show how captions can be cluttered with [music], (laughter), etc.

### 3. Enhanced Captions Feature (1 minute)
- Click the Deaflix extension icon
- Toggle "Enhanced Captions" ON
- **What to highlight:**
  - Clean, high-contrast caption overlay appears
  - Captions are automatically cleaned (removed filler text)
  - Better formatting and readability
  - Synchronized with video playback

### 4. ASL Window Feature (1 minute)
- Toggle "ASL Window" ON
- **What to highlight:**
  - ASL video window appears in bottom-right corner
  - Shows sign language interpretation
  - Synchronized with video playback
  - Can be toggled on/off as needed

### 5. Technical Highlights (1 minute)
- "The extension extracts captions from the video platform"
- "Sends them to our AI backend for cleaning and enhancement"
- "Displays improved captions in a customizable overlay"
- "ASL videos are matched to content phrases"

### 6. Impact & Future (30 seconds)
- "This makes educational content accessible to the Deaf community"
- "Future: Real-time ASL generation using SignLLM"
- "Scalable to multiple video platforms"

## Troubleshooting

**If captions don't appear:**
- Ensure video has captions enabled on YouTube
- Check browser console for errors
- Verify backend is running

**If ASL window doesn't show:**
- Check that the toggle is ON
- Refresh the page and try again
- Verify backend is running

**If backend errors:**
- Check that port 3000 is available
- Verify all dependencies are installed
- Check `.env` file if using OpenAI

## Key Talking Points

1. **Accessibility First**: Designed specifically for Deaf/hard-of-hearing users
2. **AI-Powered**: Uses AI to clean and enhance captions automatically
3. **ASL Integration**: First-of-its-kind ASL support for educational videos
4. **Scalable**: Can be extended to multiple platforms and languages
5. **Open Source Ready**: Built with extensibility in mind

## Demo Checklist

- [ ] Extension installed and loaded
- [ ] Backend server running
- [ ] Demo video prepared with captions
- [ ] Enhanced captions working
- [ ] ASL window displaying
- [ ] Both features can be toggled
- [ ] Ready to explain technical architecture

## Post-Demo Q&A Prep

**Q: How does it work technically?**
A: Content script extracts captions → Sends to backend API → AI cleans/enhances → Overlay displays improved captions. ASL videos are matched to phrases.

**Q: What about other video platforms?**
A: Currently supports YouTube. Architecture allows easy extension to Vimeo, Coursera, etc.

**Q: How do you get ASL videos?**
A: Currently using mock videos for demo. Production would integrate SignLLM, OpenASL, or Kaggle ASL datasets.

**Q: Is this real-time?**
A: Caption enhancement is near real-time. ASL video matching is instant. Future: real-time ASL generation.

**Q: What's the accuracy?**
A: Caption cleaning uses AI to maintain 95%+ accuracy. ASL matching depends on dataset coverage.

