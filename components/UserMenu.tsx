"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: "Admin" | "Developer" | "Editor" | "Student";
}

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // If auth fails (401, 404, 500, etc.), just clear the token and show login
        // Don't log errors for 401/404 as they're expected when not logged in
        if (response.status >= 500) {
          console.warn("Auth service error:", response.status);
        }
        // Clear invalid token
        document.cookie = "auth-token=; path=/; max-age=0";
        setUser(null);
      }
    } catch (err) {
      // Silently handle network errors - just show login/signup
      console.warn("Auth check failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = "auth-token=; path=/; max-age=0";
    setUser(null);
    setShowMenu(false);
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 md:gap-4 w-full md:w-auto">
        <Link
          href="/login"
          className="w-full md:w-auto px-6 py-3 text-center text-cyan-400 hover:text-white hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 transition-all font-semibold rounded-xl border border-cyan-500/50 md:border-0 backdrop-blur-sm shadow-md hover:shadow-cyan-500/30 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="w-full md:w-auto px-6 py-3 text-center bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-cyan-500/50 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const isAdmin = ["Admin", "Developer", "Editor"].includes(user.role);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "from-red-500 to-pink-500";
      case "Developer":
        return "from-purple-500 to-indigo-500";
      case "Editor":
        return "from-blue-500 to-cyan-500";
      case "Student":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative w-full md:w-auto">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1f3a]/60 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-all font-medium"
      >
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getRoleColor(user.role)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
          {getInitials(user.name)}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-white text-xs font-medium leading-tight">{user.name}</div>
          <div className="text-cyan-400 text-[10px] leading-tight">{user.role === "Student" ? "RE Ninja 🥷" : user.role}</div>
        </div>
        <div className="text-left sm:hidden">
          <div className="text-white text-xs font-medium">{user.name.split(' ')[0]}</div>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-cyan-400 transition-transform ${
            showMenu ? "rotate-180" : ""
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
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-[65] md:z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-[#1a1f3a] border border-cyan-500/30 rounded-lg shadow-xl z-[70] md:z-50 overflow-hidden">
            <div className="p-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRoleColor(user.role)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{user.name}</div>
                  <div className="text-gray-400 text-sm truncate">{user.email}</div>
                  <div className="text-cyan-400 text-xs mt-1">{user.role === "Student" ? "RE Ninja 🥷" : user.role}</div>
                </div>
              </div>
            </div>

            <div className="py-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setShowMenu(false)}
                  className="block px-4 py-2 text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setShowMenu(false)}
                className="block px-4 py-2 text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

