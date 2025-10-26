"use client";

import Link from "next/link";
import { useState } from "react";

// Full leaderboard data
const leaderboardData = [
  { rank: 1, username: "Melwin", points: 42 },
  { rank: 2, username: "Ryan", points: 35 },
  { rank: 3, username: "Ziyad", points: 28 },
  { rank: 4, username: "Hemal", points: 21 },
  { rank: 5, username: "Rishi", points: 15 },
  { rank: 6, username: "Aisha", points: 12 },
  { rank: 7, username: "Kenji", points: 8 },
  { rank: 8, username: "Sofia", points: 5 },
  { rank: 9, username: "Dmitri", points: 2 },
  { rank: 10, username: "Fatima", points: 0 },
  { rank: 11, username: "Carlos", points: -3 },
  { rank: 12, username: "Priya", points: -7 },
  { rank: 13, username: "Jamal", points: -11 },
  { rank: 14, username: "Elena", points: -15 },
  { rank: 15, username: "Kwame", points: -19 },
];

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
                <a
                  href="#games"
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("games")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Games
                </a>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Leaderboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Left Side - Description */}
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl md:text-6xl font-mono-brand text-white leading-tight mb-6">
              prompt-royale
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed mb-4">
              benchmarking humans on LLM prompt engineering
            </p>
            <p className="text-base text-gray-500 leading-relaxed">
              Compete on prompting LLMs on classic games. Battle AIs
              head-to-head and climb the leaderboard.
            </p>
          </div>

          {/* Right Side - Leaderboard */}
          <div className="bg-[#111111] rounded-lg border border-gray-800/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Wins
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {leaderboardData.slice(0, 5).map((player) => (
                    <tr
                      key={player.rank}
                      className="hover:bg-gray-800/20 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                        {player.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {player.username}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-mono text-right ${
                          player.points >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {player.points >= 0 ? "+" : ""}
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-gray-800/50 text-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                View full leaderboard →
              </button>
            </div>
          </div>
        </div>

        {/* Games Section */}
        <div id="games" className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Games</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Rock Paper Scissors Tile */}
            <Link href="/games/rock-paper-scissors" className="group">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-purple-900/20 to-blue-900/20 flex items-center justify-center">
                  <span className="text-6xl">✂️</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                      Strategy
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                      Easy
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Rock Paper Scissors
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    10 rounds of strategic decision-making. Basic but classic.
                  </p>
                </div>
              </div>
            </Link>

            {/* Chess Tile */}
            <Link href="/games/chess" className="group">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-amber-900/20 to-orange-900/20 flex items-center justify-center">
                  <span className="text-6xl">♟️</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                      Strategy
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                      Hard
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Chess
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    30 moves each player. Winner determined by engine
                    evaluation.
                  </p>
                </div>
              </div>
            </Link>

            {/* 20 Questions Tile */}
            <Link href="/games/twenty-questions" className="group">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-green-900/20 to-teal-900/20 flex items-center justify-center">
                  <span className="text-6xl">🤔</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                      Deductive
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">
                      Medium
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    20 Questions
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    20 rounds of AI vs AI deduction. Guess the secret object!
                  </p>
                </div>
              </div>
            </Link>

            {/* Image Replication Tile */}
            <Link href="/games/image-similarity" className="group">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-pink-900/20 to-purple-900/20 flex items-center justify-center">
                  <span className="text-6xl">🎨</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-600/10 text-gray-400 border border-gray-600/20 rounded">
                      Replication
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">
                      Medium
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Image Replication
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Generate images from prompts. Closest match to reference
                    wins!
                  </p>
                </div>
              </div>
            </Link>

            {/* Guess Who Tile */}
            <Link href="/games/guess-who" className="group">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-indigo-900/20 to-cyan-900/20 flex items-center justify-center">
                  <span className="text-6xl">🎭</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                      Deductive
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">
                      Medium
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Guess Who
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Deduce the secret celebrity from a pool of 24 famous people!
                  </p>
                </div>
              </div>
            </Link>

            {/* Battleship Tile */}
            <Link href="/games/battleship" className="group">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-blue-900/20 to-slate-900/20 flex items-center justify-center">
                  <span className="text-6xl">🚢</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                      Strategy
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded">
                      Medium
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Battleship
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Strategically place ships and sink your opponent&apos;s fleet!
                  </p>
                </div>
              </div>
            </Link>

            {/* Quant Trading Tile */}
            <Link href="/games/quant-trading" className="group lg:col-start-2">
              <div className="bg-[#111111] rounded-lg border border-gray-800/50 hover:border-gray-700 transition-all duration-200 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-emerald-900/20 to-green-900/20 flex items-center justify-center">
                  <span className="text-6xl">📈</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                      Financial
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                      Hard
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Quant Trading
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Compete with AI trading strategies on real market data!
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Leaderboard Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#111111] rounded-lg border border-gray-800/50 max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Full Leaderboard
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#111111]">
                  <tr className="border-b border-gray-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Wins
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                  {leaderboardData.map((player) => (
                    <tr
                      key={player.rank}
                      className="hover:bg-gray-800/20 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                        {player.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {player.username}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-mono text-right ${
                          player.points >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {player.points >= 0 ? "+" : ""}
                        {player.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
