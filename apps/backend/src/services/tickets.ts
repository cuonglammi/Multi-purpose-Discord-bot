import {
  ChannelType,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Message
} from 'discord.js';
import { prisma } from '../lib/prisma.js';

function escapeHtml(input: string) {
  return input.replace(/[<>&"']/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#039;'
  }[char] ?? char));
}

export async function createTicket(interaction: ChatInputCommandInteraction<'cached'>) {
  const existing = await prisma.ticket.findFirst({
    where: {
      guildId: interaction.guildId,
      openerId: interaction.user.id,
      status: 'OPEN'
    }
  });

  if (existing?.channelId) {
    await interaction.reply({ content: `You already have an open ticket: <#${existing.channelId}>`, ephemeral: true });
    return;
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 90),
    type: ChannelType.GuildText,
    reason: `Ticket opened by ${interaction.user.tag}`,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }
    ]
  });

  await prisma.ticket.create({
    data: {
      guildId: interaction.guildId,
      channelId: channel.id,
      openerId: interaction.user.id
    }
  });

  await channel.send(`Hi ${interaction.user}. Staff will be with you soon. Use \`/ticket close\` when finished.`);
  await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
}

export async function captureTicketMessage(message: Message<true>) {
  if (message.author.bot) return;
  const ticket = await prisma.ticket.findFirst({
    where: { guildId: message.guild.id, channelId: message.channel.id, status: 'OPEN' }
  });
  if (!ticket) return;

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: message.author.id,
      authorTag: message.author.tag,
      content: message.content || '[non-text message]'
    }
  });
}

export async function closeTicket(interaction: ChatInputCommandInteraction<'cached'>) {
  const ticket = await prisma.ticket.findFirst({
    where: { guildId: interaction.guildId, channelId: interaction.channelId, status: 'OPEN' },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  if (!ticket) {
    await interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    return;
  }

  const rows = ticket.messages.map((msg) => {
    return `<p><strong>${escapeHtml(msg.authorTag)}</strong> <small>${msg.createdAt.toISOString()}</small><br/>${escapeHtml(msg.content)}</p>`;
  }).join('\n');

  const transcript = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket transcript</title><style>body{font-family:system-ui;padding:24px;line-height:1.45}p{border-bottom:1px solid #ddd;padding:12px 0}</style></head><body><h1>Ticket ${ticket.id}</h1>${rows}</body></html>`;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'CLOSED',
      transcriptHtml: transcript,
      closedById: interaction.user.id,
      closedAt: new Date()
    }
  });

  await interaction.reply('Ticket closed. This channel will be locked. Transcript was saved to the dashboard.');

  const channel = interaction.channel;
  if (channel?.isTextBased() && 'permissionOverwrites' in channel) {
    await channel.permissionOverwrites.edit(ticket.openerId, { SendMessages: false }).catch(() => undefined);
  }
}
