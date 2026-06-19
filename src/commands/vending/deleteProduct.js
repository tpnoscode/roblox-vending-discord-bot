import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('제품삭제')
  .setDescription('등록된 재고 상품을 즉시 삭제합니다.')
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
  const products = dbData.products || {};
  const categories = new Set();

  Object.values(products).forEach((p) => {
    if (p.category) categories.add(p.category);
  });

  if (categories.size === 0) {
    await interaction.reply({
      content: '❌ 등록된 카테고리가 없습니다. `/재고생성` 명령어로 재고를 먼저 생성해 주세요.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#E74C3C') // Red for deletion
    .setTitle('🗑️ 제품 삭제 - 카테고리 선택')
    .setDescription('삭제할 상품이 속한 카테고리를 선택해 주세요.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_delete_select_category')
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
// Vending Product Deletion Interaction Handlers
// ----------------------------------------------------

export async function handleDeleteBackToCategories(interaction) {
  const dbData = db.read();
  const products = dbData.products || {};
  const categories = new Set();

  Object.values(products).forEach((p) => {
    if (p.category) categories.add(p.category);
  });

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🗑️ 제품 삭제 - 카테고리 선택')
    .setDescription('삭제할 상품이 속한 카테고리를 선택해 주세요.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_delete_select_category')
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

export async function handleDeleteSelectCategory(interaction) {
  const selectedCategory = interaction.values[0];
  const dbData = db.read();
  const products = dbData.products || {};

  const categoryProducts = Object.values(products).filter(
    (p) => p.category === selectedCategory
  );

  if (categoryProducts.length === 0) {
    await interaction.reply({
      content: '❌ 해당 카테고리에 상품이 존재하지 않습니다.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle(`🗑️ [${selectedCategory}] 제품 삭제 - 상품 선택`)
    .setDescription(
      `선택하신 카테고리의 상품 목록입니다. **삭제할 상품을 선택하시면 즉시 삭제됩니다.**\n\n` +
        categoryProducts
          .map(
            (p) =>
              `• **${p.name}** | 가격: \`${p.price.toLocaleString()}원\` | 수량: \`${p.stockCount}개\``
          )
          .join('\n')
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_delete_select_product')
    .setPlaceholder('삭제할 상품을 선택하세요 (선택 시 즉시 삭제)')
    .addOptions(
      categoryProducts.map((p) => ({
        label: p.name.slice(0, 50),
        value: p.id,
        description: `가격: ${p.price.toLocaleString()}원 | 수량: ${p.stockCount}개`,
      }))
    );

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_delete_back_to_categories')
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder().addComponents(btnBack);

  await interaction.update({
    embeds: [embed],
    components: [rowMenu, rowBtn],
  });
}

export async function handleDeleteSelectProduct(interaction) {
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

  const productName = product.name;
  
  // Delete product from the database
  delete dbData.products[productId];
  db.write(dbData);

  const embed = new EmbedBuilder()
    .setColor('#2ECC71') // Green for success
    .setTitle('✅ 제품 삭제 완료')
    .setDescription(`🗑️ **${productName}** 상품이 성공적으로 삭제되었습니다.`);

  await interaction.update({
    embeds: [embed],
    components: [], // Clear all components since action is complete
  });
}
