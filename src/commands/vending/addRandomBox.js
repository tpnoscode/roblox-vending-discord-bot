import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('랜덤박스추가')
  .setDescription('새로운 랜덤박스(가챠) 상품을 추가합니다.')
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

  const modal = new ModalBuilder()
    .setCustomId('randombox_add_modal_submit')
    .setTitle('🎁 새로운 랜덤박스 등록');

  const nameInput = new TextInputBuilder()
    .setCustomId('randombox_name')
    .setLabel('랜덤박스 이름')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('등록할 랜덤박스의 이름을 입력하세요')
    .setRequired(true);

  const priceInput = new TextInputBuilder()
    .setCustomId('randombox_price')
    .setLabel('랜덤박스 가격')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('가격을 입력하세요 (숫자만)')
    .setRequired(true);

  const categoryInput = new TextInputBuilder()
    .setCustomId('randombox_category')
    .setLabel('랜덤박스 카테고리')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('카테고리 이름을 입력하세요 (예: 펫 상자)')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(priceInput),
    new ActionRowBuilder().addComponents(categoryInput)
  );

  await interaction.showModal(modal);
}

export async function handleRandomBoxAddModalSubmit(interaction) {
  const name = interaction.fields.getTextInputValue('randombox_name').trim();
  const priceStr = interaction.fields.getTextInputValue('randombox_price').trim();
  const category = interaction.fields.getTextInputValue('randombox_category').trim();

  const price = parseInt(priceStr, 10);
  if (isNaN(price) || price < 0) {
    await interaction.reply({
      content: '❌ 가격은 0 이상의 숫자로만 입력해 주세요.',
      ephemeral: true
    });
    return;
  }

  // 트랜잭션 안에서 추가 — 동시 진행 중인 구매/충전의 변경분을 덮어쓰지 않도록
  const boxId = `rbox_${Date.now()}`;
  await db.updateState((dbData) => {
    dbData.randomBoxes = dbData.randomBoxes || {};
    dbData.randomBoxes[boxId] = {
      id: boxId,
      name: name,
      price: price,
      category: category,
      grades: [] // Initialized empty, configured via /랜덤박스관리
    };
  });

  // Success reply
  const embed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('🎁 랜덤박스 추가 완료')
    .setDescription(
      `새로운 랜덤박스가 성공적으로 추가되었습니다!\n\n` +
      `📦 **이름:** \`${name}\`\n` +
      `📁 **카테고리:** \`${category}\`\n` +
      `💵 **가격:** \`${price.toLocaleString()}원\`\n\n` +
      `⚠️ **안내**: 아직 등급 및 확률 설정이 완료되지 않았습니다.\n` +
      `곧바로 **\`/랜덤박스관리\`** 명령어를 사용해 구성품(확률, 보상)을 추가해 주세요!`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
