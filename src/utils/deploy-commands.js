import { REST, Routes } from 'discord.js';
import 'dotenv/config';

export async function deployCommands(commands) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in environment.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    let data;
    if (guildId && guildId.trim() !== '') {
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`Successfully reloaded ${data.length} guild-specific application (/) commands.`);
    } else {
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
    }
    return data;
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}
