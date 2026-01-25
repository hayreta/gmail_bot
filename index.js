const { Telegraf, Markup, session } = require('telegraf');

// ==================== CONFIGURATION ====================
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot';
const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ==================== DATABASE SIMULATION ====================
const db = {}; // In-memory DB

const getUser = (ctx) => {
  const id = ctx?.from?.id || ctx;
  if (!db[id]) {
    db[id] = {
      points: 0,
      referrals: 0,
      registered: 0,
      name: ctx?.from?.first_name || "User",
      username: ctx?.from?.username ? `@${ctx.from.username}` : "No Username",
      referredBy: null,
      joined: new Date()
    };
  }
  return db[id];
};

// ==================== KEYBOARDS ====================
const mainMenu = (ctx) => {
  const buttons = [
    ['➕ Register New Gmail'],
    ['⚙️ Account', '🚸 My Referrals'],
    ['🏥 Help']
  ];
  if (ctx.from.id === ADMIN_ID) buttons.push(['🛠 Admin Panel']);
  return Markup.keyboard(buttons).resize();
};

const adminMenu = Markup.keyboard([
  ['📊 Global Stats', '📢 Broadcast'],
  ['➕ Add Points', '➖ Remove Points'],
  ['👥 List All Users', '⬅️ Back to User Menu']
]).resize();

const cancelMenu = Markup.keyboard([['❌ Cancel Operation']]).resize();

// ==================== FORCE JOIN MIDDLEWARE ====================
async function requireJoin(ctx, next) {
  if (ctx.from.id === ADMIN_ID) return next();
  let joinedAll = true;

  for (const chan of CHANNELS) {
    try {
      const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
      if (['left', 'kicked'].includes(member.status)) {
        joinedAll = false;
        break;
      }
    } catch {
      joinedAll = false;
      break;
    }
  }

  if (!joinedAll) {
    return ctx.replyWithPhoto(
      { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
      {
        caption: `⛔️ **ACCESS DENIED**\nYou must join all channels to use this bot.`,
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url("Channel 1", "https://t.me/Hayre37"), Markup.button.url("Channel 2", "https://t.me/Digital_Claim")],
          [Markup.button.url("Channel 3", "https://t.me/BIgsew_community"), Markup.button.url("Channel 4", "https://t.me/hayrefx")],
          [Markup.button.callback("Verify Membership ✅", "verify_join")]
        ])
      }
    );
  }

  return next();
}

// ==================== CALLBACK HANDLERS ====================
bot.action('verify_join', async (ctx) => {
  let joinedAll = true;

  for (const chan of CHANNELS) {
    try {
      const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
      if (['left', 'kicked'].includes(member.status)) {
        joinedAll = false;
        break;
      }
    } catch {
      joinedAll = false;
      break;
    }
  }

  if (joinedAll) {
    await ctx.deleteMessage().catch(() => {});
    const user = getUser(ctx);
    await ctx.answerCbQuery("✅ Verified!");
    await ctx.replyWithPhoto(
      { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
      {
        caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 User: ${user.name}\n💰 Balance: \`${user.points} Points\``,
        parse_mode: 'Markdown',
        reply_markup: mainMenu(ctx).reply_markup
      }
    );
  } else {
    await ctx.answerCbQuery("❌ You still haven't joined all channels!", { show_alert: true });
  }
});

bot.action('close_help', async (ctx) => {
  try { await ctx.deleteMessage(); await ctx.answerCbQuery("✅ Closed"); }
  catch { await ctx.answerCbQuery("Already closed"); }
});

// ==================== START COMMAND ====================
bot.start(async (ctx) => {
  const user = getUser(ctx);
  const refId = ctx.startPayload;

  if (refId && refId != ctx.from.id && !user.referredBy) {
    user.referredBy = refId;
    const refUser = getUser(parseInt(refId));
    refUser.points += 1;
    refUser.referrals += 1;
    await ctx.telegram.sendMessage(refId, `🔔 Referral Alert! +1 Point`, { parse_mode: 'Markdown' }).catch(() => {});
  }

  await ctx.replyWithPhoto(
    { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
    {
      caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n👤 User: ${user.name}\n💰 Balance: \`${user.points} Points\`\nInvite friends to earn points!`,
      parse_mode: 'Markdown',
      reply_markup: mainMenu(ctx).reply_markup
    }
  );
});

// ==================== MAIN MENU HANDLERS ====================
bot.hears('➕ Register New Gmail', requireJoin, async (ctx) => {
  const user = getUser(ctx);
  if (user.points < 5) return ctx.replyWithMarkdown(`⚠️ Insufficient Balance: 5 points required\nCurrent: ${user.points}`, mainMenu(ctx));
  ctx.session.step = 'EMAIL';
  return ctx.replyWithMarkdown("📧 Send Gmail Address (_example: name@gmail.com_)", cancelMenu);
});

bot.hears('⚙️ Account', (ctx) => {
  const user = getUser(ctx);
  ctx.replyWithMarkdown(
    `⭐ *Account Status*\n━━━━━━━━\n🆔 User ID: \`${ctx.from.id}\`\n💰 Balance: \`${user.points} Points\`\n📊 Registered: \`${user.registered} Gmails\`\n🚸 Invites: \`${user.referrals} Users\`\n━━━━━━━━`,
    mainMenu(ctx)
  );
});

bot.hears('🚸 My Referrals', (ctx) => {
  const user = getUser(ctx);
  const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
  ctx.replyWithMarkdown(
    `✨ *Affiliate Center*\n━━━━━━━━\n👥 Total Referrals: \`${user.referrals}\`\n💰 Earned: \`${user.referrals} Points\`\n━━━━━━━━\n🎁 Reward: 1 Point per join!\n\n🔗 Your Link:\n\`${link}\``,
    Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)]])
  );
});

