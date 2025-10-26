"use client";

import { useState } from "react";
import Link from "next/link";

type GamePhase = "setup" | "playing" | "finished";

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
  remainingPeople?: string[];
}

interface GameResult {
  player1: PlayerResult;
  player2: PlayerResult;
  winner: 1 | 2 | "tie";
  winnerReason: string;
  player1Policy: string;
  player2Policy: string;
}

// Fixed set of 24 diverse celebrities with images
const CELEBRITIES = [
  {
    name: "Taylor Swift",
    field: "Music",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=TaylorSwift",
  },
  {
    name: "LeBron James",
    field: "Sports",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=LeBronJames",
  },
  {
    name: "Elon Musk",
    field: "Technology",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=ElonMusk",
  },
  {
    name: "Oprah Winfrey",
    field: "Media",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=OprahWinfrey",
  },
  {
    name: "Albert Einstein",
    field: "Science",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlbertEinstein",
  },
  {
    name: "Marie Curie",
    field: "Science",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=MarieCurie",
  },
  {
    name: "Barack Obama",
    field: "Politics",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=BarackObama",
  },
  {
    name: "Beyoncé",
    field: "Music",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Beyonce",
  },
  {
    name: "Leonardo DiCaprio",
    field: "Film",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=LeonardoDiCaprio",
  },
  {
    name: "Serena Williams",
    field: "Sports",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=SerenaWilliams",
  },
  {
    name: "Bill Gates",
    field: "Technology",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=BillGates",
  },
  {
    name: "J.K. Rowling",
    field: "Literature",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=JKRowling",
  },
  {
    name: "Michael Jordan",
    field: "Sports",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelJordan",
  },
  {
    name: "Meryl Streep",
    field: "Film",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=MerylStreep",
  },
  {
    name: "Stephen Hawking",
    field: "Science",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=StephenHawking",
  },
  {
    name: "Malala Yousafzai",
    field: "Activism",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=MalalaYousafzai",
  },
  {
    name: "Ed Sheeran",
    field: "Music",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=EdSheeran",
  },
  {
    name: "Tom Hanks",
    field: "Film",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=TomHanks",
  },
  {
    name: "Cristiano Ronaldo",
    field: "Sports",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=CristianoRonaldo",
  },
  {
    name: "Steve Jobs",
    field: "Technology",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=SteveJobs",
  },
  {
    name: "Ruth Bader Ginsburg",
    field: "Law",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=RuthBaderGinsburg",
  },
  {
    name: "Dwayne Johnson",
    field: "Film",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=DwayneJohnson",
  },
  {
    name: "Rihanna",
    field: "Music",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rihanna",
  },
  {
    name: "Neil Armstrong",
    field: "Science",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=NeilArmstrong",
  },
];

