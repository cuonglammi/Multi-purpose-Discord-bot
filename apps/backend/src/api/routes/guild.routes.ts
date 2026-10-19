import { Router } from 'express';
import { ChannelType, EmbedBuilder, type Client, type GuildTextBasedChannel } from 'discord.js';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ensureGuild, getOrCreateGuildConfig } from '../../services/guildConfig.js';
import { hasAdministratorPermission } from '../../services/permissions.js';
import { getUserGuilds } from '../../services/discordGuilds.js';
import { requireAuth } from '../middleware/auth.js';

async function getManageableGuilds(client: Client, accessToken: string) {
  const guilds = await getUserGuilds(accessToken);
  return guilds
    .filter((guild) => hasAdministratorPermission(guild.permissions, guild.owner))
    .filter((guild) => client.guilds.cache.has(guild.id));
}

async function ensureAdminForGuild(client: Client, accessToken: string, guildId: string) {
  const manageable = await getManageableGuilds(client, accessToken);
  return manageable.find((guild) => guild.id === guildId) ?? null;
}

const configSchema = z.object({
  welcomeChannelId: z.string().nullable().optional(),
  welcomeMessage: z.string().min(1).max(1500).optional(),
  goodbyeChannelId: z.string().nullable().optional(),
  goodbyeMessage: z.string().min(1).max(1500).optional(),
  autoRoleId: z.string().nullable().optional(),
  logChannelId: z.string().nullable().optional(),
  antiSpamEnabled: z.boolean().optional(),
  antiSpamMaxMessages: z.number().int().min(2).max(50).optional(),
  antiSpamWindowSeconds: z.number().int().min(2).max(120).optional(),
  antiSpamTimeoutSeconds: z.number().int().min(10).max(2_419_200).optional(),
  xpEnabled: z.boolean().optional(),
  xpCooldownSeconds: z.number().int().min(5).max(3600).optional(),
  xpMin: z.number().int().min(0).max(500).optional(),
  xpMax: z.number().int().min(0).max(500).optional()
});

const announcementSchema = z.object({
  channelId: z.string().min(1),
  message: z.string().min(1).max(2000),
  sendAt: z.string().datetime(),
  intervalMinutes: z.number().int().min(1).max(525600).nullable().optional()
});

const sendEmbedSchema = z.object({
  channelId: z.string().min(1),
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  footer: z.string().max(2048).optional()
});

