import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    "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",
});

interface EndSummaryRequest {
  finalWinner: "player1" | "player2" | "tie";
  player1Wins: number;
  player2Wins: number;
  ties: number;
  player1Prompt: string;
  player2Prompt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const {
      finalWinner,
      player1Wins,
      player2Wins,
      ties,
      player1Prompt,
      player2Prompt
    } = body;

    const systemPrompt = `You are a hilarious sports announcer. Give EXACTLY 2 short sentences, no more. First celebrates/roasts with drama. Second explains why the winning strategy dominated. Keep it brief and punchy.`;

    let userPrompt = "";
    if (finalWinner === "tie") {
      userPrompt = `Tie! Score: ${player1Wins}-${player2Wins}. P1: "${player1Prompt}". P2: "${player2Prompt}". EXACTLY 2 short sentences.`;
    } else {
      const winnerWins = finalWinner === "player1" ? player1Wins : player2Wins;
      const loserWins = finalWinner === "player1" ? player2Wins : player1Wins;
      const winnerStrategy = finalWinner === "player1" ? player1Prompt : player2Prompt;
      const loserStrategy = finalWinner === "player1" ? player2Prompt : player1Prompt;
      userPrompt = `${finalWinner === "player1" ? "Player 1" : "Player 2"} wins ${winnerWins}-${loserWins}! Winner: "${winnerStrategy}". Loser: "${loserStrategy}". EXACTLY 2 short sentences: celebrate, then explain.`;
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

    const summary = completion.choices[0].message.content || "What a match!";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating RPS end summary:", error);
    return NextResponse.json(
      { error: "Failed to generate end summary" },
      { status: 500 }
    );
  }
}
