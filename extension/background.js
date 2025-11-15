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
});

// Handle extension icon click (optional)
chrome.action.onClicked.addListener((tab) => {
  // Popup will handle this, but we can add additional logic here if needed
});

