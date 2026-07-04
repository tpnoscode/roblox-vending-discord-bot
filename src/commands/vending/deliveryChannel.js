import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { updateState } from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('수령채널')
  .setDescription('이 채널을 웹 아이템 수령 스레드가 생성될 채널로 지정합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  // 트랜잭션 — 다른 동시 변경(재고/잔액 등)을 덮어쓰지 않도록
  await updateState((dbData) => {
    dbData.config = dbData.config || {};
    dbData.config.deliveryChannelId = interaction.channelId;
  });

  await interaction.reply({
    content:
      `✅ 이 채널(<#${interaction.channelId}>)을 **아이템 수령 채널**로 지정했습니다.\n` +
      `앞으로 웹에서 수령 요청이 오면 이 채널에 "수령 · {아이디}" 스레드가 생성됩니다.\n` +
      `스레드에서 \`/수령링크 <링크>\`(또는 링크만 붙여넣기)로 입장 링크를 보내면 웹 수령창에 버튼으로 표시됩니다.`,
    ephemeral: true,
  });
}
