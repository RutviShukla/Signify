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

// Handle extension icon click (optional)
chrome.action.onClicked.addListener((tab) => {
  // Popup will handle this, but we can add additional logic here if needed
});

