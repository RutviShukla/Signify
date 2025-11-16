const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { normalizeWord, normalizeWords } = require('./utils/gloss-normalizer');
const { fingerspell } = require('./utils/fingerspell');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Load ASL mapping (word-level) - supports both old format (string) and new format (array)
let aslMapping = {};
const mappingPath = path.join(__dirname, 'data', 'mapping.json');

if (fs.existsSync(mappingPath)) {
  try {
    const rawMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    
    // Convert old format (string) to new format (array) for compatibility
    for (const [word, value] of Object.entries(rawMapping)) {
      if (typeof value === 'string') {
        // Old format: "hello": "hello/hello.mp4"
        aslMapping[word] = [value];
      } else if (Array.isArray(value)) {
        // New format: "hello": ["02001.mp4", "02002.mp4"]
        aslMapping[word] = value;
      }
    }
    
    console.log(`[Backend] Loaded ASL word mapping with ${Object.keys(aslMapping).length} words`);
  } catch (error) {
    console.error('[Backend] Error loading mapping:', error.message);
  }
} else {
  console.log('[Backend] Mapping file not found. Run: node scripts/generate-wlasl-mapping.js');
}

// Load ASL letter mapping (for finger-spelling)
let aslLetterMapping = {};
const letterMappingPath = path.join(__dirname, 'data', 'asl-word-mapping.json');

if (fs.existsSync(letterMappingPath)) {
  try {
    const letterData = JSON.parse(fs.readFileSync(letterMappingPath, 'utf8'));
    // Extract only letters (a-z) and numbers (0-9, zero-nine)
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    
    for (const letter of [...letters, ...numbers]) {
      if (letterData[letter] && letterData[letter].length > 0) {
        // Get the first image URL for this letter
        const entry = letterData[letter][0];
        let url = entry.url;
        
        // Fix URL path - convert to /asl/ path format
        // Original: /asl-videos/data/asl_dataset/h/hand1_h_bot_seg_1_cropped.jpeg
        // Target: /asl/h/hand1_h_bot_seg_1_cropped.jpeg
        
        let cleanUrl = url;
        
        // Remove /asl-videos prefix if present
        if (cleanUrl.includes('/asl-videos/')) {
          cleanUrl = cleanUrl.replace('/asl-videos/', '/');
        }
        
        // Remove /data/asl_dataset/ prefix if present
        if (cleanUrl.includes('/data/asl_dataset/')) {
          cleanUrl = cleanUrl.replace('/data/asl_dataset/', '/');
        }
        
        // Remove data/asl_dataset/ prefix if present (no leading slash)
        if (cleanUrl.includes('data/asl_dataset/')) {
          cleanUrl = cleanUrl.replace('data/asl_dataset/', '/');
        }
        
        // Ensure it starts with /asl/
        if (!cleanUrl.startsWith('/asl/')) {
          // Extract just the letter folder and filename
          const match = cleanUrl.match(/([a-z0-9])\/[^\/]+\.(jpeg|jpg|png|mp4)$/i);
          if (match) {
            cleanUrl = `/asl/${match[0]}`;
          } else {
            // Fallback: try to extract from path
            const parts = cleanUrl.split('/');
            const letterPart = parts.find(p => p.length === 1 && /[a-z0-9]/.test(p));
            const filePart = parts[parts.length - 1];
            if (letterPart && filePart) {
              cleanUrl = `/asl/${letterPart}/${filePart}`;
            }
          }
        }
        
        aslLetterMapping[letter] = cleanUrl;
      }
    }
    console.log(`[Backend] Loaded ASL letter mapping with ${Object.keys(aslLetterMapping).length} letters/numbers`);
  } catch (error) {
    console.error('[Backend] Error loading letter mapping:', error.message);
  }
} else {
  console.log('[Backend] Letter mapping file not found. Will use word-level only.');
}

// Serve fingerspelling images
const fingerspellingPath = path.join(__dirname, 'data', 'fingerspelling');
if (fs.existsSync(fingerspellingPath)) {
  app.use('/fingerspelling', express.static(fingerspellingPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
    }
  }));
  console.log(`[Backend] Serving fingerspelling from: ${fingerspellingPath}`);
} else {
  console.log(`[Backend] Fingerspelling directory not found at: ${fingerspellingPath}`);
}

// Serve ASL dataset statically
const aslDatasetPath = path.join(__dirname, 'data', 'asl_dataset');

if (fs.existsSync(aslDatasetPath)) {
  // Serve static files
  app.use('/asl', express.static(aslDatasetPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (filePath.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/webm');
      } else if (filePath.endsWith('.mov')) {
        res.setHeader('Content-Type', 'video/quicktime');
      } else if (filePath.endsWith('.jpeg') || filePath.endsWith('.jpg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      }
    }
  }));

  // Handle root /asl/ path - show available words
  app.get('/asl/', (req, res) => {
    try {
      const words = Object.keys(aslMapping);
      res.json({
        message: 'ASL dataset is available',
        availableWords: words,
        example: `Access videos like: http://localhost:${PORT}/asl/hello/hello.mp4`,
        totalWords: words.length
      });
    } catch (error) {
      res.json({
        message: 'ASL dataset is available',
        note: 'Access specific files like: /asl/word/video.mp4'
      });
    }
  });

  console.log(`[Backend] Serving ASL dataset from: ${aslDatasetPath}`);
  console.log(`[Backend] Static files available at: http://localhost:${PORT}/asl/`);
} else {
  console.log(`[Backend] ASL dataset not found at: ${aslDatasetPath}`);
  
  // Still handle /asl/ route even if dataset doesn't exist
  app.get('/asl/', (req, res) => {
    res.status(404).json({
      error: 'ASL dataset not found',
      message: `Create folder at: ${aslDatasetPath}`,
      expectedStructure: 'data/asl_dataset/word/video.mp4'
    });
  });
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Deaflix API is running' });
});

