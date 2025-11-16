# Troubleshooting: Signs Not Showing / Not Matching Captions

## Quick Debugging Steps

### 1. Check Browser Console (F12)
Open the browser console and look for these logs:

**Good signs:**
- `[Deaflix] New caption: ...` - Captions are being detected
- `[Deaflix] Extracted words: [...]` - Words are being extracted
- `[Deaflix] ✅ Queued X videos` - Videos found and queued
- `[Deaflix] ✅ Video playing successfully` - Videos are playing

**Problems:**
- `[Deaflix] ⚠️ No ASL videos found for words` - Words don't match mapping
- `[Deaflix] ❌ Invalid response from backend` - Backend connection issue
- `[Deaflix] Proxy error` - Backend not running

### 2. Check Backend Console
Look at your backend terminal for:
- `[Backend] ✅ Found video for "word"` - Word matched
- `[Backend] ❌ No video found for word: "word"` - Word not in mapping
- `[Backend] Summary: Found X/Y words` - How many words matched

### 3. Current Available Words
Your `mapping.json` only has **10 words**:
- hello, world, you, how, are, thank, welcome, please, yes, no

**Most YouTube captions won't contain these exact words!**

## Solutions

### Solution 1: Test with Simple Videos
Use YouTube videos that say these exact words:
- "Hello, how are you?"
- "Thank you"
- "Yes, please"
- "Welcome"

### Solution 2: Add More Words to Mapping
1. Add ASL video files to `backend/data/asl_dataset/[word]/[word].mp4`
2. Update `backend/data/mapping.json`:
   ```json
   {
     "hello": "hello/hello.mp4",
     "world": "world/world.mp4",
     "the": "the/the.mp4",
     "is": "is/is.mp4",
     ...
   }
   ```

### Solution 3: Check Video Files Exist
```bash
cd backend
ls -la data/asl_dataset/hello/
# Should show: hello.mp4
```

If files don't exist, the placeholder files (0 bytes) won't play.

### Solution 4: Verify Backend is Running
```bash
cd backend
npm start
# Should see: [Backend] Server running on http://localhost:3000
```

### Solution 5: Check Extension is Loaded
1. Go to `chrome://extensions/`
2. Make sure extension is enabled
3. Click "Reload" if you made changes
4. Refresh YouTube page

## Common Issues

### Issue: "No ASL videos found"
**Cause:** Caption words don't match words in `mapping.json`

**Fix:** 
- Check console for which words were extracted
- Add those words to `mapping.json` with corresponding video files

### Issue: "Proxy error"
**Cause:** Backend not running or wrong URL

**Fix:**
- Start backend: `cd backend && npm start`
- Check it's on `http://localhost:3000`

### Issue: "Video playback error"
**Cause:** Video file doesn't exist or is empty (0 bytes)

**Fix:**
- Replace placeholder files with real MP4 videos
- Check file exists: `ls -la backend/data/asl_dataset/hello/hello.mp4`

### Issue: Signs don't match captions
**Cause:** Word extraction is too aggressive or words don't match

**Fix:**
- Check console logs to see extracted words
- Verify words in mapping.json match exactly (case-insensitive)
- Add more words to mapping.json

## Testing Checklist

- [ ] Backend running on port 3000
- [ ] Extension loaded and enabled
- [ ] YouTube video has captions enabled (CC button)
- [ ] ASL Window toggle is ON
- [ ] Console shows caption extraction
- [ ] Console shows word matching
- [ ] Video files exist and are not empty
- [ ] Mapping.json has words that appear in captions

## Next Steps

1. **Add more words** to `mapping.json` for better coverage
2. **Use real video files** instead of placeholders
3. **Test with simple videos** that use your 10 available words
4. **Check console logs** to see exactly what's happening

