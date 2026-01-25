const { Telegraf, Markup, session } = require('telegraf');

// --- CONFIGURATION ---
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot';

const bot = new Telegraf(BOT_TOKEN);
const db = {}; // In-memory database (resets on restart)
bot.use(session());

// --- DATABASE SIMULATION ---
const getDB = (ctx) => {
    const id = ctx?.from?.id || ctx;
    if (!db[id]) {
        db[id] = {
            points: 0,
            referrals: 0,
            registered: 0,
            joined: new Date(),
            name: ctx.from?.first_name || "User",
            username: ctx.from?.username ? `@${ctx.from.username}` : "No Username",
            referredBy: null
        };
    }
    return db[id];
};

// --- CHANNELS ---
const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

// --- USER MENU ---
const getMenu = (ctx) => Markup.inlineKeyboard([
    [Markup.button.callback("➕ Register New Gmail", "menu_register")],
    [Markup.button.callback("⚙️ Account", "menu_account"), Markup.button.callback("🚸 My Referrals", "menu_referrals")],
    [Markup.button.callback("🏥 Help", "menu_help")],
]);

// --- ADMIN INLINE KEYBOARD ---
const adminInlineKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("📊 Global Stats", "admin_global_stats"), Markup.button.callback("📢 Broadcast", "admin_broadcast")],
    [Markup.button.callback("➕ Add Points", "admin_add_points"), Markup.button.callback("➖ Remove Points", "admin_remove_points")],
    [Markup.button.callback("👥 List All Users", "admin_list_users"), Markup.button.callback("↩ Back to User Menu", "admin_back")]
]);

const cancelKeyboard = Markup.inlineKeyboard([[Markup.button.callback("❌ Cancel Operation", "cancel_op")]]);

// --- FORCE JOIN CHECK ---
async function checkJoin(ctx, next) {
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
                caption: `⛔️ **ACCESS DENIED**\n\nYou must join all channels to use this bot.`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url("Channel 1", "https://t.me/Hayre37"), Markup.button.url("Channel 2", "https://t.me/Digital_Claim")],
                    [Markup.button.url("Channel 3", "https://t.me/BIgsew_community"), Markup.button.url("Channel 4", "https://t.me/hayrefx")],
                    [Markup.button.callback("Verify Membership ✅", "verify_join")]
                ])
            }
        );
    }
    return next();
}

// --- CALLBACK HANDLERS ---
bot.action('verify_join', async (ctx) => {
    let joinedAll = true;
    for (const chan of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) {
                joinedAll = false;
                break;
            }
        } catch { joinedAll = false; break; }
    }

    if (joinedAll) {
        await ctx.deleteMessage().catch(() => {});
        const user = getDB(ctx);
        await ctx.answerCbQuery("Success! Welcome back ✅");
        await ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Balance:** \`${user.points} Points\``,
                parse_mode: 'Markdown',
                ...getMenu(ctx)
            }
        );
    } else {
        await ctx.answerCbQuery("❌ You still haven't joined all channels!", { show_alert: true });
    }
});

bot.action('cancel_op', (ctx) => {
    ctx.session = {};
    ctx.answerCbQuery("Operation cancelled ✅");
    ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
});

// --- START COMMAND ---
bot.start(async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.startPayload; // referral

    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(parseInt(refId));
        if (referrer) {
            referrer.points += 1;
            referrer.referrals += 1;
            bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user earned +1 Point.`, { parse_mode: 'Markdown' }).catch(() => {});
        }
    }

    await ctx.replyWithPhoto(
        { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
        {
            caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Balance:** \`${user.points} Points\`\n\nInvite friends to earn points!`,
            parse_mode: 'Markdown',
            ...getMenu(ctx)
        }
    );
});

// --- USER MENU CALLBACKS ---
bot.action('menu_register', checkJoin, async (ctx) => {
    const user = getDB(ctx);
    if (user.points < 5) return ctx.answerCbQuery(`⚠️ You need 5 points to register. Current: ${user.points}`, { show_alert: true });

    ctx.session.step = 'EMAIL';
    await ctx.replyWithMarkdown("📧 Send Gmail Address\n_Example: name@gmail.com_", cancelKeyboard);
});

bot.action('menu_account', (ctx) => {
    const user = getDB(ctx);
    ctx.replyWithMarkdown(
        `⭐ *PREMIUM ACCOUNT STATUS*\n━━━━━━━━\n🆔 User ID: \`${ctx.from.id}\`\n💰 Balance: \`${user.points} Points\`\n📊 Registered: \`${user.registered} Gmails\`\n🚸 Invites: \`${user.referrals} Users\`\n━━━━━━━━`,
        getMenu(ctx)
    );
});

bot.action('menu_referrals', (ctx) => {
    const user = getDB(ctx);
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(
        `✨ **AFFILIATE CENTER** ✨\n━━━━━━━━\n👥 Total Referrals: \`${user.referrals || 0}\`\n💰 Total Earned: \`${user.referrals || 0} Points\`\n━━━━━━━━\n🎁 Reward: \`1 Point\` per join!\n\n🔗 Your Link:\n\`${link}\``,
        Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)]])
    );
});

