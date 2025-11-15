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

// Proxy API requests to backend
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'proxyRequest') {
    const url = request.url;
    const method = request.method || 'POST';
    const body = request.body;

    fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, data: data });
    })
    .catch(error => {
      console.error('[Background] Proxy request error:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep channel open for async response
  }

  // Proxy media files (images/videos) to avoid mixed content errors
  if (request.type === 'proxyMedia') {
    const mediaUrl = request.url;

    fetch(mediaUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.blob();
    })
    .then(blob => {
      // Convert to base64 data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    })
    .then(dataUrl => {
      sendResponse({ success: true, dataUrl: dataUrl });
    })
    .catch(error => {
      console.error('[Background] Media proxy error:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep channel open for async response
  }
});
