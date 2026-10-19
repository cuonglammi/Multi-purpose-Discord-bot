import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sid = req.signedCookies.sid as string | undefined;
  if (!sid) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = await prisma.session.findUnique({ where: { id: sid }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    res.clearCookie('sid');
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  req.auth = { session, user: session.user };
  next();
}
