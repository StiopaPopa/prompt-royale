#!/bin/bash

# Image Similarity Game - Python Backend Setup Script

echo "🎨 Setting up Image Similarity Python Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python 3 found"

# Navigate to python-backend directory
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the backend server:"
echo "  1. cd python-backend"
echo "  2. source venv/bin/activate"
echo "  3. python server.py"
echo ""
echo "The server will run on http://localhost:5000"
echo ""
echo "Don't forget to set PYTHON_BACKEND_URL=http://localhost:5000 in your .env.local file!"
