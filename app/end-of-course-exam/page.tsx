"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import AuthGuard from "@/components/AuthGuard";

export default function EndOfCourseExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showQuiz, setShowQuiz] = useState(true);
  const [allChaptersCompleted, setAllChaptersCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  const [totalChapters, setTotalChapters] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    checkCompletion();
  }, []);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
  };

  const checkCompletion = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/progress/check-completion", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[End-of-Course Exam] Completion check:", data);
        setTotalChapters(data.totalChapters || null);
        
        if (data.allCompleted) {
          console.log("[End-of-Course Exam] All chapters completed, fetching questions...");
          setAllChaptersCompleted(true);
          setCheckingCompletion(false); // Set to false before fetching questions
          await fetchQuestions(); // Wait for questions to load
        } else {
          console.log("[End-of-Course Exam] Not all chapters completed");
          setCheckingCompletion(false);
        }
      } else {
        // Response not ok
        const errorData = await response.json().catch(() => ({}));
        console.error("[End-of-Course Exam] Failed to check completion:", response.status, errorData);
        setCheckingCompletion(false);
      }
    } catch (err) {
      console.error("Error checking completion:", err);
      setCheckingCompletion(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/exam/questions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[End-of-Course Exam] Fetched questions:", data.questions?.length || 0);
        // Questions are already shuffled and selected based on per-chapter settings
        // Just use all questions returned (they're already randomized)
        const allQuestions = data.questions || [];
        
        if (allQuestions.length === 0) {
          console.error("[End-of-Course Exam] No exam questions available");
          setLoading(false);
          return;
        }
        
        // Convert to QuizQuestion format
        const formattedQuestions: QuizQuestion[] = allQuestions.map((q: any) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          questionAudioUrl: q.questionAudioUrl,
          questionTimestampsUrl: q.questionTimestampsUrl,
          optionAudioUrls: q.optionAudioUrls,
          optionTimestampsUrls: q.optionTimestampsUrls,
          correctExplanationAudioUrl: q.correctExplanationAudioUrl,
          correctExplanationTimestampsUrl: q.correctExplanationTimestampsUrl,
          incorrectExplanationAudioUrls: q.incorrectExplanationAudioUrls,
          incorrectExplanationTimestampsUrls: q.incorrectExplanationTimestampsUrls,
        }));
        
        setQuestions(formattedQuestions);
        setLoading(false);
        console.log("[End-of-Course Exam] Questions loaded successfully, ready to show quiz");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[End-of-Course Exam] Failed to fetch exam questions:", response.status, errorData);
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching exam questions:", err);
      setLoading(false);
    }
  };

  const handleQuizComplete = async (score: number, total: number) => {
    const token = getToken();
    if (!token) return;

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= 75; // End-of-Course Exam passing score is 75%

    // Send completion notification only if passed
    if (passed) {
      try {
        await fetch("/api/exam/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            score,
            total,
            examType: "end-of-course",
          }),
        });
      } catch (err) {
        console.error("Error sending completion notification:", err);
      }
      
      // Passed - Quiz component will show results screen with success message
      // No need to redirect, let Quiz component handle the display
    } else {
      // Failed - Quiz component will show results with failure message and 30-day wait warning
      // No retry option for End-of-Course Exam
    }
  };

  const handleShowResults = () => {
    // Hide header when results are shown
    setShowResults(true);
  };

  if (checkingCompletion || loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
              <div className="text-white text-xl font-semibold">
                {checkingCompletion ? "Checking completion status..." : "Loading End-of-Course Exam..."}
              </div>
            </div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  if (!allChaptersCompleted) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8">
            <div className="bg-gradient-to-br from-[#1a1f3a]/95 to-[#0a0e27]/95 backdrop-blur-lg rounded-3xl border-2 border-red-500/40 shadow-2xl p-8 md:p-10 max-w-lg w-full text-center transform transition-all hover:scale-[1.02]">
              {/* Lock Icon */}
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-4">
                Exam Not Available
              </h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                You must complete all {totalChapters !== null ? totalChapters : 'available'} chapters before taking the End-of-Course Exam.
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
              >
                Go to Home
              </button>
            </div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:pt-24">
          {showQuiz && questions.length > 0 && (
            <>
              {/* Modern Header Section - Hide when quiz results are shown */}
              {!showResults && (
                <div className="text-center mb-8 md:mb-12">
                  <div className="inline-block mb-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto border-2 border-yellow-400/30">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-red-400 mb-3">
                    End-Of-Course Exam
                  </h1>
                  <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                    Final assessment to demonstrate your mastery of the course material
                  </p>
                </div>
              )}

              <Quiz 
                questions={questions} 
                onComplete={handleQuizComplete}
                onShowResults={handleShowResults}
                shuffle={true}
                disableRetry={true}
                disableBack={true}
              />
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

