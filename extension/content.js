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
  let aslVideoElement = null;
  let aslVideoQueue = [];
  let currentVideoIndex = 0;
  let isPlayingSequence = false;

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

      // Update ASL avatar if enabled
      if (aslEnabled && aslWindow) {
        console.log('[Deaflix] ASL enabled, updating avatar...');
        updateASLAvatar(captionText);
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

  // Create ASL window with video element for OpenASL videos
  const createASLWindow = () => {
    console.log('[Deaflix] Creating ASL video window...');
    
    try {
      if (aslWindow) {
        // Stop video if window exists
        if (aslVideoElement) {
          aslVideoElement.pause();
          aslVideoElement.src = '';
        }
        aslWindow.remove();
        aslWindow = null;
      }

      aslWindow = document.createElement('div');
      aslWindow.id = 'deaflix-asl-window';
      aslWindow.className = 'deaflix-asl-window';
      
      // Ensure window is visible
      aslWindow.style.display = 'block';
      aslWindow.style.visibility = 'visible';
      
      // Create video element for OpenASL video clips
      aslVideoElement = document.createElement('video');
      aslVideoElement.id = 'deaflix-asl-video';
      aslVideoElement.controls = false;
      aslVideoElement.muted = true;
      aslVideoElement.autoplay = true;
      aslVideoElement.playsInline = true;
      aslVideoElement.style.width = '100%';
      aslVideoElement.style.height = '100%';
      aslVideoElement.style.objectFit = 'cover';
      aslVideoElement.style.background = '#1a1a1a';
      
      // Event listeners for video
      aslVideoElement.addEventListener('loadstart', () => {
        console.log('[Deaflix] ASL video loadstart');
      });
      
      aslVideoElement.addEventListener('loadeddata', () => {
        console.log('[Deaflix] ASL video loaded');
        const fallback = aslWindow.querySelector('#deaflix-asl-fallback');
        if (fallback) {
          fallback.style.display = 'none';
        }
      });
      
      aslVideoElement.addEventListener('ended', () => {
        console.log('[Deaflix] ASL video ended, playing next in sequence');
        playNextVideoInSequence();
      });
      
      aslVideoElement.addEventListener('error', (e) => {
        console.error('[Deaflix] ASL video error:', e);
        const fallback = aslWindow.querySelector('#deaflix-asl-fallback');
        if (fallback) {
          fallback.textContent = 'Video unavailable';
          fallback.style.display = 'flex';
        }
        // Try next video in sequence
        playNextVideoInSequence();
      });
      
      // Add fallback message div (shown when no captions)
      const fallbackMsg = document.createElement('div');
      fallbackMsg.id = 'deaflix-asl-fallback';
      fallbackMsg.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #667eea;
        font-size: 16px;
        text-align: center;
        z-index: 2;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        background: rgba(26, 26, 26, 0.9);
        padding: 20px;
        border-radius: 8px;
      `;
      fallbackMsg.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 10px;">👋</div>
        <div>Waiting for captions...</div>
        <div style="font-size: 12px; color: #999; margin-top: 5px;">OpenASL Avatar Ready</div>
      `;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'deaflix-close-btn';
      closeBtn.textContent = '×';
      closeBtn.onclick = () => toggleASL(false);

      aslWindow.appendChild(aslVideoElement);
      aslWindow.appendChild(fallbackMsg);
      aslWindow.appendChild(closeBtn);

      document.body.appendChild(aslWindow);
      console.log('[Deaflix] ASL video window created and appended to body');
      console.log('[Deaflix] Window element:', aslWindow);
      console.log('[Deaflix] Window visible:', window.getComputedStyle(aslWindow).display);
      
      // Verify it's in the DOM
      const checkWindow = document.getElementById('deaflix-asl-window');
      if (!checkWindow) {
        console.error('[Deaflix] ERROR: Window was not added to DOM!');
        throw new Error('Failed to append window to body');
      }
      
      // Show fallback initially
      fallbackMsg.style.display = 'flex';
      
      // If we already have caption text, update video
      if (currentCaptionText) {
        console.log('[Deaflix] Current caption exists, updating video:', currentCaptionText);
        updateASLAvatar(currentCaptionText);
      } else {
        console.log('[Deaflix] No current caption text, will update when captions appear');
      }
    } catch (error) {
      console.error('[Deaflix] ERROR creating ASL window:', error);
      console.error('[Deaflix] Error stack:', error.stack);
      aslWindow = null;
      aslVideoElement = null;
    }
  };

  // Play next video in sequence
  const playNextVideoInSequence = () => {
    if (aslVideoQueue.length === 0) {
      console.log('[Deaflix] No more videos in queue');
      isPlayingSequence = false;
      return;
    }

    if (currentVideoIndex >= aslVideoQueue.length) {
      console.log('[Deaflix] Finished playing all videos in sequence');
      aslVideoQueue = [];
      currentVideoIndex = 0;
      isPlayingSequence = false;
      return;
    }

    if (!aslVideoElement || !aslWindow) {
      console.log('[Deaflix] Video element not found');
      return;
    }

    const nextVideoUrl = aslVideoQueue[currentVideoIndex];
    console.log(`[Deaflix] Playing OpenASL video ${currentVideoIndex + 1}/${aslVideoQueue.length}:`, nextVideoUrl);
    
    aslVideoElement.src = nextVideoUrl;
    aslVideoElement.load();
    
    // Try to play if main video is playing
    if (videoElement && !videoElement.paused) {
      aslVideoElement.play().catch(err => {
        console.error('[Deaflix] Error playing ASL video:', err);
        // Try next video
        currentVideoIndex++;
        playNextVideoInSequence();
      });
    }
    
    currentVideoIndex++;
    isPlayingSequence = true;
  };

  // Update ASL video based on current caption text (REAL-TIME using OpenASL)
  const updateASLAvatar = async (captionText) => {
    console.log('[Deaflix] updateASLAvatar called with:', captionText);
    
    if (!aslWindow || !aslVideoElement) {
      console.log('[Deaflix] ASL window or video element not found');
      return;
    }
    
    if (!captionText) {
      console.log('[Deaflix] No caption text provided');
      const fallback = aslWindow.querySelector('#deaflix-asl-fallback');
      if (fallback) {
        fallback.style.display = 'flex';
      }
      return;
    }

    // Hide fallback message when we have captions
    const fallback = aslWindow.querySelector('#deaflix-asl-fallback');
    if (fallback) {
      fallback.style.display = 'none';
    }

    // Extract words from caption
    const words = extractSignWords(captionText);
    console.log('[Deaflix] Extracted words for OpenASL lookup:', words);
    
    if (words.length > 0) {
      // Send to backend to get OpenASL video URLs
      // Use background script as proxy to avoid CORS issues (HTTPS->HTTP)
      try {
        const backendUrl = await getBackendUrl();
        console.log('[Deaflix] Fetching OpenASL videos from backend via proxy...');
        
        // Use background script to proxy the request
        chrome.runtime.sendMessage({
          action: 'proxyRequest',
          method: 'POST',
          path: '/api/asl/openasl',
          body: {
            text: captionText,
            words: words,
            videoId: getVideoId()
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Deaflix] Proxy error:', chrome.runtime.lastError);
            if (fallback) {
              fallback.textContent = 'Extension error';
              fallback.style.display = 'flex';
            }
            return;
          }
          
          if (response && response.success) {
            const data = response.data;
            console.log('[Deaflix] ASL response:', data);
            console.log('[Deaflix] Words being signed:', data.words);
            console.log('[Deaflix] Videos found:', data.videos?.length || 0);
            
            if (data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
              // Queue videos to play sequentially - each video represents a sign for a word
              aslVideoQueue = data.videos;
              currentVideoIndex = 0;
              console.log(`[Deaflix] Queueing ${aslVideoQueue.length} ASL sign videos for words:`, data.words);
              
              // Show which words are being signed
              if (data.wordMappings) {
                console.log('[Deaflix] Word-to-video mappings:', data.wordMappings.map(m => `${m.word} -> ${m.videoUrl}`).join(', '));
              }
              
              playNextVideoInSequence();
            } else if (data.videoUrl) {
              // Single video URL (fallback)
              aslVideoQueue = [data.videoUrl];
              currentVideoIndex = 0;
              console.log('[Deaflix] Using single fallback video');
              playNextVideoInSequence();
            } else {
              console.warn('[Deaflix] No videos in response');
              if (fallback) {
                fallback.innerHTML = `
                  <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                  <div>No ASL videos found</div>
                  <div style="font-size: 11px; color: #999; margin-top: 5px;">
                    Words: ${data.words?.join(', ') || 'unknown'}<br/>
                    ${data.message || 'Add words to aslVideoDatabase'}
                  </div>
                `;
                fallback.style.display = 'flex';
              }
            }
          } else {
            console.error('[Deaflix] Proxy request failed:', response);
            if (fallback) {
              fallback.textContent = response?.error || 'Backend error';
              fallback.style.display = 'flex';
            }
          }
        });
        
        return; // Exit early since we're using async callback
      } catch (error) {
        const backendUrlUsed = await getBackendUrl();
        console.error('[Deaflix] Error setting up proxy request:', error);
        console.error('[Deaflix] Error details:', error.message);
        console.error('[Deaflix] Backend URL was:', backendUrlUsed);
        
        if (fallback) {
          let errorMessage = 'Connection error';
          let errorDetails = 'Make sure backend is running';
          
          if (error.message.includes('CORS') || error.message.includes('blocked')) {
            errorMessage = 'CORS error';
            errorDetails = 'Backend CORS not configured. Check server.js';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Backend not reachable';
            errorDetails = 'Start backend: cd backend && npm start';
          }
          
          fallback.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
            <div>${errorMessage}</div>
            <div style="font-size: 11px; color: #999; margin-top: 5px; max-width: 200px;">
              ${errorDetails}<br/>
              <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px; font-size: 10px;">${backendUrlUsed}</code>
            </div>
          `;
          fallback.style.display = 'flex';
        }
      }
    }
  };

  // Helper: Extract words from text (same as backend)
  const extractSignWords = (text) => {
    if (!text) return [];
    
    const cleaned = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim();
    
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
    
    return words.filter(w => !stopWords.has(w) || words.length <= 3);
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
    if (aslWindow && aslVideoElement) {
      aslVideoElement.play().catch(console.error);
    }
  };

  // Pause ASL video
  const pauseASLVideo = () => {
    if (aslWindow && aslVideoElement) {
      aslVideoElement.pause();
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
    console.log('[Deaflix] toggleASL called with:', enabled);
    aslEnabled = enabled;
    if (enabled) {
      console.log('[Deaflix] Creating ASL window...');
      createASLWindow();
      
      // Verify window was created
      if (!aslWindow) {
        console.error('[Deaflix] ERROR: Window was not created!');
        return;
      }
      
      // Start real-time caption monitoring for ASL
      if (videoElement) {
        startRealTimeCaptionExtraction();
      }
      if (videoElement && !videoElement.paused) {
        playASLVideo();
      }
    } else {
      console.log('[Deaflix] Disabling ASL, removing window');
      if (aslWindow) {
        // Stop video
        if (aslVideoElement) {
          aslVideoElement.pause();
          aslVideoElement.src = '';
        }
        aslWindow.remove();
        aslWindow = null;
        aslVideoElement = null;
        aslVideoQueue = [];
        currentVideoIndex = 0;
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

