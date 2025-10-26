'use client';

import { useState, useRef, type ReactNode } from 'react';
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
    loading,
    onZoom,
    variant,
}: {
    title: string;
    required?: boolean;
    image: string | null;
    children?: ReactNode;
    loading?: boolean;
    onZoom?: () => void;
    variant?: 'reference' | 'p1' | 'p2';
}) {
    const borderColor = variant === 'reference'
        ? 'border-purple-500/60'
        : variant === 'p1'
            ? 'border-blue-500/60'
            : variant === 'p2'
                ? 'border-rose-500/60'
                : 'border-gray-700';
    return (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">{title} {required && <span className="text-red-400">*</span>}</div>
            </div>
            <div className={classNames("relative aspect-square w-full bg-black/40 border-2 rounded-xl overflow-hidden flex items-center justify-center", borderColor)}>
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-gray-400">No image yet</div>
                )}
                {loading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-center justify-center gap-2">
                            <span className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2.5 h-2.5 bg-white/90 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                {!!image && !loading && (
                    <button
                        type="button"
                        onClick={onZoom}
                        className="absolute top-2 right-2 px-2.5 py-1.5 text-sm bg-black/60 hover:bg-black/80 border border-white/20 rounded shadow"
                        aria-label="Zoom image"
                    >
                        🔍
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

export default function ImageSimilarityPage() {
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [refSource, setRefSource] = useState<'hd' | 'meme'>('hd');
    const [isFindingRef, setIsFindingRef] = useState(false);
    const [player1Image, setPlayer1Image] = useState<string | null>(null);
    const [player2Image, setPlayer2Image] = useState<string | null>(null);
    const [scores, setScores] = useState<Scores>(null);
    const [winner, setWinner] = useState<'player1' | 'player2' | 'tie' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [p1Prompt, setP1Prompt] = useState('');
    const [p2Prompt, setP2Prompt] = useState('');
    const [zoomSrc, setZoomSrc] = useState<string | null>(null);
    const FIXED_GEMINI_MODEL = 'gemini-2.5-flash-image';
    const [usedProvider, setUsedProvider] = useState<string | null>(null);
    const [usedModel, setUsedModel] = useState<string | null>(null);
    const [judgeModel, setJudgeModel] = useState<string | null>(null);
    const [reasoning, setReasoning] = useState<string | null>(null);
    const [statusText, setStatusText] = useState<string | null>(null);

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
        setStatusText('Generating Player 1 image (Gemini 2.5 Flash Image)…');
        try {
            const modelToSend = FIXED_GEMINI_MODEL;
            // Step 1: Generate Player 1 image
            const resP1 = await fetch('/api/image-similarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'generate-image', prompt: p1Prompt, geminiModel: modelToSend }),
            });
            if (!resP1.ok) throw new Error(await resP1.text());
            const gen1: { dataUrl: string; model?: string; provider?: string } = await resP1.json();
            setPlayer1Image(gen1.dataUrl);
            setUsedModel(gen1.model ?? modelToSend);
            setUsedProvider(gen1.provider ?? 'gemini');

            // Step 2: Generate Player 2 image
            setStatusText('Generating Player 2 image (Gemini 2.5 Flash Image)…');
            const resP2 = await fetch('/api/image-similarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'generate-image', prompt: p2Prompt, geminiModel: modelToSend }),
            });
            if (!resP2.ok) throw new Error(await resP2.text());
            const gen2: { dataUrl: string } = await resP2.json();
            setPlayer2Image(gen2.dataUrl);

            // Step 3: Judge
            setStatusText('Judging similarity with Gemini 2.5 Flash…');
            const resJ = await fetch('/api/image-similarity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'judge', referenceImage, player1Image: gen1.dataUrl, player2Image: gen2.dataUrl, judgeModel: 'gemini-2.5-flash' }),
            });
            if (!resJ.ok) throw new Error(await resJ.text());
            const judged: { player1Score: number; player2Score: number; winner: 'player1' | 'player2' | 'tie'; judgeModel?: string; reasoning?: string } = await resJ.json();
            setScores({ p1: judged.player1Score, p2: judged.player2Score });
            setWinner(judged.winner);
            setJudgeModel(judged.judgeModel ?? 'gemini-2.5-flash');
            setReasoning(judged.reasoning ?? null);
        } catch (e) {
            console.error(e);
            setError('Failed to generate images. Ensure the required API is available.');
        } finally {
            setIsLoading(false);
            setStatusText(null);
        }
    };

    const reset = () => {
        setReferenceImage(null);
        setIsFindingRef(false);
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
                    <p className="text-gray-400">Find a reference image and generate two Player images, then compete with a 1-10 score.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Reference fetch card */}
                    <UploadCard title="Reference Image" required image={referenceImage} loading={isFindingRef} onZoom={() => referenceImage && setZoomSrc(referenceImage)} variant="reference">
                        <div className="mt-4 space-y-3">
                            <div className="space-y-3 w-full">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="sm:w-1/2">
                                        <label className="block text-sm text-gray-300 mb-1">Reference Source</label>
                                        <select
                                            value={refSource}
                                            onChange={(e) => setRefSource((e.target.value as 'hd' | 'meme'))}
                                            disabled={isFindingRef || isLoading}
                                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
                                        >
                                            <option value="hd">HD Photo</option>
                                            <option value="meme">Meme</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        setIsFindingRef(true);
                                        setError(null);
                                        try {
                                            const res = await fetch(`/api/image-similarity?random=1&kind=${refSource}`);
                                            if (!res.ok) throw new Error(await res.text());
                                            const data: { dataUrl: string } = await res.json();
                                            setReferenceImage(data.dataUrl);
                                        } catch (e) {
                                            console.error(e);
                                            setError('Failed to fetch a random reference image.');
                                        } finally {
                                            setIsFindingRef(false);
                                        }
                                    }}
                                    className="w-full px-4 py-3 text-lg bg-purple-600 hover:bg-purple-700 rounded disabled:bg-gray-700"
                                    disabled={isFindingRef || isLoading}
                                >{refSource === 'meme' ? 'Find Random Meme' : 'Find Random HD Image'}</button>
                                <button onClick={() => setReferenceImage(null)} className="w-full px-4 py-3 text-lg bg-gray-700 hover:bg-gray-600 rounded">Reset</button>
                            </div>
                        </div>
                    </UploadCard>

                    {/* Player 1 prompt */}
                    <UploadCard title="Player 1" required image={player1Image} onZoom={() => player1Image && setZoomSrc(player1Image)} variant="p1">
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
                    <UploadCard title="Player 2" required image={player2Image} onZoom={() => player2Image && setZoomSrc(player2Image)} variant="p2">
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

                <div className="mt-6 space-y-3">
                    <button
                        onClick={compareImages}
                        disabled={!referenceImage || !p1Prompt.trim() || !p2Prompt.trim() || isLoading || isFindingRef}
                        className="w-full px-8 py-5 text-lg rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 disabled:from-gray-700 disabled:to-gray-700 hover:from-indigo-600 hover:to-purple-600 transition shadow"
                    >
                        {isFindingRef ? 'Finding image..' : (isLoading ? 'Comparing…' : '⚡ Generate and Compare!')}
                    </button>
                    <button onClick={reset} className="w-full px-8 py-5 text-lg rounded-lg bg-gray-700 hover:bg-gray-600 transition shadow">Reset Game</button>
                </div>

                {isLoading && (
                    <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                        <span className="inline-block w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        <div className="text-gray-300">
                            <div className="font-medium">{statusText}</div>
                            <div className="text-xs text-gray-500 mt-1">Steps: Generate P1 → Generate P2 → Judge</div>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce"></span>
                        </div>
                    </div>
                )}

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
                        {winner && (
                            <div className="mt-6 w-full px-6 py-6 text-3xl md:text-4xl text-center bg-red-700 rounded-3xl font-extrabold tracking-wide shadow-lg">
                                {winner === 'tie' ? '🤝 Draw!' : (winner === 'player1' ? '🏆 Player 1 Wins!' : '🏆 Player 2 Wins!')}
                            </div>
                        )}
                        <div className="mt-4 text-center text-gray-400 text-sm">
                            Gemini model: <span className="text-gray-200">{usedModel || FIXED_GEMINI_MODEL}</span>
                            {judgeModel && (<span className="ml-3">Judge model: <span className="text-gray-200">{judgeModel}</span></span>)}
                        </div>
                        {reasoning && (
                            <div className="mt-6 bg-black/40 border border-white/10 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap">
                                <div className="text-gray-400 mb-2 font-semibold">Why the judge chose this:</div>
                                {reasoning}
                            </div>
                        )}
                    </div>
                )}

                {zoomSrc && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoomSrc(null)}>
                        <img src={zoomSrc} alt="Zoomed" className="max-w-[90vw] max-h-[85vh] rounded-lg border border-white/10 shadow-2xl" />
                        <button
                            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded"
                            onClick={() => setZoomSrc(null)}
                        >Close</button>
                    </div>
                )}
            </main>
        </div>
    );
}
