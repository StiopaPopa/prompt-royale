'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const REFERENCE_IMAGES = [
    { id: 1, name: 'Simple House', emoji: '🏠', description: 'Draw a simple house' },
    { id: 2, name: 'Smiley Face', emoji: '😊', description: 'Draw a happy face' },
    { id: 3, name: 'Tree', emoji: '🌳', description: 'Draw a tree' },
    { id: 4, name: 'Cat', emoji: '🐱', description: 'Draw a cat' },
    { id: 5, name: 'Sun', emoji: '☀️', description: 'Draw the sun' },
];

export default function ImageSimilarityPage() {
    const [gameState, setGameState] = useState<'setup' | 'drawing' | 'finished'>('setup');
    const [selectedImage, setSelectedImage] = useState<typeof REFERENCE_IMAGES[0] | null>(null);
    const [score, setScore] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [brushSize, setBrushSize] = useState(5);
    const [brushColor, setBrushColor] = useState('#000000');

    useEffect(() => {
        if (canvasRef.current && gameState === 'drawing') {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [gameState]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const startGame = (image: typeof REFERENCE_IMAGES[0]) => {
        setSelectedImage(image);
        setGameState('drawing');
        setScore(null);
        setError(null);
    };

    const submitDrawing = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsLoading(true);
        setError(null);

        try {
            // Convert canvas to base64
            const imageData = canvas.toDataURL('image/png');

            const response = await fetch('/api/image-similarity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    referenceImageId: selectedImage?.id,
                    userImage: imageData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to calculate similarity');
            }

            const result = await response.json();
            setScore(result.score);
            setGameState('finished');
        } catch (err) {
            setError('Failed to calculate similarity. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetGame = () => {
        setGameState('setup');
        setSelectedImage(null);
        setScore(null);
        setError(null);
        clearCanvas();
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-500';
        if (score >= 6) return 'text-yellow-500';
        if (score >= 4) return 'text-orange-500';
        return 'text-red-500';
    };

    const getScoreMessage = (score: number) => {
        if (score >= 9) return 'Amazing! Nearly perfect!';
        if (score >= 8) return 'Excellent work!';
        if (score >= 6) return 'Good job!';
        if (score >= 4) return 'Not bad, keep practicing!';
        return 'Keep trying!';
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <main className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2">Image Similarity Game</h1>
                    <p className="text-gray-400">Recreate the prompted image and get scored 1-10 based on similarity</p>
                </div>

                {/* Setup State */}
                {gameState === 'setup' && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-semibold text-white mb-6 text-center">
                            Choose an Image to Recreate
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {REFERENCE_IMAGES.map((image) => (
                                <button
                                    key={image.id}
                                    onClick={() => startGame(image)}
                                    className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800"
                                >
                                    <div className="text-6xl mb-4 text-center">{image.emoji}</div>
                                    <h3 className="text-xl font-semibold text-white mb-2 text-center">
                                        {image.name}
                                    </h3>
                                    <p className="text-gray-400 text-center">{image.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Drawing State */}
                {gameState === 'drawing' && selectedImage && (
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Reference Image */}
                            <div>
                                <h2 className="text-2xl font-semibold text-white mb-4">Reference</h2>
                                <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
                                    <div className="flex flex-col items-center justify-center h-96">
                                        <div className="text-9xl mb-4">{selectedImage.emoji}</div>
                                        <p className="text-xl text-gray-400">{selectedImage.description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Drawing Canvas */}
                            <div>
                                <h2 className="text-2xl font-semibold text-white mb-4">Your Drawing</h2>
                                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                                    <canvas
                                        ref={canvasRef}
                                        width={512}
                                        height={512}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        className="border border-gray-700 cursor-crosshair w-full"
                                        style={{ maxWidth: '512px', maxHeight: '512px' }}
                                    />

                                    {/* Drawing Tools */}
                                    <div className="mt-4 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <label className="text-white">Brush Size:</label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="20"
                                                value={brushSize}
                                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                                className="flex-1"
                                            />
                                            <span className="text-white w-8">{brushSize}</span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <label className="text-white">Color:</label>
                                            <input
                                                type="color"
                                                value={brushColor}
                                                onChange={(e) => setBrushColor(e.target.value)}
                                                className="w-12 h-8"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={clearCanvas}
                                                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                                            >
                                                Clear Canvas
                                            </button>
                                            <button
                                                onClick={submitDrawing}
                                                disabled={isLoading}
                                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-600"
                                            >
                                                {isLoading ? 'Calculating...' : 'Submit Drawing'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-900/50 border border-red-600 rounded text-red-200 text-center">
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Results State */}
                {gameState === 'finished' && score !== null && selectedImage && (
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-semibold text-white mb-6">Your Score</h2>

                        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-8">
                            <div className={`text-8xl font-bold mb-4 ${getScoreColor(score)}`}>
                                {score.toFixed(1)}/10
                            </div>
                            <p className="text-2xl text-gray-300 mb-4">{getScoreMessage(score)}</p>
                            <p className="text-gray-400">
                                You were trying to recreate: <span className="text-2xl">{selectedImage.emoji}</span> {selectedImage.name}
                            </p>
                        </div>

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={resetGame}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition text-lg"
                            >
                                Try Another Image
                            </button>
                            <Link
                                href="/"
                                className="bg-gray-700 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition text-lg"
                            >
                                Back to Home
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
