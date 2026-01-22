"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Pre-fill from auth if available
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
    if (!token) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) return;
        setName(data.user.name || "");
        setEmail(data.user.email || "");
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setSuccess("Message sent. Thank you!");
      setMessage("");
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
      <Header />
      <StarsBackground />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-xl mx-auto bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Contact</h1>
          <p className="text-gray-300 text-sm mb-6">Send us a message and we’ll get back to you.</p>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                className="w-full px-4 py-3 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}


