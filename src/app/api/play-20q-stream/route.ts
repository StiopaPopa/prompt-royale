import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey:
    "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",
});

interface QuestionTurn {
  question: string;
  answer: string;
  hint?: string;
  reasoning?: string;
}

interface PlayerResult {
  player: 1 | 2;
  turns: QuestionTurn[];
  questionsUsed: number;
  correct: boolean;
  tokenUsage: number;
}

// Answerer class that holds the secret and answers questions consistently
class Answerer {
  private secretObject: string;
  private ontology: Map<string, boolean | "maybe">;
  private allowHints: boolean;

  constructor(secretObject: string, allowHints: boolean = true) {
    this.secretObject = secretObject.toLowerCase().trim();
    this.allowHints = allowHints;
    this.ontology = new Map();
  }

  async buildOntology(): Promise<void> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are building a comprehensive property ontology for "${this.secretObject}".

Be ACCURATE and TRUTHFUL about the properties. List key facts about this object.

Format each line as: PROPERTY: value

Example for "banana":
is_living: no
is_edible: yes
is_fruit: yes
color_is_yellow: yes
is_man_made: no
is_natural: yes
is_vegetable: no
is_animal: no
is_plant_based: yes
can_be_eaten_raw: yes
has_seeds: yes
is_food: yes
grows_on_trees: no
is_electronic: no
is_metal: no
found_in_kitchen: yes
is_vehicle: no
is_building: no
is_furniture: no
used_for_transportation: no

Provide 25-30 diverse properties covering:
- Living/non-living
- Categories (food, animal, object, place, etc.)
- Physical properties (color, size, material)
- Function/purpose
- Location/where found
- Natural vs man-made

Be specific and accurate!`,
          },
          {
            role: "user",
            content: `Generate comprehensive properties for: ${this.secretObject}`,
          },
        ],
        temperature: 0.0,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || "";
      const lines = content.split("\n");

      for (const line of lines) {
        const match = line.match(/^(.+?):\s*(yes|no|maybe)/i);
        if (match) {
          const property = match[1].trim().toLowerCase();
          const value = match[2].toLowerCase();
          this.ontology.set(
            property,
            value === "yes" ? true : value === "no" ? false : "maybe"
          );
        }
      }

      console.log(`Built ontology for "${this.secretObject}" with ${this.ontology.size} properties`);
    } catch (error) {
      console.error("Error building ontology:", error);
    }
  }

  async answerQuestion(
    question: string,
    questionHistory: QuestionTurn[],
    playerId: 1 | 2
  ): Promise<{ answer: string; hint?: string }> {
    try {
      // Check if it's a direct identity guess by extracting what they're asking about
      const guessedObject = extractGuessedObject(question);
      if (guessedObject) {
        // If they're asking "Is it a [specific thing]?", check if it matches the secret
        const matches = matchesSecret(guessedObject, this.secretObject);
        if (matches) {
          console.log(`[Player ${playerId}] Identity guess: "${guessedObject}" - ✓ CORRECT`);
          return { answer: "Yes" };
        }
        // If it doesn't match the secret but has a guess pattern, it might be a category question
        // Fall through to let the LLM answer it properly
      }

      // Build context from history
      const historyText = questionHistory
        .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`)
        .join("\n");

      // Use LLM to answer the question accurately based on the secret object
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are the Reference/Answerer in a 20 Questions game. The secret object is: "${this.secretObject}"

Your ONLY job is to answer YES/NO questions ACCURATELY and TRUTHFULLY about "${this.secretObject}".

CRITICAL RULES:
- Answer ONLY with: Yes, No, or Maybe
- Base your answer PURELY on REAL FACTS about "${this.secretObject}"
- Answer "Yes" if the statement is TRUE about "${this.secretObject}"
- Answer "No" if the statement is FALSE about "${this.secretObject}"
- Answer "Maybe" ONLY if genuinely ambiguous
- NEVER reveal the identity directly
- BE CONSISTENT - same question should get same answer every time

Examples for "${this.secretObject}":
- If asked "Is it living?" - think: is a ${this.secretObject} alive? Answer truthfully.
- If asked "Is it edible?" - think: can you eat a ${this.secretObject}? Answer truthfully.
- If asked "Is it an animal?" - think: is a ${this.secretObject} an animal? Answer truthfully.`,
          },
          {
            role: "user",
            content: `Player ${playerId} asks: "${question}"

Think step-by-step:
1. What is the secret object? "${this.secretObject}"
2. Is the question TRUE or FALSE about "${this.secretObject}"?
3. Answer accordingly

