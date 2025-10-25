'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

type Scores = { p1: number; p2: number } | null;

function classNames(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(' ');
}

async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
    const pct = Math.max(0, Math.min(100, (score / 10) * 100));
    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
            <div className="text-gray-300 mb-3 text-center">{label}</div>
            <div className="text-white text-5xl font-bold text-center">
                {score.toFixed(2)} <span className="text-gray-400 text-2xl">/ 10</span>
            </div>
            <div className="mt-6 h-2 rounded bg-gray-700 overflow-hidden">
                <div className={classNames('h-2', color)} style={{ width: pct + '%' }} />
            </div>
        </div>
    );
}

function UploadCard({
    title,
    required,
    image,
    children,
}: {
    title: string;
    required?: boolean;
    image: string | null;
    children?: ReactNode;
}) {
    return (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">{title} {required && <span className="text-red-400">*</span>}</div>
            </div>
            <div className="aspect-video w-full bg-black/40 border border-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-gray-400">No image yet</div>
                )}
            </div>
            {children}
        </div>
    );
}

export default function ImageSimilarityPage() {
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [referenceQuery, setReferenceQuery] = useState('');
    const [player1Image, setPlayer1Image] = useState<string | null>(null);
    const [player2Image, setPlayer2Image] = useState<string | null>(null);
    const [scores, setScores] = useState<Scores>(null);
    const [winner, setWinner] = useState<'player1' | 'player2' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [p1Prompt, setP1Prompt] = useState('');
    const [p2Prompt, setP2Prompt] = useState('');

    const readyToCompare = Boolean(referenceImage && player1Image && player2Image);

    const onSelect = async (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: (v: string) => void,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        setter(dataUrl);
        setScores(null);
        setWinner(null);
    };

    const compareImages = async () => {
        if (!referenceImage || !p1Prompt.trim() || !p2Prompt.trim()) {
            setError('Please fetch a reference image and enter prompts for both players.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/image-similarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'generate-and-compare', referenceImage, p1Prompt, p2Prompt }),
            });
            if (!res.ok) throw new Error(await res.text());
            const data: { player1Score: number; player2Score: number; winner: 'player1' | 'player2' | 'tie'; player1Image: string; player2Image: string } = await res.json();
            setScores({ p1: data.player1Score, p2: data.player2Score });
            setPlayer1Image(data.player1Image);
            setPlayer2Image(data.player2Image);
            setWinner(data.winner === 'tie' ? (data.player1Score >= data.player2Score ? 'player1' : 'player2') : data.winner);
        } catch (e) {
            console.error(e);
            setError('Failed to compare images. Ensure the Python deps are installed.');
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setReferenceImage(null);
        setReferenceQuery('');
        setPlayer1Image(null);
        setPlayer2Image(null);
        setScores(null);
        setWinner(null);
        setError(null);
        setP1Prompt('');
        setP2Prompt('');
    };



    return (
        <div className="min-h-screen bg-black text-white">
            <main className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Home</Link>
                    <h1 className="text-4xl font-bold mb-2">Image Similarity</h1>
                    <p className="text-gray-400">Upload a Reference image and two Player images, then compare with a 1-10 score.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Reference fetch card */}
                    <UploadCard title="Reference Image" required image={referenceImage}>
                        <div className="mt-4 space-y-3">
                            <input
                                type="text"
                                placeholder="Optional topic (e.g., basketball hoop)"
                                value={referenceQuery}
                                onChange={(e) => setReferenceQuery(e.target.value)}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        setIsLoading(true);
                                        setError(null);
                                        try {
                                            const url = '/api/image-similarity' + (referenceQuery ? `?random=1&query=${encodeURIComponent(referenceQuery)}` : '?random=1');
                                            const res = await fetch(url);
                                            if (!res.ok) throw new Error(await res.text());
                                            const data: { dataUrl: string } = await res.json();
                                            setReferenceImage(data.dataUrl);
                                        } catch (e) {
                                            console.error(e);
                                            setError('Failed to fetch a random reference image.');
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                                >Get Random HD Image</button>
                                <button onClick={() => setReferenceImage(null)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">Clear</button>
                            </div>
                        </div>
                    </UploadCard>

                    {/* Player 1 prompt */}
                    <UploadCard title="Player 1" required image={player1Image}>
                        <div className="mt-4 space-y-3">
                            <textarea
                                placeholder="Describe the image for Player 1 to generate"
                                value={p1Prompt}
                                onChange={(e) => setP1Prompt(e.target.value)}
                                rows={4}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </UploadCard>

                    {/* Player 2 prompt */}
                    <UploadCard title="Player 2" required image={player2Image}>
                        <div className="mt-4 space-y-3">
                            <textarea
                                placeholder="Describe the image for Player 2 to generate"
                                value={p2Prompt}
                                onChange={(e) => setP2Prompt(e.target.value)}
                                rows={4}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </UploadCard>
                </div>

                <div className="flex items-center gap-4 mt-6">
                    <button
                        onClick={compareImages}
                        disabled={!referenceImage || !p1Prompt.trim() || !p2Prompt.trim() || isLoading}
                        className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 disabled:from-gray-700 disabled:to-gray-700 hover:from-indigo-600 hover:to-purple-600 transition shadow"
                    >
                        {isLoading ? 'Comparing…' : '⚡ Compare Images'}
                    </button>
                    <button onClick={reset} className="px-6 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition shadow">Reset Game</button>
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded text-red-200 max-w-2xl">{error}</div>
                )}

                {scores && (
                    <div className="mt-10 bg-gray-950/70 border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-3xl font-bold mb-6 text-center">Comparison Results</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ScoreCard label="Player 1" score={scores.p1} color="bg-purple-400" />
                            <ScoreCard label="Player 2" score={scores.p2} color="bg-purple-400" />
                        </div>
                        <div className="flex justify-center mt-6">
                            {winner && (
                                <div className="px-6 py-3 bg-red-600 rounded-full font-semibold shadow">
                                    🏆🏆 {winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
