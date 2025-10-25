import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Chess } from "chess.js";

const openai = new OpenAI({
  apiKey:
    "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",
});

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
  try {
    const { whitePrompt, blackPrompt } = await request.json();

    if (!whitePrompt || !blackPrompt) {
      return NextResponse.json(
        { error: "Both player prompts are required" },
        { status: 400 }
      );
    }

    const chess = new Chess();
    const moves: MoveResult[] = [];
    let moveNumber = 1;
    const MAX_MOVES = 100; // Prevent infinite games

    console.log("Starting chess game...");

    // Play until game is over or max moves reached
    while (!chess.isGameOver() && moves.length < MAX_MOVES) {
      const currentPlayer = chess.turn() === "w" ? "white" : "black";
      const currentPrompt = currentPlayer === "white" ? whitePrompt : blackPrompt;

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
          moves.push({
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
          });

          console.log(
            `${currentPlayer} played ${result.san}${chess.isCheck() ? " (Check!)" : ""}`
          );
          console.log(`Reasoning: ${reasoning}`);
        }
      } catch (error) {
        console.error(`Error making move ${move}:`, error);
        // Try a random legal move instead
        const legalMoves = chess.moves({ verbose: true });
        if (legalMoves.length > 0) {
          const randomMove =
            legalMoves[Math.floor(Math.random() * legalMoves.length)];
          const result = chess.move(randomMove);
          moves.push({
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
          });
        }
      }
    }

    // Determine winner and reason
    let winner: "white" | "black" | "draw";
    let gameEndReason: string;

    if (chess.isCheckmate()) {
      winner = chess.turn() === "w" ? "black" : "white";
      gameEndReason = `Checkmate! ${winner === "white" ? "White" : "Black"} wins!`;
    } else if (chess.isStalemate()) {
      winner = "draw";
      gameEndReason = "Stalemate - Draw!";
    } else if (chess.isThreefoldRepetition()) {
      winner = "draw";
      gameEndReason = "Draw by threefold repetition";
    } else if (chess.isInsufficientMaterial()) {
      winner = "draw";
      gameEndReason = "Draw by insufficient material";
    } else if (chess.isDraw()) {
      winner = "draw";
      gameEndReason = "Draw by 50-move rule";
    } else if (moves.length >= MAX_MOVES) {
      winner = "draw";
      gameEndReason = `Draw - Maximum moves (${MAX_MOVES}) reached`;
    } else {
      winner = "draw";
      gameEndReason = "Game ended";
    }

    console.log(`Game over! ${gameEndReason}`);
    console.log(`Total moves: ${moves.length}`);

    return NextResponse.json({
      moves,
      winner,
      gameEndReason,
      whitePrompt,
      blackPrompt,
      pgn: chess.pgn(),
    });
  } catch (error) {
    console.error("Error in play-chess API:", error);
    return NextResponse.json({ error: "Failed to play chess game" }, { status: 500 });
  }
}