Respond in this format:
ANSWER: [Yes/No/Maybe]${this.allowHints ? "\nHINT: [optional brief hint if Maybe]" : ""}`,
          },
        ],
        temperature: 0.0,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content || "";
      const answerMatch = content.match(/ANSWER:\s*(Yes|No|Maybe)/i);
      const hintMatch = content.match(/HINT:\s*(.+)/i);

      const answer = answerMatch ? answerMatch[1] : "Maybe";
      const hint =
        this.allowHints && hintMatch ? hintMatch[1].trim() : undefined;

      console.log(`[Player ${playerId}] Q: "${question}" → A: ${answer}${hint ? ` (Hint: ${hint})` : ""}`);
      return { answer, hint };
    } catch (error) {
      console.error("Error answering question:", error);
      return { answer: "Maybe" };
    }
  }
}

// Player class that asks questions based on policy
class Player {
  private playerId: 1 | 2;
  private policy: string;
  private turns: QuestionTurn[];
  private tokenUsage: number;

  constructor(playerId: 1 | 2, policy: string) {
    this.playerId = playerId;
    this.policy = policy;
    this.turns = [];
    this.tokenUsage = 0;
  }

  async askQuestion(questionNumber: number, maxQuestions: number): Promise<{ question: string; reasoning: string }> {
    try {
      const historyText =
        this.turns.length > 0
          ? this.turns
              .map(
                (t, i) =>
                  `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}${t.hint ? `\nHint: ${t.hint}` : ""}`
              )
              .join("\n")
          : "No questions asked yet";

      const isFinalQuestion = questionNumber === maxQuestions;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Player ${this.playerId} playing 20 Questions. Your strategy is:

${this.policy}

Previous questions and answers:
${historyText}

Rules:
- Ask ONE yes/no question at a time
- Use your strategy to narrow down the object
- You can make a direct identity guess (e.g., "Is it a banana?")
- Be strategic and logical
- This is question ${questionNumber} of ${maxQuestions}${
              isFinalQuestion
                ? "\n- ⚠️ THIS IS YOUR FINAL QUESTION - You MUST make a direct identity guess now (e.g., 'Is it a [specific object]?')"
                : ""
            }`,
          },
          {
            role: "user",
            content: `${
              isFinalQuestion
                ? `This is your FINAL question (#${maxQuestions}). You MUST make a direct identity guess based on all the information you've gathered.

Based on all the answers so far, what do you think the object is? Make your final guess in the format "Is it a [object]?"`
                : `Based on your strategy and the previous answers, what is your next question?`
            }

Respond in this format:
QUESTION: [your question${isFinalQuestion ? " - must be a direct guess like 'Is it a banana?'" : ""}]
REASONING: [brief 1-2 sentence explanation of why you're ${isFinalQuestion ? "guessing this object" : "asking this question"} based on your strategy]`,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content?.trim() || "";
      this.tokenUsage += response.usage?.total_tokens || 0;

      const questionMatch = content.match(/QUESTION:\s*(.+)/i);
      const reasoningMatch = content.match(/REASONING:\s*(.+)/is);

      const question = questionMatch
        ? questionMatch[1].trim()
        : "Is it a physical object?";
      const reasoning = reasoningMatch
        ? reasoningMatch[1].trim().split('\n')[0]
        : "Following my strategy to narrow down the possibilities";

      return { question, reasoning };
    } catch (error) {
      console.error(`Error getting question from Player ${this.playerId}:`, error);
      return {
        question: "Is it a physical object?",
        reasoning: "Starting with a basic question",
      };
    }
  }

  addTurn(turn: QuestionTurn): void {
    this.turns.push(turn);
  }

  getTurns(): QuestionTurn[] {
    return this.turns;
  }

  getTokenUsage(): number {
    return this.tokenUsage;
  }
}

// Generate a random secret object using AI
async function generateSecretObject(): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Generate ONE random object for a 20 Questions game.

Choose from DIVERSE categories - pick WELL-KNOWN, COMMON objects that most people would recognize:

- Common animals (e.g., "elephant", "dolphin", "penguin")
- Popular foods (e.g., "pizza", "taco", "sushi")
- Everyday objects (e.g., "toothbrush", "umbrella", "scissors")
- Vehicles (e.g., "bicycle", "helicopter", "skateboard")
- Musical instruments (e.g., "guitar", "piano", "drums")
- Technology (e.g., "camera", "microphone", "television")
- Sports equipment (e.g., "basketball", "tennis racket")
- Household items (e.g., "blender", "toaster", "vacuum")
- Nature (e.g., "volcano", "waterfall", "rainbow")

