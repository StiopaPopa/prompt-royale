import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import OpenAI from 'openai';

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode } = body as { mode?: string };

        // Mode 1: prompts provided -> generate images then compare
        if (mode === 'generate-and-compare') {
            const { referenceImage, p1Prompt, p2Prompt } = body as { referenceImage?: string; p1Prompt?: string; p2Prompt?: string };
            if (!referenceImage || !p1Prompt || !p2Prompt) {
                return NextResponse.json({ error: 'Missing referenceImage, p1Prompt, or p2Prompt' }, { status: 400 });
            }

            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ error: 'Missing OPENAI_API_KEY on server' }, { status: 500 });
            }
            const openai = new OpenAI({
                apiKey:
                    "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",
            });

            // Generate two images in parallel
            const [g1, g2] = await Promise.all([
                openai.images.generate({ model: 'gpt-image-1', prompt: p1Prompt, size: '1024x1024' }),
                openai.images.generate({ model: 'gpt-image-1', prompt: p2Prompt, size: '1024x1024' }),
            ]);

            const p1b64 = g1?.data?.[0]?.b64_json;
            const p2b64 = g2?.data?.[0]?.b64_json;
            if (!p1b64 || !p2b64) {
                return NextResponse.json({ error: 'Failed to generate images from prompts' }, { status: 500 });
            }
            const player1Image = `data:image/png;base64,${p1b64}`;
            const player2Image = `data:image/png;base64,${p2b64}`;

            const [p1, p2] = await runPythonSimilarity(referenceImage, [player1Image, player2Image]);
            const player1Score = Number.isFinite(p1) ? p1 : 1.0;
            const player2Score = Number.isFinite(p2) ? p2 : 1.0;
            const winner: Winner = player1Score === player2Score ? 'tie' : (player1Score > player2Score ? 'player1' : 'player2');

            return NextResponse.json({ player1Score, player2Score, winner, player1Image, player2Image });
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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
