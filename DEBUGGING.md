# Debugging ASL Video Widget


## Quick Debugging Steps

### 1. Check Browser Console
Open DevTools (F12) → Console tab. Look for `[Deaflix]` messages.

**What to look for:**
- `[Deaflix] Creating ASL window...` - Window is being created
- `[Deaflix] Found caption with selector: ...` - Captions are being detected
- `[Deaflix] Fetching ASL video from backend...` - API call is being made
- `[Deaflix] Backend response status: 200` - Backend is responding
- `[Deaflix] Setting ASL video src to: ...` - Video URL is being set

### 2. Check Backend is Running
```bash
curl http://localhost:3000/api/health
```
Should return: `{"status":"ok","message":"Deaflix API is running"}`

### 3. Test ASL Endpoint Directly
```bash
curl -X POST http://localhost:3000/api/asl/video \
  -H "Content-Type: application/json" \
  -d '{"phrase":"hello","videoId":"test"}'
```

Should return:
```json
{
  "success": true,
  "phrase": "hello",
  "videoUrl": "https://via.placeholder.com/...",
  "source": "mock",
  "videoId": "test"
}
```

### 4. Check Network Tab
In DevTools → Network tab:
- Look for request to `http://localhost:3000/api/asl/video`
- Check if it's successful (200 status)
- Check the response body

### 5. Common Issues

#### Issue: "ASL window not found"
**Cause:** Window wasn't created or was removed
**Fix:** Toggle ASL off and on again

#### Issue: "No caption text provided"
**Cause:** Captions aren't being detected
**Fix:** 
- Make sure captions are enabled on YouTube video
- Check console for caption detection messages
- Try refreshing the page

#### Issue: CORS Error
**Cause:** Backend CORS not configured properly
**Fix:** Check `backend/server.js` has `app.use(cors())`

#### Issue: "Backend error: 500"
**Cause:** Backend server error
**Fix:** Check backend console logs

#### Issue: Video doesn't load
**Cause:** Placeholder URL might be blocked
**Fix:** Check if `via.placeholder.com` is accessible

### 6. Manual Test

Open browser console on YouTube page and run:
```javascript
// Test if ASL window exists
document.getElementById('deaflix-asl-window')

// Test if captions are detected
document.querySelectorAll('.ytp-caption-segment')

// Manually trigger ASL update (if window exists)
// This will be available in the extension context
```

### 7. Verify Extension is Loaded

1. Go to `chrome://extensions/`
2. Find "Deaflix - ASL-First Education"
3. Click "Inspect views: service worker" (if available)
4. Check for errors

### 8. Test on YouTube Video

1. Go to a YouTube video with captions
2. Enable captions (CC button)
3. Open extension popup
4. Toggle "ASL Window" ON
5. Watch console for debug messages
6. Check if ASL window appears in bottom-right

## Expected Flow

1. ✅ ASL toggle ON → Window created
2. ✅ Caption detected → Phrase extracted
3. ✅ API call to backend → Video URL received
4. ✅ Video element src updated → Video loads
5. ✅ Video plays (if main video is playing)

## Still Not Working?

1. **Check all console errors** - Look for red error messages
2. **Verify backend is accessible** - Try `curl` command above
3. **Check CORS** - Network tab should show successful request
4. **Verify captions exist** - YouTube video must have captions enabled
5. **Try different video** - Some videos might not have captions

## Debug Commands

In browser console (on YouTube page):
```javascript
// Check if extension injected
console.log('Extension loaded:', typeof chrome !== 'undefined');

// Check current caption text
// (This needs to be in content script context)
```

