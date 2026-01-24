"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: string;
  id: string;
  title?: string;
  text?: string;
  term?: string;
  question?: string;
  description?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  path: string;
  sectionId?: string;
}

interface SearchResponse {
  query: string;
  chapters: SearchResult[];
  sections: SearchResult[];
  quizQuestions: SearchResult[];
  introduction: SearchResult | null;
  totalResults: number;
}

interface SearchBarProps {
  onOpen?: () => void;
}

export default function SearchBar({ onOpen }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Manage body scroll when modal is open/closed
  useEffect(() => {
    if (isOpen || showRegistrationPrompt) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus input when search opens
      if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, showRegistrationPrompt]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleSearchClick();
      }
      // Escape to close search or registration prompt
      if (e.key === 'Escape') {
        if (isOpen) {
          setIsOpen(false);
          setSearchQuery("");
          setResults(null);
        }
        if (showRegistrationPrompt) {
          setShowRegistrationPrompt(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showRegistrationPrompt]);

  const handleSearchClick = () => {
    // Check if user is authenticated
    if (isAuthenticated === false) {
      setShowRegistrationPrompt(true);
      onOpen?.();
      return;
    }
    
    // If authentication status is still being checked, wait a bit
    if (isAuthenticated === null) {
      // Double-check authentication
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];
      
      if (!token) {
        setShowRegistrationPrompt(true);
        onOpen?.();
        return;
      }
    }
    
    setIsOpen(true);
    onOpen?.();
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSelectedIndex(-1);
      } else {
        setResults(null);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleResultClick = (result: SearchResult) => {
    // Store search query for highlighting on target page
    const queryToHighlight = searchQuery.trim();
    if (queryToHighlight) {
      sessionStorage.setItem('searchHighlight', queryToHighlight);
    }
    
    // Close modal first
    setIsOpen(false);
    setSearchQuery("");
    setResults(null);
    
    // Small delay to ensure modal closes before navigation
    setTimeout(() => {
      // Navigate based on result type
      if (result.type === 'section' && result.sectionId && result.path) {
        // Navigate to specific section
        sessionStorage.setItem('targetSection', result.sectionId);
        // Use window.location for full page navigation to ensure state is reset
        window.location.href = result.path;
      } else if (result.type === 'quizQuestion' && result.path) {
        // Navigate to chapter and show quiz
        sessionStorage.setItem('targetSection', 'quiz');
        window.location.href = result.path;
      } else if (result.type === 'chapter' && result.path) {
        // Navigate to chapter
        window.location.href = result.path;
      } else if (result.type === 'introduction') {
        // Navigate to introduction
        window.location.href = '/introduction';
      } else {
        // Fallback: navigate to path if available
        if (result.path) {
          window.location.href = result.path;
        }
      }
    }, 100);
  };

  const getAllResults = (): SearchResult[] => {
    if (!results) return [];
    
    const all: SearchResult[] = [];
    if (results.introduction) all.push(results.introduction);
    all.push(...results.chapters);
    all.push(...results.sections);
    all.push(...results.quizQuestions);
    
    return all;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allResults = getAllResults();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && allResults[selectedIndex]) {
      e.preventDefault();
      handleResultClick(allResults[selectedIndex]);
    }
  };

  const getResultTitle = (result: SearchResult): string => {
    if (result.title) return result.title;
    if (result.term) return result.term;
    if (result.question) return result.question;
    if (result.text) return result.text.substring(0, 50) + '...';
    return 'Untitled';
  };

  const getResultPreview = (result: SearchResult): string => {
    if (result.text) {
      const index = result.text.toLowerCase().indexOf(searchQuery.toLowerCase());
      if (index >= 0) {
        const start = Math.max(0, index - 30);
        const end = Math.min(result.text.length, index + searchQuery.length + 50);
        let preview = result.text.substring(start, end);
        if (start > 0) preview = '...' + preview;
        if (end < result.text.length) preview = preview + '...';
        return preview;
      }
      return result.text.substring(0, 100) + '...';
    }
    if (result.description) return result.description.substring(0, 100) + '...';
    return '';
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Button - Original Design */}
      <button
        onClick={handleSearchClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1f3a]/60 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-all text-gray-300 hover:text-white"
        aria-label="Search"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline text-xs">Search</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 rounded">
          Ctrl+K
        </kbd>
      </button>

      {/* Search Modal - Rendered via Portal at Body Level */}
      {mounted && isOpen ? createPortal(
        <>
          {/* Backdrop with strong blur - No click to close */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]" 
            style={{ animation: 'fadeInOverlay 0.2s ease-out' }}
          />
          {/* Modal Content - Perfectly Centered on Page Body */}
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl z-[101] px-4"
            style={{ 
              animation: 'slideInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0a1a2e] border-2 border-blue-500/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input Header */}
              <div className="p-5 border-b border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search course content... (chapters, sections, terms, questions)"
                    className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-base md:text-lg font-medium"
                    autoFocus
                  />
                  {loading && (
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-shrink-0 p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                    aria-label="Close search"
                  >
                    <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-[70vh] min-h-[300px] overflow-y-auto bg-[#0a1a2e]">
                {results && results.totalResults > 0 ? (
                  <div className="p-4">
                    <div className="px-4 py-3 text-sm font-semibold text-blue-300 border-b border-blue-500/30 mb-3 bg-blue-500/5 rounded-lg">
                      {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} found for "{results.query}"
                    </div>
                    
                    {getAllResults().map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleResultClick(result);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-150 cursor-pointer ${
                          index === selectedIndex
                            ? "bg-blue-500/30 border border-blue-400/50"
                            : "hover:bg-blue-500/10 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {result.type === 'chapter' && (
                              <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                                <span className="text-xs text-blue-300 font-bold">Ch</span>
                              </div>
                            )}
                            {result.type === 'section' && (
                              <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center">
                                <span className="text-xs text-cyan-300 font-bold">Sec</span>
                              </div>
                            )}
                            {result.type === 'quizQuestion' && (
                              <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                                <span className="text-xs text-purple-300 font-bold">Q</span>
                              </div>
                            )}
                            {result.type === 'introduction' && (
                              <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center">
                                <span className="text-xs text-indigo-300 font-bold">Intro</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white mb-1">
                              {getResultTitle(result)}
                            </div>
                            {result.chapterTitle && (
                              <div className="text-xs text-gray-400 mb-1">
                                Chapter {result.chapterNumber}: {result.chapterTitle}
                              </div>
                            )}
                            {getResultPreview(result) && (
                              <div className="text-xs text-gray-500 line-clamp-2">
                                {getResultPreview(result)}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery && !loading ? (
                  <div className="p-12 text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-base font-medium">No results found for</p>
                    <p className="text-lg text-white mt-2">"{searchQuery}"</p>
                    <p className="text-sm text-gray-500 mt-4">Try different keywords or check spelling</p>
                  </div>
                ) : !searchQuery ? (
                  <div className="p-12 text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-300 mb-2">Start typing to search...</p>
                    <p className="text-sm text-gray-500">Search across chapters, sections, and quiz questions</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>,
        document.body
      ) : null}

      {/* Registration Prompt Modal */}
      {mounted && showRegistrationPrompt ? createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]" 
            onClick={() => setShowRegistrationPrompt(false)}
            style={{ animation: 'fadeInOverlay 0.2s ease-out' }}
          />
          {/* Modal Content */}
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] px-4"
            style={{ 
              animation: 'slideInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1a1f3a]/95 backdrop-blur-lg border-2 border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden relative">
              <div className="p-6 md:p-8">
                {/* Close Button */}
                <button
                  onClick={() => setShowRegistrationPrompt(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Icon */}
                <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-3 text-center">
                  Registration Required
                </h2>

                {/* Message */}
                <p className="text-gray-300 text-center mb-6">
                  Please register to use the search feature and access all course content.
                </p>

                {/* Benefits */}
                <div className="bg-[#0a0e27]/50 border border-cyan-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-gray-300 mb-3">Benefits of registering:</p>
                  <ul className="text-sm text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">✓</span>
                      <span>Search across all chapters and content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">✓</span>
                      <span>Save your progress automatically</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">✓</span>
                      <span>Access all course materials</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowRegistrationPrompt(false);
                      router.push("/signup");
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                  >
                    Register Now
                  </button>
                  <button
                    onClick={() => {
                      setShowRegistrationPrompt(false);
                      router.push("/login");
                    }}
                    className="w-full py-3 px-4 bg-[#1a1f3a]/50 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  >
                    Already have an account? Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      ) : null}
    </div>
  );
}