Respond with ONLY the object name (1-3 words max), nothing else.`,
        },
        {
          role: "user",
          content: "Generate a random object:",
        },
      ],
      temperature: 1.0,
      max_tokens: 20,
    });

    const object = response.choices[0]?.message?.content?.trim() || "banana";
    return object.toLowerCase();
  } catch (error) {
    console.error("Error generating secret object:", error);
    const fallbackObjects = [
      "elephant", "dolphin", "pizza", "guitar", "bicycle",
      "umbrella", "camera", "basketball", "volcano", "rainbow"
    ];
    return fallbackObjects[Math.floor(Math.random() * fallbackObjects.length)];
  }
}

// Helper to extract guessed object from question
function extractGuessedObject(question: string): string {
  const patterns = [
    /^is it (?:a|an|the)\s+(.+?)\??$/i,
    /^could it be (?:a|an|the)\s+(.+?)\??$/i,
    /^might it be (?:a|an|the)\s+(.+?)\??$/i,
    /^my (?:final )?guess is (?:a|an|the)?\s*(.+?)$/i,
    /^i (?:think|guess|believe) it(?:'s| is) (?:a|an|the)?\s*(.+?)$/i,
    /^it's (?:a|an|the)\s+(.+?)\??$/i,
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

// Check if guessed object matches the secret
function matchesSecret(guessedObject: string, secretObject: string): boolean {
  const normalizedGuess = guessedObject.toLowerCase().trim();
  const normalizedSecret = secretObject.toLowerCase().trim();

  // Exact match
  if (normalizedGuess === normalizedSecret) return true;
  
  // Simple plural/singular variations
  if (normalizedGuess + "s" === normalizedSecret) return true;
  if (normalizedGuess === normalizedSecret + "s") return true;
  if (normalizedGuess + "es" === normalizedSecret) return true;
  if (normalizedGuess === normalizedSecret + "es") return true;

  // Handle multi-word objects
  const guessWords = normalizedGuess.split(/\s+/);
  const secretWords = normalizedSecret.split(/\s+/);

  if (guessWords.length > 1 && secretWords.length > 1) {
    if (guessWords.length === secretWords.length) {
      const allWordsMatch = guessWords.every((guessWord, i) => {
        const secretWord = secretWords[i];
        return (
          guessWord === secretWord ||
          guessWord + "s" === secretWord ||
          guessWord === secretWord + "s" ||
          guessWord + "es" === secretWord ||
          guessWord === secretWord + "es"
        );
      });
      if (allWordsMatch) return true;
    }
  }

  // Check if single word matches the key word of multi-word secret
  if (secretWords.length > 1 && guessWords.length === 1) {
    const keyWord = secretWords[secretWords.length - 1];
    if (
      normalizedGuess === keyWord ||
      normalizedGuess + "s" === keyWord ||
      normalizedGuess === keyWord + "s" ||
      normalizedGuess + "es" === keyWord ||
      normalizedGuess === keyWord + "es"
    ) {
      return true;
    }
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

        // Generate secret object
        const secretObject = await generateSecretObject();
        const maxQuestions = 20;
        const allowHints = true;

        console.log(`Starting 20 Questions game with secret: "${secretObject}"`);

        // Send start event with secret object
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              secretObject,
              player1Policy,
              player2Policy,
            })}\n\n`
          )
        );

        // Initialize Answerer and build ontology
        const answerer = new Answerer(secretObject, allowHints);
        await answerer.buildOntology();

        // Initialize players
        const player1 = new Player(1, player1Policy);
        const player2 = new Player(2, player2Policy);

        // Run both players simultaneously
        const runPlayer = async (
          player: Player,
          playerId: 1 | 2
        ): Promise<PlayerResult> => {
          let correct = false;

          for (let i = 1; i <= maxQuestions; i++) {
            const { question, reasoning } = await player.askQuestion(i, maxQuestions);
            const { answer, hint } = await answerer.answerQuestion(
              question,
              player.getTurns(),
              playerId
            );

            const turn: QuestionTurn = { question, answer, hint, reasoning };
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

              // Check if it was a correct identity guess
              // Simple logic: extract what they guessed and see if it matches the secret
              const guessedObject = extractGuessedObject(question);
              if (guessedObject && matchesSecret(guessedObject, secretObject)) {
                correct = true;
                console.log(`Player ${playerId} guessed correctly on question ${i}!`);
                break;
              }
          }

          return {
            player: playerId,
            turns: player.getTurns(),
            questionsUsed: player.getTurns().length,
            correct,
            tokenUsage: player.getTokenUsage(),
          };
        };

        // Run both players in parallel
        const [result1, result2] = await Promise.all([
          runPlayer(player1, 1),
          runPlayer(player2, 2),
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
          winnerReason = `Neither player guessed correctly within 20 questions`;
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
        console.error("Error in play-20q-stream API:", error);
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

