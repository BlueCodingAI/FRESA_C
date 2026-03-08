"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

type Filter = "all" | "to_me" | "to_student";

interface EmailEntry {
  id: string;
  to: string;
  subject: string;
  bodyPreview: string;
  sentAt: string;
}

export default function AdminCommunicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [recipient, setRecipient] = useState("");
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [groupedByDate, setGroupedByDate] = useState<Record<string, EmailEntry[]>>({});
  const [recipients, setRecipients] = useState<string[]>([]);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getToken = () =>
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];

  useEffect(() => {
    fetchData();
  }, [filter, recipient]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (filter === "to_student" && recipient) params.set("recipient", recipient);
      const res = await fetch(`/api/admin/communication?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        setGroupedByDate(data.groupedByDate || {});
        setRecipients(data.recipients || []);
        setAdminEmail(data.adminEmail || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const dateLabels = useMemo(() => {
    const keys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    return keys.map((key) => {
      if (key === today) return { key, label: "Today" };
      if (key === yesterday) return { key, label: "Yesterday" };
      const d = new Date(key + "T12:00:00");
      return {
        key,
        label: d.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, [groupedByDate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      <div className="relative z-10 container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col gap-4 mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-gray-400 hover:text-cyan-400 text-sm w-fit"
          >
            ← Admin
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
            Communication
          </h1>
          <p className="text-gray-400 text-sm">
            View all sent emails. Filter by recipient and see emails grouped by date.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl border border-cyan-500/20 p-4 md:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            <span className="text-gray-400 text-sm font-medium">Show:</span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "all" as Filter, label: "All emails" },
                  { value: "to_me" as Filter, label: "To me" },
                  { value: "to_student" as Filter, label: "To students" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setFilter(value);
                    if (value !== "to_student") setRecipient("");
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === value
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                      : "bg-[#0a0e27]/60 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {filter === "to_student" && recipients.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-gray-400 text-sm">Student:</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a0e27]/60 border border-cyan-500/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">All students</option>
                  {recipients.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {adminEmail && (
            <p className="text-gray-500 text-xs mt-3">
              &quot;To me&quot; = emails sent to {adminEmail}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-2 border-cyan-500/50 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : dateLabels.length === 0 ? (
            <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl border border-cyan-500/20 p-8 text-center">
              <p className="text-gray-400">No sent emails yet.</p>
              <p className="text-gray-500 text-sm mt-1">
                Emails will appear here after they are sent (verification, contact, notifications, etc.).
              </p>
            </div>
          ) : (
            dateLabels.map(({ key, label }) => (
              <div key={key}>
                <h2 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  {label}
                </h2>
                <div className="space-y-3">
                  {(groupedByDate[key] || []).map((email) => (
                    <div
                      key={email.id}
                      className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-xl border border-cyan-500/20 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expandedId === email.id ? null : email.id)
                        }
                        className="w-full px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-medium truncate pr-2">
                            {email.subject || "(No subject)"}
                          </p>
                          <p className="text-gray-400 text-sm mt-0.5">
                            To: {email.to}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-gray-500 text-xs">
                            {new Date(email.sentAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              expandedId === email.id ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </button>
                      {expandedId === email.id && (
                        <div className="px-4 pb-4 pt-0 border-t border-cyan-500/10">
                          <pre className="text-gray-400 text-xs sm:text-sm whitespace-pre-wrap font-sans mt-3 max-h-64 overflow-y-auto rounded-lg bg-[#0a0e27]/50 p-3">
                            {email.bodyPreview || "(No body)"}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
