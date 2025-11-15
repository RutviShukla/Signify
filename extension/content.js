// Content Script - Injected into video pages
(function() {
  'use strict';

  // Global state
  let captionsEnabled = false;
  let aslEnabled = false;
  let lastCaption = '';
  let videoQueue = [];
  let playing = false;
  let aslWindow = null;
  let captionOverlay = null;
  let captionObserver = null;
  let videoElement = null;
  let aslPlayer = null;
  let preloader = null;
  let preloadedUrl = null;
  let preloadedDataUrl = null;

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

    // Start caption monitoring if enabled
    if (captionsEnabled || aslEnabled) {
      startCaptionObserver();
    }
  };

  // Wait for video element to load
  const waitForVideo = () => {
    const checkVideo = setInterval(() => {
      videoElement = document.querySelector('video');
      if (videoElement) {
        clearInterval(checkVideo);
        console.log('[Deaflix] Video element found');
      }
    }, 500);
  };

  // Handle messages from popup
  const handleMessage = (message, sender, sendResponse) => {
    if (message.type === 'toggleCaptions') {
      captionsEnabled = message.enabled;
      chrome.storage.sync.set({ captionsEnabled: message.enabled });
      
      if (captionsEnabled) {
        if (!captionOverlay) {
          createCaptionOverlay();
        }
        startCaptionObserver();
      } else {
        if (captionOverlay) {
          captionOverlay.style.display = 'none';
        }
        if (captionObserver) {
          captionObserver.disconnect();
        }
      }
      sendResponse({ success: true });
    } else if (message.type === 'toggleASL') {
      aslEnabled = message.enabled;
      chrome.storage.sync.set({ aslEnabled: message.enabled });
      
      if (aslEnabled) {
        if (!aslWindow) {
          createASLWindow();
        }
        startCaptionObserver();
      } else {
        if (aslWindow) {
          aslWindow.remove();
          aslWindow = null;
          aslPlayer = null;
        }
        if (preloader) {
          preloader.remove();
          preloader = null;
        }
        preloadedUrl = null;
        preloadedDataUrl = null;
        videoQueue = [];
        playing = false;
      }
      sendResponse({ success: true });
    }
    return true;
  };

  // Create caption overlay
  const createCaptionOverlay = () => {
    if (captionOverlay) {
      captionOverlay.remove();
    }

    captionOverlay = document.createElement('div');
    captionOverlay.id = 'deaflix-caption-overlay';
    captionOverlay.className = 'deaflix-overlay';
    document.body.appendChild(captionOverlay);
    console.log('[Deaflix] Caption overlay created');
  };

  // Show overlay with text
  const showOverlay = (text) => {
    if (!captionOverlay) {
      createCaptionOverlay();
    }
    if (captionOverlay) {
      captionOverlay.textContent = text;
      captionOverlay.style.display = 'block';
    }
  };

  // Create ASL window with circular avatar mask
  const createASLWindow = () => {
    if (aslWindow) {
      return;
    }

    aslWindow = document.createElement('div');
    aslWindow.id = 'aslAvatarContainer';
    aslWindow.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 220px;
      height: 220px;
      background: #111;
      border-radius: 50%;
      overflow: hidden;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    aslPlayer = document.createElement('video');
    aslPlayer.id = 'aslPlayer';
    aslPlayer.autoplay = true;
    aslPlayer.muted = false;
    aslPlayer.playsInline = true;
    aslPlayer.controls = false;
    aslPlayer.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.2s ease-in-out;
    `;

    aslWindow.appendChild(aslPlayer);
    document.body.appendChild(aslWindow);
    
    console.log('[Deaflix] ASL avatar window created');
  };

  // Start caption observer
  const startCaptionObserver = () => {
    if (captionObserver) {
      captionObserver.disconnect();
    }

    // Find caption container
    const captionContainer = document.querySelector('.ytp-caption-window-container');
    
    if (!captionContainer) {
      // Retry after delay
      setTimeout(() => startCaptionObserver(), 1000);
      return;
    }

    // Observer for caption changes
    captionObserver = new MutationObserver(() => {
      extractCaption();
    });

    // Watch for changes
    captionObserver.observe(captionContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Extract immediately
    extractCaption();
  };

  // Extract caption from DOM
  const extractCaption = () => {
    const captionSegments = document.querySelectorAll('.ytp-caption-segment');
    
    if (captionSegments.length === 0) {
      if (captionOverlay) {
        captionOverlay.style.display = 'none';
      }
      return;
    }

    // Combine all caption segments
    const captionText = Array.from(captionSegments)
      .map(seg => seg.textContent.trim())
      .filter(text => text.length > 0)
      .join(' ');

    if (captionText && captionText !== lastCaption) {
      handleCaption(captionText);
      lastCaption = captionText;
    }
  };

  // Handle caption text
  const handleCaption = (text) => {
    console.log('[Deaflix] New caption:', text);

    // Update caption overlay
    if (captionsEnabled) {
      showOverlay(text);
    }

    // Load ASL sequence
    if (aslEnabled) {
      loadASLSequence(text);
    }
  };

  // Load ASL sequence for text
  const loadASLSequence = async (text) => {
    // Extract words from text
    const words = extractWords(text);
    console.log('[Deaflix] Extracted words:', words);

    if (words.length === 0) {
      return;
    }

    // Stop current playback
    if (playing && aslPlayer) {
      aslPlayer.pause();
      aslPlayer.src = '';
      playing = false;
    }
    
    // Clear video queue for new caption
    videoQueue = [];

    // Request ASL videos from backend via proxy
    try {
      chrome.runtime.sendMessage({
        type: 'proxyRequest',
        url: 'http://localhost:3000/api/asl/video-map',
        method: 'POST',
        body: { words: words }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Deaflix] Proxy error:', chrome.runtime.lastError);
          return;
        }

        if (response && response.success && response.data) {
          const data = response.data;
          if (data.success && data.videos && data.videos.length > 0) {
            videoQueue = data.videos;
            console.log('[Deaflix] Queued videos:', videoQueue.length);
            playQueue();
          } else {
            console.log('[Deaflix] No ASL videos found for words');
          }
        }
      });
    } catch (error) {
      console.error('[Deaflix] Error loading ASL sequence:', error);
    }
  };

  // Extract words from text
  const extractWords = (text) => {
    if (!text) return [];
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  };

  // Wait helper function for delays
  const wait = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Preload next clip (fetch data URL in background)
  const preloadNextClip = async (url) => {
    try {
      // Skip if already preloaded
      if (preloadedUrl === url && preloadedDataUrl) {
        return preloadedDataUrl;
      }

      const dataUrl = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'proxyMedia',
          url: url
        }, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (result && result.success && result.dataUrl) {
            resolve(result.dataUrl);
          } else {
            reject(new Error('Media proxy failed'));
          }
        });
      });

      // Cache the preloaded data
      preloadedUrl = url;
      preloadedDataUrl = dataUrl;

      // Create hidden preloader video element for buffering
      if (preloader) {
        preloader.remove();
      }
      
      preloader = document.createElement('video');
      preloader.src = dataUrl;
      preloader.load();
      preloader.style.display = 'none';
      document.body.appendChild(preloader);
      
      return new Promise((resolve, reject) => {
        preloader.onloadeddata = () => {
          resolve(dataUrl);
        };
        preloader.onerror = (err) => {
          reject(err);
        };
      });
    } catch (error) {
      throw error;
    }
  };

  // Play video queue with smooth transitions
  const playQueue = async () => {
    if (playing || videoQueue.length === 0) {
      return;
    }

    if (!aslWindow || !aslPlayer) {
      console.error('[Deaflix] ASL window or player not found');
      return;
    }

    playing = true;
    const videoUrl = videoQueue.shift();
    console.log('[Deaflix] Playing video:', videoUrl, `(${videoQueue.length} remaining)`);

    // Preload next clip if available
    if (videoQueue.length > 0) {
      const nextUrl = videoQueue[0];
      preloadNextClip(nextUrl).catch(err => {
        console.log('[Deaflix] Preload failed for next clip:', err);
      });
    }

    try {
      // Get video data URL via proxy (use preloaded if available)
      let dataUrl;
      if (preloadedUrl === videoUrl && preloadedDataUrl) {
        // Reuse preloaded data URL
        dataUrl = preloadedDataUrl;
        preloadedUrl = null;
        preloadedDataUrl = null;
        console.log('[Deaflix] Using preloaded video');
      } else {
        // Fetch fresh data URL
        dataUrl = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'proxyMedia',
            url: videoUrl
          }, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (result && result.success && result.dataUrl) {
              resolve(result.dataUrl);
            } else {
              reject(new Error('Media proxy failed'));
            }
          });
        });
      }

      // Fade out current video
      aslPlayer.style.opacity = '0';

      // Wait for fade out transition
      await wait(150);

      // Swap video source
      aslPlayer.src = dataUrl;
      aslPlayer.load();

      // Wait for video to load
      await new Promise((resolve, reject) => {
        aslPlayer.onloadeddata = () => {
          resolve();
        };
        aslPlayer.onerror = (err) => {
          reject(err);
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (aslPlayer.readyState < 2) {
            reject(new Error('Video load timeout'));
          }
        }, 5000);
      });

      // Play video
      try {
        await aslPlayer.play();
        console.log('[Deaflix] Video playing');
        
        // Fade in
        aslPlayer.style.opacity = '1';

        // Wait for video to end
        await new Promise((resolve) => {
          aslPlayer.onended = () => {
            console.log('[Deaflix] Video ended');
            resolve();
          };
          aslPlayer.onerror = () => {
            console.error('[Deaflix] Video error');
            resolve();
          };
        });

        // Natural transition pause (movement epenthesis)
        await wait(150);

        // Play next clip
        playing = false;
        if (videoQueue.length > 0) {
          playQueue();
        } else {
          console.log('[Deaflix] Queue finished');
        }
      } catch (playError) {
        console.error('[Deaflix] Play error:', playError);
        playing = false;
        if (videoQueue.length > 0) {
          setTimeout(() => playQueue(), 200);
        }
      }
    } catch (error) {
      console.error('[Deaflix] Error loading video:', error);
      playing = false;
      if (videoQueue.length > 0) {
        setTimeout(() => playQueue(), 200);
      }
    }
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
