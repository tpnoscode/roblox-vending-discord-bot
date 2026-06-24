import WebSocket from 'ws';
import * as db from './db.js';
import { EmbedBuilder } from 'discord.js';

let client = null; // Discord client reference
let ws = null; // WebSocket connection
let reconnectTimeout = null;
let isStopping = false;

// Store active interaction objects for ephemeral charge messages (userId -> interaction)
global.activeChargeInteractions = global.activeChargeInteractions || new Map();
export const activeChargeInteractions = global.activeChargeInteractions;

export function init(discordClient) {
  client = discordClient;
}

export function start() {
  const dbData = db.read();
  const config = dbData.config || {};
  const token = config.pushbulletToken;

  if (!token) {
    console.log('Pushbullet: No token configured. Real-time stream is disabled.');
    return;
  }

  isStopping = false;
  console.log('Pushbullet: Starting real-time notification stream...');
  
  connect(token);
}

function connect(token) {
  if (ws) {
    try { ws.close(); } catch (e) {}
  }

  ws = new WebSocket(`wss://stream.pushbullet.com/websocket/${token}`);

  ws.on('open', () => {
    console.log('Pushbullet: Stream connected successfully!');
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'nop') {
        // Keep-alive frame, ignore
        return;
      }
      
      if (msg.type === 'tickle' && msg.subtype === 'push') {
        console.log('Pushbullet: Received push update event, fetching details...');
        await fetchAndProcessLatestPush(token);
      } else if (msg.type === 'push' && msg.push) {
        console.log('Pushbullet: Received direct push payload...');
        await processPush(msg.push);
      }
    } catch (err) {
      console.error('Pushbullet: Error processing message:', err);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Pushbullet: Stream closed (code: ${code}, reason: ${reason}).`);
    if (!isStopping) {
      scheduleReconnect(token);
    }
  });

  ws.on('error', (err) => {
    console.error('Pushbullet: Stream error:', err);
    // On error, the close event is usually emitted automatically, but we ensure reconnection
    if (!isStopping) {
      scheduleReconnect(token);
    }
  });
}

function scheduleReconnect(token) {
  if (reconnectTimeout) return;
  console.log('Pushbullet: Attempting reconnection in 5 seconds...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect(token);
  }, 5000);
}

export function stop() {
  isStopping = true;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    try {
      ws.close();
      console.log('Pushbullet: Stream stopped.');
    } catch (e) {
      console.error('Pushbullet: Error stopping stream:', e);
    }
    ws = null;
  }
}

export async function restart() {
  stop();
  start();
}

async function fetchAndProcessLatestPush(token) {
  try {
    const response = await fetch('https://api.pushbullet.com/v2/pushes?limit=1', {
      method: 'GET',
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Pushbullet API error: ${response.status} ${response.statusText}`);
    }

    const resData = await response.json();
    if (resData.pushes && resData.pushes.length > 0) {
      await processPush(resData.pushes[0]);
    }
  } catch (err) {
    console.error('Pushbullet: Error fetching latest push:', err);
  }
}

async function processPush(push) {
  // We only process mirrored notification push events
  if (push.type !== 'mirror') {
    return;
  }

  const title = push.title || '';
  const body = push.body || '';
  const appName = push.application_name || '';

  console.log(`Pushbullet: Received mirrored notification: [${title}] ${body} (App: ${appName})`);

  await matchAndProcessDeposit(body);
}

// Helper to find name with proper character boundaries (no alphanumeric or Hangul chars directly adjacent)
function findNameMatchWithBoundaries(body, name) {
  let index = body.indexOf(name);
  while (index !== -1) {
    let isValidBefore = true;
    let isValidAfter = true;

    if (index > 0) {
      const charBefore = body[index - 1];
      if (/[a-zA-Z0-9가-힣]/.test(charBefore)) {
        isValidBefore = false;
      }
    }

    const nextIndex = index + name.length;
    if (nextIndex < body.length) {
      const charAfter = body[nextIndex];
      if (/[a-zA-Z0-9가-힣]/.test(charAfter)) {
        isValidAfter = false;
      }
    }

    if (isValidBefore && isValidAfter) {
      return index; // Found a valid match with boundaries
    }

    index = body.indexOf(name, index + 1); // Search next occurrence
  }
  return -1;
}

