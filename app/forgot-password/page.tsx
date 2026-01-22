"use client";

import { useState } from "react";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      console.log('[ForgotPassword] Sending request for email:', email);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));
      console.log('[ForgotPassword] Response:', { status: res.status, data });
      console.log('[ForgotPassword] Full response data:', JSON.stringify(data, null, 2));

      if (!res.ok) {
        throw new Error(data.error || "Failed to request reset");
      }

      // Check email status from server response
      console.log('[ForgotPassword] Email status from server:', data._emailStatus);
      
      if (data._emailStatus === 'failed') {
        console.error('[ForgotPassword] ❌ Email sending failed!');
        console.error('[ForgotPassword] Error:', data._emailError);
        setError(`Failed to send email: ${data._emailError || 'Unknown error'}. Please check your server terminal for detailed logs.`);
        setLoading(false);
        return;
      }

      // Check debug info if available
      if (data._debug) {
        console.log('[ForgotPassword] Debug info from server:', data._debug);
        if (data.emailError) {
          console.error('[ForgotPassword] Email error detected:', data.emailError);
          setError(`Email sending failed: ${data.emailError}. Check server terminal logs for details.`);
          setLoading(false);
          return;
        }
        if (data.emailSent === false) {
          console.warn('[ForgotPassword] Email was not sent (emailSent: false)');
          setError('Email was not sent. Check server terminal logs for details.');
          setLoading(false);
          return;
        }
      }

      // Success - show message
      if (data._emailStatus === 'sent') {
        console.log('[ForgotPassword] ✅ Email was sent successfully!');
      } else {
        console.warn('[ForgotPassword] ⚠️ Email status unknown - check server terminal logs');
      }
      
      setSent(true);
      console.log('[ForgotPassword] Success - email should be sent');
    } catch (err: any) {
      console.error('[ForgotPassword] Error:', err);
      setError(err.message || "Failed to request reset. Please try again.");
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
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
                Forgot Password
              </h1>
              <p className="text-gray-400 text-sm">
                Enter your email and we’ll send a password reset link.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {sent ? (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
                If an account exists for that email, a reset link has been sent.
              </div>
            ) : (
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


