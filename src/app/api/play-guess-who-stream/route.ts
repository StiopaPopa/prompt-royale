import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    "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",
});

interface QuestionTurn {
  question: string;
  answer: string;
  reasoning?: string;
  eliminatedCount?: number;
  eliminated?: string[];
}

interface PlayerResult {
  player: 1 | 2;
  turns: QuestionTurn[];
  questionsUsed: number;
  correct: boolean;
  finalGuess?: string;
  targetPerson: string;
}

// Fixed set of 24 diverse celebrities
const CELEBRITIES = [
  "Taylor Swift",
  "LeBron James",
  "Elon Musk",
  "Oprah Winfrey",
  "Albert Einstein",
  "Marie Curie",
  "Barack Obama",
  "Beyoncé",
  "Leonardo DiCaprio",
  "Serena Williams",
  "Bill Gates",
  "J.K. Rowling",
  "Michael Jordan",
  "Meryl Streep",
  "Stephen Hawking",
  "Malala Yousafzai",
  "Ed Sheeran",
  "Tom Hanks",
  "Cristiano Ronaldo",
  "Steve Jobs",
  "Ruth Bader Ginsburg",
  "Dwayne Johnson",
  "Rihanna",
  "Neil Armstrong",
];

// Answerer class that holds the secret celebrity and answers questions truthfully
class Answerer {
  private secretPerson: string;

  constructor(secretPerson: string) {
    this.secretPerson = secretPerson;
  }

  async answerQuestion(
    question: string,
    questionHistory: QuestionTurn[],
    playerId: 1 | 2
  ): Promise<{ answer: string }> {
    try {
      // Check if it's a direct guess by extracting who they're asking about
      const guessedPerson = extractGuessedPerson(question);
      if (guessedPerson) {
        // If they're guessing a specific person, check if it matches
        const matches = matchesPerson(guessedPerson, this.secretPerson);
        if (matches) {
          console.log(`[Player ${playerId}] Direct guess: "${guessedPerson}" - ✓ CORRECT`);
          return { answer: "Yes" };
        }
        // If it doesn't match but has a guess pattern, fall through to let LLM answer
      }

      // Build context from history
      const historyText = questionHistory
        .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`)
        .join("\n");

      // Use LLM to answer the question accurately based on the secret person
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are the answerer in a Guess Who game. The secret person is: "${this.secretPerson}"

Your ONLY job is to answer YES/NO questions ACCURATELY and TRUTHFULLY about "${this.secretPerson}".

CRITICAL RULES:
- Answer ONLY with: Yes or No
- Base your answer PURELY on REAL FACTS about "${this.secretPerson}"
- Answer "Yes" if the statement is TRUE about "${this.secretPerson}"
- Answer "No" if the statement is FALSE about "${this.secretPerson}"
- NEVER reveal the identity directly
- BE CONSISTENT - same question should get same answer every time

Examples for "${this.secretPerson}":
- If asked "Is the person alive?" - answer based on whether ${this.secretPerson} is currently alive
- If asked "Are they in the music industry?" - answer based on ${this.secretPerson}'s primary field
- If asked "Are they male?" - answer based on ${this.secretPerson}'s gender`,
          },
          {
            role: "user",
            content: `Player ${playerId} asks: "${question}"

Think step-by-step:
1. What is the secret person? "${this.secretPerson}"
2. Is the question TRUE or FALSE about "${this.secretPerson}"?
3. Answer accordingly

Respond with ONLY: Yes or No`,
          },
        ],
        temperature: 0.0,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content || "";
      const answer = content.toLowerCase().includes("yes") ? "Yes" : "No";

      console.log(`[Player ${playerId}] Q: "${question}" → A: ${answer}`);
      return { answer };
    } catch (error) {
      console.error("Error answering question:", error);
      return { answer: "No" };
    }
  }
}

// Player class that asks questions based on policy
class Player {
  private playerId: 1 | 2;
  private policy: string;
  private turns: QuestionTurn[];
  private remainingPeople: string[];
  private opponentPerson: string;

  constructor(playerId: 1 | 2, policy: string, opponentPerson: string) {
    this.playerId = playerId;
    this.policy = policy;
    this.turns = [];
    this.remainingPeople = [...CELEBRITIES];
    this.opponentPerson = opponentPerson;
  }

