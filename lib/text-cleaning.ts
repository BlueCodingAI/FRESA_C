/**
 * Shared utility for cleaning text before audio generation
 * This ensures consistent text cleaning across API routes and client components
 * 
 * Strips all HTML tags, markdown, formatting codes, and extracts plain text
 * This ensures audio generation only processes actual text content, not formatting metadata
 */

export function cleanTextForAudio(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  let cleaned = text

  // Remove HTML tags (including style attributes and all HTML markup)
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  cleaned = cleaned.replace(/<[^>]+>/g, '')
  
  // Remove inline style attributes that might contain color codes
  // This handles cases like style="color: #34FF3f2" that might be in the text
  cleaned = cleaned.replace(/style\s*=\s*["'][^"']*["']/gi, '')
  
  // Remove markdown formatting syntax
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1') // Bold **text**
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1') // Italic *text*
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1') // Bold __text__
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1') // Italic _text_
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1') // Strikethrough ~~text~~
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1') // Inline code `text`
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '') // Code blocks
  cleaned = cleaned.replace(/#{1,6}\s+/g, '') // Headers # ## ### etc.
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links [text](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1') // Images ![alt](url)
  
  // Remove standalone hex color codes (like #34FF3f2) that might appear in text
  // This regex matches # followed by 3-8 hex characters, but only if it's not part of a word
  cleaned = cleaned.replace(/\b#[0-9A-Fa-f]{3,8}\b/g, '')
  
  // Remove RGB/RGBA color codes like rgb(255, 0, 0) or rgba(255, 0, 0, 0.5)
  cleaned = cleaned.replace(/\b(rgb|rgba|hsl|hsla)\([^)]+\)/gi, '')
  
  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ')
  cleaned = cleaned.replace(/&amp;/g, '&')
  cleaned = cleaned.replace(/&lt;/g, '<')
  cleaned = cleaned.replace(/&gt;/g, '>')
  cleaned = cleaned.replace(/&quot;/g, '"')
  cleaned = cleaned.replace(/&#39;/g, "'")
  cleaned = cleaned.replace(/&apos;/g, "'")
  cleaned = cleaned.replace(/&mdash;/g, '—')
  cleaned = cleaned.replace(/&ndash;/g, '–')
  cleaned = cleaned.replace(/&hellip;/g, '...')
  
  // Decode numeric HTML entities
  cleaned = cleaned.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
  cleaned = cleaned.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  // Remove any remaining markdown or formatting artifacts
  cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '') // List markers
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '') // Numbered list markers
  cleaned = cleaned.replace(/^\s*>/gm, '') // Blockquotes
  
  // Clean up whitespace: normalize multiple spaces/tabs/newlines to single space
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  // Trim and return
  return cleaned.trim()
}

/**
 * Strip HTML to plain text but preserve newlines (for splitting into segments).
 * Used so we can detect numbered list lines like "1. Land Acquisition" as separate lines.
 */