bot.action('menu_help', async (ctx) => {
    const helpMessage = 
`🌟 **Account Registration System** 🌟

✅ Registration Access
🧢 Allowed Limit
🤖 Unlimited Gmail creation
⚠️ Recommended 5–10 accounts/hour for safety
🛍️ Referral System: Updated every 24h, AI filters inactive users
✅ Only real users get rewarded.`;

    await ctx.replyWithMarkdown(helpMessage, cancelKeyboard);
});

// --- ADMIN CALLBACKS ---
bot.action('admin_global_stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.answerCbQuery();
    ctx.replyWithMarkdown(`📈 **Server Stats**\n👥 Total Users: ${totalUsers}`);
});

bot.action('admin_broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'BROADCAST_PREVIEW';
    ctx.answerCbQuery();
    ctx.replyWithMarkdown("🛠 **Broadcast**\nSend text/photo/video/sticker now.", cancelKeyboard);
});

bot.action('admin_add_points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'ADD_POINTS_ID';
    ctx.answerCbQuery();
    ctx.reply("➕ Send User ID:", cancelKeyboard);
});

bot.action('admin_remove_points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'REMOVE_POINTS_ID';
    ctx.answerCbQuery();
    ctx.reply("➖ Send User ID:", cancelKeyboard);
});

bot.action('admin_list_users', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.answerCbQuery();
    const users = Object.keys(db).map(id => {
        const u = db[id];
        return `ID: ${id}\nName: ${u.name}\nPoints: ${u.points}\nRegistered: ${u.registered}\nReferrals: ${u.referrals}`;
    }).join("\n━━━━━━━━\n");
    ctx.replyWithMarkdown(`👥 **All Users**\n\n${users || "No users yet."}`);
});

bot.action('admin_back', (ctx) => {
    ctx.answerCbQuery("⬅ Back to main menu");
    ctx.reply("⬅️ Back to User Menu", getMenu(ctx));
});

// --- ADMIN PANEL COMMAND ---
bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Restricted.");
    ctx.reply("🛠 Admin Dashboard", adminInlineKeyboard);
});

// --- MESSAGE HANDLER ENGINE ---
bot.on('message', async (ctx, next) => {
    const text = ctx.message?.text;
    const state = ctx.session?.step;
    const user = getDB(ctx);

    if (text === '❌ Cancel Operation') {
        ctx.session = {};
        return ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
    }

    if (!state) return next();

    switch(state) {
        case 'EMAIL':
            if (!text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com address.");
            ctx.session.email = text;
            ctx.session.step = 'PASS';
            return ctx.reply("🔑 Send Password:");

        case 'PASS':
            user.points -= 5;
            user.registered += 1;
            const email = ctx.session.email;
            ctx.session = {};
            return ctx.replyWithMarkdown(`✅ Registered!\n📧 Email: \`${email}\`\n🔑 Pass: \`${text}\`\nBalance: ${user.points}`, getMenu(ctx));

        case 'ADD_POINTS_ID':
            ctx.session.targetId = text;
            ctx.session.step = 'ADD_POINTS_AMT';
            return ctx.reply("💰 Enter points to add:");

        case 'ADD_POINTS_AMT':
            if (ctx.from.id !== ADMIN_ID) return;
            const amt = parseInt(text);
            const target = getDB(ctx.session.targetId);
            if (target && !isNaN(amt)) target.points += amt;
            ctx.session = {};
            return ctx.reply(`✅ Added ${amt} points`, adminInlineKeyboard);

        case 'REMOVE_POINTS_ID':
            ctx.session.targetId = text;
            ctx.session.step = 'REMOVE_POINTS_AMT';
            return ctx.reply("💰 Enter points to remove:");

        case 'REMOVE_POINTS_AMT':
            if (ctx.from.id !== ADMIN_ID) return;
            const removeAmt = parseInt(text);
            const targetRemove = getDB(ctx.session.targetId);
            if (targetRemove && !isNaN(removeAmt)) targetRemove.points -= removeAmt;
            ctx.session = {};
            return ctx.reply(`✅ Removed ${removeAmt} points`, adminInlineKeyboard);

        case 'BROADCAST_PREVIEW':
            if (ctx.from.id !== ADMIN_ID) return;
            ctx.session.msgToCopy = ctx.message.message_id;
            ctx.session.step = 'BROADCAST_CONFIRM';
            await ctx.reply("👇 Preview of your post:");
            await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
            return ctx.reply("⬆️ Confirm to send?", Markup.inlineKeyboard([
                [Markup.button.callback("✅ CONFIRM & SEND", "broadcast_send")],
                [Markup.button.callback("❌ Cancel Operation", "cancel_op")]
            ]));

        default:
            return next();
    }
});

// --- BROADCAST SEND ---
bot.action('broadcast_send', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const users = Object.keys(db);
    let successCount = 0, failCount = 0;

    await ctx.reply(`🚀 Broadcasting to ${users.length} users...`, Markup.removeKeyboard());

    for (const id of users) {
        try { await ctx.telegram.copyMessage(id, ctx.chat.id, ctx.session.msgToCopy); successCount++; }
        catch { failCount++; }
    }

    ctx.session = {};
    return ctx.reply(`📢 Broadcast Complete\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`, adminInlineKeyboard);
});

// --- LAUNCH BOT ---
bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Online 🚀"));
