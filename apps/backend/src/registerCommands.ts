import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { commandData } from './discord/commands.js';

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function main() {
  const route = config.discordGuildId
    ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
    : Routes.applicationCommands(config.discordClientId);

  await rest.put(route, { body: commandData });
  console.log(
    `Registered ${commandData.length} slash commands ${config.discordGuildId ? `for guild ${config.discordGuildId}` : 'globally'}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
