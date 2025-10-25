# Image Similarity Game - Python Backend Integration

This directory contains the Python backend for the image similarity game.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. Start the Python Backend Server

```bash
python server.py
```

The server will start on `http://localhost:5000` by default.

### 3. Configure Environment Variable

In your Next.js project root, create or update `.env.local`:

```
PYTHON_BACKEND_URL=http://localhost:5000
```

### 4. Test the Integration

The API route at `/api/image-similarity` will automatically use the Python backend when `PYTHON_BACKEND_URL` is configured. If not configured, it will fall back to a simple heuristic calculation.

## Python Backend Features

The Python backend uses the `ImageSimilarityCalculator` class which employs multiple algorithms:

1. **Structural Similarity (SSIM)** - 30% weight
2. **Histogram Comparison** - 20% weight
3. **Feature Matching (ORB)** - 20% weight
4. **Color Similarity** - 15% weight
5. **Edge Similarity** - 15% weight

The final score is a weighted combination of these metrics, scaled to 1-10.

## API Endpoint

### POST /calculate-similarity

**Request Body:**
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

## Development Notes

- The Python backend expects base64-encoded images
- Reference images should be stored in the `reference_images/` directory
- You can add more reference images by updating both the frontend and backend
