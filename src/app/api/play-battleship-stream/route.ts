import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    "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",
});

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

const ROWS = ["A", "B", "C", "D", "E"];
const COLS = [1, 2, 3, 4, 5];

// Ship configuration: [length, count]
const SHIP_CONFIG = [
  { length: 4, count: 1 },
  { length: 3, count: 1 },
  { length: 2, count: 2 },
];

function coordinateToString(coord: Coordinate): string {
  return `${coord.row}${coord.col}`;
}

function parseCoordinate(str: string): Coordinate | null {
  const match = str.match(/^([A-E])(\d{1})$/i);
  if (!match) return null;
  const row = match[1].toUpperCase();
  const col = parseInt(match[2]);
  if (!ROWS.includes(row) || col < 1 || col > 5) return null;
  return { row, col };
}

function areCoordinatesEqual(c1: Coordinate, c2: Coordinate): boolean {
  return c1.row === c2.row && c1.col === c2.col;
}

function isValidShipPlacement(
  ship: Coordinate[],
  existingShips: Ship[]
): boolean {
  // Check all coordinates are on the board
  for (const coord of ship) {
    if (!ROWS.includes(coord.row) || coord.col < 1 || coord.col > 10) {
      return false;
    }
  }

  // Check ship is in a straight line
  const isHorizontal = ship.every((c) => c.row === ship[0].row);
  const isVertical = ship.every((c) => c.col === ship[0].col);
  if (!isHorizontal && !isVertical) return false;

  // Check ship is continuous
  if (isHorizontal) {
    const cols = ship.map((c) => c.col).sort((a, b) => a - b);
    for (let i = 1; i < cols.length; i++) {
      if (cols[i] !== cols[i - 1] + 1) return false;
    }
  } else {
    const rows = ship
      .map((c) => ROWS.indexOf(c.row))
      .sort((a, b) => a - b);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] !== rows[i - 1] + 1) return false;
    }
  }

  // Check no overlap with existing ships
  for (const existingShip of existingShips) {
    for (const coord of ship) {
      for (const existingCoord of existingShip.coordinates) {
        if (areCoordinatesEqual(coord, existingCoord)) {
          return false;
        }
      }
    }
  }

  return true;
}

