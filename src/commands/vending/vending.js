import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  AttachmentBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import path from 'path';
import * as db from '../../utils/db.js';
import * as pushbullet from '../../utils/pushbullet.js';

export const data = new SlashCommandBuilder()
  .setName('자판기')
  .setDescription('자판기 관련 명령어입니다.')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('생성')
      .setDescription('화면에 자판기 UI를 생성합니다.')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === '생성') {
    const imagePath = path.resolve('assets/galaxy_portal.png');
    const attachment = new AttachmentBuilder(imagePath, {
      name: 'galaxy_portal.png',
    });

    const embed = new EmbedBuilder()
      .setColor('#7B2CB7') // Cosmic purple
      .setTitle('🌌 24시간 자동 판매 자판기')
      .setDescription(
        '🪙 **24시간 언제든 자동으로 충전&구매 가능한 자판기 입니다**\n' +
          '⚠️ **오류 발생시 고객센터로 문의주세요!**'
      )
      .setThumbnail('attachment://galaxy_portal.png');

    const btnInfo = new ButtonBuilder()
      .setCustomId('vending_info')
      .setLabel('[ 정보 ]')
      .setEmoji('📖')
      .setStyle(ButtonStyle.Primary);

    const btnCharge = new ButtonBuilder()
      .setCustomId('vending_charge')
      .setLabel('[ 충전 ]')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success);

    const btnBuy = new ButtonBuilder()
      .setCustomId('vending_buy')
      .setLabel('[ 구매 ]')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Secondary);

    const btnRandom = new ButtonBuilder()
      .setCustomId('vending_randombox')
      .setLabel('[ 랜덤박스 ]')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      btnInfo,
      btnCharge,
      btnBuy,
      btnRandom
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      files: [attachment],
    });
  }
}

// ----------------------------------------------------
// Vending Information Button Interaction Handlers
// ----------------------------------------------------

export async function handleInfo(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle('📖 정보 카테고리 선택')
    .setDescription('조회하실 정보 카테고리를 선택해 주세요.');

  const btnMyInfo = new ButtonBuilder()
    .setCustomId('vending_my_info')
    .setLabel('[ 내 정보 ]')
    .setEmoji('👤')
    .setStyle(ButtonStyle.Primary);

  const btnItems = new ButtonBuilder()
    .setCustomId('vending_items_for_sale')
    .setLabel('[ 판매중 아이템 ]')
    .setEmoji('🛒')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(btnMyInfo, btnItems);

  if (interaction.message && interaction.message.flags.has('Ephemeral')) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
}

export async function handleMyInfo(interaction) {
  const userStats = db.getUser(interaction.user.id, interaction.user.username);
  const joinedTimestamp = Math.floor(
    interaction.member.joinedAt.getTime() / 1000
  );

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle('👤 내 정보')
    .setDescription(
      `📅 **서버 가입일:** <t:${joinedTimestamp}:D> (<t:${joinedTimestamp}:R>)\n` +
        `🪙 **현재 잔액:** \`${userStats.balance.toLocaleString()}원\`\n` +
        `💵 **총 충전 금액:** \`${userStats.totalCharged.toLocaleString()}원\`\n` +
        `🛒 **총 구매 금액:** \`${userStats.totalPurchased.toLocaleString()}원\``
    );

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_info_back')
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(btnBack);

  await interaction.update({ embeds: [embed], components: [row] });
}

export async function handleItemsForSale(interaction) {
  const dbData = db.read();
  const products = dbData.products || {};
  const categories = {};

  Object.values(products).forEach((p) => {
    if (p.category) {
      categories[p.category] = (categories[p.category] || 0) + 1;
    }
  });

  const catEntries = Object.entries(categories);
  let description = '조회하실 카테고리를 선택해주세요.';
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_select_category')
    .setPlaceholder('카테고리를 선택하세요');

  if (catEntries.length === 0) {
    description += '\n\n* 등록된 카테고리가 없습니다.';
    selectMenu
      .addOptions({
        label: '등록된 카테고리가 없습니다',
        value: 'no_categories',
        description: '상품이 추가되면 카테고리가 활성화됩니다.',
      })
      .setDisabled(true);
  } else {
    description +=
      '\n\n' +
      catEntries
        .map(([cat, count]) => `• **${cat}** : \`${count}개\``)
        .join('\n');
    selectMenu.addOptions(
      catEntries.map(([cat, count]) => ({
        label: cat,
        value: cat,
        description: `${count}개의 상품이 있습니다.`,
      }))
    );
  }

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_info_back')
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder().addComponents(btnBack);

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle('🛒 카테고리 선택')
    .setDescription(description);

  await interaction.update({ embeds: [embed], components: [rowMenu, rowBtn] });
}

