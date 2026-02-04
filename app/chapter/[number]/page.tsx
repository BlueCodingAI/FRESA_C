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
import QuizRegistrationPrompt from "@/components/QuizRegistrationPrompt";
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
  const [showQuizRegistrationPrompt, setShowQuizRegistrationPrompt] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [activePlayingSectionId, setActivePlayingSectionId] = useState<string | null>(null);
  const [hasAutoPlayedFirst, setHasAutoPlayedFirst] = useState(false);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [allUserProgress, setAllUserProgress] = useState<any[]>([]); // All chapters' progress
  const [accessChecked, setAccessChecked] = useState(false); // Track if access check is complete
  const [showRetryMessage, setShowRetryMessage] = useState(false);
  const [quizShuffle, setQuizShuffle] = useState(false);
  const [quizRetryKey, setQuizRetryKey] = useState(0); // Key to force quiz reset on retry

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
    fetchUserProgress(); // This also updates allUserProgress
    
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
      const targetChapterNumber = event.detail?.chapterNumber;
      
      if (sectionId) {
        if (sectionId === 'quiz') {
          // Check if current chapter quiz is completed before showing quiz
          if (userProgress && userProgress.quizCompleted && userProgress.quizScore >= (userProgress.quizTotal * 0.8)) {
            setShowQuiz(true);
          } else {
            alert("You must complete all sections of this chapter first, and pass the quiz with at least 80% to proceed.");
          }
        } else {
          // Check if we can navigate to this section
          if (targetChapterNumber && targetChapterNumber !== chapterNumber) {
            // Trying to navigate to a different chapter - check if previous chapter is completed
            if (targetChapterNumber > chapterNumber) {
              // Forward navigation - must have passed current chapter quiz
              if (!userProgress || !userProgress.quizCompleted || userProgress.quizScore < (userProgress.quizTotal * 0.8)) {
                alert("You must pass this chapter's quiz with at least 80% before proceeding to the next chapter.");
                return;
              }
            } else {
              // Backward navigation - allowed
            }
          }
          setCurrentSection(sectionId);
        }
      }
    };
    
    window.addEventListener('navigateToSection', handleNavigateToSection as EventListener);

    // Refetch when user returns to tab (e.g. after editing in admin) so section updates are shown
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchChapterData();
        fetchAllChapters();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("navigateToSection", handleNavigateToSection as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [chapterNumber, router]);

  // Check chapter access when progress is loaded
  useEffect(() => {
    if (!chapterNumber) {
      setAccessChecked(true);
      return;
    }

    // Chapter 1 is always accessible
    if (chapterNumber <= 1) {
      setAccessChecked(true);
      return;
    }

    // Check if all previous chapters are completed
    const checkChapterAccess = async () => {
      // Get auth token to check if user is logged in
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        // Not logged in - redirect to login or introduction
        alert("Please log in to access chapters.");
        router.push("/login");
        setAccessChecked(true);
        return;
      }

      // Fetch progress if not already loaded
      let progressToCheck = allUserProgress;
      if (progressToCheck.length === 0) {
        try {
          const response = await fetch("/api/progress", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            progressToCheck = data.progress || [];
            setAllUserProgress(progressToCheck);
          }
        } catch (err) {
          console.error("Error fetching progress for access check:", err);
        }
      }

      // Check if all previous chapters are completed
      for (let chNum = 1; chNum < chapterNumber; chNum++) {
        const progress = progressToCheck.find((p: any) => p.chapterNumber === chNum);
        if (!progress || !progress.quizCompleted || progress.quizScore < (progress.quizTotal * 0.8)) {
          // Previous chapter not completed - redirect to that chapter
          alert(`You must complete and pass Chapter ${chNum}'s quiz with at least 80% before accessing Chapter ${chapterNumber}.`);
          router.push(`/chapter/${chNum}`);
          setAccessChecked(true);
          return;
        }
      }

      // All checks passed - allow access
      setAccessChecked(true);
    };

    checkChapterAccess();
  }, [chapterNumber, allUserProgress, router]);

  const fetchAllChapters = async () => {
    try {
      const response = await fetch("/api/chapters", { cache: "no-store" });
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
      const response = await fetch(`/api/chapters/${chapterNumber}`, { cache: "no-store" });
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
        
        // Load progress after sections are loaded
        if (dbSections.length > 0) {
          // Wait a bit for progress to load, then set section
          setTimeout(() => {
            if (!currentSection) {
              // If no progress saved, start from first section
              setCurrentSection(dbSections[0].id);
            }
          }, 100);
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
        
        // Don't load quiz questions here - will load when quiz is shown with proper count
        // Quiz questions will be fetched from /api/chapters/[number]/quiz when showQuiz is true
        if (false && data.chapter.quizQuestions) {
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

  const fetchUserProgress = async () => {
    if (!chapterNumber) return;
    
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
        // Store all progress for navigation checks
        setAllUserProgress(data.progress || []);
        
        const chapterProgress = data.progress.find(
          (p: any) => p.chapterNumber === chapterNumber
        );
        
        if (chapterProgress) {
          setUserProgress(chapterProgress);
          
          // Resume from saved section if available
          if (chapterProgress.sectionId && sections.length > 0) {
            const sectionExists = sections.some(s => s.id === chapterProgress.sectionId);
            if (sectionExists) {
              setCurrentSection(chapterProgress.sectionId);
            } else if (sections.length > 0) {
              setCurrentSection(sections[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching user progress:", err);
    }
  };

  const saveProgress = async (sectionId?: string, sectionNumber?: number) => {
    if (!chapterNumber) return;
    
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        // Not logged in, can't save progress
        return;
      }

      await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterNumber,
          sectionId: sectionId || currentSection,
          sectionNumber: sectionNumber !== undefined ? sectionNumber : currentIndex + 1,
        }),
      });
    } catch (err) {
      console.error("Error saving progress:", err);
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
      // Not the last section - just move to next section
      // Save progress before moving to next section
      saveProgress(sections[currentIndex + 1].id, currentIndex + 2);
      setCurrentSection(sections[currentIndex + 1].id);
    } else {
      // Last section completed - show quiz (quiz only appears after ALL sections are done)
      // Check if user is logged in
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];
      
      // Chapter 1 quiz is accessible without login - registration is prompted AFTER completion
      if (!token && chapterNumber !== 1) {
        // User not logged in and not Chapter 1 - show registration prompt
        setShowQuizRegistrationPrompt(true);
        return;
      }
      
      setShowQuiz(true);
    }
  };

  const handlePrevious = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection);
    if (currentIndex > 0) {
      // Navigate to previous section within the same chapter
      setCurrentSection(sections[currentIndex - 1].id);
    } else if (currentIndex === 0 && chapterNumber) {
      // On first section - navigate to previous page
      if (chapterNumber === 1) {
        // If Chapter 1, go to introduction
        router.push("/introduction");
      } else {
        // Otherwise, go to previous chapter
        router.push(`/chapter/${chapterNumber - 1}`);
      }
    }
  };

  const handleQuizComplete = async (score: number, total: number) => {
    if (!chapterNumber) return;
    
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= 80;
    
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
    
    if (!token) {
      // Not logged in - show registration prompt
      setQuizScore({ score, total });
      setShowRegistrationPrompt(true);
      return;
    }
    
    // Save quiz result to progress
    try {
      const progressResponse = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterNumber,
          quizCompleted: passed,
          quizScore: score,
          quizTotal: total,
        }),
      });

      if (progressResponse.ok) {
        // After saving progress, refresh all progress to update sidebar
        const allProgressResponse = await fetch("/api/progress", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (allProgressResponse.ok) {
          const allProgressData = await allProgressResponse.json();
          setAllUserProgress(allProgressData.progress || []);
        }
      }
    } catch (err) {
      console.error("Error saving quiz progress:", err);
    }
    
    if (passed) {
      // Quiz passed (>= 80%) - send notification
      fetch("/api/quiz/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chapterNumber, score, total }),
        credentials: "include",
      }).catch(() => {});
      
      // Update local progress state
      setUserProgress((prev: any) => ({
        ...prev,
        quizCompleted: true,
        quizScore: score,
        quizTotal: total,
      }));
      
      // Quiz component will show results screen with "Continue to Next Chapter" button
      // which will call handleContinueToNextChapter when clicked
    } else {
      // Quiz failed (< 80%) - MUST retake, cannot proceed
      // Quiz component will show retry message with only "Take the quiz again" button
      setQuizScore({ score, total });
      setShowRetryMessage(false);
      // Don't allow navigation - user must retake
    }
  };
  
  const handleRetryQuiz = () => {
    setShowRetryMessage(false);
    // Clear quiz questions to fetch new random set
    setQuizQuestions([]);
    // Increment retry key to force quiz component to remount with completely fresh state
    setQuizRetryKey(prev => prev + 1);
    // Set shuffle to true for the new instance to get randomized questions
    setQuizShuffle(true);
    // Fetch new questions
    fetchQuizQuestions();
  };

  const handlePracticeAgain = () => {
    // User passed but wants to practice again
    setShowRetryMessage(false);
    // Clear quiz questions to fetch new random set
    setQuizQuestions([]);
    // Increment retry key to force quiz component to remount
    setQuizRetryKey(prev => prev + 1);
    setQuizShuffle(true);
    // Fetch new questions
    fetchQuizQuestions();
  };
  
  // Reset shuffle when quiz is closed (but not during retry)
  useEffect(() => {
    if (!showQuiz && quizShuffle && quizRetryKey === 0) {
      // Only reset shuffle if quiz is closed and we haven't retried
      setQuizShuffle(false);
    }
  }, [showQuiz, quizShuffle, quizRetryKey]);
  
  const handleContinueToNextChapter = async () => {
    // User passed (>= 80%) and wants to continue to next chapter
    setShowRetryMessage(false);
    const nextChapter = chapterNumber! + 1;
    // Get max chapter number (excluding chapter 0 which is introduction)
    const maxChapterNumber = Math.max(...allChapters.filter(ch => ch.number > 0).map(ch => ch.number), 0);
    
    // Refresh progress before navigating to ensure sidebar is updated
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
    
    if (token) {
      try {
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
        console.error("Error refreshing progress:", err);
      }
    }
    
    if (nextChapter <= maxChapterNumber) {
      router.push(`/chapter/${nextChapter}`);
    } else {
      // All chapters completed - go to practice exam
      router.push("/practice-exam");
    }
  };

  const handleGoToPracticeExam = () => {
    router.push("/practice-exam");
  };

  const handleGoToEndOfCourseExam = () => {
    router.push("/end-of-course-exam");
  };

  const handleGoToExams = () => {
    // Navigate to exam selection page which shows both Practice Exam and End-of-Course Exam options
    router.push("/exam-selection");
  };

  const currentSectionData = sections.find(s => s.id === currentSection);
  const currentIndex = sections.findIndex(s => s.id === currentSection);

  const handleAudioComplete = () => {
    // Audio completed - stop playing but don't auto-navigate
    // Student must manually press button to continue or take quiz
    setActivePlayingSectionId(null);
    setHasAutoPlayedFirst(false);
  };

  useEffect(() => {
    if (!loading && sections.length > 0 && currentSection) {
      setHasAutoPlayedFirst(false);
      // Save progress when section changes
      const currentIndex = sections.findIndex(s => s.id === currentSection);
      if (currentIndex >= 0) {
        saveProgress(currentSection, currentIndex + 1);
      }
    }
  }, [currentSection, sections, loading]);

  // Fetch quiz questions when quiz is shown
  useEffect(() => {
    if (showQuiz && chapterNumber && quizQuestions.length === 0) {
      fetchQuizQuestions();
    }
  }, [showQuiz, chapterNumber]);

  const fetchQuizQuestions = async () => {
    if (!chapterNumber) return;
    
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      // Chapter 1 quiz is accessible without login - registration is prompted AFTER completion
      if (!token && chapterNumber !== 1) {
        setShowRegistrationPrompt(true);
        setShowQuiz(false);
        return;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/chapters/${chapterNumber}/quiz`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setQuizQuestions(data.questions || []);
      } else {
        console.error("Failed to fetch quiz questions");
      }
    } catch (err) {
      console.error("Error fetching quiz questions:", err);
    }
  };

  if (!chapterNumber || isNaN(chapterNumber)) {
    return null;
  }

  // Show loading or block access until access check is complete
  if (!accessChecked || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-xl mb-4">Loading...</div>
            <div className="text-gray-400 text-sm">Checking chapter access...</div>
          </div>
        </div>
      </main>
    );
  }

  const chapterPath = `/chapter/${chapterNumber}`;

  if (showQuiz) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <TableOfContents 
          items={menuItems} 
          currentPath={chapterPath} 
          activeSectionId={activePlayingSectionId || undefined}
          allUserProgress={allUserProgress}
          currentChapterNumber={chapterNumber}
        />
        {!showRetryMessage && (
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:ml-64 md:pt-24">
            {quizQuestions.length > 0 ? (
              <Quiz 
                key={quizRetryKey} // Force remount on retry
                questions={quizQuestions} 
                onComplete={handleQuizComplete} 
                searchHighlight={searchHighlight}
                shuffle={true} // Always shuffle chapter quiz questions
                onRetry={handleRetryQuiz}
                // For last chapter: pass onContinue to show "Take End-Of-Course Exam" button
                // For other chapters: don't pass onContinue (will show "Continue to Next Chapter")
                // Don't pass onContinue for last chapter - use normal quiz result page
                onContinue={undefined}
                onPracticeAgain={handlePracticeAgain}
                onContinueToNextChapter={handleContinueToNextChapter}
                onGoToExams={(() => {
                  const maxChapterNumber = Math.max(...allChapters.filter(ch => ch.number > 0).map(ch => ch.number), 0);
                  return chapterNumber === maxChapterNumber ? handleGoToExams : undefined;
                })()}
                retryButtonText="Take the Quiz Again"
                chapterNumber={chapterNumber}
                isLastChapter={(() => {
                  const maxChapterNumber = Math.max(...allChapters.filter(ch => ch.number > 0).map(ch => ch.number), 0);
                  return chapterNumber === maxChapterNumber;
                })()}
              />
            ) : (
              <div className="text-white">No quiz questions available yet.</div>
            )}
          </div>
        )}
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
        {/* Retry message is now shown in Quiz component's results screen, so this modal is no longer needed */}
        {showQuizRegistrationPrompt && (
          <QuizRegistrationPrompt
            onRegister={() => {
              setShowQuizRegistrationPrompt(false);
              sessionStorage.setItem("redirectAfterLogin", `/chapter/${chapterNumber}`);
              router.push("/signup");
            }}
            onLogin={() => {
              setShowQuizRegistrationPrompt(false);
              sessionStorage.setItem("redirectAfterLogin", `/chapter/${chapterNumber}`);
              router.push("/login");
            }}
            onClose={() => {
              setShowQuizRegistrationPrompt(false);
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
      <TableOfContents 
        items={menuItems} 
        currentPath={chapterPath} 
        activeSectionId={activePlayingSectionId || undefined}
        allUserProgress={allUserProgress}
        currentChapterNumber={chapterNumber}
      />

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

        <div className="flex items-start justify-center py-6 px-4 overflow-x-hidden">
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
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
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
      {showQuizRegistrationPrompt && (
        <QuizRegistrationPrompt
          onRegister={() => {
            setShowQuizRegistrationPrompt(false);
            sessionStorage.setItem("redirectAfterLogin", `/chapter/${chapterNumber}`);
            router.push("/signup");
          }}
          onLogin={() => {
            setShowQuizRegistrationPrompt(false);
            sessionStorage.setItem("redirectAfterLogin", `/chapter/${chapterNumber}`);
            router.push("/login");
          }}
          onClose={() => {
            setShowQuizRegistrationPrompt(false);
          }}
        />
      )}
    </main>
  );
}

