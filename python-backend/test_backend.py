#!/usr/bin/env python3
"""
Test script for the Image Similarity Python backend
"""

import requests
import base64
import io
from PIL import Image, ImageDraw
import json

def create_test_image():
    """Create a simple test image"""
    img = Image.new('RGB', (512, 512), 'white')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple house
    draw.rectangle([150, 250, 350, 400], fill='lightblue', outline='black', width=3)
    draw.polygon([150, 250, 250, 150, 350, 250], fill='red', outline='black')
    draw.rectangle([220, 320, 280, 400], fill='brown', outline='black', width=2)
    
    return img

def image_to_base64(img):
    """Convert PIL Image to base64 string"""
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    return f"data:image/png;base64,{img_base64}"

def test_backend(backend_url='http://localhost:5000'):
    """Test the Python backend"""
    print("🧪 Testing Image Similarity Backend")
    print(f"Backend URL: {backend_url}")
    print()
    
    # Test 1: Health check
    print("1️⃣ Testing health endpoint...")
    try:
        response = requests.get(f"{backend_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Could not connect to backend: {e}")
        print("   Make sure the server is running: python server.py")
        return
    
    print()
    
    # Test 2: Get methods info
    print("2️⃣ Testing methods endpoint...")
    try:
        response = requests.get(f"{backend_url}/methods")
        if response.status_code == 200:
            print("✅ Methods endpoint passed")
            methods = response.json()
            for method, info in methods.items():
                print(f"   - {method}: weight={info['weight']}")
        else:
            print(f"❌ Methods endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()
    
    # Test 3: Calculate similarity
    print("3️⃣ Testing similarity calculation...")
    try:
        test_img = create_test_image()
        img_base64 = image_to_base64(test_img)
        
        payload = {
            'reference_image_id': 1,
            'user_image': img_base64
        }
        
        print("   Sending test image...")
        response = requests.post(
            f"{backend_url}/calculate-similarity",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Similarity calculation passed")
            print(f"   Score: {result['score']}/10")
            print(f"   Reference Image ID: {result['reference_image_id']}")
        else:
            print(f"❌ Similarity calculation failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()
    print("🎉 Testing complete!")

if __name__ == '__main__':
    import sys
    
    backend_url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5000'
    test_backend(backend_url)