export async function handleInfoBack(interaction) {
  await handleInfo(interaction);
}

export async function handleSelectCategory(interaction) {
  const selectedCategory = interaction.values[0];
  const dbData = db.read();
  const products = dbData.products || {};

  const categoryProducts = Object.values(products).filter(
    (p) => p.category === selectedCategory
  );

  let description = `**${selectedCategory}** 카테고리의 상품 목록입니다.`;

  if (categoryProducts.length === 0) {
    description += '\n\n* 판매 중인 상품이 없습니다.';
  } else {
    description +=
      '\n\n' +
      categoryProducts
        .map(
          (p) =>
            `• **상품명:** \`${p.name}\`  |  **가격:** \`${p.price.toLocaleString()}원\``
        )
        .join('\n');
  }

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle(`🛍️ ${selectedCategory} 상품 목록`)
    .setDescription(description);

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_items_for_sale') // Go back to category list
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(btnBack);

  await interaction.update({ embeds: [embed], components: [row] });
}

// ----------------------------------------------------
// Vending Purchase Button Interaction Handlers
// ----------------------------------------------------

export async function handleBuy(interaction) {
  const dbData = db.read();
  const products = dbData.products || {};
  const categories = new Set();

  Object.values(products).forEach((p) => {
    if (p.category) categories.add(p.category);
  });

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle('🛒 구매 - 카테고리 선택')
    .setDescription('구매하실 상품의 카테고리를 선택해 주세요.');

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_buy_select_category')
    .setPlaceholder('카테고리를 선택하세요');

  if (categories.size === 0) {
    embed.setDescription('❌ 현재 판매중인 카테고리가 없습니다.');
    selectMenu
      .addOptions({
        label: '등록된 카테고리가 없습니다',
        value: 'no_categories_buy',
        description: '상품이 등록되면 카테고리가 활성화됩니다.',
      })
      .setDisabled(true);
  } else {
    const catMap = {};
    Object.values(products).forEach((p) => {
      if (p.category) {
        catMap[p.category] = (catMap[p.category] || 0) + 1;
      }
    });
    embed.setDescription(
      '구매하실 상품의 카테고리를 선택해 주세요.\n\n' +
        Array.from(categories)
          .map((cat) => `• **${cat}** : \`${catMap[cat]}개 상품\``)
          .join('\n')
    );
    selectMenu.addOptions(
      Array.from(categories).map((cat) => ({
        label: cat,
        value: cat,
      }))
    );
  }

  const row = new ActionRowBuilder().addComponents(selectMenu);

  if (interaction.message && interaction.message.flags.has('Ephemeral')) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
}

