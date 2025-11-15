const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock ASL video database (in production, this would connect to SignLLM/OpenASL)
const aslVideoDatabase = {
  'hello': 'https://example.com/asl/hello.mp4',
  'thank you': 'https://example.com/asl/thankyou.mp4',
  'please': 'https://example.com/asl/please.mp4',
  'welcome': 'https://example.com/asl/welcome.mp4',
  // Add more mappings as needed
};

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

// Get ASL video for a phrase
app.post('/api/asl/video', async (req, res) => {
  try {
    const { phrase, videoId } = req.body;

    if (!phrase) {
      return res.status(400).json({ error: 'Phrase is required' });
    }

    // In production, this would:
    // 1. Query SignLLM or ASL dataset
    // 2. Generate or retrieve ASL video
    // 3. Return video URL or stream

    // For demo: return mock video URL
    const normalizedPhrase = phrase.toLowerCase().trim();
    const aslVideoUrl = aslVideoDatabase[normalizedPhrase] || 
                       `https://via.placeholder.com/300x400/667eea/ffffff?text=ASL+${encodeURIComponent(phrase)}`;

    res.json({
      success: true,
      phrase,
      videoUrl: aslVideoUrl,
      source: 'mock', // 'signllm', 'openasl', 'kaggle', etc.
      videoId
    });
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
                 `https://via.placeholder.com/300x400/667eea/ffffff?text=ASL+${encodeURIComponent(phrase)}`,
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

