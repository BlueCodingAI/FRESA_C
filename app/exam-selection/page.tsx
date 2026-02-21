"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StarsBackground from "@/components/StarsBackground";
import AuthGuard from "@/components/AuthGuard";

export default function ExamSelectionPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGoToPracticeExam = () => {
    router.push("/practice-exam");
  };

  const handleGoToEndOfCourseExam = () => {
    router.push("/end-of-course-exam");
  };

  if (!mounted) {
    return null;
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e] relative overflow-hidden">
        <Header />
        <StarsBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-20 pb-8 px-4 md:px-8 md:pt-24">
          <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-red-400 mb-4">
                Choose Your Exam
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
                You've completed all chapters! Select an exam to continue.
              </p>
            </div>

            {/* 30-Day Warning Notice */}
            <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-400/50 rounded-xl p-6 md:p-8 mb-8 max-w-2xl mx-auto">
              <div className="flex items-start gap-4">
                <svg className="w-8 h-8 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-yellow-200 font-semibold text-lg md:text-xl mb-2">Important Notice</p>
                  <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                    If you fail the End-of-Course Exam, you must wait <span className="font-bold text-white">30 days</span> before you can retake it (State Law requirement).
                  </p>
                </div>
              </div>
            </div>

            {/* Exam Options */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Practice Exam Card */}
              <div className="bg-gradient-to-br from-[#1a1f3a]/90 to-[#0a0e27]/90 backdrop-blur-lg rounded-2xl border-2 border-blue-500/30 shadow-2xl p-8 hover:border-blue-400/50 transition-all transform hover:scale-[1.02]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Practice Exam</h2>
                  <p className="text-gray-300 text-sm md:text-base mb-6 leading-relaxed">
                    Take a practice exam to prepare for the End-of-Course Exam. You can retake this as many times as needed.
                  </p>
                  <button
                    onClick={handleGoToPracticeExam}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                  >
                    Start Practice Exam
                  </button>
                </div>
              </div>

              {/* End-of-Course Exam Card */}
              <div className="bg-gradient-to-br from-[#1a1f3a]/90 to-[#0a0e27]/90 backdrop-blur-lg rounded-2xl border-2 border-yellow-500/30 shadow-2xl p-8 hover:border-yellow-400/50 transition-all transform hover:scale-[1.02]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">End-of-Course Exam</h2>
                  <p className="text-gray-300 text-sm md:text-base mb-6 leading-relaxed">
                    Take the official End-of-Course Exam. Passing score is 70%. If you fail, you must wait 30 days before retaking.
                  </p>
                  <button
                    onClick={handleGoToEndOfCourseExam}
                    className="w-full py-4 px-6 bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-400 hover:to-red-400 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50"
                  >
                    Start End-of-Course Exam
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

