import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

type Winner = 'player1' | 'player2' | 'tie';

async function runPythonSimilarity(referenceImage: string, playerImages: string[]): Promise<number[]> {
    // Inline Python that imports the attached ImageSimilarityCalculator, reads JSON from stdin,
    // decodes base64 images, computes scores, and prints JSON to stdout.
    const pyCode = `
import sys, json
sys.path.append('/Users/abrahamzhong/Desktop/image-similarity-game-backend')
from image_similarity import ImageSimilarityCalculator

def main():
        data = json.load(sys.stdin)
        reference = data.get('reference')
        players = data.get('players', [])
        calc = ImageSimilarityCalculator()
        ref_img = calc.decode_base64_image(reference)
        scores = []
        for p in players:
                img = calc.decode_base64_image(p)
                s = float(calc.calculate_similarity_score(ref_img, img))
                scores.append(s)
        json.dump({'scores': scores}, sys.stdout)

if __name__ == '__main__':
        main()
`;

    // Try python3 then python
    const pythonCandidates = ['python3', 'python'];
    let lastError: any = null;
    for (const bin of pythonCandidates) {
        try {
            const scores = await new Promise<number[]>((resolve, reject) => {
                const child = spawn(bin, ['-c', pyCode], { stdio: ['pipe', 'pipe', 'pipe'] });

                const input = JSON.stringify({ reference: referenceImage, players: playerImages });
                child.stdin.write(input);
                child.stdin.end();

                let stdout = '';
                let stderr = '';
                child.stdout.on('data', (d) => (stdout += d.toString()));
                child.stderr.on('data', (d) => (stderr += d.toString()));
                child.on('error', reject);
                child.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const parsed = JSON.parse(stdout);
                            resolve(parsed.scores || []);
                        } catch (e) {
                            reject(new Error('Failed to parse Python output: ' + String(e)));
                        }
                    } else {
                        reject(new Error('Python exited with code ' + code + (stderr ? (' - ' + stderr) : '')));
                    }
                });
            });
            return scores;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError ?? new Error('Unable to invoke Python to compute similarity');
}

async function fetchAsDataUrl(url: string): Promise<string> {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
}

