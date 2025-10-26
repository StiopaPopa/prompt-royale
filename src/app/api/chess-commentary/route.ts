import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

// Lava integration: Use Lava proxy if token is set, otherwise fallback to direct OpenAI
const useLava = !!process.env.LAVA_FORWARD_TOKEN;

const openai = new OpenAI({
  apiKey: useLava ? process.env.LAVA_FORWARD_TOKEN : process.env.OPENAI_API_KEY,
  baseURL: useLava ? "https://api.lavapayments.com/v1/forward/openai/v1" : undefined,
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
