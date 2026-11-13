import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppUserPayload,
  buildEmployeePayload,
  buildRoomPayload,
  buildWorkspaceConfigPayload,
  normalizeDocId,
} from './firestorePayload';
import {
  INITIAL_CONFIG,
  INITIAL_EMPLOYEES,
  INITIAL_ROOMS,
  INITIAL_USERS,
} from '../data/mockData';

test('normalizeDocId converts spaces and unsafe characters into valid Firestore IDs', () => {
  assert.equal(normalizeDocId('Pack Outs'), 'Pack_Outs');
  assert.equal(normalizeDocId('P10'), 'P10');
  assert.equal(normalizeDocId('../bad/id!'), 'bad_id');
  assert.ok(/^[a-zA-Z0-9_\-]+$/.test(normalizeDocId('Pack Outs')));
});

test('buildRoomPayload preserves originalId for rooms with spaces while producing valid doc ID', () => {
  const packOuts = INITIAL_ROOMS.find((r) => r.id === 'Pack Outs')!;
  const payload = buildRoomPayload(packOuts, 'keystone_plant', 'uid_1', ['uid_1'], 't1', 't2');
  assert.equal(payload.id, 'Pack_Outs');
  assert.equal(payload.originalId, 'Pack Outs');
  assert.ok(!Object.values(payload).includes(undefined));
});

test('buildAppUserPayload and buildEmployeePayload omit PII fields like email and phone', () => {
  const userPayload = buildAppUserPayload(
    INITIAL_USERS[0],
    'keystone_plant',
    'uid_1',
    ['uid_1'],
    't1',
    't2'
  );
  assert.equal('email' in userPayload, false);

  const empPayload = buildEmployeePayload(
    { ...INITIAL_EMPLOYEES[0], phone: '555-0199' },
    'keystone_plant',
    'uid_1',
    ['uid_1'],
    't1',
    't2'
  );
  assert.equal('phone' in empPayload, false);
  assert.equal('email' in empPayload, false);
});

test('buildWorkspaceConfigPayload clamps strings and memberUids safely', () => {
  const oversizedConfig = {
    ...INITIAL_CONFIG,
    appName: 'X'.repeat(200),
  };
  const manyUids = Array.from({ length: 35 }, (_, i) => `uid_${i}`);
  const payload = buildWorkspaceConfigPayload(
    oversizedConfig,
    'keystone_plant',
    'owner_uid',
    manyUids,
    't1',
    't2'
  );
  assert.equal(payload.appName.length, 80);
  assert.equal(payload.memberUids.length, 20);
  assert.equal(payload.memberUids[0], 'owner_uid');
});
