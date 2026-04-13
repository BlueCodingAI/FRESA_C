"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface MenuItem {
  id: string;
  title: string;
  path: string;
  sectionId?: string;
  subsections?: string[];
  isChapter?: boolean;
  children?: MenuItem[];
}

interface UserProgress {
  chapterNumber: number;
  quizCompleted: boolean;
  quizScore: number;
  quizTotal: number;
}

interface TableOfContentsProps {
  items: MenuItem[];
  currentPath?: string;
  activeSectionId?: string; // ID of the section currently playing audio
  allUserProgress?: UserProgress[]; // All chapters' progress for navigation checks
  currentChapterNumber?: number; // Current chapter number
  /** Admin/Developer/Editor: unlock all chapters for nav without quiz gating */
  fullCourseAccess?: boolean;
}

export default function TableOfContents({ items, currentPath, activeSectionId, allUserProgress = [], currentChapterNumber, fullCourseAccess = false }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  // Auto-expand chapters that contain the active section
  useEffect(() => {
    if (activeSectionId) {
      items.forEach(item => {
        if (item.isChapter && item.children) {
          const hasActiveSection = item.children.some(child => child.sectionId === activeSectionId);
          if (hasActiveSection && !expandedChapters.has(item.id)) {
            setExpandedChapters(prev => new Set(prev).add(item.id));
          }
        }
      });
    }
  }, [activeSectionId, items]);

  // Expand the current chapter by path so Quiz and sections show on first open of the nav
  useEffect(() => {
    if (!pathname || !items.length) return;
    const isChapterPath = pathname.match(/\/chapter\/\d+/);
    if (!isChapterPath) return;
    items.forEach((item) => {
      if (item.isChapter && item.path === pathname && item.children?.length) {
        setExpandedChapters((prev) => (prev.has(item.id) ? prev : new Set(prev).add(item.id)));
      }
    });
  }, [pathname, items]);

  const toggleChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  // Extract chapter number from path (e.g., "/chapter/5" -> 5)
  const getChapterNumberFromPath = (path: string): number | null => {
    const match = path.match(/\/chapter\/(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const getChapterTargetSectionKey = (chapterNumber: number) =>
    `targetSection-chapter-${chapterNumber}`;

  // Check if a chapter is accessible (all previous chapters must have passed quizzes)
  const isChapterAccessible = (targetChapterNumber: number): boolean => {
    if (fullCourseAccess) {
      return true;
    }
    if (!targetChapterNumber || targetChapterNumber <= 1) {
      return true; // Chapter 1 and introduction are always accessible
    }

    // New rule: authenticated users always have Chapter 2 unlocked
    const hasAuthToken = typeof document !== "undefined" && document.cookie
      .split("; ")
      .some((row) => row.startsWith("auth-token="));
    if (hasAuthToken && targetChapterNumber <= 2) {
      return true;
    }
    
    // Registered users are treated as having baseline Chapter 1 access.
    const requiredStartChapter = hasAuthToken ? 2 : 1;
    // Check if all required previous chapters have passed quizzes.
    for (let chNum = requiredStartChapter; chNum < targetChapterNumber; chNum++) {
      const progress = allUserProgress.find((p: UserProgress) => p.chapterNumber === chNum);
      if (!progress || !progress.quizCompleted || progress.quizScore < (progress.quizTotal * 0.75)) {
        return false; // Previous chapter not passed
      }
    }
    return true;
  };

  const handleNavigation = (item: MenuItem, e?: React.MouseEvent) => {
    if (item.sectionId) {
      // If it's a section, check if the chapter is accessible
      e?.stopPropagation();
      
      const targetChapterNumber = getChapterNumberFromPath(item.path);
      
      // Check if target chapter is accessible
      if (targetChapterNumber && !isChapterAccessible(targetChapterNumber)) {
        // Find which chapter is blocking access
        const hasAuthToken = typeof document !== "undefined" && document.cookie
          .split("; ")
          .some((row) => row.startsWith("auth-token="));
        const requiredStartChapter = hasAuthToken ? 2 : 1;
        let blockingChapter = requiredStartChapter;
        for (let chNum = requiredStartChapter; chNum < targetChapterNumber; chNum++) {
          const progress = allUserProgress.find((p: UserProgress) => p.chapterNumber === chNum);
          if (!progress || !progress.quizCompleted || progress.quizScore < (progress.quizTotal * 0.75)) {
            blockingChapter = chNum;
            break;
          }
        }
        alert(`You must complete and pass Chapter ${blockingChapter}'s quiz with at least 75% before accessing this section.`);
        return;
      }
      
      // Store section target per chapter so it cannot leak into other chapter routes.
      if (targetChapterNumber) {
        sessionStorage.setItem(getChapterTargetSectionKey(targetChapterNumber), item.sectionId);
      }
      // Backward cleanup for legacy global key behavior
      sessionStorage.removeItem('targetSection');
      
      if (pathname === item.path || currentPath === item.path) {
        // Already on this chapter page - trigger section change immediately
        window.dispatchEvent(new CustomEvent('navigateToSection', { detail: { sectionId: item.sectionId, chapterNumber: targetChapterNumber } }));
      } else {
        // Different chapter: navigate only; the new page will read targetSection when its fetch completes
        router.push(item.path);
      }
      
      setIsOpen(false);
    } else if (item.isChapter) {
      // If it's a chapter, toggle expansion instead of navigating
      e?.stopPropagation();
      toggleChapter(item.id, e || {} as React.MouseEvent);
    } else {
      // Regular navigation item (introduction, etc.)
      router.push(item.path);
      setIsOpen(false);
    }
  };

  // Open from Header button (mobile) via custom event
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("openCourseNav", handler);
    return () => window.removeEventListener("openCourseNav", handler);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#0a1a2e]/95 backdrop-blur-md border-r border-blue-500/30 z-40 overflow-y-auto shadow-xl">
        <div className="p-4">
          <h2 className="text-lg font-bold text-white mb-4 px-2">Course Navigation</h2>
          <nav className="space-y-1">
            {items.map((item) => {
              // Auto-expand chapter if it contains the active section
              const shouldAutoExpand = item.isChapter && item.children && item.children.some(child => 
                activeSectionId === child.sectionId
              );
              const isExpanded = item.isChapter && (expandedChapters.has(item.id) || shouldAutoExpand);
              const hasChildren = item.children && item.children.length > 0;
              
              // Check if this chapter/section is accessible
              const targetChapterNumber = item.path ? getChapterNumberFromPath(item.path) : null;
              const isAccessible = targetChapterNumber ? isChapterAccessible(targetChapterNumber) : true;
              const isLocked = !isAccessible;
              
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    onClick={(e) => handleNavigation(item, e)}
                    disabled={isLocked}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isLocked
                        ? "text-gray-500 cursor-not-allowed opacity-50"
                        : pathname === item.path || currentPath === item.path
                        ? "bg-gradient-to-r from-blue-500/40 to-cyan-500/30 text-blue-100 font-semibold border-l-4 border-cyan-400 shadow-md"
                        : item.isChapter
                        ? "text-gray-200 hover:bg-blue-500/20 hover:text-white font-medium"
                        : "text-gray-300 hover:bg-blue-500/15 hover:text-white hover:translate-x-1"
                    }`}
                    title={isLocked ? "Complete previous chapters' quizzes to unlock" : undefined}
                  >
                    <div className="flex items-start gap-2">
                      {item.isChapter && hasChildren && (
                        <svg
                          className={`shrink-0 size-3 mt-0.5 text-current transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                      {!item.isChapter && hasChildren && <span className="size-3 shrink-0" aria-hidden="true" />}
                      {isLocked && <span className="shrink-0 text-xs">🔒</span>}
                      <span className={`min-w-0 flex-1 ${item.isChapter ? 'text-sm font-semibold' : 'text-xs'} leading-relaxed`}>
                        {item.title}
                      </span>
                    </div>
                  </button>
                  
                  {/* Animated section children */}
                  {item.isChapter && hasChildren && (
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pl-4 space-y-0.5">
                        {item.children?.map((child, index) => {
                          const isActive = pathname === child.path || currentPath === child.path;
                          const isPlaying = activeSectionId === child.sectionId;
                          const childChapterNumber = child.path ? getChapterNumberFromPath(child.path) : null;
                          const isChildAccessible = childChapterNumber ? isChapterAccessible(childChapterNumber) : true;
                          const isChildLocked = !isChildAccessible;
                          
                          return (
                            <button
                              key={child.id}
                              onClick={(e) => handleNavigation(child, e)}
                              disabled={isChildLocked}
                              className={`w-full text-left px-3 py-1.5 rounded-md transition-all duration-300 ease-in-out ${
                                isChildLocked
                                  ? "text-gray-500 cursor-not-allowed opacity-50"
                                  : isActive || isPlaying
                                  ? "bg-blue-500/30 text-blue-200 font-medium border-l-2 border-blue-400 shadow-md"
                                  : "text-gray-400 hover:bg-blue-500/30 hover:text-white hover:translate-x-2 hover:shadow-lg hover:border-l-2 hover:border-blue-400/60"
                              } ${isExpanded ? 'animate-slide-in-left' : ''}`}
                              title={isChildLocked ? "Complete previous chapters' quizzes to unlock" : undefined}
                              style={{
                                animationDelay: isExpanded ? `${index * 30}ms` : '0ms',
                              }}
                            >
                                  <div className="flex items-center gap-2">
                                    {isPlaying && (
                                      <svg className="w-3 h-3 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                      </svg>
                                    )}
                                    <span className="text-xs leading-relaxed">
                                      {child.title}
                                      {isChildLocked && <span className="ml-1 text-xs">🔒</span>}
                                    </span>
                                  </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          
        </div>
      </aside>

      {/* Mobile Menu Overlay - z-index below main menu (Header) so main menu stays dominant */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed left-0 top-16 h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] w-64 bg-[#0a1a2e] border-r border-blue-500/30 z-40 flex flex-col min-h-0 overflow-hidden md:hidden animate-slide-up">
            <div className="shrink-0 flex items-center justify-between p-4 pb-3 border-b border-blue-500/20">
              <h2 className="text-lg font-bold text-white">Course Navigation</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-300 hover:text-white"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
              <nav className="space-y-2 pb-4">
                {items.map((item) => {
                  const isExpanded = item.isChapter && expandedChapters.has(item.id);
                  const hasChildren = item.children && item.children.length > 0;
                  
                  // Check if this chapter/section is accessible
                  const targetChapterNumber = item.path ? getChapterNumberFromPath(item.path) : null;
                  const isAccessible = targetChapterNumber ? isChapterAccessible(targetChapterNumber) : true;
                  const isLocked = !isAccessible;
                  
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={(e) => handleNavigation(item, e)}
                        disabled={isLocked}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                          isLocked
                            ? "text-gray-500 cursor-not-allowed opacity-50"
                            : pathname === item.path || currentPath === item.path
                            ? "bg-blue-500/30 text-blue-300 font-semibold border-l-4 border-blue-500"
                            : item.isChapter
                            ? "text-gray-200 hover:bg-blue-500/20 hover:text-white font-medium"
                            : "text-gray-300 hover:bg-blue-500/10 hover:text-white"
                        }`}
                        title={isLocked ? "Complete previous chapters' quizzes to unlock" : undefined}
                      >
                        <div className="flex items-start gap-2">
                          {item.isChapter && hasChildren && (
                            <svg
                              className={`shrink-0 size-3 mt-0.5 text-current transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          {!item.isChapter && hasChildren && <span className="size-3 shrink-0" aria-hidden="true" />}
                          {isLocked && <span className="shrink-0 text-xs">🔒</span>}
                          <span className={`min-w-0 flex-1 ${item.isChapter ? 'text-sm font-semibold' : 'text-sm'} leading-relaxed`}>
                            {item.title}
                          </span>
                        </div>
                      </button>
                      
                      {/* Animated section children */}
                      {item.isChapter && hasChildren && (
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="pl-6 space-y-1">
                            {item.children?.map((child, index) => {
                              const isActive = pathname === child.path || currentPath === child.path;
                              const isPlaying = activeSectionId === child.sectionId;
                              const childChapterNumber = child.path ? getChapterNumberFromPath(child.path) : null;
                              const isChildAccessible = childChapterNumber ? isChapterAccessible(childChapterNumber) : true;
                              const isChildLocked = !isChildAccessible;
                              
                              return (
                                <button
                                  key={child.id}
                                  onClick={(e) => handleNavigation(child, e)}
                                  disabled={isChildLocked}
                                  className={`w-full text-left px-4 py-2 rounded-md transition-all duration-300 ease-in-out ${
                                    isChildLocked
                                      ? "text-gray-500 cursor-not-allowed opacity-50"
                                      : isActive || isPlaying
                                      ? "bg-blue-500/30 text-blue-200 font-medium border-l-2 border-blue-400 shadow-md"
                                      : "text-gray-400 hover:bg-blue-500/30 hover:text-white hover:translate-x-2 hover:shadow-lg hover:border-l-2 hover:border-blue-400/60"
                                  } ${isExpanded ? 'animate-slide-in-left' : ''}`}
                                  title={isChildLocked ? "Complete previous chapters' quizzes to unlock" : undefined}
                                  style={{
                                    animationDelay: isExpanded ? `${index * 30}ms` : '0ms',
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    {isPlaying && (
                                      <svg className="w-3 h-3 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                      </svg>
                                    )}
                                    <span className="text-xs">{child.title}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

