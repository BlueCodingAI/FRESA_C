"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";
import RichTextEditor from "@/components/RichTextEditor";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function NewChapterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    number: 1,
    title: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => {
    if (typeof document === 'undefined') {
      return null;
    }
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = getToken();
      const response = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/admin/chapters/${data.chapter.id}`);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create chapter");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create chapter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <Link
            href="/admin"
            className="text-cyan-400 hover:text-cyan-300 mb-3 md:mb-4 inline-block text-sm md:text-base"
          >
            ← Back to Admin Panel
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
            Create New Chapter
          </h1>
        </div>

        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-4 md:p-6 max-w-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chapter Number
              </label>
              <input
                type="number"
                value={formData.number}
                onChange={(e) =>
                  setFormData({ ...formData, number: parseInt(e.target.value) })
                }
                required
                min="1"
                className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm md:text-base"
              />
              <p className="text-gray-400 text-xs mt-1">
                Note: Chapter numbers start from 1. Introduction is managed separately (not a chapter).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chapter Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm md:text-base"
                placeholder="e.g., The Real Estate Business"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <RichTextEditor
                value={formData.description || ""}
                onChange={(value) =>
                  setFormData({ ...formData, description: value })
                }
                rows={4}
                placeholder="Brief description of the chapter..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm md:text-base"
              >
                {loading ? "Creating..." : "Create Chapter"}
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all text-center text-sm md:text-base"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

