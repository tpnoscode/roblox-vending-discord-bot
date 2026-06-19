import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('재고생성')
  .setDescription('상세 정보를 입력하여 새로운 재고 상품을 등록합니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('stock_create_modal')
    .setTitle('새로운 재고 등록');

  const nameInput = new TextInputBuilder()
    .setCustomId('stock_name')
    .setLabel('재고 이름')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('등록할 상품의 이름을 입력하세요')
    .setRequired(true);

  const categoryInput = new TextInputBuilder()
    .setCustomId('stock_category')
    .setLabel('카테고리')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('카테고리 이름을 입력하세요 (자동 생성/삭제)')
    .setRequired(true);

  const priceInput = new TextInputBuilder()
    .setCustomId('stock_price')
    .setLabel('재고 가격')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('가격을 입력하세요 (숫자만)')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(priceInput)
  );

  await interaction.showModal(modal);
}
