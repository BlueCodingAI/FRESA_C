"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface QuizRegistrationPromptProps {
  onRegister: () => void;
  onLogin: () => void;
  onClose: () => void;
}

export default function QuizRegistrationPrompt({
  onRegister,
  onLogin,
  onClose,
}: QuizRegistrationPromptProps) {
  const router = useRouter();

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-8 md:p-12 shadow-2xl max-w-2xl w-full mx-4 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-3 text-center">
          Registration Required
        </h2>

        {/* Message */}
        <p className="text-gray-300 text-center mb-6">
          Please register to take the quiz and access all course content.
        </p>

        {/* Benefits */}
        <div className="bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-gray-300 mb-3">Benefits of registering:</p>
          <ul className="text-sm text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">✓</span>
              <span>Take quizzes and track your progress</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">✓</span>
              <span>Save your progress automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">✓</span>
              <span>Access all course materials</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRegister}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
          >
            Register Now
          </button>
          <button
            onClick={onLogin}
            className="flex-1 py-3 px-4 bg-[#1a1f3a]/50 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}

