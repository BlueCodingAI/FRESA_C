"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import MrListings from "@/components/MrListings";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import StarsBackground from "@/components/StarsBackground";
import TableOfContents from "@/components/TableOfContents";
import Header from "@/components/Header";
import RegistrationPrompt from "@/components/RegistrationPrompt";
import { highlightText, highlightTextArray } from "@/lib/highlightText";

// Lazy load AudioPlayer to improve initial page load
const AudioPlayer = dynamic(() => import("@/components/AudioPlayer"), {
  ssr: false,
  loading: () => <div className="text-white">Loading audio player...</div>
});

interface Section {
  id: string;
  title: string;
  text?: string;
  type: string;
  audioUrl?: string | null;
  timestampsUrl?: string | null;
  imageUrl?: string | null;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  description?: string | null;
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const chapterNumber = params?.number ? parseInt(params.number as string) : null;
  
  const [currentSection, setCurrentSection] = useState<string>("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chapterData, setChapterData] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [searchHighlight, setSearchHighlight] = useState<string>("");
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [activePlayingSectionId, setActivePlayingSectionId] = useState<string | null>(null);
  const [hasAutoPlayedFirst, setHasAutoPlayedFirst] = useState(false);
  const [allChapters, setAllChapters] = useState<any[]>([]);

  useEffect(() => {
    console.log('[ChapterPage] Mounted with chapterNumber:', chapterNumber);
    if (!chapterNumber || isNaN(chapterNumber)) {
      console.error('[ChapterPage] Invalid chapter number:', chapterNumber);
      router.push("/");
      return;
    }
    
    console.log('[ChapterPage] Fetching data for chapter:', chapterNumber);
    fetchAllChapters();
    fetchChapterData();
    
    // Check for search highlight query from search results
    const searchQuery = sessionStorage.getItem('searchHighlight');
    if (searchQuery) {
      setSearchHighlight(searchQuery);
      setTimeout(() => {
        sessionStorage.removeItem('searchHighlight');
      }, 5000);
    }
    
    // Listen for section navigation events from TableOfContents
    const handleNavigateToSection = (event: CustomEvent) => {
      const sectionId = event.detail?.sectionId;
      if (sectionId) {
        if (sectionId === 'quiz') {
          setShowQuiz(true);
        } else {
          setCurrentSection(sectionId);
        }
      }
    };
    
    window.addEventListener('navigateToSection', handleNavigateToSection as EventListener);
    
    return () => {
      window.removeEventListener('navigateToSection', handleNavigateToSection as EventListener);
    };
  }, [chapterNumber, router]);

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

  const fetchChapterData = async () => {
    if (!chapterNumber) return;
    
    try {
      const response = await fetch(`/api/chapters/${chapterNumber}`);
      if (response.ok) {
        const data = await response.json();
        setChapterData(data.chapter);
        
        const dbSections: Section[] = [];
        
        if (data.chapter.sections) {
          data.chapter.sections.forEach((section: any) => {
            if (section.type !== 'introduction') {
              dbSections.push({
                id: section.id,
                title: section.title,
                text: section.text,
                type: section.type || 'content',
                audioUrl: section.audioUrl,
                timestampsUrl: section.timestampsUrl,
                imageUrl: section.imageUrl || null,
              });
              
              // Debug: Log image URL if present
              if (section.imageUrl) {
                console.log(`[Chapter Page] Section "${section.title}" has image:`, section.imageUrl);
              }
            }
          });
        }
        
        setSections(dbSections);
        
        if (dbSections.length > 0 && !currentSection) {
          setCurrentSection(dbSections[0].id);
        }
        
        const targetSection = sessionStorage.getItem('targetSection');
        if (targetSection) {
          if (targetSection === 'quiz') {
            setShowQuiz(true);
            sessionStorage.removeItem('targetSection');
            setActivePlayingSectionId(null);
          } else {
            const sectionExists = dbSections.some(s => s.id === targetSection);
            if (sectionExists) {
              setCurrentSection(targetSection);
              sessionStorage.removeItem('targetSection');
              setActivePlayingSectionId(null);
            } else {
              sessionStorage.removeItem('targetSection');
              if (dbSections.length > 0) {
                setCurrentSection(dbSections[0].id);
              }
            }
          }
        }
        
        if (data.chapter.quizQuestions) {
          setQuizQuestions(data.chapter.quizQuestions.map((q: any) => {
            // Ensure JSON fields are properly parsed if they're strings
            let optionAudioUrls = q.optionAudioUrls;
            let optionTimestampsUrls = q.optionTimestampsUrls;
            let incorrectExplanationAudioUrls = q.incorrectExplanationAudioUrls;
            let incorrectExplanationTimestampsUrls = q.incorrectExplanationTimestampsUrls;
            
            // Parse JSON strings if needed
            if (typeof optionAudioUrls === 'string') {
              try {
                optionAudioUrls = JSON.parse(optionAudioUrls);
              } catch (e) {
                console.error('Failed to parse optionAudioUrls:', e);
                optionAudioUrls = null;
              }
            }
            if (typeof optionTimestampsUrls === 'string') {
              try {
                optionTimestampsUrls = JSON.parse(optionTimestampsUrls);
              } catch (e) {
                console.error('Failed to parse optionTimestampsUrls:', e);
                optionTimestampsUrls = null;
              }
            }
            if (typeof incorrectExplanationAudioUrls === 'string') {
              try {
                incorrectExplanationAudioUrls = JSON.parse(incorrectExplanationAudioUrls);
              } catch (e) {
                console.error('Failed to parse incorrectExplanationAudioUrls:', e);
                incorrectExplanationAudioUrls = null;
              }
            }
            if (typeof incorrectExplanationTimestampsUrls === 'string') {
              try {
                incorrectExplanationTimestampsUrls = JSON.parse(incorrectExplanationTimestampsUrls);
              } catch (e) {
                console.error('Failed to parse incorrectExplanationTimestampsUrls:', e);
                incorrectExplanationTimestampsUrls = null;
              }
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('📝 Quiz question loaded:', {
                id: q.id,
                hasCorrectExplanationAudio: !!q.correctExplanationAudioUrl,
                correctExplanationAudioUrl: q.correctExplanationAudioUrl,
                incorrectExplanationAudioUrls: incorrectExplanationAudioUrls,
                isArray: Array.isArray(incorrectExplanationAudioUrls),
                arrayLength: Array.isArray(incorrectExplanationAudioUrls) ? incorrectExplanationAudioUrls.length : 0,
              });
            }
            
            return {
              id: q.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              audioUrl: q.audioUrl,
              timestampsUrl: q.timestampsUrl,
              questionAudioUrl: q.questionAudioUrl,
              questionTimestampsUrl: q.questionTimestampsUrl,
              optionAudioUrls: optionAudioUrls,
              optionTimestampsUrls: optionTimestampsUrls,
              explanationAudioUrl: q.explanationAudioUrl,
              explanationTimestampsUrl: q.explanationTimestampsUrl,
              correctExplanationAudioUrl: q.correctExplanationAudioUrl,
              correctExplanationTimestampsUrl: q.correctExplanationTimestampsUrl,
              incorrectExplanationAudioUrls: incorrectExplanationAudioUrls,
              incorrectExplanationTimestampsUrls: incorrectExplanationTimestampsUrls,
            };
          }));
        }
      } else {
        console.warn(`Chapter ${chapterNumber} not found in database`);
        setSections([]);
      }
    } catch (err) {
      console.error("Error fetching chapter data:", err);
    } finally {
      setLoading(false);
    }
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
    
    // Add all chapters with their sections
    allChapters.forEach((chapter) => {
      const chapterSections = chapter.sections 
        ? chapter.sections.map((section: any, index: number) => ({
            id: `section-${section.id}`,
            title: `${index + 1}. ${section.title}`,
            path: `/chapter/${chapter.number}`,
            sectionId: section.id,
          }))
        : [];
      
      // If this is the current chapter, use the loaded sections (which might be more up-to-date)
      if (chapterData && chapter.id === chapterData.id && sections.length > 0) {
        const currentChapterSections = sections.map((section, index) => ({
          id: `section-${section.id}`,
          title: `${index + 1}. ${section.title}`,
          path: `/chapter/${chapter.number}`,
          sectionId: section.id,
        }));
        items.push({
          id: `chapter-${chapter.id}`,
          title: `Chapter ${chapter.number}. ${chapter.title}`,
          path: `/chapter/${chapter.number}`,
          isChapter: true,
          children: currentChapterSections,
        });
      } else {
        items.push({
          id: `chapter-${chapter.id}`,
          title: `Chapter ${chapter.number}. ${chapter.title}`,
          path: `/chapter/${chapter.number}`,
          isChapter: true,
          children: chapterSections,
        });
      }
    });
    
    return items;
  }, [allChapters, sections, chapterData]);

