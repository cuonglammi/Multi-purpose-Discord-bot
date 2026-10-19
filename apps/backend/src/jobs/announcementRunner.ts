import type { Client, GuildTextBasedChannel } from 'discord.js';
import { prisma } from '../lib/prisma.js';

export function startAnnouncementRunner(client: Client) {
  setInterval(async () => {
    const due = await prisma.scheduledAnnouncement.findMany({
      where: { enabled: true, sendAt: { lte: new Date() } },
      take: 25
    });

    for (const announcement of due) {
      const guild = await client.guilds.fetch(announcement.guildId).catch(() => null);
      const channel = guild ? await guild.channels.fetch(announcement.channelId).catch(() => null) : null;
      if (channel?.isTextBased()) {
        await (channel as GuildTextBasedChannel).send(announcement.message).catch(() => undefined);
      }

      const nextSendAt = announcement.intervalMinutes
        ? new Date(Date.now() + announcement.intervalMinutes * 60_000)
        : announcement.sendAt;

      await prisma.scheduledAnnouncement.update({
        where: { id: announcement.id },
        data: {
          lastSentAt: new Date(),
          sendAt: nextSendAt,
          enabled: Boolean(announcement.intervalMinutes)
        }
      });
    }
  }, 60_000).unref();
}