// Video mapping endpoint with full WLASL pipeline
// GET handler for testing
app.get('/api/asl/video-map', (req, res) => {
  res.json({
    message: 'This endpoint requires POST method',
    usage: 'POST /api/asl/video-map',
    example: {
      method: 'POST',
      url: 'http://localhost:3000/api/asl/video-map',
      body: {
        text: 'Hello, how are you?',
        words: ['hello', 'how', 'are', 'you']
      }
    },
    availableWords: Object.keys(aslMapping).slice(0, 20),
    totalWords: Object.keys(aslMapping).length
  });
});

app.post('/api/asl/video-map', (req, res) => {
  try {
    const { text, words } = req.body;

    // Extract words from text if not provided
    let wordList = words;
    if (!wordList && text) {
      wordList = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);
    }

    if (!wordList || !Array.isArray(wordList)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Words array or text string is required' 
      });
    }

    const sequence = [];
    const foundWords = [];
    const notFoundWords = [];

    // Process each word - only use WLASL videos, no finger-spelling
    for (const word of wordList) {
      const normalizedWord = word.toLowerCase().trim();
      
      // Step 1: Normalize word to gloss
      const gloss = normalizeWord(normalizedWord);
      
      if (!gloss) {
        // Stop word - skip silently
        continue;
      }
      
      // Step 2: Try WLASL mapping (word-level videos only)
      if (aslMapping[gloss] && Array.isArray(aslMapping[gloss]) && aslMapping[gloss].length > 0) {
        // Use first available video
        const videoFile = aslMapping[gloss][0];
        
        // videoFile can be either:
        // - Old format: "how/how.mp4" (already includes path)
        // - New format: "02001.mp4" (just filename, needs gloss folder)
        let videoUrl;
        if (videoFile.includes('/')) {
          // Already has path (old format): "how/how.mp4" → /asl/how/how.mp4
          videoUrl = `http://localhost:${PORT}/asl/${videoFile}`;
        } else {
          // Just filename (new format): "02001.mp4" → /asl/how/02001.mp4
          videoUrl = `http://localhost:${PORT}/asl/${gloss}/${videoFile}`;
        }
        
        sequence.push({
          type: 'video',
          url: videoUrl,
          word: word,
          gloss: gloss
        });
        
        foundWords.push(gloss);
        console.log(`[Backend] ✅ WLASL video for "${word}" → "${gloss}": ${videoUrl}`);
      } else {
        // Word not found in WLASL dataset - skip (no finger-spelling)
        notFoundWords.push(word);
        console.log(`[Backend] ⚠️ No WLASL video found for "${word}" (gloss: "${gloss}") - skipping`);
      }
    }

    // Build response
    const response = {
      success: true,
      sequence: sequence,
      videos: sequence.map(item => item.url), // Backward compatibility
      wordsFound: foundWords.length,
      wordsTotal: wordList.length,
      foundWords: foundWords,
      notFoundWords: notFoundWords,
      availableWords: Object.keys(aslMapping).slice(0, 50) // Limit for response size
    };

    console.log(`[Backend] Summary: ${foundWords.length} WLASL videos found, ${notFoundWords.length} words not in dataset`);
    console.log(`[Backend] Total videos in sequence: ${sequence.length}`);

    res.json(response);
  } catch (error) {
    console.error('[Backend] Error in video-map:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to map videos',
      message: error.message
    });
  }
});

// Caption enhancement endpoint (optional MVP)
app.post('/api/captions/enhance', (req, res) => {
  try {
    const { captions } = req.body;

    if (!captions || !Array.isArray(captions)) {
      return res.status(400).json({ error: 'Captions array is required' });
    }

    // Light cleaning: remove common noise, fix punctuation
    const enhanced = captions.map(caption => {
      let cleaned = caption
        .replace(/\[.*?\]/g, '') // Remove [Music], [Applause], etc.
        .replace(/\(.*?\)/g, '') // Remove (laughter), etc.
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Fix common punctuation issues
      cleaned = cleaned
        .replace(/\s+([,.!?])/g, '$1') // Remove space before punctuation
        .replace(/([,.!?])([^\s])/g, '$1 $2'); // Add space after punctuation

      return cleaned;
    }).filter(c => c.length > 0);

    res.json({
      success: true,
      originalCount: captions.length,
      enhancedCount: enhanced.length,
      enhancedCaptions: enhanced
    });
  } catch (error) {
    console.error('[Backend] Error enhancing captions:', error);
    res.status(500).json({ error: 'Failed to enhance captions' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Backend] Server running on http://localhost:${PORT}`);
  console.log(`[Backend] API endpoints:`);
  console.log(`  - GET  /api/health`);
  console.log(`  - GET  /api/asl/video-map (info only)`);
  console.log(`  - POST /api/asl/video-map (main endpoint)`);
  console.log(`  - POST /api/captions/enhance`);
  console.log(`  - GET  /asl/* (static files)`);
  console.log(`  - GET  /fingerspelling/* (static files)`);
});
