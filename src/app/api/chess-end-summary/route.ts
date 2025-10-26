import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Lava integration: Use Lava proxy if token is set, otherwise fallback to direct OpenAI
const useLava = !!process.env.LAVA_FORWARD_TOKEN;

const openai = new OpenAI({
  apiKey: useLava ? process.env.LAVA_FORWARD_TOKEN : process.env.OPENAI_API_KEY,
  baseURL: useLava ? "https://api.lavapayments.com/v1/forward/openai/v1" : undefined,
});

interface EndSummaryRequest {
  winner: "white" | "black" | "draw";
  gameEndReason: string;
  whitePrompt: string;
  blackPrompt: string;
  evaluation?: number;
  evaluationInPawns?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const { winner, gameEndReason, whitePrompt, blackPrompt, evaluation, evaluationInPawns } = body;

    const systemPrompt = `You are a hilarious, charismatic chess commentator. Give EXACTLY 2 short sentences, no more. First celebrates/roasts with humor. Second explains why the winning strategy worked. Keep it brief and punchy.`;

    let userPrompt = "";
    if (winner === "draw") {
      userPrompt = `Draw! ${gameEndReason}. White: "${whitePrompt}". Black: "${blackPrompt}". EXACTLY 2 short sentences.`;
    } else {
      const winnerStrategy = winner === "white" ? whitePrompt : blackPrompt;
      const loserStrategy = winner === "white" ? blackPrompt : whitePrompt;
      userPrompt = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins! ${gameEndReason}. Winner: "${winnerStrategy}". Loser: "${loserStrategy}". EXACTLY 2 short sentences: celebrate, then explain why they won.`;
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

    const summary = completion.choices[0].message.content || "What a game!";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating end summary:", error);
    return NextResponse.json(
      { error: "Failed to generate end summary" },
      { status: 500 }
    );
  }
}
