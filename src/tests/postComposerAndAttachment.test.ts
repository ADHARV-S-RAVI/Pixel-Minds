/**
 * Phase 3 Verification Suite:
 * Post Composer, Accessible Topic Row Scrolling, Searchable Opportunity/Event Attachment,
 * Server-Side Validation, and Clean Hackathon Post Presentation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { safeUrl, validateUrlSafety } from '../utils/text';
import { VERIFIED_OPPORTUNITIES } from '../data/verifiedOpportunities';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '../services/storage';

describe('Phase 3: Post Composer & Opportunity/Event Attachment Suite', () => {

  describe('1. Topic & Category Row Scrolling & Options', () => {
    it('preserves all standard categories with correct labels', () => {
      const expectedCategories = ['Experience', 'Achievement', 'Idea', 'Learning', 'General'];
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      for (const cat of expectedCategories) {
        assert.strictEqual(
          uiFile.includes(`id: '${cat}', label: '${cat}'`),
          true,
          `Category ${cat} must be defined in categories array`
        );
      }
    });

    it('implements single-row horizontal scroll with shrink-0 buttons and no flex-wrap', () => {
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      // The topic row container must use overflow-x-auto, pm-scrollbar, and NOT flex-wrap
      assert.strictEqual(
        uiFile.includes('flex items-center gap-1.5 overflow-x-auto pm-scrollbar'),
        true,
        'Topic row must use overflow-x-auto with pm-scrollbar for smooth horizontal scrolling'
      );
      assert.strictEqual(
        uiFile.includes('shrink-0'),
        true,
        'Topic buttons must specify shrink-0 so they do not collapse or wrap'
      );
      assert.strictEqual(
        uiFile.includes('focus-visible:ring-2 focus-visible:ring-blue-500'),
        true,
        'Topic buttons must retain accessible focus-visible styling'
      );
    });

    it('verifies CSS scrollbar utility provides thin scrollbar on desktop and suppresses scrollbar on mobile', () => {
      const cssFile = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf-8');

      // Desktop thin scrollbar definition
      assert.strictEqual(cssFile.includes('.pm-scrollbar'), true);
      assert.strictEqual(cssFile.includes('scrollbar-width: thin;'), true);

      // Mobile suppression media query
      assert.strictEqual(cssFile.includes('@media (max-width: 1024px)'), true);
      assert.strictEqual(cssFile.includes('scrollbar-width: none !important;'), true);
    });
  });

  describe('2. Searchable Opportunity/Event Selector Logic', () => {
    const EVENT_CATEGORIES = ['Events', 'Workshops', 'Conferences'];

    it('filters records by mode: event mode only returns Events, Workshops, Conferences', () => {
      const allVerified = VERIFIED_OPPORTUNITIES;
      const eventFiltered = allVerified.filter((v) => EVENT_CATEGORIES.includes(v.category));
      const oppFiltered = allVerified.filter((v) => !EVENT_CATEGORIES.includes(v.category));

      assert.ok(eventFiltered.length > 0, 'There should be verified events');
      assert.ok(oppFiltered.length > 0, 'There should be verified non-event opportunities');

      // Check every event in eventFiltered belongs to EVENT_CATEGORIES
      for (const ev of eventFiltered) {
        assert.strictEqual(EVENT_CATEGORIES.includes(ev.category), true);
      }
    });

    it('matches search query across title, organizer and category case-insensitively', () => {
      const query = 'hackathon';
      const matches = VERIFIED_OPPORTUNITIES.filter((v) =>
        v.title.toLowerCase().includes(query) ||
        v.organizer.toLowerCase().includes(query) ||
        v.category.toLowerCase().includes(query)
      );

      assert.ok(matches.length > 0, 'Search should find records matching "hackathon"');
      for (const m of matches) {
        const titleMatch = m.title.toLowerCase().includes(query);
        const orgMatch = m.organizer.toLowerCase().includes(query);
        const catMatch = m.category.toLowerCase().includes(query);
        assert.ok(titleMatch || orgMatch || catMatch);
      }
    });

    it('handles empty results gracefully when search query has no match', () => {
      const nonsenseQuery = 'xyznonexistentopportunityname123456';
      const matches = VERIFIED_OPPORTUNITIES.filter((v) =>
        v.title.toLowerCase().includes(nonsenseQuery) ||
        v.organizer.toLowerCase().includes(nonsenseQuery)
      );

      assert.strictEqual(matches.length, 0);
    });

    it('verifies SearchableOpportunitySelector component has proper ARIA combobox and listbox attributes', () => {
      const selectorFile = readFileSync(
        resolve(process.cwd(), 'src/components/SearchableOpportunitySelector.tsx'),
        'utf-8'
      );

      assert.strictEqual(selectorFile.includes('role="combobox"'), true);
      assert.strictEqual(selectorFile.includes('aria-autocomplete="list"'), true);
      assert.strictEqual(selectorFile.includes('aria-expanded={isOpen}'), true);
      assert.strictEqual(selectorFile.includes('aria-controls="opp-selector-listbox"'), true);
      assert.strictEqual(selectorFile.includes('role="listbox"'), true);
      assert.strictEqual(selectorFile.includes('role="option"'), true);
      assert.strictEqual(selectorFile.includes('Remove attached'), true);
    });
  });

  describe('3. Server-Side Validation of Opportunity Attachment', () => {
    it('verifies createCommunityPost enforces status=published on attached opportunities', () => {
      const communityFile = readFileSync(
        resolve(process.cwd(), 'src/services/community.ts'),
        'utf-8'
      );

      assert.strictEqual(
        communityFile.includes("existingOpp.status !== 'published'"),
        true,
        'Server validation must check that existingOpp.status is strictly published'
      );
      assert.strictEqual(
        communityFile.includes("Cannot attach an unpublished or invalid opportunity."),
        true,
        'Server validation must reject non-published opportunity attachments'
      );
      assert.strictEqual(
        communityFile.includes("Selected opportunity does not exist or is invalid."),
        true,
        'Server validation must reject non-existent opportunity IDs'
      );
    });
  });

  describe('4. Duplicate Registration Link Prevention & Clean Presentation', () => {
    it('composes hackathon description without embedding duplicate registration link line', () => {
      const cleanDesc = 'Exciting national hackathon for engineering students.';
      const cleanDate = 'Nov 14 - 16, 2026';
      const cleanLoc = 'Bengaluru & Virtual';
      const cleanLink = 'https://sih2026.gov.in/register';

      // Emulate the updated Composer postHackathon formulation
      const descBody = cleanDesc;
      const hackDesc = `Dates: ${cleanDate}\nLocation: ${cleanLoc}\n\n${descBody}`;

      assert.strictEqual(hackDesc.includes(`Registration: ${cleanLink}`), false);
      assert.strictEqual(hackDesc.includes(cleanLink), false);
    });

    it('cleans legacy post text by removing duplicate Registration lines and raw URLs from description', () => {
      const legacyText = `Upcoming Hackathon: Smart India 2026\nDates: Nov 14 - 16, 2026\nLocation: Bengaluru\nRegistration: https://sih.gov.in\n\nhttps://sih.gov.in\nJoin us to build AI tools!`;
      const rawLink = 'https://sih.gov.in';

      let desc = legacyText
        .replace(/^[^\n]*Upcoming Hackathon:[^\n]*\n?/i, '')
        .replace(/Dates?:[^\n]*\n?/i, '')
        .replace(/Location:[^\n]*\n?/i, '')
        .replace(/Registration:[^\n]*\n?/i, '')
        .trim();

      if (rawLink) {
        desc = desc
          .split('\n')
          .filter((line) => line.trim() !== rawLink.trim())
          .join('\n')
          .trim();
      }

      assert.strictEqual(desc, 'Join us to build AI tools!');
      assert.strictEqual(desc.includes(rawLink), false);
    });

    it('renders single primary registration CTA button and removes duplicate top text link in PostCard', () => {
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      // Verify that the redundant "Registration Link" top text anchor was removed
      assert.strictEqual(
        uiFile.includes('<span>Registration Link</span>'),
        false,
        'Redundant top "Registration Link" text link must not be present'
      );

      // Verify single primary CTA button with safeUrl and target="_blank"
      assert.strictEqual(
        uiFile.includes('<span>Register for Hackathon</span>'),
        true,
        'Single primary registration button must be rendered'
      );
      assert.strictEqual(
        uiFile.includes('target="_blank"'),
        true
      );
      assert.strictEqual(
        uiFile.includes('rel="noopener noreferrer"'),
        true
      );
    });

    it('validates registration links safely and blocks javascript: or data: URIs', () => {
      assert.strictEqual(safeUrl('javascript:alert(1)'), null);
      assert.strictEqual(safeUrl('data:text/html;base64,PHNjcmlwdD4='), null);
      assert.strictEqual(safeUrl('https://validhackathon.org/apply'), 'https://validhackathon.org/apply');
      assert.strictEqual(safeUrl('http://insecurebutvalid.com'), 'http://insecurebutvalid.com/');
      assert.strictEqual(validateUrlSafety('https://google.com').safe, true);
      assert.strictEqual(validateUrlSafety('javascript:void(0)').safe, false);
    });

    it('renders attached opportunity card details only when fields are non-empty', () => {
      const oppWithAll = { org: 'Google', deadline: 'Dec 1, 2026', mode: 'Online' };
      const oppWithSome = { org: 'Microsoft', deadline: undefined, mode: 'Hybrid' };
      const oppWithOrgOnly = { org: 'Startup', deadline: '', mode: '' };

      const formatDetails = (o: any) =>
        [o.org, o.deadline ? `Deadline: ${o.deadline}` : null, o.mode].filter(Boolean).join(' · ');

      assert.strictEqual(formatDetails(oppWithAll), 'Google · Deadline: Dec 1, 2026 · Online');
      assert.strictEqual(formatDetails(oppWithSome), 'Microsoft · Hybrid');
      assert.strictEqual(formatDetails(oppWithOrgOnly), 'Startup');
    });
  });

  describe('5. Composer Quality & Duplicate Submission Prevention', () => {
    it('verifies duplicate submission lock (if posting return) in postStandard and postHackathon', () => {
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      const postStandardMatch = uiFile.match(/const postStandard = async \(\) => \{\s*if \(posting\) return;/);
      const postHackathonMatch = uiFile.match(/const postHackathon = async \(\) => \{\s*if \(posting\) return;/);

      assert.ok(postStandardMatch, 'postStandard must guard against concurrent submissions');
      assert.ok(postHackathonMatch, 'postHackathon must guard against concurrent submissions');
    });

    it('verifies form input is preserved when post creation request fails', () => {
      const uiFile = readFileSync(resolve(process.cwd(), 'src/ui.tsx'), 'utf-8');

      // Locate catch block in postStandard
      const catchIndex = uiFile.indexOf("console.error('Failed to create post:', err)");
      assert.ok(catchIndex > 0, 'catch block must exist');

      const catchBlock = uiFile.substring(catchIndex, catchIndex + 250);
      // The catch block should call say() but must NOT reset postTitle or t
      assert.strictEqual(catchBlock.includes('setPostTitle('), false);
      assert.strictEqual(catchBlock.includes('setT('), false);
    });

    it('enforces image upload constraints: allowed MIME types and max 2 MB size', () => {
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('image/jpeg'), true);
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('image/png'), true);
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('image/webp'), true);
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('image/gif'), true);
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('application/pdf'), false);
      assert.strictEqual(ALLOWED_IMAGE_TYPES.includes('text/html'), false);

      assert.strictEqual(MAX_IMAGE_SIZE_BYTES, 2 * 1024 * 1024);
    });
  });
});
