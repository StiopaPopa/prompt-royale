import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    "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",
});

interface EndSummaryRequest {
  winner: 1 | 2 | "tie";
  winnerReason: string;
  player1Policy: string;
  player2Policy: string;
  player1ShotsHit: number;
  player2ShotsHit: number;
  player1ShipsSunk: number;
  player2ShipsSunk: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const {
      winner,
      winnerReason,
      player1Policy,
      player2Policy,
      player1ShotsHit,
      player2ShotsHit,
      player1ShipsSunk,
      player2ShipsSunk,
    } = body;

    const systemPrompt = `You are a hilarious naval commander commentator. Give EXACTLY 2 short sentences, no more. First celebrates/roasts with military humor. Second explains why the winning strategy dominated. Keep it brief and punchy.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! ${winnerReason}. P1 hit ${player1ShotsHit} shots, sunk ${player1ShipsSunk} ships. P2 hit ${player2ShotsHit} shots, sunk ${player2ShipsSunk} ships. P1: "${player1Policy}". P2: "${player2Policy}". EXACTLY 2 short sentences.`;
    } else {
      const winnerHits = winner === 1 ? player1ShotsHit : player2ShotsHit;
      const winnerSunk = winner === 1 ? player1ShipsSunk : player2ShipsSunk;
      const winnerStrategy = winner === 1 ? player1Policy : player2Policy;
      const loserHits = winner === 1 ? player2ShotsHit : player1ShotsHit;
      const loserSunk = winner === 1 ? player2ShipsSunk : player1ShipsSunk;
      const loserStrategy = winner === 1 ? player2Policy : player1Policy;

      userPrompt = `Player ${winner} wins! ${winnerReason}. Winner: ${winnerHits} hits, ${winnerSunk} ships sunk, strategy: "${winnerStrategy}". Loser: ${loserHits} hits, ${loserSunk} ships sunk, strategy: "${loserStrategy}". EXACTLY 2 short sentences: celebrate, then explain.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 1.0,
      max_tokens: 80,
    });

    const summary = completion.choices[0].message.content || "What a battle!";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating battleship end summary:", error);
    return NextResponse.json(
      { error: "Failed to generate end summary" },
      { status: 500 }
    );
  }
}
