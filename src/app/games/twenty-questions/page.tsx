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
      const response = await fetch("/api/play-20q", {
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

      const data: GameResult = await response.json();
      setResult(data);
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player 1 */}
        <div className="bg-gray-900 rounded-lg p-8 border border-blue-500">
          <h3 className="text-2xl font-semibold text-blue-400 mb-4">Player 1</h3>
          <p className="text-white text-base mb-3">Enter your strategy prompt:</p>
          <textarea
            value={player1Policy}
            onChange={(e) => setPlayer1Policy(e.target.value)}
            placeholder="Example: Start with broad categories like 'Is it living?' then narrow down systematically based on answers."
            className="w-full h-48 bg-gray-800 text-white border border-gray-700 rounded-lg p-4 text-base focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        {/* Player 2 */}
        <div className="bg-gray-900 rounded-lg p-8 border border-red-500">
          <h3 className="text-2xl font-semibold text-red-400 mb-4">Player 2</h3>
          <p className="text-white text-base mb-3">Enter your strategy prompt:</p>
          <textarea
            value={player2Policy}
            onChange={(e) => setPlayer2Policy(e.target.value)}
            placeholder="Example: Use binary search approach - ask questions that eliminate half the possibilities each time."
            className="w-full h-48 bg-gray-800 text-white border border-gray-700 rounded-lg p-4 text-base focus:outline-none focus:border-red-500 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleStartGame}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-12 rounded-lg text-xl transition-all duration-200"
        >
          Start Battle!
        </button>
      </div>
    </div>
  );

  const renderPlaying = () => (
    <div className="text-center space-y-8">
      <div className="inline-block animate-bounce bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-8">
        <span className="text-6xl">🤔</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white">Players are thinking...</h2>
        <p className="text-gray-400 text-lg">Generating secret object and battling it out</p>
        <div className="flex justify-center items-center space-x-2 text-gray-400 text-lg">
          <span>Processing</span>
          <span className="animate-pulse">.</span>
          <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>.</span>
          <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>.</span>
        </div>
      </div>
    </div>
  );

  const renderFinished = () => {
    if (!result) return null;

    const { player1, player2, winner, winnerReason, secretObject: secret } = result;

    return (
      <div className="space-y-8">
        {/* Winner Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-2">
            {winner === "tie" ? "It's a Tie! 🤝" : `Player ${winner} Wins! 🎉`}
          </h2>
          <p className="text-white/90 text-lg">{winnerReason}</p>
          <p className="text-white/80 text-base mt-2">Secret Object: <span className="font-bold">{secret}</span></p>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6">
            <div className="text-blue-400 text-sm font-semibold mb-2">PLAYER 1</div>
            <div className="text-5xl font-bold text-white mb-2">{player1.questionsUsed}</div>
            <div className="text-gray-400 text-sm">
              {player1.questionsUsed === 1 ? "question" : "questions"} • {player1.correct ? "✓ Correct" : "✗ Failed"}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex items-center justify-center">
            <div className="text-6xl">{winner === 1 ? "👈" : winner === 2 ? "👉" : "🤝"}</div>
          </div>

          <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
            <div className="text-red-400 text-sm font-semibold mb-2">PLAYER 2</div>
            <div className="text-5xl font-bold text-white mb-2">{player2.questionsUsed}</div>
            <div className="text-gray-400 text-sm">
              {player2.questionsUsed === 1 ? "question" : "questions"} • {player2.correct ? "✓ Correct" : "✗ Failed"}
            </div>
          </div>
        </div>

        {/* Question History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Questions */}
          <div className="bg-gray-900 border border-blue-500 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400">Player 1 Questions</h3>
              <button
                onClick={() => setShowPlayer1Turns(!showPlayer1Turns)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {showPlayer1Turns ? "Hide" : "Show"}
              </button>
            </div>
            {showPlayer1Turns && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {player1.turns.map((turn, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Question {idx + 1}</div>
                    <div className="text-white mb-2 font-medium">{turn.question}</div>
                    {turn.reasoning && (
                      <div className="mb-2 p-2 bg-gray-700/50 rounded border-l-2 border-blue-400">
                        <span className="text-xs font-bold text-blue-300">Reasoning: </span>
                        <span className="text-sm text-gray-300 italic">{turn.reasoning}</span>
                      </div>
                    )}
                    <div className="flex items-start space-x-2">
                      <span className="text-xs font-bold text-green-400">Answer:</span>
                      <span className="text-sm text-green-300">{turn.answer}</span>
                    </div>
                    {turn.hint && (
                      <div className="flex items-start space-x-2 mt-1">
                        <span className="text-xs font-bold text-yellow-400">Hint:</span>
                        <span className="text-sm text-yellow-300">{turn.hint}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player 2 Questions */}
          <div className="bg-gray-900 border border-red-500 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-400">Player 2 Questions</h3>
              <button
                onClick={() => setShowPlayer2Turns(!showPlayer2Turns)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                {showPlayer2Turns ? "Hide" : "Show"}
              </button>
            </div>
            {showPlayer2Turns && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {player2.turns.map((turn, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Question {idx + 1}</div>
                    <div className="text-white mb-2 font-medium">{turn.question}</div>
                    {turn.reasoning && (
                      <div className="mb-2 p-2 bg-gray-700/50 rounded border-l-2 border-red-400">
                        <span className="text-xs font-bold text-red-300">Reasoning: </span>
                        <span className="text-sm text-gray-300 italic">{turn.reasoning}</span>
                      </div>
                    )}
                    <div className="flex items-start space-x-2">
                      <span className="text-xs font-bold text-green-400">Answer:</span>
                      <span className="text-sm text-green-300">{turn.answer}</span>
                    </div>
                    {turn.hint && (
                      <div className="flex items-start space-x-2 mt-1">
                        <span className="text-xs font-bold text-yellow-400">Hint:</span>
                        <span className="text-sm text-yellow-300">{turn.hint}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player Strategies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Strategy */}
          <div className="bg-gray-900 border border-blue-500 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-400 mb-3">Player 1 Strategy</h3>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{result.player1Policy}</p>
            </div>
          </div>

          {/* Player 2 Strategy */}
          <div className="bg-gray-900 border border-red-500 rounded-lg p-6">
            <h3 className="text-xl font-bold text-red-400 mb-3">Player 2 Strategy</h3>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{result.player2Policy}</p>
            </div>
          </div>
        </div>

        {/* Play Again Button */}
        <div className="flex justify-center">
          <button
            onClick={handlePlayAgain}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-12 rounded-lg text-xl transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">20 Questions</h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            20 rounds of AI vs AI deduction
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          {phase === "setup" && renderSetup()}
          {phase === "playing" && renderPlaying()}
          {phase === "finished" && renderFinished()}
        </div>
      </div>
    </div>
  );
}
