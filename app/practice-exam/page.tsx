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
  const [quizRetryKey, setQuizRetryKey] = useState(0);

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
    // Don't auto-navigate - Quiz component will show results with proper options
    // For Practice Exam: both pass and fail show options in Quiz component
  };

  const handleRetry = () => {
    // Increment retry key to force quiz component to remount with new questions
    setQuizRetryKey(prev => prev + 1);
    // Fetch new random questions for Practice Exam retry
    fetchQuestions();
  };

  const handleGoToEndOfCourse = () => {
    // Navigate to End-of-Course Exam from Practice Exam
    router.push("/end-of-course-exam");
  };

  const handlePracticeAgain = () => {
    // User wants to take another practice exam
    setQuizRetryKey(prev => prev + 1);
    fetchQuestions();
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
          {questions.length > 0 && (
            <>
              <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
                Practice Exam
              </h1>
              <Quiz 
                key={quizRetryKey}
                questions={questions} 
                onComplete={handleQuizComplete} 
                shuffle={true}
                onRetry={handleRetry}
                onContinue={handleGoToEndOfCourse}
                onPracticeAgain={handlePracticeAgain}
                retryButtonText="Take Practice Quiz Again"
                shuffleKey={quizRetryKey}
              />
            </>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}

