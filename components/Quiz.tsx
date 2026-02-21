"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import MrListings from "./MrListings";
import AudioPlayer from "./AudioPlayer";
import { highlightText, highlightTextHTML } from "@/lib/highlightText";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: {
    correct: string;
    incorrect: string[];
  };
  audioUrl?: string | null;
  timestampsUrl?: string | null;
  questionAudioUrl?: string | null;
  questionTimestampsUrl?: string | null;
  optionAudioUrls?: string[] | null;
  optionTimestampsUrls?: string[] | null;
  explanationAudioUrl?: string | null;
  explanationTimestampsUrl?: string | null;
  correctExplanationAudioUrl?: string | null;
  correctExplanationTimestampsUrl?: string | null;
  incorrectExplanationAudioUrls?: string[] | null;
  incorrectExplanationTimestampsUrls?: string[] | null;
}

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
  showCharacter?: boolean;
  searchHighlight?: string; // Search query to highlight in questions and options
  shuffle?: boolean; // Whether to shuffle questions
  shuffleKey?: number | string; // Key to force re-shuffling when changed (e.g., retry counter)
  onRetry?: () => void; // Callback for retry action
  onContinue?: () => void; // Callback for continue action
  onPracticeAgain?: () => void; // Callback for practice again (when passed)
  onContinueToNextChapter?: () => void; // Callback for "Continue to Next Chapter" button (for chapter quizzes)
  onGoToExams?: () => void; // Callback for "Go to End of Course Exam" button (for last chapter)
  onShowResults?: () => void; // Callback when results screen is shown
  disableRetry?: boolean; // Disable retry functionality (for End-of-Course Exam)
  disableBack?: boolean; // Disable back navigation (for End-of-Course Exam)
  retryButtonText?: string; // Custom text for retry button (e.g., "Take Practice Quiz Again")
  chapterNumber?: number; // Chapter number for chapter quizzes (to display in title)
  isLastChapter?: boolean; // Whether this is the last chapter
}

