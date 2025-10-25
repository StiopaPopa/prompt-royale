import { NextRequest } from "next/server";
import OpenAI from "openai";
import { Chess } from "chess.js";

const openai = new OpenAI({
  apiKey:
    "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",
});

// Material and positional evaluation function
// This is a simplified evaluation that considers:
// 1. Material count (pieces)
// 2. Piece positioning (center control, development)
// 3. King safety
function evaluatePosition(chess: Chess): number {
  const board = chess.board();
  
  const pieceValues: Record<string, number> = {
    p: 100,  // Pawn
    n: 320,  // Knight
    b: 330,  // Bishop
    r: 500,  // Rook
    q: 900,  // Queen
    k: 20000 // King
  };

  // Positional bonuses for piece placement
  const pawnTable = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
  ];

  const knightTable = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];

  const bishopTable = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];

  const rookTable = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
  ];

  const queenTable = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  const kingMiddleGameTable = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
  ];

  const tables: Record<string, number[]> = {
    p: pawnTable,
    n: knightTable,
    b: bishopTable,
    r: rookTable,
    q: queenTable,
    k: kingMiddleGameTable
  };

  let evaluation = 0;

  // Evaluate each piece
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const pieceType = piece.type;
        const isWhite = piece.color === 'w';
        const pieceValue = pieceValues[pieceType];
        
        // Get positional bonus
        const tableIndex = isWhite ? (7 - row) * 8 + col : row * 8 + col;
        const positionBonus = tables[pieceType]?.[tableIndex] || 0;
        
        const totalValue = pieceValue + positionBonus;
        evaluation += isWhite ? totalValue : -totalValue;
      }
    }
  }

  // Bonus for having the move (tempo)
  evaluation += chess.turn() === 'w' ? 10 : -10;

  // Bonus for castling rights
  if (chess.getCastlingRights('w').length > 0) evaluation += 20;
  if (chess.getCastlingRights('b').length > 0) evaluation -= 20;

  // Penalty for being in check
  if (chess.isCheck()) {
    evaluation += chess.turn() === 'w' ? -30 : 30;
  }

  // Bonus for mobility (number of legal moves)
  const mobility = chess.moves().length;
  evaluation += chess.turn() === 'w' ? mobility * 5 : -mobility * 5;

  return evaluation;
}

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