  const handleNext = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id);
    } else {
      setShowQuiz(true);
    }
  };

  const handlePrevious = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id);
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    if (!chapterNumber) return;
    
    const progress = {
      chapter: chapterNumber,
      section: "complete",
      score,
      total,
      completed: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`chapter${chapterNumber}Progress`, JSON.stringify(progress));
    
    // Store chapter number for congratulations page
    sessionStorage.setItem('completedChapter', chapterNumber.toString());
    
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
    
    if (!token) {
      setQuizScore({ score, total });
      setShowRegistrationPrompt(true);
    } else {
      // Send admin notification email (best-effort)
      fetch("/api/quiz/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chapterNumber, score, total }),
        credentials: "include",
      }).catch(() => {});
      router.push(`/congratulations?chapter=${chapterNumber}`);
    }
  };

  const currentSectionData = sections.find(s => s.id === currentSection);
  const currentIndex = sections.findIndex(s => s.id === currentSection);

  const handleAudioComplete = () => {
    setActivePlayingSectionId(null);
    setHasAutoPlayedFirst(false);
    
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex < sections.length - 1) {
      setTimeout(() => {
        const nextSection = sections[currentIndex + 1];
        setCurrentSection(nextSection.id);
        setHasAutoPlayedFirst(false);
      }, 500);
    } else {
      setTimeout(() => {
        setShowQuiz(true);
      }, 500);
    }
  };

  useEffect(() => {
    if (!loading && sections.length > 0 && currentSection) {
      setHasAutoPlayedFirst(false);
    }
  }, [currentSection, sections, loading]);

  if (!chapterNumber || isNaN(chapterNumber)) {
    return null;
  }

  const chapterPath = `/chapter/${chapterNumber}`;

  if (showQuiz) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <TableOfContents items={menuItems} currentPath={chapterPath} activeSectionId={activePlayingSectionId || undefined} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
            {chapterData ? `Chapter ${chapterData.number} Quiz` : `Chapter ${chapterNumber} Quiz`}
          </h1>
          {quizQuestions.length > 0 ? (
            <Quiz questions={quizQuestions} onComplete={handleQuizComplete} searchHighlight={searchHighlight} />
          ) : (
            <div className="text-white">No quiz questions available yet.</div>
          )}
        </div>
        {showRegistrationPrompt && quizScore && (
          <RegistrationPrompt
            score={quizScore.score}
            total={quizScore.total}
            onRegister={() => {
              setShowRegistrationPrompt(false);
              sessionStorage.setItem("redirectAfterLogin", `/congratulations?chapter=${chapterNumber}`);
              router.push("/signup");
            }}
            onLogin={() => {
              setShowRegistrationPrompt(false);
              sessionStorage.setItem("redirectAfterLogin", `/congratulations?chapter=${chapterNumber}`);
              router.push("/login");
            }}
            onSkip={() => {
              setShowRegistrationPrompt(false);
              router.push(`/congratulations?chapter=${chapterNumber}`);
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
      <Header />
      <StarsBackground />
      <TableOfContents items={menuItems} currentPath={chapterPath} activeSectionId={activePlayingSectionId || undefined} />

      <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
        <div className={`mb-8 ${currentIndex === 0 ? 'block' : 'hidden md:block'}`}>
          <div className="flex justify-center mb-6">
            <MrListings size="small" isLecturing={true} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              FLORIDA REAL ESTATE SALES ASSOCIATE COURSE
            </h1>
            <p className="text-blue-300 text-lg md:text-xl">
              {chapterData ? `Chapter ${chapterData.number}: ${chapterData.title}` : `Chapter ${chapterNumber}: Loading...`}
            </p>
            {chapterData?.description && (
              <p 
                className="text-gray-300 text-base md:text-lg mt-2 max-w-3xl mx-auto"
                dangerouslySetInnerHTML={{ __html: chapterData.description }}
              />
            )}
            <div className="mt-4 text-sm text-gray-400">
              Section {currentIndex + 1} of {sections.length}
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center py-6 px-4 overflow-x-hidden">
          <div className="w-full max-w-5xl">
            <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl shadow-2xl animate-scale-in overflow-hidden flex flex-col">
              {/* Header - Fixed */}
              <div className="px-6 md:px-8 pt-6 md:pt-8 pb-6 md:pb-8 border-b border-blue-500/20 flex-shrink-0">
                <h2 className="text-xl md:text-2xl font-bold text-white break-words">
                  {currentSectionData?.title}
                </h2>
              </div>
              
              {/* Section Image - Full width, no side padding, edge-to-edge, cropped sides */}
              {currentSectionData?.imageUrl && (
                <div className="w-full overflow-hidden">
                  <div className="relative w-full group">
                    <div className="relative overflow-hidden shadow-2xl border-y-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm">
                      <div className="relative w-full" style={{ paddingLeft: '15%', paddingRight: '15%', marginLeft: '-15%', marginRight: '-15%', width: '130%' }}>
                        <img
                          src={currentSectionData.imageUrl}
                          alt={currentSectionData.title || "Section image"}
                          className="w-full h-auto max-h-[400px] object-contain md:object-fill md:h-[400px] transition-transform duration-500 group-hover:scale-[1.01]"
                          style={{ 
                            width: '100%', 
                            display: 'block'
                          }}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="p-8 text-center text-gray-400">Image not found</div>';
                            }
                          }}
                        />
                      </div>
                      {/* Decorative gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/0 via-transparent to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                  </div>
                </div>
              )}

              {/* Content - No scrollbar, content fits naturally */}
              <div className="px-6 md:px-8 py-6 md:py-8" style={{ wordWrap: "break-word", overflowWrap: "break-word" }}>

                {currentSectionData?.text && (
                  <AudioPlayer
                    key={currentSection}
                    text={currentSectionData.text}
                    audioUrl={currentSectionData.audioUrl || undefined}
                    timestampsUrl={currentSectionData.timestampsUrl || undefined}
                    autoPlay={!hasAutoPlayedFirst && !!currentSectionData.audioUrl}
                    onComplete={handleAudioComplete}
                    onPlayingChange={(isPlaying) => {
                      if (isPlaying) {
                        setActivePlayingSectionId(currentSection);
                        setHasAutoPlayedFirst(true);
                      } else {
                        setActivePlayingSectionId(null);
                      }
                    }}
                    highlightQuery={searchHighlight}
                  />
                )}
                
                {currentSectionData && !currentSectionData.audioUrl && (
                  <div className="text-yellow-400 text-sm mt-4">
                    ⚠️ Audio not available for this section yet. Please generate audio in the admin panel.
                  </div>
                )}
                {!currentSectionData && !loading && (
                  <div className="text-yellow-400 text-sm mt-4">
                    ⚠️ No sections available for this chapter yet. Please add sections in the admin panel.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                {currentIndex < sections.length - 1 ? "Next" : "Start Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