export default function Quiz({ questions, onComplete, showCharacter = true, searchHighlight, shuffle = false, shuffleKey, onRetry, onContinue, onPracticeAgain, onContinueToNextChapter, onGoToExams, onShowResults, disableRetry = false, disableBack = false, retryButtonText, chapterNumber, isLastChapter }: QuizProps) {
  const router = useRouter();
  // Shuffle questions if shuffle prop is true - recalculate when shuffle or shuffleKey changes
  // Use Fisher-Yates shuffle algorithm for better randomization
  // shuffleKey forces re-shuffling when changed (e.g., on retry)
  const shuffledQuestions = useMemo(() => {
    if (shuffle && questions.length > 0) {
      // Fisher-Yates shuffle algorithm for true randomization
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Use crypto.getRandomValues for better randomness if available, fallback to Math.random
        const randomValue = typeof crypto !== 'undefined' && crypto.getRandomValues 
          ? crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1)
          : Math.random();
        const j = Math.floor(randomValue * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return questions;
  }, [questions, shuffle, shuffleKey]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestionScore, setCurrentQuestionScore] = useState(0);
  const [characterAnimation, setCharacterAnimation] = useState<"idle" | "thumbs-up" | "thumbs-down" | "congratulations">("idle");
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [hasAutoPlayedQuestion, setHasAutoPlayedQuestion] = useState(false);
  const [hasAutoPlayedExplanation, setHasAutoPlayedExplanation] = useState(false);
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number>(-1); // -1 means playing question, >= 0 means playing option
  const [allQuestionAudioCompleted, setAllQuestionAudioCompleted] = useState(false); // Track if all question + option audio has finished
  const [showResults, setShowResults] = useState(false); // Track if results screen should be shown
  const [finalScore, setFinalScore] = useState(0); // Store final score for results screen
  const questionRef = useRef<HTMLDivElement>(null);
  const optionsRefs = useRef<(HTMLElement | null)[]>([]);
  const explanationRef = useRef<HTMLDivElement>(null);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === shuffledQuestions.length - 1;

  // Build question text (just the question, no options)
  const questionText = currentQuestion?.question || "";

  // Normalize word for matching (same as AudioPlayer)
  const normalizeWord = (word: string): string => {
    return word.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim();
  };
  
  // Words match function (same as AudioPlayer for consistency)
  const wordsMatch = (textWord: string, timestampWord: string): boolean => {
    // Trim both words first
    const textTrimmed = textWord.trim();
    const timestampTrimmed = timestampWord.trim();
    
    // Exact match (case-insensitive)
    if (textTrimmed.toLowerCase() === timestampTrimmed.toLowerCase()) {
      return true;
    }
    
    // Normalize both words (remove punctuation, lowercase)
    const textNorm = normalizeWord(textTrimmed);
    const timestampNorm = normalizeWord(timestampTrimmed);
    
    // Exact match after normalization
    if (textNorm === timestampNorm && textNorm.length > 0) {
      return true;
    }
    
    // Remove all non-alphanumeric characters and compare
    const textClean = textNorm.replace(/[^a-z0-9]/g, '');
    const timestampClean = timestampNorm.replace(/[^a-z0-9]/g, '');
    
    // Exact match after removing all non-alphanumeric
    if (textClean === timestampClean && textClean.length > 0) {
      return true;
    }
    
    // Handle cases where punctuation differs (e.g., "word." vs "word")
    // But be more strict - only match if the core word is the same
    if (textClean.length > 0 && timestampClean.length > 0) {
      // Check if one is a prefix of the other (handles "word." vs "word")
      // But only if the shorter one is at least 3 characters (to avoid false matches)
      const minLength = Math.min(textClean.length, timestampClean.length);
      if (minLength >= 3) {
        const textPrefix = textClean.substring(0, minLength);
        const timestampPrefix = timestampClean.substring(0, minLength);
        if (textPrefix === timestampPrefix) {
          // Core words match, only difference is length (likely punctuation)
          // Be strict: only allow 1-2 character difference
          if (Math.abs(textClean.length - timestampClean.length) <= 2) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  // Handle word highlighting from AudioPlayer - highlight only the current word at the correct position
  const handleHighlightedWord = (word: string, wordIndex: number) => {
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Quiz handleHighlightedWord:', {
        word,
        wordIndex,
        currentOptionIndex,
        isQuestion: currentOptionIndex === -1,
        isOption: currentOptionIndex >= 0,
        questionText: currentOptionIndex === -1 ? questionText : undefined,
        optionText: currentOptionIndex >= 0 ? currentQuestion?.options[currentOptionIndex] : undefined,
      });
    }
    
    // First, remove all highlights
    removeHighlights(questionRef.current);
    optionsRefs.current.forEach((ref) => {
      if (ref) {
        removeHighlights(ref);
      }
    });

    // If playing question audio
    if (currentOptionIndex === -1) {
      if (questionRef.current) {
        highlightWordAtPosition(questionRef.current, wordIndex, word);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ questionRef.current is null');
      }
    } 
    // If playing option audio
    else if (currentOptionIndex >= 0 && currentOptionIndex < currentQuestion.options.length) {
      const optionRef = optionsRefs.current[currentOptionIndex];
      if (optionRef) {
        highlightWordAtPosition(optionRef, wordIndex, word);
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ optionRef is null:', {
          currentOptionIndex,
          optionsRefsLength: optionsRefs.current.length,
        });
      }
    }
  };

  // Highlight a specific word at a specific position in an element
  const highlightWordAtPosition = (element: HTMLElement | null, targetPosition: number, targetWord?: string) => {
    if (!element || targetPosition < 0) return;

    // Remove previous highlights first
    removeHighlights(element);

    // Get the full text - use textContent to get plain text without HTML tags
    // This ensures we get the actual text even if there are search highlights or other HTML
    let fullText = element.textContent || '';
    
    // If textContent is empty, try innerText as fallback
    if (!fullText && (element as any).innerText) {
      fullText = (element as any).innerText;
    }
    
    // CRITICAL: Split text EXACTLY the same way AudioPlayer does
    // AudioPlayer uses: text.split(/\s+/).filter(w => w.length > 0)
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && targetWord) {
      console.log('🎯 Quiz highlightWordAtPosition:', {
        targetPosition,
        targetWord,
        wordsLength: words.length,
        words: words.slice(Math.max(0, targetPosition - 2), Math.min(words.length, targetPosition + 3)),
        wordAtTarget: words[targetPosition],
        fullText: fullText.substring(0, 100),
      });
    }
    
    // If position is out of range, try to find word by content using wordsMatch (same as AudioPlayer)
    if (targetPosition >= words.length && targetWord) {
      // First, try to find the word near the expected position (within 10 words for better matching)
      const searchStart = Math.max(0, targetPosition - 10);
      const searchEnd = Math.min(words.length, targetPosition + 10);
      
      let foundIndex = -1;
      for (let i = searchStart; i < searchEnd; i++) {
        if (wordsMatch(words[i], targetWord)) {
          foundIndex = i;
          break;
        }
      }
      
      // If found near expected position, use it
      if (foundIndex >= 0) {
        targetPosition = foundIndex;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found word near expected position:', {
            originalPosition: targetPosition,
            foundPosition: foundIndex,
            targetWord,
            foundWord: words[foundIndex],
          });
        }
      } else {
        // If still not found, try searching the entire text (but prefer positions closer to expected)
        let bestMatch = -1;
        let bestDistance = Infinity;
        for (let i = 0; i < words.length; i++) {
          if (wordsMatch(words[i], targetWord)) {
            const distance = Math.abs(i - targetPosition);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestMatch = i;
            }
          }
        }
        
        if (bestMatch >= 0) {
          targetPosition = bestMatch;
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Found word in entire text:', {
              originalPosition: targetPosition,
              foundPosition: bestMatch,
              distance: bestDistance,
              targetWord,
              foundWord: words[bestMatch],
            });
          }
        }
      }
      
      // If still not found, return
      if (targetPosition >= words.length) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('❌ Could not find word to highlight:', {
            targetPosition,
            targetWord,
            wordsLength: words.length,
            words: words.slice(0, 20),
            fullText: fullText.substring(0, 200),
          });
        }
        return;
      }
    } else if (targetPosition >= words.length) {
      // Position out of range and no targetWord to search for
      if (process.env.NODE_ENV === 'development') {
        console.warn('❌ Position out of range:', {
          targetPosition,
          wordsLength: words.length,
          targetWord,
        });
      }
      return;
    }

    // Now highlight the word at the specific position
    // Use TreeWalker to iterate through text nodes, matching word positions exactly
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        textNodes.push(node as Text);
      }
    }

    // Count words across all text nodes to match targetPosition
    let currentWordPosition = 0;
    let highlighted = false;
    
    textNodes.forEach((textNode) => {
      if (highlighted) return;
      
      const text = textNode.textContent || '';
      // Split preserving spaces for reconstruction - same as AudioPlayer logic
      const parts = text.split(/(\s+)/);
      
      let newHTML = '';
      parts.forEach((part) => {
        // Check if this part is a word (not just whitespace)
        const trimmedPart = part.trim();
        if (trimmedPart.length > 0) {
          // This is a word - check if it matches our target position
          if (currentWordPosition === targetPosition && !highlighted) {
            // Verify the word matches (if targetWord provided) for extra safety
            if (!targetWord || wordsMatch(trimmedPart, targetWord)) {
              newHTML += `<span data-audio-highlight style="background: linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%); background-size: 100% 85%; background-position: center; background-repeat: no-repeat; color: #fef08a; border-radius: 3px; text-shadow: 0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5); transition: background 0.15s ease, color 0.15s ease, text-shadow 0.15s ease;">${part}</span>`;
              highlighted = true;
              
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Highlighted word:', {
                  position: currentWordPosition,
                  word: trimmedPart,
                  targetWord,
                  matches: targetWord ? wordsMatch(trimmedPart, targetWord) : 'N/A',
                });
              }
            } else {
              // Word at position doesn't match - skip highlighting this one
              newHTML += part;
            }
          } else {
            newHTML += part;
          }
          currentWordPosition++;
        } else {
          // This is whitespace - keep it as is
          newHTML += part;
        }
      });

      // Only replace the text node if we actually highlighted something
      if (newHTML !== text && highlighted) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML;
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        textNode.parentNode?.replaceChild(fragment, textNode);
      }
    });
    
    // If we didn't highlight anything, log a warning
    if (!highlighted && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Word not highlighted after processing all text nodes:', {
        targetPosition,
        targetWord,
        wordsLength: words.length,
        totalWordsProcessed: currentWordPosition,
      });
    }
  };

  // Helper to remove all highlights from an element
  const removeHighlights = (element: HTMLElement | null) => {
    if (!element) return;
    const highlighted = element.querySelectorAll('span[data-audio-highlight]');
    highlighted.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(span.textContent || ''), span);
        parent.normalize();
      }
    });
  };

  // Component will remount with new key on retry, so no need for reset logic here

  // Reset highlights and refs when question changes
  useEffect(() => {
    setHighlightedWord(null);
    setHasAutoPlayedQuestion(false);
    setHasAutoPlayedExplanation(false);
    setCurrentOptionIndex(-1); // Reset to question audio
    setAllQuestionAudioCompleted(false); // Reset completion flag for new question
    // Clear options refs array - will be repopulated when options render
    optionsRefs.current = new Array(currentQuestion?.options.length || 0).fill(null);
    // Remove highlights from previous question
    removeHighlights(questionRef.current);
    const explanationEl = document.querySelector('[data-explanation-text]') as HTMLElement;
    removeHighlights(explanationEl);
    
    // Debug: Log question audio data
    if (process.env.NODE_ENV === 'development') {
      console.log('Quiz question loaded:', {
        questionIndex: currentQuestionIndex,
        hasQuestionAudio: !!currentQuestion?.questionAudioUrl,
        questionAudioUrl: currentQuestion?.questionAudioUrl,
        hasOptionAudios: !!currentQuestion?.optionAudioUrls,
        optionAudioUrls: currentQuestion?.optionAudioUrls,
        optionAudioUrlsLength: Array.isArray(currentQuestion?.optionAudioUrls) ? currentQuestion.optionAudioUrls.length : 0,
      });
    }
  }, [currentQuestionIndex, currentQuestion]);

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return; // Prevent changing answer after submission
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowExplanation(true);
    setCurrentQuestionScore(correct ? 1 : 0);
    // Reset explanation audio state to allow auto-play
    setHasAutoPlayedExplanation(false);

    if (correct) {
      setScore(prevScore => prevScore + 1);
      setCharacterAnimation("thumbs-up");
    } else {
      setCharacterAnimation("thumbs-down");
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Score already includes the last question (added in handleSubmit)
      // So we just use the current score as the final score
      setFinalScore(score);
      // Show results screen instead of immediately calling onComplete
      setShowResults(true);
      setCharacterAnimation("congratulations");
      // Notify parent that results are being shown
      if (onShowResults) {
        onShowResults();
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setIsCorrect(false);
      setCurrentQuestionScore(0);
      setCharacterAnimation("idle");
      setCurrentOptionIndex(-1); // Reset to question
      setHasAutoPlayedQuestion(false); // Reset for next question
    }
  };

  const handleViewResultsComplete = () => {
    // Always call onComplete - parent will handle navigation or retry message
    onComplete(finalScore, shuffledQuestions.length);
  };
  
  // Reset audio state when question changes
  useEffect(() => {
    setCurrentOptionIndex(-1);
    setHasAutoPlayedQuestion(false);
    setHasAutoPlayedExplanation(false);
    setAllQuestionAudioCompleted(false); // Reset completion flag
  }, [currentQuestionIndex]);

  // Ensure explanation audio auto-plays when explanation is shown
  useEffect(() => {
    if (showExplanation) {
      // Always reset hasAutoPlayedExplanation when explanation is first shown to ensure audio can play
      setHasAutoPlayedExplanation(false);
      
      const explanationAudioUrl = getExplanationAudioUrl();
      if (explanationAudioUrl && process.env.NODE_ENV === 'development') {
        console.log('🎵 Explanation audio should auto-play:', {
          hasAudio: !!explanationAudioUrl,
          audioUrl: explanationAudioUrl,
          isCorrect,
          selectedAnswer,
          showExplanation,
        });
      }
    }
  }, [showExplanation]);

  // Get explanation audio URL and text
  const getExplanationAudioUrl = () => {
    if (isCorrect) {
      const audioUrl = currentQuestion?.correctExplanationAudioUrl || currentQuestion?.explanationAudioUrl || null;
      if (process.env.NODE_ENV === 'development') {
        console.log('🎵 Correct explanation audio:', {
          correctExplanationAudioUrl: currentQuestion?.correctExplanationAudioUrl,
          explanationAudioUrl: currentQuestion?.explanationAudioUrl,
          finalUrl: audioUrl,
        });
      }
      return audioUrl;
    } else {
      // For incorrect answers, get the explanation for the selected option
      let incorrectAudioUrls = currentQuestion?.incorrectExplanationAudioUrls;
      
      // Handle case where incorrectAudioUrls might be a JSON string
      if (typeof incorrectAudioUrls === 'string') {
        try {
          incorrectAudioUrls = JSON.parse(incorrectAudioUrls);
        } catch (e) {
          console.error('Failed to parse incorrectExplanationAudioUrls:', e);
          incorrectAudioUrls = null;
        }
      }
      
      if (incorrectAudioUrls && Array.isArray(incorrectAudioUrls) && incorrectAudioUrls.length > selectedAnswer!) {
        const audioUrl = incorrectAudioUrls[selectedAnswer!];
        if (process.env.NODE_ENV === 'development') {
          console.log('🎵 Incorrect explanation audio:', {
            selectedAnswer: selectedAnswer,
            incorrectAudioUrls: incorrectAudioUrls,
            audioUrlAtIndex: audioUrl,
            arrayLength: incorrectAudioUrls.length,
          });
        }
        return audioUrl || null;
      }
      
      // Fallback to general explanation audio
      const fallbackUrl = currentQuestion?.explanationAudioUrl || null;
      if (process.env.NODE_ENV === 'development') {
        console.log('🎵 Using fallback explanation audio:', {
          selectedAnswer: selectedAnswer,
          incorrectAudioUrls: incorrectAudioUrls,
          fallbackUrl: fallbackUrl,
        });
      }
      return fallbackUrl;
    }
  };

  const getExplanationText = () => {
    if (isCorrect) {
      return currentQuestion.explanation.correct;
    } else {
      return currentQuestion.explanation.incorrect[selectedAnswer!] || currentQuestion.explanation.correct;
    }
  };

  const getExplanationTimestampsUrl = () => {
    if (isCorrect) {
      return currentQuestion?.correctExplanationTimestampsUrl || currentQuestion?.explanationTimestampsUrl || null;
    } else {
      // For incorrect answers, get the timestamps for the selected option
      let incorrectTimestampsUrls = currentQuestion?.incorrectExplanationTimestampsUrls;
      
      // Handle case where incorrectTimestampsUrls might be a JSON string
      if (typeof incorrectTimestampsUrls === 'string') {
        try {
          incorrectTimestampsUrls = JSON.parse(incorrectTimestampsUrls);
        } catch (e) {
          console.error('Failed to parse incorrectExplanationTimestampsUrls:', e);
          incorrectTimestampsUrls = null;
        }
      }
      
      if (incorrectTimestampsUrls && Array.isArray(incorrectTimestampsUrls) && incorrectTimestampsUrls.length > selectedAnswer!) {
        return incorrectTimestampsUrls[selectedAnswer!] || null;
      }
      return currentQuestion?.explanationTimestampsUrl || null;
    }
  };

  // Show results screen if quiz is complete
  if (showResults) {
    const percentage = shuffledQuestions.length > 0 ? Math.round((finalScore / shuffledQuestions.length) * 100) : 0;
    // End-of-Course Exam uses 75% passing score, others use 80%
    const passingScore = disableRetry ? 75 : 80;
    const passed = percentage >= passingScore;
    // Check if this is End-of-Course Exam (disableRetry = true and no chapterNumber)
    const isEndOfCourseExam = disableRetry && !chapterNumber;
    
    return (
      <div className="w-full max-w-4xl mx-auto">
        {/* Results Screen - Modern Professional Design - Enhanced for End-of-Course Exam */}
        <div className={`relative overflow-hidden w-full ${
          isEndOfCourseExam && passed
            ? "bg-gradient-to-br from-[#1a0f2e] via-[#2a1f4a] to-[#1a0f2e] border-2 border-yellow-500/50 shadow-2xl backdrop-blur-xl"
            : isEndOfCourseExam
            ? "bg-gradient-to-br from-[#0f1b2e] via-[#1a2f4a] to-[#0f1b2e] border-2 border-blue-500/30 shadow-2xl backdrop-blur-xl"
            : "bg-gradient-to-br from-[#0f1b2e] via-[#1a2f4a] to-[#0f1b2e] border-2 border-blue-500/30 shadow-2xl backdrop-blur-xl"
        } rounded-2xl`}>
          {/* Decorative Background Elements - Enhanced for End-of-Course Exam */}
          <div className="absolute inset-0 opacity-10">
            {isEndOfCourseExam && passed ? (
              <>
                <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </>
            ) : (
              <>
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
              </>
            )}
          </div>
          
          <div className={`relative z-10 ${isEndOfCourseExam ? 'p-5 md:p-8 lg:p-10' : 'p-4 md:p-6'}`}>
            {/* Character - Top Section - Enhanced for End-of-Course Exam */}
            {showCharacter && (
              <div className={`flex justify-center ${isEndOfCourseExam && passed ? 'mb-20 md:mb-15' : isEndOfCourseExam ? 'mb-20 md:mb-10' : chapterNumber ? 'mb-20 md:mb-10' : 'mb-6'}`}>
                <div className="relative">
                  {isEndOfCourseExam && passed ? (
                    <>
                      {/* Celebration effect for End-of-Course Exam pass */}
                      <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-2xl animate-pulse"></div>
                      <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      <div className="absolute -top-3 -right-3 text-3xl animate-bounce">🎉</div>
                      <div className="absolute -top-3 -left-3 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
                      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>🏆</div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                  )}
                  <div className="relative">
                    <MrListings size={isEndOfCourseExam && passed ? "medium" : "small"} animation={isEndOfCourseExam && passed ? "congratulations" : characterAnimation} />
                  </div>
                </div>
              </div>
            )}

            {/* Results Content */}
            <div className={`text-center ${isEndOfCourseExam ? 'mb-4 md:mb-5' : 'mb-4'}`}>
              {/* Title - Only show if not chapter quiz (to avoid duplication) */}
              {!chapterNumber && (
                <h2 className={`${isEndOfCourseExam ? 'text-xl md:text-2xl lg:text-3xl mb-4 md:mb-5' : 'text-2xl md:text-3xl mb-3'} font-extrabold text-transparent bg-clip-text ${isEndOfCourseExam ? 'bg-gradient-to-r from-yellow-300 via-orange-300 to-red-400' : 'bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400'} tracking-tight leading-tight`}>
                  {isEndOfCourseExam ? 'End-Of-Course Exam Complete!' : 'Quiz Complete!'}
                </h2>
              )}
              
              {/* Chapter Quiz Title - Integrated into score card - More spacing from bird */}
              {chapterNumber && (
                <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 mb-4 tracking-tight">
                  Chapter {chapterNumber} Quiz
                </h2>
              )}
              
              {/* Score Card - Enhanced Modern Design - Special for End-of-Course Exam */}
              <div className={`flex flex-col items-center justify-center ${isEndOfCourseExam ? 'mb-4 md:mb-5' : 'mb-4'}`}>
                <div className={`relative overflow-hidden ${isEndOfCourseExam ? 'rounded-2xl p-6 md:p-8 lg:p-10' : 'rounded-2xl p-6 md:p-8'} ${
                  isEndOfCourseExam && passed
                    ? "bg-gradient-to-br from-yellow-600/40 via-orange-500/35 to-red-500/40 border-2 border-yellow-400/70 shadow-2xl shadow-yellow-500/50"
                    : isEndOfCourseExam
                    ? "bg-gradient-to-br from-amber-600/30 via-yellow-500/25 to-amber-600/30 border-2 border-amber-400/60 shadow-2xl shadow-amber-500/30"
                    : passed 
                    ? "bg-gradient-to-br from-green-600/30 via-emerald-500/25 to-green-600/30 border-2 border-green-400/60 shadow-2xl shadow-green-500/30" 
                    : "bg-gradient-to-br from-amber-600/30 via-yellow-500/25 to-amber-600/30 border-2 border-amber-400/60 shadow-2xl shadow-amber-500/30"
                } ${isEndOfCourseExam && passed ? 'animate-pulse' : ''}`}>
                  {/* Animated Background */}
                  <div className={`absolute inset-0 opacity-20 ${
                    isEndOfCourseExam && passed
                      ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400"
                      : passed 
                      ? "bg-gradient-to-r from-green-400 via-emerald-400 to-green-400" 
                      : "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400"
                  } ${isEndOfCourseExam && passed ? 'animate-pulse' : ''}`}></div>
                  
                  {/* Glow Effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${
                    isEndOfCourseExam && passed
                      ? "from-yellow-400 to-orange-400"
                      : passed 
                      ? "from-green-400 to-emerald-400" 
                      : "from-amber-400 to-yellow-400"
                  } rounded-2xl blur opacity-25 ${isEndOfCourseExam && passed ? 'animate-pulse' : ''}`}></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    {/* Score Display - Enhanced - Appropriate size for End-of-Course Exam */}
                    <div className={`${isEndOfCourseExam ? 'text-4xl md:text-5xl lg:text-6xl mb-3 md:mb-4' : 'text-5xl md:text-6xl mb-3'} font-black text-white leading-none tracking-tight`}>
                      <span className="text-cyan-300 drop-shadow-lg">{finalScore}</span>
                      <span className="text-gray-400 mx-2">/</span>
                      <span className="text-gray-200">{shuffledQuestions.length}</span>
                    </div>
                    
                    {/* Percentage Badge - Enhanced - Special for End-of-Course Exam */}
                    <div className={`inline-flex items-center justify-center gap-2 ${isEndOfCourseExam ? 'px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm md:text-base' : 'px-4 py-2 rounded-full text-base md:text-lg'} font-bold shadow-lg ${
                      isEndOfCourseExam && passed
                        ? "bg-gradient-to-r from-yellow-500/50 to-orange-500/50 text-yellow-100 border-2 border-yellow-400/80"
                        : isEndOfCourseExam
                        ? "bg-gradient-to-r from-amber-500/40 to-yellow-500/40 text-amber-100 border-2 border-amber-400/70"
                        : passed 
                        ? "bg-gradient-to-r from-green-500/40 to-emerald-500/40 text-green-100 border-2 border-green-400/70" 
                        : "bg-gradient-to-r from-amber-500/40 to-yellow-500/40 text-amber-100 border-2 border-amber-400/70"
                    }`}>
                      <span className={`${isEndOfCourseExam ? 'text-lg md:text-xl' : 'text-2xl'} font-black`}>{percentage}%</span>
                      <span className={`${isEndOfCourseExam ? 'text-xs md:text-sm' : 'text-sm md:text-base'} font-semibold whitespace-nowrap`}>
                        {isEndOfCourseExam && passed ? "🏆 Certified!" : passed ? "✓ Passed" : (chapterNumber ? "Failed" : `Needs ${passingScore}% to Pass`)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Message - Enhanced - Special for End-of-Course Exam */}
              <div className={`${isEndOfCourseExam ? 'max-w-2xl' : 'max-w-2xl'} mx-auto ${isEndOfCourseExam ? 'mb-4 md:mb-5' : 'mb-4'} px-2 md:px-4`}>
                <p className={`${isEndOfCourseExam && passed ? 'text-sm md:text-base lg:text-lg' : isEndOfCourseExam ? 'text-sm md:text-base' : 'text-base md:text-lg'} leading-relaxed ${isEndOfCourseExam && passed ? 'font-semibold' : 'font-medium'} ${
                  isEndOfCourseExam && passed
                    ? "text-yellow-100"
                    : isEndOfCourseExam
                    ? "text-gray-200"
                    : passed 
                    ? "text-green-100" 
                    : "text-gray-300"
                }`}>
                  {passed 
                    ? (
                      <span className="inline-block">
                        {isEndOfCourseExam ? (
                          <>
                            <span className="text-4xl mr-3">🎉</span>
                            <span className="text-4xl mr-3">🏆</span>
                            <span className="text-4xl mr-2">🎊</span>
                            <br className="md:hidden" />
                            <span className="block mt-2 md:inline">
                              Congratulations on passing the End-Of-Course Exam! After payment, you will receive the Certificate of Completion of the 63 Hour Pre Licensing Course, and will become eligible to take the Florida Real Estate Sales Associate Exam.
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl mr-2">🎉</span>
                            {onContinue ? (
                              // Practice Exam: Custom message
                              <>
                                Congratulations! You've passed the practice exam.
                              </>
                            ) : (
                              // Chapter Quiz: Standard message
                              <>
                                Congratulations!
                              </>
                            )}
                          </>
                        )}
                      </span>
                    ) : (
                      <span>
                        Your score was <span className="font-bold text-white">{finalScore}</span> out of <span className="font-bold text-white">{shuffledQuestions.length}</span>, which is <span className="font-bold text-white">{percentage}%</span>.
                        {!disableRetry && !onContinue && (
                          <>
                            <br className="hidden md:block" />
                            {/* Chapter Quiz: Simple message - no practice exam references */}
                            You need a score of at least 80% to proceed.
                          </>
                        )}
                        {!disableRetry && onContinue && (
                          <>
                            <br className="hidden md:block" />
                            {/* Practice Exam: Show warning about 30-day wait */}
                            Because you got less than 80%, we strongly recommend doing another practice exam. If you fail the actual exam, you will have to wait 30 days until you can take it again (this is state law).
                          </>
                        )}
                        {disableRetry && (
                          <>
                            <br className="hidden md:block" />
                            {/* End-of-Course Exam: Show warning about 30-day wait */}
                            <span className="text-yellow-300 font-semibold">
                              Unfortunately, you did not pass the End-of-Course Exam. According to state law, you must wait 30 days before you can retake this exam.
                            </span>
                          </>
                        )}
                      </span>
                    )}
                </p>
              </div>
            </div>

            {/* Action Buttons - Modern Design - Enhanced for End-of-Course Exam */}
            <div className={`${isEndOfCourseExam ? 'mt-4 md:mt-5' : 'mt-4'} px-2 md:px-4`}>
                  {passed ? (
                // Passed - show options based on context
                onContinue ? (
                  // Practice Exam: Show warning first, then both options
                  <div className="space-y-4">
                    {/* 30-Day Warning Notice - Before buttons - Compact */}
                    <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-400/50 rounded-lg p-3 md:p-4 max-w-2xl mx-auto">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-yellow-200 font-semibold text-sm md:text-base mb-1">Important Notice</p>
                          <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                            If you fail the End-of-Course Exam, you must wait <span className="font-bold text-white">30 days</span> before you can retake it (State Law requirement).
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Buttons - Compact */}
                    <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={onContinue}
                      className="flex-1 group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold py-2.5 px-4 md:py-3 md:px-6 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                        Take End-Of-Course Exam
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                    {onPracticeAgain && (
                      <button
                        onClick={onPracticeAgain}
                        className="flex-1 group relative overflow-hidden bg-[#1a2f4a]/80 border-2 border-gray-500/40 hover:border-gray-400/60 text-gray-200 hover:text-white font-semibold py-2.5 px-4 md:py-3 md:px-6 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:bg-[#1a2f4a]"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                          <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Take Practice Quiz Again
                        </span>
                      </button>
                    )}
                    </div>
                  </div>
                ) : (
                  // Chapter Quiz or End-of-Course Exam: Show appropriate button
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        handleViewResultsComplete();
                        if (isEndOfCourseExam && passed) {
                          router.push("/certification/pay");
                          return;
                        }
                        if (isLastChapter && onGoToExams) {
                          onGoToExams();
                        } else if (onContinueToNextChapter) {
                          onContinueToNextChapter();
                        }
                      }}
                      className={`flex-1 group relative overflow-hidden ${
                        isEndOfCourseExam && passed
                          ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-white font-bold py-2.5 px-4 md:py-3 md:px-6 rounded-xl text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-yellow-500/40 hover:shadow-yellow-500/60"
                          : isEndOfCourseExam
                          ? "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold py-2.5 px-4 md:py-3 md:px-6 rounded-xl text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60"
                          : "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold py-2.5 px-4 md:py-3 md:px-6 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50"
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                        {isEndOfCourseExam && passed ? (
                          <>
                            Pay $200
                            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        ) : isLastChapter ? (
                          <>
                            Go to End of Course Exam
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        ) : (
                          <>
                            Continue to Next Chapter
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                    {onPracticeAgain && (
                      <button
                        onClick={onPracticeAgain}
                        className="flex-1 group relative overflow-hidden bg-[#1a2f4a]/80 border-2 border-gray-500/40 hover:border-gray-400/60 text-gray-200 hover:text-white font-semibold py-2.5 px-4 md:py-3 md:px-6 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:bg-[#1a2f4a]"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                          <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Take Practice Quiz Again
                        </span>
                      </button>
                    )}
                  </div>
                )
              ) : (
                // Show retry buttons only if not disabled (for End-of-Course Exam)
                !disableRetry ? (
                  <div className="space-y-4">
                    {/* Only show warning for Practice Exam (when onContinue is provided) */}
                    {onContinue && (
                      <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-400/50 rounded-lg p-3 md:p-4 max-w-2xl mx-auto">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-yellow-200 font-semibold text-sm md:text-base mb-1">Important Notice</p>
                            <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                              If you fail the End-of-Course Exam, you must wait <span className="font-bold text-white">30 days</span> before you can retake it (State Law requirement).
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Buttons - Compact */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => {
                          // Call onRetry to trigger parent to reset quiz with new shuffle
                          if (onRetry) {
                            onRetry();
                          }
                        }}
                        className="flex-1 group relative overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 hover:from-blue-500 hover:via-cyan-400 hover:to-blue-400 text-white font-bold py-2.5 px-4 md:py-3 md:px-6 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                          <svg className="w-4 h-4 transform group-hover:rotate-180 transition-transform duration-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {retryButtonText || "Take the Quiz Again"}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      </button>
                      {/* Only show continue button if onContinue is provided (for Practice Exam failed) */}
                      {onContinue && (
                        <button
                          onClick={() => {
                            // Call onContinue (for Practice Exam -> End-of-Course)
                            onContinue();
                          }}
                          className="flex-1 group relative overflow-hidden bg-[#1a2f4a]/80 border-2 border-gray-500/40 hover:border-gray-400/60 text-gray-200 hover:text-white font-semibold py-2.5 px-4 md:py-3 md:px-6 rounded-lg text-sm md:text-base transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:bg-[#1a2f4a]"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
                            Take End-Of-Course Exam
                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </span>
                        </button>
                      )}
                      {/* Chapter Quiz: No continue button when failed - must retake */}
                    </div>
                  </div>
                ) : (
                  // End-of-Course Exam: No retry, just show message and return to home
                  <div className="text-center">
                    <p className="text-gray-300 text-sm md:text-base mb-6 leading-relaxed">
                      End-of-Course Exam does not allow retries. According to state law, you must wait <span className="font-bold text-yellow-300">30 days</span> before you can retake this exam.
                    </p>
                    <button
                      onClick={() => {
                        handleViewResultsComplete();
                        router.push("/");
                      }}
                      className={`w-full ${isEndOfCourseExam ? 'px-4 py-2.5 md:px-6 md:py-3 rounded-xl text-sm md:text-base' : 'px-6 py-3 rounded-xl text-base'} bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60`}
                    >
                      Return to Home
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Progress Indicator - Modern Design */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl px-4 py-2 backdrop-blur-sm">
              <span className="text-blue-300 text-sm font-medium">Question</span>
              <span className="text-white text-lg font-bold ml-2">
                {currentQuestionIndex + 1} <span className="text-blue-400">/</span> {shuffledQuestions.length}
              </span>
            </div>
          </div>
          <div className="flex-1 mx-4">
            <div className="h-2 bg-[#0a1a2e] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-blue-300 text-sm font-medium">
              {Math.round(((currentQuestionIndex + 1) / shuffledQuestions.length) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Character */}
      {showCharacter && (
        <div className="flex justify-center mb-6">
          <MrListings size="medium" animation={characterAnimation} />
        </div>
      )}

      {/* Question Card */}
      <div className="bg-[#1e3a5f] border border-blue-500/30 rounded-2xl p-6 md:p-8 shadow-2xl mb-6">
        {/* Question Text - Clear and Prominent */}
        <div className="mb-6" ref={questionRef}>
          <h2 
            className="text-xl md:text-2xl font-semibold text-white leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: searchHighlight ? highlightTextHTML(currentQuestion.question, searchHighlight) : currentQuestion.question 
            }}
          />
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            let optionClass = "w-full p-4 text-left rounded-lg border-2 transition-all duration-200 cursor-pointer ";
            
            if (showExplanation) {
              if (index === currentQuestion.correctAnswer) {
                optionClass += "bg-green-500/20 border-green-500 text-green-300 ";
              } else if (index === selectedAnswer && !isCorrect) {
                optionClass += "bg-red-500/20 border-red-500 text-red-300 ";
              } else {
                optionClass += "bg-[#0a1a2e] border-blue-500/30 text-gray-300 ";
              }
            } else {
              optionClass += selectedAnswer === index
                ? "bg-blue-500/30 border-blue-500 text-white "
                : "bg-[#0a1a2e] border-blue-500/30 text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/10 ";
            }

            return (
              <button
                key={`option-${currentQuestionIndex}-${index}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={showExplanation}
                className={optionClass}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    showExplanation && index === currentQuestion.correctAnswer
                      ? "bg-green-500 border-green-500"
                      : showExplanation && index === selectedAnswer && !isCorrect
                      ? "bg-red-500 border-red-500"
                      : selectedAnswer === index
                      ? "bg-blue-500 border-blue-500"
                      : "border-blue-500/50"
                  }`}>
                    {showExplanation && index === currentQuestion.correctAnswer && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {showExplanation && index === selectedAnswer && !isCorrect && index !== currentQuestion.correctAnswer && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    {!showExplanation && selectedAnswer === index && (
                      <div className="w-3 h-3 bg-white rounded-full" />
                    )}
                  </div>
                  <span 
                    className="flex-1 text-base" 
                    ref={(el) => { 
                      if (el) {
                        optionsRefs.current[index] = el;
                      }
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ 
                      __html: searchHighlight ? highlightTextHTML(option, searchHighlight) : option 
                    }} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sequential Audio Players - Question and Options */}
        {!showExplanation && (
          <div className="mb-6 pt-4 border-t border-blue-500/20">
            {/* Question Audio */}
            {currentQuestion?.questionAudioUrl && currentOptionIndex === -1 && !allQuestionAudioCompleted && (
              <AudioPlayer
                key={`question-audio-${currentQuestionIndex}`}
                text={questionText}
                audioUrl={currentQuestion.questionAudioUrl}
                timestampsUrl={currentQuestion.questionTimestampsUrl || undefined}
                autoPlay={true} // Always auto-play question audio when it loads
                hideText={true}
                onHighlightedWord={handleHighlightedWord}
                onComplete={() => {
                  // Clear highlights from question when audio completes
                  removeHighlights(questionRef.current);
                  
                  // After question finishes, start playing first option if available
                  const optionAudios = Array.isArray(currentQuestion.optionAudioUrls) 
                    ? currentQuestion.optionAudioUrls 
                    : [];
                  if (optionAudios.length > 0 && optionAudios[0]) {
                    setCurrentOptionIndex(0);
                    setHasAutoPlayedQuestion(false); // Allow option to auto-play
                  } else {
                    // No options to play, mark all audio as completed
                    setHasAutoPlayedQuestion(true);
                    setAllQuestionAudioCompleted(true);
                  }
                }}
                onPlayingChange={(isPlaying) => {
                  if (isPlaying) {
                    setHasAutoPlayedQuestion(true);
                  }
                }}
              />
            )}
            
            {/* Option Audio - Play sequentially */}
            {(() => {
              // Ensure optionAudioUrls is an array
              const optionAudios = Array.isArray(currentQuestion?.optionAudioUrls) 
                ? currentQuestion.optionAudioUrls 
                : [];
              const optionTimestamps = Array.isArray(currentQuestion?.optionTimestampsUrls) 
                ? currentQuestion.optionTimestampsUrls 
                : [];
              
              return optionAudios.length > 0 && 
                     currentOptionIndex >= 0 && 
                     currentOptionIndex < optionAudios.length &&
                     optionAudios[currentOptionIndex] && (
                <AudioPlayer
                  key={`option-audio-${currentQuestionIndex}-${currentOptionIndex}`}
                  text={currentQuestion.options[currentOptionIndex]}
                  audioUrl={optionAudios[currentOptionIndex]}
                  timestampsUrl={optionTimestamps[currentOptionIndex] || undefined}
                  autoPlay={true} // Always auto-play option audio when it loads
                  hideText={true}
                  onHighlightedWord={handleHighlightedWord}
                  onComplete={() => {
                    // Clear highlights from current option when audio completes
                    const currentOptionRef = optionsRefs.current[currentOptionIndex];
                    if (currentOptionRef) {
                      removeHighlights(currentOptionRef);
                    }
                    
                    // Move to next option
                    if (currentOptionIndex < optionAudios.length - 1) {
                      setCurrentOptionIndex(currentOptionIndex + 1);
                      setHasAutoPlayedQuestion(false); // Allow next option to auto-play
                    } else {
                      // All options played, clear all highlights and stop
                      optionsRefs.current.forEach(removeHighlights);
                      setCurrentOptionIndex(-1);
                      setHasAutoPlayedQuestion(true);
                      setAllQuestionAudioCompleted(true); // Mark all question/option audio as completed
                      // Audio is done, don't restart - wait for user to click an answer
                    }
                  }}
                  onPlayingChange={(isPlaying) => {
                    if (isPlaying) {
                      setHasAutoPlayedQuestion(true);
                    }
                  }}
                />
              );
            })()}
            
            {/* No fallback - only use separate audio files */}
          </div>
        )}

        {/* Explanation */}
        {showExplanation && (
          <div className={`p-5 rounded-lg mb-6 animate-slide-up ${
            isCorrect ? "bg-green-500/20 border-2 border-green-500/50" : "bg-red-500/20 border-2 border-red-500/50"
          }`}>
            <div className="flex items-center gap-2 mb-4">
              {isCorrect ? (
                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className={`font-bold text-lg ${isCorrect ? "text-green-300" : "text-red-300"}`}>
                {isCorrect ? "Correct Answer!" : "Incorrect Answer"}
              </p>
            </div>
            
            {/* Explanation Text with Highlighting Support */}
            <div className="mb-4" data-explanation-text ref={explanationRef}>
              <p 
                className="text-white text-base md:text-lg leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: searchHighlight ? highlightTextHTML(getExplanationText(), searchHighlight) : getExplanationText() 
                }}
              />
              {/* Store the plain text in a data attribute for exact matching */}
              <span data-plain-text={getExplanationText()} style={{ display: 'none' }}></span>
            </div>
            
            {/* Explanation Audio Player */}
            {(() => {
              const explanationAudioUrl = getExplanationAudioUrl();
              const explanationTimestampsUrl = getExplanationTimestampsUrl();
              
              if (process.env.NODE_ENV === 'development') {
                console.log('🎵 Explanation audio check:', {
                  hasAudioUrl: !!explanationAudioUrl,
                  audioUrl: explanationAudioUrl,
                  hasTimestampsUrl: !!explanationTimestampsUrl,
                  isCorrect,
                  selectedAnswer,
                  currentQuestion: {
                    id: currentQuestion?.id,
                    correctExplanationAudioUrl: currentQuestion?.correctExplanationAudioUrl,
                    incorrectExplanationAudioUrls: currentQuestion?.incorrectExplanationAudioUrls,
                    explanationAudioUrl: currentQuestion?.explanationAudioUrl,
                  },
                });
              }
              
              return explanationAudioUrl ? (
                <div className="pt-4 border-t border-white/10">
                  <AudioPlayer
                    key={`explanation-audio-${currentQuestionIndex}-${isCorrect ? 'correct' : 'incorrect'}-${selectedAnswer}-${showExplanation}`}
                    text={getExplanationText()}
                    audioUrl={explanationAudioUrl}
                    timestampsUrl={explanationTimestampsUrl || undefined}
                    autoPlay={true}
                    hideText={true}
                    onHighlightedWord={(word, wordIndex) => {
                      // Debug logging in development
                      if (process.env.NODE_ENV === 'development') {
                        console.log('🎯 Quiz explanation handleHighlightedWord:', {
                          word,
                          wordIndex,
                          explanationText: getExplanationText(),
                        });
                      }
                      
                      // Highlight only the current word at the correct position in explanation text
                      // Use the same approach as section pages - clear all highlights first, then highlight current word
                      if (explanationRef.current) {
                        // Remove all existing highlights first
                        removeHighlights(explanationRef.current);
                        // Then highlight the word at the correct position
                        highlightWordAtPosition(explanationRef.current, wordIndex, word);
                      } else if (process.env.NODE_ENV === 'development') {
                        console.warn('⚠️ explanationRef.current is null');
                      }
                    }}
                    onComplete={() => {
                      // Clear highlights when explanation audio completes
                      if (explanationRef.current) {
                        removeHighlights(explanationRef.current);
                      }
                      // Mark as completed to prevent replay
                      setHasAutoPlayedExplanation(true);
                    }}
                    onPlayingChange={(isPlaying) => {
                      if (isPlaying) {
                        setHasAutoPlayedExplanation(true);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ Explanation audio not available. Please generate audio in the admin panel.
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-red-400 text-xs mt-2">
                      Debug: No audio URL found. Check console for details.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Action Button */}
        {!showExplanation ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {isLastQuestion ? "View Results" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}

