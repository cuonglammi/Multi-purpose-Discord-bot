import { EmbedBuilder, type Client, type GuildTextBasedChannel } from 'discord.js';
import { getOrCreateGuildConfig } from './guildConfig.js';

export async function sendGuildLog(client: Client, guildId: string, embed: EmbedBuilder) {
  const config = await getOrCreateGuildConfig(guildId);
  if (!config.logChannelId) return;

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  await (channel as GuildTextBasedChannel).send({ embeds: [embed] }).catch(() => undefined);
}

export function baseLogEmbed(title: string) {
  return new EmbedBuilder().setTitle(title).setTimestamp(new Date());
}
