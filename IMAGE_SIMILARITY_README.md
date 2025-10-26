# Image Similarity Game Integration

This document explains how to use the new Image Similarity game in the Prompt Royale application.

## Overview

The Image Similarity game allows users to recreate prompted images through drawing. The system scores their artwork from 1-10 based on similarity using advanced computer vision algorithms.

## Features

- 🎨 **Interactive Drawing Canvas** - Draw directly in the browser with adjustable brush size and color
- 🖼️ **Multiple Reference Images** - Choose from various prompts (house, smiley face, tree, cat, sun)
- 🔢 **AI-Powered Scoring** - Uses 5 different similarity algorithms for accurate scoring
- ⚡ **Real-time Feedback** - Instant scoring after submission

## Quick Start

### 1. Try the Game (Simple Mode)

The game works out of the box with a simplified scoring algorithm:

```bash
# Start your Next.js development server
npm run dev
```

Navigate to http://localhost:3000 and click on the "Image Similarity" game tile.

### 2. Full Python Backend Integration (Advanced)

For accurate scoring using the full image similarity calculator:

#### Step 1: Set up Python Backend

```bash
cd python-backend
./setup.sh
```

Or manually:

```bash
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Step 2: Start the Python Server

```bash
source venv/bin/activate
python server.py
```

The server will start on http://localhost:5000

#### Step 3: Configure Environment

Create or update `.env.local` in your project root:

```env
PYTHON_BACKEND_URL=http://localhost:5000
```

#### Step 4: Start Next.js

```bash
npm run dev
```

## How It Works

### Similarity Scoring Algorithms

The Python backend uses 5 sophisticated algorithms to calculate similarity:

1. **Structural Similarity (SSIM)** - 30% weight
   - Compares structural patterns and textures
   
2. **Histogram Comparison** - 20% weight
   - Analyzes color distribution across RGB channels
   
3. **Feature Matching (ORB)** - 20% weight
   - Matches key visual features between images
   
4. **Color Similarity** - 15% weight
   - Compares overall color palettes
   
5. **Edge Similarity** - 15% weight
   - Analyzes edge patterns and shapes

The final score is a weighted combination scaled to 1-10.

### Architecture

```
User Drawing (Canvas)
    ↓
Next.js API Route (/api/image-similarity)
    ↓
Python Flask Server (optional)
    ↓
ImageSimilarityCalculator
    ↓
Score (1-10)
```

## API Reference

### POST /api/image-similarity

Calculate similarity between user drawing and reference image.

**Request:**
```json
{
  "referenceImageId": 1,
  "userImage": "data:image/png;base64,iVBORw0KG..."
}
```

**Response:**
```json
{
  "score": 7.5,
  "referenceImageId": 1,
  "message": "Similarity calculated successfully"
}
```

### POST /calculate-similarity (Python Backend)

**Request:**
```json
{
  "reference_image_id": 1,
  "user_image": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "score": 7.5,
  "reference_image_id": 1
}
```

## File Structure

```
prompt-royale/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main page with game tiles
│   │   ├── games/
│   │   │   └── image-similarity/
│   │   │       └── page.tsx            # Game UI and canvas
│   │   └── api/
│   │       └── image-similarity/
│   │           └── route.ts            # API endpoint
│   └── ...
└── python-backend/
    ├── README.md                        # Backend documentation
    ├── requirements.txt                 # Python dependencies
    ├── setup.sh                         # Setup script
    ├── server.py                        # Flask server
    └── image_similarity.py              # Similarity calculator
```

## Development Notes

### Adding New Reference Images

1. Add to the frontend (`src/app/games/image-similarity/page.tsx`):
```typescript
const REFERENCE_IMAGES = [
  // ... existing images
  { id: 6, name: 'Star', emoji: '⭐', description: 'Draw a star' },
];
```

2. Add to the API route (`src/app/api/image-similarity/route.ts`):
```typescript
const REFERENCE_IMAGES: Record<number, string> = {
  // ... existing mappings
  6: '⭐',
};
```

3. Add to the Python server (`python-backend/server.py`):
```python
REFERENCE_IMAGES = {
    # ... existing mappings
    6: '⭐',
}
```

### Troubleshooting

**Issue:** Python dependencies won't install
- Solution: Ensure you have Python 3.8+ installed
- Try: `pip install --upgrade pip` before installing requirements

**Issue:** CORS errors when calling Python backend
- Solution: Verify Flask-CORS is installed and the server is running
- Check that PYTHON_BACKEND_URL matches the server address

**Issue:** Low scores for good drawings
- Solution: Ensure you're using the Python backend for accurate scoring
- The fallback JavaScript scoring is intentionally simplified

## Future Enhancements

- [ ] Add actual reference images instead of emojis
- [ ] Implement real-time scoring as user draws
- [ ] Add multiplayer mode where users compete
- [ ] Integrate with LLM for dynamic prompt generation
- [ ] Save high scores and drawing history
- [ ] Add time limits for additional challenge

## Contributing

When adding features to the Image Similarity game:

1. Update both frontend and backend if adding new reference images
2. Test with both simplified and Python backend scoring
3. Ensure responsive design works on mobile devices
4. Add appropriate error handling

## License

Part of the Prompt Royale project.
