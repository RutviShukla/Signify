// Content Script - Injected into video pages
(function() {
  'use strict';

  // Global state
  let aslEnabled = false;
  let captionEnabled = true; // Default to true
  let backendUrl = 'http://localhost:3000'; // Default backend URL
  let lastCaption = '';
  let videoQueue = []; // Array of {url, word, gloss} objects
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
    const result = await chrome.storage.sync.get(['aslEnabled', 'captionEnabled', 'backendUrl']);
    aslEnabled = result.aslEnabled || false;
    captionEnabled = result.captionEnabled !== undefined ? result.captionEnabled : true; // Default to true
    backendUrl = result.backendUrl || 'http://localhost:3000'; // Default to localhost, can be overridden

    // Wait for video element
    waitForVideo();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(handleMessage);

    // Start caption monitoring if ASL is enabled
    if (aslEnabled) {
      if (!captionOverlay) {
        createCaptionOverlay();
      }
      startCaptionObserver();
    }
  };

  // Wait for video element to load
  const waitForVideo = () => {
    const checkVideo = setInterval(() => {
      videoElement = document.querySelector('video');
      if (videoElement) {
        clearInterval(checkVideo);
        console.log('[Signify] Video element found');
      }
    }, 500);
  };

  // Handle messages from popup
  const handleMessage = (message, sender, sendResponse) => {
    if (message.type === 'toggleASL') {
      aslEnabled = message.enabled;
      chrome.storage.sync.set({ aslEnabled: message.enabled });
      
      if (aslEnabled) {
        if (!aslWindow) {
          createASLWindow();
        }
        if (!captionOverlay) {
          createCaptionOverlay();
        }
        startCaptionObserver();
      } else {
        if (aslWindow) {
          aslWindow.remove();
          aslWindow = null;
          aslPlayer = null;
          aslImage = null;
        }
        if (captionOverlay) {
          captionOverlay.style.display = 'none';
        }
        if (preloader) {
          preloader.remove();
          preloader = null;
        }
        preloadedUrl = null;
        preloadedDataUrl = null;
        videoQueue = [];
        playing = false;
        if (captionObserver) {
          captionObserver.disconnect();
          captionObserver = null;
        }
      }
      sendResponse({ success: true });
    } else if (message.type === 'toggleCaption') {
      captionEnabled = message.enabled;
      chrome.storage.sync.set({ captionEnabled: message.enabled });
      
      if (captionOverlay) {
        if (captionEnabled) {
          // If captions are enabled and we're currently playing, show the current word
          // Check if there's a word in the current media item being played
          // The word will be shown automatically when playQueue runs next
          if (playing && videoQueue.length > 0) {
            // Will be shown on next playQueue call
          } else if (captionOverlay.textContent && captionOverlay.textContent.trim()) {
            // Show existing word if one is already displayed
            captionOverlay.style.display = 'block';
          }
        } else {
          // Hide the caption overlay
          captionOverlay.style.display = 'none';
        }
      }
      sendResponse({ success: true });
    } else if (message.type === 'updateBackendUrl') {
      backendUrl = message.url || 'http://localhost:3000';
      chrome.storage.sync.set({ backendUrl: backendUrl });
      console.log(`[Signify] Backend URL updated to: ${backendUrl}`);
      sendResponse({ success: true, backendUrl: backendUrl });
    }
    return true;
  };
  // Create caption overlay (shows current word being signed)
  const createCaptionOverlay = () => {
    if (captionOverlay) {
      return;
    }

    captionOverlay = document.createElement('div');
    captionOverlay.id = 'signify-caption-overlay';
    captionOverlay.className = 'signify-overlay';
    
    // Calculate initial position (centered at bottom)
    const initialLeft = (window.innerWidth / 2);
    const initialTop = window.innerHeight - 150; // Bottom with margin
    
    captionOverlay.style.cssText = `
      position: fixed;
      left: ${initialLeft}px;
      top: ${initialTop}px;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      max-width: 80%;
      z-index: 10000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      border: 2px solid #667eea;
      display: none;
      visibility: visible;
      opacity: 1;
      line-height: 1.5;
      word-wrap: break-word;
      cursor: grab;
      user-select: none;
      transform: translateX(-50%);
      pointer-events: auto;
    `;
    
    document.body.appendChild(captionOverlay);
    
    // Make the caption overlay draggable
    makeDraggable(captionOverlay, 'captionOverlayX', 'captionOverlayY', []);
    
    console.log('[Signify] Caption overlay created (shows current word being signed)');
  };

  // Show current word in caption overlay
  const showCurrentWord = (word) => {
    // Only show if captions are enabled
    if (!captionEnabled) {
      if (captionOverlay) {
        captionOverlay.style.display = 'none';
      }
      return;
    }

    console.log('[Signify] showCurrentWord called with:', word);
    if (!captionOverlay) {
      console.log('[Signify] Creating caption overlay...');
      createCaptionOverlay();
    }
    if (captionOverlay && word) {
      captionOverlay.textContent = word;
      captionOverlay.style.display = 'block';
      captionOverlay.style.visibility = 'visible';
      captionOverlay.style.opacity = '1';
      console.log('[Signify] ✅ Caption overlay showing word:', word);
    } else if (captionOverlay && !word) {
      captionOverlay.style.display = 'none';
      console.log('[Signify] Hiding caption overlay (no word)');
    } else {
      console.warn('[Signify] ⚠️ Caption overlay not available');
    }
  };

  // Make element draggable (generic function)
  const makeDraggable = (element, storageKeyX, storageKeyY, excludeElements = []) => {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    // Get initial position from computed style
    const getInitialPosition = () => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top
      };
    };

    // Ensure position is within viewport bounds
    const constrainToViewport = (x, y) => {
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;
      return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
      };
    };

    // Load saved position from storage or use default
    chrome.storage.sync.get([storageKeyX, storageKeyY], (result) => {
      const initialPos = getInitialPosition();
      if (result[storageKeyX] !== undefined && result[storageKeyY] !== undefined) {
        // Constrain saved position to current viewport
        const constrained = constrainToViewport(result[storageKeyX], result[storageKeyY]);
        xOffset = constrained.x;
        yOffset = constrained.y;
        element.style.left = `${xOffset}px`;
        element.style.top = `${yOffset}px`;
        element.style.bottom = 'auto';
        element.style.right = 'auto';
        element.style.transform = 'none'; // Remove any transform
      } else {
        // Save initial position
        xOffset = initialPos.x;
        yOffset = initialPos.y;
        chrome.storage.sync.set({
          [storageKeyX]: xOffset,
          [storageKeyY]: yOffset
        });
      }
    });

    // Handle window resize to keep widget on screen
    const handleResize = () => {
      if (!isDragging) {
        const constrained = constrainToViewport(xOffset, yOffset);
        xOffset = constrained.x;
        yOffset = constrained.y;
        element.style.left = `${xOffset}px`;
        element.style.top = `${yOffset}px`;
      }
    };
    window.addEventListener('resize', handleResize);

    const dragStart = (e) => {
      // Don't drag if clicking on excluded elements
      if (excludeElements.some(excluded => e.target === excluded || excluded.contains(e.target))) {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (e.type === 'touchstart') {
        initialX = e.touches[0].clientX - rect.left;
        initialY = e.touches[0].clientY - rect.top;
      } else {
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;
      }

      isDragging = true;
      element.style.cursor = 'grabbing';
      element.style.transition = 'none'; // Disable transitions during drag
      const originalZIndex = element.style.zIndex;
      element.style.zIndex = '99999999'; // Bring to front while dragging
    };

    const drag = (e) => {
      if (isDragging) {
        e.preventDefault();
        
        if (e.type === 'touchmove') {
          currentX = e.touches[0].clientX - initialX;
          currentY = e.touches[0].clientY - initialY;
        } else {
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;
        }

        // Keep widget within viewport bounds
        const constrained = constrainToViewport(currentX, currentY);
        currentX = constrained.x;
        currentY = constrained.y;

        xOffset = currentX;
        yOffset = currentY;

        element.style.left = `${currentX}px`;
        element.style.top = `${currentY}px`;
        element.style.bottom = 'auto';
        element.style.right = 'auto';
        element.style.transform = 'none'; // Remove any transform
      }
    };

    const dragEnd = () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.transition = ''; // Re-enable transitions
        
        // Save position to storage
        chrome.storage.sync.set({
          [storageKeyX]: xOffset,
          [storageKeyY]: yOffset
        });
      }
    };

    // Mouse events
    element.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events for mobile
    element.addEventListener('touchstart', dragStart, { passive: false });
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);

    // Make cursor indicate draggable
    element.style.cursor = 'grab';
    element.style.userSelect = 'none';
  };

  // Create ASL window with circular avatar mask
  const createASLWindow = () => {
    if (aslWindow) {
      return;
    }

    aslWindow = document.createElement('div');
    aslWindow.id = 'aslAvatarContainer';
    
    // Calculate initial position (bottom-right corner)
    const initialLeft = window.innerWidth - 240; // 220px width + 20px margin
    const initialTop = window.innerHeight - 300; // 220px height + 80px margin
    
    aslWindow.style.cssText = `
      position: fixed;
      left: ${initialLeft}px;
      top: ${initialTop}px;
      width: 220px;
      height: 220px;
      background: #111;
      border-radius: 50%;
      overflow: hidden;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      user-select: none;
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
      pointer-events: none;
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
      pointer-events: none;
    `;

    aslWindow.appendChild(aslPlayer);
    aslWindow.appendChild(aslImage);
    document.body.appendChild(aslWindow);
    
    // Make the window draggable (exclude video/image elements from drag)
    makeDraggable(aslWindow, 'aslWindowX', 'aslWindowY', [aslPlayer, aslImage]);
    
    console.log('[Signify] ASL avatar window created (supports videos and images, draggable)');
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
    // Try multiple selectors for caption segments (YouTube uses different class names)
    const segmentSelectors = [
      '.ytp-caption-segment',
      '.caption-segment',
      '[class*="caption-segment"]',
      '.ytp-caption-window .ytp-caption-text',
      '.ytp-caption-text',
      '[class*="caption-text"]',
      'span[dir="ltr"]', // Common in YouTube captions
      '.ytp-caption-window span'
    ];

    let captionSegments = [];
    for (const selector of segmentSelectors) {
      const segments = document.querySelectorAll(selector);
      if (segments.length > 0) {
        // Filter to only include visible caption segments
        captionSegments = Array.from(segments).filter(seg => {
          const style = window.getComputedStyle(seg);
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 seg.textContent.trim().length > 0;
        });
        if (captionSegments.length > 0) {
          console.log(`[Signify] Found ${captionSegments.length} caption segments with selector: ${selector}`);
          break;
        }
      }
    }
    
    if (captionSegments.length === 0) {
      // Check if captions might be in a different format
      const allTextElements = document.querySelectorAll('.ytp-caption-window-container *');
      const visibleTexts = Array.from(allTextElements)
        .filter(el => {
          const style = window.getComputedStyle(el);
          const text = el.textContent.trim();
          return style.display !== 'none' && 
                 style.visibility !== 'hidden' && 
                 text.length > 0 &&
                 el.children.length === 0; // Leaf nodes only
        })
        .map(el => el.textContent.trim())
        .filter((text, index, arr) => arr.indexOf(text) === index); // Remove duplicates
      
      if (visibleTexts.length > 0) {
        const captionText = visibleTexts.join(' ');
        if (captionText && captionText !== lastCaption) {
          console.log('[Signify] Found captions using fallback method:', captionText);
          handleCaption(captionText);
          lastCaption = captionText;
          return;
        }
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
    console.log('[Signify] New caption:', text);

    // Load ASL sequence
    if (aslEnabled) {
      // Ensure ASL window exists
      if (!aslWindow) {
        console.log('[Signify] Creating ASL window for caption processing');
        createASLWindow();
      }
      loadASLSequence(text);
    }
  };

  // Load ASL sequence for text
  const loadASLSequence = async (text) => {
    // Extract words from text
    const words = extractWords(text);
    console.log('[Signify] Extracted words:', words);

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
    // Use configurable backend URL
    const apiUrl = `${backendUrl}/api/asl/video-map`;
    try {
      chrome.runtime.sendMessage({
        type: 'proxyRequest',
        url: apiUrl,
        method: 'POST',
        body: { words: words }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Signify] Proxy error:', chrome.runtime.lastError);
          console.error(`[Signify] Make sure backend is running on ${backendUrl}`);
          return;
        }

        console.log('[Signify] Backend response:', response);

        if (response && response.success && response.data) {
          const data = response.data;
          console.log('[Signify] Backend data:', data);
          
          // Handle sequence format (WLASL videos only)
          if (data.success && data.sequence && Array.isArray(data.sequence) && data.sequence.length > 0) {
            // Stop any currently playing sequence BEFORE setting new queue
            stopASLSequence();
            
            // Store full sequence objects with word information
            videoQueue = data.sequence.map(item => ({
              url: item.url,
              word: item.word || item.gloss || '',
              gloss: item.gloss || item.word || '',
              type: item.type || 'video'
            }));
            console.log('[Signify] ✅ Queued', videoQueue.length, 'WLASL videos');
            console.log('[Signify] Video queue:', videoQueue.map(q => ({ word: q.word, url: q.url })));
            console.log('[Signify] Found words:', data.foundWords || []);
            if (data.notFoundWords && data.notFoundWords.length > 0) {
              console.log('[Signify] Words not in dataset (skipped):', data.notFoundWords);
            }
            
            // Start playing the queue
            playQueue();
          } else if (data.success && data.videos && Array.isArray(data.videos) && data.videos.length > 0) {
            // Fallback to videos array format (convert to objects)
            videoQueue = data.videos.map(url => ({
              url: url,
              word: '',
              gloss: '',
              type: 'video'
            }));
            console.log('[Signify] ✅ Queued', videoQueue.length, 'videos:', videoQueue);
            playQueue();
          } else {
            console.warn('[Signify] ⚠️ No WLASL videos found for words:', words);
            console.warn('[Signify] Backend found', data.wordsFound || 0, 'out of', data.wordsTotal || words.length, 'words');
            if (data.availableWords) {
              console.warn('[Signify] Available words in WLASL dataset:', data.availableWords.slice(0, 20), '...');
            }
            if (data.notFoundWords && data.notFoundWords.length > 0) {
              console.warn('[Signify] Words not in dataset:', data.notFoundWords);
            }
            console.warn('[Signify] Tip: Add more words to WLASL dataset or run setup scripts');
          }
        } else {
          console.error('[Signify] ❌ Invalid response from backend:', response);
        }
      });
    } catch (error) {
      console.error('[Signify] Error loading ASL sequence:', error);
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
    
    console.log('[Signify] Extracted words from:', text);
    console.log('[Signify] Normalized words:', words);
    
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
    if (captionOverlay) {
      captionOverlay.style.display = 'none';
    }
    preloadedUrl = null;
    preloadedDataUrl = null;
    console.log('[Signify] Stopped ASL sequence');
  };

  // Play video queue with smooth transitions
  const playQueue = async () => {
    console.log('[Signify] playQueue() called - playing:', playing, 'queue length:', videoQueue.length);
    
    if (playing || videoQueue.length === 0) {
      console.log('[Signify] playQueue() returning early - playing:', playing, 'queue empty:', videoQueue.length === 0);
      return;
    }

    if (!aslWindow || !aslPlayer || !aslImage) {
      console.error('[Signify] ASL window or media elements not found', {
        aslWindow: !!aslWindow,
        aslPlayer: !!aslPlayer,
        aslImage: !!aslImage
      });
      // Try to create ASL window if it doesn't exist
      if (!aslWindow && aslEnabled) {
        console.log('[Signify] Creating ASL window...');
        createASLWindow();
        // Retry after a short delay
        setTimeout(() => playQueue(), 100);
      }
      return;
    }

    playing = true;
    const mediaItem = videoQueue.shift();
    
    // Handle both object format and legacy string format
    const mediaUrl = typeof mediaItem === 'string' ? mediaItem : mediaItem.url;
    // Extract word - prefer word, fallback to gloss, then empty string
    let currentWord = '';
    if (typeof mediaItem === 'object' && mediaItem) {
      currentWord = mediaItem.word || mediaItem.gloss || '';
    }
    
    const isImage = isImageUrl(mediaUrl);
    const isVideo = isVideoUrl(mediaUrl);
    const mediaType = isImage ? 'image' : (isVideo ? 'video' : 'unknown');
    
    console.log(`[Signify] 🎬 Playing ${mediaType}:`, mediaUrl);
    console.log('[Signify] MediaItem:', mediaItem);
    console.log('[Signify] Extracted word:', currentWord);
    console.log('[Signify] Queue status:', videoQueue.length, 'remaining');

    // Show current word in caption overlay (always show if word exists)
    showCurrentWord(currentWord);

    // Preload next clip if available
    if (videoQueue.length > 0) {
      const nextItem = videoQueue[0];
      const nextUrl = typeof nextItem === 'string' ? nextItem : nextItem.url;
      preloadNextClip(nextUrl).catch(err => {
        console.log('[Signify] Preload failed for next clip:', err);
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
        console.log('[Signify] Using preloaded video');
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
        console.log('[Signify] ✅ Image displayed successfully');

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
          console.log('[Signify] ✅ Video playing successfully');
          
          // Fade in
          aslPlayer.style.opacity = '1';

          // Wait for video to end
          await new Promise((resolve) => {
            aslPlayer.onended = () => {
              console.log('[Signify] ✅ Video ended successfully');
              resolve();
            };
            aslPlayer.onerror = (err) => {
              console.error('[Signify] ❌ Video playback error:', err);
              resolve();
            };
          });

          // Natural transition pause (movement epenthesis)
          await wait(150);
        } catch (playError) {
          console.error('[Signify] ❌ Video play error:', playError);
          throw playError;
        }
      } else {
        console.warn('[Signify] ⚠️ Unknown media type:', mediaUrl);
        await wait(300);
      }

      // Play next clip
      playing = false;
      if (videoQueue.length > 0) {
        playQueue();
      } else {
        console.log('[Signify] Queue finished');
        showCurrentWord(''); // Hide caption when queue finishes
      }
    } catch (error) {
      console.error('[Signify] Error loading media:', error);
      playing = false;
      showCurrentWord(''); // Hide caption on error
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
