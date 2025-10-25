import cv2
import numpy as np
from PIL import Image
import io
import base64
from skimage.metrics import structural_similarity as ssim
from skimage.feature import local_binary_pattern
from skimage.color import rgb2gray
import logging

logger = logging.getLogger(__name__)

class ImageSimilarityCalculator:
    """
    A comprehensive image similarity calculator that uses multiple algorithms
    to determine how similar two images are, returning a score from 1-10.
    """
    
    def __init__(self):
        self.methods = {
            'structural_similarity': self._calculate_ssim,
            'histogram_comparison': self._calculate_histogram_similarity,
            'feature_matching': self._calculate_feature_similarity,
            'color_similarity': self._calculate_color_similarity,
            'edge_similarity': self._calculate_edge_similarity
        }
        
        # Weights for combining different similarity methods
        self.method_weights = {
            'structural_similarity': 0.3,
            'histogram_comparison': 0.2,
            'feature_matching': 0.2,
            'color_similarity': 0.15,
            'edge_similarity': 0.15
        }
    
    def decode_base64_image(self, base64_string):
        """
        Decode a base64 encoded image string to numpy array.
        
        Args:
            base64_string (str): Base64 encoded image data
            
        Returns:
            numpy.ndarray: Image as numpy array in RGB format
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            pil_image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(pil_image)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            raise ValueError(f"Invalid base64 image data: {str(e)}")
    
    def preprocess_image(self, image):
        """
        Preprocess image for similarity calculations.
        
        Args:
            image (numpy.ndarray): Input image
            
        Returns:
            tuple: (resized_image, grayscale_image)
        """
        # Resize to standard size for consistent comparison
        target_size = (512, 512)
        resized = cv2.resize(image, target_size)
        
        # Convert to grayscale for some calculations
        if len(resized.shape) == 3:
            gray = cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY)
        else:
            gray = resized
        
        return resized, gray
    
    def _calculate_ssim(self, img1, img2):
        """
        Calculate Structural Similarity Index (SSIM).
        
        Args:
            img1, img2 (numpy.ndarray): Images to compare
            
        Returns:
            float: SSIM score (0-1, higher is more similar)
        """
        try:
            _, gray1 = self.preprocess_image(img1)
            _, gray2 = self.preprocess_image(img2)
            
            # Calculate SSIM
            score = ssim(gray1, gray2, data_range=255)
            return max(0, score)  # Ensure non-negative
            
        except Exception as e:
            logger.warning(f"SSIM calculation failed: {str(e)}")
            return 0.0
    
    def _calculate_histogram_similarity(self, img1, img2):
        """
        Calculate histogram similarity using correlation method.
        
        Args:
            img1, img2 (numpy.ndarray): Images to compare
            
        Returns:
            float: Histogram similarity score (0-1, higher is more similar)
        """
        try:
            resized1, _ = self.preprocess_image(img1)
            resized2, _ = self.preprocess_image(img2)
            
            # Calculate histograms for each color channel
            hist1 = []
            hist2 = []
            
            for i in range(3):  # RGB channels
                hist1.append(cv2.calcHist([resized1], [i], None, [256], [0, 256]))
                hist2.append(cv2.calcHist([resized2], [i], None, [256], [0, 256]))
            
            # Calculate correlation for each channel
            correlations = []
            for h1, h2 in zip(hist1, hist2):
                corr = cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL)
                correlations.append(max(0, corr))  # Ensure non-negative
            
            # Average correlation across channels
            return np.mean(correlations)
            
        except Exception as e:
            logger.warning(f"Histogram similarity calculation failed: {str(e)}")
            return 0.0
    
    def _calculate_feature_similarity(self, img1, img2):
        """
        Calculate feature-based similarity using ORB features.
        
        Args:
            img1, img2 (numpy.ndarray): Images to compare
            
        Returns:
            float: Feature similarity score (0-1, higher is more similar)
        """
        try:
            _, gray1 = self.preprocess_image(img1)
            _, gray2 = self.preprocess_image(img2)
            
            # Initialize ORB detector
            orb = cv2.ORB_create(nfeatures=1000)
            
            # Find keypoints and descriptors
            kp1, des1 = orb.detectAndCompute(gray1, None)
            kp2, des2 = orb.detectAndCompute(gray2, None)
            
            if des1 is None or des2 is None:
                return 0.0
            
            # Match features using Brute Force Matcher
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            
            # Sort matches by distance
            matches = sorted(matches, key=lambda x: x.distance)
            
            # Calculate similarity based on number of good matches
            if len(matches) == 0:
                return 0.0
            
            # Use top matches for similarity calculation
            top_matches = matches[:min(50, len(matches))]
            distances = [match.distance for match in top_matches]
            
            # Convert distances to similarity (lower distance = higher similarity)
            avg_distance = np.mean(distances)
            max_distance = 100  # Approximate maximum ORB distance
            similarity = max(0, 1 - (avg_distance / max_distance))
            
            return similarity
            
        except Exception as e:
            logger.warning(f"Feature similarity calculation failed: {str(e)}")
            return 0.0
    
    def _calculate_color_similarity(self, img1, img2):
        """
        Calculate color similarity using mean color values.
        
        Args:
            img1, img2 (numpy.ndarray): Images to compare
            
        Returns:
            float: Color similarity score (0-1, higher is more similar)
        """
        try:
            resized1, _ = self.preprocess_image(img1)
            resized2, _ = self.preprocess_image(img2)
            
            # Calculate mean color for each channel
            mean1 = np.mean(resized1, axis=(0, 1))
            mean2 = np.mean(resized2, axis=(0, 1))
            
            # Calculate Euclidean distance between mean colors
            color_distance = np.linalg.norm(mean1 - mean2)
            max_distance = np.sqrt(3 * 255**2)  # Maximum possible distance
            
            # Convert distance to similarity
            similarity = max(0, 1 - (color_distance / max_distance))
            
            return similarity
            
        except Exception as e:
            logger.warning(f"Color similarity calculation failed: {str(e)}")
            return 0.0
    
    def _calculate_edge_similarity(self, img1, img2):
        """
        Calculate edge similarity using Canny edge detection.
        
        Args:
            img1, img2 (numpy.ndarray): Images to compare
            
        Returns:
            float: Edge similarity score (0-1, higher is more similar)
        """
        try:
            _, gray1 = self.preprocess_image(img1)
            _, gray2 = self.preprocess_image(img2)
            
            # Apply Canny edge detection
            edges1 = cv2.Canny(gray1, 50, 150)
            edges2 = cv2.Canny(gray2, 50, 150)
            
            # Calculate edge density
            edge_density1 = np.sum(edges1 > 0) / edges1.size
            edge_density2 = np.sum(edges2 > 0) / edges2.size
            
            # Calculate similarity based on edge density difference
            density_diff = abs(edge_density1 - edge_density2)
            similarity = max(0, 1 - density_diff)
            
            return similarity
            
        except Exception as e:
            logger.warning(f"Edge similarity calculation failed: {str(e)}")
            return 0.0
    
    def calculate_similarity_score(self, reference_img, comparison_img):
        """
        Calculate overall similarity score between two images.
        
        Args:
            reference_img (numpy.ndarray): Reference image
            comparison_img (numpy.ndarray): Image to compare
            
        Returns:
            float: Similarity score from 1-10 (higher is more similar)
        """
        try:
            # Calculate individual similarity scores
            scores = {}
            for method_name, method_func in self.methods.items():
                try:
                    score = method_func(reference_img, comparison_img)
                    scores[method_name] = score
                    logger.debug(f"{method_name}: {score:.3f}")
                except Exception as e:
                    logger.warning(f"Method {method_name} failed: {str(e)}")
                    scores[method_name] = 0.0
            
            # Calculate weighted average
            weighted_score = 0.0
            total_weight = 0.0
            
            for method_name, score in scores.items():
                weight = self.method_weights.get(method_name, 0.0)
                weighted_score += score * weight
                total_weight += weight
            
            if total_weight > 0:
                final_score = weighted_score / total_weight
            else:
                final_score = 0.0
            
            # Convert to 1-10 scale
            # Map 0-1 range to 1-10 range
            scaled_score = 1 + (final_score * 9)
            
            # Ensure score is within bounds
            scaled_score = max(1.0, min(10.0, scaled_score))
            
            logger.info(f"Final similarity score: {scaled_score:.2f} (from {final_score:.3f})")
            return scaled_score
            
        except Exception as e:
            logger.error(f"Error calculating similarity score: {str(e)}")
            return 1.0  # Return minimum score on error
    
    def get_method_info(self):
        """
        Get information about the similarity calculation methods.
        
        Returns:
            dict: Information about each method
        """
        return {
            'structural_similarity': {
                'description': 'Compares structural similarity using SSIM algorithm',
                'weight': self.method_weights['structural_similarity']
            },
            'histogram_comparison': {
                'description': 'Compares color histograms across RGB channels',
                'weight': self.method_weights['histogram_comparison']
            },
            'feature_matching': {
                'description': 'Matches ORB features between images',
                'weight': self.method_weights['feature_matching']
            },
            'color_similarity': {
                'description': 'Compares mean color values',
                'weight': self.method_weights['color_similarity']
            },
            'edge_similarity': {
                'description': 'Compares edge patterns using Canny detection',
                'weight': self.method_weights['edge_similarity']
            }
        }
