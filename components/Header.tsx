"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import UserMenu from "./UserMenu";
import SearchBar from "./SearchBar";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);


  // Close mobile menu when clicking outside
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a1a2e]/95 backdrop-blur-md border-b border-blue-500/30 z-50 shadow-lg">
        <div className="h-full flex items-center justify-between px-4 md:px-6">
          {/* Logo - 63Hours */}
          <Link 
            href="/" 
            className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 transition-all"
          >
            63Hours
          </Link>

          {/* Desktop: Show Contact, Search, UserMenu */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/contact"
              className="px-3 py-2 rounded-lg border border-blue-500/30 text-blue-200 hover:bg-blue-500/10 transition-all text-sm"
            >
              Contact
            </Link>
            <SearchBar />
            <UserMenu />
          </div>

          {/* Mobile: Search Icon and Hamburger Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Search Icon - Icon only on mobile */}
            <div className="[&_button]:!p-2 [&_button]:!border [&_button]:!border-cyan-500/30 [&_button]:!rounded-lg [&_button]:!text-cyan-400 [&_button]:hover:!bg-cyan-500/10 [&_button]:!transition-all [&_button]:!bg-transparent [&_span]:!hidden [&_kbd]:!hidden [&_svg]:!w-6 [&_svg]:!h-6">
              <SearchBar />
            </div>
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Main Menu - overlay below header so top bar stays visible with right sidebar */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[55] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-64 min-h-[calc(100vh-4rem)] bg-[#0a1a2e] border-l border-cyan-500/30 z-[60] shadow-xl md:hidden overflow-y-auto">
            <div className="p-4 space-y-3">
              {/* Contact Button */}
              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full px-4 py-3 rounded-lg border border-blue-500/30 text-blue-200 hover:bg-blue-500/10 transition-all text-center font-medium"
              >
                Contact
              </Link>

              {/* User Menu Button */}
              <div className="w-full">
                <UserMenu />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

