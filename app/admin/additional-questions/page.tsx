"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StarsBackground from "@/components/StarsBackground";
import RichTextEditor from "@/components/RichTextEditor";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
  questionAudioUrl?: string | null;
  questionTimestampsUrl?: string | null;
  optionAudioUrls?: string[] | null;
  optionTimestampsUrls?: string[] | null;
  correctExplanationAudioUrl?: string | null;
  correctExplanationTimestampsUrl?: string | null;
  incorrectExplanationAudioUrls?: string[] | null;
  incorrectExplanationTimestampsUrls?: string[] | null;
  order: number;
}

export default function AdditionalQuestionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<QuizQuestion>>({
    question: "",
    options: ["", ""],
    correctAnswer: 0,
    explanation: { correct: "", incorrect: [] },
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
      const response = await fetch("/api/admin/additional-questions", {
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
      if (!token) {
        alert("Not authenticated");
        return;
      }

      const url = questionId
        ? `/api/admin/additional-questions/${questionId}`
        : "/api/admin/additional-questions";
      const method = questionId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(questionForm),
      });

      if (response.ok) {
        await fetchQuestions();
        setShowQuestionForm(false);
        setEditingQuestion(null);
        setQuestionForm({
          question: "",
          options: ["", ""],
          correctAnswer: 0,
          explanation: { correct: "", incorrect: [] },
          order: 0,
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save question"}`);
      }
    } catch (err) {
      console.error("Error saving question:", err);
      alert("Failed to save question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/additional-questions/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        await fetchQuestions();
      } else {
        alert("Failed to delete question");
      }
    } catch (err) {
      console.error("Error deleting question:", err);
      alert("Failed to delete question");
    }
  };

  const startEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question.id);
    setQuestionForm({
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      questionAudioUrl: question.questionAudioUrl,
      questionTimestampsUrl: question.questionTimestampsUrl,
      optionAudioUrls: question.optionAudioUrls,
      optionTimestampsUrls: question.optionTimestampsUrls,
      correctExplanationAudioUrl: question.correctExplanationAudioUrl,
      correctExplanationTimestampsUrl: question.correctExplanationTimestampsUrl,
      incorrectExplanationAudioUrls: question.incorrectExplanationAudioUrls,
      incorrectExplanationTimestampsUrls: question.incorrectExplanationTimestampsUrls,
      order: question.order,
    });
    setShowQuestionForm(true);
  };

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-b from-[#0a1a2e] via-[#1e3a5f] to-[#0a1a2e]">
          <Header />
          <StarsBackground />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-white text-xl">Loading...</div>
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
        <div className="relative z-10 min-h-screen pt-20 pb-8 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <button
                onClick={() => router.push("/admin")}
                className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
              >
                ← Back to Admin
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Additional Questions (Exam Only)
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                These questions only appear in Practice Exam and End-of-Course Exam, not in regular chapters.
              </p>
            </div>

            {/* Questions List */}
            <div className="bg-[#1a1f3a]/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-green-500/20 p-4 md:p-6 mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-white">Additional Questions</h2>
                <button
                  onClick={() => {
                    setShowQuestionForm(true);
                    setEditingQuestion(null);
                    setQuestionForm({
                      question: "",
                      options: ["", ""],
                      correctAnswer: 0,
                      explanation: { correct: "", incorrect: [] },
                      order: quizQuestions.length,
                    });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-green-500/50 transition-all duration-300 text-sm md:text-base w-full sm:w-auto text-center"
                >
                  + New Question
                </button>
              </div>

              <div className="space-y-4">
                {quizQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No additional questions yet</p>
                    <p className="text-xs mt-1">Add questions for Practice and End-of-Course Exams</p>
                  </div>
                ) : (
                  quizQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="p-3 md:p-4 bg-[#0a0e27]/50 border border-green-500/20 rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-lg font-semibold text-white mb-2">
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
                        <div className="flex gap-2 sm:ml-4">
                          <button
                            onClick={() => startEditQuestion(question)}
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="flex-1 sm:flex-none px-3 py-1.5 text-xs md:text-sm bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-all"
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
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
                <div className="bg-[#1a1f3a] rounded-2xl border border-green-500/20 p-4 md:p-6 w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                    {editingQuestion ? "Edit Question" : "New Question"}
                  </h2>

                  <div className="space-y-3 md:space-y-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                        Question
                      </label>
                      <RichTextEditor
                        value={questionForm.question || ""}
                        onChange={(value) =>
                          setQuestionForm({ ...questionForm, question: value })
                        }
                        rows={3}
                        placeholder="Enter the question text..."
                      />
                    </div>

                    <div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                        <label className="block text-xs md:text-sm font-medium text-gray-300">
                          Answer Options (select correct answer with radio button)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...(questionForm.options || []), ""];
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          className="px-2 md:px-3 py-1 text-xs md:text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all whitespace-nowrap"
                        >
                          + Add Option
                        </button>
                      </div>
                      {(questionForm.options || []).map((option, idx) => (
                        <div key={idx} className="mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={questionForm.correctAnswer === idx}
                              onChange={() =>
                                setQuestionForm({ ...questionForm, correctAnswer: idx })
                              }
                              className="w-4 h-4 text-green-500 flex-shrink-0"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(questionForm.options || [])];
                                newOptions[idx] = e.target.value;
                                setQuestionForm({ ...questionForm, options: newOptions });
                              }}
                              className="flex-1 min-w-0 px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-green-500/30 rounded-lg text-white"
                              placeholder={`Option ${idx + 1}`}
                            />
                            {(questionForm.options || []).length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = [...(questionForm.options || [])];
                                  newOptions.splice(idx, 1);
                                  let newCorrectAnswer = questionForm.correctAnswer || 0;
                                  if (newCorrectAnswer === idx) {
                                    newCorrectAnswer = 0;
                                  } else if (newCorrectAnswer > idx) {
                                    newCorrectAnswer = newCorrectAnswer - 1;
                                  }
                                  setQuestionForm({ 
                                    ...questionForm, 
                                    options: newOptions,
                                    correctAnswer: newCorrectAnswer
                                  });
                                }}
                                className="px-2 md:px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-xs md:text-sm flex-shrink-0"
                                title="Remove this option"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {(questionForm.options || []).length < 2 && (
                        <p className="text-xs text-yellow-400 mt-1">
                          ⚠️ At least 2 options are required
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                        Correct Answer Explanation
                      </label>
                      <RichTextEditor
                        value={questionForm.explanation?.correct || ""}
                        onChange={(value) =>
                          setQuestionForm({
                            ...questionForm,
                            explanation: {
                              ...questionForm.explanation,
                              correct: value,
                              incorrect: questionForm.explanation?.incorrect || [],
                            },
                          })
                        }
                        rows={2}
                        placeholder="Explanation for correct answer..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                        Incorrect Answer Explanations (one for each wrong option)
                      </label>
                      <div className="space-y-3">
                        {(questionForm.options || []).map((option, optionIdx) => {
                          if (optionIdx === questionForm.correctAnswer) {
                            return null;
                          }
                          const incorrectExplanations = questionForm.explanation?.incorrect || [];
                          while (incorrectExplanations.length <= optionIdx) {
                            incorrectExplanations.push("");
                          }
                          const incorrectText = incorrectExplanations[optionIdx] || "";
                          
                          return (
                            <div key={optionIdx} className="border border-red-500/30 rounded-lg p-2 md:p-3 bg-red-500/5">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                                <span className="text-xs md:text-sm font-medium text-red-400">
                                  Explanation for Option {optionIdx + 1} (Wrong Answer):
                                </span>
                                <span className="text-xs text-gray-400 italic">"{option}"</span>
                              </div>
                              <RichTextEditor
                                value={incorrectText}
                                onChange={(value) => {
                                  const newIncorrect = [...(questionForm.explanation?.incorrect || [])];
                                  while (newIncorrect.length <= optionIdx) {
                                    newIncorrect.push("");
                                  }
                                  newIncorrect[optionIdx] = value;
                                  setQuestionForm({
                                    ...questionForm,
                                    explanation: {
                                      ...questionForm.explanation,
                                      correct: questionForm.explanation?.correct || "",
                                      incorrect: newIncorrect,
                                    },
                                  });
                                }}
                                rows={2}
                                placeholder={`Why is option ${optionIdx + 1} incorrect?`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
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
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base bg-[#0a0e27]/50 border border-green-500/30 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mt-4 md:mt-6">
                    <button
                      onClick={() => handleSaveQuestion(editingQuestion || undefined)}
                      className="flex-1 px-4 py-2.5 text-sm md:text-base bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowQuestionForm(false);
                        setEditingQuestion(null);
                        setQuestionForm({
                          question: "",
                          options: ["", ""],
                          correctAnswer: 0,
                          explanation: { correct: "", incorrect: [] },
                          order: 0,
                        });
                      }}
                      className="px-4 py-2.5 text-sm md:text-base bg-[#0a0e27]/50 border border-gray-500/30 rounded-lg text-gray-300 hover:bg-[#0a0e27]/70 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}

