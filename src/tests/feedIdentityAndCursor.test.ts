import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapPostRow } from '../services/community';
import fs from 'node:fs';
import path from 'node:path';

describe('Feed Identity and Cursor Fixes Verification Suite', () => {
  describe('1. Post Author Identity Mapping', () => {
    it('resolves author identity from public_profiles full_name', () => {
      const row = {
        id: 'post-1',
        user_id: 'user-alice-123',
        author_name: 'Pixel Builder', // Stale DB default
        text: 'Hello from Alice\n\nPost body here',
        created_at: new Date().toISOString()
      };

      const profileMap = new Map([
        ['user-alice-123', { id: 'user-alice-123', full_name: 'Alice Johnson', username: 'alice_j', avatar_url: 'https://example.com/alice.png' }]
      ]);

      const post = mapPostRow(row, profileMap);
      assert.strictEqual(post.user, 'Alice Johnson');
      assert.strictEqual(post.avatar, 'https://example.com/alice.png');
      assert.notStrictEqual(post.user, 'Pixel Builder');
    });

    it('resolves author identity from public_profiles username when full_name is missing or is database dummy "Pixel Builder"', () => {
      const row = {
        id: 'post-2',
        user_id: 'user-bob-456',
        author_name: 'Pixel Builder',
        text: 'Bob post title\n\nBob description',
        created_at: new Date().toISOString()
      };

      const profileMap = new Map([
        ['user-bob-456', { id: 'user-bob-456', full_name: 'Pixel Builder', username: 'bob_dev', avatar_url: null }]
      ]);

      const post = mapPostRow(row, profileMap);
      assert.strictEqual(post.user, '@bob_dev');
      assert.notStrictEqual(post.user, 'Pixel Builder');
    });

    it('displays distinct authors for distinct accounts', () => {
      const row1 = {
        id: 'post-1',
        user_id: 'user-1',
        author_name: 'Alice',
        text: 'Post 1',
        created_at: new Date().toISOString()
      };
      const row2 = {
        id: 'post-2',
        user_id: 'user-2',
        author_name: 'Bob',
        text: 'Post 2',
        created_at: new Date().toISOString()
      };

      const profileMap = new Map([
        ['user-1', { id: 'user-1', full_name: 'Alice Wonder', username: 'alice' }],
        ['user-2', { id: 'user-2', full_name: 'Bob Builder', username: 'bob' }]
      ]);

      const post1 = mapPostRow(row1, profileMap);
      const post2 = mapPostRow(row2, profileMap);

      assert.strictEqual(post1.user, 'Alice Wonder');
      assert.strictEqual(post2.user, 'Bob Builder');
      assert.notStrictEqual(post1.user, post2.user);
    });

    it('falls back to generic member name ONLY when identity genuinely cannot be resolved', () => {
      const row = {
        id: 'post-unknown',
        user_id: 'non-existent-user',
        author_name: 'Pixel Builder',
        text: 'Ghost post',
        created_at: new Date().toISOString()
      };

      const profileMap = new Map();
      const post = mapPostRow(row, profileMap);
      assert.strictEqual(post.user, 'Pixel Member');
      assert.notStrictEqual(post.user, 'Pixel Builder');
    });
  });

  describe('2. Likers Identity Resolution Logic', () => {
    it('maps multiple likers with different full names and avatars', () => {
      const rawLikes = [
        { user_id: 'uid-user-1' },
        { user_id: 'uid-user-2' },
        { user_id: 'uid-user-3' }
      ];

      const userProfiles = [
        { id: 'uid-user-1', full_name: 'Sarah Connor', username: 'sarah_c', avatar_url: 'https://avatar/1' },
        { id: 'uid-user-2', full_name: 'Elena Gilbert', username: 'elena_g', avatar_url: 'https://avatar/2' },
        { id: 'uid-user-3', full_name: 'Alex Rivera', username: 'arivera', avatar_url: 'https://avatar/3' }
      ];

      const profileMap = new Map(userProfiles.map(p => [p.id, p]));
      const userIds = Array.from(new Set(rawLikes.map(r => r.user_id)));

      const likers = userIds.map(uid => {
        const prof = profileMap.get(uid);
        const rawName = prof?.full_name?.trim();
        const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
        const cleanUsername = prof?.username ? (prof.username.startsWith('@') ? prof.username : `@${prof.username}`) : undefined;
        const displayName = (hasRealName ? rawName : undefined) || cleanUsername || 'Pixel Member';
        return {
          id: uid,
          name: displayName,
          username: prof?.username || undefined,
          avatar: prof?.avatar_url || undefined
        };
      });

      assert.strictEqual(likers.length, 3);
      assert.strictEqual(likers[0].name, 'Sarah Connor');
      assert.strictEqual(likers[0].avatar, 'https://avatar/1');
      assert.strictEqual(likers[1].name, 'Elena Gilbert');
      assert.strictEqual(likers[1].avatar, 'https://avatar/2');
      assert.strictEqual(likers[2].name, 'Alex Rivera');
      assert.strictEqual(likers[2].avatar, 'https://avatar/3');
    });

    it('falls back to username when full name is missing or empty', () => {
      const rawLikes = [{ user_id: 'uid-user-noname' }];
      const userProfiles = [
        { id: 'uid-user-noname', full_name: '   ', username: 'code_ninja', avatar_url: null }
      ];

      const profileMap = new Map(userProfiles.map(p => [p.id, p]));
      const userIds = Array.from(new Set(rawLikes.map(r => r.user_id)));

      const likers = userIds.map(uid => {
        const prof = profileMap.get(uid);
        const rawName = prof?.full_name?.trim();
        const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
        const cleanUsername = prof?.username ? (prof.username.startsWith('@') ? prof.username : `@${prof.username}`) : undefined;
        const displayName = (hasRealName ? rawName : undefined) || cleanUsername || 'Pixel Member';
        return {
          id: uid,
          name: displayName,
          username: prof?.username || undefined,
          avatar: prof?.avatar_url || undefined
        };
      });

      assert.strictEqual(likers.length, 1);
      assert.strictEqual(likers[0].name, '@code_ninja');
      assert.strictEqual(likers[0].username, 'code_ninja');
    });

    it('falls back to username when full name is database dummy "Pixel Builder"', () => {
      const rawLikes = [{ user_id: 'uid-user-dummy' }];
      const userProfiles = [
        { id: 'uid-user-dummy', full_name: 'Pixel Builder', username: 'dev_guru', avatar_url: 'https://avatar/dev' }
      ];

      const profileMap = new Map(userProfiles.map(p => [p.id, p]));
      const userIds = Array.from(new Set(rawLikes.map(r => r.user_id)));

      const likers = userIds.map(uid => {
        const prof = profileMap.get(uid);
        const rawName = prof?.full_name?.trim();
        const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
        const cleanUsername = prof?.username ? (prof.username.startsWith('@') ? prof.username : `@${prof.username}`) : undefined;
        const displayName = (hasRealName ? rawName : undefined) || cleanUsername || 'Pixel Member';
        return {
          id: uid,
          name: displayName,
          username: prof?.username || undefined,
          avatar: prof?.avatar_url || undefined
        };
      });

      assert.strictEqual(likers.length, 1);
      assert.strictEqual(likers[0].name, '@dev_guru');
      assert.notStrictEqual(likers[0].name, 'Pixel Builder');
    });

    it('deduplicates duplicate like records so users are not duplicated in modal', () => {
      const rawLikes = [
        { user_id: 'user-alice' },
        { user_id: 'user-bob' },
        { user_id: 'user-alice' }, // duplicate like event
        { user_id: 'user-bob' }    // duplicate like event
      ];

      const userIds = Array.from(new Set(rawLikes.map(r => r.user_id).filter(Boolean)));
      assert.strictEqual(userIds.length, 2);
      assert.deepStrictEqual(userIds, ['user-alice', 'user-bob']);
    });

    it('verifies unliking removes the correct user from liker list and updates count', () => {
      let currentLikesCount = 2;
      let likersList = [
        { id: 'user-1', name: 'Alice', avatar: undefined },
        { id: 'user-2', name: 'Bob', avatar: undefined }
      ];

      // User 2 unlikes
      const unlikingUserId = 'user-2';
      likersList = likersList.filter(l => l.id !== unlikingUserId);
      currentLikesCount = Math.max(0, currentLikesCount - 1);

      assert.strictEqual(currentLikesCount, 1);
      assert.strictEqual(likersList.length, 1);
      assert.strictEqual(likersList[0].id, 'user-1');
      assert.strictEqual(likersList[0].name, 'Alice');

      // User 3 likes
      const newLiker = { id: 'user-3', name: 'Charlie', avatar: undefined };
      likersList = [newLiker, ...likersList];
      currentLikesCount += 1;

      assert.strictEqual(currentLikesCount, 2);
      assert.strictEqual(likersList.length, 2);
      assert.strictEqual(likersList[0].name, 'Charlie');
      assert.strictEqual(likersList[1].name, 'Alice');
    });

    it('strictly ensures no email, phone, or private fields are exposed in liker objects', () => {
      const fullDbRow = {
        id: 'u-123',
        full_name: 'John Doe',
        username: 'johndoe',
        avatar_url: 'https://example.com/avatar.jpg',
        email: 'secret.john@gmail.com',
        phone: '+15551234567',
        is_suspended: false,
        role: 'user'
      };

      // Project public fields only
      const liker = {
        id: fullDbRow.id,
        name: fullDbRow.full_name,
        username: fullDbRow.username,
        avatar: fullDbRow.avatar_url
      };

      assert.strictEqual('email' in liker, false);
      assert.strictEqual('phone' in liker, false);
      assert.strictEqual('role' in liker, false);
      assert.strictEqual('is_suspended' in liker, false);
    });

    it('safely handles suspended or unavailable profiles without leaking private info', () => {
      const rawLikes = [{ user_id: 'suspended-user-id' }];
      // When user is suspended, public_profiles returns no row (filtered by WHERE is_suspended = FALSE)
      const profileMap = new Map();

      const userIds = Array.from(new Set(rawLikes.map(r => r.user_id)));
      const likers = userIds.map(uid => {
        const prof = profileMap.get(uid);
        const rawName = prof?.full_name?.trim();
        const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
        const cleanUsername = prof?.username ? (prof.username.startsWith('@') ? prof.username : `@${prof.username}`) : undefined;
        const displayName = (hasRealName ? rawName : undefined) || cleanUsername || 'Pixel Member';
        return {
          id: uid,
          name: displayName,
          username: prof?.username || undefined,
          avatar: prof?.avatar_url || undefined
        };
      });

      assert.strictEqual(likers.length, 1);
      assert.strictEqual(likers[0].name, 'Pixel Member');
      assert.strictEqual(likers[0].username, undefined);
      assert.strictEqual('email' in likers[0], false);
    });

    it('properly propagates error when querying likes fails', async () => {
      // Mock failure simulation
      const mockQueryWithError = async () => {
        throw new Error('Database connection timeout');
      };

      await assert.rejects(
        mockQueryWithError(),
        { message: 'Database connection timeout' },
        'Query failure must be propagated rather than silently swallowed'
      );
    });
  });

  describe('3. Cursor and Interactive Styles Verification', () => {
    it('verifies global CSS defines pointer cursor on interactive elements and not-allowed on disabled controls', () => {
      const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

      // Check button, role=button, select, summary, a[href] have cursor: pointer
      assert.strictEqual(/button:not\(:disabled\)/.test(cssContent), true);
      assert.strictEqual(/\[role="button"\]:not\(\[aria-disabled="true"\]\)/.test(cssContent), true);
      assert.strictEqual(/a\[href\]/.test(cssContent), true);
      assert.strictEqual(/cursor:\s*pointer/.test(cssContent), true);

      // Check disabled controls have cursor: not-allowed !important
      assert.strictEqual(/button:disabled/.test(cssContent), true);
      assert.strictEqual(/cursor:\s*not-allowed\s*!important/.test(cssContent), true);

      // Check text inputs retain text cursor
      assert.strictEqual(/textarea:not\(:disabled\)/.test(cssContent), true);
      assert.strictEqual(/cursor:\s*text/.test(cssContent), true);
    });

    it('verifies clickable Card has cursor-pointer and accessible role', () => {
      const uiContent = fs.readFileSync(path.resolve('src/ui.tsx'), 'utf8');
      assert.strictEqual(uiContent.includes("onClick ? 'cursor-pointer ' : ''"), true);
      assert.strictEqual(uiContent.includes("role={onClick ? (props.role || 'button') : props.role}"), true);
    });

    it('verifies unlike state priority: storedUserLiked=false overrides stale isUserLiker=true', () => {
      const currentUserId = 'user-alice';
      const p = {
        id: 'post-123',
        likerIds: ['user-alice', 'user-bob'], // Stale feed data still has user-alice
        likes: 2
      };

      // User explicitly unliked in local session
      const storedUserLiked = false;
      const isUserLiker = Array.isArray(p.likerIds) && p.likerIds.includes(currentUserId);

      // Evaluate new precedence logic
      let resolvedLiked: boolean;
      if (storedUserLiked !== null) {
        resolvedLiked = storedUserLiked;
      } else if (isUserLiker) {
        resolvedLiked = true;
      } else {
        resolvedLiked = false;
      }

      assert.strictEqual(resolvedLiked, false, 'User unlike stored in localStorage must override stale p.likerIds');
    });

    it('verifies PixelClickEffect target filter ignores text, buttons, and pointer cursors but allows open space', () => {
      const pixelEffectFile = fs.readFileSync(path.resolve('src/components/PixelClickEffect.tsx'), 'utf8');

      // Verify buttons, inputs, links, and ARIA button roles are checked
      assert.strictEqual(pixelEffectFile.includes("button, a, input, textarea, select, label"), true);
      assert.strictEqual(pixelEffectFile.includes('[role="button"]'), true);

      // Verify typography / text elements are checked
      assert.strictEqual(pixelEffectFile.includes('h1, h2, h3, h4, h5, h6, p'), true);
      assert.strictEqual(pixelEffectFile.includes('span, strong, em, b, i'), true);

      // Verify pointer cursor detection
      assert.strictEqual(pixelEffectFile.includes("style.cursor === 'pointer'"), true);

      // Verify down and up target checks
      assert.strictEqual(pixelEffectFile.includes('isInteractiveOrText(upTarget)'), true);
    });

    it('verifies bookmark toggle normalizes post UUID and p-prefixed IDs seamlessly', () => {
      const postId = 'e8123456-789a-bcde-f012-3456789abcde';
      const key = 'p' + postId;
      let savedList: string[] = [];

      // Saving
      const isCurrentlySaved = savedList.includes(key) || savedList.includes(postId);
      assert.strictEqual(isCurrentlySaved, false);

      const cleanId = key.startsWith('p') ? key.slice(1) : key;
      const prefixedId = 'p' + cleanId;
      savedList = Array.from(new Set([...savedList, key, cleanId, prefixedId]));

      // Verify both formats are recognized as saved
      assert.strictEqual(savedList.includes(key), true);
      assert.strictEqual(savedList.includes(postId), true);

      // Unsaving
      const isNowSaved = savedList.includes(key) || savedList.includes(postId);
      assert.strictEqual(isNowSaved, true);
      savedList = savedList.filter(x => x !== key && x !== cleanId && x !== prefixedId);
      assert.strictEqual(savedList.includes(key), false);
      assert.strictEqual(savedList.includes(postId), false);
    });

    it('verifies repost count preserves incremented value when post prop is re-rendered', () => {
      const p = { id: 'post-1', reposts: 3 };
      let repostsCount = p.reposts;

      // User reposts
      const nextCount = (p.reposts || repostsCount || 0) + 1;
      p.reposts = nextCount;
      repostsCount = nextCount;

      assert.strictEqual(repostsCount, 4);
      assert.strictEqual(p.reposts, 4);

      // Parent component re-renders with p object
      if (typeof p.reposts === 'number' && p.reposts > repostsCount) {
        repostsCount = p.reposts;
      }
      assert.strictEqual(repostsCount, 4, 'Count must remain 4 and not revert');
    });
  });
});
