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
    <div className="inline-block">
      <div className="grid grid-cols-8 gap-0 border-4 border-gray-700 bg-gray-800">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isWhitePiece = piece === piece.toUpperCase() && piece !== "";

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-3xl sm:text-4xl relative ${
                  isLight ? "bg-amber-100" : "bg-amber-700"
                }`}
              >
                {piece && (
                  <span
                    className={`${
                      isWhitePiece ? "text-white" : "text-black"
                    } drop-shadow-lg font-bold`}
                    style={{
                      textShadow: isWhitePiece
                        ? "1px 1px 2px rgba(0,0,0,0.8)"
                        : "1px 1px 2px rgba(255,255,255,0.5)",
                    }}
                  >
                    {PIECE_SYMBOLS[piece]}
                  </span>
                )}
                {/* File labels */}
                {rowIndex === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-xs font-bold opacity-50">
                    {files[colIndex]}
                  </span>
                )}
                {/* Rank labels */}
                {colIndex === 0 && (
                  <span className="absolute top-0.5 left-1 text-xs font-bold opacity-50">
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
                await new Promise((resolve) => setTimeout(resolve, 600));
              } else if (data.type === "end") {
                // Game ended
                gameEnd = {
                  winner: data.winner,
                  gameEndReason: data.gameEndReason,
                  pgn: data.pgn,
                };
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
            Chess Battle ♟️
          </h1>
          <p className="text-gray-400">
            Two AIs battle it out on the chess board, move by move
          </p>
        </div>

        {gameState === "setup" && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* White Player */}
              <div className="bg-gray-900 rounded-lg p-6 border border-blue-500">
                <h2 className="text-2xl font-semibold text-blue-400 mb-4">
                  White Player ♔
                </h2>
                <label className="block text-gray-300 mb-2 text-sm">
                  Enter your strategy prompt:
                </label>
                <textarea
                  value={whitePrompt}
                  onChange={(e) => setWhitePrompt(e.target.value)}
                  className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Example: Control the center, develop knights before bishops, castle early for king safety."
                />
              </div>

              {/* Black Player */}
              <div className="bg-gray-900 rounded-lg p-6 border border-red-500">
                <h2 className="text-2xl font-semibold text-red-400 mb-4">
                  Black Player ♚
                </h2>
                <label className="block text-gray-300 mb-2 text-sm">
                  Enter your strategy prompt:
                </label>
                <textarea
                  value={blackPrompt}
                  onChange={(e) => setBlackPrompt(e.target.value)}
                  className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-4 text-white focus:outline-none focus:border-red-500 resize-none"
                  placeholder="Example: Play aggressive, attack the king early, sacrifice material for tactical advantages."
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
                {isLoading ? "Starting Battle..." : "Start Chess Battle!"}
              </button>
            </div>
          </div>
        )}

        {gameState === "playing" && (
          <div className="max-w-6xl mx-auto">
            {/* Player Strategies Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-blue-400 text-lg font-semibold mb-3">
                  White Player Strategy ♔
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                  {whitePrompt}
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
                <h3 className="text-red-400 text-lg font-semibold mb-3">
                  Black Player Strategy ♚
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                  {blackPrompt}
                </div>
              </div>
            </div>

            {!gameResult ? (
              <div className="text-center py-20">
                <div className="bg-gray-900 border border-purple-500 rounded-lg p-12">
                  <div className="text-6xl mb-6 animate-pulse">♟️</div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Battle Starting...
                  </h2>
                  <p className="text-gray-400 text-lg mb-6">
                    Initializing the chess battle...
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
                </div>
              </div>
            ) : (
              <>
                {/* Chess Board and Current Move */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 mb-6">
                  <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
                    {/* Chess Board */}
                    <div className="flex-shrink-0">
                      <ChessBoard fen={getCurrentFEN()} />
                      {currentMoveIndex > 0 &&
                        currentMoveIndex <= gameResult.moves.length && (
                          <div className="mt-4 text-center">
                            <div className="text-xl font-bold text-gray-300">
                              Move {Math.floor((currentMoveIndex - 1) / 2) + 1}
                              {currentMoveIndex % 2 === 1 ? " - White" : " - Black"}
                            </div>
                            <div
                              className={`text-2xl font-bold mt-2 ${
                                gameResult.moves[currentMoveIndex - 1].player ===
                                "white"
                                  ? "text-blue-400"
                                  : "text-red-400"
                              }`}
                            >
                              {gameResult.moves[currentMoveIndex - 1].san}
                              {gameResult.moves[currentMoveIndex - 1].isCheck &&
                                !gameResult.moves[currentMoveIndex - 1]
                                  .isCheckmate &&
                                " ✓"}
                              {gameResult.moves[currentMoveIndex - 1].isCheckmate &&
                                " ✓✓"}
                            </div>
                          </div>
                        )}
                      {currentMoveIndex === 0 && (
                        <div className="mt-4 text-center">
                          <div className="text-xl font-bold text-gray-300">
                            Starting Position
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            Waiting for first move...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Move Reasoning */}
                    <div className="flex-1 max-w-md">
                      {currentMoveIndex > 0 &&
                      currentMoveIndex <= gameResult.moves.length ? (
                        <div
                          className={`${
                            gameResult.moves[currentMoveIndex - 1].player ===
                            "white"
                              ? "bg-blue-900/20 border-blue-500"
                              : "bg-red-900/20 border-red-500"
                          } border rounded-lg p-6`}
                        >
                          <h4
                            className={`${
                              gameResult.moves[currentMoveIndex - 1].player ===
                              "white"
                                ? "text-blue-400"
                                : "text-red-400"
                            } font-semibold text-lg mb-3`}
                          >
                            {gameResult.moves[currentMoveIndex - 1].player ===
                            "white"
                              ? "White's"
                              : "Black's"}{" "}
                            Reasoning:
                          </h4>
                          <p className="text-gray-300 leading-relaxed">
                            {gameResult.moves[currentMoveIndex - 1].reasoning}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
                          <div className="text-6xl mb-4 animate-pulse">🤔</div>
                          <p className="text-gray-400">
                            AI is thinking about the next move...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Move Counter */}
                <div className="text-center mb-6">
                  <div className="inline-block bg-gray-800 border border-gray-700 rounded-lg px-6 py-3">
                    <span className="text-gray-400">Moves played: </span>
                    <span className="text-white font-bold text-lg">
                      {currentMoveIndex}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {currentMoveIndex % 2 === 0 ? "White's turn" : "Black's turn"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {gameState === "finished" && gameResult && (
          <div className="max-w-6xl mx-auto">
            {/* Final Result Banner */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-2 border-purple-500 rounded-lg p-8 mb-6">
              <h2 className="text-3xl font-bold text-center mb-6 text-white">
                Game Over! 🎉
              </h2>

              <div className="text-center mb-6">
                <div
                  className={`text-4xl font-bold ${
                    gameResult.winner === "white"
                      ? "text-blue-400"
                      : gameResult.winner === "black"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {gameResult.winner === "white"
                    ? "White Wins! ♔"
                    : gameResult.winner === "black"
                    ? "Black Wins! ♚"
                    : "It's a Draw!"}
                </div>
                <div className="text-xl text-gray-300 mt-4">
                  {gameResult.gameEndReason}
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="text-lg text-gray-400">
                  Total moves: {gameResult.moves.length}
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

            {/* Player Strategies Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
                <h3 className="text-blue-400 text-lg font-semibold mb-3">
                  White Player Strategy ♔
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                  {gameResult.whitePrompt}
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
                <h3 className="text-red-400 text-lg font-semibold mb-3">
                  Black Player Strategy ♚
                </h3>
                <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed">
                  {gameResult.blackPrompt}
                </div>
              </div>
            </div>

            {/* Final Board Position */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 mb-6">
              <h3 className="text-xl font-semibold text-white mb-4 text-center">
                Final Position
              </h3>
              <div className="flex justify-center">
                <ChessBoard fen={getCurrentFEN()} />
              </div>
            </div>

            {/* Move History */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Move History
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
                <div className="space-y-3">
                  {gameResult.moves.map((move, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                    >
                      {/* Move Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 font-mono text-lg">
                            {move.moveNumber}.
                            {move.player === "black" ? ".." : ""}
                          </span>
                          <span
                            className={`text-xl font-bold ${
                              move.player === "white"
                                ? "text-blue-400"
                                : "text-red-400"
                            }`}
                          >
                            {move.san}
                          </span>
                          {move.isCheck && !move.isCheckmate && (
                            <span className="text-yellow-400 text-sm">
                              Check!
                            </span>
                          )}
                          {move.isCheckmate && (
                            <span className="text-red-400 text-sm font-bold">
                              Checkmate!
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-sm px-3 py-1 rounded ${
                            move.player === "white"
                              ? "bg-blue-900/50 text-blue-300"
                              : "bg-red-900/50 text-red-300"
                          }`}
                        >
                          {move.player === "white" ? "White" : "Black"}
                        </div>
                      </div>

                      {/* Reasoning Section */}
                      {showReasonings && (
                        <div
                          className={`${
                            move.player === "white"
                              ? "bg-blue-900/20 border-blue-500/30"
                              : "bg-red-900/20 border-red-500/30"
                          } border rounded-lg p-3 mt-3`}
                        >
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {move.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

