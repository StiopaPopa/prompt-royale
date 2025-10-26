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
  player1QuestionsUsed: number;
  player2QuestionsUsed: number;
  player1Correct: boolean;
  player2Correct: boolean;
  player1Target: string;
  player2Target: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EndSummaryRequest = await request.json();
    const {
      winner,
      winnerReason,
      player1Policy,
      player2Policy,
      player1QuestionsUsed,
      player2QuestionsUsed,
      player1Correct,
      player2Correct,
      player1Target,
      player2Target,
    } = body;

    const systemPrompt = `You are a hilarious, charismatic game show host wrapping up a Guess Who battle. Give 2 sentences: First sentence celebrates/roasts the result with humor and wit. Second sentence explains why the winning strategy worked better (or why both strategies failed/succeeded equally in a tie). Be entertaining and insightful.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! ${winnerReason}. Player 1 used ${player1QuestionsUsed} questions (${player1Correct ? "correct" : "failed"}), target was ${player1Target}. Player 2 used ${player2QuestionsUsed} questions (${player2Correct ? "correct" : "failed"}), target was ${player2Target}. P1 Strategy: "${player1Policy}". P2 Strategy: "${player2Policy}". Give 2 funny sentences explaining why both strategies performed equally.`;
    } else {
      const winnerQuestions = winner === 1 ? player1QuestionsUsed : player2QuestionsUsed;
      const winnerStrategy = winner === 1 ? player1Policy : player2Policy;
      const winnerCorrect = winner === 1 ? player1Correct : player2Correct;
      const winnerTarget = winner === 1 ? player1Target : player2Target;
      const loserQuestions = winner === 1 ? player2QuestionsUsed : player1QuestionsUsed;
      const loserStrategy = winner === 1 ? player2Policy : player1Policy;
      const loserCorrect = winner === 1 ? player2Correct : player1Correct;
      const loserTarget = winner === 1 ? player2Target : player1Target;

      userPrompt = `Player ${winner} wins! ${winnerReason}. Winner used ${winnerQuestions} questions (${winnerCorrect ? "correct" : "failed"}) trying to guess ${winnerTarget}, strategy: "${winnerStrategy}". Loser used ${loserQuestions} questions (${loserCorrect ? "correct" : "failed"}) trying to guess ${loserTarget}, strategy: "${loserStrategy}". Give 2 sentences: one celebrating/roasting, one explaining why the winning strategy dominated.`;
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
