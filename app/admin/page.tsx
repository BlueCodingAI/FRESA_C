"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "Admin" | "Developer" | "Editor" | "Student";
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string | null;
  sections: any[];
  _count: {
    sections: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
    fetchChapters();
  }, []);

  const checkAuth = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        console.error("No auth token found");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Auth check failed:", response.status, errorData);
        router.push("/login");
        return;
      }

      const data = await response.json();
      setUser(data.user);

      if (!["Admin", "Developer", "Editor"].includes(data.user.role)) {
        console.error("User role not authorized:", data.user.role);
        router.push("/");
        return;
      }
    } catch (err) {
      console.error("Auth check error:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/chapters", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setChapters(data.chapters);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load chapters");
      }
    } catch (err) {
      console.error("Error fetching chapters:", err);
      setError("Failed to load chapters");
    }
  };

  const handleLogout = () => {
    document.cookie = "auth-token=; path=/; max-age=0";
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading Admin Panel...</div>
          <div className="text-gray-400 text-sm">Please wait while we verify your access</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Access Denied</div>
          <div className="text-gray-400 text-sm mb-4">You need to be logged in as an admin to access this page.</div>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
              Admin Panel
            </h1>
            <p className="text-gray-400">
              Welcome, {user?.name || user?.email} ({user?.role})
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-[#1a1f3a]/80 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Special Pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Introduction Page Editor */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Introduction Page</h2>
              <Link
                href="/admin/introduction"
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-sm"
              >
                Edit
              </Link>
            </div>
            <p className="text-gray-400 text-xs">
              Edit introduction content, text, and audio
            </p>
          </div>

          {/* Eligibility Quiz Editor */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-orange-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Eligibility Quiz</h2>
              <Link
                href="/admin/eligibility"
                className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-orange-500/50 transition-all duration-300 text-sm"
              >
                Edit
              </Link>
            </div>
            <p className="text-gray-400 text-xs">
              Manage eligibility quiz questions
            </p>
          </div>

          {/* Students */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Students</h2>
              <Link
                href="/admin/students"
                className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-sm"
              >
                View
              </Link>
            </div>
            <p className="text-gray-400 text-xs">View and delete student accounts</p>
          </div>
        </div>

        {/* Chapters List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Chapters & Content</h2>
              <p className="text-gray-400 text-sm mt-1">
                All chapters starting from Chapter 1 (Introduction is managed separately above)
              </p>
            </div>
            <Link
              href="/admin/chapters/new"
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
            >
              + New Chapter
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {chapters.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg mb-2">No chapters yet</p>
                <p className="text-sm">Create your first chapter to get started</p>
              </div>
            ) : (
              chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="p-4 bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg hover:border-cyan-500/50 hover:bg-[#0a0e27]/70 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-1">
                        Chapter {chapter.number}: {chapter.title || "Untitled Chapter"}
                      </h3>
                      {chapter.description ? (
                        <p className="text-gray-400 text-sm mb-2">{chapter.description}</p>
                      ) : (
                        <p className="text-gray-500 text-sm mb-2 italic">No description set</p>
                      )}
                      <div className="flex gap-4 text-cyan-400 text-sm">
                        <span>{chapter._count.sections} section{chapter._count.sections !== 1 ? "s" : ""}</span>
                        <Link
                          href={`/chapter/${chapter.number}`}
                          target="_blank"
                          className="text-blue-400 hover:text-blue-300 underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Page
                        </Link>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link
                        href={`/admin/chapters/${chapter.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all text-sm"
                      >
                        Edit All Content
                      </Link>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete Chapter ${chapter.number}: ${chapter.title}? This will also delete all sections, objectives, key terms, and quiz questions.`)) {
                            try {
                              const token = document.cookie
                                .split("; ")
                                .find((row) => row.startsWith("auth-token="))
                                ?.split("=")[1];
                              
                              const response = await fetch(`/api/admin/chapters/${chapter.id}`, {
                                method: "DELETE",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                                credentials: 'include',
                              });
                              
                              if (response.ok) {
                                await fetchChapters();
                                alert("Chapter deleted successfully!");
                              } else {
                                const error = await response.json();
                                alert(`Error: ${error.error || "Failed to delete chapter"}`);
                              }
                            } catch (err) {
                              console.error("Error deleting chapter:", err);
                              alert("Failed to delete chapter");
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

