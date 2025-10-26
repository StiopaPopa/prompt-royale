import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Lava integration: Use Lava proxy if token is set, otherwise fallback to direct OpenAI
const useLava = !!process.env.LAVA_FORWARD_TOKEN;

const openai = new OpenAI({
  apiKey: useLava ? process.env.LAVA_FORWARD_TOKEN : process.env.OPENAI_API_KEY,
  baseURL: useLava ? "https://api.lavapayments.com/v1/forward/openai/v1" : undefined,
});

interface EndSummaryRequest {
  winner: "player1" | "player2" | "tie";
  player1Score: number;
  player2Score: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const { winner, player1Score, player2Score, reasoning } = body;

    const systemPrompt = `You are a hilarious art critic. Give EXACTLY 2 short sentences, no more. First celebrates/roasts with flair. Second explains why the winning image was better. Keep it brief and punchy.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! Both scored ${player1Score}/10. Judge said: "${reasoning}". EXACTLY 2 short sentences.`;
    } else {
      const winnerScore = winner === "player1" ? player1Score : player2Score;
      const loserScore = winner === "player1" ? player2Score : player1Score;
      userPrompt = `${winner === "player1" ? "Player 1" : "Player 2"} wins! ${winnerScore}/10 vs ${loserScore}/10. Judge said: "${reasoning}". EXACTLY 2 short sentences: celebrate, then explain.`;
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

    const summary = completion.choices[0].message.content || "Amazing images!";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating image end summary:", error);
    return NextResponse.json(
      { error: "Failed to generate end summary" },
      { status: 500 }
    );
  }
}
