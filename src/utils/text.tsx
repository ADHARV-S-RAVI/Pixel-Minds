import React from 'react';

/**
 * Strips dangerous HTML, scripts, and event handlers to prevent XSS / message injection.
 * Preserves clean text for React's native escaped rendering without causing double-escaping.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<\/?embed\b[^>]*>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<\/?(?:applet|meta|link|base|body|html|form|input|button|textarea|select)\b[^>]*>/gi, '')
    .replace(/javascript:[^\s"']*/gi, '')
    .replace(/vbscript:[^\s"']*/gi, '')
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
    /vbscript:/i,
    /data:text\/html/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<svg\b/i,
    /on\w+\s*=/i,
    /<img\b[^>]*onerror/i,
    /<svg\b[^>]*onload/i,
    /<a\b[^>]*href\s*=\s*['"]?javascript:/i
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      return { safe: false, error: 'Unsafe script or HTML injection detected. Please remove HTML/scripts.' };
    }
  }
  return { safe: true };
}

/**
 * Validates and normalizes user-provided URLs.
 * Strictly permits only HTTP and HTTPS protocols.
 * Returns null if the URL is invalid, malicious, or uses dangerous schemes (javascript:, data:, file:, etc.).
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  // Reject immediate javascript / data / vbscript strings
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return null;
  }

  // Ensure url starts with http:// or https://
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    // If not a full URL, reject since relative or schemeless URLs in external links can be abused
    return null;
  }
}

/**
 * Validates URL safety for input forms before submission
 */
export function validateUrlSafety(url: string): { safe: boolean; error?: string } {
  if (!url || !url.trim()) return { safe: true };
  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    return { safe: false, error: 'URL exceeds maximum length of 2048 characters.' };
  }
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { safe: false, error: 'Unsafe URL protocol detected. Only HTTP and HTTPS are permitted.' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: 'Invalid URL protocol. Please use http:// or https://' };
    }
    return { safe: true };
  } catch {
    return { safe: false, error: 'Invalid URL format. Please enter a valid URL starting with https://' };
  }
}

/**
 * Validates and sanitizes a URL path intended for internal navigation/redirects.
 * Strictly prevents Open Redirect vulnerabilities by:
 * - Rejecting external URLs (http://, https://, ftp://, javascript:)
 * - Rejecting protocol-relative URLs (//evil.com, /\evil.com, \\evil.com)
 * - Rejecting backslashes (\) which some browsers interpret as path separators or domain transitions
 * - Rejecting control characters, newlines, and null bytes
 * - Requiring the path to start with a single forward slash followed by non-slash characters
 */
export function safeRedirectUrl(target: string | null | undefined, fallback = '/'): string {
  if (!target || typeof target !== 'string') return fallback;
  const trimmed = target.trim();
  if (!trimmed || trimmed.length > 1024) return fallback;

  // Reject control characters or newlines
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return fallback;

  // Reject any backslashes
  if (trimmed.includes('\\')) return fallback;

  // Must start with exactly one forward slash followed by a non-slash character (or be exactly '/')
  if (trimmed === '/') return '/';
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;

  // Check URL parsing with dummy base to ensure it remains on the local origin
  try {
    const dummyBase = 'http://localhost';
    const parsed = new URL(trimmed, dummyBase);
    if (parsed.origin !== dummyBase) return fallback;
    if (parsed.protocol !== 'http:' || parsed.hostname !== 'localhost') return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

/**
 * Parses a string and wraps hashtags (#example) and mentions (@username) in clickable/styled badges.
 * Avoids matching inside regular email addresses.
 * Uses React JSX for context-appropriate output protection.
 */
export function renderWithHashtags(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? '';

  // Sanitize to prevent HTML injection while preserving hashtags and mentions
  const safeText = sanitizeInput(text);

  // Regex matches:
  // 1. Email addresses (so they are preserved intact and not parsed as mentions)
  // 2. Hashtags (#tag)
  // 3. Mentions (@username) with strict username format: 3-20 letters/numbers/underscore
  const tokenRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|#[a-zA-Z0-9_-]{2,30}|@[a-zA-Z0-9_]{3,20}\b)/g;
  const parts = safeText.split(tokenRegex);

  return parts.map((part, i) => {
    // If it's an ordinary email address, render as plain text
    if (part.includes('@') && part.includes('.') && !part.startsWith('@')) {
      return part;
    }

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

    if (part.startsWith('@') && /^[a-zA-Z0-9_]{3,20}$/.test(part.slice(1))) {
      const mentionName = part.slice(1).toLowerCase();
      return (
        <a
          key={i}
          href={`/profile?u=${encodeURIComponent(mentionName)}`}
          className="font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded-md hover:bg-sky-100 dark:hover:bg-sky-900/60 transition cursor-pointer inline-flex items-center gap-0.5 text-xs sm:text-sm"
          title={`View @${mentionName}'s profile`}
        >
          @{mentionName}
        </a>
      );
    }
    return part;
  });
}