export async function matchAndProcessDeposit(body) {
  await db.fetch();
  const dbData = db.read();
  const pendingCharges = dbData.pendingCharges || [];
  
  if (pendingCharges.length === 0) {
    return;
  }

  // Filter out charges older than 5 minutes
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  const validCharges = [];
  let expiredCount = 0;

  for (const charge of pendingCharges) {
    if (now - charge.createdAt > fiveMinutes) {
      expiredCount++;
    } else {
      validCharges.push(charge);
    }
  }

  if (expiredCount > 0) {
    dbData.pendingCharges = validCharges;
    db.write(dbData);
    console.log(`Pushbullet: Cleaned up ${expiredCount} expired pending charge(s).`);
  }

  if (validCharges.length === 0) {
    return;
  }

  let matchedIndex = -1;
  for (let i = 0; i < validCharges.length; i++) {
    const charge = validCharges[i];
    const amountStr = charge.amount.toString();
    const amountFormatted = charge.amount.toLocaleString();

    // Find if the depositor name matches with proper boundaries
    const nameIndex = findNameMatchWithBoundaries(body, charge.depositorName);
    if (nameIndex === -1) {
      continue;
    }

    // Slice out the specific matched name from the body
    const bodyWithoutName = body.slice(0, nameIndex) + body.slice(nameIndex + charge.depositorName.length);

    const matchesAmount = bodyWithoutName.includes(amountStr) || bodyWithoutName.includes(amountFormatted);

    if (matchesAmount) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    console.log('Pushbullet: No matching pending charge found for this notification.');
    return;
  }

  const matchedCharge = validCharges[matchedIndex];
  
  // Remove the matched charge from the database
  dbData.pendingCharges = dbData.pendingCharges.filter(
    c => !(c.userId === matchedCharge.userId && c.depositorName === matchedCharge.depositorName && c.amount === matchedCharge.amount)
  );
  
  // Update user balance
  if (!dbData.users) dbData.users = {};
  let user = dbData.users[matchedCharge.userId];
  if (!user) {
    user = {
      username: matchedCharge.username,
      balance: 0,
      totalCharged: 0,
      totalPurchased: 0
    };
    dbData.users[matchedCharge.userId] = user;
  }
  
  user.balance = (user.balance || 0) + matchedCharge.amount;
  user.totalCharged = (user.totalCharged || 0) + matchedCharge.amount;

  db.write(dbData);
  console.log(`✅ Pushbullet Match: Successfully charged ${matchedCharge.amount}원 to ${matchedCharge.username} (${matchedCharge.userId})`);

  // 0. Edit the ephemeral reply of the charge request to Success
  const activeInteraction = activeChargeInteractions.get(matchedCharge.userId);
  if (activeInteraction) {
    try {
      await activeInteraction.editReply({
        content: '✅ 즉시 충전성공',
        embeds: []
      });
      activeChargeInteractions.delete(matchedCharge.userId);
      console.log(`Pushbullet: Ephemeral charge message updated to success for ${matchedCharge.username}`);
    } catch (err) {
      console.error('Pushbullet: Failed to edit ephemeral message to success:', err);
    }
  }

  // 1. Send confirmation DM to the user
  if (client) {
    try {
      const discordUser = await client.users.fetch(matchedCharge.userId);
      const dmEmbed = new EmbedBuilder()
        .setColor('#2ECC71') // Green
        .setTitle('💵 자동 충전 완료 안내')
        .setDescription(
          `**${matchedCharge.username}**님의 계좌 입금이 확인되어 잔액이 자동으로 충전되었습니다.\n\n` +
          `💰 **충전 금액:** \`${matchedCharge.amount.toLocaleString()}원\`\n` +
          `👤 **입금자명:** \`${matchedCharge.depositorName}\`\n` +
          `🪙 **현재 잔액:** \`${user.balance.toLocaleString()}원\`\n\n` +
          `자판기를 이용해 주셔서 감사합니다!`
        )
        .setTimestamp();
        
      await discordUser.send({ embeds: [dmEmbed] });
      console.log(`Pushbullet: Sent charge confirmation DM to ${matchedCharge.username}`);
    } catch (dmErr) {
      console.error(`Pushbullet: Failed to send DM to ${matchedCharge.username}:`, dmErr);
    }

    // 2. Log to configured log channel (if any)
    const logChannelId = dbData.config?.logChannelId;
    if (logChannelId) {
      try {
        const logChannel = await client.channels.fetch(logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('💵 [자동 입금 충전] 완료')
            .setDescription(
              `⚡ **실시간 입금 매칭 성공**\n\n` +
              `👤 **대상 유저:** <@${matchedCharge.userId}> (${matchedCharge.username})\n` +
              `💰 **충전 금액:** \`${matchedCharge.amount.toLocaleString()}원\`\n` +
              `👤 **실제 입금자명:** \`${matchedCharge.depositorName}\`\n` +
              `🪙 **수정 후 잔액:** \`${user.balance.toLocaleString()}원\``
            )
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
          console.log(`Pushbullet: Logged charge event to channel ${logChannelId}`);
        }
      } catch (logErr) {
        console.error('Pushbullet: Failed to write to charge log channel:', logErr);
      }
    }
  }
}
