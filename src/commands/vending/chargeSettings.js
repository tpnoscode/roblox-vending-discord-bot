import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';
import * as pushbullet from '../../utils/pushbullet.js';

export const data = new SlashCommandBuilder()
  .setName('충전세팅')
  .setDescription('자동 충전 시스템(계좌 및 푸시불렛 토큰)을 설정합니다.')
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

  // Load existing configuration
  const dbData = db.read();
  const config = dbData.config || {};

  const modal = new ModalBuilder()
    .setCustomId('vending_charge_settings_modal')
    .setTitle('💰 자동 충전 시스템 세팅');

  const bankInput = new TextInputBuilder()
    .setCustomId('settings_bank_info')
    .setLabel('은행명 및 계좌번호')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('예: 신한은행 110-123-456789')
    .setValue(config.bankInfo || '');

  const holderInput = new TextInputBuilder()
    .setCustomId('settings_account_holder')
    .setLabel('예금주명')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('예: 홍길동')
    .setValue(config.accountHolder || '');

  const tokenInput = new TextInputBuilder()
    .setCustomId('settings_pushbullet_token')
    .setLabel('Pushbullet API 토큰')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('o.xxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    .setValue(config.pushbulletToken || '');

  const row1 = new ActionRowBuilder().addComponents(bankInput);
  const row2 = new ActionRowBuilder().addComponents(holderInput);
  const row3 = new ActionRowBuilder().addComponents(tokenInput);

  modal.addComponents(row1, row2, row3);

  await interaction.showModal(modal);
}

export async function handleSettingsModalSubmit(interaction) {
  const bankInfo = interaction.fields.getTextInputValue('settings_bank_info');
  const accountHolder = interaction.fields.getTextInputValue('settings_account_holder');
  const pushbulletToken = interaction.fields.getTextInputValue('settings_pushbullet_token');

  try {
    // 트랜잭션 — 동시 진행 중인 구매/충전의 변경분을 덮어쓰지 않도록
    await db.updateState((dbData) => {
      dbData.config = dbData.config || {};
      dbData.config.bankInfo = bankInfo;
      dbData.config.accountHolder = accountHolder;
      dbData.config.pushbulletToken = pushbulletToken;
    });

    // Restart Pushbullet WebSocket listener with new token
    await pushbullet.restart();

    await interaction.reply({
      content:
        `✅ **자동 충전 설정이 완료되었습니다!**\n\n` +
        `🏦 **입금 계좌:** \`${bankInfo}\`\n` +
        `👤 **예금주:** \`${accountHolder}\`\n` +
        `🔑 **Pushbullet 연동:** 완료 (수신기가 재부팅되었습니다.)`,
      ephemeral: true,
    });
  } catch (error) {
    console.error('Error saving charge settings:', error);
    await interaction.reply({
      content: '❌ 설정 저장 및 푸시불렛 재부팅 중 오류가 발생했습니다.',
      ephemeral: true,
    });
  }
}
