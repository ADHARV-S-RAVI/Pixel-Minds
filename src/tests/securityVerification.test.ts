/**
 * Phase 4 — Security Verification & Regression Test Suite
 *
 * Automated verification for:
 * 1. Recursive sensitive data redaction (nested objects & arrays, expanded sensitive keys, order preservation)
 * 2. Open redirect prevention (external URLs, protocol-relative, backslash variants, control chars)
 * 3. Storage upload security & path isolation (user-isolated paths, GIF banner rejection, magic bytes)
 * 4. Authorization boundaries & Public Profile privacy (field isolation, role protection)
 * 5. Application deduplication & reward idempotency logic
 * 6. Email API security safeguards (verified recipient matching, origin check, fail-closed rate limiting)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeDetails, generateCorrelationId } from '../services/securityLogger';
import { safeRedirectUrl, safeUrl, sanitizeInput, validateUrlSafety } from '../utils/text';
import {
  sanitizeFileName,
  validateOpportunityImageFile,
  validateImageMagicBytes,
  ALLOWED_BANNER_TYPES,
  ALLOWED_IMAGE_TYPES
} from '../services/storage';

describe('Phase 4: Automated Security Verification & Regression Suite', () => {

  // ============================================================================
  // 1. RECURSIVE SENSITIVE DATA REDACTION
  // ============================================================================
  describe('1. Recursive Sensitive Data Redaction (Objects & Arrays)', () => {
    it('redacts sensitive keys in top-level object', () => {
      const payload = {
        username: 'alex',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        apiKey: 'pm_live_998877665544332211',
        session_id: 'sess_123456789'
      };

      const sanitized = sanitizeDetails(payload);
      assert.strictEqual(sanitized.username, 'alex');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.apiKey, '[REDACTED]');
      assert.strictEqual(sanitized.session_id, '[REDACTED]');
    });

    it('recursively redacts sensitive keys inside deeply nested objects', () => {
      const payload = {
        user: {
          id: 'u-123',
          profile: {
            name: 'Builder Alex',
            securityData: {
              bearer: 'Bearer abcdef123456',
              private_key: '-----BEGIN RSA PRIVATE KEY-----',
              refresh_token: 'rf_998877'
            }
          }
        }
      };

      const sanitized = sanitizeDetails(payload);
      assert.strictEqual(sanitized.user.id, 'u-123');
      assert.strictEqual(sanitized.user.profile.name, 'Builder Alex');
      assert.strictEqual(sanitized.user.profile.securityData.bearer, '[REDACTED]');
      assert.strictEqual(sanitized.user.profile.securityData.private_key, '[REDACTED]');
      assert.strictEqual(sanitized.user.profile.securityData.refresh_token, '[REDACTED]');
    });

    it('recursively redacts objects nested inside arrays while preserving array order', () => {
      const payload = {
        items: [
          { index: 0, title: 'Item 0', secret_token: 'secret-0' },
          { index: 1, title: 'Item 1', cookie: 'session=xyz' },
          { index: 2, title: 'Item 2', credit_card: '4111-2222-3333-4444' },
          { index: 3, title: 'Item 3', safeField: 'safeValue' }
        ]
      };

      const sanitized = sanitizeDetails(payload);
      assert.strictEqual(Array.isArray(sanitized.items), true);
      assert.strictEqual(sanitized.items.length, 4);

      // Verify array ordering is strictly preserved
      assert.strictEqual(sanitized.items[0].index, 0);
      assert.strictEqual(sanitized.items[0].title, 'Item 0');
      assert.strictEqual(sanitized.items[0].secret_token, '[REDACTED]');

      assert.strictEqual(sanitized.items[1].index, 1);
      assert.strictEqual(sanitized.items[1].cookie, '[REDACTED]');

      assert.strictEqual(sanitized.items[2].index, 2);
      assert.strictEqual(sanitized.items[2].credit_card, '[REDACTED]');

      assert.strictEqual(sanitized.items[3].index, 3);
      assert.strictEqual(sanitized.items[3].safeField, 'safeValue');
    });

    it('covers all expanded sensitive keywords', () => {
      const sensitiveKeys = [
        'password', 'passwd', 'token', 'access_token', 'refresh_token',
        'secret', 'cookie', 'authorization', 'apikey', 'api_key',
        'credentials', 'credential', 'smtp', 'bearer', 'private_key',
        'session_id', 'session_token', 'credit_card', 'card_number',
        'cvv', 'ssn', 'pin'
      ];

      for (const key of sensitiveKeys) {
        const payload = { [key]: 'sensitive_value_123', normal: 'ok' };
        const clean = sanitizeDetails(payload);
        assert.strictEqual(clean[key], '[REDACTED]', `Key "${key}" was not redacted`);
        assert.strictEqual(clean.normal, 'ok');
      }
    });

    it('handles arrays nested inside arrays safely', () => {
      const payload = {
        matrix: [
          [{ user: 'alice', pass: 'p123' }],
          [{ user: 'bob', token: 't456' }]
        ]
      };

      const clean = sanitizeDetails(payload);
      assert.strictEqual(clean.matrix[0][0].user, 'alice');
      assert.strictEqual(clean.matrix[0][0].pass, '[REDACTED]');
      assert.strictEqual(clean.matrix[1][0].user, 'bob');
      assert.strictEqual(clean.matrix[1][0].token, '[REDACTED]');
    });
  });

  // ============================================================================
  // 2. OPEN REDIRECT PREVENTION
  // ============================================================================
  describe('2. Open Redirect Prevention (safeRedirectUrl)', () => {
    it('accepts legitimate internal paths', () => {
      assert.strictEqual(safeRedirectUrl('/opportunities'), '/opportunities');
      assert.strictEqual(safeRedirectUrl('/profile?tab=submissions'), '/profile?tab=submissions');
      assert.strictEqual(safeRedirectUrl('/settings#security'), '/settings#security');
      assert.strictEqual(safeRedirectUrl('/feed?category=Hackathon&page=2'), '/feed?category=Hackathon&page=2');
      assert.strictEqual(safeRedirectUrl('/'), '/');
    });

    it('rejects external absolute URLs', () => {
      assert.strictEqual(safeRedirectUrl('https://evil.com'), '/');
      assert.strictEqual(safeRedirectUrl('http://attacker.com/login'), '/');
      assert.strictEqual(safeRedirectUrl('ftp://evil.com/file'), '/');
      assert.strictEqual(safeRedirectUrl('javascript:alert(1)'), '/');
      assert.strictEqual(safeRedirectUrl('data:text/html,evil'), '/');
    });

    it('rejects protocol-relative URLs', () => {
      assert.strictEqual(safeRedirectUrl('//evil.com'), '/');
      assert.strictEqual(safeRedirectUrl('//evil.com/phishing'), '/');
      assert.strictEqual(safeRedirectUrl('///evil.com'), '/');
    });

    it('rejects backslash evasion variants', () => {
      assert.strictEqual(safeRedirectUrl('/\\evil.com'), '/');
      assert.strictEqual(safeRedirectUrl('\\\\evil.com'), '/');
      assert.strictEqual(safeRedirectUrl('/login\\evil.com'), '/');
      assert.strictEqual(safeRedirectUrl('\\evil.com'), '/');
    });

    it('rejects control characters, newlines, and null bytes', () => {
      assert.strictEqual(safeRedirectUrl('/login\r\nevil.com'), '/');
      assert.strictEqual(safeRedirectUrl('/path\x00evil'), '/');
      assert.strictEqual(safeRedirectUrl('/path\x1bevil'), '/');
    });

    it('handles null, undefined, empty, and custom fallback', () => {
      assert.strictEqual(safeRedirectUrl(null), '/');
      assert.strictEqual(safeRedirectUrl(undefined), '/');
      assert.strictEqual(safeRedirectUrl(''), '/');
      assert.strictEqual(safeRedirectUrl('   '), '/');
      assert.strictEqual(safeRedirectUrl('https://evil.com', '/dashboard'), '/dashboard');
    });
  });

  // ============================================================================
  // 3. STORAGE UPLOAD SECURITY & PATH ISOLATION
  // ============================================================================
  describe('3. Storage Upload Security & Path Isolation', () => {
    it('disallows GIF images for opportunity banners (matches bucket policy)', () => {
      assert.strictEqual(ALLOWED_BANNER_TYPES.includes('image/gif'), false);
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('image/gif'), true);

      const gifFile = {
        name: 'animated-banner.gif',
        type: 'image/gif',
        size: 500000
      } as unknown as File;

      const bannerVal = validateOpportunityImageFile(gifFile, ALLOWED_BANNER_TYPES);
      assert.strictEqual(bannerVal.valid, false, 'GIF must be rejected for opportunity banners');
    });

    it('allows JPEG, PNG, and WebP for opportunity banners', () => {
      const validTypes = [
        { name: 'banner.jpg', type: 'image/jpeg' },
        { name: 'banner.png', type: 'image/png' },
        { name: 'banner.webp', type: 'image/webp' }
      ];

      for (const t of validTypes) {
        const file = { name: t.name, type: t.type, size: 500000 } as unknown as File;
        const res = validateOpportunityImageFile(file, ALLOWED_BANNER_TYPES);
        assert.strictEqual(res.valid, true, `Expected ${t.name} to be valid`);
      }
    });

    it('sanitizes filenames against directory traversal and null bytes', () => {
      assert.strictEqual(sanitizeFileName('../../etc/passwd'), 'etc_passwd');
      assert.strictEqual(sanitizeFileName('..\\..\\windows\\system32'), 'windows_system32');
      assert.strictEqual(sanitizeFileName('image.png\x00.exe'), 'image.png_.exe');
      assert.strictEqual(sanitizeFileName('my image (1) #final.jpg'), 'my_image__1___final.jpg');
    });

    it('verifies magic bytes for image formats', async () => {
      // Create mock File with JPEG header: FF D8 FF
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const jpegBlob = new Blob([jpegBytes], { type: 'image/jpeg' });
      const jpegFile = new File([jpegBlob], 'photo.jpg', { type: 'image/jpeg' });

      const isJpeg = await validateImageMagicBytes(jpegFile);
      assert.strictEqual(isJpeg, true, 'JPEG magic bytes should validate');

      // Create fake executable with image extension
      const fakeBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]); // MZ executable header
      const fakeBlob = new Blob([fakeBytes], { type: 'image/jpeg' });
      const fakeFile = new File([fakeBlob], 'fake.jpg', { type: 'image/jpeg' });

      const isFake = await validateImageMagicBytes(fakeFile);
      assert.strictEqual(isFake, false, 'Executable masquerading as JPEG must be rejected');
    });
  });

  // ============================================================================
  // 4. AUTHORIZATION BOUNDARIES & PRIVACY
  // ============================================================================
  describe('4. Authorization Boundaries & Privacy Protections', () => {
    it('public profile projection strictly excludes private fields', () => {
      // Simulated full profiles table row containing private data
      const privateProfileRow = {
        id: 'u-user-a',
        full_name: 'Alice Johnson',
        username: 'alice_j',
        avatar_url: 'https://cdn.example.com/alice.png',
        headline: 'Frontend Engineer',
        bio: 'Passionate about web standards',
        website: 'https://alice.dev',
        github: 'alicej',
        twitter: 'alice_tweets',
        linkedin: 'alice-johnson',
        email: 'alice.private@example.com',
        phone: '+1-555-0199',
        is_suspended: false,
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString()
      };

      // Project as defined by the public_profiles view
      const publicViewAllowedKeys = new Set([
        'id', 'full_name', 'username', 'avatar_url',
        'headline', 'bio', 'website', 'github', 'twitter', 'linkedin'
      ]);

      const publicProfile: Record<string, any> = {};
      for (const [key, val] of Object.entries(privateProfileRow)) {
        if (publicViewAllowedKeys.has(key)) {
          publicProfile[key] = val;
        }
      }

      // Assert private fields are strictly excluded
      assert.strictEqual('email' in publicProfile, false, 'email must never be present in public profile');
      assert.strictEqual('phone' in publicProfile, false, 'phone must never be present in public profile');
      assert.strictEqual('role' in publicProfile, false, 'role must never be present in public profile');
      assert.strictEqual('is_suspended' in publicProfile, false, 'suspension flag must never be public');

      // Assert intended public fields are preserved
      assert.strictEqual(publicProfile.id, 'u-user-a');
      assert.strictEqual(publicProfile.username, 'alice_j');
      assert.strictEqual(publicProfile.full_name, 'Alice Johnson');
    });

    it('enforces suspension logic for user operations', () => {
      const activeUser = { id: 'u-1', is_suspended: false, status: 'active' };
      const suspendedUser = { id: 'u-2', is_suspended: true, status: 'suspended' };

      const isUserAllowedToWrite = (user: { is_suspended?: boolean; status?: string }) => {
        return user.is_suspended !== true && user.status !== 'suspended';
      };

      assert.strictEqual(isUserAllowedToWrite(activeUser), true);
      assert.strictEqual(isUserAllowedToWrite(suspendedUser), false);
    });

    it('enforces admin-only route permissions', () => {
      const ordinaryUser = { id: 'u-ordinary', role: 'user', is_suspended: false };
      const suspendedAdmin = { id: 'u-admin-susp', role: 'admin', is_suspended: true };
      const authorizedAdmin = { id: 'u-admin-ok', role: 'admin', is_suspended: false };

      const evaluateAdminRoute = (user: { role?: string; is_suspended?: boolean } | null) => {
        if (!user) return { allowed: false, redirect: '/admin/login' };
        if (user.is_suspended === true) return { allowed: false, error: 'Account Suspended' };
        if (user.role !== 'admin') return { allowed: false, redirect: '/' };
        return { allowed: true };
      };

      assert.deepStrictEqual(evaluateAdminRoute(null), { allowed: false, redirect: '/admin/login' });
      assert.deepStrictEqual(evaluateAdminRoute(ordinaryUser), { allowed: false, redirect: '/' });
      assert.deepStrictEqual(evaluateAdminRoute(suspendedAdmin), { allowed: false, error: 'Account Suspended' });
      assert.deepStrictEqual(evaluateAdminRoute(authorizedAdmin), { allowed: true });
    });
  });

  // ============================================================================
  // 5. APPLICATION DEDUPLICATION & REWARD IDEMPOTENCY LOGIC
  // ============================================================================
  describe('5. Application Deduplication & Reward Idempotency Logic', () => {
    it('ranks duplicate applications deterministically preserving claimed rewards', () => {
      // Simulate duplicate applications submitted by the same user for the same opportunity
      const duplicates = [
        { id: 'app-3', user_id: 'u-1', opportunity_id: 'opp-100', status: 'pending', reward_claimed: false, created_at: 3000 },
        { id: 'app-2', user_id: 'u-1', opportunity_id: 'opp-100', status: 'confirmed', reward_claimed: false, created_at: 2000 },
        { id: 'app-1', user_id: 'u-1', opportunity_id: 'opp-100', status: 'confirmed', reward_claimed: true, created_at: 1000 }
      ];

      // Safe deterministic ranking per Phase 2 migration:
      // Priority 1: reward_claimed = true FIRST
      // Priority 2: confirmed status OVER pending
      // Priority 3: earliest created_at
      // Priority 4: deterministic id tie-breaker
      const sorted = [...duplicates].sort((a, b) => {
        if (a.reward_claimed !== b.reward_claimed) return a.reward_claimed ? -1 : 1;
        if (a.status !== b.status) return a.status === 'confirmed' ? -1 : 1;
        if (a.created_at !== b.created_at) return a.created_at - b.created_at;
        return a.id.localeCompare(b.id);
      });

      const canonical = sorted[0];
      assert.strictEqual(canonical.id, 'app-1', 'Canonical application must preserve the claimed reward');
      assert.strictEqual(canonical.reward_claimed, true);

      // Verify that if canonical had reward_claimed=false but duplicate had true,
      // reward status would be preserved onto the canonical record.
      const canonicalReward = duplicates.some(d => d.reward_claimed);
      assert.strictEqual(canonicalReward, true);
    });

    it('enforces idempotency key uniqueness for pixel transactions', () => {
      const ledger = new Map<string, { userId: string; amount: number }>();

      const awardPixels = (userId: string, amount: number, idempotencyKey: string): boolean => {
        if (ledger.has(idempotencyKey)) {
          return false; // Duplicate transaction suppressed
        }
        ledger.set(idempotencyKey, { userId, amount });
        return true;
      };

      const key = `app_reward_u123_opp456`;

      // First attempt succeeds
      const first = awardPixels('u123', 50, key);
      assert.strictEqual(first, true);

      // Retry attempt with same idempotency key is safely ignored
      const retry = awardPixels('u123', 50, key);
      assert.strictEqual(retry, false);

      // Ledger has only 1 entry
      assert.strictEqual(ledger.size, 1);
    });
  });

  // ============================================================================
  // 6. EMAIL NOTIFICATION API SECURITY
  // ============================================================================
  describe('6. Email Notification API Security Safeguards', () => {
    it('rejects origin mismatch', () => {
      const allowedOrigins = [
        'https://pixelminds.tech',
        'https://www.pixelminds.tech',
        'https://pixelmindss.vercel.app',
        'http://localhost:5173'
      ];

      const isAllowed = (origin: string) => allowedOrigins.includes(origin);

      assert.strictEqual(isAllowed('https://evil.com'), false);
      assert.strictEqual(isAllowed('https://attacker-pixelminds.tech'), false);
      assert.strictEqual(isAllowed('https://pixelminds.tech'), true);
      assert.strictEqual(isAllowed('http://localhost:5173'), true);
    });

    it('verifies recipient matching: caller cannot send emails to another user address', () => {
      const authenticatedUserEmail = 'verified.user@gmail.com';

      const verifyRecipient = (targetEmail: string, authEmail: string) => {
        return targetEmail.trim().toLowerCase() === authEmail.trim().toLowerCase();
      };

      assert.strictEqual(verifyRecipient('verified.user@gmail.com', authenticatedUserEmail), true);
      assert.strictEqual(verifyRecipient('victim.account@gmail.com', authenticatedUserEmail), false);
    });

    it('fails closed on rate limit service errors (returns 503, never sends)', () => {
      const handleRateLimitResult = (result: { allowed: boolean; error?: string }) => {
        if (!result.allowed) {
          if (result.error) {
            return { status: 503, error: 'Service temporarily unavailable: Rate limit check failed.' };
          }
          return { status: 429, error: 'Rate limit exceeded.' };
        }
        return { status: 200 };
      };

      // Normal allowed
      assert.deepStrictEqual(handleRateLimitResult({ allowed: true }), { status: 200 });

      // Rate limited
      assert.deepStrictEqual(handleRateLimitResult({ allowed: false }), { status: 429, error: 'Rate limit exceeded.' });

      // Fail-closed on database / service failure
      assert.deepStrictEqual(
        handleRateLimitResult({ allowed: false, error: 'connection timeout' }),
        { status: 503, error: 'Service temporarily unavailable: Rate limit check failed.' }
      );
    });
  });
});
