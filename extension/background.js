// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Deaflix extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    captionsEnabled: false,
    aslEnabled: false,
    backendUrl: 'http://localhost:3000'
  });
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if it's a supported video platform
    if (tab.url.includes('youtube.com/watch') || tab.url.includes('youtube.com/embed')) {
      // Content script will be injected automatically via manifest
      console.log('Video page detected:', tab.url);
    }
  }
});

// Proxy API requests to backend (to avoid CORS issues with HTTPS->HTTP)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'proxyRequest') {
    // Get backend URL from storage
    chrome.storage.sync.get(['backendUrl'], async (result) => {
      const backendUrl = result.backendUrl || 'http://localhost:3000';
      const url = `${backendUrl}${request.path}`;
      
      try {
        const response = await fetch(url, {
          method: request.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...request.headers
          },
          body: request.body ? JSON.stringify(request.body) : undefined
        });
        
        const data = await response.json();
        sendResponse({ success: true, data: data, status: response.status });
      } catch (error) {
        console.error('[Background] Proxy request error:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep channel open for async response
  }
  
  // Proxy media files (images/videos) to avoid mixed content errors
  if (request.action === 'proxyMedia') {
    chrome.storage.sync.get(['backendUrl'], async (result) => {
      const backendUrl = result.backendUrl || 'http://localhost:3000';
      let mediaUrl = request.url;
      
      // If URL is relative, prepend backend URL
      if (mediaUrl.startsWith('/')) {
        mediaUrl = `${backendUrl}${mediaUrl}`;
      } else if (!mediaUrl.startsWith('http')) {
        mediaUrl = `${backendUrl}/${mediaUrl}`;
      }
      
      try {
        console.log('[Background] Proxying media:', mediaUrl);
        const response = await fetch(mediaUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Convert to data URL (base64) - blob URLs don't work across service worker/content script boundary
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64 efficiently (chunked for large files to avoid stack overflow)
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const dataUrl = `data:${contentType};base64,${base64}`;
        
        console.log('[Background] Converted media to data URL (size:', blob.size, 'bytes)');
        
        sendResponse({ 
          success: true, 
          dataUrl: dataUrl,
          contentType: contentType
        });
      } catch (error) {
        console.error('[Background] Media proxy error:', error);
        console.error('[Background] Error details:', error.message, error.stack);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    return true; // Keep channel open for async response
  }
});

// Handle extension icon click (optional)
chrome.action.onClicked.addListener((tab) => {
  // Popup will handle this, but we can add additional logic here if needed
});

