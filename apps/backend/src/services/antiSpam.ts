import type { Message } from 'discord.js';
import { prisma } from '../lib/prisma.js';
import { getOrCreateGuildConfig } from './guildConfig.js';
import { baseLogEmbed, sendGuildLog } from './logging.js';

const buckets = new Map<string, number[]>();

export async function handleAntiSpam(message: Message<true>) {
  if (!message.member || message.author.bot) return;

  const config = await getOrCreateGuildConfig(message.guild.id);
  if (!config.antiSpamEnabled) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const windowMs = config.antiSpamWindowSeconds * 1000;
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp <= windowMs);
  recent.push(now);
  buckets.set(key, recent);

  if (recent.length < config.antiSpamMaxMessages) return;
  buckets.set(key, []);

  const reason = `Anti-spam: ${recent.length} messages in ${config.antiSpamWindowSeconds}s`;
  await message.member.timeout(config.antiSpamTimeoutSeconds * 1000, reason).catch(() => undefined);
  await message.author.send(`You were timed out in ${message.guild.name}. Reason: ${reason}`).catch(() => undefined);

  await prisma.moderationAction.create({
    data: {
      guildId: message.guild.id,
      targetId: message.author.id,
      moderatorId: message.client.user?.id ?? 'bot',
      type: 'TIMEOUT',
      reason,
      durationSeconds: config.antiSpamTimeoutSeconds
    }
  });

  await sendGuildLog(
    message.client,
    message.guild.id,
    baseLogEmbed('Anti-spam timeout')
      .setDescription(`${message.author.tag} was timed out.`)
      .addFields({ name: 'Reason', value: reason })
  );
}