export function guildRoutes(client: Client) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const guilds = await getManageableGuilds(client, req.auth!.session.accessToken);
      for (const guild of guilds) {
        await ensureGuild({ id: guild.id, name: guild.name, icon: guild.icon ?? null });
      }
      res.json(guilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        botPresent: true
      })));
    } catch (error) {
      next(error);
    }
  });

  router.use('/:guildId', async (req, res, next) => {
    try {
      const guild = await ensureAdminForGuild(client, req.auth!.session.accessToken, req.params.guildId);
      if (!guild) {
        res.status(403).json({ error: 'You must be a server administrator and the bot must be in this guild.' });
        return;
      }
      await ensureGuild({ id: guild.id, name: guild.name, icon: guild.icon ?? null });
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/config', async (req, res, next) => {
    try {
      const config = await getOrCreateGuildConfig(req.params.guildId);
      res.json(config);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:guildId/config', async (req, res, next) => {
    try {
      const data = configSchema.parse(req.body);
      if (data.xpMax !== undefined && data.xpMin !== undefined && data.xpMax < data.xpMin) {
        res.status(400).json({ error: 'xpMax must be greater than or equal to xpMin.' });
        return;
      }
      const updated = await prisma.guildConfig.upsert({
        where: { guildId: req.params.guildId },
        create: { guildId: req.params.guildId, ...data },
        update: data
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/channels', async (req, res, next) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      const channels = await guild.channels.fetch();
      res.json(
        channels
          .filter((channel) => channel && [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type))
          .map((channel) => ({ id: channel!.id, name: channel!.name, type: channel!.type }))
      );
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/roles', async (req, res, next) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId);
      const roles = await guild.roles.fetch();
      res.json(
        roles
          .filter((role) => role.name !== '@everyone')
          .sort((a, b) => b.position - a.position)
          .map((role) => ({ id: role.id, name: role.name, position: role.position }))
      );
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/moderation', async (req, res, next) => {
    try {
      const actions = await prisma.moderationAction.findMany({
        where: { guildId: req.params.guildId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(actions);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/leaderboard', async (req, res, next) => {
    try {
      const members = await prisma.member.findMany({
        where: { guildId: req.params.guildId },
        orderBy: [{ level: 'desc' }, { xp: 'desc' }],
        take: 50
      });
      res.json(members);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/activity', async (req, res, next) => {
    try {
      const [moderation, commands, warnings, tickets] = await Promise.all([
        prisma.moderationAction.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma.commandLog.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma.warning.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma.ticket.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: 'desc' }, take: 10 })
      ]);

      const items = [
        ...moderation.map((item) => ({ kind: 'moderation', at: item.createdAt, item })),
        ...commands.map((item) => ({ kind: 'command', at: item.createdAt, item })),
        ...warnings.map((item) => ({ kind: 'warning', at: item.createdAt, item })),
        ...tickets.map((item) => ({ kind: 'ticket', at: item.createdAt, item }))
      ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 25);

      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/analytics', async (req, res, next) => {
    try {
      const [snapshots, commandUsage] = await Promise.all([
        prisma.memberSnapshot.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: 'asc' }, take: 90 }),
        prisma.commandLog.groupBy({ by: ['commandName'], where: { guildId: req.params.guildId }, _count: { commandName: true } })
      ]);
      res.json({ snapshots, commandUsage: commandUsage.map((row) => ({ commandName: row.commandName, count: row._count.commandName })) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/tickets', async (req, res, next) => {
    try {
      const tickets = await prisma.ticket.findMany({
        where: { guildId: req.params.guildId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:guildId/tickets/:ticketId/transcript', async (req, res, next) => {
    try {
      const ticket = await prisma.ticket.findFirst({ where: { id: req.params.ticketId, guildId: req.params.guildId } });
      if (!ticket?.transcriptHtml) {
        res.status(404).send('Transcript not found.');
        return;
      }
      res.type('html').send(ticket.transcriptHtml);
    } catch (error) {
      next(error);
    }
  });


  router.get('/:guildId/announcements', async (req, res, next) => {
    try {
      const announcements = await prisma.scheduledAnnouncement.findMany({
        where: { guildId: req.params.guildId },
        orderBy: { sendAt: 'asc' },
        take: 100
      });
      res.json(announcements);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:guildId/announcements', async (req, res, next) => {
    try {
      const data = announcementSchema.parse(req.body);
      const announcement = await prisma.scheduledAnnouncement.create({
        data: {
          guildId: req.params.guildId,
          channelId: data.channelId,
          message: data.message,
          sendAt: new Date(data.sendAt),
          intervalMinutes: data.intervalMinutes ?? null
        }
      });
      res.status(201).json(announcement);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:guildId/send-embed', async (req, res, next) => {
    try {
      const data = sendEmbedSchema.parse(req.body);
      const guild = await client.guilds.fetch(req.params.guildId);
      const channel = await guild.channels.fetch(data.channelId);
      if (!channel?.isTextBased()) {
        res.status(400).json({ error: 'Channel is not text-based.' });
        return;
      }

      const embed = new EmbedBuilder();
      if (data.title) embed.setTitle(data.title);
      if (data.description) embed.setDescription(data.description);
      if (data.color) embed.setColor(Number.parseInt(data.color.replace('#', ''), 16));
      if (data.footer) embed.setFooter({ text: data.footer });
      embed.setTimestamp(new Date());

      await (channel as GuildTextBasedChannel).send({ embeds: [embed] });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
