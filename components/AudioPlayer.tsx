'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cleanTextForAudio, splitIntoWords } from '@/lib/text-cleaning';

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
  // CRITICAL: Use cleaned plainText (which matches timestamp text) as source of truth
  // Match HTML words sequentially to cleaned words, preserving formatting
  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined') return;

    const container = containerRef.current;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Extract ALL text from HTML (ignoring formatting) and clean it
    // This gives us the exact word sequence that matches timestamps
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

    // SIMPLIFIED APPROACH: Use displayWords as absolute source of truth
    // Match HTML text nodes sequentially to displayWords by comparing cleaned versions
    wordsRef.current = new Array(displayWords.length).fill(null);
    let globalWordIndex = 0; // Tracks position in displayWords array
    
    // Process each text node sequentially
    allTextNodes.forEach((textNode) => {
      const nodeText = textNode.textContent || '';
      if (!nodeText.trim() || globalWordIndex >= displayWords.length) {
        return;
      }
      
      // Clean this node's text
      const cleanedNodeText = cleanTextForAudio(nodeText);
      const nodeWords = splitIntoWords(cleanedNodeText);
      
      if (nodeWords.length === 0) {
        // No words - might be just punctuation or contractions in a separate text node
        const trimmed = nodeText.trim();
        // Check if this is punctuation-only (including all types: . , ! ? ; : ' " ( ) [ ] { } etc.)
        // Also check for contractions like 's, 't, 're, 've, 'll, 'd, 'm
        const isPunctuationOnly = /^[.,!?;:'"()\[\]{}…—–\-]+$/.test(trimmed);
        const isContraction = /^'[sstdmrevel]+$/i.test(trimmed); // 's, 't, 're, 've, 'll, 'd, 'm, etc.
        
        if (trimmed.length > 0 && (isPunctuationOnly || isContraction)) {
          // Check if CURRENT expected display word ends with this punctuation
          // (If a word was wrapped without punctuation in previous node, globalWordIndex 
          //  still points to that word, so we check current)
          if (globalWordIndex < displayWords.length) {
            const currentDisplayWord = displayWords[globalWordIndex] || '';
            const currentSpan = wordsRef.current[globalWordIndex];
            
            // First check if span has stored expected punctuation attribute
            let expectedPunct = '';
            if (currentSpan) {
              expectedPunct = currentSpan.getAttribute('data-expected-punct') || '';
            }
            
            // Check if current word ends with this punctuation/contraction
            // For contractions like "'s", check if word ends with the full contraction
            // For punctuation, check if word ends with any punctuation char
            let wordEndsWithMatch = false;
            
            if (isContraction) {
              // For contractions, check if the word ends with this exact contraction
              wordEndsWithMatch = currentDisplayWord.endsWith(trimmed);
            } else {
              // For punctuation, check if word ends with any punctuation char
              const punctuationChars = trimmed.split('');
              wordEndsWithMatch = punctuationChars.some(char => currentDisplayWord.endsWith(char));
            }
            
            // Also check if stored expected punctuation matches
            const storedPunctMatches = expectedPunct && (
              isContraction ? expectedPunct.includes(trimmed) : 
              trimmed.split('').some(char => expectedPunct.includes(char))
            );
            
            if (wordEndsWithMatch || storedPunctMatches) {
              // Punctuation is attached to current word - append to current span
              if (currentSpan) {
                // Append punctuation to the span we created in previous text node
                currentSpan.textContent = (currentSpan.textContent || '') + nodeText;
                // Remove the expected punctuation attribute since we've matched it
                currentSpan.removeAttribute('data-expected-punct');
                // Now advance globalWordIndex since we've completed this word
                globalWordIndex++;
                if (textNode.parentNode) {
                  textNode.parentNode.removeChild(textNode);
                }
                return;
              } else {
                // Span doesn't exist yet - create it with punctuation
                const fragment = document.createDocumentFragment();
                const span = document.createElement('span');
                span.textContent = nodeText;
                span.className = 'inline audio-word';
                span.setAttribute('data-word-index', globalWordIndex.toString());
                wordsRef.current[globalWordIndex] = span;
                fragment.appendChild(span);
                globalWordIndex++;
                if (textNode.parentNode && fragment.childNodes.length > 0) {
                  textNode.parentNode.replaceChild(fragment, textNode);
                }
                return;
              }
            }
          }
          
          // Check if PREVIOUS display word ends with this punctuation/contraction (fallback)
          if (globalWordIndex > 0) {
            const prevDisplayWord = displayWords[globalWordIndex - 1] || '';
            // Check if previous word ends with this punctuation/contraction
            let prevWordEndsWithMatch = false;
            
            if (isContraction) {
              // For contractions, check if the word ends with this exact contraction
              prevWordEndsWithMatch = prevDisplayWord.endsWith(trimmed);
            } else {
              // For punctuation, check if word ends with any punctuation char
              const punctuationChars = trimmed.split('');
              prevWordEndsWithMatch = punctuationChars.some(char => prevDisplayWord.endsWith(char));
            }
            
            if (prevWordEndsWithMatch) {
              // Punctuation is attached to previous word - append to previous span
              const prevSpan = wordsRef.current[globalWordIndex - 1];
              if (prevSpan) {
                prevSpan.textContent = (prevSpan.textContent || '') + nodeText;
                // Don't advance globalWordIndex - it's already advanced
                if (textNode.parentNode) {
                  textNode.parentNode.removeChild(textNode);
                }
                return;
              }
            }
          }
          
          // Punctuation doesn't match - wrap as separate word
          if (globalWordIndex < displayWords.length) {
            const fragment = document.createDocumentFragment();
            const span = document.createElement('span');
            span.textContent = nodeText;
            span.className = 'inline audio-word';
            span.setAttribute('data-word-index', globalWordIndex.toString());
            wordsRef.current[globalWordIndex] = span;
            fragment.appendChild(span);
            globalWordIndex++;
            if (textNode.parentNode && fragment.childNodes.length > 0) {
              textNode.parentNode.replaceChild(fragment, textNode);
            }
          }
        } else if (trimmed.length > 0) {
          // Not punctuation-only but no words - might be whitespace or other characters
          // Preserve as text node
          const fragment = document.createDocumentFragment();
          fragment.appendChild(document.createTextNode(nodeText));
          if (textNode.parentNode && fragment.childNodes.length > 0) {
            textNode.parentNode.replaceChild(fragment, textNode);
          }
        }
        return;
      }
      
      // Split node text by whitespace and match to displayWords
      const segments = nodeText.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      let nodeWordIdx = 0; // Index into nodeWords
      
      segments.forEach((segment) => {
        const trimmed = segment.trim();
        const isWord = trimmed.length > 0 && !/^\s+$/.test(segment);
        
        if (isWord && nodeWordIdx < nodeWords.length && globalWordIndex < displayWords.length) {
          const cleanedSegment = cleanTextForAudio(segment);
          const expectedDisplayWord = displayWords[globalWordIndex];
          
          // Normalize for comparison (remove punctuation except apostrophes, lowercase)
          // IMPORTANT: Preserve apostrophes to handle contractions correctly
          const normalize = (w: string) => w.replace(/[.,!?;:"()\[\]{}]/g, '').toLowerCase().trim();
          const segmentNorm = normalize(cleanedSegment);
          const expectedNorm = normalize(expectedDisplayWord);
          
          // Check for contractions - if expected word has a contraction, extract base word
          const contractionRegex = /'[sstdmrevel]+$/i;
          const expectedHasContraction = contractionRegex.test(expectedDisplayWord);
          const expectedBase = expectedHasContraction ? 
            expectedDisplayWord.replace(/'[sstdmrevel]+$/i, '').toLowerCase().trim() : 
            expectedDisplayWord.toLowerCase().trim();
          
          // Normalize segment the same way (remove punctuation except apostrophes)
          const segmentBase = normalize(cleanedSegment);
          
          // Check if segment matches expected word (with or without contraction)
          // Or if segment is the base word when expected has contraction
          const exactMatch = segmentNorm === expectedNorm && segmentNorm.length > 0;
          const segmentIsBaseOfExpected = expectedHasContraction && 
            segmentBase === expectedBase && segmentBase.length > 0;
          
          if (exactMatch || segmentIsBaseOfExpected) {
            // Exact match after normalization
            // Check if expected word has punctuation/contraction that this segment doesn't have
            // Check for all punctuation types: . , ! ? ; : ' " ( ) [ ] { } etc.
            // Also check for contractions like 's, 't, 're, 've, 'll, 'd, 'm
            const punctuationRegex = /[.,!?;:'"()\[\]{}…—–\-]$/;
            const contractionRegex = /'[sstdmrevel]+$/i; // 's, 't, 're, 've, 'll, 'd, 'm, etc.
            const expectedHasPunct = punctuationRegex.test(expectedDisplayWord);
            const expectedHasContraction = contractionRegex.test(expectedDisplayWord);
            const segmentHasPunct = punctuationRegex.test(segment);
            const segmentHasContraction = contractionRegex.test(segment);
            
            // Check if expected word has punctuation/contraction that segment doesn't have
            if ((expectedHasPunct || expectedHasContraction) && !segmentHasPunct && !segmentHasContraction) {
              // Expected word has punctuation/contraction but segment doesn't - it's in a later text node
              // Extract what punctuation/contraction the expected word ends with
              const expectedContractionMatch = expectedDisplayWord.match(/'[sstdmrevel]+$/i);
              const expectedPunctMatch = expectedDisplayWord.match(/[.,!?;:'"()\[\]{}…—–\-]+$/);
              const expectedPunct = expectedContractionMatch ? expectedContractionMatch[0] : 
                                   (expectedPunctMatch ? expectedPunctMatch[0] : '');
              
              // Wrap segment now, punctuation/contraction will be appended later when we encounter it
              const span = document.createElement('span');
              span.textContent = segment;
              span.className = 'inline audio-word';
              span.setAttribute('data-word-index', globalWordIndex.toString());
              span.setAttribute('data-expected-punct', expectedPunct); // Store expected punctuation/contraction for later matching
              wordsRef.current[globalWordIndex] = span;
              fragment.appendChild(span);
              // DON'T advance globalWordIndex yet - punctuation/contraction will be appended to this span
              // We'll advance it when we encounter the punctuation/contraction node in the next text node
              nodeWordIdx++;
            } else if (segmentIsBaseOfExpected) {
              // Segment is the base word and expected has contraction - wrap it and wait for contraction
              const expectedContractionMatch = expectedDisplayWord.match(/'[sstdmrevel]+$/i);
              const expectedPunct = expectedContractionMatch ? expectedContractionMatch[0] : '';
              
              const span = document.createElement('span');
              span.textContent = segment;
              span.className = 'inline audio-word';
              span.setAttribute('data-word-index', globalWordIndex.toString());
              span.setAttribute('data-expected-punct', expectedPunct);
              wordsRef.current[globalWordIndex] = span;
              fragment.appendChild(span);
              // DON'T advance globalWordIndex yet - contraction will be appended later
              nodeWordIdx++;
            } else {
              // Normal match (both have punctuation or both don't) - wrap it
              const span = document.createElement('span');
              span.textContent = segment;
              span.className = 'inline audio-word';
              span.setAttribute('data-word-index', globalWordIndex.toString());
              wordsRef.current[globalWordIndex] = span;
              fragment.appendChild(span);
              globalWordIndex++;
              nodeWordIdx++;
            }
          } else {
            // No exact match - but check if segment might be part of expected word with contraction
            const contractionRegex = /'[sstdmrevel]+$/i;
            const expectedHasContraction = contractionRegex.test(expectedDisplayWord);
            
            if (expectedHasContraction) {
              // Check if segment is the base word (without contraction)
              const expectedBase = expectedDisplayWord.replace(/'[sstdmrevel]+$/i, '').toLowerCase().trim();
              const segmentBase = cleanedSegment.toLowerCase().trim();
              
              if (expectedBase === segmentBase) {
                // Segment is the base word, expected has contraction - wrap and wait for contraction
                const expectedContractionMatch = expectedDisplayWord.match(/'[sstdmrevel]+$/i);
                const expectedPunct = expectedContractionMatch ? expectedContractionMatch[0] : '';
                
                const span = document.createElement('span');
                span.textContent = segment;
                span.className = 'inline audio-word';
                span.setAttribute('data-word-index', globalWordIndex.toString());
                span.setAttribute('data-expected-punct', expectedPunct);
                wordsRef.current[globalWordIndex] = span;
                fragment.appendChild(span);
                // DON'T advance globalWordIndex yet - contraction will be appended later
                nodeWordIdx++;
              } else {
                // No match - wrap it anyway to maintain structure
                const span = document.createElement('span');
                span.textContent = segment;
                span.className = 'inline audio-word';
                span.setAttribute('data-word-index', globalWordIndex.toString());
                wordsRef.current[globalWordIndex] = span;
                fragment.appendChild(span);
                globalWordIndex++;
                nodeWordIdx++;
              }
            } else {
              // No match - wrap it anyway to maintain structure
              const span = document.createElement('span');
              span.textContent = segment;
              span.className = 'inline audio-word';
              span.setAttribute('data-word-index', globalWordIndex.toString());
              wordsRef.current[globalWordIndex] = span;
              fragment.appendChild(span);
              globalWordIndex++;
              nodeWordIdx++;
            }
          }
        } else if (!isWord) {
          // Space - preserve as text
          fragment.appendChild(document.createTextNode(segment));
        } else {
          // Word but out of bounds - preserve as text
          fragment.appendChild(document.createTextNode(segment));
        }
      });
      
      // Replace the original text node
      if (textNode.parentNode && fragment.childNodes.length > 0) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });

    // Update container with processed HTML
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

          // Auto-scroll removed per user request
          // Previously scrolled to highlighted word, but user prefers no auto-scrolling
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
  // Use timestamp text if available (more accurate - exact text used for audio generation)
  // Otherwise use cleaned plainText (which should match timestamp text)
  // Use the same splitting function as audio generation for perfect alignment
  const displayWords = useMemo(() => {
    const textToUse = timestampText || plainText;
    return splitIntoWords(textToUse);
  }, [plainText, timestampText]);
  
  // Build word mapping to handle punctuation differences between display words and timestamp words
  // Timestamp words might have punctuation as separate tokens (e.g., ["Hello", ",", "world"])
  // While display words might have punctuation attached (e.g., ["Hello,", "world"])
  const wordMapping = useMemo(() => {
    if (words.length === 0 || displayWords.length === 0) {
      return new Map<number, number>();
    }
    
    const timestampWords = words.map(w => w.word);
    const mapping = new Map<number, number>();
    
    // If counts match exactly, use direct 1:1 mapping
    if (displayWords.length === timestampWords.length) {
      for (let i = 0; i < displayWords.length; i++) {
        mapping.set(i, i);
      }
      return mapping;
    }
    
    // Counts don't match - build mapping accounting for punctuation differences
    let displayIdx = 0;
    let timestampIdx = 0;
    
    while (displayIdx < displayWords.length && timestampIdx < timestampWords.length) {
      const displayWord = displayWords[displayIdx];
      const timestampWord = timestampWords[timestampIdx];
      
      // Normalize words for comparison (remove punctuation, lowercase)
      const normalizeWord = (w: string) => w.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim();
      const displayNorm = normalizeWord(displayWord);
      const timestampNorm = normalizeWord(timestampWord);
      
      // Check if words match (ignoring punctuation)
      if (displayNorm === timestampNorm && displayNorm.length > 0) {
        // Words match - map them
        mapping.set(displayIdx, timestampIdx);
        displayIdx++;
        timestampIdx++;
      } else {
        // Check if timestamp word is just punctuation
        const timestampTrimmed = timestampWord.trim();
        if (/^[.,!?;:'"()\[\]{}]+$/.test(timestampTrimmed)) {
          // Timestamp word is punctuation - map it to current display word
          // (punctuation is part of the display word, so they share the same timestamp)
          if (!mapping.has(displayIdx)) {
            mapping.set(displayIdx, timestampIdx);
          }
          timestampIdx++; // Skip punctuation token, don't advance display index
        } else if (displayNorm.length === 0) {
          // Display word is empty or just punctuation - skip it
          displayIdx++;
        } else if (timestampNorm.length === 0) {
          // Timestamp word is empty or just punctuation - skip it
          timestampIdx++;
        } else {
          // Check if display word contains timestamp word (punctuation attached to display word)
          if (displayNorm.includes(timestampNorm) || timestampNorm.includes(displayNorm)) {
            // Partial match - map them
            mapping.set(displayIdx, timestampIdx);
            displayIdx++;
            timestampIdx++;
          } else {
            // No match - advance display index and try next timestamp word
            // This handles cases where display has fewer words due to punctuation merging
            displayIdx++;
          }
        }
      }
    }
    
    // Fill in any remaining display words with the last timestamp index
    while (displayIdx < displayWords.length) {
      if (timestampIdx > 0) {
        mapping.set(displayIdx, timestampIdx - 1);
      }
      displayIdx++;
    }
    
    return mapping;
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

      // Find the word that should be highlighted based on current time
      // Strategy: Find the word that is currently being spoken
      // Highlight when current time is >= word startTime and < next word's startTime (or <= current word's endTime)
      let currentWordIndex = -1;
      
      if (words.length > 0) {
        // Find the word where current time falls within its time range
        // Use >= startTime and <= endTime to include both boundaries
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const nextWord = i < words.length - 1 ? words[i + 1] : null;
          
          // Check if current time is within this word's range
          // Or if we're past this word's start but before the next word starts
          if (current >= word.startTime) {
            if (nextWord) {
              // If there's a next word, highlight until its start
              if (current < nextWord.startTime) {
                currentWordIndex = i;
                break;
              }
            } else {
              // Last word - highlight until its end
              if (current <= word.endTime) {
                currentWordIndex = i;
                break;
              }
            }
          }
        }
        
        // Fallback: if no word found, find the closest word that has started
        if (currentWordIndex === -1) {
          for (let i = words.length - 1; i >= 0; i--) {
            if (current >= words[i].startTime) {
              currentWordIndex = i;
              break;
            }
          }
        }
      }

      if (currentWordIndex !== -1) {
        if (highlightedIndex !== currentWordIndex) {
          setHighlightedIndex(currentWordIndex);
          
          // Call onHighlightedWord callback if provided
          if (onHighlightedWord && words[currentWordIndex]) {
            onHighlightedWord(words[currentWordIndex].word, currentWordIndex);
          }
        }
      } else {
        // No word found - clear highlighting
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
    // Reduced interval for better synchronization (25ms = 40 updates per second)
    intervalRef.current = setInterval(updateTime, 25);

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
    // Use same logic as updateTime for consistency
    let currentWordIndex = -1;
    
    if (words.length > 0) {
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const nextWord = i < words.length - 1 ? words[i + 1] : null;
        
        if (newTime >= word.startTime) {
          if (nextWord) {
            if (newTime < nextWord.startTime) {
              currentWordIndex = i;
              break;
            }
          } else {
            if (newTime <= word.endTime) {
              currentWordIndex = i;
              break;
            }
          }
        }
      }
      
      // Fallback: find the closest word that has started
      if (currentWordIndex === -1) {
        for (let i = words.length - 1; i >= 0; i--) {
          if (newTime >= words[i].startTime) {
            currentWordIndex = i;
            break;
          }
        }
      }
    }
    
    setHighlightedIndex(currentWordIndex !== -1 ? currentWordIndex : null);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Map timestamp words to display words for highlighting
  // Use the pre-built word mapping that handles punctuation differences
  const getWordIndexForHighlight = useCallback((displayWordIndex: number): number | null => {
    if (words.length === 0 || displayWords.length === 0) return null;
    
    // Use the pre-built mapping that accounts for punctuation differences
    const timestampIndex = wordMapping.get(displayWordIndex);
    
    if (timestampIndex !== undefined && timestampIndex !== null) {
      return timestampIndex;
    }
    
    // Fallback: if mapping doesn't exist, try direct index
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
