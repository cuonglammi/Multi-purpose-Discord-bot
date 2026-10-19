import type { GuildMember } from 'discord.js';
import { AttachmentBuilder } from 'discord.js';
import { prisma } from '../lib/prisma.js';
import { getOrCreateGuildConfig } from './guildConfig.js';

const cooldowns = new Map<string, number>();

export function levelFromXp(xp: number) {
  return Math.floor(Math.sqrt(xp / 100));
}

export function xpNeededForLevel(level: number) {
  return level * level * 100;
}

export async function awardMessageXp(member: GuildMember) {
  const config = await getOrCreateGuildConfig(member.guild.id);
  if (!config.xpEnabled) return null;

  const key = `${member.guild.id}:${member.id}`;
  const now = Date.now();
  const last = cooldowns.get(key) ?? 0;
  if (now - last < config.xpCooldownSeconds * 1000) return null;
  cooldowns.set(key, now);

  const min = Math.max(0, config.xpMin);
  const max = Math.max(min, config.xpMax);
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;

  const existing = await prisma.member.findUnique({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } }
  });

  const nextXp = (existing?.xp ?? 0) + amount;
  const nextLevel = levelFromXp(nextXp);

  const updated = await prisma.member.upsert({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
    create: {
      guildId: member.guild.id,
      userId: member.id,
      username: member.user.tag,
      xp: nextXp,
      level: nextLevel,
      messages: 1,
      joinedAt: member.joinedAt
    },
    update: {
      username: member.user.tag,
      xp: nextXp,
      level: nextLevel,
      messages: { increment: 1 }
    }
  });

  return {
    member: updated,
    gained: amount,
    leveledUp: nextLevel > (existing?.level ?? 0)
  };
}

function escapeXml(input: string) {
  return input.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;'
  }[char] ?? char));
}

export async function buildRankCardAttachment(member: GuildMember) {
  const data = await prisma.member.findUnique({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } }
  });

  const xp = data?.xp ?? 0;
  const level = data?.level ?? levelFromXp(xp);
  const currentLevelXp = xpNeededForLevel(level);
  const nextLevelXp = xpNeededForLevel(level + 1);
  const progress = Math.min(1, Math.max(0, (xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)));
  const width = 760;
  const fill = Math.round(520 * progress);
  const initials = member.displayName.slice(0, 2).toUpperCase();

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="220" viewBox="0 0 ${width} 220">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="760" height="220" rx="28" fill="url(#bg)"/>
  <circle cx="102" cy="110" r="62" fill="#4f46e5"/>
  <text x="102" y="124" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#fff">${escapeXml(initials)}</text>
  <text x="190" y="76" font-family="Arial" font-size="34" font-weight="700" fill="#fff">${escapeXml(member.displayName)}</text>
  <text x="190" y="112" font-family="Arial" font-size="20" fill="#c7d2fe">Level ${level} • ${xp} XP</text>
  <rect x="190" y="142" width="520" height="24" rx="12" fill="#1f2937"/>
  <rect x="190" y="142" width="${fill}" height="24" rx="12" fill="#22c55e"/>
  <text x="190" y="190" font-family="Arial" font-size="16" fill="#e5e7eb">${nextLevelXp - xp} XP until level ${level + 1}</text>
</svg>`;

  return new AttachmentBuilder(Buffer.from(svg), { name: 'rank-card.svg' });
}
