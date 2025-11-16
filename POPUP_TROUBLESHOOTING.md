# Popup Window Not Showing - Troubleshooting

## Quick Fixes

### 1. **Reload the Extension**
1. Go to `chrome://extensions/`
2. Find "Signify - ASL-First Education"
3. Click the **reload icon** (circular arrow) on the extension card
4. Try clicking the extension icon again

### 2. **Check Extension is Enabled**
1. Go to `chrome://extensions/`
2. Make sure the toggle next to "Signify" is **ON** (blue)
3. If it's off, turn it on

### 3. **Check Extension Icon is Visible**
1. Look at the Chrome toolbar (top right)
2. You should see the Signify icon (or puzzle piece if no icon)
3. If you don't see it:
   - Click the puzzle piece icon (extensions menu)
   - Find "Signify" and click the pin icon to pin it to toolbar

### 4. **Check for Errors**
1. Go to `chrome://extensions/`
2. Find "Signify"
3. Click "Errors" or "Inspect views: service worker"
4. Look for red error messages
5. Share any errors you see

### 5. **Right-Click the Extension Icon**
- Right-click the Signify icon in toolbar
- Select "Inspect popup"
- This opens DevTools for the popup
- Check Console tab for errors

### 6. **Verify Files Exist**
Make sure these files exist in `extension/` folder:
- ✅ `popup.html`
- ✅ `popup.js`
- ✅ `popup.css`
- ✅ `manifest.json`

### 7. **Check Manifest is Valid**
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Look for any red error messages on the extension card
4. Common errors:
   - "Manifest file is missing or unreadable"
   - "Could not load manifest"

### 8. **Try Unloading and Reloading**
1. Go to `chrome://extensions/`
2. Click "Remove" on Signify
3. Click "Load unpacked" again
4. Select the `extension/` folder
5. Try clicking the icon

## Common Issues

### Issue: "This extension may have been corrupted"
**Fix:** 
- Remove extension
- Re-download/re-clone the project
- Load again

### Issue: Extension icon shows but popup doesn't open
**Fix:**
- Right-click icon → "Inspect popup"
- Check console for JavaScript errors
- Fix any errors in popup.js

### Issue: No extension icon visible
**Fix:**
- Click puzzle piece icon (extensions menu)
- Find Signify
- Click pin icon to pin to toolbar

### Issue: Popup opens but is blank
**Fix:**
- Right-click icon → "Inspect popup"
- Check Console for errors
- Check if popup.html, popup.js, popup.css are loading

## Debug Steps

1. **Open Extension Management:**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode:**
   - Toggle in top-right corner

3. **Check Extension Status:**
   - Should show "Enabled"
   - Should show version "1.0.0"
   - Should NOT show any red error messages

4. **Inspect Popup:**
   - Right-click extension icon
   - Select "Inspect popup"
   - Check Console for errors

5. **Check Service Worker:**
   - In extensions page, click "Inspect views: service worker"
   - Check for errors in console

## Still Not Working?

Share:
1. Screenshot of `chrome://extensions/` page
2. Any error messages from "Inspect popup"
3. Any error messages from service worker
4. What happens when you click the extension icon (nothing? error? blank?)


