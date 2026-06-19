import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('재고관리')
  .setDescription(
    '등록된 재고 상품의 가격 및 수량, 특별 재고(계정 등)를 관리합니다.'
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const dbData = db.read();
  const products = dbData.products || {};
  const categories = new Set();

  Object.values(products).forEach((p) => {
    if (p.category) categories.add(p.category);
  });

  if (categories.size === 0) {
    await interaction.reply({
      content:
        '❌ 등록된 카테고리가 없습니다. `/재고생성` 명령어로 재고를 먼저 생성해 주세요.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle('📂 재고 관리 - 카테고리 선택')
    .setDescription('관리할 카테고리를 선택해 주세요.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_manage_select_category')
    .setPlaceholder('카테고리를 선택하세요')
    .addOptions(
      Array.from(categories).map((cat) => ({
        label: cat,
        value: cat,
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

// ----------------------------------------------------
// Vending Stock Management Interaction Handlers
// ----------------------------------------------------

export async function handleManageBackToCategories(interaction) {
  const dbData = db.read();
  const products = dbData.products || {};
  const categories = new Set();

  Object.values(products).forEach((p) => {
    if (p.category) categories.add(p.category);
  });

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle('📂 재고 관리 - 카테고리 선택')
    .setDescription('관리할 카테고리를 선택해 주세요.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_manage_select_category')
    .setPlaceholder('카테고리를 선택하세요')
    .addOptions(
      Array.from(categories).map((cat) => ({
        label: cat,
        value: cat,
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

export async function handleManageSelectCategory(interaction) {
  const selectedCategory = interaction.values[0];
  const dbData = db.read();
  const products = dbData.products || {};

  const categoryProducts = Object.values(products).filter(
    (p) => p.category === selectedCategory
  );

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle(`📂 [${selectedCategory}] 재고 관리 - 상품 선택`)
    .setDescription(
      `선택하신 카테고리의 상품 목록입니다. 관리할 재고 상품을 선택해 주세요.\n\n` +
        categoryProducts
          .map(
            (p) =>
              `• **${p.name}** | 가격: \`${p.price.toLocaleString()}원\` | 수량: \`${p.stockCount}개\`${p.specialStock ? ' (★ 특별재고)' : ''}`
          )
          .join('\n')
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_manage_select_product')
    .setPlaceholder('관리할 상품을 선택하세요')
    .addOptions(
      categoryProducts.map((p) => ({
        label: p.name.slice(0, 50),
        value: p.id,
        description: `가격: ${p.price.toLocaleString()}원 | 수량: ${p.stockCount}개`,
      }))
    );

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_manage_back_to_categories')
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder().addComponents(btnBack);

  await interaction.update({
    embeds: [embed],
    components: [rowMenu, rowBtn],
  });
}

export async function handleManageSelectProduct(interaction) {
  const productId = interaction.values[0];
  const dbData = db.read();
  const products = dbData.products || {};
  const product = products[productId];

  if (!product) {
    await interaction.reply({
      content: '❌ 상품 정보를 찾을 수 없습니다.',
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`vending_manage_modal_${productId}`)
    .setTitle(`재고 수정 - ${product.name.slice(0, 30)}`);

  const priceInput = new TextInputBuilder()
    .setCustomId('manage_price')
    .setLabel('재고 가격')
    .setValue(product.price.toString())
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const countInput = new TextInputBuilder()
    .setCustomId('manage_count')
    .setLabel('일반 재고 수량 (특별재고가 없을 때 사용)')
    .setValue((product.stockCount || 0).toString())
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const specialInput = new TextInputBuilder()
    .setCustomId('manage_special')
    .setLabel('특별 재고 내용 (한 줄에 하나씩)')
    .setValue((product.specialStock || []).join('\n'))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder(
      '예: 계정아이디:비밀번호\n(입력 시 일반 수량 대신 이 내용의 줄 수로 재고가 채워집니다.)'
    );

  modal.addComponents(
    new ActionRowBuilder().addComponents(priceInput),
    new ActionRowBuilder().addComponents(countInput),
    new ActionRowBuilder().addComponents(specialInput)
  );

  await interaction.showModal(modal);
}

export async function handleManageModalSubmit(interaction, productId) {
  const priceStr = interaction.fields.getTextInputValue('manage_price');
  const countStr = interaction.fields.getTextInputValue('manage_count');
  const specialStr = interaction.fields.getTextInputValue('manage_special');

  const price = parseInt(priceStr, 10);
  if (isNaN(price) || price < 0) {
    await interaction.reply({
      content: '❌ 가격은 0 이상의 숫자로만 입력해 주세요.',
      ephemeral: true,
    });
    return;
  }

  let count = parseInt(countStr, 10);
  if (isNaN(count) || count < 0) {
    count = 0;
  }

  const specialStock = specialStr
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dbData = db.read();
  if (!dbData.products) dbData.products = {};
  const product = dbData.products[productId];

  if (!product) {
    await interaction.reply({
      content: '❌ 수정 중인 상품이 삭제되었거나 존재하지 않습니다.',
      ephemeral: true,
    });
    return;
  }

  product.price = price;

  if (specialStock.length > 0) {
    product.specialStock = specialStock;
    product.stockCount = specialStock.length;
  } else {
    product.stockCount = count;
    delete product.specialStock;
  }

  db.write(dbData);

  await interaction.reply({
    content:
      `✅ **재고 정보가 수정 완료되었습니다!**\n\n` +
      `📦 **이름:** \`${product.name}\`\n` +
      `💵 **수정된 가격:** \`${price.toLocaleString()}원\`\n` +
      `📊 **수정된 수량:** \`${product.stockCount}개\` ${specialStock.length > 0 ? '(★ 특별 재고 적용됨)' : '(일반 재고)'}`,
    ephemeral: true,
  });
}
