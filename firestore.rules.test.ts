import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Security Rules Structural & Dirty-Dozen Invariant Verification Suite.
 * Verifies that firestore.rules enforces all 8 Pillars and all 12 Dirty Dozen payloads
 * documented in security_spec.md.
 */

const rulesSource = readFileSync('firestore.rules', 'utf-8');

test('Rule #0: uses rules_version 2 and starts with default-deny catch-all', () => {
  assert.match(rulesSource, /rules_version\s*=\s*'2'/);
  assert.match(
    rulesSource,
    /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/
  );
});

test('Dirty Dozen #1 & #2: mandates verified email and rejects unverified admin spoofing', () => {
  assert.match(rulesSource, /function\s+isVerified\(\)\s*\{[^}]*request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rulesSource, /function\s+isBootstrappedAdmin\(\)\s*\{[^}]*isVerified\(\)/);
});

test('Dirty Dozen #3, #5, #6, #7: validates IDs, ownerId immutability, server time, and hasOnly keys', () => {
  assert.match(rulesSource, /function\s+isValidId\(id\)/);
  assert.match(rulesSource, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  assert.match(rulesSource, /incoming\(\)\.ownerId\s*==\s*request\.auth\.uid/);
  assert.match(rulesSource, /incoming\(\)\.ownerId\s*==\s*existing\(\)\.ownerId/);
  assert.match(rulesSource, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rulesSource, /incoming\(\)\.updatedAt\s*==\s*request\.time/);
  assert.match(rulesSource, /\.keys\(\)\.hasOnly\(/);
});

test('Dirty Dozen #4 & #8: prevents self-assigned admin role and isolates PII', () => {
  assert.match(rulesSource, /incoming\(\)\.role\s*!=\s*'admin'\s*\|\|\s*isAdmin\(\)/);
  assert.match(rulesSource, /match\s+\/users\/\{userId\}[\s\S]*match\s+\/private\/\{infoId\}/);
  assert.match(rulesSource, /match\s+\/appUsers\/\{appUserId\}[\s\S]*match\s+\/private\/\{infoId\}/);
});

test('Dirty Dozen #9: list rules evaluate resource.data without get() or exists()', () => {
  const listBlocks = [...rulesSource.matchAll(/allow\s+list:\s*if\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(listBlocks.length >= 10, 'Expected explicit list rules for subcollections');
  for (const expr of listBlocks) {
    if (expr === 'false') continue;
    assert.ok(
      !expr.includes('get(') && !expr.includes('exists('),
      `allow list must not use get() or exists(): ${expr}`
    );
    assert.ok(
      expr.includes('resource.data') || expr.includes('existing()'),
      `allow list must evaluate resource.data: ${expr}`
    );
  }
});

test('Dirty Dozen #10, #11, #12: update rules begin with validation helper, lock terminal status, and bound lists', () => {
  const updateBlocks = [...rulesSource.matchAll(/allow\s+update:\s*if\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(updateBlocks.length >= 10);
  for (const expr of updateBlocks) {
    if (expr === 'false') continue;
    assert.match(expr, /isValid[A-Za-z]+\(incoming\(\)\)/);
  }
  assert.match(rulesSource, /existing\(\)\.status\s*==\s*'pendiente'\s*\|\|\s*isAdmin\(\)/);
  assert.match(rulesSource, /listData\.size\(\)\s*<=\s*20/);
});