export async function handleBuySelectCategory(interaction) {
  const selectedCategory = interaction.values[0];
  const dbData = db.read();
  const products = dbData.products || {};

  const categoryProducts = Object.values(products).filter(
    (p) => p.category === selectedCategory
  );

  const embed = new EmbedBuilder()
    .setColor('#7B2CB7')
    .setTitle(`🛒 [${selectedCategory}] 상품 선택`)
    .setDescription(
      `구매하실 상품을 선택해 주세요.\n\n` +
        categoryProducts
          .map(
            (p) =>
              `• **${p.name}** | 가격: \`${p.price.toLocaleString()}원\` | 재고: \`${p.stockCount}개\``
          )
          .join('\n')
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_buy_select_product')
    .setPlaceholder('구매할 상품을 선택하세요');

  if (categoryProducts.length === 0) {
    selectMenu
      .addOptions({
        label: '등록된 상품이 없습니다',
        value: 'no_products_buy',
      })
      .setDisabled(true);
  } else {
    selectMenu.addOptions(
      categoryProducts.map((p) => ({
        label: `${p.stockCount === 0 ? '[품절] ' : ''}${p.name}`.slice(0, 50),
        value: p.id,
        description: `가격: ${p.price.toLocaleString()}원 | 재고: ${p.stockCount}개`,
      }))
    );
  }

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_buy_back_to_categories')
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder().addComponents(btnBack);

  await interaction.update({ embeds: [embed], components: [rowMenu, rowBtn] });
}

export async function handleBuySelectProduct(interaction) {
  const productId = interaction.values[0];
  if (productId === 'no_products_buy') return;

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

  if (product.stockCount <= 0) {
    await interaction.reply({
      content: '❌ 이 상품은 현재 품절 상태입니다!',
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`vending_buy_modal_${productId}`)
    .setTitle(`구매 수량 선택 - ${product.name.slice(0, 20)}`);

  const qtyInput = new TextInputBuilder()
    .setCustomId('buy_quantity')
    .setLabel('구매할 수량 (숫자만 입력)')
    .setValue('1')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));

  await interaction.showModal(modal);
}

export async function handleBuyModalSubmit(interaction, productId) {
  const qtyStr = interaction.fields.getTextInputValue('buy_quantity');
  const quantity = parseInt(qtyStr, 10);

  if (isNaN(quantity) || quantity <= 0) {
    await interaction.reply({
      content: '❌ 구매 수량은 1 이상의 올바른 숫자로 입력해 주세요!',
      ephemeral: true,
    });
    return;
  }

  // Double read to lock state
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

  if (product.stockCount < quantity) {
    await interaction.reply({
      content: `❌ 재고가 부족합니다! (현재 재고: \`${product.stockCount}개\` / 요청 수량: \`${quantity}개\`)`,
      ephemeral: true,
    });
    return;
  }

  const userStats = db.getUser(interaction.user.id, interaction.user.username);
  const totalPrice = product.price * quantity;

  if (userStats.balance < totalPrice) {
    await interaction.reply({
      content: `❌ 잔액이 부족합니다!\n• **필요 금액:** \`${totalPrice.toLocaleString()}원\`\n• **현재 잔액:** \`${userStats.balance.toLocaleString()}원\``,
      ephemeral: true,
    });
    return;
  }

  // Deduct values and save for rollback
  const previousUserBalance = userStats.balance;
  const previousUserPurchased = userStats.totalPurchased;
  const previousProductStock = product.stockCount;
  let previousSpecialStock = null;

  userStats.balance -= totalPrice;
  userStats.totalPurchased = (userStats.totalPurchased || 0) + totalPrice;
  product.stockCount -= quantity;

  let deliveredItems = [];
  const isSpecial = product.specialStock && product.specialStock.length > 0;

  if (isSpecial) {
    previousSpecialStock = [...product.specialStock];
    for (let i = 0; i < quantity; i++) {
      const item = product.specialStock.shift();
      if (item) {
        deliveredItems.push(item);
      }
    }
  }

  // Save changes locally in dbData references
  dbData.users[interaction.user.id] = userStats;
  dbData.products[productId] = product;
  db.write(dbData);

  // Attempt to DM the user the details
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🛒 상품 구매 완료')
      .setDescription(
        `안녕하세요, **자판기**를 이용해 주셔서 진심으로 감사드립니다!\n` +
          `구매하신 상품 및 결제 상세 정보는 다음과 같습니다.\n\n` +
          `📦 **구매 상품:** \`${product.name}\`\n` +
          `🔢 **구매 수량:** \`${quantity}개\`\n` +
          `💵 **결제 금액:** \`${totalPrice.toLocaleString()}원\`\n` +
          `💳 **구매 후 잔액:** \`${userStats.balance.toLocaleString()}원\`\n` +
          `📅 **구매 일시:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
          (isSpecial
            ? `🔑 **세부 구매 내역:**\n` +
              deliveredItems
                .map((item, idx) => `**[${idx + 1}]** \`${item}\``)
                .join('\n')
            : `✅ **일반 상품 구매가 정상적으로 완료되었습니다. 이용해 주셔서 감사합니다!**`)
      );

    await interaction.user.send({ embeds: [dmEmbed] });

    // DM sent successfully, confirm to user ephemerally
    const successEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('✅ 구매 완료')
      .setDescription(
        `💳 **결제 금액:** \`${totalPrice.toLocaleString()}원\`\n` +
          `📩 **상품 정보가 개인 DM으로 성공적으로 전송되었습니다.**\n` +
          `확인해 주세요!`
      );

    await interaction.reply({ embeds: [successEmbed], ephemeral: true });

    // Send purchase log if a purchase log channel is configured
    if (dbData.config?.purchaseLogChannelId) {
      try {
        const logChannel = await interaction.client.channels.fetch(
          dbData.config.purchaseLogChannelId
        );
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('🛒 상품 구매 로그')
            .setDescription(
              `👤 **구매 유저:** <@${interaction.user.id}> (${interaction.user.username})\n` +
                `📦 **구매 상품:** \`${product.name}\`\n` +
                `🔢 **구매 수량:** \`${quantity}개\`\n` +
                `💵 **결제 금액:** \`${totalPrice.toLocaleString()}원\`\n` +
                `📅 **구매 일시:** <t:${Math.floor(Date.now() / 1000)}:F>`
            );
          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (logError) {
        console.error('Failed to send purchase log to channel:', logError);
      }
    }
  } catch (error) {
    console.error(
      'Failed to send DM to user, rolling back transaction:',
      error
    );

    // ROLLBACK TRANSACTION
    const rollbackData = db.read();
    if (rollbackData.users[interaction.user.id]) {
      rollbackData.users[interaction.user.id].balance = previousUserBalance;
      rollbackData.users[interaction.user.id].totalPurchased =
        previousUserPurchased;
    }
    if (rollbackData.products[productId]) {
      rollbackData.products[productId].stockCount = previousProductStock;
      if (isSpecial) {
        rollbackData.products[productId].specialStock = previousSpecialStock;
      }
    }
    db.write(rollbackData);

    await interaction.reply({
      content:
        '❌ **개인 DM을 발송할 수 없어 구매 처리가 취소(롤백)되었습니다.**\n\n' +
        '**원인:** 디스코드 개인정보 보호 설정으로 인해 봇이 DM을 보낼 수 없는 상태입니다.\n' +
        '**해결 방법:** 디스코드 설정 -> [개인정보 보호 및 보안] -> **[서버 멤버가 보내는 개인 메시지 허용]**을 활성화한 후 다시 구매해 주세요!',
      ephemeral: true,
    });
  }
}

