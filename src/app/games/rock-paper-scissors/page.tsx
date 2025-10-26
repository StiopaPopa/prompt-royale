"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Move = "rock" | "paper" | "scissors";

interface RoundResult {
  round: number;
  player1Move: Move;
  player2Move: Move;
  winner: "player1" | "player2" | "tie";
  player1Reasoning: string;
  player2Reasoning: string;
}

interface GameResult {
  results: RoundResult[];
  player1Wins: number;
  player2Wins: number;
  ties: number;
  finalWinner: "player1" | "player2" | "tie";
  player1Prompt: string;
  player2Prompt: string;
}

const moveEmojis: Record<Move, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export default function RockPaperScissorsPage() {
  const [player1Prompt, setPlayer1Prompt] = useState("");
  const [player2Prompt, setPlayer2Prompt] = useState("");
  const [gameState, setGameState] = useState<"setup" | "playing" | "finished">(
    "setup"
  );
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasonings, setShowReasonings] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(true);
  const [currentCommentary, setCurrentCommentary] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isStep2, setIsStep2] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load Player 1 prompt from session if present
    try {
      const p1 = sessionStorage.getItem("rps.p1Prompt");
      if (p1) {
        setPlayer1Prompt(p1);
        setIsStep2(true);
      }
    } catch { }
  }, []);

  // Function to generate and play end-of-game summary
  const generateEndSummary = async (result: GameResult): Promise<void> => {
    if (!commentaryEnabled) return;

    return new Promise(async (resolve) => {
      try {
        // Generate end summary text
        const summaryResponse = await fetch("/api/rps-end-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalWinner: result.finalWinner,
            player1Wins: result.player1Wins,
            player2Wins: result.player2Wins,
            ties: result.ties,
            player1Prompt: result.player1Prompt,
            player2Prompt: result.player2Prompt,
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

  const startGame = async () => {
    if (!player1Prompt.trim() || !player2Prompt.trim()) {
      setError("Both players must enter a prompt!");
      return;
    }

    setError(null);
    setIsLoading(true);
    setGameState("playing");
    setCurrentRound(0);

    try {
      const response = await fetch("/api/play-rps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player1Prompt,
          player2Prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to play game");
      }

      const result: GameResult = await response.json();
      setGameResult(result);

      // Animate through the rounds
      for (let i = 0; i <= result.results.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        setCurrentRound(i);
      }

      // Generate and play end-of-game summary
      await generateEndSummary(result);

      setGameState("finished");
    } catch (err) {
      setError("Failed to play game. Please try again.");
      setGameState("setup");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    setGameState("setup");
    setGameResult(null);
    setCurrentRound(0);
    setPlayer1Prompt("");
    setPlayer2Prompt("");
    setError(null);
    try {
      sessionStorage.removeItem("rps.p1Prompt");
    } catch { }
    // Return to Player 1 step
    router.push('/games/rock-paper-scissors/player1');
  };

  const getCurrentScores = () => {
    if (!gameResult) return { p1: 0, p2: 0, ties: 0 };

    const visibleResults = gameResult.results.slice(0, currentRound);
    return {
      p1: visibleResults.filter((r) => r.winner === "player1").length,
      p2: visibleResults.filter((r) => r.winner === "player2").length,
      ties: visibleResults.filter((r) => r.winner === "tie").length,
    };
  };

  const scores = getCurrentScores();

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
          <p className="text-gray-400">Step 2: Enter Player 2's strategy</p>
        </div>

        {gameState === "setup" && (
          <div className="max-w-4xl mx-auto">
            {/* Player 2 card */}
            <div className="bg-[#111111] rounded-lg p-6 border border-red-500/30 mb-8">
              <h2 className="text-xl font-semibold text-red-400 mb-4">
                Player 2
              </h2>
              <label className="block text-gray-400 mb-2 text-sm">
                Enter your strategy prompt:
              </label>
              <textarea
                value={player2Prompt}
                onChange={(e) => setPlayer2Prompt(e.target.value)}
                className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none placeholder:text-gray-600"
                placeholder="Example: Always play what would beat my opponent's last move. If it's the first round, play paper."
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={startGame}
                disabled={isLoading}
                className="w-full bg-white text-black hover:bg-gray-100 font-medium py-3 rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Starting Battle..." : "Start Battle"}
              </button>
            </div>
          </div>
        )}

        {gameState === "playing" && !gameResult && (
          <div className="max-w-6xl mx-auto">
            {/* Player Strategies Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
                  Player 1 Strategy
                </h3>
                <div className="text-gray-400 text-sm leading-relaxed">
                  {player1Prompt}
                </div>
              </div>

              <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
                  Player 2 Strategy
                </h3>
                <div className="text-gray-400 text-sm leading-relaxed">
                  {player2Prompt}
                </div>
              </div>
            </div>

            <div className="text-center py-20">
              <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-12">
                <div className="text-6xl mb-6 animate-pulse">⚔️</div>
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Battle in Progress
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  The AIs are playing round by round with full memory
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
          </div>
        )}

        {(gameState === "playing" || gameState === "finished") &&
          gameResult && (
            <div className="max-w-6xl mx-auto">
              {/* Score Display */}
              <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6 mb-8">
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Player 1</div>
                    <div className="text-4xl font-mono font-bold text-blue-400">
                      {scores.p1}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">wins</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Ties</div>
                    <div className="text-4xl font-mono font-bold text-gray-400">
                      {scores.ties}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">rounds</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Player 2</div>
                    <div className="text-4xl font-mono font-bold text-red-400">
                      {scores.p2}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">wins</div>
                  </div>
                </div>
              </div>

              {/* Player Strategies Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                  <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
                    Player 1 Strategy
                  </h3>
                  <div className="text-gray-400 text-sm leading-relaxed">
                    {gameResult.player1Prompt}
                  </div>
                </div>

                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                  <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
                    Player 2 Strategy
                  </h3>
                  <div className="text-gray-400 text-sm leading-relaxed">
                    {gameResult.player2Prompt}
                  </div>
                </div>
              </div>

              {/* Current Round Display */}
              {currentRound > 0 &&
                currentRound <= gameResult.results.length && (
                  <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8 mb-6">
                    <div className="text-center mb-6">
                      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Round {currentRound} of 10
                      </h3>
                    </div>

                    <div className="flex items-center justify-center gap-12">
                      {/* Player 1 Move */}
                      <div className="text-center">
                        <div className="text-8xl mb-4 animate-bounce">
                          {
                            moveEmojis[
                            gameResult.results[currentRound - 1].player1Move
                            ]
                          }
                        </div>
                        <div className="text-blue-400 font-medium text-sm uppercase tracking-wide">
                          {gameResult.results[currentRound - 1].player1Move}
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-2xl font-mono text-gray-600">VS</div>

                      {/* Player 2 Move */}
                      <div className="text-center">
                        <div className="text-8xl mb-4 animate-bounce">
                          {
                            moveEmojis[
                            gameResult.results[currentRound - 1].player2Move
                            ]
                          }
                        </div>
                        <div className="text-red-400 font-medium text-sm uppercase tracking-wide">
                          {gameResult.results[currentRound - 1].player2Move}
                        </div>
                      </div>
                    </div>

                    {/* Round Result */}
                    <div className="text-center mt-6">
                      {gameResult.results[currentRound - 1].winner === "tie" ? (
                        <div className="text-xl font-semibold text-yellow-400">
                          Tie
                        </div>
                      ) : (
                        <div
                          className={`text-xl font-semibold ${gameResult.results[currentRound - 1].winner ===
                            "player1"
                            ? "text-blue-400"
                            : "text-red-400"
                            }`}
                        >
                          {gameResult.results[currentRound - 1].winner ===
                            "player1"
                            ? "Player 1 Wins"
                            : "Player 2 Wins"}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="bg-gray-800 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-100"
                    style={{ width: `${(currentRound / 10) * 100}%` }}
                  />
                </div>
                <div className="text-center text-gray-400 mt-2 text-sm">
                  {currentRound} / 10 rounds completed
                </div>
              </div>

              {/* Commentary Display - Shows as soon as commentary is generated */}
              {commentaryEnabled && currentCommentary && (
                <div className="mb-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
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

              {/* Game History (only show when finished) */}
              {gameState === "finished" && (
                <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">
                      Round History
                    </h3>
                    <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showReasonings}
                        onChange={(e) => setShowReasonings(e.target.checked)}
                        className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-xs">Show Reasoning</span>
                    </label>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[#111111] border-b border-gray-800/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Round
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Player 1
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Player 2
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/30">
                        {gameResult.results.map((result) => (
                          <tr key={result.round} className="hover:bg-gray-800/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-mono text-gray-300">
                                {result.round}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{moveEmojis[result.player1Move]}</span>
                                <span className="text-sm text-blue-400 font-medium">
                                  {result.player1Move}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{moveEmojis[result.player2Move]}</span>
                                <span className="text-sm text-red-400 font-medium">
                                  {result.player2Move}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`text-sm font-medium ${result.winner === "tie"
                                  ? "text-yellow-400"
                                  : result.winner === "player1"
                                    ? "text-blue-400"
                                    : "text-red-400"
                                  }`}
                              >
                                {result.winner === "tie"
                                  ? "Tie"
                                  : result.winner === "player1"
                                    ? "P1"
                                    : "P2"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {showReasonings && (
                    <div className="p-6 border-t border-gray-800/50 space-y-4">
                      {gameResult.results.map((result) => (
                        <div key={`reasoning-${result.round}`} className="space-y-3">
                          <div className="text-xs font-mono text-gray-500">Round {result.round} Reasoning</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/40 border border-gray-800 rounded p-3">
                              <div className="text-xs text-blue-400 font-medium mb-1 uppercase tracking-wider">
                                Player 1
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {result.player1Reasoning}
                              </p>
                            </div>
                            <div className="bg-black/40 border border-gray-800 rounded p-3">
                              <div className="text-xs text-red-400 font-medium mb-1 uppercase tracking-wider">
                                Player 2
                              </div>
                              <p className="text-xs text-gray-400 leading-relaxed">
                                {result.player2Reasoning}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Play Again Button at Bottom */}
              {gameState === "finished" && (
                <div className="text-center mt-8">
                  <button
                    onClick={resetGame}
                    className="bg-white text-black hover:bg-gray-100 font-medium py-3 px-8 rounded-lg text-sm transition-all duration-200"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
