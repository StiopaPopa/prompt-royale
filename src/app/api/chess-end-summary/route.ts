import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    "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",
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

    const systemPrompt = `You are a hilarious, charismatic chess commentator wrapping up the game. Give 2 sentences: First sentence celebrates/roasts the result with humor and wit. Second sentence explains why the winning strategy worked better (or why both strategies failed equally in a draw). Be entertaining and insightful.`;

    let userPrompt = "";
    if (winner === "draw") {
      userPrompt = `Draw! ${gameEndReason}. White: "${whitePrompt}". Black: "${blackPrompt}". Give 2 funny sentences explaining why both strategies canceled each other out.`;
    } else {
      const winnerStrategy = winner === "white" ? whitePrompt : blackPrompt;
      const loserStrategy = winner === "white" ? blackPrompt : whitePrompt;
      userPrompt = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins! ${gameEndReason}. Winner: "${winnerStrategy}". Loser: "${loserStrategy}". Give 2 sentences: one celebrating/roasting, one explaining why the winning strategy dominated.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 1.0,
      max_tokens: 150,
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
