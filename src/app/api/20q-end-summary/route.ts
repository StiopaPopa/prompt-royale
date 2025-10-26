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
  secretObject: string;
  player1Policy: string;
  player2Policy: string;
  player1QuestionsUsed: number;
  player2QuestionsUsed: number;
  player1Correct: boolean;
  player2Correct: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const {
      winner,
      winnerReason,
      secretObject,
      player1Policy,
      player2Policy,
      player1QuestionsUsed,
      player2QuestionsUsed,
      player1Correct,
      player2Correct
    } = body;

    const systemPrompt = `You are a hilarious game show host. Give EXACTLY 2 short sentences, no more. First celebrates/roasts dramatically. Second explains why the winning strategy was smarter. Keep it brief and punchy.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! Object: "${secretObject}". P1: ${player1QuestionsUsed} questions (${player1Correct ? "correct" : "wrong"}). P2: ${player2QuestionsUsed} questions (${player2Correct ? "correct" : "wrong"}). EXACTLY 2 short sentences.`;
    } else {
      const winnerNum = winner;
      const winnerPolicy = winner === 1 ? player1Policy : player2Policy;
      const loserPolicy = winner === 1 ? player2Policy : player1Policy;
      const winnerQuestions = winner === 1 ? player1QuestionsUsed : player2QuestionsUsed;
      userPrompt = `Player ${winnerNum} wins! Object: "${secretObject}". Winner used ${winnerQuestions} questions. Winner: "${winnerPolicy}". Loser: "${loserPolicy}". EXACTLY 2 short sentences: celebrate, then explain.`;
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

    const summary = completion.choices[0].message.content || "Great game!";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating 20Q end summary:", error);
    return NextResponse.json(
      { error: "Failed to generate end summary" },
      { status: 500 }
    );
  }
}
