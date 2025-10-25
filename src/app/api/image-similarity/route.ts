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

async function getRandomReferenceDataUrl(query?: string | null): Promise<{ dataUrl: string; source: string }> {
    // Use Lorem Picsum exclusively. It does not support keyword search, so we use the
    // provided query string (if any) only as a deterministic seed for image variety.
    const seed = encodeURIComponent(query || String(Date.now()));
    const picsumUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
    const dataUrl = await fetchAsDataUrl(picsumUrl);
    return { dataUrl, source: 'picsum' };
}

async function generateImageWithGemini(prompt: string, modelOverride?: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = modelOverride || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY on server');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode } = body as { mode?: string };

        // Mode 1: prompts provided -> generate images then compare
        if (mode === 'generate-and-compare') {
            const { referenceImage, p1Prompt, p2Prompt, geminiModel } = body as { referenceImage?: string; p1Prompt?: string; p2Prompt?: string; geminiModel?: string };
            if (!referenceImage || !p1Prompt || !p2Prompt) {
                return NextResponse.json({ error: 'Missing referenceImage, p1Prompt, or p2Prompt' }, { status: 400 });
            }

            const modelToUse = geminiModel || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
            const [im1, im2] = await Promise.all([
                generateImageWithGemini(p1Prompt, modelToUse),
                generateImageWithGemini(p2Prompt, modelToUse),
            ]);

            const player1Image = im1.dataUrl;
            const player2Image = im2.dataUrl;

            const [p1, p2] = await runPythonSimilarity(referenceImage, [player1Image, player2Image]);
            const player1Score = Number.isFinite(p1) ? p1 : 1.0;
            const player2Score = Number.isFinite(p2) ? p2 : 1.0;
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
            });
        }

        // Mode 2: direct base64 images provided -> compare
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
            const [p1, p2] = await runPythonSimilarity(referenceImage, [player1Image, player2Image]);
            const player1Score = Number.isFinite(p1) ? p1 : 1.0;
            const player2Score = Number.isFinite(p2) ? p2 : 1.0;
            const winner: Winner = player1Score === player2Score ? 'tie' : (player1Score > player2Score ? 'player1' : 'player2');
            return NextResponse.json({ player1Score, player2Score, winner });
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
            const result = await getRandomReferenceDataUrl(query);
            return NextResponse.json({ dataUrl: result.dataUrl, source: result.source });
        }
        return NextResponse.json({ error: 'Unsupported GET usage' }, { status: 400 });
    } catch (e) {
        console.error('GET /api/image-similarity error', e);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
}
