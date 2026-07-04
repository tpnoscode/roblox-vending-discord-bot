import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands, loadEvents } from './utils/loader.js';
import * as pushbullet from './utils/pushbullet.js';

// 개별 interaction 처리 중 놓친 예외 하나가 봇 프로세스 전체를 죽이지 않도록.
// (프로세스가 죽으면 docker가 재시작하긴 하지만, 그 사이 자동충전 매칭/구매가 전부 끊김)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection (봇은 계속 실행됨):', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (봇은 계속 실행됨):', err);
});

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
    // Initialize and start Pushbullet connection
    pushbullet.init(client);
    pushbullet.start();
  } catch (error) {
    console.error('Failed to log in to Discord:', error);
    process.exit(1);
  }
}

start();
