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
  let aslImage = null;
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
          aslImage = null;
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

    // Create video element for videos
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
      display: none;
    `;

    // Create image element for letter images (JPEG)
    aslImage = document.createElement('img');
    aslImage.id = 'aslImage';
    aslImage.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.2s ease-in-out;
      display: none;
    `;

    aslWindow.appendChild(aslPlayer);
    aslWindow.appendChild(aslImage);
    document.body.appendChild(aslWindow);
    
    console.log('[Deaflix] ASL avatar window created (supports videos and images)');
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
      // Ensure ASL window exists
      if (!aslWindow) {
        console.log('[Deaflix] Creating ASL window for caption processing');
        createASLWindow();
      }
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
          console.error('[Deaflix] Make sure backend is running on http://localhost:3000');
          return;
        }

        console.log('[Deaflix] Backend response:', response);

        if (response && response.success && response.data) {
          const data = response.data;
          console.log('[Deaflix] Backend data:', data);
          
          // Handle sequence format (WLASL videos only)
          if (data.success && data.sequence && Array.isArray(data.sequence) && data.sequence.length > 0) {
            // Stop any currently playing sequence BEFORE setting new queue
            stopASLSequence();
            
            // Extract video URLs from sequence
            videoQueue = data.sequence.map(item => item.url);
            console.log('[Deaflix] ✅ Queued', videoQueue.length, 'WLASL videos');
            console.log('[Deaflix] Video URLs:', videoQueue);
            console.log('[Deaflix] Found words:', data.foundWords || []);
            if (data.notFoundWords && data.notFoundWords.length > 0) {
              console.log('[Deaflix] Words not in dataset (skipped):', data.notFoundWords);
            }
            
            // Start playing the queue
            playQueue();
          } else if (data.success && data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
            // Fallback to videos array format
            videoQueue = data.videos;
            console.log('[Deaflix] ✅ Queued', videoQueue.length, 'videos:', videoQueue);
            playQueue();
          } else {
            console.warn('[Deaflix] ⚠️ No WLASL videos found for words:', words);
            console.warn('[Deaflix] Backend found', data.wordsFound || 0, 'out of', data.wordsTotal || words.length, 'words');
            if (data.availableWords) {
              console.warn('[Deaflix] Available words in WLASL dataset:', data.availableWords.slice(0, 20), '...');
            }
            if (data.notFoundWords && data.notFoundWords.length > 0) {
              console.warn('[Deaflix] Words not in dataset:', data.notFoundWords);
            }
            console.warn('[Deaflix] Tip: Add more words to WLASL dataset or run setup scripts');
          }
        } else {
          console.error('[Deaflix] ❌ Invalid response from backend:', response);
        }
      });
    } catch (error) {
      console.error('[Deaflix] Error loading ASL sequence:', error);
    }
  };

  // Extract words from text
  const extractWords = (text) => {
    if (!text) return [];
    
    // Normalize text: lowercase, remove punctuation, handle contractions
    const normalized = text.toLowerCase()
      .replace(/[^\w\s']/g, ' ')  // Keep apostrophes for contractions
      .replace(/'/g, '')          // Remove apostrophes after keeping them
      .trim();
    
    const words = normalized
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    console.log('[Deaflix] Extracted words from:', text);
    console.log('[Deaflix] Normalized words:', words);
    
    return words;
  };

  // Wait helper function for delays
  const wait = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  // Check if URL is an image
  const isImageUrl = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext));
  };

  // Check if URL is a video
  const isVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
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

  // Stop current ASL sequence
  const stopASLSequence = () => {
    playing = false;
    videoQueue = [];
    if (aslPlayer) {
      aslPlayer.pause();
      aslPlayer.src = '';
      aslPlayer.style.opacity = '0';
    }
    if (aslImage) {
      aslImage.src = '';
      aslImage.style.opacity = '0';
    }
    preloadedUrl = null;
    preloadedDataUrl = null;
    console.log('[Deaflix] Stopped ASL sequence');
  };

  // Play video queue with smooth transitions
  const playQueue = async () => {
    console.log('[Deaflix] playQueue() called - playing:', playing, 'queue length:', videoQueue.length);
    
    if (playing || videoQueue.length === 0) {
      console.log('[Deaflix] playQueue() returning early - playing:', playing, 'queue empty:', videoQueue.length === 0);
      return;
    }

    if (!aslWindow || !aslPlayer || !aslImage) {
      console.error('[Deaflix] ASL window or media elements not found', {
        aslWindow: !!aslWindow,
        aslPlayer: !!aslPlayer,
        aslImage: !!aslImage
      });
      // Try to create ASL window if it doesn't exist
      if (!aslWindow && aslEnabled) {
        console.log('[Deaflix] Creating ASL window...');
        createASLWindow();
        // Retry after a short delay
        setTimeout(() => playQueue(), 100);
      }
      return;
    }

    playing = true;
    const mediaUrl = videoQueue.shift();
    const isImage = isImageUrl(mediaUrl);
    const isVideo = isVideoUrl(mediaUrl);
    const mediaType = isImage ? 'image' : (isVideo ? 'video' : 'unknown');
    
    console.log(`[Deaflix] 🎬 Playing ${mediaType}:`, mediaUrl);
    console.log('[Deaflix] Queue status:', videoQueue.length, 'remaining');

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
      if (preloadedUrl === mediaUrl && preloadedDataUrl) {
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
            url: mediaUrl
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

      // Hide both elements first
      aslPlayer.style.display = 'none';
      aslImage.style.display = 'none';
      aslPlayer.style.opacity = '0';
      aslImage.style.opacity = '0';

      // Wait for fade out transition
      await wait(150);

      if (isImage) {
        // Handle image (letter signs)
        aslImage.src = dataUrl;
        aslImage.style.display = 'block';
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          aslImage.onload = () => {
            resolve();
          };
          aslImage.onerror = (err) => {
            reject(new Error('Image load failed'));
          };
          
          // Timeout after 3 seconds
          setTimeout(() => {
            if (!aslImage.complete) {
              reject(new Error('Image load timeout'));
            }
          }, 3000);
        });

        // Fade in image
        aslImage.style.opacity = '1';
        console.log('[Deaflix] ✅ Image displayed successfully');

        // Show image for 500ms (letter signs are quick)
        await wait(500);

        // Natural transition pause
        await wait(150);
      } else if (isVideo) {
        // Handle video (word signs)
        aslPlayer.src = dataUrl;
        aslPlayer.style.display = 'block';
        aslPlayer.load();

        // Wait for video to load
        await new Promise((resolve, reject) => {
          aslPlayer.onloadeddata = () => {
            resolve();
          };
          aslPlayer.onerror = (err) => {
            reject(new Error('Video load failed'));
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
          console.log('[Deaflix] ✅ Video playing successfully');
          
          // Fade in
          aslPlayer.style.opacity = '1';

          // Wait for video to end
          await new Promise((resolve) => {
            aslPlayer.onended = () => {
              console.log('[Deaflix] ✅ Video ended successfully');
              resolve();
            };
            aslPlayer.onerror = (err) => {
              console.error('[Deaflix] ❌ Video playback error:', err);
              resolve();
            };
          });

          // Natural transition pause (movement epenthesis)
          await wait(150);
        } catch (playError) {
          console.error('[Deaflix] ❌ Video play error:', playError);
          throw playError;
        }
      } else {
        console.warn('[Deaflix] ⚠️ Unknown media type:', mediaUrl);
        await wait(300);
      }

      // Play next clip
      playing = false;
      if (videoQueue.length > 0) {
        playQueue();
      } else {
        console.log('[Deaflix] Queue finished');
      }
    } catch (error) {
      console.error('[Deaflix] Error loading media:', error);
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