bot.hears('🏥 Help', (ctx) => {
  const helpMessage = `
🌟 *Account Registration System* 🌟
✅ Unlimited Gmail creation
⚠️ Recommended 5–10 accounts/hour
🛍️ Referral system updates every 24h
✅ Only real users rewarded
`;
  ctx.replyWithMarkdown(helpMessage,
    Markup.inlineKeyboard([[Markup.button.callback("🗑️ Mark as Read & Close", "close_help")]])
  );
});

// ==================== ADMIN HANDLERS ====================
bot.hears('🛠 Admin Panel', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Restricted");
  ctx.reply("🛠 Admin Dashboard", adminMenu);
});

bot.hears('📊 Global Stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.replyWithMarkdown(`📈 Server Statistics\n👥 Total Users: ${Object.keys(db).length}`);
});

bot.hears('➕ Add Points', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.session.step = 'ADD_POINTS_ID';
  ctx.reply("💳 Send User ID:", cancelMenu);
});

bot.hears('📢 Broadcast', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.session.step = 'BROADCAST_PREVIEW';
  ctx.replyWithMarkdown("🛠 Send any content (text/photo/video) to broadcast", cancelMenu);
});

// ==================== MESSAGE HANDLER ====================
bot.on('message', async (ctx, next) => {
  const text = ctx.message?.text;
  const step = ctx.session?.step;

  if (text === '❌ Cancel Operation') {
    ctx.session = {};
    return ctx.reply("🚫 Operation Cancelled", mainMenu(ctx));
  }

  if (!step) return next();

  const user = getUser(ctx);

  switch(step) {
    case 'EMAIL':
      if (!text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com email.");
      ctx.session.email = text;
      ctx.session.step = 'PASS';
      return ctx.reply("🔑 Send Password:");

    case 'PASS':
      user.points -= 5;
      user.registered += 1;
      const email = ctx.session.email;
      ctx.session = {};
      return ctx.replyWithMarkdown(`✅ Gmail Registered!\n📧 ${email}\n🔑 ${text}\n💰 Balance: ${user.points}`, mainMenu(ctx));

    case 'ADD_POINTS_ID':
      ctx.session.targetId = text;
      ctx.session.step = 'ADD_POINTS_AMT';
      return ctx.reply("💰 Enter points to add:");

    case 'ADD_POINTS_AMT':
      if (ctx.from.id !== ADMIN_ID) return;
      const targetId = ctx.session.targetId;
      const points = parseInt(text);
      const targetUser = getUser(targetId);
      if (!isNaN(points)) targetUser.points += points;
      ctx.session = {};
      return ctx.reply(`✅ Added ${points} points to ${targetId}`, adminMenu);

    case 'BROADCAST_PREVIEW':
      ctx.session.msgToCopy = ctx.message.message_id;
      ctx.session.step = 'BROADCAST_CONFIRM';
      await ctx.reply("👇 Preview:");
      await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
      return ctx.reply("⬆️ Confirm to send?", Markup.keyboard([['✅ CONFIRM & SEND'], ['❌ Cancel Operation']]).resize());

    case 'BROADCAST_CONFIRM':
      if (ctx.from.id !== ADMIN_ID || text !== '✅ CONFIRM & SEND') return;
      const users = Object.keys(db);
      let success = 0, failed = 0;
      await ctx.reply(`🚀 Broadcasting to ${users.length} users...`, Markup.removeKeyboard());
      for (const id of users) {
        try { await ctx.telegram.copyMessage(id, ctx.chat.id, ctx.session.msgToCopy); success++; }
        catch { failed++; }
      }
      ctx.session = {};
      return ctx.reply(`📢 Broadcast Complete\n✅ Success: ${success}\n❌ Failed: ${failed}`, adminMenu);

    default: return next();
  }
});

// ==================== LAUNCH BOT ====================
bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Online 🚀"));
