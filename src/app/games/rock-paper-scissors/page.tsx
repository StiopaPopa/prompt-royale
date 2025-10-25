"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Rock Paper Scissors Battle
          </h1>
          <p className="text-gray-400">10 rounds of AI vs AI combat</p>
        </div>

        {gameState === "setup" && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Player 1 */}
              <div className="bg-gray-900 rounded-lg p-6 border border-blue-500">
                <h2 className="text-2xl font-semibold text-blue-400 mb-4">
                  Player 1
                </h2>
                <label className="block text-gray-300 mb-2 text-sm">
                  Enter your strategy prompt:
                </label>
                <textarea
                  value={player1Prompt}
                  onChange={(e) => setPlayer1Prompt(e.target.value)}
                  className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Example: If I won the previous round, randomize between the other 2 moves. If I lost, stick with the same move. If it's a tie, play rock."
                />
              </div>

              {/* Player 2 */}
              <div className="bg-gray-900 rounded-lg p-6 border border-red-500">
                <h2 className="text-2xl font-semibold text-red-400 mb-4">
                  Player 2
                </h2>
                <label className="block text-gray-300 mb-2 text-sm">
                  Enter your strategy prompt:
                </label>
                <textarea
                  value={player2Prompt}
                  onChange={(e) => setPlayer2Prompt(e.target.value)}
                  className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-red-500 resize-none"
                  placeholder="Example: Always play what would beat my opponent's last move. If it's the first round, play paper."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 text-center">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={startGame}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-12 rounded-lg text-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Starting Battle..." : "Start Battle!"}
              </button>
            </div>
          </div>
        )}

        {gameState === "playing" && !gameResult && (
          <div className="max-w-6xl mx-auto">
            {/* Player Strategies Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-blue-400 text-lg font-semibold mb-3">
                  Player 1 Strategy
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                  {player1Prompt}
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
                <h3 className="text-red-400 text-lg font-semibold mb-3">
                  Player 2 Strategy
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                  {player2Prompt}
                </div>
              </div>
            </div>

            <div className="text-center py-20">
              <div className="bg-gray-900 border border-purple-500 rounded-lg p-12">
                <div className="text-6xl mb-6 animate-pulse">⚔️</div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Battle in Progress...
                </h2>
                <p className="text-gray-400 text-lg mb-6">
                  The AIs are playing round by round with full memory!
                </p>
                <div className="flex justify-center items-center gap-3">
                  <div
                    className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-pink-500 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <p className="text-gray-500 text-sm mt-6">
                  10 individual API calls with move history • Usually takes 5-15
                  seconds 🧠⚡
                </p>
              </div>
            </div>
          </div>
        )}

        {(gameState === "playing" || gameState === "finished") &&
          gameResult && (
            <div className="max-w-6xl mx-auto">
              {/* Score Display */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-6 text-center">
                  <h3 className="text-blue-400 text-lg mb-2">Player 1</h3>
                  <div className="text-4xl font-bold text-white">
                    {scores.p1}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">wins</div>
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
                  <h3 className="text-gray-400 text-lg mb-2">Ties</h3>
                  <div className="text-4xl font-bold text-white">
                    {scores.ties}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">rounds</div>
                </div>

                <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 text-center">
                  <h3 className="text-red-400 text-lg mb-2">Player 2</h3>
                  <div className="text-4xl font-bold text-white">
                    {scores.p2}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">wins</div>
                </div>
              </div>

              {/* Player Strategies Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
                  <h3 className="text-blue-400 text-lg font-semibold mb-3">
                    Player 1 Strategy
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                    {gameResult.player1Prompt}
                  </div>
                </div>

                <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
                  <h3 className="text-red-400 text-lg font-semibold mb-3">
                    Player 2 Strategy
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                    {gameResult.player2Prompt}
                  </div>
                </div>
              </div>

              {/* Current Round Display */}
              {currentRound > 0 &&
                currentRound <= gameResult.results.length && (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 mb-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-semibold text-gray-300">
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
                        <div className="text-blue-400 font-semibold text-xl">
                          {gameResult.results[currentRound - 1].player1Move}
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-4xl font-bold text-gray-500">VS</div>

                      {/* Player 2 Move */}
                      <div className="text-center">
                        <div className="text-8xl mb-4 animate-bounce">
                          {
                            moveEmojis[
                              gameResult.results[currentRound - 1].player2Move
                            ]
                          }
                        </div>
                        <div className="text-red-400 font-semibold text-xl">
                          {gameResult.results[currentRound - 1].player2Move}
                        </div>
                      </div>
                    </div>

                    {/* Round Result */}
                    <div className="text-center mt-6">
                      {gameResult.results[currentRound - 1].winner === "tie" ? (
                        <div className="text-2xl font-bold text-yellow-400">
                          It's a Tie!
                        </div>
                      ) : (
                        <div
                          className={`text-2xl font-bold ${
                            gameResult.results[currentRound - 1].winner ===
                            "player1"
                              ? "text-blue-400"
                              : "text-red-400"
                          }`}
                        >
                          {gameResult.results[currentRound - 1].winner ===
                          "player1"
                            ? "Player 1 Wins!"
                            : "Player 2 Wins!"}
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

              {/* Final Result */}
              {gameState === "finished" && (
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-2 border-purple-500 rounded-lg p-8 mb-6">
                  <h2 className="text-3xl font-bold text-center mb-6 text-white">
                    Battle Complete! 🎉
                  </h2>

                  <div className="text-center mb-6">
                    {gameResult.finalWinner === "tie" ? (
                      <div className="text-4xl font-bold text-yellow-400">
                        It's a Tie!
                      </div>
                    ) : (
                      <div
                        className={`text-4xl font-bold ${
                          gameResult.finalWinner === "player1"
                            ? "text-blue-400"
                            : "text-red-400"
                        }`}
                      >
                        {gameResult.finalWinner === "player1"
                          ? "Player 1"
                          : "Player 2"}{" "}
                        Wins!
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">
                        {gameResult.player1Wins}
                      </div>
                      <div className="text-gray-400">Player 1 Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-400">
                        {gameResult.ties}
                      </div>
                      <div className="text-gray-400">Ties</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400">
                        {gameResult.player2Wins}
                      </div>
                      <div className="text-gray-400">Player 2 Wins</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={resetGame}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}

              {/* Game History (only show when finished) */}
              {gameState === "finished" && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-white">
                      Round History
                    </h3>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showReasonings}
                          onChange={(e) => setShowReasonings(e.target.checked)}
                          className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        Show AI Reasoning
                      </label>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-4">
                      {gameResult.results.map((result) => (
                        <div
                          key={result.round}
                          className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                        >
                          {/* Round Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                              <span className="text-gray-400 font-mono text-lg">
                                Round {result.round}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-400 text-xl">
                                    {moveEmojis[result.player1Move]}
                                  </span>
                                  <span className="text-blue-400 font-semibold">
                                    {result.player1Move}
                                  </span>
                                </div>
                                <span className="text-gray-500 text-lg">
                                  VS
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-red-400 text-xl">
                                    {moveEmojis[result.player2Move]}
                                  </span>
                                  <span className="text-red-400 font-semibold">
                                    {result.player2Move}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className={`font-semibold text-lg ${
                                result.winner === "tie"
                                  ? "text-yellow-400"
                                  : result.winner === "player1"
                                  ? "text-blue-400"
                                  : "text-red-400"
                              }`}
                            >
                              {result.winner === "tie"
                                ? "Tie"
                                : result.winner === "player1"
                                ? "P1 Wins"
                                : "P2 Wins"}
                            </div>
                          </div>

                          {/* Reasoning Section - Only show when toggle is on */}
                          {showReasonings && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                                <h4 className="text-blue-400 font-semibold text-sm mb-2">
                                  Player 1 Reasoning:
                                </h4>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {result.player1Reasoning}
                                </p>
                              </div>
                              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                                <h4 className="text-red-400 font-semibold text-sm mb-2">
                                  Player 2 Reasoning:
                                </h4>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                  {result.player2Reasoning}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
