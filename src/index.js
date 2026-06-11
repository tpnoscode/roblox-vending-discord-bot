import 'dotenv/config';

const requiredEnv = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.log('Discord bot base setup is ready.');
  console.log(`Missing environment variables for real bot login: ${missingEnv.join(', ')}`);
  console.log('Copy .env.example to .env and fill values when you are ready to connect the bot.');
  process.exit(0);
}

console.log('Environment variables detected. Bot implementation can be added from here.');
console.log('Current stage intentionally does not implement bot login or vending features.');
