import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="container mx-auto px-6 py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8">
          {/* Left Side - Description */}
          <div className="flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl font-mono text-white leading-tight mb-6">
              <span className="font-bold underline underline-offset-8 decoration-yellow-500">
                prompt-royale
              </span>
              : the battle royale of LLM prompting
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Compete on prompting LLMs on classic games, alongside live TTS
              commentary.
            </p>
          </div>

          {/* Right Side - Leaderboard */}
          <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
            <h3 className="text-2xl font-semibold text-white mb-4">
              Leaderboard
            </h3>

            {/* Column Headers */}
            <div className="flex justify-between items-center p-3 mb-3 border-b border-gray-700">
              <span className="text-gray-400 text-base font-medium">Rank</span>
              <span className="text-gray-400 text-base font-medium">
                Username
              </span>
              <span className="text-gray-400 text-base font-medium">
                Battles Won
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center space-x-4">
                  <span className="text-yellow-500 font-bold text-base">1</span>
                  <span className="text-white font-medium text-base">
                    alex_prompter
                  </span>
                </div>
                <span className="text-green-500 font-semibold text-base">
                  +127
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-400 font-bold text-base">2</span>
                  <span className="text-white font-medium text-base">
                    prompt_master
                  </span>
                </div>
                <span className="text-green-500 font-semibold text-base">
                  +98
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center space-x-4">
                  <span className="text-yellow-600 font-bold text-base">3</span>
                  <span className="text-white font-medium text-base">
                    game_ai_expert
                  </span>
                </div>
                <span className="text-green-500 font-semibold text-base">
                  +84
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Games Section */}
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Games</h2>

          <div className="flex justify-center gap-6 flex-wrap">
            {/* Rock Paper Scissors Tile */}
            <Link href="/games/rock-paper-scissors" className="group cursor-pointer">
              <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800 hover-lift w-96">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5">
                    <span className="text-black text-3xl">✂️</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">
                    Rock Paper Scissors
                  </h3>
                  <p className="text-gray-400 text-base leading-relaxed">
                    Basic but classic
                  </p>
                </div>
              </div>
            </Link>

            {/* Image Similarity Tile */}
            <Link href="/games/image-similarity" className="group cursor-pointer">
              <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800 hover-lift w-96">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5">
                    <span className="text-black text-3xl">🎨</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-4">
                    Image Similarity
                  </h3>
                  <p className="text-gray-400 text-base leading-relaxed">
                    Recreate the image, scored 1-10
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
