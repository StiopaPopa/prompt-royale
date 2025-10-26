'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ImageSimilarityPlayer1Page() {
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [refSource, setRefSource] = useState<'hd' | 'meme'>('hd');
    const [isFindingRef, setIsFindingRef] = useState(false);
    const [p1Prompt, setP1Prompt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);
    const router = useRouter();

    const handleNext = () => {
        if (!referenceImage || !p1Prompt.trim()) {
            setError('Please choose a reference image and enter a prompt for Player 1.');
            return;
        }
        try {
            sessionStorage.setItem('imageSim.reference', referenceImage);
            sessionStorage.setItem('imageSim.p1Prompt', p1Prompt);
            sessionStorage.setItem('imageSim.refSource', refSource);
        } catch { }
        router.push('/games/image-similarity');
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <nav className="border-b border-gray-800/50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <Link href="/" className="font-mono-brand text-xl text-white">prompt-royale</Link>
                            <div className="hidden md:flex items-center gap-6 text-sm">
                                <Link href="/" className="text-gray-400 hover:text-white transition-colors">Games</Link>
                                <Link href="/" className="text-gray-400 hover:text-white transition-colors">Leaderboard</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-8 max-w-7xl">
                <div className="mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white mb-4 inline-block text-sm transition-colors">← Back</Link>
                    <h1 className="text-4xl font-semibold text-white mb-2">Image Replication Battle</h1>
                    <p className="text-gray-400">Step 1: Choose a reference and enter Player 1's prompt</p>
                </div>

                <div className="max-w-4xl mx-auto">
                    {/* Reference Image Section */}
                    <div className="bg-[#111111] rounded-lg p-6 border border-gray-800/50 mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">Reference Image</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative aspect-square w-full bg-black/40 border-2 border-purple-500/60 rounded-lg overflow-hidden flex items-center justify-center">
                                {referenceImage ? (
                                    <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-500 text-sm">No image selected</div>
                                )}
                                {isFindingRef && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                                {!!referenceImage && !isFindingRef && (
                                    <button
                                        type="button"
                                        onClick={() => setZoomSrc(referenceImage)}
                                        className="absolute top-2 right-2 px-2.5 py-1.5 text-xs bg-black/60 hover:bg-black/80 border border-white/20 rounded"
                                        aria-label="Zoom image"
                                    >
                                        🔍
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Reference Source</label>
                                    <select
                                        value={refSource}
                                        onChange={(e) => setRefSource((e.target.value as 'hd' | 'meme'))}
                                        disabled={isFindingRef}
                                        className="w-full px-3 py-2 bg-black/40 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="hd">HD Photo</option>
                                        <option value="meme">Meme</option>
                                    </select>
                                </div>
                                <button
                                    onClick={async () => {
                                        setIsFindingRef(true);
                                        setError(null);
                                        try {
                                            const res = await fetch(`/api/image-similarity?random=1&kind=${refSource}`);
                                            if (!res.ok) throw new Error(await res.text());
                                            const data: { dataUrl: string } = await res.json();
                                            if (!data.dataUrl || !data.dataUrl.startsWith('data:image/')) throw new Error('Reference fetch did not return an image');
                                            setReferenceImage(data.dataUrl);
                                        } catch (e) {
                                            console.error(e);
                                            setError('Failed to fetch a random reference image.');
                                        } finally {
                                            setIsFindingRef(false);
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={isFindingRef}
                                >{refSource === 'meme' ? 'Find Random Meme' : 'Find Random HD Image'}</button>
                                <button onClick={() => setReferenceImage(null)} className="w-full px-4 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Reset</button>
                            </div>
                        </div>
                    </div>

                    {/* Player 1 Prompt */}
                    <div className="bg-[#111111] rounded-lg p-6 border border-blue-500/30 mb-8">
                        <h2 className="text-xl font-semibold text-blue-400 mb-4">Player 1</h2>
                        <label className="block text-gray-400 mb-2 text-sm">Enter your image description:</label>
                        <textarea
                            placeholder="Describe the image for Player 1 to generate"
                            value={p1Prompt}
                            onChange={(e) => setP1Prompt(e.target.value)}
                            rows={4}
                            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            onClick={handleNext}
                            className="w-full bg-white text-black hover:bg-gray-100 font-medium py-3 rounded-lg text-base transition-all duration-200"
                        >Next</button>
                    </div>
                </div>

                {zoomSrc && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoomSrc(null)}>
                        <img src={zoomSrc} alt="Zoomed" className="max-w-[90vw] max-h-[85vh] rounded-lg border border-white/10 shadow-2xl" />
                        <button className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded" onClick={() => setZoomSrc(null)}>Close</button>
                    </div>
                )}
            </main>
        </div>
    );
}
