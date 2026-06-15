import { deployCommands } from '../utils/deploy-commands.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  // Deploy slash commands automatically on startup
  if (client.commands && client.commands.size > 0) {
    const commandsJson = Array.from(client.commands.values()).map((cmd) =>
      cmd.data.toJSON()
    );
    await deployCommands(commandsJson);
  } else {
    console.log('No commands found to deploy.');
  }
}
