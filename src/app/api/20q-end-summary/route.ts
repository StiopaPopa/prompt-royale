import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    "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",
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

    const systemPrompt = `You are a hilarious, charismatic game show host wrapping up 20 Questions. Give 2 sentences: First celebrates/roasts with drama and humor. Second explains why the winning questioning strategy was superior. Be witty and insightful.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! Object: "${secretObject}". P1: ${player1QuestionsUsed} questions (${player1Correct ? "correct" : "wrong"}). P2: ${player2QuestionsUsed} questions (${player2Correct ? "correct" : "wrong"}). P1 strategy: "${player1Policy}". P2 strategy: "${player2Policy}". Give 2 funny sentences about how these strategies tied.`;
    } else {
      const winnerNum = winner;
      const winnerPolicy = winner === 1 ? player1Policy : player2Policy;
      const loserPolicy = winner === 1 ? player2Policy : player1Policy;
      const winnerQuestions = winner === 1 ? player1QuestionsUsed : player2QuestionsUsed;
      userPrompt = `Player ${winnerNum} wins! Object: "${secretObject}". Winner used ${winnerQuestions} questions. Winner strategy: "${winnerPolicy}". Loser strategy: "${loserPolicy}". Give 2 sentences: one celebrating, one explaining why their questioning approach was smarter.`;
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
