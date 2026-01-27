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
 * Split text into words using the exact same logic as audio generation
 * This ensures perfect alignment between display words and timestamp words
 */
export function splitIntoWords(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return []
  }
  // Split by whitespace and filter out empty strings
  // This matches exactly how words are processed for audio generation
  return text.split(/\s+/).filter(word => word.length > 0)
}

/**
 * Normalize word for matching (removes punctuation, lowercases)
 * Used for matching words between timestamp data and display text
 */
export function normalizeWordForMatching(word: string): string {
  return word.replace(/[.,!?;:'"()\[\]{}]/g, '').toLowerCase().trim()
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
