import React from 'react';

/**
 * Highlights search terms in text content
 * @param text - The text to highlight
 * @param searchQuery - The search query to highlight
 * @returns React elements with highlighted text
 */
export function highlightText(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery || !text) {
    return text;
  }

  // Escape special regex characters in search query
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  // Split text by matches
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    // Check if this part matches the search query (case-insensitive)
    if (part.toLowerCase() === searchQuery.toLowerCase()) {
      return (
        <mark
          key={index}
          className="bg-yellow-400/60 text-yellow-900 dark:text-yellow-100 px-1 rounded font-semibold"
          style={{
            backgroundColor: 'rgba(250, 204, 21, 0.4)',
            color: '#fef08a',
            padding: '2px 4px',
            borderRadius: '3px',
            fontWeight: '600',
          }}
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Highlights search terms in an array of text items
 * @param items - Array of text items
 * @param searchQuery - The search query to highlight
 * @returns Array of React elements with highlighted text
 */
export function highlightTextArray(items: string[], searchQuery: string): React.ReactNode[] {
  return items.map((item, index) => (
    <React.Fragment key={index}>
      {highlightText(item, searchQuery)}
    </React.Fragment>
  ));
}

/**
 * Highlights search terms in text content and returns HTML string
 * @param text - The text to highlight (can be HTML)
 * @param searchQuery - The search query to highlight
 * @returns HTML string with highlighted text
 */
export function highlightTextHTML(text: string, searchQuery: string): string {
  if (!searchQuery || !text) {
    return text;
  }

  // Escape special regex characters in search query
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Check if text contains HTML tags
  const hasHTML = /<[^>]+>/.test(text);
  
  // Simple approach that works in both SSR and client-side
  // Replace matches that are not inside HTML tags
  const highlightMark = '<mark style="background-color: rgba(250, 204, 21, 0.4); color: #fef08a; padding: 2px 4px; border-radius: 3px; font-weight: 600;">$1</mark>';
  
  if (hasHTML) {
    // For HTML content, use a regex that avoids matching inside tags
    // This regex matches the search query only if it's not inside HTML tags
    const regex = new RegExp(`(${escapedQuery})(?![^<]*>)`, 'gi');
    
    // Check if we have matches in text content (not in tags)
    // Simple check: strip HTML tags and see if query exists
    const textOnly = text.replace(/<[^>]+>/g, '');
    if (new RegExp(escapedQuery, 'gi').test(textOnly)) {
      // Replace matches that are outside of HTML tags
      return text.replace(regex, highlightMark);
    }
  } else {
    // Plain text: simple replacement
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, highlightMark);
  }
  
  return text;
}

