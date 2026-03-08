"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";
import RichTextEditor from "@/components/RichTextEditor";

export default function AdminPricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Pricing");
  const [content, setContent] = useState("");

  const getToken = () =>
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];

  useEffect(() => {
    fetchPage();
  }, []);

  const fetchPage = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/admin/pages/pricing", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "Pricing");
        setContent(data.content || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/admin/pages/pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), content }),
      });
      if (res.ok) {
        alert("Pricing page saved successfully!");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative flex items-center justify-center">
        <StarsBackground />
        <div className="relative z-10 w-10 h-10 border-2 border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      <div className="relative z-10 container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center text-gray-400 hover:text-cyan-400 text-sm mb-2"
            >
              ← Admin
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Edit Pricing
            </h1>
            <p className="text-gray-400 text-sm mt-1">Content appears on the public Pricing page.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-sm"
            >
              View page
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl border border-cyan-500/20 p-4 md:p-6 max-w-4xl">
          <label className="block text-sm font-medium text-gray-300 mb-2">Page title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-[#0a0e27]/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 mb-6"
            placeholder="Pricing"
          />
          <label className="block text-sm font-medium text-gray-300 mb-2">Content (HTML)</label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Enter Pricing content…"
            rows={14}
            className="min-h-[320px]"
          />
        </div>
      </div>
    </div>
  );
}
