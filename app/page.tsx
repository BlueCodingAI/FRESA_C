"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import StarsBackground from "@/components/StarsBackground";
import FloatingParticles from "@/components/FloatingParticles";
import Header from "@/components/Header";

export default function Home() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Show character after a brief delay
    setTimeout(() => setIsReady(true), 300);
    // Show button after character appears
    setTimeout(() => setShowButton(true), 1500);
  }, []);

  const handleGetStarted = async () => {
    // Allow direct navigation to introduction without authentication
    // Registration will be prompted after Chapter 1 completion
    router.push("/introduction");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden flex items-center justify-center">
      {/* Stars background */}
      <StarsBackground />

      {/* Same header and right-side menu as rest of site (Contact + Login/Sign Up in thin box) */}
      <Header />

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
          <p className="text-sm md:text-base text-white/90 tracking-wide mb-4 animate-fade-in">
            FLORIDA LISTINGS REAL ESTATE SCHOOL PRESENTS:
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 animate-fade-in">
            THE EASIEST WAY
          </h1>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-blue-300 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            TO GET A REAL ESTATE LICENSE
          </h2>
          <div className="mt-6 text-2xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-amber-300 to-cyan-400 animate-fade-in drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]" style={{ animationDelay: "0.6s" }}>
            IN FLORIDA
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
