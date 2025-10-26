import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Lava integration: Use Lava proxy if token is set, otherwise fallback to direct OpenAI
const useLava = !!process.env.LAVA_FORWARD_TOKEN;

const openai = new OpenAI({
  apiKey: useLava ? process.env.LAVA_FORWARD_TOKEN : process.env.OPENAI_API_KEY,
  baseURL: useLava ? "https://api.lavapayments.com/v1/forward/openai/v1" : undefined,
});

interface EndSummaryRequest {
  winner: 1 | 2 | "tie";
  winnerReason: string;
  player1Strategy: string;
  player2Strategy: string;
  player1FinalPnl: number;
  player2FinalPnl: number;
  player1TotalReturn: number;
  player2TotalReturn: number;
  asset: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const {
      winner,
      winnerReason,
      player1Strategy,
      player2Strategy,
      player1FinalPnl,
      player2FinalPnl,
      player1TotalReturn,
      player2TotalReturn,
      asset,
    } = body;

    const systemPrompt = `You are a hilarious Wall Street trader commentator. Give EXACTLY 2 short sentences, no more. First celebrates/roasts with trading humor. Second explains why the winning strategy made more profit. Keep it brief and punchy.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! ${winnerReason}. Trading ${asset}. P1 P&L: $${player1FinalPnl.toFixed(2)} (${player1TotalReturn.toFixed(1)}% return). P2 P&L: $${player2FinalPnl.toFixed(2)} (${player2TotalReturn.toFixed(1)}% return). P1: "${player1Strategy}". P2: "${player2Strategy}". EXACTLY 2 short sentences.`;
    } else {
      const winnerPnl = winner === 1 ? player1FinalPnl : player2FinalPnl;
      const winnerReturn = winner === 1 ? player1TotalReturn : player2TotalReturn;
      const winnerStrat = winner === 1 ? player1Strategy : player2Strategy;
      const loserPnl = winner === 1 ? player2FinalPnl : player1FinalPnl;
      const loserReturn = winner === 1 ? player2TotalReturn : player1TotalReturn;
      const loserStrat = winner === 1 ? player2Strategy : player1Strategy;

      userPrompt = `Player ${winner} wins! ${winnerReason}. Trading ${asset}. Winner: $${winnerPnl.toFixed(2)} P&L (${winnerReturn.toFixed(1)}% return), strategy: "${winnerStrat}". Loser: $${loserPnl.toFixed(2)} P&L (${loserReturn.toFixed(1)}% return), strategy: "${loserStrat}". EXACTLY 2 short sentences: celebrate, then explain.`;
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

    const summary = completion.choices[0].message.content || "What a trade!";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating quant trading end summary:", error);
    return NextResponse.json(
      { error: "Failed to generate end summary" },
      { status: 500 }
    );
  }
}
