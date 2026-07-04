import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('소셜링크설정')
  .setDescription('웹사이트 상단 배너에 노출될 소셜 링크(디스코드, 유튜브, 틱톡)를 설정합니다.')
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
    .setCustomId('vending_social_settings_modal')
    .setTitle('🔗 소셜 링크 설정');

  const discordInput = new TextInputBuilder()
    .setCustomId('settings_discord_link')
    .setLabel('디스코드 링크')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('예: https://discord.gg/xxxxxx')
    .setValue(config.discordLink || '');

  const youtubeInput = new TextInputBuilder()
    .setCustomId('settings_youtube_link')
    .setLabel('유튜브 링크')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('예: https://youtube.com/@xxxxxx')
    .setValue(config.youtubeLink || '');

  const tiktokInput = new TextInputBuilder()
    .setCustomId('settings_tiktok_link')
    .setLabel('틱톡 링크')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('예: https://tiktok.com/@xxxxxx')
    .setValue(config.tiktokLink || '');

  const row1 = new ActionRowBuilder().addComponents(discordInput);
  const row2 = new ActionRowBuilder().addComponents(youtubeInput);
  const row3 = new ActionRowBuilder().addComponents(tiktokInput);

  modal.addComponents(row1, row2, row3);

  await interaction.showModal(modal);
}

export async function handleSocialSettingsModalSubmit(interaction) {
  const discordLink = interaction.fields.getTextInputValue('settings_discord_link').trim();
  const youtubeLink = interaction.fields.getTextInputValue('settings_youtube_link').trim();
  const tiktokLink = interaction.fields.getTextInputValue('settings_tiktok_link').trim();

  try {
    await db.updateState((dbData) => {
      dbData.config = dbData.config || {};
      dbData.config.discordLink = discordLink;
      dbData.config.youtubeLink = youtubeLink;
      dbData.config.tiktokLink = tiktokLink;
    });

    await interaction.reply({
      content:
        `✅ **소셜 링크 설정이 완료되었습니다!**\n\n` +
        `🔵 **디스코드:** ${discordLink ? `\`${discordLink}\`` : '`미지정`'}\n` +
        `🔴 **유튜브:** ${youtubeLink ? `\`${youtubeLink}\`` : '`미지정`'}\n` +
        `⚫ **틱톡:** ${tiktokLink ? `\`${tiktokLink}\`` : '`미지정`'}\n\n` +
        `*이 설정은 실시간으로 웹사이트 배너에 반영됩니다.*`,
      ephemeral: true,
    });
  } catch (error) {
    console.error('Error saving social links settings:', error);
    await interaction.reply({
      content: '❌ 설정 저장 중 오류가 발생했습니다.',
      ephemeral: true,
    });
  }
}
