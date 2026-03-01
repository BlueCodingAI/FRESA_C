"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface Student {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  quizzesPassed: number;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () =>
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];

  const checkAuthAndLoad = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const me = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!me.ok) {
        router.push("/login");
        return;
      }
      const meData = await me.json();
      if (!["Admin", "Developer", "Editor"].includes(meData.user.role)) {
        router.push("/");
        return;
      }

      await fetchStudents();
    } catch (e) {
      console.error(e);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const token = getToken();
    if (!token) return;
    const res = await fetch("/api/admin/students", {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to fetch students");
    setStudents((data.students || []).map((s: any) => ({ ...s, createdAt: s.createdAt })));
  };

  const deleteStudent = async (id: string, email: string) => {
    if (!confirm(`Delete student ${email}?`)) return;
    const token = getToken();
    if (!token) return;
    const res = await fetch("/api/admin/students", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Failed to delete student");
      return;
    }
    await fetchStudents();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />

      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Students</h1>
            <p className="text-gray-400 text-xs md:text-sm">Name, Email, Phone, Quizzes Passed, Date of Registration</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 bg-[#1a1f3a]/80 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all text-sm md:text-base w-full md:w-auto text-center"
            >
              ← Back
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-cyan-500/20 overflow-hidden">
          {/* Mobile: Card Layout */}
          <div className="md:hidden space-y-3 p-4">
            {students.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                No students yet.
              </div>
            ) : (
              students.map((s) => (
                <div key={s.id} className="bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg p-4 space-y-2">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Name</div>
                    <div className="text-white text-sm font-medium">{s.name || "(no name)"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Email</div>
                    <div className="text-cyan-200 text-sm break-all">{s.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Phone</div>
                    <div className="text-gray-300 text-sm">{s.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Chapter quizzes passed</div>
                    <div className="text-cyan-300 text-sm font-medium">{s.quizzesPassed ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Registered</div>
                    <div className="text-gray-300 text-sm">{new Date(s.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => deleteStudent(s.id, s.email)}
                      className="w-full px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-all text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0a0e27]/60">
                <tr>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Phone</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Quizzes passed</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold">Registered</th>
                  <th className="px-4 py-3 text-gray-300 text-sm font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-400" colSpan={6}>
                      No students yet.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="border-t border-cyan-500/10">
                      <td className="px-4 py-3 text-white">{s.name || "(no name)"}</td>
                      <td className="px-4 py-3 text-cyan-200">{s.email}</td>
                      <td className="px-4 py-3 text-gray-300">{s.phone || "—"}</td>
                      <td className="px-4 py-3 text-cyan-300 font-medium">{s.quizzesPassed ?? 0}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteStudent(s.id, s.email)}
                          className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-all text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


