import {
  EmbedBuilder,
  type Client,
  type Message,
  type PartialMessage
} from 'discord.js';
import { ensureGuild, getOrCreateGuildConfig, renderTemplate } from '../services/guildConfig.js';
import { awardMessageXp } from '../services/xp.js';
import { handleAntiSpam } from '../services/antiSpam.js';
import { captureTicketMessage } from '../services/tickets.js';
import { baseLogEmbed, sendGuildLog } from '../services/logging.js';
import { handleInteraction } from './commands.js';
import { prisma } from '../lib/prisma.js';

async function sendConfiguredMessage(client: Client, guildId: string, channelId: string | null, content: string) {
  if (!channelId) return;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  const channel = guild ? await guild.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased()) return;
  await channel.send(content).catch(() => undefined);
}

function messageAuthorLine(message: Message | PartialMessage) {
  return message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown user';
}

export function registerDiscordEvents(client: Client) {
  client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    for (const [, guild] of client.guilds.cache) {
      await ensureGuild({ id: guild.id, name: guild.name, icon: guild.iconURL() });
      await prisma.memberSnapshot.create({ data: { guildId: guild.id, memberCount: guild.memberCount } }).catch(() => undefined);
    }
  });

  client.on('guildCreate', async (guild) => {
    await ensureGuild({ id: guild.id, name: guild.name, icon: guild.iconURL() });
  });

  client.on('guildMemberAdd', async (member) => {
    await ensureGuild({ id: member.guild.id, name: member.guild.name, icon: member.guild.iconURL() });
    const config = await getOrCreateGuildConfig(member.guild.id);

    if (config.autoRoleId) {
      await member.roles.add(config.autoRoleId, 'Configured auto-role').catch(() => undefined);
    }

    await prisma.member.upsert({
      where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
      create: { guildId: member.guild.id, userId: member.id, username: member.user.tag, joinedAt: member.joinedAt },
      update: { username: member.user.tag, joinedAt: member.joinedAt }
    });

    await sendConfiguredMessage(
      client,
      member.guild.id,
      config.welcomeChannelId,
      renderTemplate(config.welcomeMessage, { user: `${member}`, server: member.guild.name, memberCount: member.guild.memberCount })
    );
  });

  client.on('guildMemberRemove', async (member) => {
    const config = await getOrCreateGuildConfig(member.guild.id);
    await sendConfiguredMessage(
      client,
      member.guild.id,
      config.goodbyeChannelId,
      renderTemplate(config.goodbyeMessage, { user: member.user.tag, server: member.guild.name, memberCount: member.guild.memberCount })
    );
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await handleInteraction(interaction);
  });

  client.on('messageCreate', async (message) => {
    if (!message.inGuild() || message.author.bot) return;
    await captureTicketMessage(message);
    await handleAntiSpam(message);
    const result = message.member ? await awardMessageXp(message.member) : null;

    if (result?.leveledUp) {
      await message.channel.send(`${message.author} leveled up to **${result.member.level}**!`).catch(() => undefined);
    }
  });

  client.on('messageDelete', async (message) => {
    if (!message.guildId) return;
    const embed = baseLogEmbed('Message deleted')
      .addFields(
        { name: 'Author', value: messageAuthorLine(message), inline: false },
        { name: 'Channel', value: message.channel?.toString() ?? message.channelId ?? 'Unknown', inline: true },
        { name: 'Content', value: message.content?.slice(0, 1024) || '[empty or unavailable]', inline: false }
      );
    await sendGuildLog(client, message.guildId, embed);
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guildId) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setTitle('Message edited')
      .setTimestamp(new Date())
      .addFields(
        { name: 'Author', value: messageAuthorLine(newMessage), inline: false },
        { name: 'Channel', value: newMessage.channel?.toString() ?? newMessage.channelId ?? 'Unknown', inline: true },
        { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '[empty or unavailable]', inline: false },
        { name: 'After', value: newMessage.content?.slice(0, 1024) || '[empty or unavailable]', inline: false }
      );
    await sendGuildLog(client, newMessage.guildId, embed);
  });


}