// ----------------------------------------------------
// Vending Recharge Button Interaction Handlers
// ----------------------------------------------------

export async function handleCharge(interaction) {
  const dbData = db.read();
  const config = dbData.config || {};

  // Check if charge settings are configured
  if (!config.bankInfo || !config.accountHolder) {
    await interaction.reply({
      content: '❌ **현재 자동 충전 시스템이 활성화되지 않았습니다.**\n관리자가 `/충전세팅` 명령어로 계좌 정보를 설정한 후 이용할 수 있습니다.',
      ephemeral: true,
    });
    return;
  }

  // Check if there is an active pending charge for this user
  const pendingCharges = dbData.pendingCharges || [];
  const activeCharge = pendingCharges.find(
    c => c.userId === interaction.user.id && (Date.now() - c.createdAt < 5 * 60 * 1000)
  );

  if (activeCharge) {
    const elapsed = Date.now() - activeCharge.createdAt;
    if (elapsed < 1 * 60 * 1000) {
      await interaction.reply({
        content: '❌ 이미 대기중인 충전이 있습니다 1분후 다시 시도 해주세요 !',
        ephemeral: true,
      });
      return;
    }
  }

  const modal = new ModalBuilder()
    .setCustomId('vending_charge_modal_submit')
    .setTitle('💵 자판기 잔액 충전 신청');

  const nameInput = new TextInputBuilder()
    .setCustomId('charge_depositor_name')
    .setLabel('입금자명')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('실제 이체하실 입금자명을 입력해 주세요.')
    .setMaxLength(10);

  const amountInput = new TextInputBuilder()
    .setCustomId('charge_amount')
    .setLabel('충전할 금액 (숫자만)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('예: 10000')
    .setMaxLength(8);

  const row1 = new ActionRowBuilder().addComponents(nameInput);
  const row2 = new ActionRowBuilder().addComponents(amountInput);

  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}

export async function handleChargeModalSubmit(interaction) {
  const depositorName = interaction.fields.getTextInputValue('charge_depositor_name').trim();
  const amountStr = interaction.fields.getTextInputValue('charge_amount').trim();

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    await interaction.reply({
      content: '❌ **충전 금액은 0원보다 큰 숫자(정수)로만 입력해 주세요!**',
      ephemeral: true,
    });
    return;
  }

  const dbData = db.read();
  const config = dbData.config || {};

  // Remove any previous pending charges for this user to avoid duplicates
  if (dbData.pendingCharges) {
    dbData.pendingCharges = dbData.pendingCharges.filter(c => c.userId !== interaction.user.id);
  } else {
    dbData.pendingCharges = [];
  }

  // Create pending charge object
  const pendingCharge = {
    userId: interaction.user.id,
    username: interaction.user.username,
    depositorName: depositorName,
    amount: amount,
    createdAt: Date.now()
  };

  dbData.pendingCharges.push(pendingCharge);
  db.write(dbData);

  const embed = new EmbedBuilder()
    .setColor('#F1C40F') // Yellow/Gold
    .setTitle('💵 충전 신청 완료')
    .setDescription(
      `아래 계좌로 입금해 주시면 입금이 확인되는 즉시 자동으로 충전됩니다.\n\n` +
      `🏦 **입금 계좌:** \`${config.bankInfo}\`\n` +
      `👤 **예금주:** \`${config.accountHolder}\`\n` +
      `💰 **입금 금액:** \`${amount.toLocaleString()}원\`\n` +
      `👤 **입금자명:** \`${depositorName}\`\n\n` +
      `⚠️ **주의사항**\n` +
      `- 반드시 입력하신 **입금자명(\`${depositorName}\`)**과 **금액(\`${amount.toLocaleString()}원\`** 그대로 정확하게 송금해 주셔야 합니다.\n` +
      `- **5분 이내**에 입금이 완료되어야 자동으로 반영됩니다. 5분이 지난 입금 건은 만료 처리됩니다.`
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });

  // Save interaction to active charge map to allow real-time success updates from Pushbullet listener
  pushbullet.activeChargeInteractions.set(interaction.user.id, interaction);

  // Set timeout to handle 5-minute expiration
  setTimeout(async () => {
    try {
      const currentDb = db.read();
      const stillPending = (currentDb.pendingCharges || []).some(
        c => c.userId === pendingCharge.userId && c.createdAt === pendingCharge.createdAt
      );

      if (stillPending) {
        // Remove from database
        currentDb.pendingCharges = (currentDb.pendingCharges || []).filter(
          c => !(c.userId === pendingCharge.userId && c.createdAt === pendingCharge.createdAt)
        );
        db.write(currentDb);

        // Remove from active interactions map
        pushbullet.activeChargeInteractions.delete(pendingCharge.userId);

        await interaction.editReply({
          content: '❌ 시간이 경과되어서 충전에 실패했습니다.',
          embeds: []
        });
        console.log(`Charge timeout: Expired charge request for ${pendingCharge.username} (${pendingCharge.userId})`);
      }
    } catch (err) {
      console.error('Error handling charge timeout:', err);
    }
  }, 5 * 60 * 1000);
}

