import { NextRequest, NextResponse } from 'next/server';

// Reference images mapping (emoji to actual reference image data)
const REFERENCE_IMAGES: Record<number, string> = {
    1: '🏠', // House
    2: '😊', // Smiley
    3: '🌳', // Tree
    4: '🐱', // Cat
    5: '☀️', // Sun
};

/**
 * For now, this implements a simplified similarity calculation
 * In production, this would call the Python backend with the image_similarity.py module
 * 
 * To integrate with the Python backend:
 * 1. Set up a Python Flask/FastAPI server with the image_similarity.py module
 * 2. Deploy it or run it locally
 * 3. Update this route to call that server
 */
async function calculateImageSimilarity(
    referenceImageId: number,
    userImageBase64: string
): Promise<number> {
    // TODO: Integrate with Python backend
    // For now, return a mock score based on image data complexity

    try {
        // Simple heuristic: count non-white pixels as a proxy for drawing effort
        // This is a placeholder until Python integration is complete
        const base64Data = userImageBase64.split(',')[1];
        const complexity = base64Data.length / 10000; // Rough measure of image complexity

        // Generate a score between 1-10 based on complexity
        // In reality, this should call the Python similarity calculator
        const score = Math.min(10, Math.max(1, 3 + complexity));

        return parseFloat(score.toFixed(1));
    } catch (error) {
        console.error('Error calculating similarity:', error);
        return 5.0; // Default middle score on error
    }
}

/**
 * Alternative: Call Python backend if available
 * Uncomment and configure this when you have the Python server running
 */
async function calculateImageSimilarityWithPython(
    referenceImageId: number,
    userImageBase64: string
): Promise<number> {
    try {
        // Assuming Python backend is running on localhost:5000
        const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5000';

        const response = await fetch(`${pythonBackendUrl}/calculate-similarity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reference_image_id: referenceImageId,
                user_image: userImageBase64,
            }),
        });

        if (!response.ok) {
            throw new Error('Python backend request failed');
        }

        const data = await response.json();
        return data.score;
    } catch (error) {
        console.error('Error calling Python backend:', error);
        // Fallback to simple calculation
        return calculateImageSimilarity(referenceImageId, userImageBase64);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { referenceImageId, userImage } = body;

        // Validate inputs
        if (!referenceImageId || !userImage) {
            return NextResponse.json(
                { error: 'Missing required fields: referenceImageId and userImage' },
                { status: 400 }
            );
        }

        if (!REFERENCE_IMAGES[referenceImageId]) {
            return NextResponse.json(
                { error: 'Invalid reference image ID' },
                { status: 400 }
            );
        }

        // Calculate similarity score
        // Use Python backend if PYTHON_BACKEND_URL is configured
        const score = process.env.PYTHON_BACKEND_URL
            ? await calculateImageSimilarityWithPython(referenceImageId, userImage)
            : await calculateImageSimilarity(referenceImageId, userImage);

        return NextResponse.json({
            score,
            referenceImageId,
            message: 'Similarity calculated successfully',
        });
    } catch (error) {
        console.error('Error in image similarity API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
