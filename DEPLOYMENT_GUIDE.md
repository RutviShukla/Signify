# Signify Backend Deployment Guide

This guide will help you deploy the Signify backend to a cloud service so judges can test the extension without running a local server.

## Quick Start (Railway - Recommended)

Railway is the easiest option for hackathon deployments. It's free and takes about 5 minutes.

### Step 1: Prepare Your Repository

1. Make sure your code is pushed to GitHub
2. Ensure `backend/` folder contains:
   - `server.js`
   - `package.json`
   - `Procfile` (already created)
   - `data/mapping.json` (your ASL mapping file)

### Step 2: Deploy to Railway

1. **Sign up for Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` folder (or root if backend is at root)

3. **Configure Deployment**
   - Railway will auto-detect Node.js
   - It will use the `Procfile` we created
   - Wait for deployment to complete (2-3 minutes)

4. **Get Your URL**
   - Once deployed, Railway will give you a URL like: `https://your-app-name.up.railway.app`
   - Copy this URL - you'll need it!

### Step 3: Update Extension

After deployment, you need to tell the extension to use your deployed backend:

**Option A: Update in Code (Recommended for Hackathon)**

1. Open `extension/background.js`
2. Find the line with `backendUrl: 'http://localhost:3000'`
3. Replace with your Railway URL:
   ```javascript
   backendUrl: 'https://your-app-name.up.railway.app'
   ```
4. Reload the extension in Chrome (`chrome://extensions/` → Reload)

**Option B: Set via Console (Quick Test)**

1. Open Chrome DevTools on a YouTube page
2. Go to Console tab
3. Run:
   ```javascript
   chrome.storage.sync.set({ backendUrl: 'https://your-app-name.up.railway.app' }, () => {
     console.log('Backend URL updated!');
     location.reload();
   });
   ```

### Step 4: Test Deployment

1. **Test Backend Health:**
   ```bash
   curl https://your-app-name.up.railway.app/api/health
   ```
   Should return: `{"status":"ok","message":"Signify API is running"}`

2. **Test Extension:**
   - Go to a YouTube video with captions
   - Open extension popup
   - Toggle "ASL Avatar" ON
   - Check browser console for `[Signify]` messages
   - Should see successful API calls to your deployed backend

---

## Alternative: Render.com

If Railway doesn't work, Render is another great free option.

### Step 1: Deploy to Render

1. Go to [render.com](https://render.com)
2. Sign up (free)
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `signify-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free
6. Click "Create Web Service"
7. Wait for deployment (3-5 minutes)
8. Get your URL: `https://signify-backend.onrender.com`

### Step 2: Update Extension

Same as Railway - update `backendUrl` in `extension/background.js` or via console.

---

## Alternative: Heroku

### Step 1: Install Heroku CLI

```bash
# macOS
brew install heroku/brew/heroku

# Or download from: https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2: Deploy

```bash
cd backend
heroku login
heroku create signify-backend
git push heroku main
```

### Step 3: Get URL

```bash
heroku open
# Or check: heroku info
```

Your URL will be: `https://signify-backend.herokuapp.com`

---

## Important Notes

### 1. Static Files (ASL Videos)

If you have ASL video files in `backend/data/asl_dataset/`, they need to be included in your deployment:

- **Railway**: Automatically includes all files in the repo
- **Render**: Automatically includes all files in the repo
- **Heroku**: Automatically includes all files in the repo

**Note**: Large video files (>100MB) might cause issues. For hackathon demos, you can:
- Use a smaller subset of videos
- Or host videos separately (e.g., Cloudinary, AWS S3)

### 2. Environment Variables

If you need to set environment variables (like API keys):

- **Railway**: Project → Variables tab
- **Render**: Environment → Environment Variables
- **Heroku**: `heroku config:set KEY=value`

### 3. CORS Configuration

The backend already has CORS configured to allow all origins. This is fine for hackathon demos. For production, you'd want to restrict it.

### 4. Port Configuration

The backend uses `process.env.PORT || 3000`, which works with all deployment platforms automatically.

---

## Testing Checklist

Before demo, verify:

- [ ] Backend is deployed and accessible
- [ ] Health check returns success: `curl https://your-url/api/health`
- [ ] Extension updated with deployed URL
- [ ] Extension reloaded in Chrome
- [ ] Test on YouTube video with captions
- [ ] Check browser console for successful API calls
- [ ] ASL videos play correctly (if you have videos deployed)

---

## Troubleshooting

### Backend returns 404

- Check that your deployment includes the `backend/` folder
- Verify `server.js` is in the root of deployed directory
- Check deployment logs for errors

### Extension can't connect

- Verify backend URL is correct (no trailing slash)
- Check CORS is enabled (should be in server.js)
- Test backend directly: `curl https://your-url/api/health`
- Check browser console for CORS errors

### Videos don't load

- Verify `data/asl_dataset/` folder is included in deployment
- Check that video files are in the repo (not in .gitignore)
- Test video URL directly: `curl https://your-url/asl/hello/hello.mp4`

### Deployment fails

- Check deployment logs for errors
- Verify `package.json` has correct dependencies
- Ensure Node.js version is compatible (check `package.json` for `engines` field)

---

## Quick Reference

### Update Extension Backend URL

**Method 1: Code Update**
```javascript
// extension/background.js
backendUrl: 'https://your-deployed-url.com'
```

**Method 2: Console Command**
```javascript
chrome.storage.sync.set({ backendUrl: 'https://your-deployed-url.com' });
location.reload();
```

### Test Backend
```bash
curl https://your-deployed-url.com/api/health
```

### Test ASL Endpoint
```bash
curl -X POST https://your-deployed-url.com/api/asl/video-map \
  -H "Content-Type: application/json" \
  -d '{"words":["hello","world"]}'
```

---

## For Hackathon Demo

**Recommended Setup:**
1. Deploy to Railway (easiest, ~5 minutes)
2. Update extension with deployed URL
3. Test on your machine
4. Share extension + deployed URL with judges
5. Judges can test on their own devices!

**Talking Points:**
- "Backend is deployed to cloud for scalability"
- "Extension works on any device with the deployed backend"
- "No local setup required for testing"
- "Production-ready architecture"

Good luck with your demo! 🚀

