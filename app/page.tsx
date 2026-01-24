"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MrListings from "@/components/MrListings";
import StarsBackground from "@/components/StarsBackground";
import FloatingParticles from "@/components/FloatingParticles";
import UserMenu from "@/components/UserMenu";

export default function Home() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Show character after a brief delay
    setTimeout(() => setIsReady(true), 300);
    // Show button after character appears
    setTimeout(() => setShowButton(true), 1500);
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

  const handleGetStarted = async () => {
    // Allow direct navigation to introduction without authentication
    // Registration will be prompted after Chapter 1 completion
    router.push("/introduction");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden flex items-center justify-center">
      {/* Stars background */}
      <StarsBackground />

      {/* Header with Hamburger Menu */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a1a2e]/95 backdrop-blur-md border-b border-blue-500/30 z-50 shadow-lg">
        <div className="h-full flex items-center justify-between px-4 md:px-6">
          {/* Logo - 63Hours */}
          <Link 
            href="/" 
            className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 transition-all"
          >
            63Hours
          </Link>

          {/* Desktop: Show UserMenu */}
          <div className="hidden md:block">
            <UserMenu />
          </div>

          {/* Mobile: Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all"
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
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-64 bg-[#0a1a2e] border-l border-cyan-500/30 z-50 shadow-xl md:hidden overflow-y-auto">
            <div className="p-4 space-y-3">
              {/* User Menu Buttons */}
              <div className="w-full">
                <UserMenu />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Concentric circles - animated */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[800px] md:h-[800px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-pulse" />
        <div className="absolute inset-[80px] rounded-full border border-blue-500/20 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-[160px] rounded-full border border-blue-500/10 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-[240px] rounded-full border border-blue-400/20 animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-20 md:pt-0">
        {/* App Name */}
        <div className={`mb-12 transition-all duration-1000 ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in">
            Florida Real Estate
          </h1>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-blue-300 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            Sales Associate Course
          </h2>
          <div className="mt-6 text-lg md:text-xl text-gray-300 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            63 Hour Pre-License Education
          </div>
        </div>

        {/* Mr Listings Character - Large and Animated */}
        <div className={`mb-12 transition-all duration-1000 ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} style={{ transitionDelay: "0.5s" }}>
          <MrListings size="large" />
        </div>

        {/* WELCOME Button */}
        <div className={`transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white font-bold py-5 px-16 rounded-2xl text-xl md:text-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-2xl hover:shadow-blue-500/50 animate-pulse-glow"
          >
            WELCOME
          </button>
        </div>
      </div>

      {/* Floating particles effect */}
      <FloatingParticles />
    </main>
  );
}
