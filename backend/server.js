const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration to allow requests from extension
// Note: Chrome blocks HTTPS->HTTP requests, so we allow all origins for extension proxy
app.use(cors({
  origin: true, // Allow all origins (extension will proxy the request)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve ASL videos/images statically from dataset directory
// Try both folder name variations (asl-dataset or asl_dataset)
const aslDatasetPathHyphen = path.join(__dirname, 'data', 'asl-dataset');
const aslDatasetPathUnderscore = path.join(__dirname, 'data', 'asl_dataset');
const aslDatasetPath = fs.existsSync(aslDatasetPathUnderscore) 
  ? aslDatasetPathUnderscore 
  : aslDatasetPathHyphen;

if (fs.existsSync(aslDatasetPath)) {
  app.use('/asl-videos', express.static(aslDatasetPath));
  console.log(`[Backend] Serving ASL media from: ${aslDatasetPath}`);
} else {
  console.log(`[Backend] ASL dataset not found. Using fallback videos.`);
  console.log(`[Backend] Expected location: ${aslDatasetPathHyphen} or ${aslDatasetPathUnderscore}`);
}

// Load ASL word-to-video mapping from processed dataset
let aslDatasetMapping = {};
const aslMappingPath = path.join(__dirname, 'data', 'asl-word-mapping.json');
if (fs.existsSync(aslMappingPath)) {
  try {
    aslDatasetMapping = JSON.parse(fs.readFileSync(aslMappingPath, 'utf8'));
    console.log(`[Backend] Loaded ASL dataset mapping with ${Object.keys(aslDatasetMapping).length} words`);
  } catch (error) {
    console.error('[Backend] Error loading ASL dataset mapping:', error.message);
  }
} else {
  console.log(`[Backend] ASL word mapping not found. Run: node scripts/process-asl-dataset.js`);
}

// ASL video database - maps words to ASL sign videos
// In production, these would be actual ASL sign videos from OpenASL or other datasets
// For demo: Using different videos for each word so you can see the avatar "signing" different words
// TODO: Replace with actual ASL sign language video URLs
const aslVideoDatabase = {
  // Common words - each word should have its own unique ASL sign video
  // For now using demo videos - replace with actual ASL videos
  'hello': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'hi': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'thank': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'you': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'welcome': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'please': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'yes': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'no': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'this': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'is': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'to': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'and': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'video': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
  'how': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'are': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'what': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'where': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'when': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'why': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'who': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'can': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'will': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'would': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'should': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'could': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
  // Add more mappings as needed
  // NOTE: Replace these URLs with actual ASL sign language video URLs from OpenASL or other datasets
};

// Helper: Extract words from phrase and filter common stop words
function extractSignWords(text) {
  if (!text) return [];
  
  // Remove punctuation and convert to lowercase
  const cleaned = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim();
  
  // Split into words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  // Filter out very common words that might not have distinct signs
  // In ASL, these are often omitted or combined with other signs
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
  
  // Return significant words (filter stop words, but keep some context)
  return words.filter(w => !stopWords.has(w) || words.length <= 3);
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Deaflix API is running' });
});

// Enhance captions endpoint
app.post('/api/captions/enhance', async (req, res) => {
  try {
    const { captions, videoId, platform } = req.body;

    if (!captions || !Array.isArray(captions)) {
      return res.status(400).json({ error: 'Captions array is required' });
    }

    // Clean and enhance captions
    const enhancedCaptions = await enhanceCaptions(captions);

    res.json({
      success: true,
      originalCount: captions.length,
      enhancedCount: enhancedCaptions.length,
      enhancedCaptions: enhancedCaptions,
      videoId,
      platform
    });
  } catch (error) {
    console.error('Error enhancing captions:', error);
    res.status(500).json({ error: 'Failed to enhance captions' });
  }
});

// Get OpenASL videos for text (NEW ENDPOINT - uses OpenASL dataset)
app.post('/api/asl/openasl', async (req, res) => {
  try {
    const { text, words, videoId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Extract words if not provided
    const signWords = words || extractSignWords(text.toLowerCase().trim());
    
    console.log(`[Backend] Looking up OpenASL videos for: "${text}" (words: ${signWords.join(', ')})`);
    
    // TODO: In production, this would:
    // 1. Load OpenASL dataset (data/openasl-v1.0.tsv)
    // 2. Match words/phrases to video clips
    // 3. Return video URLs or file paths
    
    // For now, return structure for OpenASL integration
    // You'll need to:
    // - Download OpenASL videos using: python prep/download.py --tsv data/openasl-v1.0.tsv --dest /path/to/videos
    // - Process videos: python prep/crop_video.py --tsv data/openasl-v1.0.tsv --bbox data/bbox-v1.0.json --raw /path/to/videos --output /path/to/processed
    // - Create a lookup index mapping text to video paths
    
    // Map each word to an ASL sign video or, for finger-spelling, to a sequence of letter images
    // Priority: 1. ASL Dataset, 2. aslVideoDatabase, 3. Fallback: spell each letter
    const videoMappings = signWords.map(word => {
      const normalizedWord = word.toLowerCase().trim();
      // Check for a word-level sign (video or image)
      if (aslDatasetMapping[normalizedWord] && aslDatasetMapping[normalizedWord].length > 0) {
        const entry = aslDatasetMapping[normalizedWord][0];
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
        const url = entry.url.startsWith("http") ? entry.url : `${backendUrl}${entry.url}`;
        return {
          word: normalizedWord,
          sequence: [url],
          found: true,
          source: 'asl-dataset-word'
        };
      }
      // Check in fallback videos
      if (aslVideoDatabase[normalizedWord]) {
        return {
          word: normalizedWord,
          sequence: [aslVideoDatabase[normalizedWord]],
          found: true,
          source: 'demo-database'
        };
      }
      // Spell word using letter images (finger-spelling)
      const letters = normalizedWord.split("");
      const letterUrls = letters.map(letter => {
        // use only a-z / 0-9 for now
        if (aslDatasetMapping[letter] && aslDatasetMapping[letter].length > 0) {
          const entry = aslDatasetMapping[letter][0];
          const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
          return entry.url.startsWith("http") ? entry.url : `${backendUrl}${entry.url}`;
        }
        return null;
      }).filter(url => url !== null);
      if (letterUrls.length > 0) {
        return {
          word: normalizedWord,
          sequence: letterUrls,
          found: true,
          source: 'asl-fingerspell'
        };
      }
      // No match at all
      return null;
    }).filter(v => v !== null);

    // If we found any mapping(s), return those as a sequence per word
    if (videoMappings.length > 0) {
      const sources = [...new Set(videoMappings.map(v => v.source))];
      // Flatten the sequences for visual playback
      const playbackSequence = videoMappings.flatMap(v => v.sequence);
      res.json({
        success: true,
        text,
        words: signWords,
        // 'videos': for backward compatibility; array with all gesture images in playback order
        videos: playbackSequence,
        // New: 'sequenceMappings': for each word, show its sequence (image URLs and source)
        sequenceMappings: videoMappings,
        source: sources,
        videoId
      });
      return;
    }
    
    // Fallback: Try to find partial matches or use demo video
    // Check if any word variations exist in dataset
    let partialMatches = [];
    signWords.forEach(word => {
      // Check for partial word matches (e.g., "thank" matches "thanks")
      Object.keys(aslDatasetMapping).forEach(datasetWord => {
        if (datasetWord.includes(word) || word.includes(datasetWord)) {
          if (aslDatasetMapping[datasetWord] && aslDatasetMapping[datasetWord].length > 0) {
            const videoEntry = aslDatasetMapping[datasetWord][0];
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
            const videoUrl = videoEntry.url.startsWith('http') 
              ? videoEntry.url 
              : `${backendUrl}${videoEntry.url}`;
            partialMatches.push({
              word: word,
              matchedWord: datasetWord,
              videoUrl: videoUrl,
              source: 'partial-match'
            });
          }
        }
      });
    });
    
    if (partialMatches.length > 0) {
      console.log(`[Backend] Using ${partialMatches.length} partial matches for words`);
      res.json({
        success: true,
        text,
        words: signWords,
        videos: partialMatches.map(v => v.videoUrl),
        wordMappings: partialMatches,
        source: 'partial-match',
        videoId,
        message: `Using partial matches. For better results, download Kaggle ASL dataset.`
      });
      return;
    }
    
    // Final fallback: return a demo video with helpful message
    const fallbackVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    res.json({
      success: true,
      text,
      words: signWords,
      videos: [fallbackVideo],
      source: 'fallback',
      videoId,
      message: `No ASL videos found for words: ${signWords.join(', ')}. To use real ASL videos:\n1. Download Kaggle ASL dataset: https://www.kaggle.com/datasets/ayuraj/asl-dataset\n2. Extract to backend/data/asl-dataset/\n3. Run: node scripts/process-asl-dataset.js\n4. Restart backend server`
    });
  } catch (error) {
    console.error('Error getting OpenASL videos:', error);
    res.status(500).json({ error: 'Failed to get OpenASL videos' });
  }
});

// Get ASL animation data for real-time avatar (KEPT FOR BACKWARD COMPATIBILITY)
app.post('/api/asl/animate', async (req, res) => {
  try {
    const { text, words, videoId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Extract words if not provided
    const signWords = words || extractSignWords(text.toLowerCase().trim());
    
    // Return animation instructions for the avatar
    // This tells the frontend how to animate the avatar for each word/sign
    res.json({
      success: true,
      text,
      words: signWords,
      animationData: {
        // Duration for each word (milliseconds)
        wordDurations: signWords.map(() => 800),
        // Total animation duration
        totalDuration: signWords.length * 800,
        // Gesture types for each word (can be expanded)
        gestures: signWords.map(word => ({
          word: word,
          gestureType: getGestureType(word), // Simple gesture mapping
          duration: 800
        }))
      },
      videoId
    });
  } catch (error) {
    console.error('Error getting ASL animation:', error);
    res.status(500).json({ error: 'Failed to get ASL animation' });
  }
});

// Helper: Get gesture type for a word (simplified)
function getGestureType(word) {
  // This is a simplified mapping - in production, this would use
  // a comprehensive ASL gesture database
  const gestureMap = {
    'hello': 'wave',
    'hi': 'wave',
    'thank': 'gratitude',
    'you': 'point',
    'welcome': 'open',
    'please': 'request',
    'yes': 'nod',
    'no': 'shake'
  };
  
  return gestureMap[word.toLowerCase()] || 'default';
}

// Get ASL video for a phrase (word-by-word) - KEPT FOR BACKWARD COMPATIBILITY
app.post('/api/asl/video', async (req, res) => {
  try {
    const { phrase, videoId } = req.body;

    if (!phrase) {
      return res.status(400).json({ error: 'Phrase is required' });
    }

    const normalizedPhrase = phrase.toLowerCase().trim();
    
    // Extract individual words from the phrase
    const words = extractSignWords(normalizedPhrase);
    console.log(`[Backend] Extracted words from "${phrase}":`, words);
    
    // Get ASL video for each word
    const aslVideos = words.map(word => {
      // Check if we have a video for this word
      const videoUrl = aslVideoDatabase[word];
      
      return {
        word: word,
        videoUrl: videoUrl || null,
        hasVideo: !!videoUrl
      };
    }).filter(item => item.videoUrl !== null); // Only include words with videos
    
    // If we have videos, return them in sequence
    if (aslVideos.length > 0) {
      res.json({
        success: true,
        phrase,
        videoUrl: aslVideos[0].videoUrl, // First video for backward compatibility
        videos: aslVideos.map(v => v.videoUrl), // Array of video URLs in sequence
        words: aslVideos.map(v => v.word), // Words being signed
        source: 'word-mapping',
        videoId
      });
    } else {
      // No videos found - return a demo video as fallback
      const fallbackVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      res.json({
        success: true,
        phrase,
        videoUrl: fallbackVideo,
        videos: [fallbackVideo],
        words: [normalizedPhrase],
        source: 'fallback',
        videoId,
        message: 'Using fallback video - ASL sign videos not available for these words'
      });
    }
  } catch (error) {
    console.error('Error getting ASL video:', error);
    res.status(500).json({ error: 'Failed to get ASL video' });
  }
});

// Batch ASL video lookup
app.post('/api/asl/batch', async (req, res) => {
  try {
    const { phrases, videoId } = req.body;

    if (!phrases || !Array.isArray(phrases)) {
      return res.status(400).json({ error: 'Phrases array is required' });
    }

    const aslVideos = phrases.map(phrase => {
      const normalizedPhrase = phrase.toLowerCase().trim();
      return {
        phrase,
        videoUrl: aslVideoDatabase[normalizedPhrase] || 
                 `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
        source: 'mock'
      };
    });

    res.json({
      success: true,
      videos: aslVideos,
      videoId
    });
  } catch (error) {
    console.error('Error getting batch ASL videos:', error);
    res.status(500).json({ error: 'Failed to get ASL videos' });
  }
});

// New endpoint: Get ASL videos for multiple words at once
app.post('/api/asl/words', async (req, res) => {
  try {
    const { words } = req.body;

    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ error: 'Words array is required' });
    }

    const aslVideos = words.map(word => {
      const normalized = word.toLowerCase().trim();
      return {
        word: normalized,
        videoUrl: aslVideoDatabase[normalized] || null,
        hasVideo: !!aslVideoDatabase[normalized]
      };
    }).filter(item => item.videoUrl !== null);

    res.json({
      success: true,
      videos: aslVideos,
      totalWords: words.length,
      foundVideos: aslVideos.length
    });
  } catch (error) {
    console.error('Error getting ASL words:', error);
    res.status(500).json({ error: 'Failed to get ASL words' });
  }
});

// Caption enhancement function
async function enhanceCaptions(captions) {
  // For demo: Basic cleaning and formatting
  // In production, this would use OpenAI API or similar for advanced enhancement
  
  const enhanced = captions.map((caption, index) => {
    const text = typeof caption === 'string' ? caption : caption.text || '';
    
    // Basic cleaning
    let cleaned = text
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\[.*?\]/g, '') // Remove [music], [applause], etc.
      .replace(/\(.*?\)/g, '') // Remove (laughter), etc.
      .trim();

    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    // Add timing if not present
    const start = typeof caption === 'object' && caption.start ? caption.start : index * 3;
    const end = typeof caption === 'object' && caption.end ? caption.end : start + 3;

    return {
      text: cleaned,
      start,
      end,
      original: text
    };
  });

  // If OpenAI API key is available, use it for advanced enhancement
  if (process.env.OPENAI_API_KEY) {
    try {
      const enhancedWithAI = await enhanceWithOpenAI(captions);
      return enhancedWithAI;
    } catch (error) {
      console.error('OpenAI enhancement failed, using basic enhancement:', error);
      return enhanced;
    }
  }

  return enhanced;
}

// OpenAI enhancement (optional)
async function enhanceWithOpenAI(captions) {
  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const captionText = captions.map(c => typeof c === 'string' ? c : c.text).join('\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a caption enhancement assistant. Clean and improve video captions for educational content. Remove filler words, fix grammar, and make them more readable while preserving the original meaning.'
      },
      {
        role: 'user',
        content: `Enhance these captions:\n\n${captionText}`
      }
    ],
    temperature: 0.3
  });

  const enhancedText = response.choices[0].message.content;
  const enhancedLines = enhancedText.split('\n').filter(line => line.trim());

  return enhancedLines.map((line, index) => ({
    text: line.trim(),
    start: index * 3,
    end: (index + 1) * 3,
    original: captions[index]?.text || captions[index] || ''
  }));
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Deaflix Backend API running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
});

