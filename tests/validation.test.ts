import test from 'node:test';
import assert from 'node:assert/strict';
import { validRecord, validWriteOrigin } from '../lib/validation.ts';

const profile = { avatar: '', name: 'Reader', tagline: '', fields: [['Full name','Reader']], about: '', events: [], memories: [], gallery: [] };
test('accepts valid profile state and rejects malformed shapes', () => {
  assert.equal(validRecord('lumin.v4', JSON.stringify(profile)), true);
  assert.equal(validRecord('lumin.v4', JSON.stringify({ ...profile, fields: null })), false);
  assert.equal(validRecord('lumin.v4', JSON.stringify({ ...profile, events: {} })), false);
  assert.equal(validRecord('lumin.v4', '{'), false);
});
test('rejects arbitrary keys, external image URLs and oversized profile fields', () => {
  assert.equal(validRecord('other-user', '{}'), false);
  assert.equal(validRecord('lumin.logo', 'https://example.com/photo.jpg'), false);
  assert.equal(validRecord('lumin.v4', JSON.stringify({ ...profile, name: 'a'.repeat(301) })), false);
  assert.equal(validRecord('lumin.logo', '/api/media?id=550e8400-e29b-41d4-a716-446655440000.jpg'), true);
});
test('validates chat roles and score shapes', () => {
  assert.equal(validRecord('lumin.chat', JSON.stringify([{ role: 'user', content: 'Hello' }])), true);
  assert.equal(validRecord('lumin.chat', JSON.stringify([{ role: 'system', content: 'Hello' }])), false);
  assert.equal(validRecord('lumin.lb.v1', JSON.stringify({xox:{},puz:[],sud:[],quiz:[]})), true);
  assert.equal(validRecord('lumin.puzbest4', '23'), true);
  assert.equal(validRecord('lumin.puzbest4', 'NaN'), false);
});
test('requires same-origin browser mutations', () => {
  assert.equal(validWriteOrigin(new Request('https://lumin.example/api/state', { headers: { origin: 'https://lumin.example' } })), true);
  assert.equal(validWriteOrigin(new Request('https://lumin.example/api/state', { headers: { origin: 'https://other.example' } })), false);
  assert.equal(validWriteOrigin(new Request('https://lumin.example/api/state')), false);
});
