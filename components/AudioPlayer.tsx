'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

interface TimestampsData {
  text: string;
  segments: Array<{
    words: Array<{
      text: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
  }>;
}

interface AudioPlayerProps {
  text: string;
  audioUrl?: string;
  timestampsUrl?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  highlightQuery?: string;
  hideText?: boolean; // Hide text display, show only controls
  onHighlightedWord?: (word: string, wordIndex: number) => void; // Callback when word is highlighted
}

export default function AudioPlayer({
  text,
  audioUrl,
  timestampsUrl,
  autoPlay = false,
  onComplete,
  onTimeUpdate,
  onPlayingChange,
  highlightQuery,
  hideText = false,
  onHighlightedWord,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [words, setWords] = useState<WordTimestamp[]>([]);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioPlaybackRate');
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  // Helper function to strip HTML and get plain text
  const stripHTML = (html: string): string => {
    if (typeof document === 'undefined') {
      // Server-side: simple regex strip
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Check if text contains HTML
  const isHTML = useMemo(() => /<[^>]+>/.test(text), [text]);
  
  // Get plain text for word matching (strip HTML if present)
  const plainText = useMemo(() => isHTML ? stripHTML(text) : text, [text, isHTML]);
  
  // Split text into words for highlighting - memoize to prevent recalculation
  const displayWords = useMemo(() => plainText.split(/\s+/).filter(word => word.length > 0), [plainText]);
  
  // Parse text into structured blocks for display (numbered lists on separate lines)
  const textBlocks = useMemo(() => {
    const blocks: Array<{ text: string; html?: string; isNumberedItem: boolean; wordStartIndex: number }> = [];
    
    // Use plain text for parsing structure
    const numberedListPattern = /(?<=\s|^)\d+\.\s(?=[A-Z]|$)/;
    const hasNumberedList = numberedListPattern.test(plainText);
    
    if (!hasNumberedList) {
      return [{
        text: plainText.trim(),
        html: isHTML ? text.trim() : undefined,
        isNumberedItem: false,
        wordStartIndex: 0
      }];
    }
    
    // For HTML content, we need to parse differently
    if (isHTML) {
      // Split HTML while preserving structure - use plain text for splitting
      const parts = plainText.split(/(?=\s\d+\.\s(?=[A-Z])|^\d+\.\s(?=[A-Z]))/);
      
      let wordIndex = 0;
      let htmlOffset = 0;
      
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        const isNumberedItem = /^\d+\.\s/.test(trimmed);
        
        // Find corresponding HTML segment (approximate)
        const htmlSegment = text.substring(htmlOffset, Math.min(htmlOffset + trimmed.length * 2, text.length));
        htmlOffset += htmlSegment.length;
        
        blocks.push({
          text: trimmed,
          html: htmlSegment.trim(),
          isNumberedItem,
          wordStartIndex: wordIndex,
        });
        
        const partWords = trimmed.split(/\s+/).filter(w => w.length > 0);
        wordIndex += partWords.length;
      }
    } else {
      // Plain text parsing (original logic)
      const parts = plainText.split(/(?=\s\d+\.\s(?=[A-Z])|^\d+\.\s(?=[A-Z]))/);
      
      let wordIndex = 0;
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        const isNumberedItem = /^\d+\.\s/.test(trimmed);
        blocks.push({
          text: trimmed,
          isNumberedItem,
          wordStartIndex: wordIndex,
        });
        
        const partWords = trimmed.split(/\s+/).filter(w => w.length > 0);
        wordIndex += partWords.length;
      }
    }
    
    return blocks;
  }, [plainText, text, isHTML]);

  // Load timestamps from URL
  useEffect(() => {
    if (!timestampsUrl) {
      setWords([]);
      return;
    }

    const loadTimestamps = async () => {
      try {
        const response = await fetch(timestampsUrl);
        if (!response.ok) {
          console.warn('Failed to load timestamps:', response.statusText);
          setWords([]);
          return;
        }

        const data: TimestampsData = await response.json();
        
        // Convert timestamp format to WordTimestamp format
        const wordTimestamps: WordTimestamp[] = [];
        
        if (data.segments && data.segments.length > 0) {
          for (const segment of data.segments) {
            if (segment.words && Array.isArray(segment.words)) {
              for (const word of segment.words) {
                wordTimestamps.push({
                  word: word.text || '',
                  startTime: word.start || 0,
                  endTime: word.end || 0,
                });
              }
            }
          }
        }
        
        setWords(wordTimestamps);
      } catch (error) {
        console.error('Error loading timestamps:', error);
        setWords([]);
      }
    };

    loadTimestamps();
  }, [timestampsUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const current = audio.currentTime;
      setCurrentTime(current);

      if (onTimeUpdate) {
        onTimeUpdate(current, audio.duration || 0);
      }

      // Simple highlighting: Find the word that should be highlighted based on current time
      const currentWordIndex = words.findIndex(
        (w) => current >= w.startTime && current < w.endTime
      );

      if (currentWordIndex !== -1) {
        if (highlightedIndex !== currentWordIndex) {
          setHighlightedIndex(currentWordIndex);
          
          // Call onHighlightedWord callback if provided
          if (onHighlightedWord && words[currentWordIndex]) {
            onHighlightedWord(words[currentWordIndex].word, currentWordIndex);
          }
        }
      } else {
        if (highlightedIndex !== null) {
          setHighlightedIndex(null);
        }
      }
    };

    const handleTimeUpdate = () => {
      updateTime();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlayingChange) {
        onPlayingChange(true);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasCompleted(true);
      setCurrentTime(audio.duration || 0);
      setHighlightedIndex(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (onComplete) {
        onComplete();
      }
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (onTimeUpdate && audio.duration) {
        onTimeUpdate(0, audio.duration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Use interval for more precise updates
    intervalRef.current = setInterval(updateTime, 50);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [words, audioUrl, onTimeUpdate, onComplete, onPlayingChange, onHighlightedWord, highlightedIndex]);

  // Set initial playback rate from localStorage when audio loads
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl) {
      const savedRate = typeof window !== 'undefined' ? localStorage.getItem('audioPlaybackRate') : null;
      if (savedRate) {
        const rate = parseFloat(savedRate);
        if (!isNaN(rate) && rate > 0) {
          audio.playbackRate = rate;
          setPlaybackRate(rate);
        }
      } else {
        audio.playbackRate = 1;
        setPlaybackRate(1);
      }
    }
  }, [audioUrl]);

  // Update playback rate when it changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= 2) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Close speed menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
        setShowSpeedMenu(false);
      }
    };

    if (showSpeedMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpeedMenu]);

