/**
 * Phase 4 Verification Suite:
 * Owner Editing Authorization (Admins cannot edit, only delete),
 * Admin Cannot Post or Edit in Dashboard, Feed Filter Pill Removal,
 * Composer Mounting Safety, and Modernized Report Interface.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { updateCommunityPost } from '../services/community';
import { validateMessageSafety, sanitizeInput, safeUrl, validateUrlSafety } from '../utils/text';

describe('Phase 4: Admin Post Permissions, Feed Filter Bar & Modern Report Suite', () => {

  describe('1. Server-Side Authentication & Validation Gates in updateCommunityPost', () => {
    it('rejects update requests when no authenticated user is provided', async () => {
      await assert.rejects(
        async () => {
          await updateCommunityPost(
            '00000000-0000-0000-0000-000000000001',
            { title: 'New Title' },
            { uid: '', role: 'user' }
          );
        },
        {
          message: 'You must be signed in to edit a community post.'
        }
      );
    });

    it('rejects update requests with invalid UUID post ID', async () => {
      await assert.rejects(
        async () => {
          await updateCommunityPost(
            'not-a-valid-uuid',
            { title: 'New Title' },
            { uid: '00000000-0000-0000-0000-000000000002', role: 'user' }
          );
        },
        {
          message: 'Invalid post ID format.'
        }
      );
    });

    it('validates message safety rules for post titles and descriptions during edits', () => {
      const xssTitle = '<script>alert("xss")</script>';
      const safetyResult = validateMessageSafety(xssTitle);
      assert.strictEqual(safetyResult.safe, false);
      assert.strictEqual(safetyResult.error?.toLowerCase().includes('unsafe script or html'), true);

      const cleanTitle = 'Learning Rust in 2026';
      const cleanResult = validateMessageSafety(cleanTitle);
      assert.strictEqual(cleanResult.safe, true);
    });

    it('validates URL safety rules for registration and resource links during edits', () => {
      const jsUrl = 'javascript:stealCredentials()';
      const jsCheck = validateUrlSafety(jsUrl);
      assert.strictEqual(jsCheck.safe, false);

      const dataUrl = 'data:text/html,<script>alert(1)</script>';
      const dataCheck = validateUrlSafety(dataUrl);
      assert.strictEqual(dataCheck.safe, false);

      const validUrl = 'https://pixelminds.org/hackathon';
      const validCheck = validateUrlSafety(validUrl);
      assert.strictEqual(validCheck.safe, true);
    });
  });

  describe('2. Post Ownership Enforcement: Admins Cannot Edit, Only Authors Can Edit', () => {
    it('verifies updateCommunityPost strictly enforces that only the original author can edit', () => {
      const communityFile = readFileSync(resolve(process.cwd(), 'src/services/community.ts'), 'utf-8');

      assert.strictEqual(
        communityFile.includes("if (String(existingPost.user_id) !== String(currentUserId))"),
        true,
        'Must enforce that caller is strictly the original author'
      );
      assert.strictEqual(
        communityFile.includes("Only the original author can edit their own post"),
        true,
        'Must reject any non-author attempt to edit a post'
      );
    });

    it('verifies in PostCard that only the post owner can edit (admins cannot edit)', () => {
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      assert.strictEqual(
        uiFile.includes("const canEdit = Boolean(user?.uid && p.userId && user.uid === p.userId);"),
        true,
        'canEdit must be strictly limited to the post owner'
      );
      assert.strictEqual(
        uiFile.includes("const canDelete = user && (user.uid === p.userId || userProfile?.role === 'admin');"),
        true,
        'canDelete must allow the owner and admins'
      );
    });

    it('verifies updateCommunityPost strictly strips immutable fields from payload', () => {
      const communityFile = readFileSync(resolve(process.cwd(), 'src/services/community.ts'), 'utf-8');

      assert.strictEqual(communityFile.includes("delete (payload as any).user_id;"), true);
      assert.strictEqual(communityFile.includes("delete (payload as any).author_name;"), true);
      assert.strictEqual(communityFile.includes("delete (payload as any).likes_count;"), true);
      assert.strictEqual(communityFile.includes("delete (payload as any).comments_count;"), true);
    });
  });

  describe('3. Admin Dashboard Moderation: Can Create Posts, Can Delete, Cannot Edit Other Posts', () => {
    it('verifies the Admin Community Posts table has Delete action but NO Edit action for other posts', () => {
      const pagesFile = readFileSync(resolve(process.cwd(), 'src/pages.tsx'), 'utf-8');

      // Delete button must exist in admin community posts
      assert.strictEqual(pagesFile.includes('handleDeletePost(p.id)'), true);

      // Edit action must NOT exist in the admin community posts table
      assert.strictEqual(pagesFile.includes('handleOpenAdminEditPost'), false);
      assert.strictEqual(pagesFile.includes('editingPostItem'), false);
    });

    it('verifies Admin Community Posts tab allows admins to create posts', () => {
      const pagesFile = readFileSync(resolve(process.cwd(), 'src/pages.tsx'), 'utf-8');

      assert.strictEqual(pagesFile.includes('+ Create Community Post'), true);
      assert.strictEqual(pagesFile.includes('handleCreatePost'), true);
    });
  });

  describe('4. Feed Category Filter Bar: No Visible Pills, Filtering Still Works', () => {
    it('ensures no category pill buttons are rendered in the feed header', () => {
      const pagesFile = readFileSync(resolve(process.cwd(), 'src/pages.tsx'), 'utf-8');

      // The Category Pills row with feedCategories.map must not be present in JSX
      const feedHeaderSlice = pagesFile.substring(
        pagesFile.indexOf('Community Feed'),
        pagesFile.indexOf('Simple and small Create a Post trigger')
      );

      assert.strictEqual(
        feedHeaderSlice.includes('{feedCategories.map('),
        false,
        'Must not render category pill buttons in feed header'
      );
    });

    it('preserves search and active filter badge with clear functionality', () => {
      const pagesFile = readFileSync(resolve(process.cwd(), 'src/pages.tsx'), 'utf-8');

      assert.strictEqual(
        pagesFile.includes("(searchFilter || filterCategory !== 'All')"),
        true,
        'Active filter banner must display when filtering'
      );
      assert.strictEqual(
        pagesFile.includes("setFilterCategory('All')"),
        true,
        'Clear button must reset filterCategory'
      );
    });
  });

  describe('5. Composer Import Safety & Opening Fix', () => {
    it('ensures IconPhoto is exported and imported without reference errors', () => {
      const iconsFile = readFileSync(resolve(process.cwd(), 'src/components/FeedIcons.tsx'), 'utf-8');
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      assert.strictEqual(iconsFile.includes('export const IconPhoto:'), true);
      assert.strictEqual(uiFile.includes('IconPhoto'), true);
    });

    it('ensures storage validation helpers are properly imported in ui.tsx', () => {
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      assert.strictEqual(uiFile.includes('ALLOWED_IMAGE_TYPES'), true);
      assert.strictEqual(uiFile.includes('MAX_IMAGE_SIZE_BYTES'), true);
      assert.strictEqual(uiFile.includes('validateImageMagicBytes'), true);
      assert.strictEqual(uiFile.includes('uploadPostImage'), true);
    });
  });

  describe('6. Modern Report Interface (src/components/ReportModal.tsx)', () => {
    it('applies the Pixel Minds glassmorphism design system tokens', () => {
      const reportFile = readFileSync(resolve(process.cwd(), 'src/components/ReportModal.tsx'), 'utf-8');

      assert.strictEqual(reportFile.includes('pm-glass-card'), true);
      assert.strictEqual(reportFile.includes("font-['Outfit',sans-serif]"), true);
      assert.strictEqual(reportFile.includes('backdrop-blur-2xl'), true);
      assert.strictEqual(reportFile.includes('dark:bg-slate-900/95'), true);
    });

    it('preserves distinct report reason sets for opportunities vs posts', () => {
      const reportFile = readFileSync(resolve(process.cwd(), 'src/components/ReportModal.tsx'), 'utf-8');

      assert.strictEqual(reportFile.includes('OPPORTUNITY_REASONS = ['), true);
      assert.strictEqual(reportFile.includes('POST_REASONS = ['), true);
    });

    it('enforces authentication check before allowing report submissions', () => {
      const reportFile = readFileSync(resolve(process.cwd(), 'src/components/ReportModal.tsx'), 'utf-8');

      assert.strictEqual(reportFile.includes('Sign In Required to Report'), true);
      assert.strictEqual(reportFile.includes("to={`/login?redirect="), true);
    });

    it('prevents duplicate reports and enforces max length', () => {
      const reportFile = readFileSync(resolve(process.cwd(), 'src/components/ReportModal.tsx'), 'utf-8');

      assert.strictEqual(reportFile.includes("const reportKey = `pm_reported_${targetId}_${user.uid}`;"), true);
      assert.strictEqual(reportFile.includes('maxLength={500}'), true);
      assert.strictEqual(reportFile.includes("if (e.key === 'Escape')"), true);
    });
  });

});
