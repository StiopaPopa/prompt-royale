import { NextRequest, NextResponse } from "next/server";

interface TTSRequest {
  text: string;
  voiceId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text } = body;

    // Get Fish Audio API key from environment
    const fishApiKey = process.env.FISH_API_KEY;

    if (!fishApiKey) {
      return NextResponse.json(
        { error: "FISH_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Generate speech using Fish Audio API with consistent male voice (Adam)
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${fishApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_id: "728f6ff2240d49308e8137ffe66008e2", // ElevenLabs Adam voice clone
        format: "mp3",
        mp3_bitrate: 128,
        normalize: true,
        latency: "normal",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fish Audio API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: response.status }
      );
    }

    // Get the audio buffer from Fish Audio response
    const audioBuffer = await response.arrayBuffer();

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
