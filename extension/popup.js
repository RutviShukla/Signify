// Popup UI Logic
document.addEventListener('DOMContentLoaded', async () => {
  const captionsToggle = document.getElementById('captionsToggle');
  const aslToggle = document.getElementById('aslToggle');
  const statusText = document.getElementById('statusText');
  const statusDot = document.querySelector('.status-dot');
  const currentPage = document.getElementById('currentPage');
  const pageStatus = document.getElementById('pageStatus');
  const settingsBtn = document.getElementById('settingsBtn');

  // Load saved settings
  const loadSettings = async () => {
    const result = await chrome.storage.sync.get(['captionsEnabled', 'aslEnabled']);
    captionsToggle.checked = result.captionsEnabled || false;
    aslToggle.checked = result.aslEnabled || false;
    updateStatus();
  };

  // Get current tab info
  const updateTabInfo = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentPage.textContent = new URL(tab.url).hostname;
      
      // Check if it's a supported video platform
      const isVideoPage = tab.url.includes('youtube.com/watch') || 
                         tab.url.includes('youtube.com/embed');
      
      if (isVideoPage) {
        pageStatus.textContent = 'Video detected ✓';
        pageStatus.style.color = '#28a745';
      } else {
        pageStatus.textContent = 'No video detected';
        pageStatus.style.color = '#dc3545';
      }
    }
  };

  // Update status indicator
  const updateStatus = () => {
    const captionsOn = captionsToggle.checked;
    const aslOn = aslToggle.checked;
    
    if (captionsOn || aslOn) {
      statusText.textContent = 'Active';
      statusDot.classList.remove('inactive');
    } else {
      statusText.textContent = 'Ready';
      statusDot.classList.add('inactive');
    }
  };

  // Send message to content script
  const sendMessage = async (action, data = {}) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action, ...data });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  // Captions toggle handler
  captionsToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ captionsEnabled: enabled });
    await sendMessage('toggleCaptions', { enabled });
    updateStatus();
  });

  // ASL toggle handler
  aslToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ aslEnabled: enabled });
    await sendMessage('toggleASL', { enabled });
    updateStatus();
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    // Open settings page or show settings modal
    chrome.runtime.openOptionsPage();
  });

  // Initialize
  await loadSettings();
  await updateTabInfo();
  updateStatus();

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateStatus') {
      pageStatus.textContent = message.status;
      pageStatus.style.color = message.color || '#666';
    }
  });
});

