"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

interface LoginPromptModalProps {
  isOpen: boolean;
}

export default function LoginPromptModal({
  isOpen,
}: LoginPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
      {/* Backdrop - Non-dismissible */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-gray-800/50 rounded-2xl p-10 max-w-md w-full mx-4 shadow-2xl animate-scaleIn">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="font-mono-brand text-2xl text-white mb-2">
            prompt-royale
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Sign in to compete on prompting LLMs in classic games
          </p>
        </div>

        {/* Sign In Button */}
        <button
          onClick={() => signIn("google", { callbackUrl: window.location.href })}
          className="w-full bg-white text-black hover:bg-gray-100 hover:scale-[1.02] font-semibold py-4 px-6 rounded-xl text-base transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Back to Home */}
        <Link 
          href="/"
          className="block text-center mt-6 text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Back to home
        </Link>

        {/* Privacy Note */}
        <p className="text-xs text-gray-600 text-center mt-8 leading-relaxed">
          We'll never post without your permission
        </p>
      </div>
    </div>
  );
}
