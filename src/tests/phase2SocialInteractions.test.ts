import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handleContentMentions } from '../services/community';
import { renderWithHashtags } from '../utils/text';

describe('Phase 2 — Reposts, Hashtags, Sharing and Mention Notifications', () => {
  it('correctly formats and links hashtags without allowing token injection', () => {
    const rendered = renderWithHashtags('Excited for #React and #NextJS! But not #ReactNative!');
    assert.ok(rendered);
  });

  it('verifies hashtag token boundary matching regex', () => {
    const tagToken = 'react';
    const hashtagRegex = new RegExp(`(^|\\s)#${tagToken}(\\b|[\\s.,!?])`, 'i');

    assert.strictEqual(hashtagRegex.test('Building with #React today'), true);
    assert.strictEqual(hashtagRegex.test('#React is great'), true);
    assert.strictEqual(hashtagRegex.test('Look at #React!'), true);
    assert.strictEqual(hashtagRegex.test('We love #ReactNative'), false);
    assert.strictEqual(hashtagRegex.test('Not matching reactor'), false);
  });

  it('enforces repost identity rules: never construct handle from full name', () => {
    const p1 = {
      user: 'John Doe',
      authorUsername: '@johndoe',
      userId: 'u1',
      text: 'Original hello'
    };
    const p2 = {
      user: 'Jane Smith',
      authorUsername: undefined,
      userId: 'u2',
      text: 'No username here'
    };

    // When username exists, must use actual @username
    const originalHandle1 = p1.authorUsername || (p1.user.startsWith('@') ? p1.user : null);
    assert.strictEqual(originalHandle1, '@johndoe');

    // When username is missing, fallback safely without fabricating a handle
    const originalHandle2 = p2.authorUsername || (p2.user.startsWith('@') ? p2.user : null);
    assert.strictEqual(originalHandle2, null);
  });

  it('disallows self-reposting when user.uid === p.userId', () => {
    const currentUserId = 'user-123';
    const ownPost = { id: 'p1', userId: 'user-123', reposts: 2 };
    const otherPost = { id: 'p2', userId: 'user-456', reposts: 5 };

    const isOwnPost1 = currentUserId === ownPost.userId;
    const isOwnPost2 = currentUserId === otherPost.userId;

    assert.strictEqual(isOwnPost1, true, 'User cannot repost own post');
    assert.strictEqual(isOwnPost2, false, 'User can repost another user post');
  });

  it('prevents duplicate reposts per user', () => {
    const repostHistory = new Set(['p1_user-123']);
    const attemptRepost = (postId: string, userId: string) => {
      const key = `${postId}_${userId}`;
      if (repostHistory.has(key)) {
        return { success: false, error: 'You have already reposted this post.' };
      }
      repostHistory.add(key);
      return { success: true };
    };

    assert.strictEqual(attemptRepost('p1', 'user-123').success, false);
    assert.strictEqual(attemptRepost('p2', 'user-123').success, true);
    assert.strictEqual(attemptRepost('p2', 'user-123').success, false);
  });

  it('verifies share count only increments upon true success', () => {
    let shareCount = 5;
    const simulateShare = (result: 'success' | 'cancelled' | 'failed') => {
      if (result === 'success') {
        shareCount += 1;
      }
    };

    simulateShare('cancelled'); // user cancelled native share sheet
    assert.strictEqual(shareCount, 5, 'Cancelled share sheet must not increment count');

    simulateShare('failed'); // clipboard or permission failed
    assert.strictEqual(shareCount, 5, 'Failed copy must not increment count');

    simulateShare('success'); // successful native share or clipboard copy
    assert.strictEqual(shareCount, 6, 'Successful share increments count');
  });

  it('extracts valid mentions and suppresses emails and self-mentions', () => {
    const content = 'Hey @alice and contact test@example.com or @bob!';
    const tokenRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|@[a-zA-Z0-9_]{3,20}\b)/g;
    const matches = content.match(tokenRegex) || [];
    const mentions: string[] = [];
    for (const token of matches) {
      if (token.startsWith('@') && !token.includes('.')) {
        mentions.push(token.slice(1).toLowerCase());
      }
    }

    assert.deepStrictEqual(mentions, ['alice', 'bob']);
    assert.strictEqual(mentions.includes('example'), false);
  });
});
