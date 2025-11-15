// Popup UI Logic
document.addEventListener('DOMContentLoaded', async () => {
  const captionsToggle = document.getElementById('captionsToggle');
  const aslToggle = document.getElementById('aslToggle');

  // Load saved settings
  const loadSettings = async () => {
    const result = await chrome.storage.sync.get(['captionsEnabled', 'aslEnabled']);
    captionsToggle.checked = result.captionsEnabled || false;
    aslToggle.checked = result.aslEnabled || false;
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

  // Captions toggle handler
  captionsToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ captionsEnabled: enabled });
    await sendMessage('toggleCaptions', { enabled });
  });

  // ASL toggle handler
  aslToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.sync.set({ aslEnabled: enabled });
    await sendMessage('toggleASL', { enabled });
  });

  // Initialize
  await loadSettings();
});