  async askQuestion(questionNumber: number, maxQuestions: number): Promise<{ question: string; reasoning: string }> {
    try {
      const historyText =
        this.turns.length > 0
          ? this.turns
              .map(
                (t, i) =>
                  `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`
              )
              .join("\n")
          : "No questions asked yet";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Player ${this.playerId} playing Guess Who. Your strategy is:

${this.policy}

Previous questions and answers:
${historyText}

CURRENT STATUS:
- People still possible: ${this.remainingPeople.join(", ")}
- Total remaining: ${this.remainingPeople.length} / 24
- You have already eliminated ${24 - this.remainingPeople.length} people

GAME RULES:
- ONLY consider people from the "People still possible" list above
- DO NOT ask about people who have been eliminated
- You have ALREADY crossed out people not in the remaining list
- Each turn, you can either:
  (1) Ask a yes/no question to narrow down possibilities (e.g., "Is the person male?")
  (2) Make a direct guess of a specific person (e.g., "Is it Taylor Swift?")
- Follow your strategy to decide the best approach
- This is question ${questionNumber}

The celebrity pool includes people from diverse fields: music, sports, technology, film, science, politics, literature, activism, law, and media.`,
          },
          {
            role: "user",
            content: `Based on your strategy and the previous answers, what should you do next?

REMAINING PEOPLE: ${this.remainingPeople.join(", ")} (${this.remainingPeople.length} total)

${this.remainingPeople.length === 1 ? `Note: Only one person remains uneliminated.` : ""}

Follow YOUR STRATEGY to decide whether to:
- Ask a yes/no question to eliminate more people, OR
- Make a direct guess if you're confident

Respond in this format:
QUESTION: [your yes/no question OR direct guess like "Is it Taylor Swift?"]
REASONING: [brief 1-2 sentence explanation of why you're taking this approach based on your strategy]`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content?.trim() || "";

      // Parse question and reasoning
      const questionMatch = content.match(/QUESTION:\s*(.+)/i);
      const reasoningMatch = content.match(/REASONING:\s*(.+)/i);

      let question = questionMatch
        ? questionMatch[1].trim()
        : "Is the person alive?";
      let reasoning = reasoningMatch
        ? reasoningMatch[1].trim().split('\n')[0]
        : "Following my strategy to narrow down the possibilities";

      // FAILSAFE: If only 1 person remains and LLM didn't guess them, force the guess
      if (this.remainingPeople.length === 1) {
        const lastPerson = this.remainingPeople[0];
        const guessedPerson = extractGuessedPerson(question);
        
        if (!guessedPerson || !matchesPerson(guessedPerson, lastPerson)) {
          console.log(`⚠️ [Player ${this.playerId}] FAILSAFE: Only 1 person remains, forcing guess of "${lastPerson}"`);
          question = `Is it ${lastPerson}?`;
          reasoning = `Only one person remains uneliminated, so this must be the answer`;
        }
      }

      return { question, reasoning };
    } catch (error) {
      console.error(`Error getting question from Player ${this.playerId}:`, error);
      return {
        question: "Is the person alive?",
        reasoning: "Starting with a basic question",
      };
    }
  }

  async eliminatePeople(question: string, answer: string): Promise<{ count: number; eliminated: string[] }> {
    // Use LLM to determine which people to eliminate based on the Q&A
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are helping to eliminate people in a Guess Who game based on question-answer pairs.

Current remaining people: ${this.remainingPeople.join(", ")}

YOUR TASK:
After each question and answer, you must EXPLICITLY IDENTIFY which people should be ruled out and crossed off.

CRITICAL RULES:
- ONLY eliminate people if you are 100% CERTAIN they cannot be the answer based on the question and answer
- If there is ANY doubt or the question is ambiguous, DO NOT eliminate that person
- Be CONSERVATIVE - it's better to keep someone in than eliminate them incorrectly
- Only eliminate based on DEFINITIVE facts (e.g., gender, field of work, living/deceased status)
- DO NOT eliminate based on subjective traits or assumptions
- You MUST explicitly list out the names of people being eliminated

Examples:
Question: "Is the person male?"
Answer: "No"
→ ELIMINATE: [List all male names from remaining people]
→ REASONING: The answer is "No", so we can rule out all males

Question: "Is the person in the music industry?"
Answer: "No"  
→ ELIMINATE: [List people whose PRIMARY field is music]
→ REASONING: The answer is "No", so we rule out musicians

Question: "Is the person famous?"
Answer: "Yes"
→ ELIMINATE: []
→ REASONING: All remaining people are already famous, so this doesn't eliminate anyone

Question: "Is the person American?"
Answer: "No"
→ ELIMINATE: [Only list if you're CERTAIN about nationality]
→ REASONING: Rule out people who are definitively American`,
          },
          {
            role: "user",
            content: `Question: "${question}"
Answer: "${answer}"

Current remaining people: ${this.remainingPeople.join(", ")}

STEP-BY-STEP ANALYSIS:
1. What does this Q&A tell us with 100% certainty?
2. Look at each remaining person - should they be eliminated based on this Q&A?
3. EXPLICITLY list out the names of people to eliminate

Respond with a JSON object:
{
  "eliminated": ["Name 1", "Name 2", ...],
  "reasoning": "Brief explanation of why these people are being ruled out"
}

If no one should be eliminated, use: {"eliminated": [], "reasoning": "This question doesn't provide enough certainty to eliminate anyone"}`,
          },
        ],
        temperature: 0.0,
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content || '{"eliminated": [], "reasoning": "Error"}';
      let parsed: { eliminated: string[]; reasoning: string };
      
      try {
        parsed = JSON.parse(content);
      } catch {
        // Fallback to extracting just the array if JSON parsing fails
        const arrayMatch = content.match(/\[.*\]/);
        if (arrayMatch) {
          parsed = { eliminated: JSON.parse(arrayMatch[0]), reasoning: "Auto-extracted" };
        } else {
          parsed = { eliminated: [], reasoning: "Parse error" };
        }
      }
      
      const toEliminate = parsed.eliminated || [];
      
      // Remove eliminated people
      const beforeCount = this.remainingPeople.length;
      this.remainingPeople = this.remainingPeople.filter(
        (person) => !toEliminate.includes(person)
      );
      const eliminated = beforeCount - this.remainingPeople.length;

      console.log(`[Player ${this.playerId}] Question: "${question}"`);
      console.log(`[Player ${this.playerId}] Answer: "${answer}"`);
      console.log(`[Player ${this.playerId}] ELIMINATING ${eliminated} people: ${toEliminate.join(", ")}`);
      console.log(`[Player ${this.playerId}] Reasoning: ${parsed.reasoning}`);
      console.log(`[Player ${this.playerId}] ${this.remainingPeople.length} remaining: ${this.remainingPeople.join(", ")}`);
      
      return { count: eliminated, eliminated: toEliminate };
    } catch (error) {
      console.error("Error eliminating people:", error);
      return { count: 0, eliminated: [] };
    }
  }

  addTurn(turn: QuestionTurn): void {
    this.turns.push(turn);
  }

  getTurns(): QuestionTurn[] {
    return this.turns;
  }

  getRemainingPeople(): string[] {
    return this.remainingPeople;
  }
}

// Helper to extract guessed person from question
function extractGuessedPerson(question: string): string {
  const patterns = [
    /^is it (.+?)\??$/i,
    /^is the person (.+?)\??$/i,
    /^could it be (.+?)\??$/i,
    /^my guess is (.+?)$/i,
    /^i (?:think|guess|believe) (?:it's|it is) (.+?)$/i,
  ];

  for (const pattern of patterns) {
    const match = question.trim().match(pattern);
    if (match) {
      let extracted = match[1].toLowerCase().trim();
      extracted = extracted.replace(/[?.!,;]+$/, '').trim();
      return extracted;
    }
  }
  return "";
}

// Check if guessed person matches the secret
function matchesPerson(guessedPerson: string, secretPerson: string): boolean {
  const normalizedGuess = guessedPerson.toLowerCase().trim();
  const normalizedSecret = secretPerson.toLowerCase().trim();

  // Exact match
  if (normalizedGuess === normalizedSecret) return true;

  // Check if the guess is the last name only
  const secretParts = normalizedSecret.split(/\s+/);
  const lastName = secretParts[secretParts.length - 1];
  if (normalizedGuess === lastName) return true;

  // Check if the guess is the first name only (less common but possible)
  const firstName = secretParts[0];
  if (normalizedGuess === firstName && secretParts.length === 2) {
    // Only match first name if it's unique enough (2-word name)
    return true;
  }

  return false;
}

// API endpoint with streaming
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { player1Policy, player2Policy } = await request.json();

        if (!player1Policy || !player2Policy) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "player1Policy and player2Policy are required" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        // Select two different random celebrities
        const shuffled = [...CELEBRITIES].sort(() => Math.random() - 0.5);
        const player1Target = shuffled[0];
        const player2Target = shuffled[1];

        console.log(`Starting Guess Who game`);
        console.log(`Player 1's secret: "${player1Target}"`);
        console.log(`Player 2's secret: "${player2Target}"`);

        // Send start event with targets
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              player1Target,
              player2Target,
              player1Policy,
              player2Policy,
            })}\n\n`
          )
        );

        // Initialize Answerers
        const answerer1 = new Answerer(player1Target); // Answers for Player 2's questions about Player 1's person
        const answerer2 = new Answerer(player2Target); // Answers for Player 1's questions about Player 2's person

        // Initialize players (each tries to guess opponent's person)
        const player1 = new Player(1, player1Policy, player2Target);
        const player2 = new Player(2, player2Policy, player1Target);

        const maxQuestions = 20;

        // Run both players simultaneously
        const runPlayer = async (
          player: Player,
          answerer: Answerer,
          playerId: 1 | 2,
          targetPerson: string
        ): Promise<PlayerResult> => {
          let correct = false;
          let finalGuess: string | undefined;

          for (let i = 1; i <= maxQuestions; i++) {
            const { question, reasoning } = await player.askQuestion(i, maxQuestions);
            const { answer } = await answerer.answerQuestion(
              question,
              player.getTurns(),
              playerId
            );

            // Check if they guessed correctly FIRST (before elimination)
            const guessedPerson = extractGuessedPerson(question);
            if (guessedPerson && matchesPerson(guessedPerson, targetPerson)) {
              // They guessed correctly!
              const turn: QuestionTurn = { question, answer, reasoning, eliminatedCount: 0, eliminated: [] };
              player.addTurn(turn);
              
              // Stream the final question
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "question",
                    player: playerId,
                    questionNumber: i,
                    turn,
                  })}\n\n`
                )
              );

              correct = true;
              finalGuess = guessedPerson;
              console.log(`Player ${playerId} guessed correctly on question ${i}!`);
              break;
            }

            // Eliminate people based on the answer (if not a correct guess)
            const { count: eliminatedCount, eliminated } = await player.eliminatePeople(question, answer);

            const turn: QuestionTurn = { question, answer, reasoning, eliminatedCount, eliminated };
            player.addTurn(turn);

            // Stream the question
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "question",
                  player: playerId,
                  questionNumber: i,
                  turn,
                })}\n\n`
              )
            );
          }

          return {
            player: playerId,
            turns: player.getTurns(),
            questionsUsed: player.getTurns().length,
            correct,
            finalGuess,
            targetPerson,
          };
        };

        // Run both players in parallel
        const [result1, result2] = await Promise.all([
          runPlayer(player1, answerer2, 1, player2Target),
          runPlayer(player2, answerer1, 2, player1Target),
        ]);

        // Determine winner
        let winner: 1 | 2 | "tie";
        let winnerReason: string;

        if (result1.correct && result2.correct) {
          if (result1.questionsUsed < result2.questionsUsed) {
            winner = 1;
            winnerReason = `Player 1 guessed correctly in ${result1.questionsUsed} questions vs Player 2's ${result2.questionsUsed} questions`;
          } else if (result2.questionsUsed < result1.questionsUsed) {
            winner = 2;
            winnerReason = `Player 2 guessed correctly in ${result2.questionsUsed} questions vs Player 1's ${result1.questionsUsed} questions`;
          } else {
            winner = "tie";
            winnerReason = `Both players guessed correctly in ${result1.questionsUsed} questions`;
          }
        } else if (result1.correct) {
          winner = 1;
          winnerReason = `Player 1 guessed correctly in ${result1.questionsUsed} questions (Player 2 failed)`;
        } else if (result2.correct) {
          winner = 2;
          winnerReason = `Player 2 guessed correctly in ${result2.questionsUsed} questions (Player 1 failed)`;
        } else {
          winner = "tie";
          winnerReason = `Neither player guessed correctly within ${maxQuestions} questions`;
        }

        // Send end event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "end",
              winner,
              winnerReason,
              player1: result1,
              player2: result2,
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error("Error in play-guess-who-stream API:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: "Failed to play game" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

