"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MrListings from "@/components/MrListings";
import AudioPlayer from "@/components/AudioPlayer";
import StarsBackground from "@/components/StarsBackground";
import TableOfContents from "@/components/TableOfContents";
import Header from "@/components/Header";
import { highlightText } from "@/lib/highlightText";

export default function IntroductionPage() {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [introText, setIntroText] = useState("Hello, future real estate professional. My name is Mr Listings. Welcome to my 63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission.");
  const [audioUrl, setAudioUrl] = useState("/audio/intro.mp3");
  const [timestampsUrl, setTimestampsUrl] = useState("/timestamps/intro.timestamps.json");
  const [loading, setLoading] = useState(true);
  const [searchHighlight, setSearchHighlight] = useState<string>("");
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [allUserProgress, setAllUserProgress] = useState<any[]>([]); // All chapters' progress

  useEffect(() => {
    fetchIntroduction();
    fetchAllChapters();
    fetchUserProgress();
    
    // Check for search highlight query
    const searchQuery = sessionStorage.getItem('searchHighlight');
    if (searchQuery) {
      setSearchHighlight(searchQuery);
      // Clear after a delay to allow highlighting to be applied
      setTimeout(() => {
        sessionStorage.removeItem('searchHighlight');
      }, 5000); // Clear after 5 seconds
    }
  }, []);

  const fetchUserProgress = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        // Not logged in, no progress to load
        return;
      }

      const response = await fetch("/api/progress", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllUserProgress(data.progress || []);
      }
    } catch (err) {
      console.error("Error fetching user progress:", err);
    }
  };

  const fetchIntroduction = async () => {
    try {
      // Use public API route that doesn't require authentication
      const response = await fetch("/api/introduction");
      if (response.ok) {
        const data = await response.json();
        if (data.introduction) {
          setIntroText(data.introduction.text || introText);
          setAudioUrl(data.introduction.audioUrl || "/audio/intro.mp3");
          setTimestampsUrl(data.introduction.timestampsUrl || "/timestamps/intro.timestamps.json");
        }
      }
    } catch (err) {
      console.error("Error fetching introduction:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllChapters = async () => {
    try {
      const response = await fetch("/api/chapters");
      if (response.ok) {
        const data = await response.json();
        setAllChapters(data.chapters || []);
      }
    } catch (err) {
      console.error("Error fetching all chapters:", err);
    }
  };

  const handleContinue = () => {
    // Navigate immediately without delay for better performance
    router.push("/chapter/1");
  };

  const menuItems = useMemo(() => {
    const items: Array<{ 
      id: string; 
      title: string; 
      path: string; 
      sectionId?: string;
      isChapter?: boolean;
      children?: Array<{ id: string; title: string; path: string; sectionId?: string }>;
    }> = [
      { id: "intro", title: "Introduction", path: "/introduction" },
    ];
    
    // Add all chapters with their sections + Chapter N Quiz (same as chapter page)
    allChapters.forEach((chapter) => {
      const chapterSections = chapter.sections 
        ? chapter.sections.map((section: any, index: number) => ({
            id: `section-${section.id}`,
            title: `${index + 1}. ${section.title}`,
            path: `/chapter/${chapter.number}`,
            sectionId: section.id,
          }))
        : [];
      
      const quizChild = {
        id: `chapter-${chapter.id}-quiz`,
        title: `Chapter ${chapter.number} Quiz`,
        path: `/chapter/${chapter.number}`,
        sectionId: 'quiz',
      };
      
      items.push({
        id: `chapter-${chapter.id}`,
        title: `Chapter ${chapter.number}. ${chapter.title}`,
        path: `/chapter/${chapter.number}`,
        isChapter: true,
        children: [...chapterSections, quizChild],
      });
    });
    
    return items;
  }, [allChapters]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />

      {/* Table of Contents */}
      <TableOfContents 
        items={menuItems} 
        currentPath="/introduction"
        allUserProgress={allUserProgress}
        currentChapterNumber={0}
      />

      {/* Concentric circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-pulse" />
        <div className="absolute inset-[50px] rounded-full border border-blue-500/15 animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-[100px] rounded-full border border-blue-500/10 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
        {/* Mr Listings Character - Center */}
        <div className={`mb-8 transition-all duration-1000 ${isAnimating ? 'scale-75 translate-x-[-200px] translate-y-[-200px] opacity-0' : 'scale-100 opacity-100'}`}>
          <MrListings size="large" />
        </div>

        {/* Text Box */}
        <div className="w-full max-w-2xl mb-8 animate-slide-up">
          <div className="relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-400 rotate-45" />
            <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl">
              {!loading && (
                <AudioPlayer
                  text={introText}
                  audioUrl={audioUrl}
                  timestampsUrl={timestampsUrl}
                  autoPlay={false}
                  highlightQuery={searchHighlight}
                />
              )}
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-4 px-12 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl animate-pulse-glow"
        >
          Let&apos;s Go!
        </button>
      </div>
    </main>
  );
}

