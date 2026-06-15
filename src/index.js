import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands, loadEvents } from './utils/loader.js';

const requiredEnv = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Please configure your .env file before running the bot.');
  process.exit(1);
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// Create collection for commands
client.commands = new Collection();

async function start() {
  console.log('Initializing bot...');

  // Load commands
  const loadedCommands = await loadCommands();
  for (const [name, command] of loadedCommands) {
    client.commands.set(name, command);
  }
  console.log(`Loaded ${client.commands.size} commands.`);

  // Load events
  await loadEvents(client);
  console.log('Loaded event handlers.');

  // Log in to Discord with token
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error('Failed to log in to Discord:', error);
    process.exit(1);
  }
}

start();
