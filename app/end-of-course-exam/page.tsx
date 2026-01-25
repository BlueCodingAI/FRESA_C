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
  const [showRetryMessage, setShowRetryMessage] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [showQuiz, setShowQuiz] = useState(true);
  const [allChaptersCompleted, setAllChaptersCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);
  const [totalChapters, setTotalChapters] = useState<number | null>(null);

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
        setTotalChapters(data.totalChapters || null);
        if (data.allCompleted) {
          setAllChaptersCompleted(true);
          fetchQuestions();
        } else {
          setCheckingCompletion(false);
        }
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
        return;
      }

      const response = await fetch("/api/exam/questions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Questions are already shuffled and selected based on per-chapter settings
        // Just use all questions returned (they're already randomized)
        const allQuestions = data.questions || [];
        
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
      } else {
        console.error("Failed to fetch exam questions");
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
    const passed = percentage >= 80;

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
      
      // Passed - show success and redirect
      router.push(`/congratulations?exam=end-of-course&score=${score}&total=${total}`);
    } else {
      // Failed - End-of-Course Exam does not allow retries
      // Just show the results (Quiz component will handle it with disableRetry)
      setShowQuiz(false);
    }
  };

  if (checkingCompletion || loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">
              {checkingCompletion ? "Checking completion status..." : "Loading End-of-Course Exam..."}
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
            <div className="bg-[#1a1f3a] rounded-2xl border border-red-500/30 p-6 md:p-8 max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Not Available</h2>
              <p className="text-gray-300 mb-6">
                You must complete all {totalChapters !== null ? totalChapters : 'available'} chapters before taking the End-of-Course Exam.
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all"
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
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8">
          {showQuiz && questions.length > 0 && (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
                End-Of-Course Exam
              </h1>
              <Quiz 
                questions={questions} 
                onComplete={handleQuizComplete} 
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

