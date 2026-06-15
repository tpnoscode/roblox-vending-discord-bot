import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('잔액수정')
  .setDescription('유저의 잔액을 추가하거나 차감합니다.')
  .addUserOption((option) =>
    option
      .setName('유저')
      .setDescription('잔액을 수정할 대상 유저를 선택하세요.')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('금액')
      .setDescription(
        '수정할 금액을 입력하세요 (양수는 추가/충전, 음수는 차감).'
      )
      .setRequired(true)
  );

export async function execute(interaction) {
  const targetUser = interaction.options.getUser('유저');
  const amount = interaction.options.getInteger('금액');

  // Load and initialize user
  const userStats = db.getUser(targetUser.id, targetUser.username);
  const oldBalance = userStats.balance || 0;
  const newBalance = oldBalance + amount;

  const dbData = db.read();
  if (!dbData.users) dbData.users = {};
  if (!dbData.users[targetUser.id]) {
    dbData.users[targetUser.id] = {
      username: targetUser.username,
      balance: 0,
      totalCharged: 0,
      totalPurchased: 0,
    };
  }

  // Set new balance
  dbData.users[targetUser.id].balance = newBalance;

  // If amount is positive, increment totalCharged stat
  if (amount > 0) {
    dbData.users[targetUser.id].totalCharged =
      (dbData.users[targetUser.id].totalCharged || 0) + amount;
  }

  db.write(dbData);

  // Send recharge log if positive recharge and a log channel is configured
  if (amount > 0 && dbData.config?.logChannelId) {
    try {
      const logChannel = await interaction.client.channels.fetch(
        dbData.config.logChannelId
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setTitle('🪙 잔액 충전 로그 (수동)')
          .setDescription(
            `👤 **대상 유저:** <@${targetUser.id}> (${targetUser.username})\n` +
              `💵 **충전 금액:** \`+${amount.toLocaleString()}원\`\n` +
              `📈 **충전 후 잔액:** \`${newBalance.toLocaleString()}원\`\n` +
              `⚙️ **처리 방식:** 관리자 수동 충전 (실행자: <@${interaction.user.id}>)\n` +
              `📅 **일시:** <t:${Math.floor(Date.now() / 1000)}:F>`
          );
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error('Failed to send charge log to channel:', error);
    }
  }

  const isCharged = amount >= 0;
  const actionText = isCharged ? '충전(추가)' : '차감';

  const embed = new EmbedBuilder()
    .setColor(isCharged ? '#2ECC71' : '#E74C3C') // Green for positive, Red for negative
    .setTitle(`🪙 잔액 수정 완료 (${actionText})`)
    .setDescription(
      `👤 **대상 유저:** <@${targetUser.id}> (${targetUser.username})\n` +
        `💵 **변동 금액:** \`${amount.toLocaleString()}원\`\n\n` +
        `📊 **이전 잔액:** \`${oldBalance.toLocaleString()}원\`\n` +
        `📈 **현재 잔액:** \`${newBalance.toLocaleString()}원\``
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
