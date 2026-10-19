import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGuildFetcher, DiscordGuildRateLimitError } from '../src/services/discordGuilds.js';

const guilds = [{ id: '1', name: 'Server', permissions: '8' }];
test('coalesces concurrent requests, caches briefly, and isolates tokens', async () => {
  let calls = 0;
  let time = 0;
  const get = createGuildFetcher(async () => { calls++; return Response.json(guilds); }, () => time);
  const results = await Promise.all(Array.from({ length: 10 }, () => get('a')));
  assert.equal(calls, 1);
  assert.deepEqual(results[0], guilds);
  await get('a');
  assert.equal(calls, 1);
  await get('b');
  assert.equal(calls, 2);
  time = 15_000;
  await get('a');
  assert.equal(calls, 3);
});

test('honors fractional retry_after and allows recovery after cooldown', async () => {
  let time = 0;
  let calls = 0;
  const get = createGuildFetcher(async () => ++calls === 1
    ? Response.json({ retry_after: 2.5 }, { status: 429 }) : Response.json(guilds), () => time);
  await assert.rejects(get('a'), (error: unknown) => error instanceof DiscordGuildRateLimitError && error.retryAfter === 3);
  time = 2499;
  await assert.rejects(get('a'), DiscordGuildRateLimitError);
  assert.equal(calls, 1);
  time = 2500;
  assert.deepEqual(await get('a'), guilds);
  assert.equal(calls, 2);
});

test('uses Retry-After on non-JSON rate limit responses', async () => {
  let calls = 0;
  const get = createGuildFetcher(async () => { calls++; return new Response('limited', { status: 429, headers: { 'Retry-After': '5' } }); });
  await assert.rejects(get('a'), (error: unknown) => error instanceof DiscordGuildRateLimitError && error.retryAfter === 5);
  await assert.rejects(get('a'), DiscordGuildRateLimitError);
  assert.equal(calls, 1);
});

test('never serves expired permissions on failures and releases failed requests', async () => {
  let calls = 0;
  let time = 0;
  const get = createGuildFetcher(async () => ++calls === 1 ? Response.json(guilds) : new Response('', { status: 401 }), () => time);
  await get('a');
  time = 15_000;
  await assert.rejects(get('a'), /401/);
  await assert.rejects(get('a'), /401/);
  assert.equal(calls, 3);
});

test('observes exhausted successful-response buckets beyond cache expiry', async () => {
  let time = 0;
  let calls = 0;
  const get = createGuildFetcher(async () => { calls++; return Response.json(guilds, { headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset-After': '30' } }); }, () => time);
  await get('a');
  time = 15_000;
  await assert.rejects(get('a'), DiscordGuildRateLimitError);
  assert.equal(calls, 1);
  time = 30_000;
  await get('a');
  assert.equal(calls, 2);
});
