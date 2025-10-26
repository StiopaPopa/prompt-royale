import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: "sk_bb3b957c3e817d6d75ad28329ce5ce87528410c7e8b71971",
});

interface TTSRequest {
  text: string;
  voiceId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text, voiceId } = body;

    // Use a default voice ID (Adam - great for sports commentary)
    // You can change this to any ElevenLabs voice ID
    const selectedVoiceId = voiceId || "pNInz6obpgDQGcFmaJgB"; // Adam voice

    // Generate speech using ElevenLabs
    const audio = await elevenlabs.textToSpeech.convert(selectedVoiceId, {
      text,
      modelId: "eleven_turbo_v2_5",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.5,
        useSpeakerBoost: true,
      },
    });

    // Convert the audio stream to a buffer
    const chunks: Buffer[] = [];
    const reader = audio.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    const audioBuffer = Buffer.concat(chunks);

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
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
