# Simple Backend Deployment for Judges

## What You're Deploying

**ONLY the backend** (Node.js server) - that's it!

- ✅ Deploy: `backend/` folder (the server)
- ❌ Don't deploy: Extension (judges install it on their computers)

## How It Works

1. **You deploy the backend** to Railway/Render (takes 5 minutes)
2. **You update the extension code** to point to your deployed backend URL
3. **Judges install the extension** on their computers (like normal)
4. **Extension connects to your deployed backend** (not localhost)

## Step-by-Step

### 1. Deploy Backend (5 minutes)

**Using Railway (easiest):**

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. **Important**: Set the root directory to `backend/` (or deploy from backend folder)
6. Wait 2-3 minutes
7. Copy your URL: `https://your-app.up.railway.app`

### 2. Update Extension Code (1 minute)

Open `extension/background.js` and change line 9:

```javascript
// Change this:
backendUrl: 'http://localhost:3000'

// To this (use your Railway URL):
backendUrl: 'https://your-app.up.railway.app'
```

Save the file.

### 3. Test It Works

1. Reload your extension: `chrome://extensions/` → Reload
2. Go to YouTube with captions
3. Toggle "ASL Avatar" ON
4. Check console (F12) - should connect to your deployed backend

### 4. Share with Judges

1. Give judges the `extension/` folder (or GitHub repo)
2. Judges install it: `chrome://extensions/` → Load unpacked
3. It automatically uses your deployed backend! ✅

## That's It!

- Backend: Deployed to cloud (always running)
- Extension: Judges install locally (runs in their browser)
- Connection: Extension → Your deployed backend

No frontend deployment needed - the extension IS the frontend!

## Quick Test

Test your deployed backend:
```bash
curl https://your-app.up.railway.app/api/health
```

Should return: `{"status":"ok","message":"Signify API is running"}`

