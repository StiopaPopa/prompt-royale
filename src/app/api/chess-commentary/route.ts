import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey:
    "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",
});

interface CommentaryRequest {
  recentMoves: Array<{
    moveNumber: number;
    player: "white" | "black";
    san: string;
    reasoning: string;
  }>;
  currentPosition: string;
  gameContext: {
    whitePrompt: string;
    blackPrompt: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CommentaryRequest = await request.json();
    const { recentMoves, currentPosition, gameContext } = body;

    // Build move history string for context
    const moveHistory = recentMoves
      .map((move) => `${move.moveNumber}. ${move.player === "white" ? move.san : "..."} ${move.player === "black" ? move.san : ""}`)
      .join(" ");

    // Get the latest move for specific commentary
    const latestMove = recentMoves[recentMoves.length - 1];

    const systemPrompt = `You are a hilarious, over-the-top chess commentator. Give 3-5 word reactions that are funny, dramatic, or absurd. Think sports announcer meets comedian. Be unpredictable and entertaining.`;

    const userPrompt = `${latestMove.player} plays ${latestMove.san}. Give a funny 3-5 word reaction.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 1.0,
      max_tokens: 15,
    });

    const commentary = completion.choices[0].message.content || "An interesting move has been played!";

    return NextResponse.json({ commentary });
  } catch (error) {
    console.error("Error generating commentary:", error);
    return NextResponse.json(
      { error: "Failed to generate commentary" },
      { status: 500 }
    );
  }
}
