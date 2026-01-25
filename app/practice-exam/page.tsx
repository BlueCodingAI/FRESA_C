"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";
import Quiz, { QuizQuestion } from "@/components/Quiz";
import AuthGuard from "@/components/AuthGuard";

export default function PracticeExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showRetryMessage, setShowRetryMessage] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [showQuiz, setShowQuiz] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1];
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
        // Get 100 random questions
        const allQuestions = data.questions || [];
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        const selectedQuestions = shuffled.slice(0, 100);
        
        // Convert to QuizQuestion format
        const formattedQuestions: QuizQuestion[] = selectedQuestions.map((q: any) => ({
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
      } else {
        console.error("Failed to fetch exam questions");
      }
    } catch (err) {
      console.error("Error fetching exam questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (score: number, total: number) => {
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percentage >= 80;

    if (passed) {
      // Passed - can proceed to End-of-Course Exam
      router.push("/end-of-course-exam");
    } else {
      // Failed - show retry message
      setQuizScore({ score, total });
      setShowRetryMessage(true);
      setShowQuiz(false);
    }
  };

  const handleRetry = () => {
    setShowRetryMessage(false);
    // Fetch new random questions
    fetchQuestions();
    setShowQuiz(true);
  };

  const handleGoToEndOfCourse = () => {
    setShowRetryMessage(false);
    router.push("/end-of-course-exam");
  };

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
          <Header />
          <StarsBackground />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">Loading Practice Exam...</div>
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
                Practice Exam
              </h1>
              <Quiz questions={questions} onComplete={handleQuizComplete} shuffle={true} />
            </>
          )}
          
          {showRetryMessage && quizScore && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#1a1f3a] rounded-2xl border border-yellow-500/30 p-6 md:p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold text-white mb-4">Practice Exam Results</h2>
                <p className="text-gray-300 mb-6">
                  Your score was {quizScore.score} out of {quizScore.total}, which is {Math.round((quizScore.score / quizScore.total) * 100)}%.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all"
                  >
                    Take Practice Quiz Again
                  </button>
                  <button
                    onClick={handleGoToEndOfCourse}
                    className="flex-1 px-4 py-3 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                  >
                    Take End-Of-Course Exam
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

