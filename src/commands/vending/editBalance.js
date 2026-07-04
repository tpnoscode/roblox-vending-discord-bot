import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('잔액수정')
  .setDescription('유저의 잔액을 추가하거나 차감합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

  if (amount === 0) {
    await interaction.reply({ content: '⚠️ 금액은 0이 될 수 없습니다.', ephemeral: true });
    return;
  }

  let result;
  try {
    // 공유 DB 트랜잭션(FOR UPDATE) + interaction.id 멱등성 가드 —
    // 봇이 여러 인스턴스로 뜨거나 같은 interaction이 중복 전달돼도 정확히 1회만 반영됨.
    // (2026-07-04 /웹사이트잔액 이중충전 사고와 동일한 클래스의 버그를 여기서도 선제 차단)
    result = await db.updateState((dbData) => {
      dbData.processedInteractions = dbData.processedInteractions || {};
      const now = Date.now();
      for (const [id, ts] of Object.entries(dbData.processedInteractions)) {
        if (now - ts > 10 * 60 * 1000) delete dbData.processedInteractions[id];
      }
      if (dbData.processedInteractions[interaction.id]) {
        return { duplicate: true };
      }
      dbData.processedInteractions[interaction.id] = now;

      dbData.users = dbData.users || {};
      if (!dbData.users[targetUser.id]) {
        dbData.users[targetUser.id] = {
          username: targetUser.username,
          balance: 0,
          totalCharged: 0,
          totalPurchased: 0,
        };
      }
      const userStats = dbData.users[targetUser.id];
      const oldBalance = userStats.balance || 0;
      const newBalance = oldBalance + amount;
      userStats.balance = newBalance;
      if (amount > 0) {
        userStats.totalCharged = (userStats.totalCharged || 0) + amount;
      }

      return { oldBalance, newBalance, logChannelId: dbData.config?.logChannelId };
    });
  } catch (err) {
    console.error('잔액수정 명령 처리 실패:', err);
    await interaction.reply({ content: '❌ 처리 중 오류가 발생했습니다.', ephemeral: true });
    return;
  }

  if (result?.duplicate) {
    console.warn(`잔액수정: 이미 처리된 interaction.id 재수신, 스킵 (${interaction.id})`);
    try {
      await interaction.reply({ content: '⚠️ 이미 처리된 요청입니다.', ephemeral: true });
    } catch { /* 다른 인스턴스가 먼저 응답했으면 무시 */ }
    return;
  }

  const { oldBalance, newBalance, logChannelId } = result;

  // Send recharge log if positive recharge and a log channel is configured
  if (amount > 0 && logChannelId) {
    try {
      const logChannel = await interaction.client.channels.fetch(logChannelId);
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
