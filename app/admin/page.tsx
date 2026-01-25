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
  const [editingChapterNumber, setEditingChapterNumber] = useState<string | null>(null);
  const [chapterNumberInput, setChapterNumberInput] = useState<{ [key: string]: number }>({});
  const [chapterQuizSettings, setChapterQuizSettings] = useState<{ [key: number]: number }>({});
  const [examChapterSettings, setExamChapterSettings] = useState<{ [key: number]: number }>({});
  const [editingChapterQuiz, setEditingChapterQuiz] = useState<number | null>(null);
  const [editingExamChapter, setEditingExamChapter] = useState<number | null>(null);
  const [chapterQuizInput, setChapterQuizInput] = useState<{ [key: number]: number }>({});
  const [examChapterInput, setExamChapterInput] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    checkAuth();
    fetchChapters();
    fetchChapterQuizSettings();
    fetchExamChapterSettings();
  }, []);

  const fetchChapterQuizSettings = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        return;
      }

      const response = await fetch("/api/admin/chapter-quiz-settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const settingsMap: { [key: number]: number } = {};
        (data.settings || []).forEach((s: any) => {
          settingsMap[s.chapterNumber] = s.questionCount;
        });
        setChapterQuizSettings(settingsMap);
        setChapterQuizInput(settingsMap);
      }
    } catch (err) {
      console.error("Error fetching chapter quiz settings:", err);
    }
  };

  const fetchExamChapterSettings = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        return;
      }

      const response = await fetch("/api/admin/exam-chapter-settings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const settingsMap: { [key: number]: number } = {};
        (data.settings || []).forEach((s: any) => {
          settingsMap[s.chapterNumber] = s.questionCount;
        });
        setExamChapterSettings(settingsMap);
        setExamChapterInput(settingsMap);
      }
    } catch (err) {
      console.error("Error fetching exam chapter settings:", err);
    }
  };

  const handleSaveChapterQuizCount = async (chapterNumber: number) => {
    const count = chapterQuizInput[chapterNumber];
    if (!count || count < 1) {
      alert("Question count must be at least 1");
      return;
    }

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        alert("Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/chapter-quiz-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          chapterNumber,
          questionCount: count,
        }),
      });

      if (response.ok) {
        setChapterQuizSettings({ ...chapterQuizSettings, [chapterNumber]: count });
        setEditingChapterQuiz(null);
        await fetchChapterQuizSettings();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error || "Failed to update setting"}`);
      }
    } catch (err) {
      console.error("Error updating chapter quiz setting:", err);
      alert("Failed to update setting");
    }
  };

  const handleSaveExamChapterCount = async (chapterNumber: number) => {
    const count = examChapterInput[chapterNumber] || 0;
    if (count < 0) {
      alert("Question count cannot be negative");
      return;
    }

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        alert("Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/exam-chapter-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          chapterNumber,
          questionCount: count,
        }),
      });

      if (response.ok) {
        setExamChapterSettings({ ...examChapterSettings, [chapterNumber]: count });
        setEditingExamChapter(null);
        await fetchExamChapterSettings();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error || "Failed to update setting"}`);
      }
    } catch (err) {
      console.error("Error updating exam chapter setting:", err);
      alert("Failed to update setting");
    }
  };

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

  const handleEditChapterNumber = (chapterId: string, currentNumber: number) => {
    setEditingChapterNumber(chapterId);
    setChapterNumberInput({ ...chapterNumberInput, [chapterId]: currentNumber });
  };

  const handleSaveChapterNumber = async (chapterId: string, chapterTitle: string) => {
    const newNumber = chapterNumberInput[chapterId];
    
    if (!newNumber || newNumber < 1) {
      alert("Chapter number must be at least 1");
      return;
    }

    // Check if another chapter already has this number
    const existingChapter = chapters.find(
      (ch) => ch.number === newNumber && ch.id !== chapterId
    );
    
    if (existingChapter) {
      if (!confirm(`Chapter ${newNumber} already exists (${existingChapter.title}). Do you want to swap the numbers?`)) {
        return;
      }
    }

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        alert("Not authenticated");
        return;
      }

      // If swapping, update both chapters
      if (existingChapter) {
        const currentChapter = chapters.find((ch) => ch.id === chapterId);
        if (currentChapter) {
          // Update the existing chapter to the current chapter's number
          await fetch(`/api/admin/chapters/${existingChapter.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              number: currentChapter.number,
              title: existingChapter.title,
              description: existingChapter.description,
            }),
          });
        }
      }

      // Update the current chapter
      const currentChapter = chapters.find((ch) => ch.id === chapterId);
      if (!currentChapter) {
        alert("Chapter not found");
        return;
      }

      const response = await fetch(`/api/admin/chapters/${chapterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          number: newNumber,
          title: currentChapter.title,
          description: currentChapter.description,
        }),
      });

      if (response.ok) {
        setEditingChapterNumber(null);
        await fetchChapters();
        alert(`Chapter number updated to ${newNumber}`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Error: ${errorData.error || "Failed to update chapter number"}`);
      }
    } catch (err) {
      console.error("Error updating chapter number:", err);
      alert("Failed to update chapter number");
    }
  };

  const handleCancelEditChapterNumber = () => {
    setEditingChapterNumber(null);
    setChapterNumberInput({});
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
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-2">
              Admin Panel
            </h1>
            <p className="text-sm md:text-base text-gray-400">
              Welcome, {user?.name || user?.email} ({user?.role})
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-[#1a1f3a]/80 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all text-sm md:text-base text-center"
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm md:text-base"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Special Pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Introduction Page Editor */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 md:mb-4 gap-3">
              <h2 className="text-lg md:text-xl font-bold text-white">Introduction Page</h2>
              <Link
                href="/admin/introduction"
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 text-sm w-full sm:w-auto text-center"
              >
                Edit
              </Link>
            </div>
            <p className="text-gray-400 text-xs md:text-sm">
              Edit introduction content, text, and audio
            </p>
          </div>

          {/* Additional Questions Editor */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-green-500/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 md:mb-4 gap-3">
              <h2 className="text-lg md:text-xl font-bold text-white">Additional Questions</h2>
              <Link
                href="/admin/additional-questions"
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-green-500/50 transition-all duration-300 text-sm w-full sm:w-auto text-center"
              >
                Edit
              </Link>
            </div>
            <p className="text-gray-400 text-xs md:text-sm">
              Manage additional questions for Practice & End-of-Course Exams
            </p>
          </div>

          {/* Chapter Quiz Settings */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-blue-500/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 md:mb-4 gap-3">
              <h2 className="text-lg md:text-xl font-bold text-white">Chapter Quiz Settings</h2>
            </div>
            <p className="text-gray-400 text-xs md:text-sm mb-4">
              Set number of random questions for each chapter's quiz
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chapters.filter(ch => ch.number > 0).map((chapter) => (
                <div key={chapter.id} className="flex items-center justify-between gap-2 p-2 bg-[#0a0e27]/50 rounded">
                  <span className="text-gray-300 text-xs md:text-sm flex-1">
                    Chapter {chapter.number}
                  </span>
                  {editingChapterQuiz === chapter.number ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={chapterQuizInput[chapter.number] || 10}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setChapterQuizInput({ ...chapterQuizInput, [chapter.number]: value });
                          }
                        }}
                        className="w-16 px-2 py-1 bg-[#0a0e27] border border-blue-500/50 rounded text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveChapterQuizCount(chapter.number)}
                        className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-green-400 hover:bg-green-500/30 text-xs transition-all"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingChapterQuiz(null);
                          setChapterQuizInput({ ...chapterQuizInput, [chapter.number]: chapterQuizSettings[chapter.number] || 10 });
                        }}
                        className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30 text-xs transition-all"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-white text-xs font-semibold w-8 text-right">
                        {chapterQuizSettings[chapter.number] || 10}
                      </span>
                      <button
                        onClick={() => {
                          setEditingChapterQuiz(chapter.number);
                          setChapterQuizInput({ ...chapterQuizInput, [chapter.number]: chapterQuizSettings[chapter.number] || 10 });
                        }}
                        className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/50 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-all"
                        title="Edit"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Exam Chapter Settings */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-purple-500/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 md:mb-4 gap-3">
              <h2 className="text-lg md:text-xl font-bold text-white">Practice & Final Exam Settings</h2>
            </div>
            <p className="text-gray-400 text-xs md:text-sm mb-4">
              Set number of questions from each chapter for Practice and End-of-Course exams
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chapters.filter(ch => ch.number > 0).map((chapter) => (
                <div key={chapter.id} className="flex items-center justify-between gap-2 p-2 bg-[#0a0e27]/50 rounded">
                  <span className="text-gray-300 text-xs md:text-sm flex-1">
                    Chapter {chapter.number}
                  </span>
                  {editingExamChapter === chapter.number ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={examChapterInput[chapter.number] || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 0) {
                            setExamChapterInput({ ...examChapterInput, [chapter.number]: value });
                          }
                        }}
                        className="w-16 px-2 py-1 bg-[#0a0e27] border border-purple-500/50 rounded text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveExamChapterCount(chapter.number)}
                        className="px-1.5 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-green-400 hover:bg-green-500/30 text-xs transition-all"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setEditingExamChapter(null);
                          setExamChapterInput({ ...examChapterInput, [chapter.number]: examChapterSettings[chapter.number] || 0 });
                        }}
                        className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30 text-xs transition-all"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-white text-xs font-semibold w-8 text-right">
                        {examChapterSettings[chapter.number] || 0}
                      </span>
                      <button
                        onClick={() => {
                          setEditingExamChapter(chapter.number);
                          setExamChapterInput({ ...examChapterInput, [chapter.number]: examChapterSettings[chapter.number] || 0 });
                        }}
                        className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 hover:bg-purple-500/30 text-xs transition-all"
                        title="Edit"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Students */}
          <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 md:mb-4 gap-3">
              <h2 className="text-lg md:text-xl font-bold text-white">Students</h2>
              <Link
                href="/admin/students"
                className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-sm w-full sm:w-auto text-center"
              >
                View
              </Link>
            </div>
            <p className="text-gray-400 text-xs md:text-sm">View and delete student accounts</p>
          </div>
        </div>

        {/* Chapters List */}
        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Chapters & Content</h2>
              <p className="text-gray-400 text-xs md:text-sm mt-1">
                All chapters starting from Chapter 1 (Introduction is managed separately above)
              </p>
            </div>
            <Link
              href="/admin/chapters/new"
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 text-sm md:text-base w-full md:w-auto text-center"
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
                  className="p-3 md:p-4 bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg hover:border-cyan-500/50 hover:bg-[#0a0e27]/70 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                        {editingChapterNumber === chapter.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl font-semibold text-white">Chapter</span>
                            <input
                              type="number"
                              min="1"
                              value={chapterNumberInput[chapter.id] || chapter.number}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (!isNaN(value) && value > 0) {
                                  setChapterNumberInput({
                                    ...chapterNumberInput,
                                    [chapter.id]: value,
                                  });
                                }
                              }}
                              className="w-20 px-2 py-1 bg-[#1a1f3a] border border-cyan-500/50 rounded text-white text-lg md:text-xl font-semibold focus:outline-none focus:border-cyan-500"
                              autoFocus
                            />
                            <span className="text-lg md:text-xl font-semibold text-white">:</span>
                            <span className="text-lg md:text-xl font-semibold text-white break-words">
                              {chapter.title || "Untitled Chapter"}
                            </span>
                            <button
                              onClick={() => handleSaveChapterNumber(chapter.id, chapter.title)}
                              className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-green-400 hover:bg-green-500/30 text-xs md:text-sm transition-all"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEditChapterNumber}
                              className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400 hover:bg-red-500/30 text-xs md:text-sm transition-all"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg md:text-xl font-semibold text-white break-words">
                              Chapter {chapter.number}: {chapter.title || "Untitled Chapter"}
                            </h3>
                            <button
                              onClick={() => handleEditChapterNumber(chapter.id, chapter.number)}
                              className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded text-cyan-400 hover:bg-cyan-500/30 text-xs transition-all"
                              title="Change Chapter Number"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                      {chapter.description ? (
                        <p className="text-gray-400 text-xs md:text-sm mb-2 line-clamp-2">{chapter.description}</p>
                      ) : (
                        <p className="text-gray-500 text-xs md:text-sm mb-2 italic">No description set</p>
                      )}
                      <div className="flex flex-wrap gap-3 md:gap-4 text-cyan-400 text-xs md:text-sm">
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
                    <div className="flex flex-col sm:flex-row gap-2 md:ml-4">
                      <Link
                        href={`/admin/chapters/${chapter.id}`}
                        className="px-3 md:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all text-xs md:text-sm text-center"
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
                        className="px-3 md:px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-xs md:text-sm"
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

