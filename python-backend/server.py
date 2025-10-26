from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging

# Add the attached backend to the path if needed
sys.path.append('/Users/abrahamzhong/Desktop/image-similarity-game-backend')

from image_similarity import ImageSimilarityCalculator

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the similarity calculator
calculator = ImageSimilarityCalculator()

# Reference images mapping
REFERENCE_IMAGES = {
    1: '🏠',  # House
    2: '😊',  # Smiley
    3: '🌳',  # Tree
    4: '🐱',  # Cat
    5: '☀️',  # Sun
}

@app.route('/calculate-similarity', methods=['POST'])
def calculate_similarity():
    """
    Calculate similarity between user's drawing and reference image
    """
    try:
        data = request.json
        reference_image_id = data.get('reference_image_id')
        user_image_base64 = data.get('user_image')

        if not reference_image_id or not user_image_base64:
            return jsonify({'error': 'Missing required fields'}), 400

        if reference_image_id not in REFERENCE_IMAGES:
            return jsonify({'error': 'Invalid reference image ID'}), 400

        logger.info(f"Calculating similarity for reference image {reference_image_id}")

        # Decode user's image
        user_image = calculator.decode_base64_image(user_image_base64)

        # For this implementation, we'll create a simple reference image
        # In production, you would load actual reference images from disk
        # For now, we'll create a placeholder white image as reference
        import numpy as np
        reference_image = np.ones((512, 512, 3), dtype=np.uint8) * 255

        # Calculate similarity score
        score = calculator.calculate_similarity_score(reference_image, user_image)

        logger.info(f"Similarity score: {score}")

        return jsonify({
            'score': float(score),
            'reference_image_id': reference_image_id
        })

    except Exception as e:
        logger.error(f"Error calculating similarity: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

@app.route('/methods', methods=['GET'])
def methods():
    """Get information about similarity calculation methods"""
    return jsonify(calculator.get_method_info())

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting Image Similarity Backend on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
