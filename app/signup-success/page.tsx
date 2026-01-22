"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

function SignupSuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
                Check Your Email
              </h1>
              <p className="text-gray-400">We've sent you a verification link</p>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-white text-center">
                We've sent a verification email to:
              </p>
              {email && (
                <p className="text-cyan-400 font-semibold text-center text-lg">
                  {email}
                </p>
              )}
              <p className="text-gray-400 text-sm text-center">
                Please click the link in the email to verify your account and activate it.
              </p>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
                <p className="text-cyan-300 text-sm text-center">
                  <strong>Note:</strong> The verification link will expire in 24 hours. If you didn't receive the email, check your spam folder or contact support.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-center"
              >
                Go to Login
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

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden flex items-center justify-center">
        <StarsBackground />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    }>
      <SignupSuccessContent />
    </Suspense>
  );
}

