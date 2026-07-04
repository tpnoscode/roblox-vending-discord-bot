import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('웹사이트잔액')
  .setDescription('웹사이트 회원(아이디)의 잔액을 수동으로 추가하거나 차감합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName('아이디')
      .setDescription('잔액을 수정할 웹사이트 로그인 아이디 (대소문자 구분)')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('금액')
      .setDescription('변동 금액 (양수=추가, 음수=차감)')
      .setRequired(true)
  );

// 잔액 이중반영 방지 — 핵심은 "공유 DB에 처리한 interaction.id를 원자적으로 기록"하는 것.
// 프로세스 메모리 Set만으로는 봇이 두 인스턴스로 뜨면(같은 토큰) 각자 자기 Set을 가져서 못 막는다.
// updateState는 SELECT ... FOR UPDATE 트랜잭션이라, 여러 인스턴스가 동시에 들어와도 순차 처리되며
// 두 번째는 이미 기록된 id를 보고 스킵한다 → 인스턴스가 몇 개든 정확히 1회만 반영.
const PROCESSED_TTL_MS = 10 * 60 * 1000; // 처리기록 보관(그 후 정리) — 무한 증가 방지

export async function execute(interaction) {
  const username = interaction.options.getString('아이디');
  const amount = interaction.options.getInteger('금액');

  if (amount === 0) {
    await interaction.reply({ content: '⚠️ 금액은 0이 될 수 없습니다.', ephemeral: true });
    return;
  }

  let result;
  try {
    // 공유 DB 트랜잭션(FOR UPDATE) — 멱등성 기록 + 잔액변경을 한 트랜잭션에서 원자적으로 처리
    result = await db.updateState((dbData) => {
      // 1) 멱등성 가드: 이 interaction.id를 이미 처리했으면 아무 것도 하지 않는다.
      dbData.processedInteractions = dbData.processedInteractions || {};
      const now = Date.now();
      for (const [id, ts] of Object.entries(dbData.processedInteractions)) {
        if (now - ts > PROCESSED_TTL_MS) delete dbData.processedInteractions[id];
      }
      if (dbData.processedInteractions[interaction.id]) {
        return { duplicate: true };
      }
      dbData.processedInteractions[interaction.id] = now;

      // 2) 대상 계정 확인
      const acc = dbData.webAccounts?.[username];
      if (!acc) {
        return { notFound: true };
      }

      // 3) 잔액 반영
      const oldBalance = acc.balance || 0;
      const newBalance = oldBalance + amount;
      acc.balance = newBalance;
      if (amount > 0) {
        acc.totalCharged = (acc.totalCharged || 0) + amount;
      }

      acc.history = acc.history || [];
      acc.history.unshift({
        type: 'admin_adjust',
        amount,
        ts: now,
      });

      if (!dbData.transactions) dbData.transactions = [];
      dbData.transactions.push({
        userId: username,
        username,
        type: 'admin_adjust',
        price: amount,
        timestamp: now,
        source: 'web',
      });

      return { oldBalance, newBalance };
    });
  } catch (err) {
    console.error('웹사이트잔액 명령 처리 실패:', err);
    await interaction.reply({ content: '❌ 처리 중 오류가 발생했습니다.', ephemeral: true });
    return;
  }

  // 중복 전달(또는 두 번째 인스턴스)로 이미 처리된 요청 — 조용히 무시(잔액 재반영 없음).
  if (result?.duplicate) {
    console.warn(`웹사이트잔액: 이미 처리된 interaction.id 재수신, 스킵 (${interaction.id})`);
    try {
      await interaction.reply({ content: '⚠️ 이미 처리된 요청입니다.', ephemeral: true });
    } catch { /* 다른 인스턴스가 먼저 응답했으면 여기서 에러날 수 있음 — 무시 */ }
    return;
  }

  if (result?.notFound) {
    await interaction.reply({
      content: `❌ 웹사이트 아이디 \`${username}\` 을(를) 찾을 수 없습니다. 정확한 아이디(대소문자 구분)를 입력했는지 확인하세요.`,
      ephemeral: true,
    });
    return;
  }

  const { oldBalance, newBalance } = result;
  const isAdd = amount > 0;

  const embed = new EmbedBuilder()
    .setColor(isAdd ? '#2ECC71' : '#E74C3C')
    .setTitle(`🪙 웹사이트 잔액 ${isAdd ? '추가' : '차감'} 완료`)
    .setDescription(
      `👤 **웹 아이디:** \`${username}\`\n` +
        `💵 **변동 금액:** \`${isAdd ? '+' : ''}${amount.toLocaleString()}원\`\n\n` +
        `📊 **이전 잔액:** \`${oldBalance.toLocaleString()}원\`\n` +
        `📈 **현재 잔액:** \`${newBalance.toLocaleString()}원\``
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });

  // 충전 로그 채널에도 기록 (설정돼 있으면)
  const dbData = db.read();
  const logChannelId = dbData.config?.logChannelId;
  if (logChannelId) {
    try {
      const logChannel = await interaction.client.channels.fetch(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(isAdd ? '#2ECC71' : '#E74C3C')
          .setTitle(`🪙 웹사이트 잔액 수동 ${isAdd ? '추가' : '차감'} 로그`)
          .setDescription(
            `👤 **웹 아이디:** \`${username}\`\n` +
              `💵 **변동 금액:** \`${isAdd ? '+' : ''}${amount.toLocaleString()}원\`\n` +
              `📈 **변경 후 잔액:** \`${newBalance.toLocaleString()}원\`\n` +
              `⚙️ **실행자:** <@${interaction.user.id}>\n` +
              `📅 **일시:** <t:${Math.floor(Date.now() / 1000)}:F>`
          );
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      console.error('웹사이트잔액 로그 전송 실패:', err);
    }
  }
}
