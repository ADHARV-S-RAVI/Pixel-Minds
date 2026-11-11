import React from 'react';

/**
 * Strips dangerous HTML, scripts, and event handlers to prevent XSS / message injection.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<\/?(?:applet|meta|link|base|body|html|form|input)\b[^>]*>/gi, '')
    .replace(/javascript:[^\s"']*/gi, '')
    .replace(/data:text\/html[^\s"']*/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
}

/**
 * Validates whether message content contains any injection vectors.
 */
export function validateMessageSafety(text: string): { safe: boolean; error?: string } {
  if (!text) return { safe: true };
  const injectionPatterns = [
    /<script\b/i,
    /javascript:/i,
    /data:text\/html/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /on\w+\s*=/i,
    /vbscript:/i,
    /<svg\b[^>]*onload/i,
    /<img\b[^>]*onerror/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      return { safe: false, error: 'Unsafe script or message injection detected. Please remove HTML/scripts.' };
    }
  }
  return { safe: true };
}

/**
 * Parses a string and wraps hashtags (#example) and mentions (@username) in clickable/styled badges.
 */
export function renderWithHashtags(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? '';

  // Sanitize to prevent HTML injection while preserving hashtags and mentions
  const safeText = sanitizeInput(text);

  // Regex matches hashtags (#tag) and mentions (@username)
  const tokenRegex = /(#[a-zA-Z0-9_\-]+|@[a-zA-Z0-9_.\-]+)/g;
  const parts = safeText.split(tokenRegex);

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
    if (part.startsWith('@') && part.length > 1) {
      const mentionName = part.slice(1);
      return (
        <a
          key={i}
          href={`/profile?name=${encodeURIComponent(mentionName)}`}
          className="font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1 py-0.5 rounded hover:bg-sky-100 dark:hover:bg-sky-900/60 transition cursor-pointer inline-block"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
