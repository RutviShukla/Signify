# ASL Word Videos Setup

## Folder Structure

Each word should have its own folder with a video file:

```
data/asl_dataset/
├── hello/
│   └── hello.mp4
├── world/
│   └── world.mp4
├── you/
│   └── you.mp4
└── ...
```

## Current Mapping

The `mapping.json` file expects these words:
- hello
- world
- you
- how
- are
- thank
- welcome
- please
- yes
- no

## How to Add Videos

1. **Download or create ASL word videos** (MP4 format recommended)
2. **Place each video in its word folder**:
   - `hello/hello.mp4`
   - `world/world.mp4`
   - `you/you.mp4`
   - etc.

3. **Video Requirements**:
   - Format: `.mp4`, `.webm`, or `.mov`
   - Recommended: Short clips (2-5 seconds)
   - Clear signing of the word

## Testing

Once videos are added, test with:
- `http://localhost:3000/asl/hello/hello.mp4`
- `http://localhost:3000/asl/world/world.mp4`

## Adding More Words

1. Create a new folder: `mkdir data/asl_dataset/newword`
2. Add video: `cp video.mp4 data/asl_dataset/newword/newword.mp4`
3. Update `mapping.json`:
   ```json
   {
     "newword": "newword/newword.mp4"
   }
   ```

