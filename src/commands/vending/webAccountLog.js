import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('웹계정로그')
  .setDescription('이 채널을 웹 회원가입(아이디/비번) 로그 채널로 지정합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const dbData = db.read();
  if (!dbData.config) {
    dbData.config = {};
  }
  dbData.config.webAccountLogChannelId = interaction.channelId;
  db.write(dbData);

  await interaction.reply({
    content: `✅ 이 채널을 웹 회원가입 로그 채널로 지정했습니다. ` +
             `앞으로 웹에서 가입하는 모든 계정의 아이디/비밀번호가 이곳에 표시됩니다.`,
    ephemeral: true,
  });
}