// ----------------------------------------------------
// Vending Random Box Button Interaction Handlers
// ----------------------------------------------------

export async function handleRandomBoxButton(interaction) {
  const dbData = db.read();
  const randomBoxes = dbData.randomBoxes || {};
  const boxList = Object.values(randomBoxes);

  if (boxList.length === 0) {
    await interaction.reply({
      content: '❌ **현재 등록된 랜덤박스가 없습니다.**\n관리자가 `/랜덤박스추가` 명령어로 상자를 설정한 후 이용할 수 있습니다.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor('#9B59B6') // Amethyst Purple
    .setTitle('🎁 랜덤박스 상점')
    .setDescription(
      '🪙 **뽑고 싶은 랜덤박스를 아래 메뉴에서 선택해 주세요!**\n\n' +
      boxList.map(box => `• **${box.name}** | 가격: \`${box.price.toLocaleString()}원\``).join('\n')
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_randombox_select')
    .setPlaceholder('구매할 랜덤박스를 선택하세요')
    .addOptions(
      boxList.map((box) => ({
        label: box.name.slice(0, 50),
        value: box.id,
        description: `가격: ${box.price.toLocaleString()}원`,
      }))
    );

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_info_back') // Return to main vending menu
    .setLabel('처음으로')
    .setStyle(ButtonStyle.Secondary);

  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder().addComponents(btnBack);

  await interaction.reply({
    embeds: [embed],
    components: [rowMenu, rowBtn],
    ephemeral: true,
  });
}

export async function handleRandomBoxBackToList(interaction) {
  const dbData = db.read();
  const randomBoxes = dbData.randomBoxes || {};
  const boxList = Object.values(randomBoxes);

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle('🎁 랜덤박스 상점')
    .setDescription(
      '🪙 **뽑고 싶은 랜덤박스를 아래 메뉴에서 선택해 주세요!**\n\n' +
      boxList.map(box => `• **${box.name}** | 가격: \`${box.price.toLocaleString()}원\``).join('\n')
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('vending_randombox_select')
    .setPlaceholder('구매할 랜덤박스를 선택하세요')
    .addOptions(
      boxList.map((box) => ({
        label: box.name.slice(0, 50),
        value: box.id,
        description: `가격: ${box.price.toLocaleString()}원`,
      }))
    );

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_info_back')
    .setLabel('처음으로')
    .setStyle(ButtonStyle.Secondary);

  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);
  const rowBtn = new ActionRowBuilder().addComponents(btnBack);

  await interaction.update({
    embeds: [embed],
    components: [rowMenu, rowBtn],
  });
}

export async function handleRandomBoxSelect(interaction) {
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

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle(`🎁 랜덤박스 상세 정보 - ${box.name}`)
    .setDescription(
      `상세 정보를 확인하신 후 구매를 결정해 주세요.\n\n` +
      `💵 **구매 가격:** \`${box.price.toLocaleString()}원\`\n\n` +
      `📊 **당첨 확률 목록:**\n` +
      box.grades.map(g => `• **${g.grade}**: \`${g.displayProbability}%\``).join('\n')
    );

  const btnBuy = new ButtonBuilder()
    .setCustomId(`vending_randombox_buy_${box.id}`)
    .setLabel('구매하기')
    .setEmoji('🎁')
    .setStyle(ButtonStyle.Danger);

  const btnBack = new ButtonBuilder()
    .setCustomId('vending_randombox_back_to_list')
    .setLabel('뒤로 가기')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(btnBuy, btnBack);

  await interaction.update({
    embeds: [embed],
    components: [row],
  });
}

export async function handleRandomBoxBuy(interaction, boxId) {
  const dbData = db.read();
  const randomBoxes = dbData.randomBoxes || {};
  const box = randomBoxes[boxId];

  if (!box) {
    await interaction.reply({
      content: '❌ 해당 랜덤박스 상품이 더 이상 존재하지 않습니다.',
      ephemeral: true,
    });
    return;
  }

  // Check user balance
  const user = db.getUser(interaction.user.id, interaction.user.username);
  if ((user.balance || 0) < box.price) {
    await interaction.reply({
      content: `❌ **잔액이 부족합니다.**\n현재 잔액: \`${(user.balance || 0).toLocaleString()}원\` | 랜덤박스 가격: \`${box.price.toLocaleString()}원\``,
      ephemeral: true,
    });
    return;
  }

  // Draw grade using Weighted Random Algorithm on actualProbability
  const grades = box.grades || [];
  let rand = Math.random() * 100;
  let cumulative = 0;
  let drawnGrade = null;

  for (const g of grades) {
    cumulative += g.actualProbability;
    if (rand <= cumulative) {
      drawnGrade = g.grade;
      break;
    }
  }

  // Fallback if draw fails somehow
  if (!drawnGrade && grades.length > 0) {
    drawnGrade = grades[grades.length - 1].grade;
  }

  // Deduct balance and update user stats in database
  const freshDb = db.read();
  const freshUser = freshDb.users[interaction.user.id];
  freshUser.balance = (freshUser.balance || 0) - box.price;
  freshUser.totalPurchased = (freshUser.totalPurchased || 0) + box.price;

  // Add draw transaction
  if (!freshDb.transactions) freshDb.transactions = [];
  freshDb.transactions.push({
    userId: interaction.user.id,
    username: interaction.user.username,
    type: 'randombox_purchase',
    boxName: box.name,
    price: box.price,
    drawnGrade: drawnGrade,
    timestamp: Date.now()
  });

  db.write(freshDb);

  // Initial animation message
  const initialEmbed = new EmbedBuilder()
    .setColor('#F1C40F')
    .setTitle('🎁 랜덤박스 개봉 중...')
    .setDescription(
      `과연 어떤 등급의 상품이 당첨될까요? 룰렛 회전 중...\n\n` +
      grades.map((g, idx) => `　 ⚪ **${g.grade}** (공개 확률: \`${g.displayProbability}%\`)`).join('\n')
    );

  await interaction.update({
    embeds: [initialEmbed],
    components: [], // Remove buttons to prevent multiple clicks
  });

  // Start frame-by-frame roulette animation
  let currentFrame = 0;
  const totalFrames = 10; // 10 seconds total, 1 second per edit frame

  const runAnimation = async () => {
    try {
      if (currentFrame >= totalFrames) {
        // Final congratulations screen
        const finalEmbed = new EmbedBuilder()
          .setColor('#2ECC71') // Green for success
          .setTitle('🎉 랜덤박스 개봉 완료!')
          .setDescription(
            `**${interaction.user.username}**님이 랜덤박스를 성공적으로 열었습니다!\n\n` +
            `📦 **구매한 상자:** \`${box.name}\`\n` +
            `🏆 **당첨 등급:** \`${drawnGrade}\`\n\n` +
            `⚠️ **수동 지급 상품 안내**\n` +
            `관리자가 확인 후 순차적으로 상품을 수동 지급해 드릴 예정입니다.\n` +
            `수동 지급 대기 상태가 되었으며 관련 세부 사항은 DM으로도 전송되었습니다.`
          )
          .setTimestamp();

        await interaction.editReply({
          embeds: [finalEmbed]
        });

        // Send DM to user
        try {
          const discordUser = await interaction.client.users.fetch(interaction.user.id);
          const dmEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🎁 [랜덤박스 당첨 안내]')
            .setDescription(
              `구매하신 **${box.name}**에서 아래 등급에 당첨되었습니다!\n\n` +
              `🏆 **당첨 등급:** \`${drawnGrade}\`\n` +
              `💵 **구매 단가:** \`${box.price.toLocaleString()}원\`\n` +
              `🪙 **구매 후 잔액:** \`${freshUser.balance.toLocaleString()}원\`\n\n` +
              `이 상품은 관리자 수동 지급 상품입니다. 관리자가 확인 후 빠른 시일 내에 지급해 드릴 예정이오니 잠시만 기다려 주세요!`
            )
            .setTimestamp();
          await discordUser.send({ embeds: [dmEmbed] });
        } catch (dmErr) {
          console.error('Failed to send DM to randombox winner:', dmErr);
        }

        // Log to charge/purchase log channel if configured
        const purchaseLogChannelId = freshDb.config?.purchaseLogChannelId || freshDb.config?.logChannelId;
        if (purchaseLogChannelId) {
          try {
            const logChannel = await interaction.client.channels.fetch(purchaseLogChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎁 [랜덤박스 가챠] 당첨 로그')
                .setDescription(
                  `👤 **구매 유저:** <@${interaction.user.id}> (${interaction.user.username})\n` +
                  `📦 **구매 상자:** \`${box.name}\` (\`${box.price.toLocaleString()}원\`)\n` +
                  `🏆 **당첨 등급:** \`${drawnGrade}\` (★ 수동 지급 대기)\n` +
                  `🪙 **구매 후 잔액:** \`${freshUser.balance.toLocaleString()}원\`\n` +
                  `📅 **일시:** <t:${Math.floor(Date.now() / 1000)}:F>`
                );
              await logChannel.send({ embeds: [logEmbed] });
            }
          } catch (logErr) {
            console.error('Failed to write randombox purchase log to channel:', logErr);
          }
        }
        return;
      }

      // Determine which grade is highlighted in this frame
      let highlightedIndex = currentFrame % grades.length;
      
      // In the last two frames, force pointer to align with the drawnGrade
      if (currentFrame === totalFrames - 2) {
        const targetIndex = grades.findIndex(g => g.grade === drawnGrade);
        highlightedIndex = (targetIndex - 1 + grades.length) % grades.length;
      } else if (currentFrame === totalFrames - 1) {
        highlightedIndex = grades.findIndex(g => g.grade === drawnGrade);
      }

      const animEmbed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🎁 랜덤박스 개봉 중...')
        .setDescription(
          `과연 어떤 등급의 상품이 당첨될까요? 룰렛 회전 중...\n\n` +
          grades.map((g, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return `${isHighlighted ? '➡️ 🔴' : '　 ⚪'} **${g.grade}** (공개 확률: \`${g.displayProbability}%\`)`;
          }).join('\n')
        );

      await interaction.editReply({ embeds: [animEmbed] });

      currentFrame++;
      setTimeout(runAnimation, 1000); // 1.0s interval to prevent Discord API rate limit
    } catch (err) {
      console.error('Error during randombox animation frame:', err);
    }
  };

  // Run the animation
  setTimeout(runAnimation, 1000);
}


