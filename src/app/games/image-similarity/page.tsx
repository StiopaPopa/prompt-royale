'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Scores = { p1: number; p2: number } | null;

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
    const pct = Math.max(0, Math.min(100, (score / 10) * 100));
    return (
        <div className="bg-[#111111] rounded-lg p-6 border border-gray-800/50">
            <div className="text-gray-400 mb-3 text-center text-sm uppercase tracking-wider">{label}</div>
            <div className="text-white text-5xl font-mono font-bold text-center">
                {score.toFixed(2)} <span className="text-gray-500 text-2xl">/ 10</span>
            </div>
            <div className="mt-6 h-2 rounded bg-gray-800 overflow-hidden">
                <div className={`h-2 ${color}`} style={{ width: pct + '%' }} />
            </div>
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
    const [commentaryEnabled, setCommentaryEnabled] = useState(true);
    const [currentCommentary, setCurrentCommentary] = useState<string>("");
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isStep2, setIsStep2] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Load step-1 data if available
        try {
            const storedRef = sessionStorage.getItem('imageSim.reference');
            const storedP1 = sessionStorage.getItem('imageSim.p1Prompt');
            if (storedRef && storedRef.startsWith('data:image/')) {
                setReferenceImage(storedRef);
            }
            if (storedP1) {
                setP1Prompt(storedP1);
                setIsStep2(true);
            }
        } catch { }
    }, []);

    // Function to generate and play end-of-game summary
    const generateEndSummary = async (winner: 'player1' | 'player2' | 'tie', p1Score: number, p2Score: number, reasoning: string): Promise<void> => {
        if (!commentaryEnabled) return;

        return new Promise(async (resolve) => {
            try {
                // Generate end summary text
                const summaryResponse = await fetch("/api/image-end-summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        winner,
                        player1Score: p1Score,
                        player2Score: p2Score,
                        reasoning,
                    }),
                });

                const { summary } = await summaryResponse.json();
                setCurrentCommentary(summary);

                // Generate TTS audio
                const ttsResponse = await fetch("/api/text-to-speech", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: summary }),
                });

                const audioBlob = await ttsResponse.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                // Play audio and wait for it to finish
                setIsPlayingAudio(true);
                audio.onended = () => {
                    setIsPlayingAudio(false);
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                audio.onerror = () => {
                    setIsPlayingAudio(false);
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                await audio.play();
            } catch (error) {
                console.error("Error generating end summary:", error);
                setIsPlayingAudio(false);
                resolve();
            }
        });
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

            // Generate and play end-of-game summary
            await generateEndSummary(judged.winner, judged.player1Score, judged.player2Score, judged.reasoning ?? '');
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
        try {
            sessionStorage.removeItem('imageSim.reference');
            sessionStorage.removeItem('imageSim.p1Prompt');
            sessionStorage.removeItem('imageSim.refSource');
        } catch { }
        // Go back to Player 1 setup page
        router.push('/games/image-similarity/player1');
    };



    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Navigation */}
            <nav className="border-b border-gray-800/50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <Link href="/" className="font-mono-brand text-xl text-white">
                                prompt-royale
                            </Link>
                            <div className="hidden md:flex items-center gap-6 text-sm">
                                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                                    Games
                                </Link>
                                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                                    Leaderboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="text-gray-400 hover:text-white mb-4 inline-block text-sm transition-colors">
                        ← Back
                    </Link>
                    <h1 className="text-4xl font-semibold text-white mb-2">
                        Image Replication Battle
                    </h1>
                    <p className="text-gray-400">Generate images from prompts and compete for similarity to a reference image</p>
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
                                        disabled={isFindingRef || isLoading}
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
                                            if (!data.dataUrl || !data.dataUrl.startsWith('data:image/')) {
                                                throw new Error('Reference fetch did not return an image');
                                            }
                                            setReferenceImage(data.dataUrl);
                                        } catch (e) {
                                            console.error(e);
                                            setError('Failed to fetch a random reference image.');
                                        } finally {
                                            setIsFindingRef(false);
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={isFindingRef || isLoading}
                                >{refSource === 'meme' ? 'Find Random Meme' : 'Find Random HD Image'}</button>
                                <button onClick={() => setReferenceImage(null)} className="w-full px-4 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Reset</button>
                            </div>
                        </div>
                    </div>

                    {/* Player Prompts Section (Player 2 only on this page) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Player 2 */}
                        <div className="bg-[#111111] rounded-lg p-6 border border-red-500/30">
                            <h2 className="text-xl font-semibold text-red-400 mb-4">
                                Player 2
                            </h2>
                            <label className="block text-gray-400 mb-2 text-sm">
                                Enter your image description:
                            </label>
                            <textarea
                                placeholder="Describe the image for Player 2 to generate"
                                value={p2Prompt}
                                onChange={(e) => setP2Prompt(e.target.value)}
                                rows={4}
                                className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none placeholder:text-gray-600 mb-4"
                            />
                            {player2Image && (
                                <div className="relative aspect-square w-full bg-black/40 border-2 border-red-500/60 rounded-lg overflow-hidden">
                                    <img src={player2Image} alt="Player 2" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setZoomSrc(player2Image)}
                                        className="absolute top-2 right-2 px-2.5 py-1.5 text-xs bg-black/60 hover:bg-black/80 border border-white/20 rounded"
                                    >
                                        🔍
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Placeholder for grid balance on md+ screens */}
                        <div className="hidden md:block" />
                    </div>

                    {/* Prompts overview: show both side by side once both are provided */}
                    {p1Prompt.trim() && p2Prompt.trim() && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-[#111111] border border-blue-500/30 rounded-lg p-6">
                                <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">Player 1 Prompt</h3>
                                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{p1Prompt}</div>
                            </div>
                            <div className="bg-[#111111] border border-red-500/30 rounded-lg p-6">
                                <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">Player 2 Prompt</h3>
                                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{p2Prompt}</div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        <button
                            onClick={compareImages}
                            disabled={!referenceImage || !p1Prompt.trim() || !p2Prompt.trim() || isLoading || isFindingRef}
                            className="w-full bg-white text-black hover:bg-gray-100 font-medium py-3 rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isFindingRef ? 'Finding image...' : (isLoading ? 'Generating...' : 'Generate and Compare')}
                        </button>
                        <button
                            onClick={reset}
                            disabled={isLoading}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="max-w-6xl mx-auto mt-8">
                        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-12 text-center">
                            <div className="text-6xl mb-6 animate-pulse">🎨</div>
                            <h2 className="text-2xl font-semibold text-white mb-4">
                                Battle in Progress
                            </h2>
                            <p className="text-gray-400 text-sm mb-6">
                                {statusText || 'Generating images and judging similarity...'}
                            </p>
                            <div className="flex justify-center items-center gap-3">
                                <div
                                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                    style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                    style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                    style={{ animationDelay: "300ms" }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}

                {scores && (
                    <div className="max-w-6xl mx-auto mt-8">
                        <div className="space-y-6">
                            {/* Winner Banner */}
                            {winner && (
                                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8">
                                    <div className={`text-3xl font-semibold text-center ${winner === 'tie' ? 'text-yellow-400' : winner === 'player1' ? 'text-blue-400' : 'text-red-400'
                                        }`}>
                                        {winner === 'tie' ? 'It\'s a Tie' : (winner === 'player1' ? 'Player 1 Wins' : 'Player 2 Wins')}
                                    </div>
                                </div>
                            )}

                            {/* Commentary Display */}
                            {commentaryEnabled && currentCommentary && (
                                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                <span className="text-xl">🎙️</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-purple-400 font-medium text-sm">Commentator's Take</span>
                                                {isPlayingAudio && (
                                                    <div className="flex gap-1">
                                                        <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                                                        <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></div>
                                                        <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed">{currentCommentary}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Score Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ScoreCard label="Player 1" score={scores.p1} color="bg-blue-400" />
                                <ScoreCard label="Player 2" score={scores.p2} color="bg-red-400" />
                            </div>

                            {/* Model Info */}
                            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                                <div className="text-center text-gray-400 text-sm">
                                    <div className="mb-2">
                                        <span className="text-gray-500">Image Model:</span> <span className="text-white">{usedModel || FIXED_GEMINI_MODEL}</span>
                                    </div>
                                    {judgeModel && (
                                        <div>
                                            <span className="text-gray-500">Judge Model:</span> <span className="text-white">{judgeModel}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reasoning */}
                            {reasoning && (
                                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                                    <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Judge Reasoning</div>
                                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{reasoning}</div>
                                </div>
                            )}

                            {/* Play Again Button */}
                            <div className="text-center">
                                <button
                                    onClick={reset}
                                    className="bg-white text-black hover:bg-gray-100 font-medium py-2 px-6 rounded-lg text-sm transition-all duration-200"
                                >
                                    Play Again
                                </button>
                            </div>
                        </div>
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