async function getRandomReferenceDataUrl(kind: 'hd' | 'meme' = 'hd', query?: string | null): Promise<{ dataUrl: string; source: string }> {
    if (kind === 'meme') {
        // Meme API: https://meme-api.com/gimme
        const res = await fetch('https://meme-api.com/gimme', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch meme: ${res.status}`);
        const json = await res.json();
        const url: string | undefined = json?.url || json?.preview?.[json?.preview?.length - 1];
        if (!url) throw new Error('Meme API returned no URL');
        const dataUrl = await fetchAsDataUrl(url);
        return { dataUrl, source: 'meme' };
    }
    // Default HD photo via Lorem Picsum
    const seed = encodeURIComponent(query || String(Date.now()));
    const picsumUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
    const dataUrl = await fetchAsDataUrl(picsumUrl);
    return { dataUrl, source: 'picsum' };
}

async function generateImageWithGemini(prompt: string, modelOverride?: string) {
    const model = 'gemini-2.5-flash-image';

    // Try Lava proxy first, fallback to direct Gemini API
    const useLava = !!process.env.LAVA_FORWARD_TOKEN;

    let url: string;
    let headers: Record<string, string>;

    if (useLava) {
        // Route through Lava Build proxy
        const lavaBaseUrl = process.env.LAVA_BASE_URL || 'https://api.lavapayments.com/v1';
        const geminiEndpoint = process.env.GEMINI_IMAGE_GENERATION_URL ||
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        url = `${lavaBaseUrl}/forward?u=${encodeURIComponent(geminiEndpoint)}`;
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
        };
    } else {
        // Direct Gemini API call (legacy)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Missing GEMINI_API_KEY or LAVA_FORWARD_TOKEN');
        url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        };
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.7,
            },
        }),
    });
    if (!res.ok) throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    // Try to find inline image base64 across all candidates/parts, supporting inline_data and inlineData variants
    const candidates: any[] = json?.candidates || [];
    let b64: string | null = null;
    let mime: string = 'image/png';
    for (const cand of candidates) {
        const parts: any[] = cand?.content?.parts || [];
        for (const p of parts) {
            const inlineSnake = p?.inline_data;
            const inlineCamel = p?.inlineData;
            if (inlineSnake?.data) {
                b64 = inlineSnake.data;
                mime = inlineSnake.mime_type || mime;
                break;
            }
            if (inlineCamel?.data) {
                b64 = inlineCamel.data;
                mime = inlineCamel.mimeType || mime;
                break;
            }
            if (typeof p?.text === 'string' && p.text.startsWith('data:image/')) {
                // Some responses could embed a data URL directly in text
                return { dataUrl: p.text, provider: 'gemini' as const, model };
            }
        }
        if (b64) break;
    }
    if (!b64) {
        // Provide a compact hint of the shape to aid debugging
        const hint = JSON.stringify({
            keys: Object.keys(json || {}),
            firstCandKeys: Object.keys((json?.candidates?.[0] || {})),
        });
        throw new Error(`Gemini returned no inline image data (model=${model}). The selected model may not support image generation. Hint: ${hint}`);
    }
    return { dataUrl: `data:${mime};base64,${b64}`, provider: 'gemini' as const, model };
}

function parseDataUrlToInline(dataUrl: string): { mime_type: string; data: string } {
    // data:[mime];base64,....
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL format');
    const mime_type = match[1];
    const data = match[2];
    return { mime_type, data };
}

async function scoreWithGemini(referenceDataUrl: string, player1DataUrl: string, player2DataUrl: string, modelOverride?: string) {
    const model = modelOverride || 'gemini-2.5-flash';

    // Try Lava proxy first, fallback to direct Gemini API
    const useLava = !!process.env.LAVA_FORWARD_TOKEN;

    let url: string;
    let headers: Record<string, string>;

    if (useLava) {
        // Route through Lava Build proxy for usage tracking and billing
        const lavaBaseUrl = process.env.LAVA_BASE_URL || 'https://api.lavapayments.com/v1';
        const geminiEndpoint = process.env.GEMINI_JUDGE_URL ||
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        url = `${lavaBaseUrl}/forward?u=${encodeURIComponent(geminiEndpoint)}`;
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LAVA_FORWARD_TOKEN}`,
        };
    } else {
        // Direct Gemini API call (legacy)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Missing GEMINI_API_KEY or LAVA_FORWARD_TOKEN');
        url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        headers = {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        };
    }

    const refInline = parseDataUrlToInline(referenceDataUrl);
    const p1Inline = parseDataUrlToInline(player1DataUrl);
    const p2Inline = parseDataUrlToInline(player2DataUrl);

    const prompt = `You are an image judge. Compare two candidate images to a reference image and score each candidate on a 0-10 scale, where 10 means an almost perfect match to the reference and 0 means completely unrelated. Consider content, composition, style, color palette, and key visual attributes. Be concise but fair.

Return ONLY compact JSON with keys: {"player1Score": number, "player2Score": number, "reasoning": string}. Do not include additional text.`;

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { text: 'Reference image:' },
                        { inline_data: refInline },
                        { text: 'Player 1 image:' },
                        { inline_data: p1Inline },
                        { text: 'Player 2 image:' },
                        { inline_data: p2Inline },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
            },
        }),
    });
    if (!res.ok) throw new Error(`Gemini judge failed: ${res.status} ${await res.text()}`);
    const json = await res.json();
    // Extract JSON from text (may be plain text or fenced)
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n');
    if (!text) throw new Error('Gemini judge returned no text');
    const m = text.match(/\{[\s\S]*\}/);
    const jsonStr = m ? m[0] : text;
    let parsed: any;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error('Failed to parse judge JSON: ' + (e as Error).message + ' — got: ' + text.slice(0, 400));
    }
    const p1 = Number(parsed.player1Score);
    const p2 = Number(parsed.player2Score);
    const reasoning = String(parsed.reasoning || '');
    if (!Number.isFinite(p1) || !Number.isFinite(p2)) {
        throw new Error('Judge JSON missing numeric scores');
    }
    return { player1Score: p1, player2Score: p2, reasoning, model };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode } = body as { mode?: string };

        // Mode 1: prompts provided -> generate images then judge with LLM
        if (mode === 'generate-and-compare') {
            const { referenceImage, p1Prompt, p2Prompt, geminiModel } = body as { referenceImage?: string; p1Prompt?: string; p2Prompt?: string; geminiModel?: string };
            if (!referenceImage || !p1Prompt || !p2Prompt) {
                return NextResponse.json({ error: 'Missing referenceImage, p1Prompt, or p2Prompt' }, { status: 400 });
            }

            // const modelToUse = geminiModel || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
            const modelToUse = 'gemini-2.5-flash-image';
            const [im1, im2] = await Promise.all([
                generateImageWithGemini(p1Prompt, modelToUse),
                generateImageWithGemini(p2Prompt, modelToUse),
            ]);

            const player1Image = im1.dataUrl;
            const player2Image = im2.dataUrl;

            // Judge with Gemini
            const judged = await scoreWithGemini(referenceImage, player1Image, player2Image);
            const player1Score = judged.player1Score;
            const player2Score = judged.player2Score;
            const diff = Math.abs(player1Score - player2Score);
            const winner: Winner = diff <= 0.5 ? 'tie' : (player1Score > player2Score ? 'player1' : 'player2');

            return NextResponse.json({
                player1Score,
                player2Score,
                winner,
                player1Image,
                player2Image,
                provider: 'gemini',
                model: modelToUse,
                judgeModel: judged.model,
                reasoning: judged.reasoning,
            });
        }

        // Mode: generate a single image (client orchestrates progress)
        if (mode === 'generate-image') {
            const { prompt, geminiModel } = body as { prompt?: string; geminiModel?: string };
            if (!prompt) {
                return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
            }
            // const modelToUse = geminiModel || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
            const modelToUse = 'gemini-2.5-flash-image';
            const img = await generateImageWithGemini(prompt, modelToUse);
            return NextResponse.json({ dataUrl: img.dataUrl, provider: 'gemini', model: modelToUse });
        }

        // Mode: judge two images against a reference (client orchestrates progress)
        if (mode === 'judge') {
            const { referenceImage, player1Image, player2Image, judgeModel } = body as {
                referenceImage?: string;
                player1Image?: string;
                player2Image?: string;
                judgeModel?: string;
            };
            if (!referenceImage || !player1Image || !player2Image) {
                return NextResponse.json(
                    { error: 'Missing required fields: referenceImage, player1Image, player2Image' },
                    { status: 400 },
                );
            }
            const judged = await scoreWithGemini(referenceImage, player1Image, player2Image, judgeModel);
            const player1Score = judged.player1Score;
            const player2Score = judged.player2Score;
            const diff = Math.abs(player1Score - player2Score);
            const winner: Winner = diff <= 0.5 ? 'tie' : (player1Score > player2Score ? 'player1' : 'player2');
            return NextResponse.json({ player1Score, player2Score, winner, provider: 'gemini', judgeModel: judged.model, reasoning: judged.reasoning });
        }

        // Mode 2: direct base64 images provided -> judge with LLM
        {
            const { referenceImage, player1Image, player2Image } = body as {
                referenceImage?: string;
                player1Image?: string;
                player2Image?: string;
            };
            if (!referenceImage || !player1Image || !player2Image) {
                return NextResponse.json(
                    { error: 'Missing required fields: referenceImage, player1Image, player2Image' },
                    { status: 400 },
                );
            }
            const judged = await scoreWithGemini(referenceImage, player1Image, player2Image);
            const player1Score = judged.player1Score;
            const player2Score = judged.player2Score;
            const diff = Math.abs(player1Score - player2Score);
            const winner: Winner = diff <= 0.5 ? 'tie' : (player1Score > player2Score ? 'player1' : 'player2');
            return NextResponse.json({ player1Score, player2Score, winner, provider: 'gemini', judgeModel: judged.model, reasoning: judged.reasoning });
        }
    } catch (error) {
        console.error('Error in image similarity API:', error);
        return NextResponse.json({ error: (error as Error)?.message || 'Internal server error' }, { status: 500 });
    }
}

// GET: fetch random HD reference image as base64 data URL
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const isRandom = searchParams.get('random');
        const query = searchParams.get('query');
        if (isRandom) {
            const kindParam = (searchParams.get('kind') || 'hd').toLowerCase();
            const kind = kindParam === 'meme' ? 'meme' : 'hd';
            const result = await getRandomReferenceDataUrl(kind, query);
            return NextResponse.json({ dataUrl: result.dataUrl, source: result.source });
        }
        return NextResponse.json({ error: 'Unsupported GET usage' }, { status: 400 });
    } catch (e) {
        console.error('GET /api/image-similarity error', e);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
}
