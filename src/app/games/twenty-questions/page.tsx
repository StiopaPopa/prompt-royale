"use client";

import { useState } from "react";
import Link from "next/link";

type GamePhase = "setup" | "playing" | "finished";

interface QuestionTurn {
  question: string;
  answer: string;
  hint?: string;
  reasoning?: string;
}

interface PlayerResult {
  player: 1 | 2;
  turns: QuestionTurn[];
  questionsUsed: number;
  correct: boolean;
  tokenUsage: number;
}

interface GameResult {
  player1: PlayerResult;
  player2: PlayerResult;
  winner: 1 | 2 | "tie";
  winnerReason: string;
  secretObject: string;
  player1Policy: string;
  player2Policy: string;
}

export default function TwentyQuestionsPage() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [player1Policy, setPlayer1Policy] = useState("");
  const [player2Policy, setPlayer2Policy] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [showPlayer1Turns, setShowPlayer1Turns] = useState(true);
  const [showPlayer2Turns, setShowPlayer2Turns] = useState(true);

  const handleStartGame = async () => {
    if (!player1Policy.trim() || !player2Policy.trim()) {
      alert("Please fill in both player strategy prompts before starting.");
      return;
    }

    setPhase("playing");

    try {
      const response = await fetch("/api/play-20q-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player1Policy: player1Policy.trim(),
          player2Policy: player2Policy.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let player1Turns: QuestionTurn[] = [];
      let player2Turns: QuestionTurn[] = [];
      let secretObject = "";
      let gameEnd: {
        winner: 1 | 2 | "tie";
        winnerReason: string;
        player1: PlayerResult;
        player2: PlayerResult;
      } | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.type === "start") {
                // Game started
                secretObject = data.secretObject;
                setResult({
                  player1: {
                    player: 1,
                    turns: [],
                    questionsUsed: 0,
                    correct: false,
                    tokenUsage: 0,
                  },
                  player2: {
                    player: 2,
                    turns: [],
                    questionsUsed: 0,
                    correct: false,
                    tokenUsage: 0,
                  },
                  winner: "tie",
                  winnerReason: "",
                  secretObject: data.secretObject,
                  player1Policy: data.player1Policy,
                  player2Policy: data.player2Policy,
                });
              } else if (data.type === "question") {
                // New question received
                if (data.player === 1) {
                  player1Turns.push(data.turn);
                } else {
                  player2Turns.push(data.turn);
                }

                setResult((prev) => ({
                  ...prev!,
                  player1: {
                    ...prev!.player1,
                    turns: [...player1Turns],
                    questionsUsed: player1Turns.length,
                  },
                  player2: {
                    ...prev!.player2,
                    turns: [...player2Turns],
                    questionsUsed: player2Turns.length,
                  },
                }));

                // Small delay for visual effect
                await new Promise((resolve) => setTimeout(resolve, 100));
              } else if (data.type === "end") {
                // Game ended
                gameEnd = {
                  winner: data.winner,
                  winnerReason: data.winnerReason,
                  player1: data.player1,
                  player2: data.player2,
                };
              }
            }
          }
        }
      }

      // Update final result
      if (gameEnd) {
        setResult((prev) => ({
          ...prev!,
          winner: gameEnd!.winner,
          winnerReason: gameEnd!.winnerReason,
          player1: gameEnd!.player1,
          player2: gameEnd!.player2,
        }));
      }

      setPhase("finished");
    } catch (error) {
      console.error("Error playing game:", error);
      alert("An error occurred while playing the game. Please try again.");
      setPhase("setup");
    }
  };

  const handlePlayAgain = () => {
    setPhase("setup");
    setPlayer1Policy("");
    setPlayer2Policy("");
    setResult(null);
    setShowPlayer1Turns(true);
    setShowPlayer2Turns(true);
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Player 1 */}
        <div className="bg-[#111111] rounded-lg p-6 border border-blue-500/30">
          <h2 className="text-xl font-semibold text-blue-400 mb-4">
            Player 1
          </h2>
          <label className="block text-gray-400 mb-2 text-sm">
            Enter your strategy prompt:
          </label>
          <textarea
            value={player1Policy}
            onChange={(e) => setPlayer1Policy(e.target.value)}
            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
            placeholder="Example: Start with broad categories like 'Is it living?' then narrow down systematically based on answers."
          />
        </div>

        {/* Player 2 */}
        <div className="bg-[#111111] rounded-lg p-6 border border-red-500/30">
          <h2 className="text-xl font-semibold text-red-400 mb-4">
            Player 2
          </h2>
          <label className="block text-gray-400 mb-2 text-sm">
            Enter your strategy prompt:
          </label>
          <textarea
            value={player2Policy}
            onChange={(e) => setPlayer2Policy(e.target.value)}
            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none placeholder:text-gray-600"
            placeholder="Example: Use binary search approach - ask questions that eliminate half the possibilities each time."
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleStartGame}
          className="bg-white text-black hover:bg-gray-100 font-medium py-3 px-10 rounded-lg text-base transition-all duration-200"
        >
          Start Battle
        </button>
      </div>
    </div>
  );

  const renderPlaying = () => {
    if (!result) {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-12">
              <div className="text-6xl mb-6 animate-pulse">🤔</div>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Starting Battle
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Generating secret object...
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
      );
    }

    const { player1, player2, secretObject } = result;

    return (
      <div className="max-w-6xl mx-auto">
        {/* Secret Object Display */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Secret Object</div>
            <div className="text-3xl font-bold text-white mb-2">{secretObject}</div>
            <div className="text-xs text-gray-400">Players are asking questions...</div>
          </div>
        </div>

        {/* Player Strategies Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Player 1 Strategy
            </h3>
            <div className="text-gray-400 text-sm leading-relaxed">
              {player1Policy}
            </div>
          </div>

          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Player 2 Strategy
            </h3>
            <div className="text-gray-400 text-sm leading-relaxed">
              {player2Policy}
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">Player 1</div>
              <div className="text-4xl font-mono font-bold text-blue-400">
                {player1.questionsUsed}
              </div>
              <div className="text-xs text-gray-500 mt-1">questions asked</div>
            </div>

            <div>
              <div className="text-xs text-red-400 uppercase tracking-wider mb-2">Player 2</div>
              <div className="text-4xl font-mono font-bold text-red-400">
                {player2.questionsUsed}
              </div>
              <div className="text-xs text-gray-500 mt-1">questions asked</div>
            </div>
          </div>
        </div>

        {/* Live Question History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Questions */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-blue-400">Player 1 Questions</h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-3">
                {player1.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first question...
                  </div>
                ) : (
                  player1.turns.map((turn, idx) => (
                    <div key={idx} className="bg-black/40 border border-gray-800 rounded-lg p-4 animate-fadeIn">
                      <div className="text-xs text-gray-500 mb-2">Question {idx + 1}</div>
                      <div className="text-white mb-2 font-medium text-sm">{turn.question}</div>
                      {turn.reasoning && (
                        <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-blue-400">
                          <span className="text-xs font-bold text-blue-300">Reasoning: </span>
                          <span className="text-xs text-gray-300 italic">{turn.reasoning}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-green-400">Answer:</span>
                        <span className="text-xs text-green-300">{turn.answer}</span>
                      </div>
                      {turn.hint && (
                        <div className="flex items-start gap-2 mt-1">
                          <span className="text-xs font-bold text-yellow-400">Hint:</span>
                          <span className="text-xs text-yellow-300">{turn.hint}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Player 2 Questions */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-red-400">Player 2 Questions</h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-3">
                {player2.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first question...
                  </div>
                ) : (
                  player2.turns.map((turn, idx) => (
                    <div key={idx} className="bg-black/40 border border-gray-800 rounded-lg p-4 animate-fadeIn">
                      <div className="text-xs text-gray-500 mb-2">Question {idx + 1}</div>
                      <div className="text-white mb-2 font-medium text-sm">{turn.question}</div>
                      {turn.reasoning && (
                        <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-red-400">
                          <span className="text-xs font-bold text-red-300">Reasoning: </span>
                          <span className="text-xs text-gray-300 italic">{turn.reasoning}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-green-400">Answer:</span>
                        <span className="text-xs text-green-300">{turn.answer}</span>
                      </div>
                      {turn.hint && (
                        <div className="flex items-start gap-2 mt-1">
                          <span className="text-xs font-bold text-yellow-400">Hint:</span>
                          <span className="text-xs text-yellow-300">{turn.hint}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinished = () => {
    if (!result) return null;

    const { player1, player2, winner, winnerReason, secretObject: secret } = result;

    return (
      <div className="max-w-6xl mx-auto">
        <div className="space-y-8">
          {/* Secret Object Banner */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Secret Object</div>
              <div className="text-4xl font-bold text-white mb-4">{secret}</div>
            </div>
          </div>

          {/* Winner Banner */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className={`text-3xl font-semibold mb-2 ${
                winner === "tie" ? "text-yellow-400" : winner === 1 ? "text-blue-400" : "text-red-400"
              }`}>
                {winner === "tie" ? "It's a Tie" : `Player ${winner} Wins`}
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {winnerReason}
              </div>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto mb-6">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {player1.questionsUsed}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  P1 Questions
                </div>
                <div className="text-xs mt-1">
                  {player1.correct ? <span className="text-green-400">✓ Correct</span> : <span className="text-red-400">✗ Failed</span>}
                </div>
              </div>
              <div className="text-center flex items-center justify-center">
                <div className="text-4xl">{winner === 1 ? "👈" : winner === 2 ? "👉" : "🤝"}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-red-400">
                  {player2.questionsUsed}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  P2 Questions
                </div>
                <div className="text-xs mt-1">
                  {player2.correct ? <span className="text-green-400">✓ Correct</span> : <span className="text-red-400">✗ Failed</span>}
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handlePlayAgain}
                className="bg-white text-black hover:bg-gray-100 font-medium py-2 px-6 rounded-lg text-sm transition-all duration-200"
              >
                Play Again
              </button>
            </div>
          </div>

          {/* Question History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Questions */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-blue-400">Player 1 Questions</h3>
                <button
                  onClick={() => setShowPlayer1Turns(!showPlayer1Turns)}
                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                >
                  {showPlayer1Turns ? "Hide" : "Show"}
                </button>
              </div>
              {showPlayer1Turns && (
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {player1.turns.map((turn, idx) => (
                      <div key={idx} className="bg-black/40 border border-gray-800 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-2">Question {idx + 1}</div>
                        <div className="text-white mb-2 font-medium text-sm">{turn.question}</div>
                        {turn.reasoning && (
                          <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-blue-400">
                            <span className="text-xs font-bold text-blue-300">Reasoning: </span>
                            <span className="text-xs text-gray-300 italic">{turn.reasoning}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-green-400">Answer:</span>
                          <span className="text-xs text-green-300">{turn.answer}</span>
                        </div>
                        {turn.hint && (
                          <div className="flex items-start gap-2 mt-1">
                            <span className="text-xs font-bold text-yellow-400">Hint:</span>
                            <span className="text-xs text-yellow-300">{turn.hint}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Player 2 Questions */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-red-400">Player 2 Questions</h3>
                <button
                  onClick={() => setShowPlayer2Turns(!showPlayer2Turns)}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  {showPlayer2Turns ? "Hide" : "Show"}
                </button>
              </div>
              {showPlayer2Turns && (
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {player2.turns.map((turn, idx) => (
                      <div key={idx} className="bg-black/40 border border-gray-800 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-2">Question {idx + 1}</div>
                        <div className="text-white mb-2 font-medium text-sm">{turn.question}</div>
                        {turn.reasoning && (
                          <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-red-400">
                            <span className="text-xs font-bold text-red-300">Reasoning: </span>
                            <span className="text-xs text-gray-300 italic">{turn.reasoning}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-green-400">Answer:</span>
                          <span className="text-xs text-green-300">{turn.answer}</span>
                        </div>
                        {turn.hint && (
                          <div className="flex items-start gap-2 mt-1">
                            <span className="text-xs font-bold text-yellow-400">Hint:</span>
                            <span className="text-xs text-yellow-300">{turn.hint}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Strategies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Strategy */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
                Player 1 Strategy
              </h3>
              <div className="text-gray-400 text-sm leading-relaxed">
                {result.player1Policy}
              </div>
            </div>

            {/* Player 2 Strategy */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
                Player 2 Strategy
              </h3>
              <div className="text-gray-400 text-sm leading-relaxed">
                {result.player2Policy}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
            20 Questions Battle
          </h1>
          <p className="text-gray-400">20 rounds of AI vs AI deduction</p>
        </div>

        {phase === "setup" && renderSetup()}
        {phase === "playing" && renderPlaying()}
        {phase === "finished" && renderFinished()}
      </div>
    </div>
  );
}
