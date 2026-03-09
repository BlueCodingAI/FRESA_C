"use client";

import { useEffect } from "react";
import MrListings from "./MrListings";

interface RegistrationPromptProps {
  score?: number;
  total?: number;
  /** When "accessChapter", same design but for accessing next chapter (no score). */
  variant?: "postQuiz" | "accessChapter";
  onRegister: () => void;
  onLogin: () => void;
  onSkip: () => void;
}

export default function RegistrationPrompt({
  score = 0,
  total = 0,
  variant = "postQuiz",
  onRegister,
  onLogin,
  onSkip,
}: RegistrationPromptProps) {
  const isAccess = variant === "accessChapter";

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-sm overflow-hidden">
      {/* Below top bar (4rem): modal fits fully in remaining viewport */}
      <div className="flex-1 flex items-center justify-center w-full overflow-hidden p-3 pb-4 pt-20 sm:pt-4 sm:p-6 min-h-0">
        <div
          className="relative w-full max-w-[400px] sm:max-w-md rounded-2xl bg-[#1a1f3a]/90 backdrop-blur-lg border border-cyan-500/20 shadow-2xl flex flex-col overflow-hidden shrink-0 max-h-[calc(100dvh-6rem)] sm:max-h-[min(640px,calc(100dvh-2.5rem))]"
        >
          <div className="overflow-y-auto overflow-x-hidden scrollbar-hide flex-1 min-h-0 py-5 px-4 sm:p-8">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 z-10 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex justify-center mb-5 sm:mb-6">
            <div className="scale-90 sm:scale-100 origin-center">
              <MrListings size="medium" />
            </div>
          </div>

          <h2 className="text-center text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-cyan-200 mb-2">
            {isAccess ? "Register to Continue" : "Congratulations on completing Chapter 1."}
          </h2>
          <p className="text-center text-gray-300 text-sm sm:text-base mb-6">
            Register to save progress
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={onRegister}
              className="w-full sm:flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-semibold text-base shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-transform"
            >
              Register
            </button>
            <button
              onClick={onLogin}
              className="w-full sm:flex-1 h-12 rounded-xl bg-white/10 border border-white/20 text-white/95 hover:bg-white/15 font-medium text-base active:scale-[0.98] transition-transform"
            >
              Login
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

