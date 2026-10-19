import type { GuildConfig } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export async function ensureGuild(guild: { id: string; name: string; icon?: string | null }) {
  return prisma.guild.upsert({
    where: { id: guild.id },
    create: {
      id: guild.id,
      name: guild.name,
      icon: guild.icon ?? null,
      config: { create: {} }
    },
    update: {
      name: guild.name,
      icon: guild.icon ?? null
    },
    include: { config: true }
  });
}

export async function getOrCreateGuildConfig(guildId: string): Promise<GuildConfig> {
  const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (existing) return existing;
  return prisma.guildConfig.create({
    data: {
      guild: {
        connectOrCreate: {
          where: { id: guildId },
          create: { id: guildId, name: 'Unknown guild' }
        }
      }
    }
  });
}

export function renderTemplate(template: string, values: { user: string; server: string; memberCount?: number }) {
  return template
    .replaceAll('{user}', values.user)
    .replaceAll('{server}', values.server)
    .replaceAll('{memberCount}', String(values.memberCount ?? ''));
}
