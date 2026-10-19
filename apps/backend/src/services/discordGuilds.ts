import { createHash } from 'node:crypto';

export type DiscordUserGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions?: string;
};

export class DiscordGuildRateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super(`Discord is temporarily rate limiting server access. Try again in ${retryAfter} seconds.`);
  }
}

// Permissions are cached briefly, never served stale after expiry or a failed refresh.
const CACHE_TTL_MS = 15_000;
type Entry = {
  guilds?: DiscordUserGuild[];
  expiresAt: number;
  retryAt: number;
  pending?: Promise<DiscordUserGuild[]>;
};

export function createGuildFetcher(fetcher: typeof fetch = fetch, now = Date.now) {
  const entries = new Map<string, Entry>();

  return async function getUserGuilds(accessToken: string): Promise<DiscordUserGuild[]> {
    const time = now();
    for (const [key, entry] of entries) {
      if (!entry.pending && entry.expiresAt <= time && entry.retryAt <= time) entries.delete(key);
    }
    // Avoid retaining raw OAuth tokens in cache keys.
    const key = createHash('sha256').update(accessToken).digest('hex');
    let entry = entries.get(key);
    if (!entry) {
      entry = { expiresAt: 0, retryAt: 0 };
      entries.set(key, entry);
    }
    if (entry.guilds && entry.expiresAt > time) return entry.guilds;
    if (entry.pending) return entry.pending;
    if (entry.retryAt > time) {
      throw new DiscordGuildRateLimitError(Math.ceil((entry.retryAt - time) / 1000));
    }

    const current = entry;
    current.pending = (async () => {
      const response = await fetcher('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000)
      });
      if (response.status === 429) {
        const body = await response.json().catch(() => null) as { retry_after?: unknown } | null;
        const delays = [body?.retry_after, response.headers.get('Retry-After'), response.headers.get('X-RateLimit-Reset-After')]
          .map(Number).filter((value) => Number.isFinite(value) && value > 0);
        const seconds = delays.length ? Math.max(...delays) : 1;
        current.retryAt = now() + Math.ceil(seconds * 1000);
        throw new DiscordGuildRateLimitError(Math.ceil(seconds));
      }
      if (!response.ok) throw new Error(`Unable to fetch Discord guilds: ${response.status}`);
      const guilds = await response.json() as DiscordUserGuild[];
      current.guilds = guilds;
      current.expiresAt = now() + CACHE_TTL_MS;
      if (response.headers.get('X-RateLimit-Remaining') === '0') {
        const seconds = Number(response.headers.get('X-RateLimit-Reset-After'));
        if (Number.isFinite(seconds) && seconds > 0) current.retryAt = now() + Math.ceil(seconds * 1000);
      }
      return guilds;
    })();
    try {
      return await current.pending;
    } finally {
      current.pending = undefined;
    }
  };
}

export const getUserGuilds = createGuildFetcher();
