import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} from 'discord.js';
import * as db from '../../utils/db.js';

// Setup global map for storing pending creation config
global.pendingRandomBoxCreation = global.pendingRandomBoxCreation || new Map();

export const data = new SlashCommandBuilder()
  .setName('랜덤박스추가')
  .setDescription('새로운 랜덤박스(가챠) 상품을 추가합니다.')
  .addStringOption((option) =>
    option
      .setName('이름')
      .setDescription('추가할 랜덤박스 이름을 입력하세요.')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('가격')
      .setDescription('랜덤박스 구매 가격을 설정하세요.')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('영상링크')
      .setDescription('개봉 시 재생할 10초 분량의 GIF/영상 링크를 입력하세요.')
      .setRequired(true)
  );

export async function execute(interaction) {
  // Check admin permission
  const ownerId = process.env.OWNER_DISCORD_ID;
  const adminRoleId = process.env.ADMIN_ROLE_ID;
  const member = interaction.member;
  
  const isOwner = member && ownerId && member.id === ownerId;
  const hasAdminRole = member && adminRoleId && member.roles.cache.has(adminRoleId);
  const isGuildAdmin = member && member.permissions.has('Administrator');
  
  if (!isOwner && !hasAdminRole && !isGuildAdmin) {
    await interaction.reply({
      content: '❌ 이 명령어는 관리자만 사용할 수 있습니다.',
      ephemeral: true,
    });
    return;
  }

  const name = interaction.options.getString('이름');
  const price = interaction.options.getInteger('가격');
  const videoUrl = interaction.options.getString('영상링크');

  // Store options in global map
  global.pendingRandomBoxCreation.set(interaction.user.id, { name, price, videoUrl });

  const modal = new ModalBuilder()
    .setCustomId('randombox_add_modal_submit')
    .setTitle('🎁 랜덤박스 등급 및 확률 설정');

  const configInput = new TextInputBuilder()
    .setCustomId('randombox_grades_config')
    .setLabel('등급 및 확률 (등급명:확률)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('예시:\nS급:10\nA급:30\n일반:60\n(확률 합계가 100이 되도록 설정하세요.)');

  const row = new ActionRowBuilder().addComponents(configInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

export async function handleRandomBoxAddModalSubmit(interaction) {
  const configStr = interaction.fields.getTextInputValue('randombox_grades_config').trim();
  const lines = configStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const grades = [];
  let totalDisplayProb = 0;
  let totalActualProb = 0;

  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length !== 3) {
      await interaction.reply({
        content: `❌ 입력 형식이 올바르지 않습니다: \`${line}\`\n포맷: \`등급명:공개확률:실제확률\` (예: S급:10:1)`,
        ephemeral: true
      });
      return;
    }
    const gradeName = parts[0].trim();
    const displayProbStr = parts[1].replace('%', '').trim();
    const actualProbStr = parts[2].replace('%', '').trim();
    const displayProb = parseInt(displayProbStr, 10);
    const actualProb = parseInt(actualProbStr, 10);

    if (isNaN(displayProb) || displayProb <= 0 || isNaN(actualProb) || actualProb <= 0) {
      await interaction.reply({
        content: `❌ 확률은 0보다 큰 숫자여야 합니다.`,
        ephemeral: true
      });
      return;
    }

    grades.push({
      grade: gradeName,
      displayProbability: displayProb,
      actualProbability: actualProb
    });
    totalDisplayProb += displayProb;
    totalActualProb += actualProb;
  }

  if (totalDisplayProb !== 100 || totalActualProb !== 100) {
    await interaction.reply({
      content: `❌ 공개 확률과 실제 확률의 총합은 각각 100%여야 합니다.\n현재 공개 총합: \`${totalDisplayProb}%\` | 실제 총합: \`${totalActualProb}%\``,
      ephemeral: true
    });
    return;
  }

  const pending = global.pendingRandomBoxCreation.get(interaction.user.id);
  if (!pending) {
    await interaction.reply({
      content: '❌ 설정 세션이 만료되었습니다. 명령어를 다시 실행해 주세요.',
      ephemeral: true
    });
    return;
  }

  global.pendingRandomBoxCreation.delete(interaction.user.id);

  // Write to database
  const dbData = db.read();
  if (!dbData.randomBoxes) dbData.randomBoxes = {};

  const boxId = `rbox_${Date.now()}`;
  dbData.randomBoxes[boxId] = {
    id: boxId,
    name: pending.name,
    price: pending.price,
    videoUrl: pending.videoUrl, // We keep this field, but we won't use it for rendering the box opening
    grades: grades
  };

  db.write(dbData);

  // Success reply
  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('🎁 랜덤박스 추가 완료')
    .setDescription(
      `새로운 랜덤박스가 성공적으로 추가되었습니다!\n\n` +
      `📦 **이름:** \`${pending.name}\`\n` +
      `💵 **가격:** \`${pending.price.toLocaleString()}원\`\n\n` +
      `📊 **등급별 확률 목록 (공개 vs 실제):**\n` +
      grades.map(g => `• **${g.grade}**: 공개 \`${g.displayProbability}%\` | 실제 \`${g.actualProbability}%\``).join('\n')
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
