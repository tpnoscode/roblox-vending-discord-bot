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
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import path from 'path';
import * as db from '../../utils/db.js';
import * as pushbullet from '../../utils/pushbullet.js';

export const data = new SlashCommandBuilder()
  .setName('자판기')
  .setDescription('자판기 관련 명령어입니다.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('생성')
      .setDescription('화면에 자판기 UI를 생성합니다.')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === '생성') {
    const embed = new EmbedBuilder()
      .setColor('#7B2CB7') // Purple
      .setTitle('24시간 자동 판매 자판기')
      .setDescription(
        '**24시간 언제든 자동으로 충전 및 구매가 가능한 자판기입니다.**\n\n' +
        '⚠️ **오류 발생 시 고객센터로 문의해 주세요!**'
      );

    const btnInfo = new ButtonBuilder()
      .setCustomId('vending_info')
      .setLabel('정보')
      .setEmoji('📖')
      .setStyle(ButtonStyle.Primary);

    const btnCharge = new ButtonBuilder()
      .setCustomId('vending_charge')
      .setLabel('충전')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success);

    const btnBuy = new ButtonBuilder()
      .setCustomId('vending_buy')
      .setLabel('구매')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Secondary);

    const btnRandom = new ButtonBuilder()
      .setCustomId('vending_randombox')
      .setLabel('랜덤박스')
      .setEmoji('🎁')
      .setStyle(ButtonStyle.Danger);

    const btnInquiry = new ButtonBuilder()
      .setCustomId('vending_inquiry')
      .setLabel('문의하기')
      .setEmoji('🙋‍♂️')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(
      btnInfo,
      btnCharge,
      btnBuy,
      btnRandom,
      btnInquiry
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
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

  // 공유 DB 트랜잭션(FOR UPDATE) — 재고확인+차감을 원자적으로 처리.
  // 예전엔 read/write 사이에 잠금이 없어서 동시 구매 시 재고가 마이너스로 팔리거나
  // (오버셀) 잔액 차감이 유실될 수 있었음.
  let tx;
  try {
    tx = await db.updateState((dbData) => {
      const products = dbData.products || {};
      const product = products[productId];

      if (!product) {
        return { error: 'NOT_FOUND' };
      }
      if (product.stockCount < quantity) {
        return { error: 'OUT_OF_STOCK', stockCount: product.stockCount };
      }

      dbData.users = dbData.users || {};
      if (!dbData.users[interaction.user.id]) {
        dbData.users[interaction.user.id] = {
          username: interaction.user.username,
          balance: 0,
          totalCharged: 0,
          totalPurchased: 0,
        };
      }
      const userStats = dbData.users[interaction.user.id];
      const totalPrice = product.price * quantity;

      if ((userStats.balance || 0) < totalPrice) {
        return { error: 'INSUFFICIENT_BALANCE', balance: userStats.balance || 0, totalPrice };
      }

      userStats.balance -= totalPrice;
      userStats.totalPurchased = (userStats.totalPurchased || 0) + totalPrice;
      product.stockCount -= quantity;

      let deliveredItems = [];
      const isSpecial = product.specialStock && product.specialStock.length > 0;
      if (isSpecial) {
        for (let i = 0; i < quantity; i++) {
          const item = product.specialStock.shift();
          if (item) deliveredItems.push(item);
        }
      }

      return {
        ok: true,
        totalPrice,
        newBalance: userStats.balance,
        productName: product.name,
        isSpecial,
        deliveredItems,
        purchaseLogChannelId: dbData.config?.purchaseLogChannelId,
      };
    });
  } catch (err) {
    console.error('구매 처리 실패:', err);
    await interaction.reply({ content: '❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', ephemeral: true });
    return;
  }

  if (tx.error === 'NOT_FOUND') {
    await interaction.reply({ content: '❌ 상품 정보를 찾을 수 없습니다.', ephemeral: true });
    return;
  }
  if (tx.error === 'OUT_OF_STOCK') {
    await interaction.reply({
      content: `❌ 재고가 부족합니다! (현재 재고: \`${tx.stockCount}개\` / 요청 수량: \`${quantity}개\`)`,
      ephemeral: true,
    });
    return;
  }
  if (tx.error === 'INSUFFICIENT_BALANCE') {
    await interaction.reply({
      content: `❌ 잔액이 부족합니다!\n• **필요 금액:** \`${tx.totalPrice.toLocaleString()}원\`\n• **현재 잔액:** \`${tx.balance.toLocaleString()}원\``,
      ephemeral: true,
    });
    return;
  }

  const { totalPrice, newBalance, productName, isSpecial, deliveredItems, purchaseLogChannelId } = tx;

  // Attempt to DM the user the details
  try {
    const dmEmbed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🛒 상품 구매 완료')
      .setDescription(
        `안녕하세요, **자판기**를 이용해 주셔서 진심으로 감사드립니다!\n` +
          `구매하신 상품 및 결제 상세 정보는 다음과 같습니다.\n\n` +
          `📦 **구매 상품:** \`${productName}\`\n` +
          `🔢 **구매 수량:** \`${quantity}개\`\n` +
          `💵 **결제 금액:** \`${totalPrice.toLocaleString()}원\`\n` +
          `💳 **구매 후 잔액:** \`${newBalance.toLocaleString()}원\`\n` +
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
    if (purchaseLogChannelId) {
      try {
        const logChannel = await interaction.client.channels.fetch(purchaseLogChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('🛒 상품 구매 로그')
            .setDescription(
              `👤 **구매 유저:** <@${interaction.user.id}> (${interaction.user.username})\n` +
                `📦 **구매 상품:** \`${productName}\`\n` +
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

    // ROLLBACK TRANSACTION — 스냅샷으로 덮어쓰지 않고 상대적으로 되돌림
    // (그 사이 다른 구매/충전이 있었어도 그 변경분을 잃지 않도록).
    try {
      await db.updateState((dbData) => {
        const u = dbData.users?.[interaction.user.id];
        if (u) {
          u.balance = (u.balance || 0) + totalPrice;
          u.totalPurchased = Math.max(0, (u.totalPurchased || 0) - totalPrice);
        }
        const p = dbData.products?.[productId];
        if (p) {
          p.stockCount = (p.stockCount || 0) + quantity;
          if (isSpecial && deliveredItems.length) {
            p.specialStock = [...deliveredItems, ...(p.specialStock || [])];
          }
        }
      });
    } catch (rollbackErr) {
      console.error('구매 롤백 실패(수동 확인 필요):', rollbackErr);
    }

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

  // 공유 DB 트랜잭션 — 자동충전 매칭(pushbullet.js)이 같은 pendingCharges 배열을
  // 동시에 읽고/쓰므로, 잠금 없이 read-modify-write 하면 매칭 성공을 통째로 덮어써
  // 없애버릴 수 있음(충전 성공 직후 유저가 재요청하면 그 성공기록이 사라지는 사고 가능).
  let txResult;
  try {
    txResult = await db.updateState((dbData) => {
      const config = dbData.config || {};

      // Remove any previous pending charges for this user to avoid duplicates
      dbData.pendingCharges = (dbData.pendingCharges || []).filter(c => c.userId !== interaction.user.id);

      // Create pending charge object
      const pendingCharge = {
        userId: interaction.user.id,
        username: interaction.user.username,
        depositorName: depositorName,
        amount: amount,
        createdAt: Date.now()
      };

      dbData.pendingCharges.push(pendingCharge);

      return { config, pendingCharge };
    });
  } catch (err) {
    console.error('충전 신청 처리 실패:', err);
    await interaction.reply({ content: '❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', ephemeral: true });
    return;
  }

  const { config, pendingCharge } = txResult;

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
      // 트랜잭션 안에서 확인+제거를 원자적으로 — pushbullet 매칭과 동시에 실행돼도
      // "이미 매칭되어 사라진 건"을 잘못 만료 처리하지 않도록 보장.
      const { stillPending } = await db.updateState((dbData) => {
        const wasStillPending = (dbData.pendingCharges || []).some(
          c => c.userId === pendingCharge.userId && c.createdAt === pendingCharge.createdAt
        );
        if (wasStillPending) {
          dbData.pendingCharges = (dbData.pendingCharges || []).filter(
            c => !(c.userId === pendingCharge.userId && c.createdAt === pendingCharge.createdAt)
          );
        }
        return { stillPending: wasStillPending };
      });

      if (stillPending) {
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

  const gradesList = (box.grades && box.grades.length > 0)
    ? box.grades.map(g => `• **${g.grade}** (확률: \`${g.displayProbability}%\`) | 보상: \`${g.reward}\``).join('\n')
    : '⚠️ 등록된 구성품(등급/확률/보상)이 없습니다. `/랜덤박스관리` 명령어에서 먼저 등록해 주세요.';

  const embed = new EmbedBuilder()
    .setColor('#9B59B6')
    .setTitle(`🎁 랜덤박스 상세 정보 - ${box.name}`)
    .setDescription(
      `상세 정보를 확인하신 후 구매를 결정해 주세요.\n\n` +
      `💵 **구매 가격:** \`${box.price.toLocaleString()}원\`\n\n` +
      `📊 **당첨 확률 및 구성품:**\n` +
      gradesList
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

  const grades = box.grades || [];
  if (grades.length === 0) {
    await interaction.reply({
      content: '❌ **해당 랜덤박스는 준비 중입니다. (구성품 미등록)**\n관리자가 `/랜덤박스관리` 명령어에서 구성품을 먼저 설정해야 구매할 수 있습니다.',
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`vending_randombox_buy_modal_${box.id}`)
    .setTitle(`🎁 수량 선택 - ${box.name.slice(0, 20)}`);

  const qtyInput = new TextInputBuilder()
    .setCustomId('randombox_buy_quantity')
    .setLabel('구매할 수량 (1 ~ 100)')
    .setValue('1')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));

  await interaction.showModal(modal);
}

export async function handleRandomBoxBuyModalSubmit(interaction, boxId) {
  const qtyStr = interaction.fields.getTextInputValue('randombox_buy_quantity').trim();
  let quantity = parseInt(qtyStr, 10);

  if (isNaN(quantity) || quantity <= 0) {
    quantity = 1;
  }
  if (quantity > 100) {
    await interaction.reply({
      content: '❌ 랜덤박스는 한 번에 최대 100개까지만 구매할 수 있습니다.',
      ephemeral: true,
    });
    return;
  }

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

  const grades = box.grades || [];
  if (grades.length === 0) {
    await interaction.reply({
      content: '❌ **해당 랜덤박스는 준비 중입니다. (구성품 미등록)**\n관리자가 `/랜덤박스관리` 명령어에서 구성품을 먼저 설정해야 구매할 수 있습니다.',
      ephemeral: true,
    });
    return;
  }

  // Check user balance
  const user = db.getUser(interaction.user.id, interaction.user.username);
  const totalPrice = box.price * quantity;
  if ((user.balance || 0) < totalPrice) {
    await interaction.reply({
      content: `❌ **잔액이 부족합니다.**\n현재 잔액: \`${(user.balance || 0).toLocaleString()}원\` | 결제 금액: \`${totalPrice.toLocaleString()}원\` (단가: \`${box.price.toLocaleString()}원\` * \`${quantity}개\`)`,
      ephemeral: true,
    });
    return;
  }

  // Initial animation message (sequentially highlight the first grade index 0)
  const initialEmbed = new EmbedBuilder()
    .setColor('#F1C40F')
    .setTitle('🎰 랜덤박스 고속 개봉 중... 🎰')
    .setDescription(
      `과연 어떤 등급의 상품이 당첨될까요? 룰렛 고속 회전 중...\n\n` +
      `📦 **구매 수량:** \`${quantity}개\`\n\n` +
      grades.map((g, idx) => {
        const isHighlighted = idx === 0;
        return `${isHighlighted ? '➡️ 🔴' : '　 ⚪'} **${g.grade}** (공개 확률: \`${g.displayProbability}%\`)`;
      }).join('\n')
    );

  await interaction.reply({
    embeds: [initialEmbed],
    ephemeral: true,
  });

  // Execute draws (추첨 자체는 순수 계산이라 트랜잭션 밖에서 먼저 해도 안전 — DB엔 아무 영향 없음)
  const drawnResults = [];
  let highestGradeIndex = grades.length; // lower index is higher grade
  let bestDrawnGrade = null;
  let bestDrawnReward = null;

  for (let i = 0; i < quantity; i++) {
    let rand = Math.random() * 100;
    let cum = 0;
    let drawnGrade = null;
    let gradeIdx = -1;

    for (let j = 0; j < grades.length; j++) {
      const g = grades[j];
      cum += g.actualProbability;
      if (rand <= cum) {
        drawnGrade = g.grade;
        gradeIdx = j;
        break;
      }
    }

    if (gradeIdx === -1 && grades.length > 0) {
      gradeIdx = grades.length - 1;
      drawnGrade = grades[gradeIdx].grade;
    }

    const drawnGradeObj = grades[gradeIdx];
    const drawnReward = drawnGradeObj ? drawnGradeObj.reward : '보상 정보 없음';

    drawnResults.push({ grade: drawnGrade, reward: drawnReward, index: gradeIdx });

    // Track highest grade drawn (lowest index)
    if (gradeIdx < highestGradeIndex) {
      highestGradeIndex = gradeIdx;
      bestDrawnGrade = drawnGrade;
      bestDrawnReward = drawnReward;
    }
  }

  // 공유 DB 트랜잭션(FOR UPDATE) — 잔액 차감 + 거래기록을 원자적으로 처리.
  // 애니메이션 시작 전 잔액을 한 번 확인했지만, 그 사이(리플라이 대기 등) 다른 구매로
  // 잔액이 줄었을 수 있으므로 실제 차감 직전 트랜잭션 안에서 다시 한 번 검증한다.
  let tx;
  try {
    tx = await db.updateState((dbData) => {
      dbData.users = dbData.users || {};
      if (!dbData.users[interaction.user.id]) {
        dbData.users[interaction.user.id] = {
          username: interaction.user.username,
          balance: 0,
          totalCharged: 0,
          totalPurchased: 0,
        };
      }
      const freshUser = dbData.users[interaction.user.id];
      if ((freshUser.balance || 0) < totalPrice) {
        return { error: 'INSUFFICIENT_BALANCE', balance: freshUser.balance || 0 };
      }

      freshUser.balance = (freshUser.balance || 0) - totalPrice;
      freshUser.totalPurchased = (freshUser.totalPurchased || 0) + totalPrice;

      if (!dbData.transactions) dbData.transactions = [];
      for (const r of drawnResults) {
        dbData.transactions.push({
          userId: interaction.user.id,
          username: interaction.user.username,
          type: 'randombox_purchase',
          boxName: box.name,
          price: box.price,
          drawnGrade: r.grade,
          drawnReward: r.reward,
          timestamp: Date.now()
        });
      }

      return {
        ok: true,
        newBalance: freshUser.balance,
        randomBoxLogChannelId: dbData.config?.randomBoxLogChannelId,
        purchaseLogChannelId: dbData.config?.purchaseLogChannelId || dbData.config?.logChannelId,
      };
    });
  } catch (err) {
    console.error('랜덤박스 구매 처리 실패:', err);
    await interaction.editReply({ content: '❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', embeds: [] });
    return;
  }

  if (tx.error === 'INSUFFICIENT_BALANCE') {
    await interaction.editReply({
      content: `❌ **잔액이 부족합니다.**\n현재 잔액: \`${tx.balance.toLocaleString()}원\` | 결제 금액: \`${totalPrice.toLocaleString()}원\``,
      embeds: [],
    });
    return;
  }

  const { newBalance, randomBoxLogChannelId, purchaseLogChannelId } = tx;

  // Roulette animation sequence (7.2 seconds total, 400ms interval)
  let currentFrame = 0;
  const totalFrames = 18;

  const runSlotAnimation = async () => {
    try {
      if (currentFrame >= totalFrames) {
        // Summarize results
        const summary = {};
        for (const res of drawnResults) {
          if (!summary[res.grade]) {
            summary[res.grade] = { count: 0, reward: res.reward };
          }
          summary[res.grade].count++;
        }
        const summaryLines = Object.entries(summary)
          .map(([gradeName, info]) => `• **${gradeName}** (${info.count}개): \`${info.reward}\``)
          .join('\n');

        // Final congratulations screen showing highest grade drawn
        const finalEmbed = new EmbedBuilder()
          .setColor('#2ECC71')
          .setTitle('🎉 랜덤박스 개봉 완료! 🎉')
          .setDescription(
            `[ 🎉 당첨! **${bestDrawnGrade}** - **${bestDrawnReward}** 🎉 ]\n\n` +
            `**${interaction.user.username}**님이 랜덤박스 **${quantity}개**를 성공적으로 열었습니다!\n\n` +
            `👑 **최고 당첨 등급:** \`${bestDrawnGrade}\`\n` +
            `🎁 **최고 당첨 보상:** \`${bestDrawnReward}\`\n\n` +
            `📦 **전체 당첨 내역:**\n${summaryLines}\n\n` +
            `티켓을 열고 상품을 받아가세요`
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [finalEmbed] });

        // Send DM to user
        try {
          const discordUser = await interaction.client.users.fetch(interaction.user.id);
          const dmEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🎁 [랜덤박스 당첨 안내]')
            .setDescription(
              `구매하신 **${box.name}** (${quantity}개)에서 아래 상품들에 당첨되었습니다!\n\n` +
              `👑 **최고 당첨 등급:** \`${bestDrawnGrade}\`\n` +
              `🎁 **최고 당첨 보상:** \`${bestDrawnReward}\`\n\n` +
              `📦 **전체 당첨 내역:**\n${summaryLines}\n\n` +
              `💵 **구매 총액:** \`${totalPrice.toLocaleString()}원\` (단가: \`${box.price.toLocaleString()}원\`)\n` +
              `🪙 **구매 후 잔액:** \`${newBalance.toLocaleString()}원\`\n\n` +
              `티켓을 열고 상품을 받아가세요`
            )
            .setTimestamp();
          await discordUser.send({ embeds: [dmEmbed] });
        } catch (dmErr) {
          console.error('Failed to send DM to randombox winner:', dmErr);
        }

        // Log to random box log channel if configured
        if (randomBoxLogChannelId) {
          try {
            const logChannel = await interaction.client.channels.fetch(randomBoxLogChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎁 [랜덤박스 개봉 결과] 로그')
                .setDescription(
                  `👤 **구매 유저:** <@${interaction.user.id}> (${interaction.user.username})\n` +
                  `📦 **구매 상자:** \`${box.name}\` (\`${quantity}개\` / \`${totalPrice.toLocaleString()}원\`)\n` +
                  `🪙 **구매 후 잔액:** \`${newBalance.toLocaleString()}원\`\n\n` +
                  `👑 **최고 당첨 등급:** \`${bestDrawnGrade}\`\n` +
                  `🎁 **최고 당첨 보상:** \`${bestDrawnReward}\`\n\n` +
                  `📦 **전체 당첨 내역:**\n${summaryLines}\n\n` +
                  `📅 **일시:** <t:${Math.floor(Date.now() / 1000)}:F>`
                )
                .setTimestamp();
              await logChannel.send({ embeds: [logEmbed] });
            }
          } catch (logErr) {
            console.error('Failed to write randombox result log to channel:', logErr);
          }
        } else {
          // Fallback to charge/purchase log channel if configured
          if (purchaseLogChannelId) {
            try {
              const logChannel = await interaction.client.channels.fetch(purchaseLogChannelId);
              if (logChannel) {
                const logEmbed = new EmbedBuilder()
                  .setColor('#9B59B6')
                  .setTitle('🎁 [랜덤박스 가챠] 구매 로그')
                  .setDescription(
                    `👤 **구매 유저:** <@${interaction.user.id}> (${interaction.user.username})\n` +
                    `📦 **구매 상자:** \`${box.name}\` (\`${quantity}개\` / \`${totalPrice.toLocaleString()}원\`)\n` +
                    `🪙 **구매 후 잔액:** \`${newBalance.toLocaleString()}원\`\n` +
                    `📅 **일시:** <t:${Math.floor(Date.now() / 1000)}:F>`
                  );
                await logChannel.send({ embeds: [logEmbed] });
              }
            } catch (logErr) {
              console.error('Failed to write randombox purchase log to channel:', logErr);
            }
          }
        }
        return;
      }

      // Update frame showing the rotating pointer
      let highlightedIndex = currentFrame % grades.length;
      
      // In the last two frames, force pointer to align with the bestDrawnGrade
      if (currentFrame === totalFrames - 2) {
        const targetIndex = grades.findIndex(g => g.grade === bestDrawnGrade);
        highlightedIndex = (targetIndex - 1 + grades.length) % grades.length;
      } else if (currentFrame === totalFrames - 1) {
        highlightedIndex = grades.findIndex(g => g.grade === bestDrawnGrade);
      }

      const animEmbed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🎰 랜덤박스 고속 개봉 중... 🎰')
        .setDescription(
          `과연 어떤 등급의 상품이 당첨될까요? 룰렛 고속 회전 중...\n\n` +
          `📦 **구매 수량:** \`${quantity}개\`\n\n` +
          grades.map((g, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return `${isHighlighted ? '➡️ 🔴' : '　 ⚪'} **${g.grade}** (공개 확률: \`${g.displayProbability}%\`)`;
          }).join('\n')
        );

      await interaction.editReply({ embeds: [animEmbed] });

      currentFrame++;
      setTimeout(runSlotAnimation, 400); // 400ms interval for fast tempo
    } catch (err) {
      console.error('Error during randombox slot animation frame:', err);
    }
  };

  setTimeout(runSlotAnimation, 400);
}

export async function handleInquiry(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#E74C3C') // Red warning color
    .setTitle('⚠️ 1:1 고객센터 문의 개설 경고')
    .setDescription(
      `**1:1 문의 채널을 개설하기 전에 반드시 아래 사항을 읽어주세요.**\n\n` +
      `• 단순 장난이나 허위 문의 시 **자판기 이용 제한 및 서버 밴** 처리 대상이 됩니다.\n` +
      `• 서버 내 안내/규칙 채널에서 이미 명확하게 확인 가능한 질문은 답변이 거부되거나 문의가 임의 종료될 수 있습니다.\n` +
      `• 문의를 열면 관리자에게 알림이 전송됩니다. 꼭 필요한 경우에만 문의를 개설해 주시기 바랍니다.\n\n` +
      `정말로 1:1 비공개 상담 채널을 개설하시겠습니까?`
    );

  const btnConfirm = new ButtonBuilder()
    .setCustomId('vending_inquiry_confirm')
    .setLabel('동의하고 문의 접수')
    .setEmoji('🎫')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(btnConfirm);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

export async function handleInquiryConfirm(interaction) {
  // Check if user already has an active ticket channel in this guild
  const existingChannel = interaction.guild.channels.cache.find(
    c => c.name.startsWith('🎫-') && c.topic === `User ID: ${interaction.user.id}`
  );

  if (existingChannel) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('❌ 이미 진행 중인 문의가 존재합니다')
      .setDescription(
        `이미 개설된 1:1 문의 채널이 존재합니다.\n\n` +
        `🎫 **기존 채널:** <#${existingChannel.id}>\n\n` +
        `추가로 문의를 등록하시려면 기존 채널로 이동하여 상담을 계속하거나, 해결된 문의라면 관리자에게 채널 삭제를 요청해 주세요.`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId('vending_inquiry_modal')
    .setTitle('🎫 1:1 문의 접수');

  const titleInput = new TextInputBuilder()
    .setCustomId('inquiry_title')
    .setLabel('문의 주제')
    .setPlaceholder('예: Robux 충전 지연 문의 / 아이템 지급 지연')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(true);

  const contentInput = new TextInputBuilder()
    .setCustomId('inquiry_content')
    .setLabel('상세 문의 내용')
    .setPlaceholder('오류 상황, 계정 이름, 결제 번호 등 필요한 정보를 상세히 기재해 주세요.')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(contentInput)
  );

  await interaction.showModal(modal);
}

export async function handleInquiryModalSubmit(interaction) {
  const inquiryTitle = interaction.fields.getTextInputValue('inquiry_title').trim();
  const inquiryContent = interaction.fields.getTextInputValue('inquiry_content').trim();

  // Double check again just in case of double click
  const existingChannel = interaction.guild.channels.cache.find(
    c => c.name.startsWith('🎫-') && c.topic === `User ID: ${interaction.user.id}`
  );

  if (existingChannel) {
    const errorEmbed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setTitle('❌ 이미 진행 중인 문의가 존재합니다')
      .setDescription(
        `이미 개설된 1:1 문의 채널이 존재합니다.\n\n` +
        `🎫 **기존 채널:** <#${existingChannel.id}>`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    return;
  }

  // Find or create '🎫 문의 채널' category
  let category = interaction.guild.channels.cache.find(
    c => c.name === '🎫 문의 채널' && c.type === ChannelType.GuildCategory
  );

  if (!category) {
    try {
      category = await interaction.guild.channels.create({
        name: '🎫 문의 채널',
        type: ChannelType.GuildCategory,
      });
    } catch (err) {
      console.error('Failed to create ticket category:', err);
    }
  }

  // Create private ticket channel
  const ownerId = process.env.OWNER_DISCORD_ID;
  const adminRoleId = process.env.ADMIN_ROLE_ID;

  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (ownerId) {
    permissionOverwrites.push({
      id: ownerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  if (adminRoleId) {
    permissionOverwrites.push({
      id: adminRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  let ticketChannel;
  try {
    ticketChannel = await interaction.guild.channels.create({
      name: `🎫-${interaction.user.username}-문의`,
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      topic: `User ID: ${interaction.user.id}`,
      permissionOverwrites: permissionOverwrites,
    });
  } catch (err) {
    console.error('Failed to create ticket channel:', err);
    await interaction.reply({
      content: '❌ 문의 채널 생성 중 오류가 발생했습니다. 관리자에게 문의해 주세요.',
      ephemeral: true,
    });
    return;
  }

  // Send first message in the ticket channel
  const ticketEmbed = new EmbedBuilder()
    .setColor('#3498DB')
    .setTitle('🎫 새로운 1:1 문의 접수')
    .setDescription(
      `**${interaction.user.username}**님이 새로운 문의를 접수하셨습니다.\n\n` +
      `📌 **문의 주제:** \`${inquiryTitle}\`\n` +
      `📝 **상세 문의 내용:**\n${inquiryContent}\n\n` +
      `*관리자가 확인하는 대로 답변을 제공해 드리겠습니다. 잠시만 대기해 주세요.*`
    )
    .setTimestamp();

  let adminMentions = '';
  if (ownerId) adminMentions += `<@${ownerId}> `;
  if (adminRoleId) adminMentions += `<@&${adminRoleId}> `;

  const btnClose = new ButtonBuilder()
    .setCustomId('vending_inquiry_close')
    .setLabel('문의 종료')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(btnClose);

  try {
    await ticketChannel.send({
      content: adminMentions.trim() ? `${adminMentions} 새로운 문의가 등록되었습니다.` : '새로운 문의가 등록되었습니다.',
      embeds: [ticketEmbed],
      components: [row],
    });
  } catch (sendErr) {
    console.error('Failed to send initial message in ticket channel:', sendErr);
  }

  // Reply success to the user
  const successEmbed = new EmbedBuilder()
    .setColor('#2ECC71')
    .setTitle('✅ 문의 채널 개설 완료')
    .setDescription(
      `1:1 비공개 문의 채널이 성공적으로 생성되었습니다!\n\n` +
      `🎫 **생성된 채널:** <#${ticketChannel.id}>\n\n` +
      `위 채널로 이동하여 기재하신 문의사항에 대해 답변을 기다려 주세요.`
    )
    .setTimestamp();

  await interaction.reply({ embeds: [successEmbed], ephemeral: true });
}

export async function handleInquiryClose(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#E74C3C')
    .setTitle('🔒 문의 종료 확인')
    .setDescription(
      `**정말로 이 문의 채널을 종료하시겠습니까?**\n\n` +
      `• 종료 시 이 채널은 **영구 삭제**되며, 대화 기록 복구가 불가능합니다.\n` +
      `• 해결이 완료되었다면 아래의 **[정말 종료]** 버튼을 눌러주세요.`
    );

  const btnConfirm = new ButtonBuilder()
    .setCustomId('vending_inquiry_close_confirm')
    .setLabel('정말 종료')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger);

  const btnCancel = new ButtonBuilder()
    .setCustomId('vending_inquiry_close_cancel')
    .setLabel('취소')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(btnConfirm, btnCancel);

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

export async function handleInquiryCloseConfirm(interaction) {
  try {
    await interaction.update({
      content: '⚙️ 문의 채널을 종료(삭제)하는 중입니다...',
      embeds: [],
      components: [],
    });
    await interaction.channel.delete('문의 종료에 따른 채널 삭제');
  } catch (err) {
    console.error('Failed to delete inquiry channel:', err);
    try {
      await interaction.followUp({
        content: '❌ 채널 삭제 도중 오류가 발생했습니다. 봇의 관리자 권한을 확인해 주세요.',
        ephemeral: true,
      });
    } catch (followErr) {
      console.error('Failed to send error reply:', followErr);
    }
  }
}

export async function handleInquiryCloseCancel(interaction) {
  await interaction.update({
    content: '✅ 문의 종료가 취소되었습니다.',
    embeds: [],
    components: [],
  });
}



