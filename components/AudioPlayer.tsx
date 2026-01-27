'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cleanTextForAudio, splitIntoWords, buildWordMapping } from '@/lib/text-cleaning';

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

// Component to render HTML content with word highlighting
function HTMLContentWithHighlighting({
  html,
  words,
  highlightedIndex,
  getWordIndexForHighlight,
  plainText,
}: {
  html: string;
  words: WordTimestamp[];
  highlightedIndex: number | null;
  getWordIndexForHighlight: (displayWordIndex: number) => number | null;
  plainText: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);

  // Create displayWords array exactly as the main component does
  // Use the cleaned plainText (which should match the timestamp text)
  // Use the same splitting function for consistency - this ensures perfect alignment
  const displayWords = useMemo(() => {
    return splitIntoWords(plainText);
  }, [plainText]);

  // Initial render: parse HTML and wrap words in spans
  // This ensures word indices match exactly with displayWords array
  // CRITICAL: Handle formatted text (bold, italic, underline, color) correctly
  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined') return;

    const container = containerRef.current;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Strategy: Extract ALL text from HTML first (ignoring formatting tags)
    // Then match words sequentially while preserving formatting
    // This handles formatted text correctly (bold, italic, underline, color)
    const allTextNodes: Text[] = [];
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      allTextNodes.push(node as Text);
    }

    // Get all text content from HTML (without formatting) to verify word count
    const fullHtmlText = allTextNodes.map(node => node.textContent || '').join(' ');
    const cleanedFullText = cleanTextForAudio(fullHtmlText);
    const fullWords = splitIntoWords(cleanedFullText);
    
    // Verify word counts match
    if (fullWords.length !== displayWords.length) {
      console.warn(`Word count mismatch: HTML has ${fullWords.length} words, displayWords has ${displayWords.length} words`);
    }

    // Now traverse HTML and wrap words, matching sequentially with displayWords
    // Use a global word index that tracks across all text nodes
    let globalWordIndex = 0;
    wordsRef.current = new Array(displayWords.length).fill(null);
    
    // Process each text node and extract words, matching with global word index
    allTextNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      if (!text.trim()) {
        // Empty text node, skip but preserve it
        return;
      }
      
      // Clean this node's text to get the words it contains
      const cleanedNodeText = cleanTextForAudio(text);
      const nodeWords = splitIntoWords(cleanedNodeText);
      
      if (nodeWords.length === 0) {
        // No words in this node, preserve as-is
        return;
      }
      
      // Split the original text to preserve formatting while matching words
      // We need to match each word in the original text with the cleaned words
      const segments = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      let nodeWordIndex = 0;

      segments.forEach((segment) => {
        const trimmed = segment.trim();
        const isWord = trimmed.length > 0 && !/^\s+$/.test(segment);
        
        if (isWord) {
          // This is a word - check if it matches the expected word from cleaned text
          if (nodeWordIndex < nodeWords.length && globalWordIndex < displayWords.length) {
            // Verify the word matches (normalize for comparison)
            const cleanedSegment = cleanTextForAudio(segment).trim();
            const expectedWord = nodeWords[nodeWordIndex];
            
            // Match if cleaned segment matches expected word (handles punctuation differences)
            const normalizeForMatch = (w: string) => w.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim();
            const segmentNorm = normalizeForMatch(cleanedSegment);
            const expectedNorm = normalizeForMatch(expectedWord);
            
            if (segmentNorm === expectedNorm || segmentNorm.length === 0) {
              // Word matches - wrap it in a span with the correct word index
              // The span will inherit formatting from parent elements (bold, italic, color, etc.)
              const span = document.createElement('span');
              span.textContent = segment;
              span.className = 'inline audio-word';
              span.setAttribute('data-word-index', globalWordIndex.toString());
              
              // Store ref for highlighting - this maps displayWordIndex to the DOM element
              wordsRef.current[globalWordIndex] = span;

              fragment.appendChild(span);
              globalWordIndex++;
              nodeWordIndex++;
            } else {
              // Word doesn't match - might be due to formatting artifacts
              // Still wrap it but try to match with next expected word
              const span = document.createElement('span');
              span.textContent = segment;
              span.className = 'inline audio-word';
              span.setAttribute('data-word-index', globalWordIndex.toString());
              wordsRef.current[globalWordIndex] = span;
              fragment.appendChild(span);
              globalWordIndex++;
              nodeWordIndex++;
            }
          } else {
            // Index out of bounds - preserve as text to maintain structure
            fragment.appendChild(document.createTextNode(segment));
          }
        } else {
          // Space or whitespace - preserve as text node
          fragment.appendChild(document.createTextNode(segment));
        }
      });

      // Replace the original text node with our fragment containing wrapped words
      // This preserves the parent element's formatting (bold, italic, color, etc.)
      if (textNode.parentNode && fragment.childNodes.length > 0) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });

    // Update container with processed HTML (now with word spans)
    container.innerHTML = '';
    container.appendChild(tempDiv);
  }, [html, plainText, displayWords]);

  // Update highlighting when highlightedIndex changes
  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined') return;

    // Remove all previous highlights
    wordsRef.current.forEach((span) => {
      if (span) {
        span.style.background = '';
        span.style.backgroundSize = '';
        span.style.backgroundPosition = '';
        span.style.backgroundRepeat = '';
        span.style.color = '';
        span.style.borderRadius = '';
        span.style.textShadow = '';
        span.style.transition = '';
      }
    });

    // Apply highlight to current word
    // highlightedIndex is the timestamp index, we need to find which display word corresponds to it
    if (highlightedIndex !== null && words.length > 0) {
      // Find all display words that map to this timestamp index
      wordsRef.current.forEach((span, displayWordIndex) => {
        const timestampIndex = getWordIndexForHighlight(displayWordIndex);
        const isHighlighted = timestampIndex !== null && highlightedIndex === timestampIndex;

        if (isHighlighted && span) {
          span.style.background = 'linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%)';
          span.style.backgroundSize = '100% 85%';
          span.style.backgroundPosition = 'center';
          span.style.backgroundRepeat = 'no-repeat';
          span.style.color = '#fef08a';
          span.style.borderRadius = '3px';
          span.style.textShadow = '0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5)';
          span.style.transition = 'background 0.08s ease-out, color 0.08s ease-out, text-shadow 0.08s ease-out';

          // Scroll to first highlighted word
          if (displayWordIndex === 0 || wordsRef.current[displayWordIndex - 1]?.style.background === '') {
            span.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }
      });
    }
  }, [highlightedIndex, words, getWordIndexForHighlight]);

  return (
    <div
      ref={containerRef}
      className="space-y-4 break-words overflow-wrap-anywhere prose prose-invert max-w-none"
      style={{
        wordWrap: "break-word",
        overflowWrap: "break-word",
        whiteSpace: "normal",
      }}
    />
  );
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

  // Check if text contains HTML
  const isHTML = useMemo(() => /<[^>]+>/.test(text), [text]);
  
  // Get plain text for word matching (strip HTML if present)
  // Use the same cleaning function as the API route to ensure perfect matching
  const plainText = useMemo(() => {
    if (isHTML) {
      return cleanTextForAudio(text);
    }
    return cleanTextForAudio(text); // Still clean to remove any markdown/formatting
  }, [text, isHTML]);
  
  // Store the cleaned text from timestamps for accurate word matching
  const [timestampText, setTimestampText] = useState<string | null>(null);
  
  // Split text into words for highlighting - memoize to prevent recalculation
  // Use timestamp text if available (more accurate), otherwise use cleaned display text
  // Use the same splitting function as audio generation for perfect alignment
  const displayWords = useMemo(() => {
    const textToUse = timestampText || plainText;
    return splitIntoWords(textToUse);
  }, [plainText, timestampText]);
  
  // Build word mapping from display words to timestamp words for perfect alignment
  const wordMapping = useMemo(() => {
    if (words.length === 0 || displayWords.length === 0) {
      return new Map<number, number>();
    }
    
    // Extract words from timestamp array
    const timestampWords = words.map(w => w.word);
    
    // Build mapping using the shared utility
    return buildWordMapping(displayWords, timestampWords);
  }, [displayWords, words]);
  
  // Parse text into structured blocks for display (numbered lists on separate lines)
  // Use timestamp text if available for perfect alignment with audio
  const textBlocks = useMemo(() => {
    const blocks: Array<{ text: string; html?: string; isNumberedItem: boolean; wordStartIndex: number }> = [];
    
    // Use timestamp text if available (exact text used for audio), otherwise use cleaned plainText
    const textToParse = timestampText || plainText;
    
    // Use plain text for parsing structure
    const numberedListPattern = /(?<=\s|^)\d+\.\s(?=[A-Z]|$)/;
    const hasNumberedList = numberedListPattern.test(textToParse);
    
    if (!hasNumberedList) {
      return [{
        text: textToParse.trim(),
        html: isHTML ? text.trim() : undefined,
        isNumberedItem: false,
        wordStartIndex: 0
      }];
    }
    
    // For HTML content, we need to parse differently
    if (isHTML) {
      // Split HTML while preserving structure - use textToParse for splitting
      const parts = textToParse.split(/(?=\s\d+\.\s(?=[A-Z])|^\d+\.\s(?=[A-Z]))/);
      
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
        
        const partWords = splitIntoWords(trimmed);
        wordIndex += partWords.length;
      }
    } else {
      // Plain text parsing (original logic)
      const parts = textToParse.split(/(?=\s\d+\.\s(?=[A-Z])|^\d+\.\s(?=[A-Z]))/);
      
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
        
        const partWords = splitIntoWords(trimmed);
        wordIndex += partWords.length;
      }
    }
    
    return blocks;
  }, [plainText, text, isHTML, timestampText]);

  // Load timestamps from URL
  useEffect(() => {
    if (!timestampsUrl) {
      setWords([]);
      setTimestampText(null);
      return;
    }

    const loadTimestamps = async () => {
      try {
        const response = await fetch(timestampsUrl);
        if (!response.ok) {
          console.warn('Failed to load timestamps:', response.statusText);
          setWords([]);
          setTimestampText(null);
          return;
        }

        const data: TimestampsData = await response.json();
        
        // Store the cleaned text from timestamps - this is the exact text used for audio generation
        // Use this for word matching instead of extracting from HTML
        if (data.text) {
          setTimestampText(data.text.trim());
        }
        
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
        setTimestampText(null);
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
  // Use the pre-built word mapping for perfect alignment
  const getWordIndexForHighlight = useCallback((displayWordIndex: number): number | null => {
    if (words.length === 0 || displayWords.length === 0) return null;
    
    // Use the pre-built mapping for perfect alignment
    const timestampIndex = wordMapping.get(displayWordIndex);
    
    if (timestampIndex !== undefined && timestampIndex !== null) {
      return timestampIndex;
    }
    
    // Fallback: if mapping doesn't exist, try direct index (shouldn't happen with perfect mapping)
    if (displayWordIndex < words.length) {
      return displayWordIndex;
    }
    
    return null;
  }, [words, displayWords, wordMapping]);

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
            // Render HTML content with highlighting support
            <HTMLContentWithHighlighting
              html={text}
              words={words}
              highlightedIndex={highlightedIndex}
              getWordIndexForHighlight={getWordIndexForHighlight}
              plainText={timestampText || plainText}
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
