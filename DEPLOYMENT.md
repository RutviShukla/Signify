# Deployment Guide

## Local Development (Current Setup)

### ✅ Works For:
- Testing on your own machine
- Development
- Quick demos on your laptop

### How It Works:
- Extension connects to `http://localhost:3000`
- Backend runs on your computer
- **Both must be on the same machine**

### Setup:
```bash
# Terminal 1: Start backend
cd backend
npm install
npm start

# Terminal 2: Load extension in Chrome
# Go to chrome://extensions/
# Click "Load unpacked" → select extension/ folder
```

### Limitations:
- ❌ Only works on your computer
- ❌ Won't work if you demo on a different machine
- ❌ Judges can't test it on their devices

---

## Deployed Backend (Recommended for Hackathon)

### ✅ Works For:
- Demo on any computer
- Judges can test it
- More professional presentation
- Works on any device

### Free Deployment Options:

#### Option 1: Railway (Easiest)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your backend folder
5. Railway auto-detects Node.js
6. Get your URL: `https://your-app.railway.app`

#### Option 2: Render
1. Go to [render.com](https://render.com)
2. Sign up
3. "New" → "Web Service"
4. Connect GitHub repo
5. Set:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
6. Get your URL: `https://your-app.onrender.com`

#### Option 3: Heroku
1. Go to [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. In `backend/` folder:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

### After Deployment:

1. **Update Extension** to use deployed URL:
   - Open extension popup
   - Go to Settings (or update in code)
   - Change `backendUrl` to your deployed URL

2. **Update Extension Code** (if needed):
   ```javascript
   // In popup.js or content.js, you can set:
   chrome.storage.sync.set({
     backendUrl: 'https://your-app.railway.app'
   });
   ```

---

## Quick Setup for Hackathon Demo

### If Using Local Backend:
1. ✅ Start backend: `cd backend && npm start`
2. ✅ Load extension in Chrome
3. ✅ Test on YouTube
4. ⚠️ **Keep your laptop running during demo**

### If Using Deployed Backend:
1. ✅ Deploy backend (Railway/Render - takes 5 minutes)
2. ✅ Update extension with deployed URL
3. ✅ Load extension in Chrome
4. ✅ Works on any computer!

---

## Testing Your Deployment

### Check Backend is Live:
```bash
curl https://your-app.railway.app/api/health
```

Should return:
```json
{"status":"ok","message":"Signify API is running"}
```

### Test ASL Endpoint:
```bash
curl -X POST https://your-app.railway.app/api/asl/video \
  -H "Content-Type: application/json" \
  -d '{"phrase":"hello","videoId":"test"}'
```

---

## For Hackathon Judges

### If Using Local:
- "Backend is running locally for demo purposes"
- "Production version would be deployed to cloud"
- Keep your laptop connected and running

### If Using Deployed:
- "Backend is deployed and accessible from anywhere"
- "You can test it on your own device"
- More impressive! 🎉

---

## Recommendation

**For Hackathon:** Deploy to Railway or Render (free, takes 5 minutes)
- More professional
- Works reliably
- Judges can test it
- No need to keep laptop running

**For Development:** Use localhost
- Faster iteration
- No deployment needed
- Easy debugging

---

## Environment Variables (If Needed)

If you add API keys later, set them in deployment platform:
- Railway: Project → Variables
- Render: Environment → Environment Variables
- Heroku: `heroku config:set KEY=value`

