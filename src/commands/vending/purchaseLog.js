import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('구매로그')
  .setDescription('상품 구매 내역이 전송될 로그 채널을 지정합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName('채널')
      .setDescription('로그를 전송할 텍스트 채널을 선택하세요.')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction) {
  const channel = interaction.options.getChannel('채널');

  // Save channel ID to database config (트랜잭션 — 다른 동시 변경 덮어쓰지 않도록)
  await db.updateState((dbData) => {
    dbData.config = dbData.config || {};
    dbData.config.purchaseLogChannelId = channel.id;
  });

  const embed = new EmbedBuilder()
    .setColor('#E67E22') // Orange color for purchases
    .setTitle('📝 구매 로그 채널 설정 완료')
    .setDescription(
      `앞으로 발생하는 모든 상품 구매 내역은 <#${channel.id}> 채널에 기록됩니다.`
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
