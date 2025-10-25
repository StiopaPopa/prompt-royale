"use client";

import { useState } from "react";
import Link from "next/link";

interface MoveResult {
  moveNumber: number;
  player: "white" | "black";
  move: string;
  san: string;
  reasoning: string;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

interface GameResult {
  moves: MoveResult[];
  winner: "white" | "black" | "draw";
  gameEndReason: string;
  whitePrompt: string;
  blackPrompt: string;
  pgn: string;
  evaluation?: number;
  evaluationInPawns?: string;
}

// Chess piece Unicode characters
const PIECE_SYMBOLS: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

// Parse FEN to get board state
function parseFEN(fen: string): string[][] {
  const board: string[][] = [];
  const rows = fen.split(" ")[0].split("/");

  for (const row of rows) {
    const boardRow: string[] = [];
    for (const char of row) {
      if (isNaN(parseInt(char))) {
        boardRow.push(char);
      } else {
        // Empty squares
        for (let i = 0; i < parseInt(char); i++) {
          boardRow.push("");
        }
      }
    }
    board.push(boardRow);
  }

  return board;
}

// Chess Board Component
function ChessBoard({ fen }: { fen: string }) {
  const board = parseFEN(fen);
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <div className="inline-block border border-gray-800/50 rounded-lg overflow-hidden">
      <div className="grid grid-cols-8 gap-0">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isWhitePiece = piece === piece.toUpperCase() && piece !== "";

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center relative ${
                  isLight ? "bg-[#F0D9B5]" : "bg-[#B58863]"
                }`}
              >
                {piece && (
                  <span
                    className={`text-5xl sm:text-6xl md:text-7xl ${
                      isWhitePiece ? "text-white" : "text-black"
                    }`}
                    style={{
                      filter: isWhitePiece
                        ? "drop-shadow(0 2px 4px rgba(0,0,0,0.9))"
                        : "drop-shadow(0 2px 4px rgba(255,255,255,0.4))",
                    }}
                  >
                    {PIECE_SYMBOLS[piece]}
                  </span>
                )}
                {/* File labels */}
                {rowIndex === 7 && (
                  <span className={`absolute bottom-1 right-1.5 text-xs font-semibold ${
                    isLight ? "text-[#B58863]" : "text-[#F0D9B5]"
                  }`}>
                    {files[colIndex]}
                  </span>
                )}
                {/* Rank labels */}
                {colIndex === 0 && (
                  <span className={`absolute top-1 left-1.5 text-xs font-semibold ${
                    isLight ? "text-[#B58863]" : "text-[#F0D9B5]"
                  }`}>
                    {ranks[rowIndex]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ChessPage() {
  const [whitePrompt, setWhitePrompt] = useState("");
  const [blackPrompt, setBlackPrompt] = useState("");
  const [gameState, setGameState] = useState<"setup" | "playing" | "finished">(
    "setup"
  );
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasonings, setShowReasonings] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const startGame = async () => {
    if (!whitePrompt.trim() || !blackPrompt.trim()) {
      setError("Both players must enter a prompt!");
      return;
    }

    setError(null);
    setIsLoading(true);
    setGameState("playing");
    setCurrentMoveIndex(0);

    try {
      const response = await fetch("/api/play-chess-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          whitePrompt,
          blackPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to play chess game");
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const moves: MoveResult[] = [];
      let gameEnd: {
        winner: "white" | "black" | "draw";
        gameEndReason: string;
        pgn: string;
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
                setGameResult({
                  moves: [],
                  winner: "draw",
                  gameEndReason: "",
                  whitePrompt: data.whitePrompt,
                  blackPrompt: data.blackPrompt,
                  pgn: "",
                });
              } else if (data.type === "move") {
                // New move received
                moves.push(data.move);
                setGameResult((prev) => ({
                  ...prev!,
                  moves: [...moves],
                }));
                setCurrentMoveIndex(moves.length);
                
                // Small delay for visual effect
                await new Promise((resolve) => setTimeout(resolve, 200));
              } else if (data.type === "evaluating") {
                // Stockfish evaluation in progress
                setIsEvaluating(true);
              } else if (data.type === "end") {
                // Game ended
                setIsEvaluating(false);
                gameEnd = {
                  winner: data.winner,
                  gameEndReason: data.gameEndReason,
                  pgn: data.pgn,
                };
                if (data.evaluation !== undefined) {
                  setGameResult((prev) => ({
                    ...prev!,
                    evaluation: data.evaluation,
                    evaluationInPawns: data.evaluationInPawns,
                  }));
                }
              }
            }
          }
        }
      }

      // Update final result
      if (gameEnd) {
        setGameResult((prev) => ({
          ...prev!,
          winner: gameEnd!.winner,
          gameEndReason: gameEnd!.gameEndReason,
          pgn: gameEnd!.pgn,
        }));
      }

      setGameState("finished");
    } catch (err) {
      setError("Failed to play chess game. Please try again.");
      setGameState("setup");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    setGameState("setup");
    setGameResult(null);
    setCurrentMoveIndex(0);
    setWhitePrompt("");
    setBlackPrompt("");
    setError(null);
  };

  const getCurrentFEN = () => {
    if (!gameResult || currentMoveIndex === 0) {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
    return gameResult.moves[currentMoveIndex - 1].fen;
  };

  const visibleMoves = gameResult?.moves.slice(0, currentMoveIndex) || [];

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
            Chess Battle ♟️
          </h1>
          <p className="text-gray-400">
            Two AIs battle for exactly 30 moves each - Chess engine judges the winner!
          </p>
        </div>

        {gameState === "setup" && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* White Player */}
              <div className="bg-[#111111] rounded-lg p-6 border border-blue-500/30">
                <h2 className="text-xl font-semibold text-blue-400 mb-4">
                  White Player ♔
                </h2>
                <label className="block text-gray-400 mb-2 text-sm">
                  Enter your strategy prompt:
                </label>
                <textarea
                  value={whitePrompt}
                  onChange={(e) => setWhitePrompt(e.target.value)}
                  className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
                  placeholder="Example: Control the center, develop knights before bishops, castle early for king safety."
                />
              </div>

              {/* Black Player */}
              <div className="bg-[#111111] rounded-lg p-6 border border-red-500/30">
                <h2 className="text-xl font-semibold text-red-400 mb-4">
                  Black Player ♚
                </h2>
                <label className="block text-gray-400 mb-2 text-sm">
                  Enter your strategy prompt:
                </label>
                <textarea
                  value={blackPrompt}
                  onChange={(e) => setBlackPrompt(e.target.value)}
                  className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none placeholder:text-gray-600"
                  placeholder="Example: Play aggressive, attack the king early, sacrifice material for tactical advantages."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={startGame}
                disabled={isLoading}
                className="bg-white text-black hover:bg-gray-100 font-medium py-3 px-10 rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Starting Battle..." : "Start Chess Battle"}
              </button>
            </div>
          </div>
        )}

        {gameState === "playing" && (
          <div className="max-w-6xl mx-auto">
              {/* Player Strategies Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                  <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
                    White Player Strategy ♔
                  </h3>
                  <div className="text-gray-400 text-sm leading-relaxed">
                    {whitePrompt}
                  </div>
                </div>

                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                  <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
                    Black Player Strategy ♚
                  </h3>
                  <div className="text-gray-400 text-sm leading-relaxed">
                    {blackPrompt}
                  </div>
                </div>
              </div>

              {!gameResult ? (
              <div className="text-center py-20">
                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-12">
                  <div className="text-6xl mb-6 animate-pulse">♟️</div>
                  <h2 className="text-2xl font-semibold text-white mb-4">
                    Battle Starting
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">
                    Initializing the chess battle...
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
            ) : (
              <>
                {/* Chess Board and Current Move */}
                <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8 mb-6">
                  <div className="flex flex-col items-center justify-center gap-6">
                    {/* Move Info Above Board */}
                    {currentMoveIndex > 0 && currentMoveIndex <= gameResult.moves.length && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Move {Math.floor((currentMoveIndex - 1) / 2) + 1}
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-3xl font-mono font-bold ${
                              gameResult.moves[currentMoveIndex - 1].player === "white"
                                ? "text-blue-400"
                                : "text-red-400"
                            }`}
                          >
                            {gameResult.moves[currentMoveIndex - 1].san}
                          </span>
                          {gameResult.moves[currentMoveIndex - 1].isCheck &&
                            !gameResult.moves[currentMoveIndex - 1].isCheckmate && (
                              <span className="text-yellow-400 text-sm">Check</span>
                            )}
                          {gameResult.moves[currentMoveIndex - 1].isCheckmate && (
                            <span className="text-red-400 text-sm font-bold">Checkmate</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {gameResult.moves[currentMoveIndex - 1].player === "white"
                            ? "White"
                            : "Black"}
                        </div>
                      </div>
                    )}
                    {currentMoveIndex === 0 && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">
                          Starting Position
                        </div>
                      </div>
                    )}

                    {/* Chess Board */}
                    <div className="flex-shrink-0">
                      <ChessBoard fen={getCurrentFEN()} />
                    </div>

                    {/* Move Counter */}
                    <div className="bg-black/40 border border-gray-800 rounded-lg px-6 py-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400">Moves:</span>
                        <span className="text-white font-mono font-bold">
                          {currentMoveIndex} / 60
                        </span>
                        {!isEvaluating && (
                          <span className="text-gray-500">
                            • {currentMoveIndex % 2 === 0 ? "White" : "Black"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Move Reasoning Below */}
                    {currentMoveIndex > 0 && currentMoveIndex <= gameResult.moves.length && (
                      <div className="w-full max-w-2xl">
                        <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                          <div
                            className={`text-xs font-medium mb-2 uppercase tracking-wider ${
                              gameResult.moves[currentMoveIndex - 1].player === "white"
                                ? "text-blue-400"
                                : "text-red-400"
                            }`}
                          >
                            {gameResult.moves[currentMoveIndex - 1].player === "white"
                              ? "White's"
                              : "Black's"}{" "}
                            Reasoning
                          </div>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {gameResult.moves[currentMoveIndex - 1].reasoning}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation in Progress */}
                {isEvaluating && (
                  <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8 mb-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4 animate-pulse">⚖️</div>
                      <h3 className="text-2xl font-semibold text-white mb-3">
                        Evaluating Position
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Chess engine is analyzing the final position
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
              </>
            )}
          </div>
        )}

        {gameState === "finished" && gameResult && (
          <div className="max-w-6xl mx-auto">
            {/* Final Result Banner */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8 mb-6">
              <div className="text-center mb-6">
                <div
                  className={`text-3xl font-semibold mb-2 ${
                    gameResult.winner === "white"
                      ? "text-blue-400"
                      : gameResult.winner === "black"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {gameResult.winner === "white"
                    ? "White Wins ♔"
                    : gameResult.winner === "black"
                    ? "Black Wins ♚"
                    : "Draw"}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {gameResult.gameEndReason}
                </div>
              </div>

              <div className="flex items-center justify-center gap-8 mb-6">
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-1">Total Moves</div>
                  <div className="text-2xl font-mono font-bold text-gray-300">
                    {gameResult.moves.length}
                  </div>
                </div>
                {gameResult.evaluationInPawns && (
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Engine Eval</div>
                    <div
                      className={`text-2xl font-mono font-bold ${
                        parseFloat(gameResult.evaluationInPawns) > 0.5
                          ? "text-blue-400"
                          : parseFloat(gameResult.evaluationInPawns) < -0.5
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {parseFloat(gameResult.evaluationInPawns) > 0 ? "+" : ""}
                      {gameResult.evaluationInPawns}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center">
                <button
                  onClick={resetGame}
                  className="bg-white text-black hover:bg-gray-100 font-medium py-2 px-6 rounded-lg text-sm transition-all duration-200"
                >
                  Play Again
                </button>
              </div>
            </div>

            {/* Player Strategies Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
                  White Player Strategy ♔
                </h3>
                <div className="text-gray-400 text-sm leading-relaxed">
                  {gameResult.whitePrompt}
                </div>
              </div>

              <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
                <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
                  Black Player Strategy ♚
                </h3>
                <div className="text-gray-400 text-sm leading-relaxed">
                  {gameResult.blackPrompt}
                </div>
              </div>
            </div>

            {/* Final Board Position */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8 mb-6">
              <div className="flex flex-col items-center gap-6">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  Final Position
                </h3>
                <ChessBoard fen={getCurrentFEN()} />
              </div>
            </div>

            {/* Move History */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  Move History
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
                        Move
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Notation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/30">
                    {gameResult.moves.map((move, index) => (
                      <tr key={index} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-300">
                            {move.moveNumber}.{move.player === "black" ? ".." : ""}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-bold ${
                              move.player === "white"
                                ? "text-blue-400"
                                : "text-red-400"
                            }`}
                          >
                            {move.san}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400">
                            {move.player === "white" ? "White" : "Black"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {move.isCheckmate ? (
                            <span className="text-xs font-medium text-red-400">
                              Checkmate
                            </span>
                          ) : move.isCheck ? (
                            <span className="text-xs font-medium text-yellow-400">
                              Check
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {showReasonings && (
                <div className="p-6 border-t border-gray-800/50 space-y-4">
                  {gameResult.moves.map((move, index) => (
                    <div key={`reasoning-${index}`} className="space-y-2">
                      <div className="text-xs font-mono text-gray-500">
                        {move.moveNumber}.{move.player === "black" ? ".." : ""} {move.san}
                      </div>
                      <div className="bg-black/40 border border-gray-800 rounded p-3">
                        <div
                          className={`text-xs font-medium mb-1 uppercase tracking-wider ${
                            move.player === "white" ? "text-blue-400" : "text-red-400"
                          }`}
                        >
                          {move.player === "white" ? "White" : "Black"}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {move.reasoning}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

