// Popup UI Logic
document.addEventListener('DOMContentLoaded', async () => {
  const aslToggle = document.getElementById('aslToggle');
  const captionToggle = document.getElementById('captionToggle');

  // Customization elements
  const aslWidgetBgOptions = document.querySelectorAll('input[name="aslWidgetBg"]');
  const captionBgOptions = document.querySelectorAll('input[name="captionBg"]');
  const accentColorOptions = document.querySelectorAll('input[name="accentColor"]');

  // Load saved settings
  const loadSettings = async () => {
    const result = await chrome.storage.sync.get([
      'aslEnabled',
      'captionEnabled',
      'aslWidgetBg',
      'captionBg',
      'accentColor'
    ]);

    aslToggle.checked = result.aslEnabled || false;
    captionToggle.checked = result.captionEnabled !== undefined ? result.captionEnabled : true; // Default to true

    // Load customization settings with defaults
    const aslWidgetBg = result.aslWidgetBg || 'default';
    const captionBg = result.captionBg || 'default';
    const accentColor = result.accentColor || 'blue';

    // Set radio button states
    document.querySelector(`input[name="aslWidgetBg"][value="${aslWidgetBg}"]`)?.click();
    document.querySelector(`input[name="captionBg"][value="${captionBg}"]`)?.click();
    document.querySelector(`input[name="accentColor"][value="${accentColor}"]`)?.click();
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

  // Customization handlers
  const handleCustomizationChange = async (settingName, value) => {
    const settings = {};
    settings[settingName] = value;
    await chrome.storage.sync.set(settings);

    // Send customization message to content script
    await sendMessage('updateCustomization', { [settingName]: value });
  };

  // ASL Widget Background handler
  aslWidgetBgOptions.forEach(option => {
    option.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await handleCustomizationChange('aslWidgetBg', e.target.value);
      }
    });
  });

  // Caption Background handler
  captionBgOptions.forEach(option => {
    option.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await handleCustomizationChange('captionBg', e.target.value);
      }
    });
  });

  // Accent Color handler
  accentColorOptions.forEach(option => {
    option.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await handleCustomizationChange('accentColor', e.target.value);
      }
    });
  });

  // Initialize
  await loadSettings();
});
