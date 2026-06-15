import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('테스트')
  .setDescription('봇 작동 여부를 확인합니다.');

export async function execute(interaction) {
  await interaction.reply('안티그래비티 작동중 !');
}
