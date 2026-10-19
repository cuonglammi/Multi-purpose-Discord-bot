import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_REDIRECT_URI: z.string().url(),
  DISCORD_GUILD_ID: z.string().optional().default(''),
  REGISTER_COMMANDS_ON_START: z.string().optional().default('false'),
  DATABASE_URL: z.string().min(1),
  BACKEND_PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  COOKIE_SECRET: z.string().min(16),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

const env = schema.parse(process.env);

export const config = {
  discordToken: env.DISCORD_TOKEN,
  discordClientId: env.DISCORD_CLIENT_ID,
  discordClientSecret: env.DISCORD_CLIENT_SECRET,
  discordRedirectUri: env.DISCORD_REDIRECT_URI,
  discordGuildId: env.DISCORD_GUILD_ID || undefined,
  registerCommandsOnStart: env.REGISTER_COMMANDS_ON_START === 'true',
  databaseUrl: env.DATABASE_URL,
  port: env.BACKEND_PORT,
  frontendUrl: env.FRONTEND_URL,
  cookieSecret: env.COOKIE_SECRET,
  isProduction: env.NODE_ENV === 'production'
};
