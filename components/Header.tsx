"use client";

import Link from "next/link";
import UserMenu from "./UserMenu";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a1a2e]/95 backdrop-blur-md border-b border-blue-500/30 z-50 shadow-lg">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        <Link 
          href="/" 
          className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 transition-all"
        >
          Florida Real Estate Course
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/contact"
            className="hidden md:inline-flex px-3 py-2 rounded-lg border border-blue-500/30 text-blue-200 hover:bg-blue-500/10 transition-all text-sm"
          >
            Contact
          </Link>
          <SearchBar />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

