"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";
import React from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const hasVerifiedRef = useRef(false);
  const isProcessingRef = useRef(false); // Additional guard for processing state

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    // Prevent multiple verification attempts - check BOTH refs
    if (hasVerifiedRef.current || isProcessingRef.current) {
      console.log('[VerifyEmail] ⚠️ Already processing verification, skipping duplicate request');
      return;
    }

    // Mark as processing IMMEDIATELY to prevent duplicate requests
    // This must happen BEFORE any async operations
    isProcessingRef.current = true;
    hasVerifiedRef.current = true;
    console.log('[VerifyEmail] ✅ Starting verification, token:', token.substring(0, 20) + '...');

    // Verify email
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage("Email verified successfully!");
          setUserEmail(data.user?.email || null);

          // Store token in cookie for auto-login
          if (data.token) {
            const maxAge = 7 * 24 * 60 * 60; // 7 days
            document.cookie = `auth-token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;
            
            console.log('[VerifyEmail] Token stored in cookie');
            console.log('[VerifyEmail] User data:', data.user);
            console.log('[VerifyEmail] emailVerified status:', data.user?.emailVerified);

            // Wait a bit longer to ensure database update is fully propagated
            // Then verify the token works before redirecting
            setTimeout(async () => {
              try {
                // Verify the token works by calling /api/auth/me
                const meResponse = await fetch("/api/auth/me", {
                  headers: {
                    "Authorization": `Bearer ${data.token}`,
                  },
                });
                
                if (meResponse.ok) {
                  const meData = await meResponse.json();
                  console.log('[VerifyEmail] ✅ Token verified, user authenticated:', meData.user?.email);
                  console.log('[VerifyEmail] emailVerified status from /api/auth/me:', meData.user?.emailVerified);
                  
                  // Redirect based on role
                  if (["Admin", "Developer", "Editor"].includes(data.user?.role)) {
                    router.push("/admin");
                  } else {
                    router.push("/");
                  }
                } else {
                  const errorData = await meResponse.json();
                  console.error('[VerifyEmail] ❌ Token verification failed:', errorData);
                  // Still redirect but show a message
                  router.push("/login?verified=true");
                }
              } catch (err) {
                console.error('[VerifyEmail] Error verifying token:', err);
                // Still redirect
                router.push("/login?verified=true");
              }
            }, 1500); // Reduced delay since we're doing async verification
          } else {
            // No token, redirect to login
            setTimeout(() => {
              router.push("/login?verified=true");
            }, 2000);
          }
        } else {
          // Check if email is already verified or token was already used
          if (data.error && (data.error.includes("already verified") || data.alreadyUsed)) {
            setStatus("success");
            setMessage("Your email is already verified! You can log in now.");
            // Redirect to login
            setTimeout(() => {
              router.push("/login");
            }, 2000);
          } else {
            setStatus("error");
            setMessage(data.error || "Failed to verify email");
            // Don't reset ref - if it failed, we don't want to retry automatically
            // User can manually refresh or request a new verification email
          }
        }
      })
      .catch((err) => {
        console.error("[VerifyEmail] ❌ Verification error:", err);
        setStatus("error");
        setMessage("An error occurred while verifying your email.");
        // Don't reset ref - if it failed, we don't want to retry automatically
        // User can manually refresh or request a new verification email
      });
  }, [searchParams]); // Removed router from dependencies to prevent re-runs

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-8 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
                {status === "loading" ? "Verifying..." : status === "success" ? "Verified!" : "Verification Failed"}
              </h1>
            </div>

            {status === "loading" && (
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">{message}</p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white text-lg mb-2">{message}</p>
                {userEmail && (
                  <p className="text-gray-400 text-sm mb-4">Welcome, {userEmail}!</p>
                )}
                <p className="text-gray-400 text-sm">Redirecting you now...</p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-400 mb-4">{message}</p>
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                  >
                    Go to Login
                  </Link>
                  <Link
                    href="/unverified"
                    className="block w-full py-3 px-4 bg-[#1a1f3a]/50 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  >
                    Request New Verification Email
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}

