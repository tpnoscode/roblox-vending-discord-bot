import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function loadCommands() {
  const commands = new Map();
  const commandsFolder = path.resolve('src/commands');

  if (!fs.existsSync(commandsFolder)) {
    return commands;
  }

  const categories = fs.readdirSync(commandsFolder);
  for (const category of categories) {
    const categoryPath = path.join(commandsFolder, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(categoryPath)
      .filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      const fileUrl = pathToFileURL(filePath).href;
      try {
        const command = await import(fileUrl);
        if (command.data && command.execute) {
          commands.set(command.data.name, command);
        } else {
          console.warn(`Command at ${filePath} is missing required "data" or "execute" export.`);
        }
      } catch (error) {
        console.error(`Failed to load command at ${filePath}:`, error);
      }
    }
  }
  return commands;
}

export async function loadEvents(client) {
  const eventsFolder = path.resolve('src/events');

  if (!fs.existsSync(eventsFolder)) {
    return;
  }

  const eventFiles = fs
    .readdirSync(eventsFolder)
    .filter((file) => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsFolder, file);
    const fileUrl = pathToFileURL(filePath).href;
    try {
      const event = await import(fileUrl);
      if (event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
      } else {
        console.warn(`Event at ${filePath} is missing required "name" or "execute" export.`);
      }
    } catch (error) {
      console.error(`Failed to load event at ${filePath}:`, error);
    }
  }
}
