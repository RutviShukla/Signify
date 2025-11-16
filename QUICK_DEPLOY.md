# Quick Deployment Steps for Hackathon

## 5-Minute Deployment (Railway)

### 1. Deploy Backend (3 minutes)

1. Go to [railway.app](https://railway.app) → Sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js - wait for deployment
5. Copy your URL: `https://your-app.up.railway.app`

### 2. Update Extension (1 minute)

**Option A: Quick Console Method**
1. Open YouTube page
2. Press F12 → Console tab
3. Paste and run:
   ```javascript
   chrome.storage.sync.set({ 
     backendUrl: 'https://your-app.up.railway.app' 
   }, () => {
     console.log('✅ Backend URL updated!');
     location.reload();
   });
   ```

**Option B: Code Update (Permanent)**
1. Open `extension/background.js`
2. Change line 9:
   ```javascript
   backendUrl: 'https://your-app.up.railway.app'
   ```
3. Reload extension: `chrome://extensions/` → Reload

### 3. Test (1 minute)

1. Go to YouTube video with captions
2. Open extension popup → Toggle "ASL Avatar" ON
3. Check console (F12) - should see `[Signify]` messages
4. Test backend: `curl https://your-app.up.railway.app/api/health`

## Done! ✅

Your extension now works with the deployed backend. Judges can test it on any device!

## Troubleshooting

**Backend not responding?**
- Check Railway dashboard for deployment status
- Test: `curl https://your-app.up.railway.app/api/health`

**Extension can't connect?**
- Verify URL has no trailing slash
- Check console for CORS errors
- Make sure backend URL is saved: `chrome.storage.sync.get(['backendUrl'], console.log)`

**Videos not loading?**
- Check that `data/asl_dataset/` is in your repo
- Test video URL: `curl https://your-app.up.railway.app/asl/hello/hello.mp4`