export default function GuessWhoPage() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [player1Policy, setPlayer1Policy] = useState("");
  const [player2Policy, setPlayer2Policy] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [showPlayer1Turns, setShowPlayer1Turns] = useState(true);
  const [showPlayer2Turns, setShowPlayer2Turns] = useState(true);
  const [player1Eliminated, setPlayer1Eliminated] = useState<Set<string>>(
    new Set()
  );
  const [player2Eliminated, setPlayer2Eliminated] = useState<Set<string>>(
    new Set()
  );
  const [currentCommentary, setCurrentCommentary] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const generateEndSummary = async (result: GameResult): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        // Step 1: Generate end summary text from API
        const summaryResponse = await fetch("/api/guess-who-end-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            winner: result.winner,
            winnerReason: result.winnerReason,
            player1Policy: result.player1Policy,
            player2Policy: result.player2Policy,
            player1QuestionsUsed: result.player1.questionsUsed,
            player2QuestionsUsed: result.player2.questionsUsed,
            player1Correct: result.player1.correct,
            player2Correct: result.player2.correct,
            player1Target: result.player1.targetPerson,
            player2Target: result.player2.targetPerson,
          }),
        });

        const { summary } = await summaryResponse.json();
        setCurrentCommentary(summary);

        // Step 2: Convert summary text to audio via TTS
        const ttsResponse = await fetch("/api/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: summary }),
        });

        const audioBlob = await ttsResponse.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Step 3: Play audio and wait for completion
        setIsPlayingAudio(true);
        audio.onended = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        await audio.play();
      } catch (error) {
        console.error("Error generating end summary:", error);
        setIsPlayingAudio(false);
        resolve();
      }
    });
  };

  const handleStartGame = async () => {
    if (!player1Policy.trim() || !player2Policy.trim()) {
      alert("Please fill in both player strategy prompts before starting.");
      return;
    }

    setPhase("playing");

    try {
      const response = await fetch("/api/play-guess-who-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player1Policy: player1Policy.trim(),
          player2Policy: player2Policy.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let player1Turns: QuestionTurn[] = [];
      let player2Turns: QuestionTurn[] = [];
      let gameEnd: {
        winner: 1 | 2 | "tie";
        winnerReason: string;
        player1: PlayerResult;
        player2: PlayerResult;
      } | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.type === "start") {
                // Game started
                setResult({
                  player1: {
                    player: 1,
                    turns: [],
                    questionsUsed: 0,
                    correct: false,
                    targetPerson: data.player2Target, // Player 1 tries to guess Player 2's secret person
                  },
                  player2: {
                    player: 2,
                    turns: [],
                    questionsUsed: 0,
                    correct: false,
                    targetPerson: data.player1Target, // Player 2 tries to guess Player 1's secret person
                  },
                  winner: "tie",
                  winnerReason: "",
                  player1Policy: data.player1Policy,
                  player2Policy: data.player2Policy,
                });
              } else if (data.type === "question") {
                // New question received
                if (data.player === 1) {
                  player1Turns.push(data.turn);
                  // Track eliminated people for Player 1
                  if (data.turn.eliminated && data.turn.eliminated.length > 0) {
                    console.log(
                      `🎯 Player 1 eliminating ${data.turn.eliminated.length} people:`,
                      data.turn.eliminated
                    );
                    setPlayer1Eliminated((prev) => {
                      const newSet = new Set(prev);
                      data.turn.eliminated.forEach((name: string) =>
                        newSet.add(name)
                      );
                      console.log(
                        `📊 Player 1 total eliminated: ${newSet.size}/24`
                      );
                      return newSet;
                    });
                  } else {
                    console.log(`⚪ Player 1 eliminated no one this round`);
                  }
                } else {
                  player2Turns.push(data.turn);
                  // Track eliminated people for Player 2
                  if (data.turn.eliminated && data.turn.eliminated.length > 0) {
                    console.log(
                      `🎯 Player 2 eliminating ${data.turn.eliminated.length} people:`,
                      data.turn.eliminated
                    );
                    setPlayer2Eliminated((prev) => {
                      const newSet = new Set(prev);
                      data.turn.eliminated.forEach((name: string) =>
                        newSet.add(name)
                      );
                      console.log(
                        `📊 Player 2 total eliminated: ${newSet.size}/24`
                      );
                      return newSet;
                    });
                  } else {
                    console.log(`⚪ Player 2 eliminated no one this round`);
                  }
                }

                setResult((prev) => ({
                  ...prev!,
                  player1: {
                    ...prev!.player1,
                    turns: [...player1Turns],
                    questionsUsed: player1Turns.length,
                    remainingPeople: data.turn.eliminated
                      ? CELEBRITIES.filter(
                          (celeb) => !player1Eliminated.has(celeb.name)
                        ).map((c) => c.name)
                      : prev!.player1.remainingPeople,
                  },
                  player2: {
                    ...prev!.player2,
                    turns: [...player2Turns],
                    questionsUsed: player2Turns.length,
                    remainingPeople: data.turn.eliminated
                      ? CELEBRITIES.filter(
                          (celeb) => !player2Eliminated.has(celeb.name)
                        ).map((c) => c.name)
                      : prev!.player2.remainingPeople,
                  },
                }));

                // Small delay for visual effect
                await new Promise((resolve) => setTimeout(resolve, 200));
              } else if (data.type === "end") {
                // Game ended
                gameEnd = {
                  winner: data.winner,
                  winnerReason: data.winnerReason,
                  player1: data.player1,
                  player2: data.player2,
                };
              }
            }
          }
        }
      }

      // Update final result
      if (gameEnd) {
        const finalResult = {
          ...result!,
          winner: gameEnd.winner,
          winnerReason: gameEnd.winnerReason,
          player1: gameEnd.player1,
          player2: gameEnd.player2,
        };

        setResult(finalResult);
        setPhase("finished");

        // Generate end summary with TTS
        await generateEndSummary(finalResult);
      } else {
        setPhase("finished");
      }
    } catch (error) {
      console.error("Error playing game:", error);
      alert("An error occurred while playing the game. Please try again.");
      setPhase("setup");
    }
  };

  const handlePlayAgain = () => {
    setPhase("setup");
    setPlayer1Policy("");
    setPlayer2Policy("");
    setResult(null);
    setShowPlayer1Turns(true);
    setShowPlayer2Turns(true);
    setPlayer1Eliminated(new Set());
    setPlayer2Eliminated(new Set());
    setCurrentCommentary("");
    setIsPlayingAudio(false);
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto">
      {/* Celebrity Grid */}
      <div className="bg-[#111111] rounded-lg p-4 border border-gray-800/50 mb-8">
        <h2 className="text-base font-semibold text-white mb-3 text-center">
          Celebrity Pool (24 People)
        </h2>
        <div className="grid grid-cols-6 gap-1.5">
          {CELEBRITIES.map((celeb, idx) => (
            <div
              key={idx}
              className="bg-black/40 border border-gray-800 rounded p-1 text-center hover:bg-gray-800/40 transition-colors"
            >
              <div className="aspect-square mb-0.5 rounded overflow-hidden bg-gray-700">
                <img
                  src={celeb.image}
                  alt={celeb.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="text-[9px] text-white font-medium truncate"
                title={celeb.name}
              >
                {celeb.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Player 1 */}
        <div className="bg-[#111111] rounded-lg p-6 border border-blue-500/30">
          <h2 className="text-xl font-semibold text-blue-400 mb-4">Player 1</h2>
          <label className="block text-gray-400 mb-2 text-sm">
            Enter your strategy prompt:
          </label>
          <textarea
            value={player1Policy}
            onChange={(e) => setPlayer1Policy(e.target.value)}
            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
            placeholder="Example: Start by asking about their field (music, sports, etc.), then narrow down by gender, then specific achievements."
          />
        </div>

        {/* Player 2 */}
        <div className="bg-[#111111] rounded-lg p-6 border border-red-500/30">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Player 2</h2>
          <label className="block text-gray-400 mb-2 text-sm">
            Enter your strategy prompt:
          </label>
          <textarea
            value={player2Policy}
            onChange={(e) => setPlayer2Policy(e.target.value)}
            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none placeholder:text-gray-600"
            placeholder="Example: Use binary search - ask questions that eliminate half the remaining people each time."
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleStartGame}
          className="bg-white text-black hover:bg-gray-100 font-medium py-3 px-10 rounded-lg text-base transition-all duration-200"
        >
          Start Battle
        </button>
      </div>
    </div>
  );

  const renderPlaying = () => {
    if (!result) {
      return (
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-12">
              <div className="text-6xl mb-6 animate-pulse">🎭</div>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Starting Battle
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Selecting secret celebrities...
              </p>
              <div className="flex justify-center items-center gap-3">
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const { player1, player2 } = result;

    return (
      <div className="max-w-6xl mx-auto">
        {/* Target People Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Player 1's Target (Player 2's Secret)
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <img
                    src={
                      CELEBRITIES.find((c) => c.name === player1.targetPerson)
                        ?.image
                    }
                    alt={player1.targetPerson}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {player1.targetPerson}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Player 1 is trying to guess this
              </div>
            </div>
          </div>

          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Player 2's Target (Player 1's Secret)
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <img
                    src={
                      CELEBRITIES.find((c) => c.name === player2.targetPerson)
                        ?.image
                    }
                    alt={player2.targetPerson}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {player2.targetPerson}
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Player 2 is trying to guess this
              </div>
            </div>
          </div>
        </div>

        {/* Celebrity Grids - Show elimination progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Player 1's Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-4">
            <h3 className="text-blue-400 text-xs font-medium mb-3 uppercase tracking-wider text-center">
              Player 1's View ({24 - player1Eliminated.size} remaining)
            </h3>
            <div className="grid grid-cols-6 gap-1.5">
              {CELEBRITIES.map((celeb, idx) => {
                const isEliminated = player1Eliminated.has(celeb.name);
                const isTarget = celeb.name === player2.targetPerson;
                return (
                  <div
                    key={idx}
                    className={`bg-black/40 border rounded p-1 text-center transition-all ${
                      isEliminated
                        ? "opacity-30 border-gray-700"
                        : "border-gray-800"
                    } ${isTarget ? "ring-1 ring-blue-400/50" : ""}`}
                  >
                    <div
                      className={`aspect-square mb-0.5 rounded overflow-hidden bg-gray-700 relative ${
                        isEliminated ? "grayscale" : ""
                      }`}
                    >
                      <img
                        src={celeb.image}
                        alt={celeb.name}
                        className="w-full h-full object-cover"
                      />
                      {isEliminated && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="w-full h-0.5 bg-red-500 rotate-45 transform scale-150"></div>
                          <div className="w-full h-0.5 bg-red-500 -rotate-45 transform scale-150 absolute"></div>
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-[9px] font-medium truncate ${
                        isEliminated
                          ? "text-gray-600 line-through"
                          : "text-white"
                      }`}
                      title={celeb.name}
                    >
                      {celeb.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player 2's Grid */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-4">
            <h3 className="text-red-400 text-xs font-medium mb-3 uppercase tracking-wider text-center">
              Player 2's View ({24 - player2Eliminated.size} remaining)
            </h3>
            <div className="grid grid-cols-6 gap-1.5">
              {CELEBRITIES.map((celeb, idx) => {
                const isEliminated = player2Eliminated.has(celeb.name);
                const isTarget = celeb.name === player1.targetPerson;
                return (
                  <div
                    key={idx}
                    className={`bg-black/40 border rounded p-1 text-center transition-all ${
                      isEliminated
                        ? "opacity-30 border-gray-700"
                        : "border-gray-800"
                    } ${isTarget ? "ring-1 ring-red-400/50" : ""}`}
                  >
                    <div
                      className={`aspect-square mb-0.5 rounded overflow-hidden bg-gray-700 relative ${
                        isEliminated ? "grayscale" : ""
                      }`}
                    >
                      <img
                        src={celeb.image}
                        alt={celeb.name}
                        className="w-full h-full object-cover"
                      />
                      {isEliminated && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="w-full h-0.5 bg-red-500 rotate-45 transform scale-150"></div>
                          <div className="w-full h-0.5 bg-red-500 -rotate-45 transform scale-150 absolute"></div>
                        </div>
                      )}
                    </div>
                    <div
                      className={`text-[9px] font-medium truncate ${
                        isEliminated
                          ? "text-gray-600 line-through"
                          : "text-white"
                      }`}
                      title={celeb.name}
                    >
                      {celeb.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Player Strategies Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Player 1 Strategy
            </h3>
            <div className="text-gray-400 text-sm leading-relaxed">
              {player1Policy}
            </div>
          </div>

          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
              Player 2 Strategy
            </h3>
            <div className="text-gray-400 text-sm leading-relaxed">
              {player2Policy}
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">
                Player 1
              </div>
              <div className="text-4xl font-mono font-bold text-blue-400">
                {player1.questionsUsed}
              </div>
              <div className="text-xs text-gray-500 mt-1">questions asked</div>
            </div>

            <div>
              <div className="text-xs text-red-400 uppercase tracking-wider mb-2">
                Player 2
              </div>
              <div className="text-4xl font-mono font-bold text-red-400">
                {player2.questionsUsed}
              </div>
              <div className="text-xs text-gray-500 mt-1">questions asked</div>
            </div>
          </div>
        </div>

        {/* Question History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Questions */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-blue-400">
                Player 1 Questions
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-3">
                {player1.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first question...
                  </div>
                ) : (
                  player1.turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className="bg-black/40 border border-gray-800 rounded-lg p-4 animate-fadeIn"
                    >
                      <div className="text-xs text-gray-500 mb-2">
                        Question {idx + 1}
                      </div>
                      <div className="text-white mb-2 font-medium text-sm">
                        {turn.question}
                      </div>
                      {turn.reasoning && (
                        <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-blue-400">
                          <span className="text-xs font-bold text-blue-300">
                            Reasoning:{" "}
                          </span>
                          <span className="text-xs text-gray-300 italic">
                            {turn.reasoning}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-green-400">
                          Answer:
                        </span>
                        <span className="text-xs text-green-300">
                          {turn.answer}
                        </span>
                      </div>
                      {turn.eliminated && turn.eliminated.length > 0 && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs font-bold text-red-400">
                              ❌ Eliminated:
                            </span>
                            <span className="text-xs text-red-300">
                              {turn.eliminated.length} people
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 leading-relaxed">
                            {turn.eliminated.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Player 2 Questions */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-red-400">
                Player 2 Questions
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-3">
                {player2.turns.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first question...
                  </div>
                ) : (
                  player2.turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className="bg-black/40 border border-gray-800 rounded-lg p-4 animate-fadeIn"
                    >
                      <div className="text-xs text-gray-500 mb-2">
                        Question {idx + 1}
                      </div>
                      <div className="text-white mb-2 font-medium text-sm">
                        {turn.question}
                      </div>
                      {turn.reasoning && (
                        <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-red-400">
                          <span className="text-xs font-bold text-red-300">
                            Reasoning:{" "}
                          </span>
                          <span className="text-xs text-gray-300 italic">
                            {turn.reasoning}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-green-400">
                          Answer:
                        </span>
                        <span className="text-xs text-green-300">
                          {turn.answer}
                        </span>
                      </div>
                      {turn.eliminated && turn.eliminated.length > 0 && (
                        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-xs font-bold text-red-400">
                              ❌ Eliminated:
                            </span>
                            <span className="text-xs text-red-300">
                              {turn.eliminated.length} people
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 leading-relaxed">
                            {turn.eliminated.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinished = () => {
    if (!result) return null;

    const { player1, player2, winner, winnerReason } = result;

    return (
      <div className="max-w-6xl mx-auto">
        <div className="space-y-8">
          {/* Secret People Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  Player 1's Secret Person
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    <img
                      src={
                        CELEBRITIES.find((c) => c.name === player1.targetPerson)
                          ?.image
                      }
                      alt={player1.targetPerson}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-3xl font-bold text-blue-400">
                    {player1.targetPerson}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <div className="flex flex-col items-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  Player 2's Secret Person
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                    <img
                      src={
                        CELEBRITIES.find((c) => c.name === player2.targetPerson)
                          ?.image
                      }
                      alt={player2.targetPerson}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-3xl font-bold text-red-400">
                    {player2.targetPerson}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Winner Banner */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8">
            <div className="text-center mb-6">
              <div
                className={`text-3xl font-semibold mb-2 ${
                  winner === "tie"
                    ? "text-yellow-400"
                    : winner === 1
                    ? "text-blue-400"
                    : "text-red-400"
                }`}
              >
                {winner === "tie" ? "It's a Tie" : `Player ${winner} Wins`}
              </div>
              <div className="text-sm text-gray-400 mt-2">{winnerReason}</div>
            </div>

            {/* Commentary Section */}
            {currentCommentary && (
              <div className="mb-6">
                <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {isPlayingAudio ? "🔊" : "💬"}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {isPlayingAudio ? "Playing Commentary..." : "Game Summary"}
                      </div>
                      <div className="text-white text-sm leading-relaxed">
                        {currentCommentary}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto mb-6">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {player1.questionsUsed}
                </div>
                <div className="text-xs text-gray-500 mt-1">P1 Questions</div>
                <div className="text-xs mt-1">
                  {player1.correct ? (
                    <span className="text-green-400">✓ Correct</span>
                  ) : (
                    <span className="text-red-400">✗ Failed</span>
                  )}
                </div>
              </div>
              <div className="text-center flex items-center justify-center">
                <div className="text-4xl">
                  {winner === 1 ? "👈" : winner === 2 ? "👉" : "🤝"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-red-400">
                  {player2.questionsUsed}
                </div>
                <div className="text-xs text-gray-500 mt-1">P2 Questions</div>
                <div className="text-xs mt-1">
                  {player2.correct ? (
                    <span className="text-green-400">✓ Correct</span>
                  ) : (
                    <span className="text-red-400">✗ Failed</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handlePlayAgain}
                className="bg-white text-black hover:bg-gray-100 font-medium py-2 px-6 rounded-lg text-sm transition-all duration-200"
              >
                Play Again
              </button>
            </div>
          </div>

          {/* Question History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Questions */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-blue-400">
                  Player 1 Questions
                </h3>
                <button
                  onClick={() => setShowPlayer1Turns(!showPlayer1Turns)}
                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                >
                  {showPlayer1Turns ? "Hide" : "Show"}
                </button>
              </div>
              {showPlayer1Turns && (
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {player1.turns.map((turn, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border border-gray-800 rounded-lg p-4"
                      >
                        <div className="text-xs text-gray-500 mb-2">
                          Question {idx + 1}
                        </div>
                        <div className="text-white mb-2 font-medium text-sm">
                          {turn.question}
                        </div>
                        {turn.reasoning && (
                          <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-blue-400">
                            <span className="text-xs font-bold text-blue-300">
                              Reasoning:{" "}
                            </span>
                            <span className="text-xs text-gray-300 italic">
                              {turn.reasoning}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-green-400">
                            Answer:
                          </span>
                          <span className="text-xs text-green-300">
                            {turn.answer}
                          </span>
                        </div>
                        {turn.eliminated && turn.eliminated.length > 0 && (
                          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-xs font-bold text-red-400">
                                ❌ Eliminated:
                              </span>
                              <span className="text-xs text-red-300">
                                {turn.eliminated.length} people
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 leading-relaxed">
                              {turn.eliminated.join(", ")}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Player 2 Questions */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-red-400">
                  Player 2 Questions
                </h3>
                <button
                  onClick={() => setShowPlayer2Turns(!showPlayer2Turns)}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  {showPlayer2Turns ? "Hide" : "Show"}
                </button>
              </div>
              {showPlayer2Turns && (
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {player2.turns.map((turn, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border border-gray-800 rounded-lg p-4"
                      >
                        <div className="text-xs text-gray-500 mb-2">
                          Question {idx + 1}
                        </div>
                        <div className="text-white mb-2 font-medium text-sm">
                          {turn.question}
                        </div>
                        {turn.reasoning && (
                          <div className="mb-2 p-2 bg-gray-800/50 rounded border-l-2 border-red-400">
                            <span className="text-xs font-bold text-red-300">
                              Reasoning:{" "}
                            </span>
                            <span className="text-xs text-gray-300 italic">
                              {turn.reasoning}
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-green-400">
                            Answer:
                          </span>
                          <span className="text-xs text-green-300">
                            {turn.answer}
                          </span>
                        </div>
                        {turn.eliminatedCount !== undefined &&
                          turn.eliminatedCount > 0 && (
                            <div className="mt-2">
                              <div className="flex items-start gap-2 mb-1">
                                <span className="text-xs font-bold text-yellow-400">
                                  Eliminated:
                                </span>
                                <span className="text-xs text-yellow-300">
                                  {turn.eliminatedCount} people
                                </span>
                              </div>
                              {turn.eliminated &&
                                turn.eliminated.length > 0 && (
                                  <div className="text-[10px] text-gray-500 italic">
                                    {turn.eliminated.join(", ")}
                                  </div>
                                )}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Final Celebrity Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Player 1's Final Grid */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-4">
              <h3 className="text-blue-400 text-xs font-medium mb-3 uppercase tracking-wider text-center">
                Player 1's Final View ({player1.remainingPeople?.length || 0}{" "}
                remaining)
              </h3>
              <div className="grid grid-cols-6 gap-1.5">
                {CELEBRITIES.map((celeb, idx) => {
                  const isEliminated = !player1.remainingPeople?.includes(
                    celeb.name
                  );
                  const isTarget = celeb.name === player2.targetPerson;
                  return (
                    <div
                      key={idx}
                      className={`bg-black/40 border rounded p-1 text-center transition-all ${
                        isEliminated
                          ? "opacity-30 border-gray-700"
                          : "border-gray-800"
                      } ${isTarget ? "ring-2 ring-blue-400" : ""}`}
                    >
                      <div
                        className={`aspect-square mb-0.5 rounded overflow-hidden bg-gray-700 relative ${
                          isEliminated ? "grayscale" : ""
                        }`}
                      >
                        <img
                          src={celeb.image}
                          alt={celeb.name}
                          className="w-full h-full object-cover"
                        />
                        {isEliminated && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 transform scale-150"></div>
                            <div className="w-full h-0.5 bg-red-500 -rotate-45 transform scale-150 absolute"></div>
                          </div>
                        )}
                        {isTarget && !isEliminated && (
                          <div className="absolute inset-0 ring-2 ring-blue-400 rounded"></div>
                        )}
                      </div>
                      <div
                        className={`text-[9px] font-medium truncate ${
                          isEliminated
                            ? "text-gray-600 line-through"
                            : "text-white"
                        }`}
                        title={celeb.name}
                      >
                        {celeb.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Player 2's Final Grid */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-4">
              <h3 className="text-red-400 text-xs font-medium mb-3 uppercase tracking-wider text-center">
                Player 2's Final View ({player2.remainingPeople?.length || 0}{" "}
                remaining)
              </h3>
              <div className="grid grid-cols-6 gap-1.5">
                {CELEBRITIES.map((celeb, idx) => {
                  const isEliminated = !player2.remainingPeople?.includes(
                    celeb.name
                  );
                  const isTarget = celeb.name === player1.targetPerson;
                  return (
                    <div
                      key={idx}
                      className={`bg-black/40 border rounded p-1 text-center transition-all ${
                        isEliminated
                          ? "opacity-30 border-gray-700"
                          : "border-gray-800"
                      } ${isTarget ? "ring-2 ring-red-400" : ""}`}
                    >
                      <div
                        className={`aspect-square mb-0.5 rounded overflow-hidden bg-gray-700 relative ${
                          isEliminated ? "grayscale" : ""
                        }`}
                      >
                        <img
                          src={celeb.image}
                          alt={celeb.name}
                          className="w-full h-full object-cover"
                        />
                        {isEliminated && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-full h-0.5 bg-red-500 rotate-45 transform scale-150"></div>
                            <div className="w-full h-0.5 bg-red-500 -rotate-45 transform scale-150 absolute"></div>
                          </div>
                        )}
                        {isTarget && !isEliminated && (
                          <div className="absolute inset-0 ring-2 ring-red-400 rounded"></div>
                        )}
                      </div>
                      <div
                        className={`text-[9px] font-medium truncate ${
                          isEliminated
                            ? "text-gray-600 line-through"
                            : "text-white"
                        }`}
                        title={celeb.name}
                      >
                        {celeb.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Player Strategies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Strategy */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <h3 className="text-blue-400 text-sm font-medium mb-3 uppercase tracking-wider">
                Player 1 Strategy
              </h3>
              <div className="text-gray-400 text-sm leading-relaxed">
                {result.player1Policy}
              </div>
            </div>

            {/* Player 2 Strategy */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <h3 className="text-red-400 text-sm font-medium mb-3 uppercase tracking-wider">
                Player 2 Strategy
              </h3>
              <div className="text-gray-400 text-sm leading-relaxed">
                {result.player2Policy}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-800/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="font-mono-brand text-xl text-white">
                prompt-royale
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Games
                </Link>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-gray-400 hover:text-white mb-4 inline-block text-sm transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-4xl font-semibold text-white mb-2">
            Guess Who Battle
          </h1>
          <p className="text-gray-400">
            Deduce the secret celebrity through strategic yes/no questions
          </p>
        </div>

        {phase === "setup" && renderSetup()}
        {phase === "playing" && renderPlaying()}
        {phase === "finished" && renderFinished()}
      </div>
    </div>
  );
}
