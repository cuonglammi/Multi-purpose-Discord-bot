import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Client } from 'discord.js';
import { DiscordGuildRateLimitError } from '../services/discordGuilds.js';
import { config } from '../config.js';
import { authRoutes } from './routes/auth.routes.js';
import { guildRoutes } from './routes/guild.routes.js';

export function createApp(client: Client) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(config.cookieSecret));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes());
  app.use('/api/guilds', guildRoutes(client));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof DiscordGuildRateLimitError) {
      res.setHeader('Retry-After', String(error.retryAfter));
      res.status(429).json({ error: error.message, retryAfter: error.retryAfter });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
