"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";

export default function PricingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Pricing");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pages/pricing")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.title) setTitle(data.title);
        if (data?.content) setContent(data.content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <Header />
      <StarsBackground />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-6 pt-20 md:pt-6">
        <div className="w-full max-w-3xl">
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 overflow-hidden animate-fade-in">
            <div className="p-6 md:p-10">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-400 hover:text-cyan-400 transition-colors group mb-6"
              >
                <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </button>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-2 border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-6">
                    {title}
                  </h1>
                  <div
                    className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed
                      prose-headings:text-white prose-p:my-4 prose-ul:my-4 prose-li:my-1
                      prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: content || "<p>No content yet.</p>" }}
                  />
                  <div className="mt-8 pt-6 border-t border-cyan-500/20">
                    <Link
                      href="/contact"
                      className="inline-flex items-center px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold transition-all"
                    >
                      Contact us for details
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
