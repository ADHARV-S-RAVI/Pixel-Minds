import React from 'react';

/**
 * Parses a string and wraps hashtags (#example) in bold blue font styling.
 */
export function renderWithHashtags(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? '';

  // Regex matches hashtags preceded by start of line or whitespace
  const hashtagRegex = /(#[a-zA-Z0-9_\-]+)/g;
  const parts = text.split(hashtagRegex);

  return parts.map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      return (
        <span
          key={i}
          className="font-bold text-blue-600 dark:text-sky-400 select-text hover:underline cursor-pointer"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

