import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
});

type Move = 'rock' | 'paper' | 'scissors';

interface RoundResult {
  round: number;
  player1Move: Move;
  player2Move: Move;
  winner: 'player1' | 'player2' | 'tie';
}

function determineWinner(move1: Move, move2: Move): 'player1' | 'player2' | 'tie' {
  if (move1 === move2) return 'tie';
  if (
    (move1 === 'rock' && move2 === 'scissors') ||
    (move1 === 'paper' && move2 === 'rock') ||
    (move1 === 'scissors' && move2 === 'paper')
  ) {
    return 'player1';
  }
  return 'player2';
}

function parseMove(text: string): Move {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('rock')) return 'rock';
  if (lowerText.includes('paper')) return 'paper';
  if (lowerText.includes('scissors')) return 'scissors';
  
  // Default to rock if no valid move is found
  return 'rock';
}

// Get a batch of moves with context from previous rounds
async function getBatchOfMoves(
  prompt: string, 
  startRound: number, 
  batchSize: number,
  context: string,
  score: { wins: number; losses: number; ties: number }
): Promise<Move[]> {
  try {
    const systemMessage = `You are playing Rock Paper Scissors. Your strategy: ${prompt}

Current Status:
- Rounds ${startRound} to ${startRound + batchSize - 1} of 100
- Your score: ${score.wins} wins, ${score.losses} losses, ${score.ties} ties
${context ? `\nComplete game history so far:\n${context}` : '\nThis is the first batch - no history yet.'}

Follow your strategy while adapting to the opponent's patterns. Analyze their full history to identify any patterns or tendencies.`;

    const userMessage = `Generate exactly ${batchSize} moves for the next ${batchSize} rounds.

Format: comma-separated list with ONLY the moves (rock, paper, or scissors).
Example: rock,paper,scissors,rock,paper

Your ${batchSize} moves:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 500,
    });

    const moveText = response.choices[0]?.message?.content || '';
    
    // Parse the comma-separated moves
    const moves = moveText
      .toLowerCase()
      .split(/[,\s\n]+/)
      .map(m => m.trim())
      .filter(m => m === 'rock' || m === 'paper' || m === 'scissors')
      .map(m => m as Move);

    // Ensure we have exactly batchSize moves
    while (moves.length < batchSize) {
      moves.push(moves[moves.length % Math.max(1, moves.length)] || 'rock');
    }

    return moves.slice(0, batchSize);
  } catch (error) {
    console.error('Error getting batch of moves:', error);
    // Return random moves as fallback
    const allMoves: Move[] = ['rock', 'paper', 'scissors'];
    return Array.from({ length: batchSize }, () => allMoves[Math.floor(Math.random() * allMoves.length)]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { player1Prompt, player2Prompt } = await request.json();

    if (!player1Prompt || !player2Prompt) {
      return NextResponse.json(
        { error: 'Both player prompts are required' },
        { status: 400 }
      );
    }

    const BATCH_SIZE = 20; // Process 20 rounds at a time (5 batches total)
    const TOTAL_ROUNDS = 100;
    const results: RoundResult[] = [];
    
    // Track context for each player
    let player1Context = '';
    let player2Context = '';
    let player1Score = { wins: 0, losses: 0, ties: 0 };
    let player2Score = { wins: 0, losses: 0, ties: 0 };

    console.log(`Processing ${TOTAL_ROUNDS} rounds in ${TOTAL_ROUNDS / BATCH_SIZE} batches of ${BATCH_SIZE}...`);

    // Process rounds in batches
    for (let batchStart = 1; batchStart <= TOTAL_ROUNDS; batchStart += BATCH_SIZE) {
      const batchNum = Math.floor((batchStart - 1) / BATCH_SIZE) + 1;
      console.log(`Batch ${batchNum}/${TOTAL_ROUNDS / BATCH_SIZE}: Rounds ${batchStart}-${batchStart + BATCH_SIZE - 1}`);

      // Get moves for both players in parallel for this batch
      const [player1Batch, player2Batch] = await Promise.all([
        getBatchOfMoves(player1Prompt, batchStart, BATCH_SIZE, player1Context, player1Score),
        getBatchOfMoves(player2Prompt, batchStart, BATCH_SIZE, player2Context, player2Score),
      ]);

      // Play out all rounds in this batch
      for (let i = 0; i < BATCH_SIZE; i++) {
        const round = batchStart + i;
        if (round > TOTAL_ROUNDS) break;

        const player1Move = player1Batch[i];
        const player2Move = player2Batch[i];
        const winner = determineWinner(player1Move, player2Move);

        results.push({
          round,
          player1Move,
          player2Move,
          winner,
        });

        // Update scores
        if (winner === 'player1') {
          player1Score.wins++;
          player2Score.losses++;
        } else if (winner === 'player2') {
          player2Score.wins++;
          player1Score.losses++;
        } else {
          player1Score.ties++;
          player2Score.ties++;
        }
      }

      // Update context with ALL previous results (full game history)
      player1Context = results
        .map(r => `R${r.round}: You ${r.player1Move} vs ${r.player2Move} → ${
          r.winner === 'player1' ? 'WIN' : r.winner === 'player2' ? 'LOSS' : 'TIE'
        }`)
        .join('\n');
      
      player2Context = results
        .map(r => `R${r.round}: You ${r.player2Move} vs ${r.player1Move} → ${
          r.winner === 'player2' ? 'WIN' : r.winner === 'player1' ? 'LOSS' : 'TIE'
        }`)
        .join('\n');
    }

    // Calculate final scores
    const player1Wins = results.filter(r => r.winner === 'player1').length;
    const player2Wins = results.filter(r => r.winner === 'player2').length;
    const ties = results.filter(r => r.winner === 'tie').length;

    console.log(`Game complete! P1: ${player1Wins} P2: ${player2Wins} Ties: ${ties}`);

    return NextResponse.json({
      results,
      player1Wins,
      player2Wins,
      ties,
      finalWinner: player1Wins > player2Wins ? 'player1' : player2Wins > player1Wins ? 'player2' : 'tie',
    });
  } catch (error) {
    console.error('Error in play-rps API:', error);
    return NextResponse.json(
      { error: 'Failed to play game' },
      { status: 500 }
    );
  }
}

