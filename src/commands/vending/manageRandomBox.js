import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('랜덤박스관리')
  .setDescription('등록된 랜덤박스의 설정(가격, 등급 확률, 보상)을 수정합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

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

  const dbData = db.read();
  const randomBoxes = dbData.randomBoxes || {};
  const boxList = Object.values(randomBoxes);

  if (boxList.length === 0) {
    await interaction.reply({
      content: '❌ 등록된 랜덤박스가 없습니다. `/랜덤박스추가` 명령어로 박스를 먼저 등록해 주세요.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('⚙️ 랜덤박스 관리 - 수정할 박스 선택')
    .setDescription('설정을 수정할 랜덤박스를 선택해 주세요.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_randombox_manage_select')
    .setPlaceholder('수정할 랜덤박스를 선택하세요')
    .addOptions(
      boxList.map((box) => ({
        label: box.name.slice(0, 50),
        value: box.id,
        description: `가격: ${box.price.toLocaleString()}원`,
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

export async function handleRandomBoxManageSelect(interaction) {
  const boxId = interaction.values[0];
  const dbData = db.read();
  const randomBoxes = dbData.randomBoxes || {};
  const box = randomBoxes[boxId];

  if (!box) {
    await interaction.reply({
      content: '❌ 해당 랜덤박스를 찾을 수 없습니다.',
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`randombox_manage_modal_${boxId}`)
    .setTitle(`랜덤박스 수정 - ${box.name.slice(0, 25)}`);

  const nameInput = new TextInputBuilder()
    .setCustomId('manage_box_name')
    .setLabel('랜덤박스 이름')
    .setValue(box.name)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const priceInput = new TextInputBuilder()
    .setCustomId('manage_box_price')
    .setLabel('랜덤박스 가격')
    .setValue(box.price.toString())
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const gradesConfigValue = box.grades
    .map((g) => `${g.grade}:${g.displayProbability}:${g.actualProbability}:${g.reward}`)
    .join('\n');

  const configInput = new TextInputBuilder()
    .setCustomId('manage_box_config')
    .setLabel('등급 설정 (등급명:공개확률:실제확률:보상)')
    .setValue(gradesConfigValue)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('예시:\nS급:10:1:전설의 피닉스 펫\nA급:30:20:희귀한 드래곤 펫\n일반:60:79:기본 슬라임 펫');

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(priceInput),
    new ActionRowBuilder().addComponents(configInput)
  );

  await interaction.showModal(modal);
}

export async function handleRandomBoxManageModalSubmit(interaction, boxId) {
  const name = interaction.fields.getTextInputValue('manage_box_name').trim();
  const priceStr = interaction.fields.getTextInputValue('manage_box_price').trim();
  const configStr = interaction.fields.getTextInputValue('manage_box_config').trim();

  const price = parseInt(priceStr, 10);
  if (isNaN(price) || price < 0) {
    await interaction.reply({
      content: '❌ 가격은 0 이상의 숫자로만 입력해 주세요.',
      ephemeral: true
    });
    return;
  }

  const lines = configStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const grades = [];
  let totalDisplayProb = 0;
  let totalActualProb = 0;

  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length !== 4) {
      await interaction.reply({
        content: `❌ 입력 형식이 올바르지 않습니다: \`${line}\`\n포맷: \`등급명:공개확률:실제확률:보상\` (예: S급:10:1:전설의 피닉스 펫)`,
        ephemeral: true
      });
      return;
    }
    const gradeName = parts[0].trim();
    const displayProbStr = parts[1].replace('%', '').trim();
    const actualProbStr = parts[2].replace('%', '').trim();
    const rewardItem = parts[3].trim();
    
    // Parse as floats and round to 4 decimal places (0.0001%)
    const displayProb = Math.round(parseFloat(displayProbStr) * 10000) / 10000;
    const actualProb = Math.round(parseFloat(actualProbStr) * 10000) / 10000;

    if (isNaN(displayProb) || displayProb <= 0 || isNaN(actualProb) || actualProb <= 0) {
      await interaction.reply({
        content: `❌ 확률은 0보다 큰 숫자여야 합니다. (최대 소수점 4자리 0.0001%까지 입력 가능)`,
        ephemeral: true
      });
      return;
    }

    if (!rewardItem) {
      await interaction.reply({
        content: `❌ 보상 아이템 이름을 입력해 주세요.`,
        ephemeral: true
      });
      return;
    }

    grades.push({
      grade: gradeName,
      displayProbability: displayProb,
      actualProbability: actualProb,
      reward: rewardItem
    });
    totalDisplayProb += displayProb;
    totalActualProb += actualProb;
  }

  // Multiply by 10000 and round to check sum as integer to avoid JS float precision issues
  const roundedTotalDisplay = Math.round(totalDisplayProb * 10000);
  const roundedTotalActual = Math.round(totalActualProb * 10000);

  if (roundedTotalDisplay !== 1000000 || roundedTotalActual !== 1000000) {
    await interaction.reply({
      content: `❌ 공개 확률과 실제 확률의 총합은 각각 100%여야 합니다.\n현재 공개 총합: \`${Math.round(totalDisplayProb * 10000) / 10000}%\` | 실제 총합: \`${Math.round(totalActualProb * 10000) / 10000}%\``,
      ephemeral: true
    });
    return;
  }

  // 트랜잭션 안에서 확인+수정 — 동시 진행 중인 구매/충전의 변경분을 덮어쓰지 않도록
  const result = await db.updateState((dbData) => {
    dbData.randomBoxes = dbData.randomBoxes || {};
    const box = dbData.randomBoxes[boxId];
    if (!box) return { notFound: true };

    box.name = name;
    box.price = price;
    box.grades = grades;
    return { ok: true };
  });

  if (result.notFound) {
    await interaction.reply({
      content: '❌ 수정 중인 랜덤박스가 삭제되었거나 존재하지 않습니다.',
      ephemeral: true
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('⚙️ 랜덤박스 정보 수정 완료')
    .setDescription(
      `랜덤박스 정보가 성공적으로 수정되었습니다!\n\n` +
      `📦 **이름:** \`${name}\`\n` +
      `💵 **가격:** \`${price.toLocaleString()}원\`\n\n` +
      `📊 **수정된 등급별 설정 목록:**\n` +
      grades.map(g => `• **${g.grade}**: 공개 \`${g.displayProbability}%\` | 실제 \`${g.actualProbability}%\` | 보상: \`${g.reward}\``).join('\n')
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
