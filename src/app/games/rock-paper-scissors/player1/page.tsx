"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RpsPlayer1Page() {
    const [player1Prompt, setPlayer1Prompt] = useState("");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleNext = () => {
        if (!player1Prompt.trim()) {
            setError("Please enter a strategy prompt for Player 1.");
            return;
        }
        try {
            sessionStorage.setItem("rps.p1Prompt", player1Prompt);
        } catch { }
        router.push("/games/rock-paper-scissors");
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

            <div className="container mx-auto px-6 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="text-gray-400 hover:text-white mb-4 inline-block text-sm transition-colors"
                    >
                        ← Back
                    </Link>
                    <h1 className="text-4xl font-semibold text-white mb-2">
                        Rock Paper Scissors Battle
                    </h1>
                    <p className="text-gray-400">Step 1: Enter Player 1's strategy</p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="bg-[#111111] rounded-lg p-6 border border-blue-500/30">
                        <h2 className="text-xl font-semibold text-blue-400 mb-4">
                            Player 1
                        </h2>
                        <label className="block text-gray-400 mb-2 text-sm">
                            Enter your strategy prompt:
                        </label>
                        <textarea
                            value={player1Prompt}
                            onChange={(e) => setPlayer1Prompt(e.target.value)}
                            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
                            placeholder="Example: If I won the previous round, randomize between the other 2 moves. If I lost, stick with the same move. If it's a tie, play rock."
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 my-6 text-center">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="mt-6">
                        <button
                            onClick={handleNext}
                            className="w-full bg-white text-black hover:bg-gray-100 font-medium py-3 rounded-lg text-base transition-all duration-200"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
