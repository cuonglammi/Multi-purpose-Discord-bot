import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../config.js';
import { registerDiscordEvents } from '../discord/events.js';

export const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

export async function startDiscord(): Promise<void> {
  registerDiscordEvents(discord);
  await discord.login(config.discordToken);
}
