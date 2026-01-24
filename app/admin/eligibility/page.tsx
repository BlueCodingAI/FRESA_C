"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StarsBackground from "@/components/StarsBackground";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
  quizType: string;
  order: number;
}

export default function EligibilityEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<QuizQuestion>>({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: { correct: "", incorrect: [] },
    quizType: "eligibility",
    order: 0,
  });

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
      const response = await fetch("/api/admin/quiz-questions?quizType=eligibility", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setQuizQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (questionId?: string) => {
    try {
      const token = getToken();
      const url = questionId
        ? `/api/admin/quiz-questions/${questionId}`
        : `/api/admin/quiz-questions`;
      const method = questionId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          ...questionForm,
          chapterId: null, // Eligibility questions are not tied to a chapter
        }),
      });

      if (response.ok) {
        await fetchQuestions();
        setShowQuestionForm(false);
        setEditingQuestion(null);
        setQuestionForm({
          question: "",
          options: ["", "", "", ""],
          correctAnswer: 0,
          explanation: { correct: "", incorrect: [] },
          quizType: "eligibility",
          order: 0,
        });
      }
    } catch (err) {
      console.error("Error saving question:", err);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/quiz-questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        await fetchQuestions();
      }
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  const startEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question.id);
    setQuestionForm(question);
    setShowQuestionForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e27] via-[#1a1f3a] to-[#0a0e27] relative overflow-hidden">
      <StarsBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <Link
            href="/admin"
            className="text-cyan-400 hover:text-cyan-300 mb-3 md:mb-4 inline-block text-sm md:text-base"
          >
            ← Back to Admin Panel
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 mb-2">
            Edit Eligibility Quiz
          </h1>
        </div>

        <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-orange-500/20 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-white">Eligibility Quiz Questions</h2>
            <button
              onClick={() => {
                setShowQuestionForm(true);
                setEditingQuestion(null);
                setQuestionForm({
                  question: "",
                  options: ["", "", "", ""],
                  correctAnswer: 0,
                  explanation: { correct: "", incorrect: [] },
                  quizType: "eligibility",
                  order: quizQuestions.length,
                });
              }}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-orange-500/50 transition-all duration-300 text-sm md:text-base w-full sm:w-auto text-center"
            >
              + New Question
            </button>
          </div>

          <div className="space-y-4">
            {quizQuestions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No eligibility quiz questions yet</p>
                <p className="text-xs mt-1">Add questions for the eligibility quiz</p>
              </div>
            ) : (
              quizQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-3 md:p-4 bg-[#0a0e27]/50 border border-orange-500/20 rounded-lg"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-white mb-2 break-words">
                        {question.question}
                      </h3>
                      <div className="space-y-1 mb-2">
                        {question.options.map((option, idx) => (
                          <div
                            key={idx}
                            className={`text-xs md:text-sm ${
                              idx === question.correctAnswer
                                ? "text-green-400 font-semibold"
                                : "text-gray-400"
                            }`}
                          >
                            {idx === question.correctAnswer ? "✓ " : "  "}
                            {option}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Correct Answer: Option {question.correctAnswer + 1} | Order: {question.order}
                      </div>
                    </div>
                    <div className="flex gap-2 md:ml-4">
                      <button
                        onClick={() => startEditQuestion(question)}
                        className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30 transition-all text-xs md:text-sm flex-1 md:flex-none"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all text-xs md:text-sm flex-1 md:flex-none"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Question Form Modal */}
        {showQuestionForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f3a] rounded-2xl border border-orange-500/20 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingQuestion ? "Edit Question" : "New Question"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question
                  </label>
                  <textarea
                    value={questionForm.question || ""}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, question: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-orange-500/30 rounded-lg text-white"
                    placeholder="Enter the question text..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Answer Options (select correct answer with radio button)
                  </label>
                  {(questionForm.options || []).map((option, idx) => (
                    <div key={idx} className="mb-2 flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={questionForm.correctAnswer === idx}
                        onChange={() =>
                          setQuestionForm({ ...questionForm, correctAnswer: idx })
                        }
                        className="w-4 h-4 text-orange-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(questionForm.options || [])];
                          newOptions[idx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOptions });
                        }}
                        className="flex-1 px-4 py-2 bg-[#0a0e27]/50 border border-orange-500/30 rounded-lg text-white"
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Correct Answer Explanation
                  </label>
                  <textarea
                    value={questionForm.explanation?.correct || ""}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: {
                          ...questionForm.explanation,
                          correct: e.target.value,
                          incorrect: questionForm.explanation?.incorrect || [],
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-orange-500/30 rounded-lg text-white"
                    placeholder="Explanation for correct answer..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Incorrect Answer Explanations (one per line)
                  </label>
                  <textarea
                    value={(questionForm.explanation?.incorrect || []).join("\n")}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: {
                          ...questionForm.explanation,
                          correct: questionForm.explanation?.correct || "",
                          incorrect: e.target.value.split("\n").filter((line) => line.trim()),
                        },
                      })
                    }
                    rows={4}
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-orange-500/30 rounded-lg text-white"
                    placeholder="One explanation per line..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={questionForm.order || 0}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 bg-[#0a0e27]/50 border border-orange-500/30 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleSaveQuestion(editingQuestion || undefined)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

