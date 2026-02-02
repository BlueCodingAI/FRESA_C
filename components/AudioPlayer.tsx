'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cleanTextForAudio, splitIntoWords, contentMatches } from '@/lib/text-cleaning';

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
  hideText?: boolean;
  onHighlightedWord?: (word: string, wordIndex: number) => void;
}

// Helpers: ignore formatting and special chars — treat as normal words
const PUNCT_REGEX = /^[.,!?;:'"()\[\]{}…—–\-:;\s]+$/;
function isPunctuationOnly(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && PUNCT_REGEX.test(t) && !/[a-zA-Z0-9]/.test(t);
}
function hasTrailingPunctuation(word: string): boolean {
  return /[.,!?;:'"()\[\]{}…—–\-:;]$/.test(word.trim());
}

/** Build display words from timestamp words: merge punctuation-only into previous. Single source of truth = audio. */
function buildDisplayWordsFromTimestampWords(words: WordTimestamp[]): string[] {
  const result: string[] = [];
  for (const w of words) {
    const text = (w.word || '').trim();
    if (!text) continue;
    if (isPunctuationOnly(text)) {
      if (result.length > 0) result[result.length - 1] += text;
      else result.push(text);
    } else {
      result.push(text);
    }
  }
  return result;
}

/** Normalize for matching: letters, digits, apostrophe only, lowercased. */
function wordContent(s: string): string {
  return s.replace(/[^a-zA-Z0-9']/g, '').toLowerCase().trim();
}

/** Format range from HTML (matches admin Rich Text Editor: bold, italic, underline, color). */
type FormatRange = { start: number; end: number; bold?: boolean; italic?: boolean; underline?: boolean; color?: string };

/** Only <br> and <p> add line breaks; avoid extra breaks from nested <div> etc. */
const PARAGRAPH_TAG = 'p';

/** Extract plain text and format ranges from HTML, preserving structure to match admin edit form (no extra <br>). */
function getFormatRangesFromHtml(html: string): { plainText: string; ranges: FormatRange[] } {
  const doc = typeof document === 'undefined' ? null : document.createElement('div');
  if (!doc) return { plainText: '', ranges: [] };
  doc.innerHTML = html;
  let plainText = '';
  const ranges: FormatRange[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '');
      const start = plainText.length;
      plainText += text;
      const end = plainText.length;
      if (start < end) {
        let el: Node | null = node.parentElement;
        let bold = false;
        let italic = false;
        let underline = false;
        let color: string | undefined;
        while (el && el.nodeType === Node.ELEMENT_NODE) {
          const tag = (el as Element).tagName?.toLowerCase();
          if (tag === 'b' || tag === 'strong') bold = true;
          if (tag === 'i' || tag === 'em') italic = true;
          if (tag === 'u') underline = true;
          if (!color) {
            const style = (el as Element).getAttribute('style') || (el as HTMLElement).style?.cssText || '';
            if (style) {
              const m = style.match(/color\s*:\s*([^;!]+)/i);
              if (m) color = m[1].trim();
            }
          }
          if (!color && (el as Element).getAttribute('data-color')) color = (el as Element).getAttribute('data-color') || undefined;
          if (!color && (el as Element).getAttribute('color')) color = (el as Element).getAttribute('color') || undefined;
          if (color && !color.startsWith('#') && !color.startsWith('rgb') && /^[a-fA-F0-9]{6}$/.test(color)) color = '#' + color;
          el = el.parentElement;
        }
        if (bold || italic || underline || color)
          ranges.push({ start, end, ...(bold && { bold: true }), ...(italic && { italic: true }), ...(underline && { underline: true }), ...(color && { color }) });
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName?.toLowerCase();
      if (tag === 'br') {
        plainText += '\n';
        return;
      }
      // Only <p> adds a paragraph break; skip newline for <div>, headings, etc. to avoid extra <br> on frontend
      if (tag === PARAGRAPH_TAG && plainText.length > 0) {
        plainText += '\n';
      }
      node.childNodes.forEach(walk);
    }
  };
  doc.childNodes.forEach(walk);
  return { plainText, ranges };
}

/** Find word boundaries in fullText for each display word. Returns [{ start, end }, ...] so we can wrap exact substrings. */
function getWordBoundariesInText(fullText: string, displayWords: string[]): { start: number; end: number }[] {
  const boundaries: { start: number; end: number }[] = [];
  let pos = 0;
  const text = fullText;
  for (const word of displayWords) {
    const content = wordContent(word);
    const rest = text.slice(pos);
    if (content.length === 0) {
      let i = 0;
      while (i < rest.length && /\s/.test(rest[i])) i++;
      if (i < rest.length && /[.,!?;:'"()\[\]{}…—–\-:;]/.test(rest[i])) {
        boundaries.push({ start: pos + i, end: pos + i + 1 });
        pos += i + 1;
      } else {
        boundaries.push({ start: pos, end: pos });
      }
      continue;
    }
    let wordStartInRest = -1;
    let wordEndInRest = -1;
    let i = 0;
    while (i < rest.length) {
      while (i < rest.length && /\s/.test(rest[i])) i++;
      if (i >= rest.length) break;
      const start = i;
      while (i < rest.length && /[a-zA-Z0-9']/.test(rest[i])) i++;
      const end = i;
      while (i < rest.length && /[.,!?;:'"()\[\]{}…—–\-:;]/.test(rest[i])) i++;
      const run = rest.slice(start, i);
      if (wordContent(run) === content) {
        wordStartInRest = start;
        wordEndInRest = i;
        break;
      }
      // No match: advance past this run so we make progress and avoid infinite loop
      i = end > start ? end : start + 1;
    }
    if (wordStartInRest < 0) {
      boundaries.push({ start: pos, end: pos });
      continue;
    }
    boundaries.push({ start: pos + wordStartInRest, end: pos + wordEndInRest });
    pos += wordEndInRest;
  }
  return boundaries;
}

/** Find which format applies to a span [start, end) from format ranges (from HTML). */
function getFormatForRange(start: number, end: number, ranges: FormatRange[]): Omit<FormatRange, 'start' | 'end'> {
  for (const r of ranges) {
    if (r.start < end && r.end > start) {
      return {
        ...(r.bold && { bold: true }),
        ...(r.italic && { italic: true }),
        ...(r.underline && { underline: true }),
        ...(r.color && { color: r.color }),
      };
    }
  }
  return {};
}

/** Append text to fragment, rendering newlines as <br> so structure matches admin edit form. */
function appendTextWithBreaks(fragment: DocumentFragment, str: string) {
  const parts = str.split(/\n/);
  parts.forEach((part, i) => {
    fragment.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) fragment.appendChild(document.createElement('br'));
  });
}

/**
 * Renders section text with one span per word and highlight synced to audio.
 * Preserves structure (paragraphs, line breaks) and formats to match admin edit form.
 */
function TimestampTextWithHighlighting({
  displayText,
  displayWords,
  highlightedDisplayIndex,
  html,
}: {
  displayText: string;
  displayWords: string[];
  highlightedDisplayIndex: number | null;
  html?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);

  const boundaries = useMemo(
    () => getWordBoundariesInText(displayText, displayWords),
    [displayText, displayWords]
  );

  const formatRanges = useMemo((): FormatRange[] => {
    if (!html || typeof document === 'undefined') return [];
    const { plainText, ranges } = getFormatRangesFromHtml(html);
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    if (norm(plainText) !== norm(displayText)) return [];
    return ranges;
  }, [html, displayText]);

  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined') return;
    const container = containerRef.current;
    const fragment = document.createDocumentFragment();
    let prevEnd = 0;
    wordsRef.current = new Array(displayWords.length).fill(null);
    boundaries.forEach((b, i) => {
      if (prevEnd < b.start) {
        appendTextWithBreaks(fragment, displayText.slice(prevEnd, b.start));
      }
      const span = document.createElement('span');
      span.className = 'inline audio-word';
      span.setAttribute('data-word-index', String(i));
      span.textContent = displayText.slice(b.start, b.end);
      const fmt = getFormatForRange(b.start, b.end, formatRanges);
      if (fmt.bold) span.style.fontWeight = '700';
      if (fmt.italic) span.style.fontStyle = 'italic';
      if (fmt.underline) span.style.textDecoration = 'underline';
      if (fmt.color) {
        span.style.color = fmt.color;
        span.setAttribute('data-base-color', fmt.color);
      }
      wordsRef.current[i] = span;
      fragment.appendChild(span);
      prevEnd = b.end;
    });
    if (prevEnd < displayText.length) {
      appendTextWithBreaks(fragment, displayText.slice(prevEnd));
    }
    container.innerHTML = '';
    container.appendChild(fragment);
  }, [displayText, displayWords, boundaries, formatRanges]);

  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined') return;
    wordsRef.current.forEach((span) => {
      if (span) {
        span.style.background = '';
        span.style.backgroundSize = '';
        span.style.backgroundPosition = '';
        span.style.backgroundRepeat = '';
        span.style.borderRadius = '';
        span.style.textShadow = '';
        span.style.transition = '';
        const baseColor = span.getAttribute('data-base-color');
        span.style.color = baseColor || '';
      }
    });
    if (highlightedDisplayIndex !== null) {
      const span = wordsRef.current[highlightedDisplayIndex];
      if (span) {
        span.style.background = 'linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%)';
        span.style.backgroundSize = '100% 85%';
        span.style.backgroundPosition = 'center';
        span.style.backgroundRepeat = 'no-repeat';
        span.style.color = '#fef08a';
        span.style.borderRadius = '3px';
        span.style.textShadow = '0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5)';
        span.style.transition = 'background 0.08s ease-out, color 0.08s ease-out, text-shadow 0.08s ease-out';
      }
    }
  }, [highlightedDisplayIndex]);

  return (
    <div
      ref={containerRef}
      className="space-y-4 break-words overflow-wrap-anywhere prose prose-invert max-w-none"
      style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
    />
  );
}

/**
 * HTML content with word highlighting.
 * Uses displayWords from parent (from timestamp when loaded) so highlighting matches audio exactly.
 * Match by content only (ignore bold, italic, color, comma, dot, etc.).
 */
function HTMLContentWithHighlighting({
  html,
  highlightedDisplayIndex,
  displayWords,
}: {
  html: string;
  words: WordTimestamp[];
  highlightedDisplayIndex: number | null;
  plainText: string;
  displayWords: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined' || displayWords.length === 0) return;

    const container = containerRef.current;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);
    let n: Node | null;
    while ((n = walker.nextNode())) textNodes.push(n as Text);

    wordsRef.current = new Array(displayWords.length).fill(null);
    let displayIndex = 0;

    textNodes.forEach((textNode) => {
      const nodeText = textNode.textContent || '';
      if (displayIndex >= displayWords.length) return;

      const segments = nodeText.split(/(\s+)/);
      const fragment = document.createDocumentFragment();

      segments.forEach((segment) => {
        const trimmed = segment.trim();
        const isSpace = segment !== trimmed ? false : /^\s+$/.test(segment);

        if (isSpace || trimmed.length === 0) {
          fragment.appendChild(document.createTextNode(segment));
          return;
        }

        if (isPunctuationOnly(trimmed)) {
          // Punctuation belongs to current display word; if no span yet (e.g. comma after "Word"), attach to previous
          const span = wordsRef.current[displayIndex];
          if (span) {
            span.textContent = (span.textContent || '') + segment;
            displayIndex++;
          } else if (displayIndex > 0) {
            const prev = wordsRef.current[displayIndex - 1];
            if (prev) prev.textContent = (prev.textContent || '') + segment;
            displayIndex++;
          } else {
            const s = document.createElement('span');
            s.className = 'inline audio-word';
            s.setAttribute('data-word-index', String(displayIndex));
            s.textContent = segment;
            wordsRef.current[displayIndex] = s;
            fragment.appendChild(s);
            displayIndex++;
          }
          return;
        }

        // Word segment — match by content to current display word
        if (displayIndex >= displayWords.length) {
          fragment.appendChild(document.createTextNode(segment));
          return;
        }

        const expected = displayWords[displayIndex];
        if (contentMatches(trimmed, expected)) {
          let span = wordsRef.current[displayIndex];
          if (!span) {
            span = document.createElement('span');
            span.className = 'inline audio-word';
            span.setAttribute('data-word-index', String(displayIndex));
            span.textContent = segment;
            wordsRef.current[displayIndex] = span;
            fragment.appendChild(span);
          } else {
            span.textContent = (span.textContent || '') + segment;
          }
          if (!hasTrailingPunctuation(expected)) displayIndex++;
        } else {
          // Mismatch: advance if we have a current span (missing punct), then assign
          const cur = wordsRef.current[displayIndex];
          if (cur && hasTrailingPunctuation(expected)) {
            displayIndex++;
          }
          if (displayIndex < displayWords.length) {
            const span = document.createElement('span');
            span.className = 'inline audio-word';
            span.setAttribute('data-word-index', String(displayIndex));
            span.textContent = segment;
            wordsRef.current[displayIndex] = span;
            fragment.appendChild(span);
            displayIndex++;
          } else {
            fragment.appendChild(document.createTextNode(segment));
          }
        }
      });

      if (textNode.parentNode && fragment.childNodes.length > 0) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });

    container.innerHTML = '';
    container.appendChild(tempDiv);
  }, [html, displayWords]);

  useEffect(() => {
    if (!containerRef.current || typeof document === 'undefined') return;
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
    if (highlightedDisplayIndex !== null) {
      const span = wordsRef.current[highlightedDisplayIndex];
      if (span) {
        span.style.background = 'linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%)';
        span.style.backgroundSize = '100% 85%';
        span.style.backgroundPosition = 'center';
        span.style.backgroundRepeat = 'no-repeat';
        span.style.color = '#fef08a';
        span.style.borderRadius = '3px';
        span.style.textShadow = '0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5)';
        span.style.transition = 'background 0.08s ease-out, color 0.08s ease-out, text-shadow 0.08s ease-out';
      }
    }
  }, [highlightedDisplayIndex]);

  return (
    <div
      ref={containerRef}
      className="space-y-4 break-words overflow-wrap-anywhere prose prose-invert max-w-none"
      style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
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
  const lastTimeUpdateRef = useRef(0);
  const highlightedIndexRef = useRef<number | null>(null);
  // Defer audio element so React Strict Mode double-mount doesn't trigger two requests
  const [audioMounted, setAudioMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAudioMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isHTML = useMemo(() => /<[^>]+>/.test(text), [text]);
  const plainText = useMemo(() => cleanTextForAudio(text), [text]);
  // Structured plain text preserves paragraphs/line breaks so frontend matches admin edit form
  const structuredDisplayText = useMemo(() => {
    if (typeof document === 'undefined' || !isHTML || !text) return plainText;
    return getFormatRangesFromHtml(text).plainText;
  }, [text, isHTML, plainText]);
  const [timestampText, setTimestampText] = useState<string | null>(null);

  // Display words = same order as audio. Prefer timestamp words (merge punctuation) so 1:1 with playback.
  const displayWords = useMemo(() => {
    if (words.length > 0) return buildDisplayWordsFromTimestampWords(words);
    return splitIntoWords(timestampText || plainText);
  }, [words, plainText, timestampText]);

  // Timestamp index -> display index. Punctuation-only timestamp highlights previous word.
  const timestampToDisplay = useMemo(() => {
    const map = new Map<number, number>();
    if (words.length === 0) return map;
    const punctOnly = /^[.,!?;:'"()\[\]{}…—–\-:;]+$/;
    let displayIdx = 0;
    for (let t = 0; t < words.length; t++) {
      const tw = (words[t].word || '').trim();
      if (tw.length > 0 && punctOnly.test(tw)) {
        if (displayIdx > 0) map.set(t, displayIdx - 1);
      } else {
        map.set(t, displayIdx);
        displayIdx++;
      }
    }
    return map;
  }, [words]);

  const highlightedDisplayIndex =
    highlightedIndex !== null
      ? (timestampToDisplay.get(highlightedIndex) ?? (highlightedIndex < displayWords.length ? highlightedIndex : null))
      : null;

  useEffect(() => {
    if (!timestampsUrl) {
      setWords([]);
      setTimestampText(null);
      return;
    }
    // Wait for mount to stabilize (avoids duplicate request from React Strict Mode double-mount)
    if (!audioMounted) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch(timestampsUrl, { signal: controller.signal });
        if (!res.ok) {
          setWords([]);
          setTimestampText(null);
          return;
        }
        const data: TimestampsData = await res.json();
        if (controller.signal.aborted) return;
        if (data.text) setTimestampText(data.text.trim());
        const list: WordTimestamp[] = [];
        if (data.segments?.length) {
          for (const seg of data.segments) {
            if (seg.words?.length) {
              for (const w of seg.words) {
                list.push({ word: w.text || '', startTime: w.start ?? 0, endTime: w.end ?? 0 });
              }
            }
          }
        }
        setWords(list);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setWords([]);
        setTimestampText(null);
      }
    };
    load();
    return () => controller.abort();
  }, [timestampsUrl, audioMounted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    highlightedIndexRef.current = null;

    const updateTime = () => {
      const t = audio.currentTime;
      const now = Date.now();
      // Throttle progress bar updates to avoid freezing (was 40/sec at 25ms interval)
      if (now - lastTimeUpdateRef.current >= 100) {
        lastTimeUpdateRef.current = now;
        setCurrentTime(t);
      }
      onTimeUpdate?.(t, audio.duration || 0);

      let idx = -1;
      if (words.length > 0) {
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const next = words[i + 1];
          if (t >= w.startTime) {
            if (next ? t < next.startTime : t <= w.endTime) {
              idx = i;
              break;
            }
          }
        }
        if (idx === -1) {
          for (let i = words.length - 1; i >= 0; i--) {
            if (t >= words[i].startTime) {
              idx = i;
              break;
            }
          }
        }
      }

      const prevIdx = highlightedIndexRef.current;
      if (idx !== -1 && idx !== prevIdx) {
        highlightedIndexRef.current = idx;
        setHighlightedIndex(idx);
        const w = words[idx];
        if (w && onHighlightedWord) onHighlightedWord(w.word, idx);
      } else if (idx === -1 && prevIdx !== null) {
        highlightedIndexRef.current = null;
        setHighlightedIndex(null);
      }
    };

    const onTimeUpdateEv = () => updateTime();
    const onPlay = () => {
      setIsPlaying(true);
      onPlayingChange?.(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      onPlayingChange?.(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setHasCompleted(true);
      setCurrentTime(audio.duration || 0);
      highlightedIndexRef.current = null;
      setHighlightedIndex(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onComplete?.();
      onPlayingChange?.(false);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (audio.duration && onTimeUpdate) onTimeUpdate(0, audio.duration);
    };

    audio.addEventListener('timeupdate', onTimeUpdateEv);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    intervalRef.current = setInterval(updateTime, 100);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdateEv);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [words, audioUrl, audioMounted, onTimeUpdate, onComplete, onPlayingChange, onHighlightedWord]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('audioPlaybackRate') : null;
    const rate = saved ? parseFloat(saved) : 1;
    audio.playbackRate = !isNaN(rate) && rate > 0 ? rate : 1;
    setPlaybackRate(audio.playbackRate);
  }, [audioUrl, audioMounted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= 2) audio.playbackRate = playbackRate;
  }, [playbackRate, audioMounted]);

  useEffect(() => {
    if (!showSpeedMenu) return;
    const onDown = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) setShowSpeedMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showSpeedMenu]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || !autoPlay || hasPlayed || hasCompleted) return;
    const play = () => {
      if (!hasPlayed) audio.currentTime = 0;
      audio.play().then(() => {
        setIsPlaying(true);
        setHasPlayed(true);
        onPlayingChange?.(true);
      }).catch(() => {
        setIsPlaying(false);
        setHasPlayed(false);
      });
    };
    if (audio.readyState >= 2) setTimeout(play, 100);
    else {
      const once = () => play();
      audio.addEventListener('canplay', once, { once: true });
      return () => audio.removeEventListener('canplay', once);
    }
  }, [audioUrl, audioMounted, autoPlay, hasPlayed, hasCompleted, onPlayingChange]);

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (typeof window !== 'undefined') localStorage.setItem('audioPlaybackRate', String(speed));
    setShowSpeedMenu(false);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        onPlayingChange?.(true);
      }).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
    let idx = -1;
    if (words.length > 0) {
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const next = words[i + 1];
        if (t >= w.startTime) {
          if (next ? t < next.startTime : t <= w.endTime) {
            idx = i;
            break;
          }
        }
      }
      if (idx === -1) {
        for (let i = words.length - 1; i >= 0; i--) {
          if (t >= words[i].startTime) {
            idx = i;
            break;
          }
        }
      }
    }
    setHighlightedIndex(idx !== -1 ? idx : null);
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const textBlocks = useMemo(() => {
    const textToParse = plainText;
    const numbered = /(?<=\s|^)\d+\.\s(?=[A-Z]|$)/;
    if (!numbered.test(textToParse)) {
      return [{ text: textToParse.trim(), html: isHTML ? text.trim() : undefined, isNumberedItem: false, wordStartIndex: 0 }];
    }
    const parts = textToParse.split(/(?=\s\d+\.\s(?=[A-Z])|^\d+\.\s(?=[A-Z]))/);
    const blocks: Array<{ text: string; html?: string; isNumberedItem: boolean; wordStartIndex: number }> = [];
    let wordIndex = 0;
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const isNum = /^\d+\.\s/.test(trimmed);
      blocks.push({
        text: trimmed,
        html: isHTML ? text.substring(0, 200) : undefined,
        isNumberedItem: isNum,
        wordStartIndex: wordIndex,
      });
      wordIndex += splitIntoWords(trimmed).length;
    }
    return blocks;
  }, [plainText, text, isHTML]);

  return (
    <div className="w-full">
      {audioUrl ? (
        audioMounted ? (
          <audio ref={audioRef} src={audioUrl} preload="metadata" loop={false} onError={(e) => console.error('Audio error', e)} />
        ) : null
      ) : (
        <div className="text-yellow-400 text-sm mb-2">⚠️ No audio URL provided</div>
      )}

      {!hideText && (
        <div className="text-white text-base md:text-lg leading-relaxed mb-6">
          {isHTML && words.length > 0 && timestampText ? (
            <TimestampTextWithHighlighting
              displayText={structuredDisplayText}
              displayWords={displayWords}
              highlightedDisplayIndex={highlightedDisplayIndex}
              html={text}
            />
          ) : isHTML ? (
            <HTMLContentWithHighlighting
              html={text}
              words={words}
              highlightedDisplayIndex={highlightedDisplayIndex}
              plainText={timestampText || plainText}
              displayWords={displayWords}
            />
          ) : (
            <div className="space-y-4 break-words overflow-wrap-anywhere" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
              {textBlocks.map((block, blockIndex) => {
                const segments = block.text.split(/(\s+)/);
                let blockWordIndex = block.wordStartIndex;
                return (
                  <div
                    key={blockIndex}
                    className={block.isNumberedItem ? 'mt-3 mb-2 pl-4' : blockIndex === 0 ? '' : 'mt-2'}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}
                  >
                    {segments.map((segment, segIdx) => {
                      const isWord = segment.trim().length > 0 && !/^\s+$/.test(segment);
                      const wordIdx = isWord ? blockWordIndex : null;
                      if (isWord) blockWordIndex++;
                      const isHighlighted = wordIdx !== null && wordIdx === highlightedDisplayIndex;
                      const trimmed = segment.trim();
                      const isNum = /^\d+\./.test(trimmed);
                      return (
                        <span
                          key={`${blockIndex}-${segIdx}`}
                          ref={(el) => {
                            if (el && isWord && wordIdx !== null) wordsRef.current[wordIdx] = el;
                          }}
                          className="inline"
                          style={{
                            padding: 0,
                            margin: 0,
                            display: 'inline',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            lineHeight: 'inherit',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                            fontWeight: '600',
                            ...(isHighlighted
                              ? {
                                  background: 'linear-gradient(120deg, rgba(59, 130, 246, 0.35) 0%, rgba(59, 130, 246, 0.55) 100%)',
                                  backgroundSize: '100% 85%',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                                  color: '#fef08a',
                                  borderRadius: '3px',
                                  textShadow: '0 0 10px rgba(251, 191, 36, 0.7), 0 0 15px rgba(59, 130, 246, 0.5)',
                                  transition: 'background 0.08s ease-out, color 0.08s ease-out, text-shadow 0.08s ease-out',
                                }
                              : highlightQuery && segment.toLowerCase().includes(highlightQuery.toLowerCase())
                                ? { backgroundColor: 'rgba(250, 204, 21, 0.4)', color: '#fef08a', borderRadius: '3px', fontWeight: '600' }
                                : { color: isNum ? '#93c5fd' : 'inherit', background: 'transparent' }),
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

      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
          aria-label={isPlaying ? 'Pause' : 'Play'}
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
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        <div className="text-sm text-gray-300 min-w-[80px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
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
                  className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${playbackRate === speed ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-blue-500/30 hover:text-white'}`}
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
