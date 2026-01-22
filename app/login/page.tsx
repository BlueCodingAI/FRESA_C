"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If response is not JSON, it's likely an HTML error page
        throw new Error("Server error. Please try again later.");
      }

      if (!response.ok) {
        // Check if email is not verified
        if (response.status === 403 && data.emailVerified === false) {
          // Redirect to unverified page with email
          router.push(`/unverified?email=${encodeURIComponent(data.email || email)}`);
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      // Cookie is already set by the server in the response
      // But also set it client-side as backup
      const maxAge = 7 * 24 * 60 * 60; // 7 days
      document.cookie = `auth-token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax`;

      // Debug: Log user role and token
      console.log('Login successful:', {
        role: data.user.role,
        email: data.user.email,
        hasToken: !!data.token,
        tokenPreview: data.token.substring(0, 20) + '...'
      });

      // Verify cookie was set
      const cookieSet = document.cookie.includes('auth-token=');
      console.log('Cookie set:', cookieSet);
      console.log('All cookies:', document.cookie);

      // Wait a moment to ensure cookie is set
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if there's a redirect destination
      const redirectTo = sessionStorage.getItem("redirectAfterLogin");
      if (redirectTo) {
        sessionStorage.removeItem("redirectAfterLogin");
        console.log('Redirecting to stored destination:', redirectTo);
        // Use window.location for a full page reload to ensure cookie is available
        window.location.href = redirectTo;
        return;
      }

      // Redirect based on role - use window.location for full reload
      if (["Admin", "Developer", "Editor"].includes(data.user.role)) {
        console.log('Admin user detected, redirecting to /admin');
        // Add a small delay to ensure cookie is fully set
        setTimeout(() => {
          window.location.href = "/admin";
        }, 100);
      } else {
        console.log('Regular user, redirecting to home');
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-8 animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-400">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  placeholder="••••••••"
                />
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Don't have an account?{" "}
                <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </div>

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

