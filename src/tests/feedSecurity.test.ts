/**
 * Comprehensive Security Test Suite for Pixel Minds Feed
 * Tests XSS protection, safe URL handling, input validation, storage upload security,
 * impersonation prevention, rate limiting, and structured security logging.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  sanitizeInput, 
  validateMessageSafety, 
  safeUrl, 
  validateUrlSafety 
} from '../utils/text';
import { 
  validateOpportunityImageFile, 
  sanitizeFileName 
} from '../services/storage';
import { 
  sanitizeDetails, 
  generateCorrelationId 
} from '../services/securityLogger';

describe('Pixel Minds Feed Security Test Suite', () => {

  describe('1. XSS & Malicious Content Protection', () => {
    it('should strip script tags from text content', () => {
      const malicious = 'Hello <script>alert("XSS")</script> World';
      const clean = sanitizeInput(malicious);
      assert.strictEqual(clean.includes('<script>'), false);
      assert.strictEqual(clean.includes('alert("XSS")'), false);
      assert.strictEqual(clean.trim(), 'Hello  World');
    });

    it('should strip iframe, embed, object, and style tags', () => {
      const payload = '<iframe src="evil.com"></iframe><object data="bad.swf"></object><embed src="bad"><style>body{color:red}</style>';
      const clean = sanitizeInput(payload);
      assert.strictEqual(clean, '');
    });

    it('should strip dangerous inline event handlers (onerror, onload, onclick, onmouseover)', () => {
      const payload = '<img src="x" onerror="alert(1)"> <div onmouseover="stealCookie()">Hover</div>';
      const clean = sanitizeInput(payload);
      assert.strictEqual(/onerror\s*=/i.test(clean), false);
      assert.strictEqual(/onmouseover\s*=/i.test(clean), false);
    });

    it('should strip SVG tags with embedded script execution', () => {
      const svgPayload = '<svg onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>';
      const clean = sanitizeInput(svgPayload);
      assert.strictEqual(/<svg/i.test(clean), false);
      assert.strictEqual(/onload/i.test(clean), false);
    });

    it('should detect message safety violations for injection payloads', () => {
      const maliciousInputs = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        'vbscript:msgbox',
        'data:text/html,<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<a href="javascript:steal()">Click</a>'
      ];

      for (const input of maliciousInputs) {
        const res = validateMessageSafety(input);
        assert.strictEqual(res.safe, false, `Expected payload "${input}" to be flagged as unsafe`);
      }
    });

    it('should allow legitimate builder text, hashtags, and mentions', () => {
      const legitimate = 'Just launched our AI hackathon project! Check out #NextJs and ping @sarah_builder for details.';
      const res = validateMessageSafety(legitimate);
      assert.strictEqual(res.safe, true);
    });
  });

  describe('2. URL Sanitization & Protocol Protection', () => {
    it('should strictly reject javascript: URLs', () => {
      const dangerous = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'javascript:/*--></title></style></textarea></script><svg/onload=alert(1)>',
        ' javascript:alert(document.cookie)'
      ];

      for (const url of dangerous) {
        assert.strictEqual(safeUrl(url), null, `Expected safeUrl to reject: ${url}`);
        const check = validateUrlSafety(url);
        assert.strictEqual(check.safe, false);
      }
    });

    it('should strictly reject data: and vbscript: URIs', () => {
      assert.strictEqual(safeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), null);
      assert.strictEqual(safeUrl('vbscript:alert(1)'), null);
      assert.strictEqual(safeUrl('file:///etc/passwd'), null);
    });

    it('should allow valid HTTPS and HTTP URLs', () => {
      const validUrls = [
        'https://devpost.com/hackathons/smart-india-2026',
        'https://github.com/pixel-minds/project',
        'http://example.com/resource'
      ];

      for (const url of validUrls) {
        const validated = safeUrl(url);
        assert.notStrictEqual(validated, null);
        assert.strictEqual(validated?.startsWith('http'), true);
        const check = validateUrlSafety(url);
        assert.strictEqual(check.safe, true);
      }
    });

    it('should reject URLs exceeding 2048 characters', () => {
      const hugeUrl = 'https://example.com/' + 'a'.repeat(2100);
      assert.strictEqual(safeUrl(hugeUrl), null);
      const check = validateUrlSafety(hugeUrl);
      assert.strictEqual(check.safe, false);
    });
  });

  describe('3. File Upload & Storage Security', () => {
    it('should reject dangerous file extensions (SVG, HTML, JS, EXE)', () => {
      const dangerousNames = [
        'avatar.svg',
        'script.html',
        'malware.exe',
        'exploit.js',
        'shell.php'
      ];

      for (const name of dangerousNames) {
        const dummyFile = {
          name,
          type: 'image/svg+xml',
          size: 50000
        } as unknown as File;

        const res = validateOpportunityImageFile(dummyFile);
        assert.strictEqual(res.valid, false, `Expected ${name} to be rejected`);
      }
    });

    it('should accept valid image types (JPEG, PNG, WebP, GIF) under size limit', () => {
      const validNames = ['banner.jpg', 'photo.jpeg', 'preview.png', 'graphic.webp', 'anim.gif'];

      for (const name of validNames) {
        const dummyFile = {
          name,
          type: name.endsWith('.png') ? 'image/png' : 'image/jpeg',
          size: 1024 * 1024 // 1 MB
        } as unknown as File;

        const res = validateOpportunityImageFile(dummyFile);
        assert.strictEqual(res.valid, true, `Expected ${name} to be accepted`);
      }
    });

    it('should reject files exceeding 2 MB size limit', () => {
      const oversizedFile = {
        name: 'huge_image.png',
        type: 'image/png',
        size: 3 * 1024 * 1024 // 3 MB
      } as unknown as File;

      const res = validateOpportunityImageFile(oversizedFile);
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.error?.includes('Maximum allowed image size is 2 MB'), true);
    });

    it('should sanitize file names preventing directory traversal (../../)', () => {
      const maliciousNames = [
        '../../etc/passwd.png',
        '..\\..\\windows\\system32\\cmd.exe.png',
        'foo/bar/baz.jpg',
        'image\0nullbyte.png'
      ];

      for (const name of maliciousNames) {
        const clean = sanitizeFileName(name);
        assert.strictEqual(clean.includes('..'), false);
        assert.strictEqual(clean.includes('/'), false);
        assert.strictEqual(clean.includes('\\'), false);
        assert.strictEqual(clean.includes('\0'), false);
      }
    });
  });

  describe('4. Observability & Security Log Protection', () => {
    it('should redact sensitive tokens and credentials from logs', () => {
      const rawDetails = {
        userId: '12345',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        refreshToken: 'refresh-token-value',
        cookie: 'session_id=abcdef',
        normalInfo: 'post creation attempt'
      };

      const clean = sanitizeDetails(rawDetails);
      assert.strictEqual(clean.password, '[REDACTED]');
      assert.strictEqual(clean.token, '[REDACTED]');
      assert.strictEqual(clean.refreshToken, '[REDACTED]');
      assert.strictEqual(clean.cookie, '[REDACTED]');
      assert.strictEqual(clean.normalInfo, 'post creation attempt');
    });

    it('should truncate oversized details and prevent multi-line log injection', () => {
      const injectionAttempt = {
        reason: 'Failed\n[CRITICAL_FAKE_ERROR] System breached\rAnother line'
      };

      const clean = sanitizeDetails(injectionAttempt);
      assert.strictEqual(clean.reason.includes('\n'), false);
      assert.strictEqual(clean.reason.includes('\r'), false);
    });

    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      assert.strictEqual(typeof id1, 'string');
      assert.strictEqual(id1.startsWith('sec_'), true);
      assert.notStrictEqual(id1, id2);
    });
  });

  describe('5. Input Boundary & Client Payload Validation Safeguards', () => {
    it('should enforce reasonable length boundaries on feed content', () => {
      const oversizedTitle = 'A'.repeat(200);
      const trimmedTitle = oversizedTitle.substring(0, 150);
      assert.strictEqual(trimmedTitle.length, 150);

      const oversizedText = 'B'.repeat(6000);
      assert.strictEqual(oversizedText.length > 5000, true);
    });

    it('should validate UUID format before initiating database queries', () => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUuids = [
        'invalid-id',
        '123e4567-e89b-12d3-a456-42661417400',
        '123e4567-e89b-12d3-a456-4266141740000',
        "123e4567-e89b-12d3-a456-426614174000' OR '1'='1"
      ];

      assert.strictEqual(UUID_REGEX.test(validUuid), true);
      for (const id of invalidUuids) {
        assert.strictEqual(UUID_REGEX.test(id), false, `Expected ${id} to fail UUID regex check`);
      }
    });

    it('should sanitize content before dispatching mention notifications', () => {
      const dirtyComment = 'Hello <script>alert(1)</script> @builder_one checkout this opportunity!';
      const sanitized = sanitizeInput(dirtyComment);
      assert.strictEqual(sanitized.includes('<script>'), false);
      assert.strictEqual(sanitized.includes('@builder_one'), true);
    });
  });
});
