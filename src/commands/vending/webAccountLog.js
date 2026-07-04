import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('웹계정로그')
  .setDescription('이 채널을 웹 회원가입(아이디/비번) 로그 채널로 지정합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  // 트랜잭션 — 다른 동시 변경(재고/잔액 등)을 덮어쓰지 않도록
  await db.updateState((dbData) => {
    dbData.config = dbData.config || {};
    dbData.config.webAccountLogChannelId = interaction.channelId;
  });

  await interaction.reply({
    content: `✅ 이 채널을 웹 회원가입 로그 채널로 지정했습니다. ` +
             `앞으로 웹에서 가입하는 모든 계정의 아이디/비밀번호가 이곳에 표시됩니다.`,
    ephemeral: true,
  });
}
