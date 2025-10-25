import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    "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",
});

type Move = "rock" | "paper" | "scissors";

interface RoundResult {
  round: number;
  player1Move: Move;
  player2Move: Move;
  winner: "player1" | "player2" | "tie";
  player1Reasoning: string;
  player2Reasoning: string;
}

function determineWinner(
  move1: Move,
  move2: Move
): "player1" | "player2" | "tie" {
  if (move1 === move2) return "tie";
  if (
    (move1 === "rock" && move2 === "scissors") ||
    (move1 === "paper" && move2 === "rock") ||
    (move1 === "scissors" && move2 === "paper")
  ) {
    return "player1";
  }
  return "player2";
}

function parseMove(text: string): Move {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("rock")) return "rock";
  if (lowerText.includes("paper")) return "paper";
  if (lowerText.includes("scissors")) return "scissors";

  // Default to rock if no valid move is found
  return "rock";
}

// Get a single move with history context and reasoning
async function getMove(
  prompt: string,
  round: number,
  history: RoundResult[],
  playerNumber: 1 | 2
): Promise<{ move: Move; reasoning: string }> {
  try {
    const historyText =
      history.length > 0
        ? history
            .map((r) => {
              const myMove = playerNumber === 1 ? r.player1Move : r.player2Move;
              const opponentMove =
                playerNumber === 1 ? r.player2Move : r.player1Move;
              const result =
                r.winner === "tie"
                  ? "TIE"
                  : r.winner === `player${playerNumber}`
                  ? "WON"
                  : "LOST";
              return `Round ${r.round}: You played ${myMove}, opponent played ${opponentMove} → ${result}`;
            })
            .join("\n")
        : "No previous rounds";

    const systemMessage = `You are playing Rock Paper Scissors. Your strategy: ${prompt}

IMPORTANT: You are currently on ROUND ${round} of 10 total rounds.
- Round 1 = first move
- Round 2 = second move  
- Round 3 = third move
- etc.

Previous rounds:
${historyText}

When interpreting your strategy:
- "first X moves" means rounds 1 through X
- "second X moves" means rounds X+1 through 2X
- "last X moves" means rounds (10-X+1) through 10
- For fractions like "10/3", round to the nearest whole number (10/3 ≈ 3)
- Example: "first 10/3 moves rock" = first 3 moves rock (rounds 1, 2, 3)
- Example: "second 10/3 moves paper" = next 3 moves paper (rounds 4, 5, 6)
- Example: "last 10/3 moves scissors" = last 3 moves scissors (rounds 8, 9, 10)

For DYNAMIC strategies based on previous moves/outcomes:
- "if I won last round" = check if the previous round's winner was you
- "if I lost last round" = check if the previous round's winner was your opponent
- "if it was a tie" = check if the previous round's winner was "tie"
- "my last move" = the move you played in the most recent round
- "opponent's last move" = the move your opponent played in the most recent round
- "what would beat X" = the move that beats X (rock beats scissors, scissors beats paper, paper beats rock)
- "what would lose to X" = the move that loses to X (scissors loses to rock, paper loses to scissors, rock loses to paper)
- "same as last time" = repeat your previous move
- "opposite of last time" = play a different move than your previous move

GAME RULES REMINDER:
- Rock beats Scissors
- Scissors beats Paper  
- Paper beats Rock
- Same moves = Tie

DYNAMIC STRATEGY EXAMPLES:
- "If I won last round, play what would beat my opponent's last move" = if you won, play the move that beats what they played
- "If I lost, stick with same move" = if you lost, repeat your previous move
- "Always play what would beat my opponent's last move" = play the move that beats their most recent move
- "If it's a tie, play rock" = if the previous round was a tie, play rock
- "Randomize between the other 2 moves" = pick randomly from the two moves you didn't play last time

Make your next move based on your strategy and the game history.`;

    const userMessage = `What is your move for round ${round}? 

Remember: This is round ${round} of 10. Apply your strategy accordingly.

Please respond in this exact format:
MOVE: [rock/paper/scissors]
REASONING: [Your brief explanation of why you chose this move based on your strategy and the game history]`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 200,
    });

    const responseText = response.choices[0]?.message?.content || "";

    // Parse the response to extract move and reasoning
    const moveMatch = responseText.match(/MOVE:\s*(rock|paper|scissors)/i);
    const reasoningMatch = responseText.match(/REASONING:\s*(.+)/i);

    const move = moveMatch ? parseMove(moveMatch[1]) : parseMove(responseText);
    const reasoning = reasoningMatch
      ? reasoningMatch[1].trim()
      : "No reasoning provided";

    return { move, reasoning };
  } catch (error) {
    console.error("Error getting move:", error);
    // Return random move as fallback
    const allMoves: Move[] = ["rock", "paper", "scissors"];
    const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    return { move: randomMove, reasoning: "Error occurred, using random move" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { player1Prompt, player2Prompt } = await request.json();

    if (!player1Prompt || !player2Prompt) {
      return NextResponse.json(
        { error: "Both player prompts are required" },
        { status: 400 }
      );
    }

    const TOTAL_ROUNDS = 10;
    const results: RoundResult[] = [];

    console.log(`Playing ${TOTAL_ROUNDS} rounds with individual move calls...`);

    // Play out all 10 rounds with individual API calls
    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      console.log(
        `Round ${round}/${TOTAL_ROUNDS} - Getting moves from both players...`
      );

      // Get moves for both players in parallel for this round
      const [player1Result, player2Result] = await Promise.all([
        getMove(player1Prompt, round, results, 1),
        getMove(player2Prompt, round, results, 2),
      ]);

      const winner = determineWinner(player1Result.move, player2Result.move);

      results.push({
        round,
        player1Move: player1Result.move,
        player2Move: player2Result.move,
        winner,
        player1Reasoning: player1Result.reasoning,
        player2Reasoning: player2Result.reasoning,
      });

      console.log(
        `Round ${round}: P1=${player1Result.move}, P2=${player2Result.move}, Winner=${winner}`
      );
      console.log(`P1 Reasoning: ${player1Result.reasoning}`);
      console.log(`P2 Reasoning: ${player2Result.reasoning}`);
    }

    // Calculate final scores
    const player1Wins = results.filter((r) => r.winner === "player1").length;
    const player2Wins = results.filter((r) => r.winner === "player2").length;
    const ties = results.filter((r) => r.winner === "tie").length;

    console.log(
      `Game complete! P1: ${player1Wins} P2: ${player2Wins} Ties: ${ties}`
    );

    return NextResponse.json({
      results,
      player1Wins,
      player2Wins,
      ties,
      finalWinner:
        player1Wins > player2Wins
          ? "player1"
          : player2Wins > player1Wins
          ? "player2"
          : "tie",
      player1Prompt,
      player2Prompt,
    });
  } catch (error) {
    console.error("Error in play-rps API:", error);
    return NextResponse.json({ error: "Failed to play game" }, { status: 500 });
  }
}