async function placeShipsWithLLM(
  playerId: 1 | 2,
  policy: string
): Promise<Ship[]> {
  const ships: Ship[] = [];

  for (const { length, count } of SHIP_CONFIG) {
    for (let i = 0; i < count; i++) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!placed && attempts < maxAttempts) {
        attempts++;

        const existingShipsStr = ships
          .map(
            (s, idx) =>
              `Ship ${idx + 1} (length ${s.length}): ${s.coordinates
                .map(coordinateToString)
                .join(", ")}`
          )
          .join("\n");

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are Player ${playerId} placing ships on a Battleship board.
                
Your strategy: ${policy}

BOARD:
- Rows: A-E (5 rows)
- Columns: 1-5 (5 columns)
- Example coordinates: A1, B3, E5

RULES FOR SHIP PLACEMENT:
- Ships must be placed horizontally or vertically (not diagonal)
- Ships cannot overlap with each other
- All coordinates must be on the board (A-E, 1-5)

SHIPS ALREADY PLACED:
${existingShipsStr || "None yet"}

NOW: Place a ship of length ${length}.
Provide ${length} consecutive coordinates (horizontal or vertical).`,
              },
              {
                role: "user",
                content: `Place a ship of length ${length}.

Based on your strategy, provide exactly ${length} coordinates for this ship.

Format your response as:
COORDINATES: [A1, A2, A3] (example for length 3, horizontal)
or
COORDINATES: [C5, D5, E5] (example for length 3, vertical)
REASONING: [brief explanation based on your strategy]`,
              },
            ],
            temperature: 0.7,
            max_tokens: 200,
          });

          const content = response.choices[0]?.message?.content || "";
          const coordMatch = content.match(
            /COORDINATES:\s*\[([^\]]+)\]/i
          );

          if (coordMatch) {
            const coordStrings = coordMatch[1]
              .split(",")
              .map((s) => s.trim());
            const coordinates = coordStrings
              .map(parseCoordinate)
              .filter((c): c is Coordinate => c !== null);

            if (
              coordinates.length === length &&
              isValidShipPlacement(coordinates, ships)
            ) {
              ships.push({
                length,
                coordinates,
                hits: new Array(length).fill(false),
              });
              placed = true;
              console.log(
                `[Player ${playerId}] Placed ship of length ${length} at: ${coordinates
                  .map(coordinateToString)
                  .join(", ")}`
              );
            }
          }
        } catch (error) {
          console.error(
            `Error placing ship for Player ${playerId}:`,
            error
          );
        }
      }

      // Fallback: random placement if LLM fails
      if (!placed) {
        console.log(
          `[Player ${playerId}] Fallback: randomly placing ship of length ${length}`
        );
        let randomPlaced = false;
        let randomAttempts = 0;

        while (!randomPlaced && randomAttempts < 100) {
          randomAttempts++;
          const isHorizontal = Math.random() > 0.5;
          const coordinates: Coordinate[] = [];

          if (isHorizontal) {
            const row = ROWS[Math.floor(Math.random() * ROWS.length)];
            const startCol = Math.floor(Math.random() * (6 - length)) + 1;
            for (let c = startCol; c < startCol + length; c++) {
              coordinates.push({ row, col: c });
            }
          } else {
            const startRow = Math.floor(Math.random() * (6 - length));
            const col = COLS[Math.floor(Math.random() * COLS.length)];
            for (let r = startRow; r < startRow + length; r++) {
              coordinates.push({ row: ROWS[r], col });
            }
          }

          if (isValidShipPlacement(coordinates, ships)) {
            ships.push({
              length,
              coordinates,
              hits: new Array(length).fill(false),
            });
            randomPlaced = true;
            console.log(
              `[Player ${playerId}] Random placed ship of length ${length} at: ${coordinates
                .map(coordinateToString)
                .join(", ")}`
            );
          }
        }
      }
    }
  }

  return ships;
}

async function getNextShot(
  playerId: 1 | 2,
  policy: string,
  turns: Turn[],
  opponentShipsRemaining: number,
  ownShips: Ship[],
  opponentTurns: Turn[]
): Promise<{ coordinate: Coordinate; reasoning: string }> {
  const previousShots = turns.map((t) => coordinateToString(t.coordinate));
  const hits = turns
    .filter((t) => t.result === "hit" || t.result === "sunk")
    .map((t) => coordinateToString(t.coordinate));
  const misses = turns
    .filter((t) => t.result === "miss")
    .map((t) => coordinateToString(t.coordinate));
  
  // Sunk ships info
  const sunkShips = turns.filter((t) => t.result === "sunk");
  const sunkShipsInfo = sunkShips.length > 0 
    ? sunkShips.map((t) => `Length ${t.sunkShipLength} at ${coordinateToString(t.coordinate)}`).join(", ")
    : "none yet";

  // Defensive information
  const opponentShots = opponentTurns.map((t) => coordinateToString(t.coordinate));
  const opponentHits = opponentTurns
    .filter((t) => t.result === "hit" || t.result === "sunk")
    .map((t) => coordinateToString(t.coordinate));
  const opponentMisses = opponentTurns
    .filter((t) => t.result === "miss")
    .map((t) => coordinateToString(t.coordinate));

  // Own fleet status
  const fleetStatus = ownShips
    .map((ship, idx) => {
      const hitCount = ship.hits.filter((h) => h).length;
      const isSunk = ship.hits.every((h) => h);
      const status = isSunk ? "SUNK" : hitCount > 0 ? `${hitCount}/${ship.length} hit` : "Intact";
      return `Ship ${idx + 1} (length ${ship.length}): ${status}`;
    })
    .join("\n  ");

  const ownShipsRemaining = ownShips.filter((s) => s.hits.some((h) => !h)).length;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Player ${playerId} playing Battleship.

Your strategy: ${policy}

=== OFFENSIVE STATUS (Your Attacks) ===
- Opponent has ${opponentShipsRemaining} ships remaining
- You have fired ${previousShots.length} shots so far
- Your Hits: ${hits.length > 0 ? hits.join(", ") : "none yet"}
- Your Misses: ${misses.length > 0 ? misses.join(", ") : "none yet"}
- Enemy Ships Sunk: ${sunkShipsInfo}

=== DEFENSIVE STATUS (Opponent's Attacks on You) ===
- Opponent has shot at ${opponentShots.length} coordinates
- Opponent Hits on you: ${opponentHits.length > 0 ? opponentHits.join(", ") : "none yet"}
- Opponent Misses: ${opponentMisses.length > 0 ? opponentMisses.join(", ") : "none yet"}
- Your ships remaining: ${ownShipsRemaining} / ${ownShips.length}

=== YOUR FLEET STATUS ===
  ${fleetStatus}

BOARD:
- Rows: A-E (5 rows)  
- Columns: 1-5 (5 columns)

RULES:
- You CANNOT shoot at a coordinate you've already shot at
- Already shot: ${previousShots.join(", ")}
- Choose a coordinate you haven't shot yet
- Use both offensive AND defensive information to make strategic decisions`,
        },
        {
          role: "user",
          content: `Based on your strategy and game state, where should you shoot next?

You have already shot at: ${previousShots.join(", ")}

Choose a NEW coordinate to target.

Format:
COORDINATE: [e.g., A1, B5, J10]
REASONING: [brief explanation based on your strategy and previous results]`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content || "";
    const coordMatch = content.match(/COORDINATE:\s*([A-J]\d{1,2})/i);
    const reasoningMatch = content.match(/REASONING:\s*(.+)/i);

    if (coordMatch) {
      const coord = parseCoordinate(coordMatch[1]);
      if (
        coord &&
        !previousShots.includes(coordinateToString(coord))
      ) {
        return {
          coordinate: coord,
          reasoning: reasoningMatch ? reasoningMatch[1].trim() : "",
        };
      }
    }
  } catch (error) {
    console.error(`Error getting shot for Player ${playerId}:`, error);
  }

  // Fallback: random valid shot
  const availableCoords: Coordinate[] = [];
  for (const row of ROWS) {
    for (const col of COLS) {
      const coord = { row, col };
      if (!previousShots.includes(coordinateToString(coord))) {
        availableCoords.push(coord);
      }
    }
  }

  if (availableCoords.length > 0) {
    const coord =
      availableCoords[Math.floor(Math.random() * availableCoords.length)];
    console.log(`[Player ${playerId}] Fallback: random shot at ${coordinateToString(coord)}`);
    return {
      coordinate: coord,
      reasoning: "Random shot",
    };
  }

  // Should never reach here, but return a default
  return { coordinate: { row: "A", col: 1 }, reasoning: "Default" };
}

