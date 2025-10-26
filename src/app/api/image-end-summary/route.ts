import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    "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",
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

    const systemPrompt = `You are a hilarious, charismatic art critic wrapping up Image Similarity. Give 2 sentences: First celebrates/roasts the result with dramatic flair. Second explains why the winning image captured the essence better (using the judge's reasoning). Be witty and insightful.`;

    let userPrompt = "";
    if (winner === "tie") {
      userPrompt = `Tie! Both scored ${player1Score}/10. Judge said: "${reasoning}". Give 2 funny sentences about these equally matched attempts.`;
    } else {
      const winnerScore = winner === "player1" ? player1Score : player2Score;
      const loserScore = winner === "player1" ? player2Score : player1Score;
      userPrompt = `${winner === "player1" ? "Player 1" : "Player 2"} wins! ${winnerScore}/10 vs ${loserScore}/10. Judge said: "${reasoning}". Give 2 sentences: one celebrating/roasting, one explaining why the winner's prompt captured it better.`;
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
