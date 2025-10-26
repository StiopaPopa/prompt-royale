"use client";

import { useState, Fragment } from "react";
import Link from "next/link";

type GamePhase = "setup" | "placing" | "playing" | "finished";

type Coordinate = { row: string; col: number };

interface Ship {
  length: number;
  coordinates: Coordinate[];
  hits: boolean[];
}

interface Turn {
  coordinate: Coordinate;
  result: "hit" | "miss" | "sunk";
  sunkShipLength?: number;
  reasoning?: string;
}

interface PlayerResult {
  player: 1 | 2;
  ships: Ship[];
  turns: Turn[];
  shotsHit: number;
  shotsMissed: number;
  shipsRemaining: number;
}

interface GameResult {
  player1: PlayerResult;
  player2: PlayerResult;
  winner: 1 | 2 | "tie";
  winnerReason: string;
  player1Policy: string;
  player2Policy: string;
}

const ROWS = ["A", "B", "C", "D", "E"];
const COLS = [1, 2, 3, 4, 5];

function coordinateToString(coord: Coordinate): string {
  return `${coord.row}${coord.col}`;
}

function areCoordinatesEqual(c1: Coordinate, c2: Coordinate): boolean {
  return c1.row === c2.row && c1.col === c2.col;
}

export default function BattleshipPage() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [player1Policy, setPlayer1Policy] = useState("");
  const [player2Policy, setPlayer2Policy] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [lastShipPlaced, setLastShipPlaced] = useState<{
    player: 1 | 2;
    ship: Ship;
  } | null>(null);
  const [lastShot, setLastShot] = useState<{
    player: 1 | 2;
    coordinate: Coordinate;
  } | null>(null);

  const handleStartGame = async () => {
    if (!player1Policy.trim() || !player2Policy.trim()) {
      alert("Please fill in both player strategy prompts before starting.");
      return;
    }

    setPhase("placing");

    try {
      const response = await fetch("/api/play-battleship-stream", {
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

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let gameResult: GameResult | null = null;

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
                console.log("Game started");
              } else if (data.type === "ships_placed") {
                // Ships placed - show them one by one
                setResult({
                  player1: {
                    player: 1,
                    ships: data.player1Ships,
                    turns: [],
                    shotsHit: 0,
                    shotsMissed: 0,
                    shipsRemaining: data.player1Ships.length,
                  },
                  player2: {
                    player: 2,
                    ships: data.player2Ships,
                    turns: [],
                    shotsHit: 0,
                    shotsMissed: 0,
                    shipsRemaining: data.player2Ships.length,
                  },
                  winner: "tie",
                  winnerReason: "",
                  player1Policy: player1Policy.trim(),
                  player2Policy: player2Policy.trim(),
                });

                // Animate ship placements
                for (let i = 0; i < data.player1Ships.length; i++) {
                  await new Promise((resolve) => setTimeout(resolve, 600));
                  setLastShipPlaced({ player: 1, ship: data.player1Ships[i] });
                  await new Promise((resolve) => setTimeout(resolve, 600));
                  setLastShipPlaced({ player: 2, ship: data.player2Ships[i] });
                }
                await new Promise((resolve) => setTimeout(resolve, 800));
                setLastShipPlaced(null);
                setPhase("playing");
              } else if (data.type === "turn") {
                // New turn - highlight the shot
                setCurrentRound(data.roundNumber);
                setLastShot({
                  player: data.player,
                  coordinate: data.turn.coordinate,
                });

                setResult((prev) => {
                  if (!prev) return null;
                  if (data.player === 1) {
                    return {
                      ...prev,
                      player1: {
                        ...prev.player1,
                        turns: [...prev.player1.turns, data.turn],
                        shotsHit: prev.player1.turns.filter(
                          (t: Turn) =>
                            t.result === "hit" || t.result === "sunk"
                        ).length + (data.turn.result === "hit" || data.turn.result === "sunk" ? 1 : 0),
                        shotsMissed: prev.player1.turns.filter(
                          (t: Turn) => t.result === "miss"
                        ).length + (data.turn.result === "miss" ? 1 : 0),
                      },
                    };
                  } else {
                    return {
                      ...prev,
                      player2: {
                        ...prev.player2,
                        turns: [...prev.player2.turns, data.turn],
                        shotsHit: prev.player2.turns.filter(
                          (t: Turn) =>
                            t.result === "hit" || t.result === "sunk"
                        ).length + (data.turn.result === "hit" || data.turn.result === "sunk" ? 1 : 0),
                        shotsMissed: prev.player2.turns.filter(
                          (t: Turn) => t.result === "miss"
                        ).length + (data.turn.result === "miss" ? 1 : 0),
                      },
                    };
                  }
                });

                // Small delay for visual effect
                await new Promise((resolve) => setTimeout(resolve, 500));
              } else if (data.type === "end") {
                // Game ended
                gameResult = {
                  player1: data.player1,
                  player2: data.player2,
                  winner: data.winner,
                  winnerReason: data.winnerReason,
                  player1Policy: player1Policy.trim(),
                  player2Policy: player2Policy.trim(),
                };
              }
            }
          }
        }
      }

      if (gameResult) {
        setResult(gameResult);
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
    setCurrentRound(0);
    setLastShipPlaced(null);
    setLastShot(null);
  };

  const renderGrid = (
    playerShips: Ship[],
    playerTurns: Turn[],
    isOwnGrid: boolean,
    playerColor: string,
    playerNumber: 1 | 2
  ) => {
    const shipCoords = new Set(
      playerShips.flatMap((ship) =>
        ship.coordinates.map(coordinateToString)
      )
    );

    const hitCoords = new Map<string, { hit: boolean; sunk: boolean }>();
    for (const ship of playerShips) {
      const isSunk = ship.hits.every((h) => h);
      for (let i = 0; i < ship.coordinates.length; i++) {
        if (ship.hits[i]) {
          hitCoords.set(coordinateToString(ship.coordinates[i]), {
            hit: true,
            sunk: isSunk,
          });
        }
      }
    }

    const shotCoords = new Map<string, "hit" | "miss" | "sunk">();
    for (const turn of playerTurns) {
      shotCoords.set(coordinateToString(turn.coordinate), turn.result);
    }

    // Check if this coordinate is part of the last placed ship
    const isLastShipCoord = (coord: string): boolean => {
      if (!lastShipPlaced || lastShipPlaced.player !== playerNumber) {
        return false;
      }
      return lastShipPlaced.ship.coordinates.some(
        (c) => coordinateToString(c) === coord
      );
    };

    // Check if this coordinate is the last shot (for attack grids)
    const isLastShotCoord = (coord: string): boolean => {
      if (!lastShot || isOwnGrid) return false;
      // For attack grids, check if this was the last shot by the OTHER player
      const attackingPlayer = playerNumber === 1 ? 2 : 1;
      if (lastShot.player !== attackingPlayer) return false;
      return coordinateToString(lastShot.coordinate) === coord;
    };

    return (
      <div className="inline-block">
        <div className="grid grid-cols-6 gap-0.5">
          {/* Header row */}
          <div className="w-10 h-10"></div>
          {COLS.map((col) => (
            <div
              key={col}
              className="w-10 h-10 flex items-center justify-center text-sm font-medium text-gray-400"
            >
              {col}
            </div>
          ))}

          {/* Grid rows */}
          {ROWS.map((row) => (
            <Fragment key={`row-${row}`}>
              <div
                className="w-10 h-10 flex items-center justify-center text-sm font-medium text-gray-400"
              >
                {row}
              </div>
              {COLS.map((col) => {
                const coord = coordinateToString({ row, col });
                const hasShip = shipCoords.has(coord);
                const hitInfo = hitCoords.get(coord);
                const shotResult = shotCoords.get(coord);
                const isRecentShip = isLastShipCoord(coord);
                const isRecentShot = isLastShotCoord(coord);

                let bgColor = "bg-blue-950/30";
                let content = null;
                let ringClass = "";

                if (isOwnGrid) {
                  // Own grid: show ships and hits
                  if (hasShip && hitInfo) {
                    bgColor = hitInfo.sunk
                      ? "bg-red-900"
                      : "bg-orange-700";
                    content = (
                      <div className="text-white text-base font-bold">
                        {hitInfo.sunk ? "💀" : "💥"}
                      </div>
                    );
                  } else if (hasShip) {
                    bgColor = `bg-${playerColor}-700/50`;
                    content = (
                      <div className={`text-${playerColor}-300 text-base`}>
                        🚢
                      </div>
                    );
                    // Highlight recently placed ship
                    if (isRecentShip) {
                      ringClass = `ring-2 ring-yellow-400 animate-pulse`;
                    }
                  }
                } else {
                  // Opponent's grid: show shots
                  if (shotResult === "hit") {
                    bgColor = "bg-orange-700";
                    content = (
                      <div className="text-white text-base font-bold">
                        💥
                      </div>
                    );
                  } else if (shotResult === "sunk") {
                    bgColor = "bg-red-900";
                    content = (
                      <div className="text-white text-base font-bold">
                        💀
                      </div>
                    );
                  } else if (shotResult === "miss") {
                    bgColor = "bg-gray-700";
                    content = (
                      <div className="text-gray-400 text-sm">○</div>
                    );
                  }
                  
                  // Highlight recently shot coordinate
                  if (isRecentShot) {
                    ringClass = `ring-2 ring-yellow-400 animate-pulse`;
                  }
                }

                return (
                  <div
                    key={`${row}${col}`}
                    className={`w-10 h-10 border border-gray-700 ${bgColor} ${ringClass} flex items-center justify-center transition-all relative`}
                  >
                    {content}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[#111111] rounded-lg p-6 border border-gray-800/50 mb-8">
        <h2 className="text-base font-semibold text-white mb-3">
          Game Rules
        </h2>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• 5x5 grid with rows A-E and columns 1-5</li>
          <li>• Each player places 4 ships:</li>
          <li className="ml-6">- 1 ship of length 4 (Battleship)</li>
          <li className="ml-6">- 1 ship of length 3 (Cruiser)</li>
          <li className="ml-6">- 2 ships of length 2 (Destroyers)</li>
          <li>• Players alternate taking shots at coordinates</li>
          <li>• First to sink all opponent ships wins!</li>
        </ul>
      </div>

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
            placeholder="Example: Place ships in corners and edges. Target center grid first, then spread out systematically."
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
            placeholder="Example: Cluster ships together for defense. Hunt mode: shoot in checkerboard pattern, then target adjacent cells on hits."
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

  const renderPlacing = () => {
    if (!result) {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-12">
              <div className="text-6xl mb-6 animate-pulse">🚢</div>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Placing Ships
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Both players are strategically positioning their fleets...
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

    // Show grids with ship placement in progress
    const { player1, player2 } = result;

    return (
      <div className="max-w-7xl mx-auto">
        {/* Placement Status */}
        {lastShipPlaced && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-8 text-center animate-pulse">
            <h3 className="text-yellow-400 font-semibold">
              🚢 Player {lastShipPlaced.player} placing ship of length{" "}
              {lastShipPlaced.ship.length}
            </h3>
            <p className="text-yellow-300 text-sm mt-1">
              Coordinates: {lastShipPlaced.ship.coordinates.map(coordinateToString).join(", ")}
            </p>
          </div>
        )}

        {/* Grids showing ships being placed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1's Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 1 Placing Ships
            </h3>
            <div className="flex justify-center">
              {renderGrid(player1.ships, [], true, "blue", 1)}
            </div>
          </div>

          {/* Player 2's Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 2 Placing Ships
            </h3>
            <div className="flex justify-center">
              {renderGrid(player2.ships, [], true, "red", 2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlaying = () => {
    if (!result) return renderPlacing();

    const { player1, player2 } = result;

    return (
      <div className="max-w-7xl mx-auto">
        {/* Current Shot Indicator */}
        {lastShot && (
          <div className={`border rounded-lg p-4 mb-8 text-center animate-pulse ${
            lastShot.player === 1
              ? "bg-blue-900/20 border-blue-500/30"
              : "bg-red-900/20 border-red-500/30"
          }`}>
            <h3 className={`font-semibold ${
              lastShot.player === 1 ? "text-blue-400" : "text-red-400"
            }`}>
              💥 Player {lastShot.player} fires at {coordinateToString(lastShot.coordinate)}!
            </h3>
            <p className={`text-sm mt-1 ${
              lastShot.player === 1 ? "text-blue-300" : "text-red-300"
            }`}>
              Round {currentRound}
            </p>
          </div>
        )}

        {/* Score Display */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">
                Player 1
              </div>
              <div className="text-3xl font-mono font-bold text-blue-400">
                {player1.shipsRemaining}
              </div>
              <div className="text-xs text-gray-500 mt-1">ships remaining</div>
              <div className="text-sm text-gray-400 mt-2">
                {player1.shotsHit} hits / {player1.shotsMissed} misses
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="text-2xl text-gray-500">Round {currentRound}</div>
            </div>

            <div>
              <div className="text-xs text-red-400 uppercase tracking-wider mb-2">
                Player 2
              </div>
              <div className="text-3xl font-mono font-bold text-red-400">
                {player2.shipsRemaining}
              </div>
              <div className="text-xs text-gray-500 mt-1">ships remaining</div>
              <div className="text-sm text-gray-400 mt-2">
                {player2.shotsHit} hits / {player2.shotsMissed} misses
              </div>
            </div>
          </div>
        </div>

        {/* Attack Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Player 1's Attacks */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 1&apos;s Attacks on Player 2
            </h3>
            <div className="flex justify-center">
              {renderGrid(player2.ships, player1.turns, false, "blue", 2)}
            </div>
          </div>

          {/* Player 2's Attacks */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 2&apos;s Attacks on Player 1
            </h3>
            <div className="flex justify-center">
              {renderGrid(player1.ships, player2.turns, false, "red", 1)}
            </div>
          </div>
        </div>

        {/* Fleet Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Player 1's Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 1&apos;s Fleet
            </h3>
            <div className="flex justify-center">
              {renderGrid(player1.ships, [], true, "blue", 1)}
            </div>
            <div className="mt-4 text-center text-xs text-gray-500">
              Ships: {player1.shipsRemaining} / {player1.ships.length}
            </div>
          </div>

          {/* Player 2's Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 2&apos;s Fleet
            </h3>
            <div className="flex justify-center">
              {renderGrid(player2.ships, [], true, "red", 2)}
            </div>
            <div className="mt-4 text-center text-xs text-gray-500">
              Ships: {player2.shipsRemaining} / {player2.ships.length}
            </div>
          </div>
        </div>

        {/* Shot Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Shot Log */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-blue-400">
                Player 1 Shot Log
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto p-6">
              <div className="space-y-2">
                {player1.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first shot...
                  </div>
                ) : (
                  player1.turns
                    .slice(-5)
                    .reverse()
                    .map((turn, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border-l-4 border-l-blue-500 border-r border-t border-b border-gray-800 rounded p-3 text-sm animate-fadeIn"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                              P1
                            </span>
                            <span className="text-white font-mono font-bold text-base">
                              {coordinateToString(turn.coordinate)}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xs ${
                              turn.result === "sunk"
                                ? "text-red-400"
                                : turn.result === "hit"
                                ? "text-orange-400"
                                : "text-gray-400"
                            }`}
                          >
                            {turn.result === "sunk"
                              ? `SUNK (${turn.sunkShipLength})`
                              : turn.result.toUpperCase()}
                          </span>
                        </div>
                        {turn.reasoning && (
                          <div className="mt-2 p-2 bg-blue-900/20 rounded border-l-2 border-blue-400">
                            <div className="text-xs font-semibold text-blue-300 mb-1">
                              Reasoning:
                            </div>
                            <div className="text-xs text-gray-300 leading-relaxed">
                              {turn.reasoning}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Player 2 Shot Log */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-red-400">
                Player 2 Shot Log
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto p-6">
              <div className="space-y-2">
                {player2.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first shot...
                  </div>
                ) : (
                  player2.turns
                    .slice(-5)
                    .reverse()
                    .map((turn, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border-l-4 border-l-red-500 border-r border-t border-b border-gray-800 rounded p-3 text-sm animate-fadeIn"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold">
                              P2
                            </span>
                            <span className="text-white font-mono font-bold text-base">
                              {coordinateToString(turn.coordinate)}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xs ${
                              turn.result === "sunk"
                                ? "text-red-400"
                                : turn.result === "hit"
                                ? "text-orange-400"
                                : "text-gray-400"
                            }`}
                          >
                            {turn.result === "sunk"
                              ? `SUNK (${turn.sunkShipLength})`
                              : turn.result.toUpperCase()}
                          </span>
                        </div>
                        {turn.reasoning && (
                          <div className="mt-2 p-2 bg-red-900/20 rounded border-l-2 border-red-400">
                            <div className="text-xs font-semibold text-red-300 mb-1">
                              Reasoning:
                            </div>
                            <div className="text-xs text-gray-300 leading-relaxed">
                              {turn.reasoning}
                            </div>
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

    const { player1, player2, winner, winnerReason } = result;

    return (
      <div className="max-w-7xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8 mb-8">
          <div className="text-center mb-6">
            <div
              className={`text-3xl font-semibold mb-2 ${
                winner === "tie"
                  ? "text-yellow-400"
                  : winner === 1
                  ? "text-blue-400"
                  : "text-red-400"
              }`}
            >
              {winner === "tie" ? "It's a Tie" : `Player ${winner} Wins! 🎉`}
            </div>
            <div className="text-sm text-gray-400 mt-2">{winnerReason}</div>
          </div>

          {/* Final Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-6">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-blue-400 mb-1">
                {player1.turns.length}
              </div>
              <div className="text-xs text-gray-500">P1 Total Shots</div>
              <div className="text-xs text-gray-400 mt-1">
                {player1.shotsHit} hits / {player1.shotsMissed} misses
              </div>
            </div>
            <div className="text-center flex items-center justify-center">
              <div className="text-4xl">
                {winner === 1 ? "👈" : winner === 2 ? "👉" : "🤝"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-red-400 mb-1">
                {player2.turns.length}
              </div>
              <div className="text-xs text-gray-500">P2 Total Shots</div>
              <div className="text-xs text-gray-400 mt-1">
                {player2.shotsHit} hits / {player2.shotsMissed} misses
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

        {/* Final Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Player 1's Final Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 1&apos;s Final Fleet
            </h3>
            <div className="flex justify-center">
              {renderGrid(player1.ships, [], true, "blue", 1)}
            </div>
          </div>

          {/* Player 2's Final Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 2&apos;s Final Fleet
            </h3>
            <div className="flex justify-center">
              {renderGrid(player2.ships, [], true, "red", 2)}
            </div>
          </div>
        </div>

        {/* Attack History Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Player 1's Final Attacks */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 1&apos;s Attack Pattern
            </h3>
            <div className="flex justify-center">
              {renderGrid(player2.ships, player1.turns, false, "blue", 2)}
            </div>
            <div className="mt-4 text-center text-xs text-gray-400">
              Accuracy: {player1.turns.length > 0 ? Math.round((player1.shotsHit / player1.turns.length) * 100) : 0}%
            </div>
          </div>

          {/* Player 2's Final Attacks */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-4 uppercase tracking-wider text-center">
              Player 2&apos;s Attack Pattern
            </h3>
            <div className="flex justify-center">
              {renderGrid(player1.ships, player2.turns, false, "red", 1)}
            </div>
            <div className="mt-4 text-center text-xs text-gray-400">
              Accuracy: {player2.turns.length > 0 ? Math.round((player2.shotsHit / player2.turns.length) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Strategies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Player 1 Strategy
            </h3>
            <div className="text-gray-400 text-sm leading-relaxed">
              {result.player1Policy}
            </div>
          </div>

          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Player 2 Strategy
            </h3>
            <div className="text-gray-400 text-sm leading-relaxed">
              {result.player2Policy}
            </div>
          </div>
        </div>

        {/* Player Shot Logs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Shot Log */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-blue-400">
                Player 1 Shot Log
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-2">
                {player1.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No shots fired
                  </div>
                ) : (
                  player1.turns
                    .map((turn, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border-l-4 border-l-blue-500 border-r border-t border-b border-gray-800 rounded p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                              P1
                            </span>
                            <span className="text-white font-mono font-bold text-base">
                              {coordinateToString(turn.coordinate)}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xs ${
                              turn.result === "sunk"
                                ? "text-red-400"
                                : turn.result === "hit"
                                ? "text-orange-400"
                                : "text-gray-400"
                            }`}
                          >
                            {turn.result === "sunk"
                              ? `SUNK (${turn.sunkShipLength})`
                              : turn.result.toUpperCase()}
                          </span>
                        </div>
                        {turn.reasoning && (
                          <div className="mt-2 p-2 bg-blue-900/20 rounded border-l-2 border-blue-400">
                            <div className="text-xs font-semibold text-blue-300 mb-1">
                              Reasoning:
                            </div>
                            <div className="text-xs text-gray-300 leading-relaxed">
                              {turn.reasoning}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Player 2 Shot Log */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-red-400">
                Player 2 Shot Log
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-2">
                {player2.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No shots fired
                  </div>
                ) : (
                  player2.turns
                    .map((turn, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border-l-4 border-l-red-500 border-r border-t border-b border-gray-800 rounded p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-bold">
                              P2
                            </span>
                            <span className="text-white font-mono font-bold text-base">
                              {coordinateToString(turn.coordinate)}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xs ${
                              turn.result === "sunk"
                                ? "text-red-400"
                                : turn.result === "hit"
                                ? "text-orange-400"
                                : "text-gray-400"
                            }`}
                          >
                            {turn.result === "sunk"
                              ? `SUNK (${turn.sunkShipLength})`
                              : turn.result.toUpperCase()}
                          </span>
                        </div>
                        {turn.reasoning && (
                          <div className="mt-2 p-2 bg-red-900/20 rounded border-l-2 border-red-400">
                            <div className="text-xs font-semibold text-red-300 mb-1">
                              Reasoning:
                            </div>
                            <div className="text-xs text-gray-300 leading-relaxed">
                              {turn.reasoning}
                            </div>
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
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Games
                </Link>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
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
            Battleship Battle
          </h1>
          <p className="text-gray-400">
            Sink your opponent&apos;s fleet before they sink yours!
          </p>
        </div>

        {phase === "setup" && renderSetup()}
        {phase === "placing" && renderPlacing()}
        {phase === "playing" && renderPlaying()}
        {phase === "finished" && renderFinished()}
      </div>
    </div>
  );
}