function processShot(
  coordinate: Coordinate,
  opponentShips: Ship[]
): { result: "hit" | "miss" | "sunk"; sunkShipLength?: number } {
  for (const ship of opponentShips) {
    for (let i = 0; i < ship.coordinates.length; i++) {
      if (areCoordinatesEqual(ship.coordinates[i], coordinate)) {
        ship.hits[i] = true;
        const isSunk = ship.hits.every((h) => h);
        if (isSunk) {
          return { result: "sunk", sunkShipLength: ship.length };
        }
        return { result: "hit" };
      }
    }
  }
  return { result: "miss" };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { player1Policy, player2Policy } = await request.json();

        if (!player1Policy || !player2Policy) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: "player1Policy and player2Policy are required",
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        console.log(`Starting Battleship game`);

        // Send start event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              player1Policy,
              player2Policy,
            })}\n\n`
          )
        );

        // Place ships for both players
        console.log(`Player 1 placing ships...`);
        const player1Ships = await placeShipsWithLLM(1, player1Policy);
        console.log(`Player 2 placing ships...`);
        const player2Ships = await placeShipsWithLLM(2, player2Policy);

        // Send ship placement event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "ships_placed",
              player1Ships,
              player2Ships,
            })}\n\n`
          )
        );

        const player1Turns: Turn[] = [];
        const player2Turns: Turn[] = [];

        let result1: PlayerResult = {
          player: 1,
          ships: player1Ships,
          turns: [],
          shotsHit: 0,
          shotsMissed: 0,
          shipsRemaining: player1Ships.length,
        };

        let result2: PlayerResult = {
          player: 2,
          ships: player2Ships,
          turns: [],
          shotsHit: 0,
          shotsMissed: 0,
          shipsRemaining: player2Ships.length,
        };

        const maxTurns = 100;
        let gameOver = false;
        let winner: 1 | 2 | "tie" = "tie";
        let winnerReason = "";

        // Game loop
        for (let round = 1; round <= maxTurns && !gameOver; round++) {
          // Player 1's turn
          const player2ShipsRemaining = player2Ships.filter((s) =>
            s.hits.some((h) => !h)
          ).length;

          const { coordinate: p1Coord, reasoning: p1Reasoning } =
            await getNextShot(
              1,
              player1Policy,
              player1Turns,
              player2ShipsRemaining,
              player1Ships,
              player2Turns
            );

          const p1Result = processShot(p1Coord, player2Ships);
          const p1Turn: Turn = {
            coordinate: p1Coord,
            result: p1Result.result,
            sunkShipLength: p1Result.sunkShipLength,
            reasoning: p1Reasoning,
          };
          player1Turns.push(p1Turn);

          result1 = {
            player: 1,
            ships: player1Ships,
            turns: player1Turns,
            shotsHit: player1Turns.filter(
              (t) => t.result === "hit" || t.result === "sunk"
            ).length,
            shotsMissed: player1Turns.filter((t) => t.result === "miss")
              .length,
            shipsRemaining: player1Ships.filter((s) =>
              s.hits.some((h) => !h)
            ).length,
          };

          // Stream Player 1's turn
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "turn",
                player: 1,
                turn: p1Turn,
                roundNumber: round,
              })}\n\n`
            )
          );

          // Check if Player 1 won
          const player2ShipsLeft = player2Ships.filter((s) =>
            s.hits.some((h) => !h)
          ).length;
          if (player2ShipsLeft === 0) {
            winner = 1;
            winnerReason = `Player 1 sunk all ships in ${player1Turns.length} shots`;
            gameOver = true;
            result2.shipsRemaining = 0;
            break;
          }

          // Player 2's turn
          const player1ShipsRemaining = player1Ships.filter((s) =>
            s.hits.some((h) => !h)
          ).length;

          const { coordinate: p2Coord, reasoning: p2Reasoning } =
            await getNextShot(
              2,
              player2Policy,
              player2Turns,
              player1ShipsRemaining,
              player2Ships,
              player1Turns
            );

          const p2Result = processShot(p2Coord, player1Ships);
          const p2Turn: Turn = {
            coordinate: p2Coord,
            result: p2Result.result,
            sunkShipLength: p2Result.sunkShipLength,
            reasoning: p2Reasoning,
          };
          player2Turns.push(p2Turn);

          result2 = {
            player: 2,
            ships: player2Ships,
            turns: player2Turns,
            shotsHit: player2Turns.filter(
              (t) => t.result === "hit" || t.result === "sunk"
            ).length,
            shotsMissed: player2Turns.filter((t) => t.result === "miss")
              .length,
            shipsRemaining: player2Ships.filter((s) =>
              s.hits.some((h) => !h)
            ).length,
          };

          // Stream Player 2's turn
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "turn",
                player: 2,
                turn: p2Turn,
                roundNumber: round,
              })}\n\n`
            )
          );

          // Check if Player 2 won
          const player1ShipsLeft = player1Ships.filter((s) =>
            s.hits.some((h) => !h)
          ).length;
          if (player1ShipsLeft === 0) {
            winner = 2;
            winnerReason = `Player 2 sunk all ships in ${player2Turns.length} shots`;
            gameOver = true;
            result1.shipsRemaining = 0;
            break;
          }
        }

        if (!gameOver) {
          winner = "tie";
          winnerReason = `Game reached maximum turns (${maxTurns})`;
        }

        // Send end event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "end",
              winner,
              winnerReason,
              player1: result1,
              player2: result2,
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error("Error in play-battleship-stream API:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: "Failed to play game",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

