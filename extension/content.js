// Content Script - Injected into video pages
(function() {
  'use strict';

  let captionsEnabled = false;
  let aslEnabled = false;
  let captionOverlay = null;
  let aslWindow = null;
  let currentCaptions = [];
  let videoElement = null;
  let captionObserver = null;
  let currentCaptionText = '';
  let aslVideoCache = new Map(); // Cache ASL videos by phrase

  // Initialize
  const init = async () => {
    // Load settings
    const result = await chrome.storage.sync.get(['captionsEnabled', 'aslEnabled']);
    captionsEnabled = result.captionsEnabled || false;
    aslEnabled = result.aslEnabled || false;

    // Wait for video element
    waitForVideo();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(handleMessage);
  };

  // Wait for video element to load
  const waitForVideo = () => {
    const checkVideo = setInterval(() => {
      videoElement = document.querySelector('video');
      if (videoElement) {
        clearInterval(checkVideo);
        setupVideoListeners();
        if (captionsEnabled) {
          extractCaptions();
        }
      }
    }, 500);
  };

  // Setup video event listeners
  const setupVideoListeners = () => {
    if (!videoElement) return;

    // Listen for time updates to sync captions
    videoElement.addEventListener('timeupdate', () => {
      if (captionsEnabled && captionOverlay) {
        updateCaptionDisplay();
      }
    });

    // Listen for play/pause
    videoElement.addEventListener('play', () => {
      if (aslEnabled && aslWindow) {
        playASLVideo();
      }
    });

    videoElement.addEventListener('pause', () => {
      if (aslEnabled && aslWindow) {
        pauseASLVideo();
      }
    });

    // Start real-time caption monitoring if enabled
    if (captionsEnabled || aslEnabled) {
      startRealTimeCaptionExtraction();
    }
  };

  // Extract captions from YouTube
  const extractCaptions = async () => {
    try {
      // Method 1: Try to get from YouTube's caption track
      const captionTracks = await getYouTubeCaptions();
      
      if (captionTracks && captionTracks.length > 0) {
        // Use YouTube captions
        currentCaptions = captionTracks;
        await enhanceCaptions(captionTracks);
      } else {
        // Fallback: Try to extract from DOM
        const domCaptions = extractCaptionsFromDOM();
        if (domCaptions.length > 0) {
          await enhanceCaptions(domCaptions);
        } else {
          showMessage('No captions found. Please enable captions on the video.');
        }
      }
    } catch (error) {
      console.error('Error extracting captions:', error);
      showMessage('Error extracting captions. Please try again.');
    }
  };

  // Get YouTube captions (simplified - would need YouTube API in production)
  const getYouTubeCaptions = async () => {
    // For demo: Extract from YouTube's caption container
    const captionContainer = document.querySelector('.ytp-caption-window-container');
    if (captionContainer) {
      // This is a simplified version
      // In production, you'd use YouTube Data API to get caption tracks
      return null; // Placeholder
    }
    return null;
  };

  // Extract captions from DOM (fallback)
  const extractCaptionsFromDOM = () => {
    const captions = [];
    const captionElements = document.querySelectorAll('.ytp-caption-segment, .caption-text');
    
    captionElements.forEach((el, index) => {
      captions.push({
        text: el.textContent.trim(),
        start: index * 3, // Mock timing
        end: (index + 1) * 3
      });
    });

    return captions;
  };

  // Real-time caption extraction using MutationObserver
  const startRealTimeCaptionExtraction = () => {
    // Stop existing observer
    if (captionObserver) {
      captionObserver.disconnect();
    }

    // Find YouTube caption container
    const captionContainer = document.querySelector('.ytp-caption-window-container, .ytp-caption-container');
    
    if (!captionContainer) {
      // Try again after a delay
      setTimeout(() => startRealTimeCaptionExtraction(), 1000);
      return;
    }

    // Observer for caption changes
    captionObserver = new MutationObserver(() => {
      extractCurrentCaption();
    });

    // Watch for changes in caption container
    captionObserver.observe(captionContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Also extract immediately
    extractCurrentCaption();
  };

  // Extract current caption text from DOM in real-time
  const extractCurrentCaption = () => {
    // Try multiple selectors for YouTube captions
    const captionSelectors = [
      '.ytp-caption-segment',
      '.caption-window .caption-text',
      '.ytp-caption-window-container span',
      '.ytp-caption-window-container .ytp-caption-segment',
      '[class*="caption"]',
      '.ytp-caption-container .ytp-caption-segment'
    ];

    let captionText = '';
    for (const selector of captionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        captionText = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0)
          .join(' ');
        if (captionText) {
          console.log('[Deaflix] Found caption with selector:', selector, 'Text:', captionText);
          break;
        }
      }
    }

    // If we found a new caption
    if (captionText && captionText !== currentCaptionText) {
      console.log('[Deaflix] New caption detected:', captionText);
      currentCaptionText = captionText;
      
      // Update caption overlay if enabled
      if (captionsEnabled && captionOverlay) {
        captionOverlay.textContent = captionText;
        captionOverlay.style.display = 'block';
      }

      // Update ASL video if enabled
      if (aslEnabled && aslWindow) {
        console.log('[Deaflix] ASL enabled, updating video...');
        updateASLVideo(captionText);
      } else if (aslEnabled && !aslWindow) {
        console.log('[Deaflix] ASL enabled but window not created yet');
      }
    } else if (!captionText && captionOverlay) {
      // Hide overlay if no caption
      captionOverlay.style.display = 'none';
    }
  };

  // Get backend URL from storage or use default
  const getBackendUrl = async () => {
    const result = await chrome.storage.sync.get(['backendUrl']);
    return result.backendUrl || 'http://localhost:3000';
  };

  // Send captions to backend for enhancement
  const enhanceCaptions = async (captions) => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/captions/enhance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captions: captions.map(c => c.text || c),
          videoId: getVideoId(),
          platform: 'youtube'
        })
      });

      if (!response.ok) {
        throw new Error('Backend error');
      }

      const data = await response.json();
      currentCaptions = data.enhancedCaptions || captions;
      createCaptionOverlay();
    } catch (error) {
      console.error('Error enhancing captions:', error);
      // Fallback: use original captions
      currentCaptions = captions;
      createCaptionOverlay();
    }
  };

  // Get video ID from URL
  const getVideoId = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v') || 'demo';
  };

  // Create caption overlay
  const createCaptionOverlay = () => {
    if (captionOverlay) {
      captionOverlay.remove();
    }

    captionOverlay = document.createElement('div');
    captionOverlay.id = 'deaflix-caption-overlay';
    captionOverlay.className = 'deaflix-overlay';
    
    const videoContainer = videoElement.parentElement;
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(captionOverlay);
    }

    updateCaptionDisplay();
  };

  // Update caption display based on current video time
  const updateCaptionDisplay = () => {
    if (!captionOverlay || !videoElement || !currentCaptions.length) return;

    const currentTime = videoElement.currentTime;
    
    // Find caption for current time
    const currentCaption = currentCaptions.find(c => {
      const start = c.start || 0;
      const end = c.end || start + 3;
      return currentTime >= start && currentTime <= end;
    });

    if (currentCaption) {
      captionOverlay.textContent = currentCaption.text || currentCaption;
      captionOverlay.style.display = 'block';
    } else {
      captionOverlay.style.display = 'none';
    }
  };

  // Create ASL window
  const createASLWindow = () => {
    console.log('[Deaflix] Creating ASL window...');
    
    if (aslWindow) {
      aslWindow.remove();
    }

    aslWindow = document.createElement('div');
    aslWindow.id = 'deaflix-asl-window';
    aslWindow.className = 'deaflix-asl-window';
    
    const aslVideo = document.createElement('video');
    aslVideo.id = 'deaflix-asl-video';
    aslVideo.controls = false;
    aslVideo.muted = true;
    aslVideo.loop = true;
    aslVideo.style.width = '100%';
    aslVideo.style.height = '100%';
    aslVideo.style.objectFit = 'cover';
    
    // Add event listeners for debugging
    aslVideo.addEventListener('loadstart', () => console.log('[Deaflix] ASL video loadstart'));
    aslVideo.addEventListener('loadeddata', () => console.log('[Deaflix] ASL video loadeddata'));
    aslVideo.addEventListener('error', (e) => {
      console.error('[Deaflix] ASL video error:', e);
      console.error('[Deaflix] Video src:', aslVideo.src);
    });

    // Set initial placeholder
    aslVideo.src = 'https://via.placeholder.com/300x400/667eea/ffffff?text=ASL+Video';
    console.log('[Deaflix] Set initial placeholder video');
    
    // If we already have caption text, try to load ASL video
    if (currentCaptionText) {
      console.log('[Deaflix] Current caption exists, updating ASL video:', currentCaptionText);
      updateASLVideo(currentCaptionText);
    } else {
      console.log('[Deaflix] No current caption text, will update when captions appear');
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'deaflix-close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => toggleASL(false);

    aslWindow.appendChild(aslVideo);
    aslWindow.appendChild(closeBtn);

    document.body.appendChild(aslWindow);
    console.log('[Deaflix] ASL window created and appended to body');
  };

  // Update ASL video based on current caption text
  const updateASLVideo = async (captionText) => {
    console.log('[Deaflix] updateASLVideo called with:', captionText);
    
    if (!aslWindow) {
      console.log('[Deaflix] ASL window not found');
      return;
    }
    
    if (!captionText) {
      console.log('[Deaflix] No caption text provided');
      return;
    }

    const aslVideo = aslWindow.querySelector('#deaflix-asl-video');
    if (!aslVideo) {
      console.log('[Deaflix] ASL video element not found');
      return;
    }

    // Extract key phrases from caption (simple approach - can be improved)
    const phrases = extractKeyPhrases(captionText);
    console.log('[Deaflix] Extracted phrases:', phrases);
    
    // Try to get ASL video for the first significant phrase
    if (phrases.length > 0) {
      const mainPhrase = phrases[0];
      console.log('[Deaflix] Using main phrase:', mainPhrase);
      
      // Check cache first
      if (aslVideoCache.has(mainPhrase)) {
        console.log('[Deaflix] Using cached ASL video');
        aslVideo.src = aslVideoCache.get(mainPhrase);
        aslVideo.load(); // Force reload
        return;
      }

      // Fetch from backend
      console.log('[Deaflix] Fetching ASL video from backend...');
      try {
        const backendUrl = await getBackendUrl();
        console.log('[Deaflix] Using backend URL:', backendUrl);
        const response = await fetch(`${backendUrl}/api/asl/video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phrase: mainPhrase,
            videoId: getVideoId()
          })
        });

        console.log('[Deaflix] Backend response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[Deaflix] Backend response data:', data);
          
          if (data.videoUrl) {
            // Cache the video URL
            aslVideoCache.set(mainPhrase, data.videoUrl);
            console.log('[Deaflix] Setting ASL video src to:', data.videoUrl);
            aslVideo.src = data.videoUrl;
            aslVideo.load(); // Force reload
            
            // Try to play if video is playing
            if (videoElement && !videoElement.paused) {
              aslVideo.play().catch(err => {
                console.error('[Deaflix] Error playing ASL video:', err);
              });
            }
          } else {
            console.warn('[Deaflix] No videoUrl in response');
          }
        } else {
          const errorText = await response.text();
          console.error('[Deaflix] Backend error:', response.status, errorText);
        }
      } catch (error) {
        console.error('[Deaflix] Error fetching ASL video:', error);
        console.error('[Deaflix] Error details:', error.message);
        // Keep placeholder on error
      }
    } else {
      console.log('[Deaflix] No phrases extracted from caption');
    }
  };

  // Extract key phrases from caption text
  const extractKeyPhrases = (text) => {
    if (!text) return [];
    
    // Simple approach: split by punctuation and filter
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // For demo: return first sentence or key words
    // In production, this could use NLP to extract important phrases
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2); // Filter short words
    
    // Return significant phrases (first 3-5 words)
    if (words.length > 0) {
      return [words.slice(0, 5).join(' ')];
    }
    
    return [text.trim()];
  };

  // Play ASL video
  const playASLVideo = () => {
    if (aslWindow) {
      const aslVideo = aslWindow.querySelector('#deaflix-asl-video');
      if (aslVideo) {
        aslVideo.play().catch(console.error);
      }
    }
  };

  // Pause ASL video
  const pauseASLVideo = () => {
    if (aslWindow) {
      const aslVideo = aslWindow.querySelector('#deaflix-asl-video');
      if (aslVideo) {
        aslVideo.pause();
      }
    }
  };

  // Toggle captions
  const toggleCaptions = (enabled) => {
    captionsEnabled = enabled;
    if (enabled) {
      // Try to extract full captions first
      extractCaptions();
      // Also start real-time extraction
      if (videoElement) {
        startRealTimeCaptionExtraction();
      }
      // Create overlay if it doesn't exist
      if (!captionOverlay) {
        createCaptionOverlay();
      }
    } else {
      if (captionOverlay) {
        captionOverlay.style.display = 'none';
      }
      if (captionObserver) {
        captionObserver.disconnect();
        captionObserver = null;
      }
    }
  };

  // Toggle ASL
  const toggleASL = (enabled) => {
    aslEnabled = enabled;
    if (enabled) {
      createASLWindow();
      // Start real-time caption monitoring for ASL
      if (videoElement) {
        startRealTimeCaptionExtraction();
      }
      if (videoElement && !videoElement.paused) {
        playASLVideo();
      }
    } else {
      if (aslWindow) {
        aslWindow.remove();
        aslWindow = null;
      }
    }
  };

  // Handle messages from popup
  const handleMessage = (message, sender, sendResponse) => {
    if (message.action === 'toggleCaptions') {
      toggleCaptions(message.enabled);
      sendResponse({ success: true });
    } else if (message.action === 'toggleASL') {
      toggleASL(message.enabled);
      sendResponse({ success: true });
    }
    return true;
  };

  // Show message to user
  const showMessage = (text) => {
    const messageEl = document.createElement('div');
    messageEl.className = 'deaflix-message';
    messageEl.textContent = text;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