  // Auto-play when audioUrl changes or component mounts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || !autoPlay || hasPlayed || hasCompleted) return;

    const playAudio = () => {
      if (!hasPlayed) {
        audio.currentTime = 0;
      }
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setHasPlayed(true);
            if (onPlayingChange) {
              onPlayingChange(true);
            }
          })
          .catch((error) => {
            if (error.name !== 'NotAllowedError') {
              console.error('Error playing audio:', error);
            }
            setIsPlaying(false);
            setHasPlayed(false);
          });
      }
    };

    if (audio.readyState >= 2) {
      setTimeout(playAudio, 100);
    } else {
      const canPlayHandler = () => {
        playAudio();
      };
      audio.addEventListener('canplay', canPlayHandler, { once: true });
      return () => {
        audio.removeEventListener('canplay', canPlayHandler);
      };
    }
  }, [audioUrl, autoPlay, hasPlayed, hasCompleted, onPlayingChange]);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioPlaybackRate', speed.toString());
    }
    setShowSpeedMenu(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    } else {
      if (hasCompleted) {
        if (onComplete) {
          onComplete();
        }
        return;
      }
      
      audio.play().then(() => {
        setIsPlaying(true);
        setHasPlayed(true);
        if (onPlayingChange) {
          onPlayingChange(true);
        }
      }).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);

    // Update highlighting immediately when seeking
    const currentWordIndex = words.findIndex(
      (w) => newTime >= w.startTime && newTime < w.endTime
    );
    setHighlightedIndex(currentWordIndex !== -1 ? currentWordIndex : null);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Map timestamp words to display words for highlighting
  const getWordIndexForHighlight = (displayWordIndex: number): number | null => {
    if (words.length === 0) return null;
    
    // If we have timestamps, try to match by position
    // For simplicity, we'll use direct index mapping
    if (displayWordIndex < words.length) {
      return displayWordIndex;
    }
    
    return null;
  };

  return (
    <div className="w-full">
      {audioUrl ? (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata" 
          loop={false}
          onError={(e) => {
            console.error('Audio element error:', e);
          }}
        />
      ) : (
        <div className="text-yellow-400 text-sm mb-2">
          ⚠️ No audio URL provided
        </div>
      )}
      
      {/* Text with highlighting - structured display with numbered items on separate lines */}
      {!hideText && (
        <div className="text-white text-base md:text-lg leading-relaxed mb-6">
          {isHTML ? (
            // Render HTML content directly
            <div
              className="space-y-4 break-words overflow-wrap-anywhere prose prose-invert max-w-none"
              style={{
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "normal",
              }}
              dangerouslySetInnerHTML={{ __html: text }}
            />
          ) : (
            // Render plain text with word-by-word highlighting
            <div className="space-y-4 break-words overflow-wrap-anywhere">
              {textBlocks.map((block, blockIndex) => {
                // Split this block's text into words with spaces for highlighting
                const blockWordsWithSpaces = block.text.split(/(\s+)/);
                let blockWordIndex = block.wordStartIndex;
                
                return (
                  <div
                    key={blockIndex}
                    className={block.isNumberedItem ? "mt-3 mb-2 pl-4" : blockIndex === 0 ? "" : "mt-2"}
                    style={{
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                      whiteSpace: "normal",
                    }}
                  >
                  {blockWordsWithSpaces.map((segment, segmentIndex) => {
                    const isWord = segment.trim().length > 0 && !/^\s+$/.test(segment);
                    const globalWordIndex = isWord ? blockWordIndex : null;
                    
                    if (isWord) {
                      blockWordIndex++;
                    }
                    
                    // Check if this word should be highlighted
                    const timestampIndex = globalWordIndex !== null ? getWordIndexForHighlight(globalWordIndex) : null;
                    const isHighlighted = timestampIndex !== null && highlightedIndex === timestampIndex;
                    const isSpace = !isWord;
                    
                    const trimmedSegment = segment.trim();
                    const isNumberedItem = /^\d+\./.test(trimmedSegment);
                    
                    return (
                      <span
                        key={`${blockIndex}-${segmentIndex}`}
                        ref={(el) => {
                          if (el && isWord && globalWordIndex !== null) {
                            wordsRef.current[globalWordIndex] = el;
                          }
                        }}
                        className="inline"
                        style={{
                          padding: "0",
                          margin: "0",
                          display: "inline",
                          whiteSpace: "normal",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          lineHeight: "inherit",
                          fontSize: "inherit",
                          fontFamily: "inherit",
                          fontWeight: "600",
                          ...(isHighlighted ? {
                            background: "linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%)",
                            backgroundSize: "100% 85%",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            color: "#fef08a",
                            borderRadius: "3px",
                            textShadow: "0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5)",
                            transition: "background 0.08s ease-out, color 0.08s ease-out, text-shadow 0.08s ease-out",
                          } : highlightQuery && segment.toLowerCase().includes(highlightQuery.toLowerCase()) ? {
                            backgroundColor: "rgba(250, 204, 21, 0.4)",
                            color: "#fef08a",
                            borderRadius: "3px",
                            fontWeight: "600",
                          } : {
                            color: isNumberedItem ? "#93c5fd" : "inherit",
                            background: "transparent",
                          }),
                        }}
                      >
                        {segment}
                      </span>
                    );
                  })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Audio Controls */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4h2v12H6V4zm6 0h2v12h-2V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="text-sm text-gray-300 min-w-[80px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Speed Control */}
        <div className="relative" ref={speedMenuRef}>
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 min-w-[60px]"
            aria-label="Playback speed"
          >
            {playbackRate}x
          </button>
          
          {showSpeedMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-[#1e3a5f] border border-blue-500/30 rounded-lg shadow-2xl overflow-hidden z-50 min-w-[100px]">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                    playbackRate === speed
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-300 hover:bg-blue-500/30 hover:text-white'
                  }`}
                >
                  {speed}x {speed === 1 && '(Normal)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