function stripHtmlPreserveNewlines(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let out = text
  out = out.replace(/<br\s*\/?>/gi, '\n')
  out = out.replace(/<\/p>/gi, '\n')
  out = out.replace(/<\/div>/gi, '\n')
  out = out.replace(/<[^>]+>/g, '')
  out = out.replace(/\*\*([^*]+)\*\*/g, '$1')
  out = out.replace(/\*([^*]+)\*/g, '$1')
  out = out.replace(/&nbsp;/g, ' ')
  out = out.replace(/&amp;/g, '&')
  out = out.replace(/&lt;/g, '<')
  out = out.replace(/&gt;/g, '>')
  out = out.replace(/&quot;/g, '"')
  out = out.replace(/&#39;/g, "'")
  out = out.replace(/[ \t]+/g, ' ') // collapse spaces/tabs but keep newlines
  return out
}

/** Match a standalone numbered list line: "1. Land Acquisition" or "2. Subdividing and Development" (no colon, short). */
const NUMBERED_LIST_LINE = /^\s*\d+\.\s+[A-Za-z][^:]*$/

/**
 * Split content into segments for TTS so numbered list items (e.g. "1. Land Acquisition")
 * are each spoken as a separate sentence instead of run-on.
 * Returns array of cleaned text segments; concatenate their audio in order.
 */
export function getAudioSegmentsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return []
  const withNewlines = stripHtmlPreserveNewlines(text)
  const lines = withNewlines.split(/\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 0)
  const segments: string[] = []
  let current: string[] = []

  for (const line of lines) {
    const isStandaloneList = NUMBERED_LIST_LINE.test(line) && line.length < 120
    if (isStandaloneList) {
      if (current.length > 0) {
        segments.push(cleanTextForAudio(current.join('\n')))
        current = []
      }
      segments.push(cleanTextForAudio(line))
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    segments.push(cleanTextForAudio(current.join('\n')))
  }
  return segments.filter((s) => s.length > 0)
}

/**
 * Check if a token is punctuation/symbol-only (no letters or digits).
 * Used to merge trailing punctuation into the previous word.
 */
const PUNCTUATION_ONLY_REGEX = /^[.,!?;:'"()\[\]{}…—–\-:;\s]+$/

function isPunctuationOnly(token: string): boolean {
  return token.length > 0 && PUNCTUATION_ONLY_REGEX.test(token) && !/[a-zA-Z0-9]/.test(token)
}

/**
 * Split text into words for highlighting: one entry per logical word.
 * Ignores formatting (bold, italic, color, etc.) and treats punctuation like normal text
 * by merging punctuation-only tokens with the previous word (e.g. "Word , next" -> ["Word,", "next"]).
 * This keeps display words in sync with timestamps regardless of spaces, commas, dots, (), {}, etc.
 */
export function splitIntoWords(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return []
  }
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  
  const raw = normalized.split(/\s+/).filter(t => t.length > 0)
  const result: string[] = []
  
  for (const token of raw) {
    if (isPunctuationOnly(token)) {
      // Merge with previous word so we never have standalone punctuation
      if (result.length > 0) {
        result[result.length - 1] += token
      } else {
        result.push(token)
      }
    } else {
      result.push(token)
    }
  }
  
  return result
}

/**
 * Normalize word for matching: strip punctuation/special chars, lowercase.
 * Used for matching words between timestamp data and display text.
 * Ignores formatting and special characters so "Word,", "(NAR)", "Word." all match by content.
 */
export function normalizeWordForMatching(word: string): string {
  return word.replace(/[.,!?;:'"()\[\]{}…—–\-:;]/g, '').toLowerCase().trim()
}

/**
 * Content-only match: true if two strings are the same when we ignore
 * punctuation, spaces, and special characters (only compare letters/numbers).
 * Use when matching HTML segments to display words regardless of formatting.
 */
export function contentMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[^a-zA-Z0-9']/g, '').toLowerCase().trim()
  const na = norm(a)
  const nb = norm(b)
  if (na.length === 0 && nb.length === 0) return true
  return na.length > 0 && na === nb
}

/**
 * Check if two words match (handles punctuation differences)
 */
export function wordsMatch(textWord: string, timestampWord: string): boolean {
  const textTrimmed = textWord.trim()
  const timestampTrimmed = timestampWord.trim()
  
  // Exact match (case-insensitive)
  if (textTrimmed.toLowerCase() === timestampTrimmed.toLowerCase()) {
    return true
  }
  
  // Normalize both words (remove punctuation, lowercase)
  const textNorm = normalizeWordForMatching(textTrimmed)
  const timestampNorm = normalizeWordForMatching(timestampTrimmed)
  
  // Exact match after normalization
  if (textNorm === timestampNorm && textNorm.length > 0) {
    return true
  }
  
  // Remove all non-alphanumeric characters and compare
  const textClean = textNorm.replace(/[^a-z0-9]/g, '')
  const timestampClean = timestampNorm.replace(/[^a-z0-9]/g, '')
  
  // Exact match after removing all non-alphanumeric
  if (textClean === timestampClean && textClean.length > 0) {
    return true
  }
  
  return false
}

/**
 * Build a mapping from display word indices to timestamp word indices
 * This ensures perfect alignment for highlighting
 */
export function buildWordMapping(
  displayWords: string[],
  timestampWords: string[]
): Map<number, number> {
  const mapping = new Map<number, number>()
  
  // If word counts match, use direct 1:1 mapping (most common and accurate case)
  if (displayWords.length === timestampWords.length) {
    for (let i = 0; i < displayWords.length; i++) {
      mapping.set(i, i)
    }
    return mapping
  }
  
  // If counts don't match, try to align words by content
  let displayIndex = 0
  let timestampIndex = 0
  
  while (displayIndex < displayWords.length && timestampIndex < timestampWords.length) {
    const displayWord = displayWords[displayIndex]
    const timestampWord = timestampWords[timestampIndex]
    
    // Try exact match first
    if (wordsMatch(displayWord, timestampWord)) {
      mapping.set(displayIndex, timestampIndex)
      displayIndex++
      timestampIndex++
    } else {
      // Try to find matching timestamp word ahead
      let found = false
      for (let j = timestampIndex + 1; j < Math.min(timestampIndex + 5, timestampWords.length); j++) {
        if (wordsMatch(displayWord, timestampWords[j])) {
          mapping.set(displayIndex, j)
          displayIndex++
          timestampIndex = j + 1
          found = true
          break
        }
      }
      
      if (!found) {
        // No match found, skip this display word or try to match next timestamp word
        // Prefer skipping display word to maintain alignment
        displayIndex++
      }
    }
  }
  
  return mapping
}