// Get a chess move from the LLM
async function getChessMove(
  prompt: string,
  chess: Chess,
  playerColor: "white" | "black",
  moveHistory: MoveResult[]
): Promise<{ move: string; reasoning: string }> {
  try {
    const legalMoves = chess.moves({ verbose: true });
    const legalMovesString = legalMoves
      .map((m) => `${m.from}${m.to}${m.promotion || ""}`)
      .join(", ");

    const recentMoves =
      moveHistory.length > 0
        ? moveHistory
            .slice(-6)
            .map(
              (m) =>
                `Move ${m.moveNumber}: ${m.player === "white" ? "White" : "Black"} played ${m.san}${m.isCheck ? " (Check!)" : ""}`
            )
            .join("\n")
        : "No previous moves - game just started";

    const systemMessage = `YOU MUST FOLLOW THIS CHESS STRATEGY: ${prompt}

You are playing as ${playerColor.toUpperCase()}.

Current board position (FEN): ${chess.fen()}

Recent moves:
${recentMoves}

Legal moves available (in UCI format like e2e4, g1f3): ${legalMovesString}

YOUR ONLY JOB: Follow the strategy above and choose the best move. You MUST respond with a legal move.`;

    const userMessage = `Based on your strategy, what is your next move?

Respond in this EXACT format:
MOVE: [your move in UCI format, e.g., e2e4 or g1f3]
REASONING: [Brief explanation of why this move follows your strategy]

Remember: You must choose from these legal moves: ${legalMovesString}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const responseText = response.choices[0]?.message?.content || "";

    // Parse the response
    const moveMatch = responseText.match(/MOVE:\s*([a-h][1-8][a-h][1-8][qrbn]?)/i);
    const reasoningMatch = responseText.match(/REASONING:\s*(.+)/is);

    let move = "";
    if (moveMatch) {
      move = moveMatch[1].toLowerCase();
    } else {
      // Try to find any UCI-like move in the response
      const uciPattern = /([a-h][1-8][a-h][1-8][qrbn]?)/gi;
      const matches = responseText.match(uciPattern);
      if (matches && matches.length > 0) {
        move = matches[0].toLowerCase();
      }
    }

    const reasoning = reasoningMatch
      ? reasoningMatch[1].trim().split("\n")[0].trim()
      : "Move selected based on strategy";

    // Validate the move
    const isValidMove = legalMoves.some((m) => {
      const uciMove = `${m.from}${m.to}${m.promotion || ""}`;
      return uciMove === move;
    });

    if (!isValidMove) {
      console.log(`Invalid move suggested: ${move}, picking random legal move`);
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      move = `${randomMove.from}${randomMove.to}${randomMove.promotion || ""}`;
      return {
        move,
        reasoning: `${reasoning} (Note: Original move was invalid, adjusted to legal move)`,
      };
    }

    return { move, reasoning };
  } catch (error) {
    console.error("Error getting chess move:", error);
    // Return random legal move as fallback
    const legalMoves = chess.moves({ verbose: true });
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return {
      move: `${randomMove.from}${randomMove.to}${randomMove.promotion || ""}`,
      reasoning: "Error occurred, playing random legal move",
    };
  }
}

export async function POST(request: NextRequest) {
  const { whitePrompt, blackPrompt } = await request.json();

  if (!whitePrompt || !blackPrompt) {
    return new Response(
      JSON.stringify({ error: "Both player prompts are required" }),
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chess = new Chess();
        const moves: MoveResult[] = [];
        const MOVES_PER_PLAYER = 30; // Each player makes exactly 30 moves
        const TOTAL_MOVES = MOVES_PER_PLAYER * 2; // 60 total moves

        console.log("Starting chess game with streaming...");
        console.log(`Game will run for ${MOVES_PER_PLAYER} moves per player (${TOTAL_MOVES} total moves)`);

        // Send initial game start event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "start", whitePrompt, blackPrompt, totalMoves: TOTAL_MOVES })}\n\n`
          )
        );

        // Play exactly TOTAL_MOVES moves (or until checkmate/stalemate)
        while (moves.length < TOTAL_MOVES && !chess.isCheckmate() && !chess.isStalemate()) {
          const currentPlayer = chess.turn() === "w" ? "white" : "black";
          const currentPrompt =
            currentPlayer === "white" ? whitePrompt : blackPrompt;

          console.log(
            `Move ${Math.floor(moves.length / 2) + 1} - ${currentPlayer}'s turn...`
          );

          const { move, reasoning } = await getChessMove(
            currentPrompt,
            chess,
            currentPlayer,
            moves
          );

          // Make the move
          try {
            const result = chess.move(move, { sloppy: true });
            if (result) {
              const moveResult: MoveResult = {
                moveNumber: Math.floor(moves.length / 2) + 1,
                player: currentPlayer,
                move: move,
                san: result.san,
                reasoning: reasoning,
                fen: chess.fen(),
                isCheck: chess.isCheck(),
                isCheckmate: chess.isCheckmate(),
                isStalemate: chess.isStalemate(),
                isDraw: chess.isDraw(),
              };

              moves.push(moveResult);

              // Stream the move to the client
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "move", move: moveResult })}\n\n`
                )
              );

              console.log(
                `${currentPlayer} played ${result.san}${chess.isCheck() ? " (Check!)" : ""}`
              );
            }
          } catch (error) {
            console.error(`Error making move ${move}:`, error);
            // Try a random legal move instead
            const legalMoves = chess.moves({ verbose: true });
            if (legalMoves.length > 0) {
              const randomMove =
                legalMoves[Math.floor(Math.random() * legalMoves.length)];
              const result = chess.move(randomMove);
              const moveResult: MoveResult = {
                moveNumber: Math.floor(moves.length / 2) + 1,
                player: currentPlayer,
                move: `${randomMove.from}${randomMove.to}${randomMove.promotion || ""}`,
                san: result.san,
                reasoning: "Error with original move, played random legal move",
                fen: chess.fen(),
                isCheck: chess.isCheck(),
                isCheckmate: chess.isCheckmate(),
                isStalemate: chess.isStalemate(),
                isDraw: chess.isDraw(),
              };

              moves.push(moveResult);

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "move", move: moveResult })}\n\n`
                )
              );
            }
          }
        }

        // Determine winner and reason
        let winner: "white" | "black" | "draw";
        let gameEndReason: string;
        let evaluation = 0;

        if (chess.isCheckmate()) {
          winner = chess.turn() === "w" ? "black" : "white";
          gameEndReason = `Checkmate! ${winner === "white" ? "White" : "Black"} wins!`;
          evaluation = winner === "white" ? 10000 : -10000;
        } else if (chess.isStalemate()) {
          winner = "draw";
          gameEndReason = "Stalemate - Draw!";
          evaluation = 0;
        } else {
          // Game reached move limit - evaluate position
          console.log("Game reached move limit, evaluating position...");
          
          // Send evaluation in progress message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "evaluating" })}\n\n`
            )
          );

          evaluation = evaluatePosition(chess);
          console.log(`Position evaluation: ${evaluation} centipawns`);

          // Determine winner based on evaluation
          // Evaluation is in centipawns (1/100th of a pawn)
          // Positive = White advantage, Negative = Black advantage
          const DRAW_THRESHOLD = 50; // Within 0.5 pawns is considered a draw

          if (Math.abs(evaluation) <= DRAW_THRESHOLD) {
            winner = "draw";
            gameEndReason = `Draw by evaluation! Position is equal (${(evaluation / 100).toFixed(2)} pawns)`;
          } else if (evaluation > 0) {
            winner = "white";
            gameEndReason = `White wins by evaluation! White is ahead by ${(evaluation / 100).toFixed(2)} pawns`;
          } else {
            winner = "black";
            gameEndReason = `Black wins by evaluation! Black is ahead by ${(Math.abs(evaluation) / 100).toFixed(2)} pawns`;
          }
        }

        // Send game end event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "end",
              winner,
              gameEndReason,
              pgn: chess.pgn(),
              totalMoves: moves.length,
              evaluation: evaluation,
              evaluationInPawns: (evaluation / 100).toFixed(2),
            })}\n\n`
          )
        );

        console.log(`Game over! ${gameEndReason}`);
        controller.close();
      } catch (error) {
        console.error("Error in chess stream:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: "Failed to play chess game" })}\n\n`
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

