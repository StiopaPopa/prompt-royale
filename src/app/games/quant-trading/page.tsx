"use client";

import { useState } from "react";
import Link from "next/link";

type GamePhase = "setup" | "playing" | "finished";

interface TradingDecision {
  action: "buy" | "sell" | "pass";
  units: number;
  reasoning: string;
  price: number;
  date: string;
  pnl: number;
  totalPnl: number;
  cash: number;
  shares: number;
  position: number; // Net position: positive = long, negative = short
}

interface PlayerResult {
  player: 1 | 2;
  decisions: TradingDecision[];
  finalPnl: number;
  finalCash: number;
  finalShares: number;
  totalReturn: number;
  strategy: string;
}

interface GameResult {
  player1: PlayerResult;
  player2: PlayerResult;
  winner: 1 | 2 | "tie";
  winnerReason: string;
  asset: string;
  startPrice: number;
  endPrice: number;
  totalReturn: number;
}

export default function QuantTradingPage() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [player1Strategy, setPlayer1Strategy] = useState("");
  const [player2Strategy, setPlayer2Strategy] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [showPlayer1Decisions, setShowPlayer1Decisions] = useState(true);
  const [showPlayer2Decisions, setShowPlayer2Decisions] = useState(true);
  const [priceHistory, setPriceHistory] = useState<
    { price: number; date: string }[]
  >([]);
  const [currentCommentary, setCurrentCommentary] = useState<string>("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const generateEndSummary = async (result: GameResult): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        // Step 1: Generate end summary text from API
        const summaryResponse = await fetch("/api/quant-trading-end-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            winner: result.winner,
            winnerReason: result.winnerReason,
            player1Strategy: result.player1.strategy,
            player2Strategy: result.player2.strategy,
            player1FinalPnl: result.player1.finalPnl,
            player2FinalPnl: result.player2.finalPnl,
            player1TotalReturn: result.player1.totalReturn,
            player2TotalReturn: result.player2.totalReturn,
            asset: result.asset,
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
    if (!player1Strategy.trim() || !player2Strategy.trim()) {
      alert("Please fill in both player strategies before starting.");
      return;
    }

    setPhase("playing");

    try {
      const response = await fetch("/api/play-quant-trading-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          player1Strategy: player1Strategy.trim(),
          player2Strategy: player2Strategy.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let player1Decisions: TradingDecision[] = [];
      let player2Decisions: TradingDecision[] = [];
      let gameEnd: {
        winner: 1 | 2 | "tie";
        winnerReason: string;
        player1: PlayerResult;
        player2: PlayerResult;
        asset: string;
        startPrice: number;
        endPrice: number;
        totalReturn: number;
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
                    decisions: [],
                    finalPnl: 0,
                    finalCash: 1000,
                    finalShares: 0,
                    totalReturn: 0,
                    strategy: data.player1Strategy,
                  },
                  player2: {
                    player: 2,
                    decisions: [],
                    finalPnl: 0,
                    finalCash: 1000,
                    finalShares: 0,
                    totalReturn: 0,
                    strategy: data.player2Strategy,
                  },
                  winner: "tie",
                  winnerReason: "",
                  asset: data.asset,
                  startPrice: data.startPrice,
                  endPrice: data.endPrice,
                  totalReturn: data.totalReturn,
                });
              } else if (data.type === "decision") {
                // New trading decision received
                if (data.player === 1) {
                  player1Decisions.push(data.decision);
                } else {
                  player2Decisions.push(data.decision);
                }

                // Update price history
                setPriceHistory((prev) => {
                  const newPrice = {
                    price: data.decision.price,
                    date: data.decision.date,
                  };
                  // Only add if it's a new price point
                  if (
                    prev.length === 0 ||
                    prev[prev.length - 1].date !== newPrice.date
                  ) {
                    return [...prev, newPrice];
                  }
                  return prev;
                });

                setResult((prev) => {
                  if (data.player === 1) {
                    return {
                      ...prev!,
                      player1: {
                        ...prev!.player1,
                        decisions: [...player1Decisions],
                        finalPnl: data.decision.totalPnl,
                        finalCash: data.decision.cash,
                        finalShares: data.decision.shares,
                        totalReturn: (data.decision.totalPnl / 1000) * 100,
                      },
                    };
                  } else {
                    return {
                      ...prev!,
                      player2: {
                        ...prev!.player2,
                        decisions: [...player2Decisions],
                        finalPnl: data.decision.totalPnl,
                        finalCash: data.decision.cash,
                        finalShares: data.decision.shares,
                        totalReturn: (data.decision.totalPnl / 1000) * 100,
                      },
                    };
                  }
                });

                // Small delay for visual effect
                await new Promise((resolve) => setTimeout(resolve, 500));
              } else if (data.type === "end") {
                // Game ended
                gameEnd = {
                  winner: data.winner,
                  winnerReason: data.winnerReason,
                  player1: data.player1,
                  player2: data.player2,
                  asset: data.asset,
                  startPrice: data.startPrice,
                  endPrice: data.endPrice,
                  totalReturn: data.totalReturn,
                };
              }
            }
          }
        }
      }

      // Update final result
      if (gameEnd) {
        const finalResult = {
          player1: gameEnd.player1,
          player2: gameEnd.player2,
          winner: gameEnd.winner,
          winnerReason: gameEnd.winnerReason,
          asset: gameEnd.asset,
          startPrice: gameEnd.startPrice,
          endPrice: gameEnd.endPrice,
          totalReturn: gameEnd.totalReturn,
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
    setPlayer1Strategy("");
    setPlayer2Strategy("");
    setResult(null);
    setShowPlayer1Decisions(true);
    setCurrentCommentary("");
    setIsPlayingAudio(false);
    setShowPlayer2Decisions(true);
    setPriceHistory([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  const PriceChart = ({
    prices,
    currentPrice,
  }: {
    prices: { price: number; date: string }[];
    currentPrice: number;
  }) => {
    if (prices.length === 0) return null;

    const maxPrice = Math.max(...prices.map((p) => p.price));
    const minPrice = Math.min(...prices.map((p) => p.price));
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1; // 10% padding
    const chartMin = minPrice - padding;
    const chartMax = maxPrice + padding;
    const chartRange = chartMax - chartMin;

    const width = 800;
    const height = 400;
    const paddingX = 40;
    const paddingY = 20;

    const denom = Math.max(1, prices.length - 1);
    const safeRange = chartRange === 0 || !isFinite(chartRange) ? 1 : chartRange;
    const getX = (index: number) =>
      paddingX + (index / denom) * (width - 2 * paddingX);
    const getY = (price: number) =>
      paddingY + ((chartMax - price) / safeRange) * (height - 2 * paddingY);

    const pathData = prices
      .map((point, index) => {
        const x = getX(index);
        const y = getY(point.price);
        if (!isFinite(x) || !isFinite(y)) return null;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .filter(Boolean)
      .join(" ");

    const isUp =
      prices.length > 1 &&
      prices[prices.length - 1].price > prices[prices.length - 2].price;
    const lineColor = isUp ? "#10b981" : "#ef4444"; // green if up, red if down

    return (
      <div className="bg-black/20 rounded-lg p-4 border border-gray-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-white">Price Chart</h3>
          <div className="flex items-center gap-2">
            <div
              className={`text-lg font-mono font-bold ${isUp ? "text-green-400" : "text-red-400"
                }`}
            >
              {formatCurrency(currentPrice)}
            </div>
            <div
              className={`text-xs ${isUp ? "text-green-400" : "text-red-400"}`}
            >
              {isUp ? "↗" : "↘"}
            </div>
          </div>
        </div>
        <div className="relative">
          <svg width={width} height={height} className="overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const price = chartMax - ratio * chartRange;
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#374151"
                    strokeWidth={0.5}
                  />
                  <text
                    x={paddingX - 5}
                    y={y + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                  >
                    {formatCurrency(price)}
                  </text>
                </g>
              );
            })}

            {/* Price line */}
            <path
              d={pathData}
              stroke={lineColor}
              strokeWidth={2}
              fill="none"
              className="drop-shadow-sm"
            />

            {/* Data points */}
            {prices.map((point, index) => {
              const cx = getX(index);
              const cy = getY(point.price);
              if (!isFinite(cx) || !isFinite(cy)) return null;
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={lineColor}
                  className={`drop-shadow-sm ${index === prices.length - 1 ? "animate-pulse" : ""
                    }`}
                />
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{prices[0]?.date}</span>
          <span>{prices[prices.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto">
      {/* Game Description */}
      <div className="bg-[#111111] rounded-lg p-6 border border-gray-800/50 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Quant Trading Battle
        </h2>
        <div className="text-gray-400 text-sm leading-relaxed space-y-2">
          <p>
            Submit your trading strategy and compete in a simulated market using
            real historical data.
          </p>
          <p>• Start with $1,000 cash</p>
          <p>• Make buy/sell decisions at each price point</p>
          <p>• Maximize your PNL to win</p>
          <p>• Market data will be revealed progressively</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Player 1 */}
        <div className="bg-[#111111] rounded-lg p-6 border border-blue-500/30">
          <h2 className="text-xl font-semibold text-blue-400 mb-4">Player 1</h2>
          <label className="block text-gray-400 mb-2 text-sm">
            Enter your trading strategy:
          </label>
          <textarea
            value={player1Strategy}
            onChange={(e) => setPlayer1Strategy(e.target.value)}
            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
            placeholder="Example: Use moving average crossover strategy. Buy when 10-day MA crosses above 20-day MA, sell when it crosses below. Risk management: never risk more than 5% of portfolio on a single trade."
          />
        </div>

        {/* Player 2 */}
        <div className="bg-[#111111] rounded-lg p-6 border border-red-500/30">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Player 2</h2>
          <label className="block text-gray-400 mb-2 text-sm">
            Enter your trading strategy:
          </label>
          <textarea
            value={player2Strategy}
            onChange={(e) => setPlayer2Strategy(e.target.value)}
            className="w-full h-40 bg-black/40 border border-gray-800 rounded-lg p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none placeholder:text-gray-600"
            placeholder="Example: Momentum strategy. Buy on strong upward price movements, sell on weakness. Use RSI for overbought/oversold signals. Position sizing based on volatility."
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleStartGame}
          className="bg-white text-black hover:bg-gray-100 font-medium py-3 px-10 rounded-lg text-base transition-all duration-200"
        >
          Start Trading Battle
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
              <div className="text-6xl mb-6 animate-pulse">📈</div>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Starting Trading Battle
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Loading market data and initializing strategies...
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

    const { player1, player2, asset, startPrice, endPrice } = result;

    return (
      <div className="max-w-6xl mx-auto">
        {/* Market Info */}
        <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">{asset}</h2>
            <div className="text-sm text-gray-400">
              {player1.decisions.length} / 20 trading periods
            </div>
          </div>

          {/* Price Chart */}
          <div className="flex justify-center">
            <PriceChart
              prices={priceHistory}
              currentPrice={
                player1.decisions.length > 0
                  ? player1.decisions[player1.decisions.length - 1].price
                  : startPrice
              }
            />
          </div>
        </div>

        {/* Player Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Player 1 Performance */}
          <div className="bg-[#111111] border border-blue-500/30 rounded-lg p-8">
            <h3 className="text-blue-400 text-2xl font-semibold mb-6">
              Player 1 Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Cash (C):</span>
                <span className="text-white font-mono text-xl">
                  {formatCurrency(player1.finalCash)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Position (P):</span>
                <span
                  className={`font-mono text-xl ${player1.finalShares > 0
                      ? "text-pink-400"
                      : player1.finalShares < 0
                        ? "text-pink-400"
                        : "text-gray-400"
                    }`}
                >
                  {player1.finalShares > 0
                    ? `+${player1.finalShares}`
                    : player1.finalShares}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Total Value:</span>
                <span className="text-white font-mono text-xl">
                  {formatCurrency(
                    player1.finalCash +
                    player1.finalShares *
                    (player1.decisions.length > 0
                      ? player1.decisions[player1.decisions.length - 1]
                        .price
                      : startPrice)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-4 text-lg">
                <span className="text-gray-400">P&L:</span>
                <span
                  className={`font-mono font-bold text-2xl ${player1.finalPnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {formatCurrency(player1.finalPnl)} (
                  {formatPercent(player1.totalReturn)})
                </span>
              </div>
            </div>
          </div>

          {/* Player 2 Performance */}
          <div className="bg-[#111111] border border-red-500/30 rounded-lg p-8">
            <h3 className="text-red-400 text-2xl font-semibold mb-6">
              Player 2 Performance
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Cash (C):</span>
                <span className="text-white font-mono text-xl">
                  {formatCurrency(player2.finalCash)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Position (P):</span>
                <span
                  className={`font-mono text-xl ${player2.finalShares > 0
                      ? "text-pink-400"
                      : player2.finalShares < 0
                        ? "text-pink-400"
                        : "text-gray-400"
                    }`}
                >
                  {player2.finalShares > 0
                    ? `+${player2.finalShares}`
                    : player2.finalShares}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="text-gray-400">Total Value:</span>
                <span className="text-white font-mono text-xl">
                  {formatCurrency(
                    player2.finalCash +
                    player2.finalShares *
                    (player2.decisions.length > 0
                      ? player2.decisions[player2.decisions.length - 1]
                        .price
                      : startPrice)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-4 text-lg">
                <span className="text-gray-400">P&L:</span>
                <span
                  className={`font-mono font-bold text-2xl ${player2.finalPnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {formatCurrency(player2.finalPnl)} (
                  {formatPercent(player2.totalReturn)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Decisions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player 1 Decisions */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-blue-400">
                Player 1 Decisions
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-3">
                {player1.decisions.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first trading decision...
                  </div>
                ) : (
                  player1.decisions.map((decision, idx) => (
                    <div
                      key={idx}
                      className="bg-black/40 border border-gray-800 rounded-lg p-4 animate-fadeIn"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">
                          Period {idx + 1}
                        </div>
                        <div className="text-xs text-gray-400">
                          {decision.date}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-white font-medium text-sm">
                          {decision.action === "buy"
                            ? "🟢 BUY"
                            : decision.action === "sell"
                              ? "🔴 SELL"
                              : "⚪ PASS"}
                        </div>
                        <div className="text-white font-mono text-sm">
                          {formatCurrency(decision.price)}
                        </div>
                      </div>
                      {decision.action !== "pass" && (
                        <div className="text-xs text-gray-400 mb-2">
                          {decision.units} units
                        </div>
                      )}
                      <div className="text-xs text-gray-300 italic">
                        {decision.reasoning}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Player 2 Decisions */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-base font-semibold text-red-400">
                Player 2 Decisions
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-6">
              <div className="space-y-3">
                {player2.decisions.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    Waiting for first trading decision...
                  </div>
                ) : (
                  player2.decisions.map((decision, idx) => (
                    <div
                      key={idx}
                      className="bg-black/40 border border-gray-800 rounded-lg p-4 animate-fadeIn"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">
                          Period {idx + 1}
                        </div>
                        <div className="text-xs text-gray-400">
                          {decision.date}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-white font-medium text-sm">
                          {decision.action === "buy"
                            ? "🟢 BUY"
                            : decision.action === "sell"
                              ? "🔴 SELL"
                              : "⚪ PASS"}
                        </div>
                        <div className="text-white font-mono text-sm">
                          {formatCurrency(decision.price)}
                        </div>
                      </div>
                      {decision.action !== "pass" && (
                        <div className="text-xs text-gray-400 mb-2">
                          {decision.units} units
                        </div>
                      )}
                      <div className="text-xs text-gray-300 italic">
                        {decision.reasoning}
                      </div>
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

    const {
      player1,
      player2,
      winner,
      winnerReason,
      asset,
      startPrice,
      endPrice,
      totalReturn,
    } = result;

    return (
      <div className="max-w-6xl mx-auto">
        <div className="space-y-8">
          {/* Market Summary */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {asset} Trading Summary
            </h2>

            {/* Price Chart */}
            <div className="flex justify-center mb-6">
              <PriceChart prices={priceHistory} currentPrice={endPrice} />
            </div>

            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Start Price
                </div>
                <div className="text-2xl font-mono font-bold text-green-400">
                  {formatCurrency(startPrice)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  End Price
                </div>
                <div className="text-2xl font-mono font-bold text-red-400">
                  {formatCurrency(endPrice)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Total Return
                </div>
                <div
                  className={`text-2xl font-mono font-bold ${totalReturn >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                >
                  {formatPercent(totalReturn)}
                </div>
              </div>
            </div>
          </div>

          {/* Winner Banner */}
          <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-8">
            <div className="text-center mb-6">
              <div
                className={`text-3xl font-semibold mb-2 ${winner === "tie"
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
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-6">
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {formatCurrency(player1.finalPnl)}
                </div>
                <div className="text-xs text-gray-500 mt-1">P1 P&L</div>
                <div className="text-xs mt-1">
                  <span
                    className={
                      player1.finalPnl >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {formatPercent(player1.totalReturn)}
                  </span>
                </div>
              </div>
              <div className="text-center flex items-center justify-center">
                <div className="text-4xl">
                  {winner === 1 ? "👈" : winner === 2 ? "👉" : "🤝"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-red-400">
                  {formatCurrency(player2.finalPnl)}
                </div>
                <div className="text-xs text-gray-500 mt-1">P2 P&L</div>
                <div className="text-xs mt-1">
                  <span
                    className={
                      player2.finalPnl >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {formatPercent(player2.totalReturn)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handlePlayAgain}
                className="bg-white text-black hover:bg-gray-100 font-medium py-2 px-6 rounded-lg text-sm transition-all duration-200"
              >
                Trade Again
              </button>
            </div>
          </div>

          {/* Final Performance Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Final Stats */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <h3 className="text-blue-400 text-lg font-semibold mb-4">
                Player 1 Final Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Final Cash (C):</span>
                  <span className="text-white font-mono">
                    {formatCurrency(player1.finalCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Final Position (P):</span>
                  <span
                    className={`font-mono ${player1.finalShares > 0
                        ? "text-pink-400"
                        : player1.finalShares < 0
                          ? "text-pink-400"
                          : "text-gray-400"
                      }`}
                  >
                    {player1.finalShares > 0
                      ? `+${player1.finalShares}`
                      : player1.finalShares}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value:</span>
                  <span className="text-white font-mono">
                    {formatCurrency(
                      player1.finalCash + player1.finalShares * endPrice
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span className="text-gray-400">Total P&L:</span>
                  <span
                    className={`font-mono font-bold ${player1.finalPnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                  >
                    {formatCurrency(player1.finalPnl)} (
                    {formatPercent(player1.totalReturn)})
                  </span>
                </div>
              </div>
            </div>

            {/* Player 2 Final Stats */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg p-6">
              <h3 className="text-red-400 text-lg font-semibold mb-4">
                Player 2 Final Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Final Cash (C):</span>
                  <span className="text-white font-mono">
                    {formatCurrency(player2.finalCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Final Position (P):</span>
                  <span
                    className={`font-mono ${player2.finalShares > 0
                        ? "text-pink-400"
                        : player2.finalShares < 0
                          ? "text-pink-400"
                          : "text-gray-400"
                      }`}
                  >
                    {player2.finalShares > 0
                      ? `+${player2.finalShares}`
                      : player2.finalShares}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value:</span>
                  <span className="text-white font-mono">
                    {formatCurrency(
                      player2.finalCash + player2.finalShares * endPrice
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-3">
                  <span className="text-gray-400">Total P&L:</span>
                  <span
                    className={`font-mono font-bold ${player2.finalPnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                  >
                    {formatCurrency(player2.finalPnl)} (
                    {formatPercent(player2.totalReturn)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Decisions History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Decisions */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-blue-400">
                  Player 1 Decisions
                </h3>
                <button
                  onClick={() => setShowPlayer1Decisions(!showPlayer1Decisions)}
                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                >
                  {showPlayer1Decisions ? "Hide" : "Show"}
                </button>
              </div>
              {showPlayer1Decisions && (
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {player1.decisions.map((decision, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border border-gray-800 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs text-gray-500">
                            Period {idx + 1}
                          </div>
                          <div className="text-xs text-gray-400">
                            {decision.date}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-white font-medium text-sm">
                            {decision.action === "buy"
                              ? "🟢 BUY"
                              : decision.action === "sell"
                                ? "🔴 SELL"
                                : "⚪ PASS"}
                          </div>
                          <div className="text-white font-mono text-sm">
                            {formatCurrency(decision.price)}
                          </div>
                        </div>
                        {decision.action !== "pass" && (
                          <div className="text-xs text-gray-400 mb-2">
                            {decision.units} units
                          </div>
                        )}
                        <div className="text-xs text-gray-300 italic mb-2">
                          {decision.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Player 2 Decisions */}
            <div className="bg-[#111111] border border-gray-800/50 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <h3 className="text-base font-semibold text-red-400">
                  Player 2 Decisions
                </h3>
                <button
                  onClick={() => setShowPlayer2Decisions(!showPlayer2Decisions)}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  {showPlayer2Decisions ? "Hide" : "Show"}
                </button>
              </div>
              {showPlayer2Decisions && (
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {player2.decisions.map((decision, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border border-gray-800 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs text-gray-500">
                            Period {idx + 1}
                          </div>
                          <div className="text-xs text-gray-400">
                            {decision.date}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-white font-medium text-sm">
                            {decision.action === "buy"
                              ? "🟢 BUY"
                              : decision.action === "sell"
                                ? "🔴 SELL"
                                : "⚪ PASS"}
                          </div>
                          <div className="text-white font-mono text-sm">
                            {formatCurrency(decision.price)}
                          </div>
                        </div>
                        {decision.action !== "pass" && (
                          <div className="text-xs text-gray-400 mb-2">
                            {decision.units} units
                          </div>
                        )}
                        <div className="text-xs text-gray-300 italic mb-2">
                          {decision.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
            Quant Trading Battle
          </h1>
          <p className="text-gray-400">
            Compete with AI trading strategies on real market data
          </p>
        </div>

        {phase === "setup" && renderSetup()}
        {phase === "playing" && renderPlaying()}
        {phase === "finished" && renderFinished()}
      </div>
    </div>
  );
}
