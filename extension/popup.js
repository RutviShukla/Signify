// Popup UI Logic
document.addEventListener('DOMContentLoaded', async () => {
  const aslToggle = document.getElementById('aslToggle');
  const captionToggle = document.getElementById('captionToggle');

  // Load saved settings
  const loadSettings = async () => {
    const result = await chrome.storage.sync.get(['aslEnabled', 'captionEnabled']);
    aslToggle.checked = result.aslEnabled || false;
    captionToggle.checked = result.captionEnabled !== undefined ? result.captionEnabled : true; // Default to true
  };

  // Send message to content script
  const sendMessage = async (type, data = {}) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type, ...data });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  // ASL toggle handler
  aslToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ aslEnabled: enabled });
    await sendMessage('toggleASL', { enabled });
  });

  // Caption toggle handler
  captionToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ captionEnabled: enabled });
    await sendMessage('toggleCaption', { enabled });
  });

  // Initialize
  await loadSettings();
});
