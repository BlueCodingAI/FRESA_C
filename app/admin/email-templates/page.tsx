"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface EmailTemplateItem {
  key: string;
  name: string;
  subject: string;
  body: string;
  htmlBody: string | null;
}

export default function AdminEmailTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [editing, setEditing] = useState<Record<string, { subject: string; body: string; htmlBody: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () =>
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth-token="))
          ?.split("=")[1]
      : null;

  useEffect(() => {
    const fetchTemplates = async () => {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch("/api/admin/email-templates", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (res.status === 403 || res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) {
          setError("Failed to load email templates");
          return;
        }
        const data = await res.json();
        setTemplates(data.templates || []);
        const initial: Record<string, { subject: string; body: string; htmlBody: string }> = {};
        (data.templates || []).forEach((t: EmailTemplateItem) => {
          initial[t.key] = {
            subject: t.subject,
            body: t.body,
            htmlBody: t.htmlBody || "",
          };
        });
        setEditing(initial);
      } catch (_) {
        setError("Failed to load email templates");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [router]);

  const handleSave = async (key: string) => {
    const token = getToken();
    if (!token || !editing[key]) return;
    setSavingKey(key);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          key,
          subject: editing[key].subject,
          body: editing[key].body,
          htmlBody: editing[key].htmlBody || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save template");
        return;
      }
      setSuccess(`"${key}" saved.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (_) {
      setError("Failed to save template");
    } finally {
      setSavingKey(null);
    }
  };

  const updateEditing = (key: string, field: "subject" | "body" | "htmlBody", value: string) => {
    setEditing((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-white text-xl">Loading email templates...</div>
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
              className="text-cyan-400 hover:text-cyan-300 text-sm mb-2 inline-block"
            >
              ← Back to Admin
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Email Templates
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Edit subject and body for outgoing emails. Use placeholders like {"{{name}}"}, {"{{email}}"}, {"{{verificationLink}}"}, etc.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {templates.map((t) => (
            <div
              key={t.key}
              className="bg-[#1a1f3a]/90 backdrop-blur-lg border border-blue-500/30 rounded-2xl p-4 md:p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-white mb-1">{t.name}</h2>
              <p className="text-gray-500 text-xs mb-4">Key: {t.key}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Subject</label>
                  <input
                    type="text"
                    value={editing[t.key]?.subject ?? t.subject}
                    onChange={(e) => updateEditing(t.key, "subject", e.target.value)}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Body (plain text)</label>
                  <textarea
                    value={editing[t.key]?.body ?? t.body}
                    onChange={(e) => updateEditing(t.key, "body", e.target.value)}
                    rows={12}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm resize-y"
                    placeholder="Email body. Use {{name}}, {{email}}, etc. for placeholders."
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Body (HTML, optional)</label>
                  <textarea
                    value={editing[t.key]?.htmlBody ?? t.htmlBody ?? ""}
                    onChange={(e) => updateEditing(t.key, "htmlBody", e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono text-sm resize-y"
                    placeholder="Optional HTML version. Leave empty to use plain text only."
                  />
                </div>
                <button
                  onClick={() => handleSave(t.key)}
                  disabled={savingKey === t.key}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-all"
                >
                  {savingKey === t.key ? "Saving..." : "Save template"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
