import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../../config.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const DISCORD_API = 'https://discord.com/api/v10';

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    signed: true,
    sameSite: config.isProduction ? 'none' as const : 'lax' as const,
    secure: config.isProduction,
    maxAge: maxAgeMs,
    path: '/'
  };
}

async function discordFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`Discord API failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function authRoutes() {
  const router = Router();

  router.get('/discord', (req, res) => {
    const state = crypto.randomBytes(24).toString('hex');
    res.cookie('oauth_state', state, cookieOptions(10 * 60 * 1000));

    const params = new URLSearchParams({
      client_id: config.discordClientId,
      redirect_uri: config.discordRedirectUri,
      response_type: 'code',
      scope: 'identify guilds',
      state
    });

    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  router.get('/callback', async (req, res, next) => {
    try {
      const code = req.query.code?.toString();
      const state = req.query.state?.toString();
      const cookieState = req.signedCookies.oauth_state as string | undefined;

      if (!code || !state || !cookieState || state !== cookieState) {
        res.status(400).send('Invalid OAuth state.');
        return;
      }

      const body = new URLSearchParams({
        client_id: config.discordClientId,
        client_secret: config.discordClientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.discordRedirectUri
      });

      const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      if (!tokenResponse.ok) {
        const text = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${text}`);
      }

      const token = await tokenResponse.json() as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };

      const discordUser = await discordFetch<{
        id: string;
        username: string;
        global_name?: string | null;
        avatar?: string | null;
      }>('/users/@me', token.access_token);

      const user = await prisma.user.upsert({
        where: { discordId: discordUser.id },
        create: {
          discordId: discordUser.id,
          username: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar ?? null
        },
        update: {
          username: discordUser.global_name || discordUser.username,
          avatar: discordUser.avatar ?? null
        }
      });

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: new Date(Date.now() + token.expires_in * 1000)
        }
      });

      res.clearCookie('oauth_state');
      res.cookie('sid', session.id, cookieOptions(token.expires_in * 1000));
      res.redirect(`${config.frontendUrl}/dashboard`);
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({
      id: req.auth!.user.discordId,
      username: req.auth!.user.username,
      avatar: req.auth!.user.avatar
    });
  });

  router.post('/logout', requireAuth, async (req, res) => {
    await prisma.session.delete({ where: { id: req.auth!.session.id } }).catch(() => undefined);
    res.clearCookie('sid');
    res.json({ ok: true });
  });

  return router;
}
