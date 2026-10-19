const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function discordLoginUrl() {
  return `${API_BASE}/api/auth/discord`;
}

export function transcriptUrl(guildId: string, ticketId: string) {
  return `${API_BASE}/api/guilds/${guildId}/tickets/${ticketId}/transcript`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const fallback = `Request failed: ${response.status}`;
    let message = fallback;
    try {
      const body = await response.json();
      message = body.error || fallback;
    } catch {
      // ignore non-json errors
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
