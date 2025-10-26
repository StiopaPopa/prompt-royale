import { NextRequest, NextResponse } from "next/server";
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

interface GameResult {
  player1: PlayerResult;
  player2: PlayerResult;
  winner: 1 | 2 | "tie";
  winnerReason: string;
  secretObject: string;
  player1Policy: string;
  player2Policy: string;
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
      // Check if it's a direct identity guess
      const isIdentityGuess = await this.isIdentityGuess(question);
      if (isIdentityGuess) {
        const guessedObject = await this.extractGuessedObject(question);
        const matches = this.matchesSecret(guessedObject);
        console.log(`[Player ${playerId}] Identity guess: "${guessedObject}" - ${matches ? "✓ CORRECT" : "✗ INCORRECT"}`);
        return { answer: matches ? "Yes" : "No" };
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

  private async isIdentityGuess(question: string): Promise<boolean> {
    const q = question.trim().toLowerCase();

    // CRITICAL: Generic category/property terms that should NEVER be treated as identity guesses
    // These are broad categories, not specific objects
    const genericTerms = [
      // Basic properties
      'living', 'alive', 'dead', 'man-made', 'natural', 'artificial',
      'edible', 'food', 'drink', 'beverage',

      // Broad categories
      'animal', 'plant', 'person', 'human', 'creature', 'being',
      'object', 'thing', 'item', 'stuff', 'entity',

      // Materials
      'metal', 'wood', 'plastic', 'glass', 'paper', 'fabric', 'cloth',
      'stone', 'concrete', 'rubber', 'leather',

      // General types
      'electronic', 'mechanical', 'digital', 'analog',
      'vehicle', 'tool', 'instrument', 'device', 'machine', 'appliance',
      'furniture', 'equipment', 'container', 'utensil',
      'weapon', 'toy', 'game', 'sport',

      // Locations (broad)
      'building', 'structure', 'place', 'location', 'area', 'space',
      'room', 'spot', 'site', 'venue',

      // Direction/position
      'indoors', 'outdoors', 'inside', 'outside',

      // Size/properties
      'large', 'small', 'big', 'tiny', 'huge', 'massive', 'miniature',
      'heavy', 'light', 'hard', 'soft', 'rough', 'smooth',
      'hot', 'cold', 'warm', 'cool',

      // Abstract
      'abstract', 'concept', 'idea', 'notion', 'theory',
      'tangible', 'intangible', 'physical', 'non-physical',

      // Nature/science
      'celestial', 'terrestrial', 'phenomenon', 'event', 'occurrence',
      'energy', 'force', 'power', 'substance', 'material', 'matter',
      'element', 'compound', 'mixture',

      // Measurements
      'measurement', 'unit', 'quantity', 'amount',

      // Tech/fictional
      'technology', 'invention', 'creation',
      'fictional', 'imaginary', 'real', 'actual',

      // State
      'exists', 'found', 'used', 'made', 'created', 'designed',
      'common', 'rare', 'typical', 'unusual', 'normal', 'special',

      // Purpose
      'useful', 'decorative', 'functional', 'ornamental',

      // Modifiers (commonly used with "thing")
      'living thing', 'physical object', 'natural object', 'man-made object',
      'type of', 'kind of', 'sort of', 'form of',
    ];

    // First extract what's being asked about
    const extracted = await this.extractGuessedObject(question);

    if (!extracted) {
      return false; // Can't determine, treat as regular question
    }

    console.log(`[DEBUG] Extracted from "${question}": "${extracted}"`);

    // Check if the extracted term is a generic category/property
    const isGenericTerm = genericTerms.some(term => {
      // Exact match
      if (extracted === term) return true;

      // Starts with generic term (e.g., "living thing", "physical object")
      if (extracted.startsWith(term + ' ')) return true;

      // Ends with generic term (e.g., "type of food", "kind of animal")
      if (extracted.endsWith(' ' + term)) return true;

      // Contains as separate word
      const words = extracted.split(/\s+/);
      if (words.includes(term)) return true;

      return false;
    });

    if (isGenericTerm) {
      console.log(`[DEBUG] "${extracted}" is a generic term - NOT an identity guess`);
      return false; // This is asking about a category/property, not a specific object
    }

    // Now check if it matches identity guess patterns
    const identityPatterns = [
      // "Is it a/an/the [object]?"
      /^is it (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
      /^is the (?:object|thing|item)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)\??$/i,

      // "Could/might/would it be..."
      /^could it be (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
      /^might it be (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
      /^would it be (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,

      // Guess formats
      /^my (?:final )?guess is (?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
      /^i (?:think|guess|believe) it(?:'s| is) (?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
      /^i'm guessing (?:it's |that it's )?(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,

      // Direct statements
      /^it's (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
      /^the (?:object|thing|answer) is (?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
    ];

    const matchesPattern = identityPatterns.some((pattern) => pattern.test(question.trim()));

    console.log(`[DEBUG] "${extracted}" matches identity pattern: ${matchesPattern}`);

    return matchesPattern;
  }

  private async extractGuessedObject(question: string): Promise<string> {
    // ONLY extract from patterns that include an article (a/an/the)
    // Questions like "Is it living?" should NOT be extracted as they lack specificity
    const patterns = [
      // MUST have article for identity guess
      /^is it (?:a|an|the)\s+(.+?)\??$/i,
      /^is the (?:object|thing|item)\s+(?:a|an|the)?\s*(.+?)\??$/i,
      /^could it be (?:a|an|the)\s+(.+?)\??$/i,
      /^might it be (?:a|an|the)\s+(.+?)\??$/i,
      /^would it be (?:a|an|the)\s+(.+?)\??$/i,

      // Guess formats
      /^my (?:final )?guess is (?:a|an|the)?\s*(.+?)$/i,
      /^i (?:think|guess|believe) it(?:'s| is) (?:a|an|the)?\s*(.+?)$/i,
      /^i'm guessing (?:it's |that it's )?(?:a|an|the)?\s*(.+?)$/i,

      // Direct statements
      /^it's (?:a|an|the)\s+(.+?)\??$/i,
      /^the (?:object|thing|answer) is (?:a|an|the)?\s*(.+?)$/i,
    ];

    for (const pattern of patterns) {
      const match = question.trim().match(pattern);
      if (match) {
        // Remove trailing punctuation and clean up
        let extracted = match[1].toLowerCase().trim();
        extracted = extracted.replace(/[?.!,;]+$/, '').trim();
        return extracted;
      }
    }
    return ""; // No match - not an identity guess format
  }

  private matchesSecret(guessedObject: string): boolean {
    const normalizedGuess = guessedObject.toLowerCase().trim();
    const normalizedSecret = this.secretObject.toLowerCase().trim();

    console.log(`[DEBUG matchesSecret] Comparing guess "${normalizedGuess}" with secret "${normalizedSecret}"`);

    // STRICT MATCHING: Only accept if the guess is essentially the same word as the secret

    // 1. Exact match
    if (normalizedGuess === normalizedSecret) {
      console.log(`[DEBUG matchesSecret] ✓ EXACT MATCH`);
      return true;
    }

    // 2. Simple plural/singular variations (add/remove 's' or 'es')
    if (normalizedGuess + "s" === normalizedSecret) {
      console.log(`[DEBUG matchesSecret] ✓ PLURAL MATCH (guess + s)`);
      return true;
    }
    if (normalizedGuess === normalizedSecret + "s") {
      console.log(`[DEBUG matchesSecret] ✓ SINGULAR MATCH (secret + s)`);
      return true;
    }
    if (normalizedGuess + "es" === normalizedSecret) {
      console.log(`[DEBUG matchesSecret] ✓ PLURAL MATCH (guess + es)`);
      return true;
    }
    if (normalizedGuess === normalizedSecret + "es") {
      console.log(`[DEBUG matchesSecret] ✓ SINGULAR MATCH (secret + es)`);
      return true;
    }

    // 3. Handle multi-word objects like "hot air balloon" or "ice cream"
    // ONLY if the guess and secret have the SAME number of words and ALL words match
    const guessWords = normalizedGuess.split(/\s+/);
    const secretWords = normalizedSecret.split(/\s+/);

    if (guessWords.length > 1 && secretWords.length > 1) {
      // Both are multi-word - check if they're the same length
      if (guessWords.length === secretWords.length) {
        // Check if all words match (in order, allowing for plural variations)
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
        if (allWordsMatch) {
          console.log(`[DEBUG matchesSecret] ✓ MULTI-WORD MATCH`);
          return true;
        }
      }
    }

    // 4. If one is multi-word and the other is single-word, check if single word matches the KEY word
    // Example: secret="hot air balloon", guess="balloon" should match
    // Example: secret="ice cream", guess="cream" should match
    if (secretWords.length > 1 && guessWords.length === 1) {
      // Check if the guess matches the LAST word (usually the key word)
      const keyWord = secretWords[secretWords.length - 1];
      if (
        normalizedGuess === keyWord ||
        normalizedGuess + "s" === keyWord ||
        normalizedGuess === keyWord + "s" ||
        normalizedGuess + "es" === keyWord ||
        normalizedGuess === keyWord + "es"
      ) {
        console.log(`[DEBUG matchesSecret] ✓ KEY WORD MATCH (last word of multi-word secret)`);
        return true;
      }
    }

    console.log(`[DEBUG matchesSecret] ✗ NO MATCH`);
    return false;
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

      // Parse question and reasoning
      const questionMatch = content.match(/QUESTION:\s*(.+)/i);
      const reasoningMatch = content.match(/REASONING:\s*([\s\S]+)/i);

      const question = questionMatch
        ? questionMatch[1].trim()
        : "Is it a physical object?";
      const reasoning = reasoningMatch
        ? reasoningMatch[1].trim().split('\n')[0]
        : "Following my strategy to narrow down the possibilities";

      console.log(`Player ${this.playerId} Q${questionNumber}${isFinalQuestion ? " (FINAL GUESS)" : ""}: ${question}`);
      console.log(`Player ${this.playerId} Reasoning: ${reasoning}`);

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

// Simple winner determination: fewest questions to guess correctly


// Determine winner: fewest questions to guess correctly wins
function determineWinner(
  player1: PlayerResult,
  player2: PlayerResult
): { winner: 1 | 2 | "tie"; reason: string } {
  // If both guessed correctly
  if (player1.correct && player2.correct) {
    if (player1.questionsUsed < player2.questionsUsed) {
      return {
        winner: 1,
        reason: `Player 1 guessed correctly in ${player1.questionsUsed} questions vs Player 2's ${player2.questionsUsed} questions`,
      };
    } else if (player2.questionsUsed < player1.questionsUsed) {
      return {
        winner: 2,
        reason: `Player 2 guessed correctly in ${player2.questionsUsed} questions vs Player 1's ${player1.questionsUsed} questions`,
      };
    } else {
      return {
        winner: "tie",
        reason: `Both players guessed correctly in ${player1.questionsUsed} questions`,
      };
    }
  }

  // If only player 1 guessed correctly
  if (player1.correct) {
    return {
      winner: 1,
      reason: `Player 1 guessed correctly in ${player1.questionsUsed} questions (Player 2 failed)`,
    };
  }

  // If only player 2 guessed correctly
  if (player2.correct) {
    return {
      winner: 2,
      reason: `Player 2 guessed correctly in ${player2.questionsUsed} questions (Player 1 failed)`,
    };
  }

  // If neither guessed correctly
  return {
    winner: "tie",
    reason: `Neither player guessed correctly within 20 questions`,
  };
}

// Main orchestrator
async function runGame(
  secretObject: string,
  maxQuestions: number,
  player1Policy: string,
  player2Policy: string,
  allowHints: boolean
): Promise<GameResult> {
  // Initialize Answerer and build ontology
  const answerer = new Answerer(secretObject, allowHints);
  await answerer.buildOntology();

  // Initialize players
  const player1 = new Player(1, player1Policy);
  const player2 = new Player(2, player2Policy);

  // Run both players in parallel
  const [result1, result2] = await Promise.all([
    runPlayerSession(player1, answerer, maxQuestions, 1),
    runPlayerSession(player2, answerer, maxQuestions, 2),
  ]);

  // Determine winner
  const { winner, reason } = determineWinner(result1, result2);

  return {
    player1: result1,
    player2: result2,
    winner,
    winnerReason: reason,
    secretObject,
    player1Policy,
    player2Policy,
  };
}

async function runPlayerSession(
  player: Player,
  answerer: Answerer,
  maxQuestions: number,
  playerId: 1 | 2
): Promise<PlayerResult> {
  let correct = false;

  for (let i = 1; i <= maxQuestions; i++) {
    const { question, reasoning } = await player.askQuestion(i, maxQuestions);
    const { answer, hint } = await answerer.answerQuestion(
      question,
      player.getTurns(),
      playerId
    );

    player.addTurn({ question, answer, hint, reasoning });

    // Check if it was a correct identity guess
    if (answer === "Yes" && (await isIdentityQuestion(question))) {
      correct = true;
      console.log(`\n🎯 Player ${playerId} guessed correctly on question ${i}!\n`);
      break; // Stop asking questions once guessed correctly
    }
  }

  return {
    player: playerId,
    turns: player.getTurns(),
    questionsUsed: player.getTurns().length,
    correct,
    tokenUsage: player.getTokenUsage(),
  };
}

async function isIdentityQuestion(question: string): Promise<boolean> {
  const q = question.trim().toLowerCase();

  // CRITICAL: Generic category/property terms that should NEVER be treated as identity guesses
  const genericTerms = [
    // Basic properties
    'living', 'alive', 'dead', 'man-made', 'natural', 'artificial',
    'edible', 'food', 'drink', 'beverage',

    // Broad categories
    'animal', 'plant', 'person', 'human', 'creature', 'being',
    'object', 'thing', 'item', 'stuff', 'entity',

    // Materials
    'metal', 'wood', 'plastic', 'glass', 'paper', 'fabric', 'cloth',
    'stone', 'concrete', 'rubber', 'leather',

    // General types
    'electronic', 'mechanical', 'digital', 'analog',
    'vehicle', 'tool', 'instrument', 'device', 'machine', 'appliance',
    'furniture', 'equipment', 'container', 'utensil',
    'weapon', 'toy', 'game', 'sport',

    // Locations (broad)
    'building', 'structure', 'place', 'location', 'area', 'space',
    'room', 'spot', 'site', 'venue',

    // Direction/position
    'indoors', 'outdoors', 'inside', 'outside',

    // Size/properties
    'large', 'small', 'big', 'tiny', 'huge', 'massive', 'miniature',
    'heavy', 'light', 'hard', 'soft', 'rough', 'smooth',
    'hot', 'cold', 'warm', 'cool',

    // Abstract
    'abstract', 'concept', 'idea', 'notion', 'theory',
    'tangible', 'intangible', 'physical', 'non-physical',

    // Nature/science
    'celestial', 'terrestrial', 'phenomenon', 'event', 'occurrence',
    'energy', 'force', 'power', 'substance', 'material', 'matter',
    'element', 'compound', 'mixture',

    // Measurements
    'measurement', 'unit', 'quantity', 'amount',

    // Tech/fictional
    'technology', 'invention', 'creation',
    'fictional', 'imaginary', 'real', 'actual',

    // State
    'exists', 'found', 'used', 'made', 'created', 'designed',
    'common', 'rare', 'typical', 'unusual', 'normal', 'special',

    // Purpose
    'useful', 'decorative', 'functional', 'ornamental',

    // Modifiers (commonly used with "thing")
    'living thing', 'physical object', 'natural object', 'man-made object',
    'type of', 'kind of', 'sort of', 'form of',
  ];

  // Extract the guessed object
  const extracted = await extractGuessedObjectHelper(question);

  if (!extracted) {
    return false;
  }

  console.log(`[DEBUG isIdentityQuestion] Extracted: "${extracted}"`);

  // Check if it's a generic term
  const isGenericTerm = genericTerms.some(term => {
    if (extracted === term) return true;
    if (extracted.startsWith(term + ' ')) return true;
    if (extracted.endsWith(' ' + term)) return true;
    const words = extracted.split(/\s+/);
    if (words.includes(term)) return true;
    return false;
  });

  if (isGenericTerm) {
    console.log(`[DEBUG isIdentityQuestion] "${extracted}" is generic - NOT identity guess`);
    return false;
  }

  // Check if it matches identity patterns
  const identityPatterns = [
    /^is it (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
    /^is the (?:object|thing|item)\s+(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)\??$/i,
    /^could it be (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
    /^might it be (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
    /^would it be (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
    /^my (?:final )?guess is (?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
    /^i (?:think|guess|believe) it(?:'s| is) (?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
    /^i'm guessing (?:it's |that it's )?(?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
    /^it's (?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)\??$/i,
    /^the (?:object|thing|answer) is (?:a|an|the)?\s*([a-z]+(?:\s+[a-z]+)*)$/i,
  ];

  const matches = identityPatterns.some((pattern) => pattern.test(question.trim()));
  console.log(`[DEBUG isIdentityQuestion] "${extracted}" matches pattern: ${matches}`);
  return matches;
}

// Helper function to extract guessed object (used by standalone isIdentityQuestion)
async function extractGuessedObjectHelper(question: string): Promise<string> {
  // ONLY extract from patterns that include an article (a/an/the)
  // Questions like "Is it living?" should NOT be extracted
  const patterns = [
    // MUST have article for identity guess
    /^is it (?:a|an|the)\s+(.+?)\??$/i,
    /^is the (?:object|thing|item)\s+(?:a|an|the)?\s*(.+?)\??$/i,
    /^could it be (?:a|an|the)\s+(.+?)\??$/i,
    /^might it be (?:a|an|the)\s+(.+?)\??$/i,
    /^would it be (?:a|an|the)\s+(.+?)\??$/i,
    /^my (?:final )?guess is (?:a|an|the)?\s*(.+?)$/i,
    /^i (?:think|guess|believe) it(?:'s| is) (?:a|an|the)?\s*(.+?)$/i,
    /^i'm guessing (?:it's |that it's )?(?:a|an|the)?\s*(.+?)$/i,
    /^it's (?:a|an|the)\s+(.+?)\??$/i,
    /^the (?:object|thing|answer) is (?:a|an|the)?\s*(.+?)$/i,
  ];

  for (const pattern of patterns) {
    const match = question.trim().match(pattern);
    if (match) {
      let extracted = match[1].toLowerCase().trim();
      extracted = extracted.replace(/[?.!,;]+$/, '').trim();
      return extracted;
    }
  }
  return ""; // No match - not an identity guess format
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

- Common animals (e.g., "elephant", "dolphin", "penguin", "kangaroo", "octopus")
- Popular foods (e.g., "pizza", "taco", "sushi", "donut", "hamburger", "ice cream")
- Everyday objects (e.g., "toothbrush", "umbrella", "scissors", "lamp", "clock")
- Vehicles (e.g., "bicycle", "helicopter", "skateboard", "submarine", "hot air balloon")
- Musical instruments (e.g., "guitar", "piano", "drums", "trumpet", "violin")
- Technology (e.g., "camera", "microphone", "television", "computer", "telephone")
- Sports equipment (e.g., "basketball", "tennis racket", "bowling ball", "skateboard")
- Household items (e.g., "blender", "toaster", "vacuum", "refrigerator", "sofa")
- Nature (e.g., "volcano", "waterfall", "rainbow", "mountain", "ocean")
- Funny items (e.g., "rubber duck", "garden gnome", "disco ball", "piñata")

CRITICAL REQUIREMENTS:
- Pick WELL-KNOWN objects that a typical person would recognize
- NO obscure, rare, or niche objects
- NO overly technical or specialized items
- Objects should be concrete and specific (not categories)
- Mix serious and playful options
- Keep it fun but fair!

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
    // Fallback to well-known, popular objects only
    const fallbackObjects = [
      // Popular animals (everyone knows these)
      "elephant", "dolphin", "penguin", "kangaroo", "giraffe", "tiger",
      "lion", "monkey", "panda", "koala", "flamingo", "octopus",
      "shark", "butterfly", "eagle", "owl", "parrot", "zebra",

      // Popular foods
      "pizza", "hamburger", "taco", "sushi", "hot dog", "sandwich",
      "ice cream", "donut", "cookie", "cake", "banana", "apple",
      "watermelon", "pineapple", "strawberry", "popcorn", "pretzel",

      // Common vehicles
      "bicycle", "car", "airplane", "boat", "train", "motorcycle",
      "skateboard", "helicopter", "submarine", "rocket", "bus",
      "scooter", "canoe", "jet ski", "hot air balloon",

      // Musical instruments
      "guitar", "piano", "drums", "trumpet", "violin", "flute",
      "saxophone", "harmonica", "accordion", "ukulele", "banjo",

      // Everyday objects
      "umbrella", "toothbrush", "scissors", "key", "book", "pen",
      "pencil", "backpack", "wallet", "mirror", "lamp", "clock",
      "candle", "pillow", "blanket", "towel", "soap", "comb",

      // Technology (common items)
      "camera", "microphone", "television", "telephone", "computer",
      "radio", "calculator", "flashlight", "headphones", "speaker",

      // Sports equipment
      "basketball", "football", "baseball", "soccer ball", "tennis ball",
      "golf club", "bowling ball", "frisbee", "yo-yo", "kite",

      // Household items
      "toaster", "blender", "vacuum", "refrigerator", "microwave",
      "oven", "sofa", "chair", "table", "bed", "dresser",

      // Nature
      "volcano", "waterfall", "rainbow", "mountain", "ocean",
      "tree", "flower", "cloud", "star", "moon", "sun",

      // Fun/playful items
      "rubber duck", "teddy bear", "balloon", "kite", "yo-yo",
      "disco ball", "snowman", "sandcastle", "jack-in-the-box",

      // Structures
      "lighthouse", "castle", "bridge", "statue", "fountain",
      "pyramid", "tower", "barn", "church", "windmill"
    ];
    return fallbackObjects[Math.floor(Math.random() * fallbackObjects.length)];
  }
}

// API endpoint
export async function POST(request: NextRequest) {
  try {
    const { player1Policy, player2Policy, agentAPolicy, agentBPolicy } = await request.json();

    // Support both old (agentA/B) and new (player1/2) naming
    const p1Policy = player1Policy || agentAPolicy;
    const p2Policy = player2Policy || agentBPolicy;

    if (!p1Policy || !p2Policy) {
      return NextResponse.json(
        {
          error: "player1Policy and player2Policy are required",
        },
        { status: 400 }
      );
    }

    // Generate random secret object
    const secretObject = await generateSecretObject();
    const maxQuestions = 20;
    const allowHints = true;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Starting 20 Questions game with secret: "${secretObject}"`);
    console.log(`Max questions: ${maxQuestions}`);
    console.log(`${"=".repeat(60)}\n`);

    const result = await runGame(
      secretObject,
      maxQuestions,
      p1Policy,
      p2Policy,
      allowHints
    );

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🏆 Game complete! Winner: ${result.winner === "tie" ? "TIE" : `Player ${result.winner}`}`);
    console.log(
      `Player 1: ${result.player1.questionsUsed} questions, ${result.player1.correct ? "✓ CORRECT" : "✗ INCORRECT"}`
    );
    console.log(
      `Player 2: ${result.player2.questionsUsed} questions, ${result.player2.correct ? "✓ CORRECT" : "✗ INCORRECT"}`
    );
    console.log(`Reason: ${result.winnerReason}`);
    console.log(`${"=".repeat(60)}\n`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in play-20q API:", error);
    return NextResponse.json(
      { error: "Failed to play game" },
      { status: 500 }
    );
  }
}
