import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember
} from 'discord.js';
import { prisma } from '../lib/prisma.js';
import { buildRankCardAttachment } from '../services/xp.js';
import { baseLogEmbed, sendGuildLog } from '../services/logging.js';
import { createTicket, closeTicket } from '../services/tickets.js';

export const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check whether the bot is online.'),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member and DM them.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member and DM them.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member and DM them.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member and DM them.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('user').setDescription('Member to timeout').setRequired(true))
    .addIntegerOption((option) => option.setName('minutes').setDescription('Timeout duration in minutes').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason').setRequired(false)),
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your XP rank card.')
    .addUserOption((option) => option.setName('user').setDescription('Member').setRequired(false)),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Show the top XP members.'),
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open or close a support ticket.')
    .addSubcommand((sub) => sub.setName('open').setDescription('Open a private support ticket'))
    .addSubcommand((sub) => sub.setName('close').setDescription('Close the current ticket'))
];

export const commandData = commands.map((command) => command.toJSON());

async function ensureCachedInteraction(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({ content: 'This command only works inside a server.', ephemeral: true });
    return null;
  }
  return interaction;
}

async function getTargetMember(interaction: ChatInputCommandInteraction<'cached'>) {
  const user = interaction.options.getUser('user', true);
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  return { user, member };
}

async function safeDm(member: GuildMember | null, message: string) {
  if (!member) return false;
  await member.send(message).catch(() => undefined);
  return true;
}

async function logCommand(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;
  await prisma.commandLog.create({
    data: {
      guildId: interaction.guildId,
      commandName: interaction.commandName,
      userId: interaction.user.id
    }
  }).catch(() => undefined);
}

async function handleWarn(interaction: ChatInputCommandInteraction<'cached'>) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: 'You need Moderate Members permission.', ephemeral: true });
    return;
  }

  const { user, member } = await getTargetMember(interaction);
  const reason = interaction.options.getString('reason', true);

  await safeDm(member, `You were warned in ${interaction.guild.name}. Reason: ${reason}`);
  await prisma.warning.create({ data: { guildId: interaction.guildId, userId: user.id, moderatorId: interaction.user.id, reason } });
  await prisma.moderationAction.create({ data: { guildId: interaction.guildId, targetId: user.id, moderatorId: interaction.user.id, type: 'WARN', reason } });

  await sendGuildLog(
    interaction.client,
    interaction.guildId,
    baseLogEmbed('Member warned')
      .setDescription(`${user.tag} was warned by ${interaction.user.tag}.`)
      .addFields({ name: 'Reason', value: reason })
  );

  await interaction.reply({ content: `Warned ${user.tag}.`, ephemeral: true });
}

async function handleKick(interaction: ChatInputCommandInteraction<'cached'>) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({ content: 'You need Kick Members permission.', ephemeral: true });
    return;
  }

  const { user, member } = await getTargetMember(interaction);
  if (!member) {
    await interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    return;
  }

  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  await safeDm(member, `You were kicked from ${interaction.guild.name}. Reason: ${reason}`);
  await member.kick(reason);
  await prisma.moderationAction.create({ data: { guildId: interaction.guildId, targetId: user.id, moderatorId: interaction.user.id, type: 'KICK', reason } });

  await sendGuildLog(interaction.client, interaction.guildId, baseLogEmbed('Member kicked').setDescription(`${user.tag} was kicked.`).addFields({ name: 'Reason', value: reason }));
  await interaction.reply({ content: `Kicked ${user.tag}.`, ephemeral: true });
}

async function handleBan(interaction: ChatInputCommandInteraction<'cached'>) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: 'You need Ban Members permission.', ephemeral: true });
    return;
  }

  const { user, member } = await getTargetMember(interaction);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  await safeDm(member, `You were banned from ${interaction.guild.name}. Reason: ${reason}`);
  await interaction.guild.members.ban(user.id, { reason });
  await prisma.moderationAction.create({ data: { guildId: interaction.guildId, targetId: user.id, moderatorId: interaction.user.id, type: 'BAN', reason } });

  await sendGuildLog(interaction.client, interaction.guildId, baseLogEmbed('Member banned').setDescription(`${user.tag} was banned.`).addFields({ name: 'Reason', value: reason }));
  await interaction.reply({ content: `Banned ${user.tag}.`, ephemeral: true });
}

async function handleTimeout(interaction: ChatInputCommandInteraction<'cached'>) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: 'You need Moderate Members permission.', ephemeral: true });
    return;
  }

  const { user, member } = await getTargetMember(interaction);
  if (!member) {
    await interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    return;
  }

  const minutes = interaction.options.getInteger('minutes', true);
  const reason = interaction.options.getString('reason') ?? 'No reason provided';
  await safeDm(member, `You were timed out in ${interaction.guild.name} for ${minutes} minute(s). Reason: ${reason}`);
  await member.timeout(minutes * 60_000, reason);
  await prisma.moderationAction.create({ data: { guildId: interaction.guildId, targetId: user.id, moderatorId: interaction.user.id, type: 'TIMEOUT', reason, durationSeconds: minutes * 60 } });

  await sendGuildLog(interaction.client, interaction.guildId, baseLogEmbed('Member timed out').setDescription(`${user.tag} was timed out for ${minutes} minute(s).`).addFields({ name: 'Reason', value: reason }));
  await interaction.reply({ content: `Timed out ${user.tag} for ${minutes} minute(s).`, ephemeral: true });
}

async function handleRank(interaction: ChatInputCommandInteraction<'cached'>) {
  const user = interaction.options.getUser('user') ?? interaction.user;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    return;
  }
  const attachment = await buildRankCardAttachment(member);
  await interaction.reply({ files: [attachment] });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction<'cached'>) {
  const top = await prisma.member.findMany({
    where: { guildId: interaction.guildId },
    orderBy: [{ level: 'desc' }, { xp: 'desc' }],
    take: 10
  });

  const description = top.length
    ? top.map((member, index) => `**${index + 1}.** <@${member.userId}> — Level ${member.level}, ${member.xp} XP`).join('\n')
    : 'No XP yet.';

  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('XP Leaderboard').setDescription(description)] });
}

export async function handleInteraction(interaction: ChatInputCommandInteraction) {
  await logCommand(interaction);
  const cached = await ensureCachedInteraction(interaction);
  if (!cached) return;

  try {
    switch (cached.commandName) {
      case 'ping':
        await cached.reply({ content: `Pong: ${cached.client.ws.ping}ms`, ephemeral: true });
        break;
      case 'warn':
        await handleWarn(cached);
        break;
      case 'kick':
        await handleKick(cached);
        break;
      case 'ban':
        await handleBan(cached);
        break;
      case 'timeout':
        await handleTimeout(cached);
        break;
      case 'rank':
        await handleRank(cached);
        break;
      case 'leaderboard':
        await handleLeaderboard(cached);
        break;
      case 'ticket': {
        const subcommand = cached.options.getSubcommand();
        if (subcommand === 'open') await createTicket(cached);
        if (subcommand === 'close') await closeTicket(cached);
        break;
      }
      default:
        await cached.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    const content = 'Command failed. Check my role hierarchy and permissions, then try again.';
    if (cached.replied || cached.deferred) await cached.followUp({ content, ephemeral: true });
    else await cached.reply({ content, ephemeral: true });
  }
}
