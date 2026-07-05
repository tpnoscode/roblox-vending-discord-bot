import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('랜덤박스삭제')
  .setDescription('등록된 랜덤박스 상품을 즉시 삭제합니다.')
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
      content: '❌ 등록된 랜덤박스가 없습니다.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#E74C3C') // Red for deletion
    .setTitle('🗑️ 랜덤박스 삭제 - 상자 선택')
    .setDescription('삭제할 랜덤박스를 선택해 주세요. 선택 시 즉시 삭제됩니다.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_randombox_delete_select')
    .setPlaceholder('삭제할 랜덤박스를 선택하세요')
    .addOptions(
      boxList.map((box) => ({
        label: `[${box.category || '미분류'}] ${box.name}`.slice(0, 50),
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

export async function handleRandomBoxDeleteSelect(interaction) {
  const boxId = interaction.values[0];

  // 트랜잭션 안에서 확인+삭제 — 동시 진행 중인 구매/충전의 변경분을 덮어쓰지 않도록
  const result = await db.updateState((dbData) => {
    const box = dbData.randomBoxes?.[boxId];
    if (!box) return { notFound: true };
    const boxName = box.name;
    delete dbData.randomBoxes[boxId];
    return { boxName };
  });

  if (result.notFound) {
    await interaction.reply({
      content: '❌ 해당 랜덤박스를 찾을 수 없습니다.',
      ephemeral: true,
    });
    return;
  }

  const boxName = result.boxName;

  const embed = new EmbedBuilder()
    .setColor('#2ECC71') // Green for success
    .setTitle('✅ 랜덤박스 삭제 완료')
    .setDescription(`🗑️ **${boxName}** 랜덤박스가 성공적으로 삭제되었습니다.`);

  await interaction.update({
    embeds: [embed],
    components: [], // Clear all components since action is complete
  });
}
