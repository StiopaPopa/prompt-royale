"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import LoginPromptModal from "./LoginPromptModal";

interface GameWrapperProps {
  children: React.ReactNode;
}

export default function GameWrapper({ children }: GameWrapperProps) {
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      setShowLoginModal(true);
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading your game...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, show only the login modal without game content
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <LoginPromptModal isOpen={showLoginModal} />
      </div>
    );
  }

  // Only render game content if authenticated
  return <>{children}</>;
}
