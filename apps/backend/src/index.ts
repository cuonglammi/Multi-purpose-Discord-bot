import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { createApp } from './api/app.js';
import { discord, startDiscord } from './lib/discord.js';
import { commandData } from './discord/commands.js';
import { startAnnouncementRunner } from './jobs/announcementRunner.js';

async function maybeRegisterCommands() {
  if (!config.registerCommandsOnStart) return;

  const rest = new REST({ version: '10' }).setToken(config.discordToken);
  const route = config.discordGuildId
    ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
    : Routes.applicationCommands(config.discordClientId);
  await rest.put(route, { body: commandData });
  console.log('Slash commands registered on startup.');
}

async function main() {
  await maybeRegisterCommands();
  await startDiscord();

  const app = createApp(discord);
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });

  startAnnouncementRunner(discord);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
