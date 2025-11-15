# ASL Dataset Setup Guide

This guide explains how to set up real ASL (American Sign Language) videos for the Signify extension, using the Kaggle ASL dataset or other sources.

## Option 1: Kaggle ASL Dataset (Recommended)

The Kaggle ASL dataset contains real human ASL sign videos organized by word/sign.

### Step 1: Download the Dataset

1. Go to [Kaggle ASL Dataset](https://www.kaggle.com/datasets/ayuraj/asl-dataset)
2. Sign in to Kaggle (create account if needed)
3. Click "Download" to download the dataset
4. Extract the ZIP file

### Step 2: Place Dataset in Backend

1. Extract the dataset to: `backend/data/asl-dataset/`
2. The structure should look like:
   ```
   backend/
   ├── data/
   │   └── asl-dataset/
   │       ├── hello/
   │       │   └── video1.mp4
   │       ├── thank/
   │       │   └── video1.mp4
   │       └── ...
   ```

### Step 3: Process the Dataset

Run the processing script to create word-to-video mappings:

```bash
cd backend
node scripts/process-asl-dataset.js
```

This will:
- Scan all video files in the dataset
- Extract words from filenames/directories
- Create `data/asl-word-mapping.json` for fast lookups
- Create `data/asl-video-index.json` for video indexing

### Step 4: Restart Backend

Restart your backend server:

```bash
npm start
```

The backend will automatically:
- Serve videos from `/asl-videos/` endpoint
- Use the word-to-video mapping for lookups
- Fall back to demo videos if a word isn't found

## Option 2: OpenASL Dataset

For a larger, more comprehensive dataset:

1. Follow the [OpenASL setup guide](https://github.com/chevalierNoir/OpenASL)
2. Download and process videos
3. Set `OPENASL_VIDEO_PATH` environment variable
4. Update the backend to use OpenASL format

## Option 3: WLASL Dataset

WLASL (Word-Level American Sign Language) is another excellent source:

1. Visit [WLASL Dataset](https://dxli94.github.io/WLASL/)
2. Download the dataset
3. Process videos similar to Kaggle dataset
4. Update the mapping script if needed

## Option 4: Online ASL Video Sources

The system includes fallback to online ASL video sources when local dataset is not available. These are automatically used if:
- Kaggle dataset is not downloaded
- Word is not found in local dataset
- Backend cannot access local files

## Testing

After setup, test the ASL avatar:

1. Open a YouTube video with captions
2. Enable the Signify extension
3. Enable "ASL Window"
4. The avatar should display real ASL sign videos

Check backend console for:
- `[Backend] Loaded ASL dataset mapping with X words` - Dataset loaded successfully
- `[Backend] Found X ASL videos (sources: asl-dataset)` - Using real videos
- `[Backend] Found X ASL videos (sources: demo-database)` - Using fallback videos

## Troubleshooting

### "ASL dataset not found"
- Make sure dataset is extracted to `backend/data/asl-dataset/`
- Check folder structure matches expected format

### "ASL word mapping not found"
- Run `node scripts/process-asl-dataset.js`
- Check that `data/asl-word-mapping.json` was created

### Videos not playing
- Check backend console for errors
- Verify videos are accessible at `http://localhost:3000/asl-videos/...`
- Check CORS settings if accessing from extension

### Word not found
- The word might not be in the dataset
- Add it to `aslVideoDatabase` in `server.js` as a fallback
- Or add more videos to the dataset

## Adding Custom ASL Videos

To add custom ASL videos:

1. Place video files in `backend/data/asl-dataset/[word]/`
2. Name files descriptively (e.g., `hello.mp4`, `hello_1.mp4`)
3. Run `node scripts/process-asl-dataset.js` to update mappings
4. Restart backend server

## Future: SignLLM Integration

For generating ASL poses programmatically (not yet available):

- SignLLM is not open-source, but similar models may become available
- When available, we can integrate pose generation
- This would allow real-time ASL generation from any text

## Resources

- [Kaggle ASL Dataset](https://www.kaggle.com/datasets/ayuraj/asl-dataset)
- [OpenASL](https://github.com/chevalierNoir/OpenASL)
- [WLASL Dataset](https://dxli94.github.io/WLASL/)
- [SignLLM Research](https://signllm.github.io/)

