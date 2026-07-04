import {
  handleInfo,
  handleMyInfo,
  handleItemsForSale,
  handleInfoBack,
  handleSelectCategory,
  handleBuy,
  handleBuySelectCategory,
  handleBuySelectProduct,
  handleBuyModalSubmit,
  handleCharge,
  handleChargeModalSubmit,
  handleRandomBoxButton,
  handleRandomBoxBackToList,
  handleRandomBoxSelect,
  handleRandomBoxBuy,
  handleRandomBoxBuyModalSubmit,
  handleInquiry,
  handleInquiryConfirm,
  handleInquiryModalSubmit,
  handleInquiryClose,
  handleInquiryCloseConfirm,
  handleInquiryCloseCancel,
} from '../commands/vending/vending.js';
import {
  handleManageBackToCategories,
  handleManageSelectCategory,
  handleManageSelectProduct,
  handleManageModalSubmit,
} from '../commands/vending/manageStock.js';
import { handleSettingsModalSubmit } from '../commands/vending/chargeSettings.js';
import { handleSocialSettingsModalSubmit } from '../commands/vending/socialSettings.js';
import {
  handleDeleteBackToCategories,
  handleDeleteSelectCategory,
  handleDeleteSelectProduct,
} from '../commands/vending/deleteProduct.js';
import { handleRandomBoxAddModalSubmit } from '../commands/vending/addRandomBox.js';
import { handleRandomBoxDeleteSelect } from '../commands/vending/deleteRandomBox.js';
import {
  handleRandomBoxManageSelect,
  handleRandomBoxManageModalSubmit,
} from '../commands/vending/manageRandomBox.js';
import * as db from '../utils/db.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction) {
  // Fetch fresh database state from Supabase before processing any interaction
  await db.fetch();

  // Handle button interactions
  if (interaction.isButton()) {
    const { customId } = interaction;

    try {
      if (customId === 'vending_info') {
        await handleInfo(interaction);
        return;
      }
      if (customId === 'vending_my_info') {
        await handleMyInfo(interaction);
        return;
      }
      if (customId === 'vending_items_for_sale') {
        await handleItemsForSale(interaction);
        return;
      }
      if (customId === 'vending_info_back') {
        await handleInfoBack(interaction);
        return;
      }
      if (customId === 'vending_manage_back_to_categories') {
        await handleManageBackToCategories(interaction);
        return;
      }
      if (customId === 'vending_delete_back_to_categories') {
        await handleDeleteBackToCategories(interaction);
        return;
      }
      if (customId === 'vending_buy' || customId === 'vending_buy_back_to_categories') {
        await handleBuy(interaction);
        return;
      }
      if (customId === 'vending_charge') {
        await handleCharge(interaction);
        return;
      }
      if (customId === 'vending_randombox') {
        await handleRandomBoxButton(interaction);
        return;
      }
      if (customId === 'vending_inquiry') {
        await handleInquiry(interaction);
        return;
      }
      if (customId === 'vending_inquiry_confirm') {
        await handleInquiryConfirm(interaction);
        return;
      }
      if (customId === 'vending_inquiry_close') {
        await handleInquiryClose(interaction);
        return;
      }
      if (customId === 'vending_inquiry_close_confirm') {
        await handleInquiryCloseConfirm(interaction);
        return;
      }
      if (customId === 'vending_inquiry_close_cancel') {
        await handleInquiryCloseCancel(interaction);
        return;
      }
      if (customId === 'vending_randombox_back_to_list') {
        await handleRandomBoxBackToList(interaction);
        return;
      }
      if (customId.startsWith('vending_randombox_buy_')) {
        const boxId = customId.replace('vending_randombox_buy_', '');
        await handleRandomBoxBuy(interaction, boxId);
        return;
      }

      // Default mute handler for other vending buttons
      if (customId.startsWith('vending_')) {
        await interaction.deferUpdate();
        return;
      }
    } catch (error) {
      console.error(`Error handling button click for ${customId}:`, error);
    }
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    const { customId } = interaction;
    try {
      if (customId === 'vending_select_category') {
        await handleSelectCategory(interaction);
        return;
      }
      if (customId === 'vending_manage_select_category') {
        await handleManageSelectCategory(interaction);
        return;
      }
      if (customId === 'vending_manage_select_product') {
        await handleManageSelectProduct(interaction);
        return;
      }
      if (customId === 'vending_buy_select_category') {
        await handleBuySelectCategory(interaction);
        return;
      }
      if (customId === 'vending_buy_select_product') {
        await handleBuySelectProduct(interaction);
        return;
      }
      if (customId === 'vending_delete_select_category') {
        await handleDeleteSelectCategory(interaction);
        return;
      }
      if (customId === 'vending_delete_select_product') {
        await handleDeleteSelectProduct(interaction);
        return;
      }
      if (customId === 'vending_randombox_select') {
        await handleRandomBoxSelect(interaction);
        return;
      }
      if (customId === 'vending_randombox_delete_select') {
        await handleRandomBoxDeleteSelect(interaction);
        return;
      }
      if (customId === 'vending_randombox_manage_select') {
        await handleRandomBoxManageSelect(interaction);
        return;
      }
    } catch (error) {
      console.error(`Error handling select menu ${customId}:`, error);
    }
  }

  // Handle modal submit interactions
  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId === 'vending_charge_settings_modal') {
      try {
        await handleSettingsModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling charge settings modal:', error);
      }
      return;
    }
    if (customId === 'vending_social_settings_modal') {
      try {
        await handleSocialSettingsModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling social settings modal:', error);
      }
      return;
    }
    if (customId === 'vending_charge_modal_submit') {
      try {
        await handleChargeModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling charge modal submit:', error);
      }
      return;
    }
    if (customId === 'vending_inquiry_modal') {
      try {
        await handleInquiryModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling inquiry modal submit:', error);
      }
      return;
    }
    if (customId === 'randombox_add_modal_submit') {
      try {
        await handleRandomBoxAddModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling random box add modal submit:', error);
      }
      return;
    }

    if (customId === 'stock_create_modal') {
      const name = interaction.fields.getTextInputValue('stock_name');
      const category = interaction.fields.getTextInputValue('stock_category');
      const priceStr = interaction.fields.getTextInputValue('stock_price');

      const price = parseInt(priceStr, 10);
      if (isNaN(price) || price < 0) {
        await interaction.reply({
          content: '❌ 가격은 0 이상의 정수(숫자만)로 입력해 주세요!',
          ephemeral: true,
        });
        return;
      }

      try {
        const productId = `prod_${Date.now()}`;
        await db.updateState((dbData) => {
          dbData.products = dbData.products || {};
          dbData.products[productId] = {
            id: productId,
            name: name,
            category: category,
            price: price,
            stockCount: 0,
          };
        });

        await interaction.reply({
          content:
            `✅ **재고 상품이 성공적으로 등록되었습니다!**\n\n` +
            `📦 **이름:** \`${name}\`\n` +
            `📂 **카테고리:** \`${category}\` (자동 생성 완료)\n` +
            `💵 **가격:** \`${price.toLocaleString()}원\``,
          ephemeral: true,
        });
      } catch (error) {
        console.error('Error saving stock from modal submission:', error);
        await interaction.reply({
          content: '❌ 재고 저장 도중 오류가 발생했습니다.',
          ephemeral: true,
        });
      }
    } else if (customId.startsWith('vending_manage_modal_')) {
      const productId = customId.replace('vending_manage_modal_', '');
      try {
        await handleManageModalSubmit(interaction, productId);
      } catch (error) {
        console.error(`Error handling stock manage modal submit:`, error);
      }
    } else if (customId.startsWith('vending_buy_modal_')) {
      const productId = customId.replace('vending_buy_modal_', '');
      try {
        await handleBuyModalSubmit(interaction, productId);
      } catch (error) {
        console.error(`Error handling purchase modal submit:`, error);
      }
    } else if (customId.startsWith('randombox_manage_modal_')) {
      const boxId = customId.replace('randombox_manage_modal_', '');
      try {
        await handleRandomBoxManageModalSubmit(interaction, boxId);
      } catch (error) {
        console.error('Error handling random box manage modal submit:', error);
      }
    } else if (customId.startsWith('vending_randombox_buy_modal_')) {
      const boxId = customId.replace('vending_randombox_buy_modal_', '');
      try {
        await handleRandomBoxBuyModalSubmit(interaction, boxId);
      } catch (error) {
        console.error('Error handling random box buy modal submit:', error);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    const replyContent = {
      content: '명령어 실행 중 오류가 발생했습니다.',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyContent);
    } else {
      await interaction.reply(replyContent);
    }
  }
}
