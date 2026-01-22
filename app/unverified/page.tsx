"use client";

import { useState } from "react";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

export default function UnverifiedPage() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResendEmail = async () => {
    setResending(true);
    setMessage(null);

    try {
      // Get email from URL params or use a form
      const email = new URLSearchParams(window.location.search).get("email");

      if (!email) {
        setMessage({ type: "error", text: "Email address not found. Please contact support." });
        setResending(false);
        return;
      }

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Verification email sent! Please check your inbox.",
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to send verification email. Please try again later.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "An error occurred. Please try again later.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-yellow-500/20 p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-2">
                Email Not Verified
              </h1>
              <p className="text-gray-400">Please verify your email to continue</p>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-white text-center">
                Your email address has not been verified yet. Please check your inbox and click the verification link we sent you.
              </p>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-500/10 border border-green-500/30 text-green-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-cyan-300 text-sm text-center mb-3">
                  <strong>Didn't receive the email?</strong>
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full py-2 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 rounded-lg text-cyan-300 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-center"
              >
                Back to Login
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-4 bg-[#1a1f3a]/50 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

