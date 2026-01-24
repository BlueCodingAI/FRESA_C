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

interface TableOfContentsProps {
  items: MenuItem[];
  currentPath?: string;
  activeSectionId?: string; // ID of the section currently playing audio
}

export default function TableOfContents({ items, currentPath, activeSectionId }: TableOfContentsProps) {
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

  const handleNavigation = (item: MenuItem, e?: React.MouseEvent) => {
    if (item.sectionId) {
      // If it's a section, navigate to chapter and set the section
      e?.stopPropagation();
      
      // Store section ID in sessionStorage to be picked up by the chapter page
      sessionStorage.setItem('targetSection', item.sectionId);
      
      // If we're already on the chapter page, just dispatch the event
      // Otherwise, navigate first
      if (pathname === item.path || currentPath === item.path) {
        // Already on the page - just trigger section change
        window.dispatchEvent(new CustomEvent('navigateToSection', { detail: { sectionId: item.sectionId } }));
      } else {
        // Navigate to the chapter page first
        router.push(item.path);
        // Small delay to ensure navigation happens, then trigger section change
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('navigateToSection', { detail: { sectionId: item.sectionId } }));
        }, 100);
      }
      
      setIsOpen(false);
    } else if (item.isChapter) {
      // If it's a chapter, toggle expansion instead of navigating
      e?.stopPropagation();
      toggleChapter(item.id, e || {} as React.MouseEvent);
    } else {
      // Regular navigation item
      router.push(item.path);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-20 left-4 z-50 bg-[#1e3a5f] border border-blue-500/30 rounded-lg p-2 shadow-lg hover:bg-[#2d4a6f] transition-all duration-200 md:hidden"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

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
              
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    onClick={(e) => handleNavigation(item, e)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      pathname === item.path || currentPath === item.path
                        ? "bg-gradient-to-r from-blue-500/40 to-cyan-500/30 text-blue-100 font-semibold border-l-4 border-cyan-400 shadow-md"
                        : item.isChapter
                        ? "text-gray-200 hover:bg-blue-500/20 hover:text-white font-medium"
                        : "text-gray-300 hover:bg-blue-500/15 hover:text-white hover:translate-x-1"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.isChapter && hasChildren && (
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                      {!item.isChapter && hasChildren && <span className="w-4" />}
                      <span className={`${item.isChapter ? 'text-sm font-semibold' : 'text-xs'} leading-relaxed`}>
                        {item.title}
                      </span>
                    </div>
                  </button>
                  
                  {/* Animated section children */}
                  {item.isChapter && hasChildren && (
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pl-4 space-y-0.5">
                        {item.children?.map((child, index) => {
                          const isActive = pathname === child.path || currentPath === child.path;
                          const isPlaying = activeSectionId === child.sectionId;
                          return (
                            <button
                              key={child.id}
                              onClick={(e) => handleNavigation(child, e)}
                              className={`w-full text-left px-3 py-1.5 rounded-md transition-all duration-300 ease-in-out ${
                                isActive || isPlaying
                                  ? "bg-blue-500/30 text-blue-200 font-medium border-l-2 border-blue-400 shadow-md"
                                  : "text-gray-400 hover:bg-blue-500/30 hover:text-white hover:translate-x-2 hover:shadow-lg hover:border-l-2 hover:border-blue-400/60"
                              } ${isExpanded ? 'animate-slide-in-left' : ''}`}
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
                                <span className="text-xs leading-relaxed">{child.title}</span>
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

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#0a1a2e] border-r border-blue-500/30 z-50 overflow-y-auto md:hidden animate-slide-up">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Course Navigation</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-300 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="space-y-2">
                {items.map((item) => {
                  const isExpanded = item.isChapter && expandedChapters.has(item.id);
                  const hasChildren = item.children && item.children.length > 0;
                  
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={(e) => handleNavigation(item, e)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                          pathname === item.path || currentPath === item.path
                            ? "bg-blue-500/30 text-blue-300 font-semibold border-l-4 border-blue-500"
                            : item.isChapter
                            ? "text-gray-200 hover:bg-blue-500/20 hover:text-white font-medium"
                            : "text-gray-300 hover:bg-blue-500/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.isChapter && hasChildren && (
                            <svg
                              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          {!item.isChapter && hasChildren && <span className="w-4" />}
                          <span className={item.isChapter ? 'text-sm font-semibold' : 'text-sm'}>
                            {item.title}
                          </span>
                        </div>
                      </button>
                      
                      {/* Animated section children */}
                      {item.isChapter && hasChildren && (
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="pl-6 space-y-1">
                            {item.children?.map((child, index) => {
                              const isActive = pathname === child.path || currentPath === child.path;
                              const isPlaying = activeSectionId === child.sectionId;
                              return (
                                <button
                                  key={child.id}
                                  onClick={(e) => handleNavigation(child, e)}
                                  className={`w-full text-left px-4 py-2 rounded-md transition-all duration-300 ease-in-out ${
                                    isActive || isPlaying
                                      ? "bg-blue-500/30 text-blue-200 font-medium border-l-2 border-blue-400 shadow-md"
                                      : "text-gray-400 hover:bg-blue-500/30 hover:text-white hover:translate-x-2 hover:shadow-lg hover:border-l-2 hover:border-blue-400/60"
                                  } ${isExpanded ? 'animate-slide-in-left' : ''}`}
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

