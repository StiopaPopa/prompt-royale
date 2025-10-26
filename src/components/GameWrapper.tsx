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
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
