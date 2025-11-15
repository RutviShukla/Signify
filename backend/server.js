const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// Load ASL mapping
let aslMapping = {};
const mappingPath = path.join(__dirname, 'data', 'mapping.json');

if (fs.existsSync(mappingPath)) {
  try {
    aslMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    console.log(`[Backend] Loaded ASL mapping with ${Object.keys(aslMapping).length} words`);
  } catch (error) {
    console.error('[Backend] Error loading mapping:', error.message);
  }
} else {
  console.log('[Backend] Mapping file not found. Create data/mapping.json');
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

// Video mapping endpoint
app.post('/api/asl/video-map', (req, res) => {
  try {
    const { words } = req.body;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Words array is required' 
      });
    }

    const videos = [];

    // Look up each word in mapping
    for (const word of words) {
      const normalizedWord = word.toLowerCase().trim();
      
      if (aslMapping[normalizedWord]) {
        // Get path from mapping
        const videoPath = aslMapping[normalizedWord];
        
        // Construct full URL
        const videoUrl = `http://localhost:${PORT}/asl/${videoPath}`;
        videos.push(videoUrl);
        console.log(`[Backend] Found video for "${normalizedWord}": ${videoUrl}`);
      } else {
        console.log(`[Backend] No video found for word: "${normalizedWord}"`);
      }
    }

    res.json({
      success: true,
      videos: videos,
      wordsFound: videos.length,
      wordsTotal: words.length
    });
  } catch (error) {
    console.error('[Backend] Error in video-map:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to map videos' 
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
  console.log(`  - POST /api/asl/video-map`);
  console.log(`  - POST /api/captions/enhance`);
  console.log(`  - GET  /asl/* (static files)`);
});
