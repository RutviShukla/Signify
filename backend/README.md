# Deaflix Backend API

Backend server for Deaflix Chrome Extension providing caption enhancement and ASL video services.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. (Optional) Add your OpenAI API key to `.env` for advanced caption enhancement.

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Enhance Captions
```
POST /api/captions/enhance
Body: {
  "captions": ["caption text 1", "caption text 2"],
  "videoId": "youtube_video_id",
  "platform": "youtube"
}
```

### Get ASL Video
```
POST /api/asl/video
Body: {
  "phrase": "hello",
  "videoId": "youtube_video_id"
}
```

### Batch ASL Videos
```
POST /api/asl/batch
Body: {
  "phrases": ["hello", "thank you"],
  "videoId": "youtube_video_id"
}
```

## Integration with ASL Datasets

To integrate with real ASL datasets:

1. **SignLLM**: Add API integration in `server.js`
2. **OpenASL**: Connect to OpenASL dataset
3. **Kaggle ASL**: Download and process Kaggle dataset locally

## Production Deployment

For production, consider:
- Using a cloud service (Heroku, Railway, AWS)
- Setting up proper CORS policies
- Adding authentication/rate limiting
- Connecting to real ASL video databases

