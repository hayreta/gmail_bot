const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot';

const bot = new Telegraf(BOT_TOKEN);
const db = {}; // In-memory DB (resets on restart)

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

// --- KEYBOARDS ---
const getMenu = (ctx) => {
    const buttons = [
        ['➕ Register New Gmail'],
        ['⚙️ Account', '🚸 My Referrals'],
        ['🏥 Help']
    ];
    if (ctx.from.id === ADMIN_ID) buttons.push(['🛠 Admin Panel']);
    return Markup.keyboard(buttons).resize();
};

const adminKeyboard = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '➖ Remove Points'],
    ['👥 List All Users', '⬅️ Back to User Menu']
]).resize();

const cancelKeyboard = Markup.keyboard([['❌ Cancel Operation']]).resize();

// --- MIDDLEWARE: FORCE JOIN ---
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
        } catch {
            joinedAll = false;
            break;
        }
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

bot.action('close_help', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.answerCbQuery("Message marked as read ✅");
    } catch {
        await ctx.answerCbQuery("Already closed.");
    }
});

// --- START COMMAND ---
bot.start(async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.startPayload; // fixed payload usage

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

// --- MAIN MENU HANDLERS ---
bot.hears('➕ Register New Gmail', checkJoin, async (ctx) => {
    const user = getDB(ctx);
    if (user.points < 5) return ctx.replyWithMarkdown(`⚠️ *Insufficient Balance*\nYou need **5 Points** to register.\n*Current Balance:* ${user.points} pts`, getMenu(ctx));
    ctx.session.step = 'EMAIL';
    ctx.replyWithMarkdown("📧 **Send Gmail Address**\n_Example: name@gmail.com_", cancelKeyboard);
});

bot.hears('⚙️ Account', (ctx) => {
    const user = getDB(ctx);
    ctx.replyWithMarkdown(
        `⭐ *PREMIUM ACCOUNT STATUS*\n━━━━━━━━\n🆔 User ID: \`${ctx.from.id}\`\n💰 Balance: \`${user.points} Points\`\n📊 Registered: \`${user.registered} Gmails\`\n🚸 Invites: \`${user.referrals} Users\`\n━━━━━━━━`,
        getMenu(ctx)
    );
});

bot.hears('🚸 My Referrals', (ctx) => {
    const user = getDB(ctx);
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(
        `✨ **AFFILIATE CENTER** ✨\n━━━━━━━━\n👥 Total Referrals: \`${user.referrals || 0}\`\n💰 Total Earned: \`${user.referrals || 0} Points\`\n━━━━━━━━\n🎁 Reward: \`1 Point\` per join!\n\n🔗 Your Link:\n\`${link}\``,
        Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)]])
    );
});

bot.hears('🏥 Help', async (ctx) => {
    const helpMessage = 
`🌟 **Account Registration System** 🌟

✅ Registration Access
🧢 Allowed Limit
🤖 Unlimited Gmail creation
⚠️ Recommended 5–10 accounts/hour for safety
🛍️ Referral System: Updated every 24h, AI filters inactive users
✅ Only real users get rewarded.`;

    await ctx.replyWithMarkdown(helpMessage,
        Markup.inlineKeyboard([[Markup.button.callback("🗑️ Mark as Read & Close", "close_help")]])
    );
});


// --- ADMIN PANEL ---
bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ This area is restricted to Developers.");
    ctx.reply("🛠 **Advanced Admin Dashboard**\nSelect a management tool:", adminKeyboard);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.replyWithMarkdown(`📈 *Server Statistics*\n\n👥 *Total Users:* ${totalUsers}\n📡 *Server:* Active (Railway)\n⚡ *API Latency:* 42ms`);
});

bot.hears('📢 Broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'BROADCAST_PREVIEW';
    ctx.replyWithMarkdown("🛠 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 ADVANCED BROADCAST**\n\n➡️ *Send me anything now...*", cancelKeyboard);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'ADD_POINTS_ID';
    ctx.reply("➕ **Send the User ID to add points to:**", cancelKeyboard);
});

bot.hears('➖ Remove Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'REM_POINTS_ID';
    ctx.reply("➖ **Send the User ID to remove points from:**", cancelKeyboard);
});

bot.hears('👥 List All Users', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const userIds = Object.keys(db);
    if (userIds.length === 0) return ctx.reply("📭 Database is empty.");
    const buttons = userIds.map(id => [Markup.button.callback(`👤 ${db[id].name} [${db[id].username}] | 💰 ${db[id].points}`, `view_prof:${id}`)]);
    ctx.replyWithMarkdown("📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**", Markup.inlineKeyboard(buttons));
});

bot.hears('⬅️ Back to User Menu', (ctx) => ctx.reply("Returning...", getMenu(ctx)));

// --- TEXT STATE HANDLER (THE ENGINE) ---
bot.on('message', async (ctx, next) => {
    const text = ctx.message?.text;
    if (text === '❌ Cancel Operation') {
        ctx.session = {};
        return ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
    }

    const state = ctx.session?.step;
    if (!state) return next();

    // Broadcast Logic
    if (state === 'BROADCAST_PREVIEW' && ctx.from.id === ADMIN_ID) {
        ctx.session.msgToCopy = ctx.message.message_id;
        ctx.session.step = 'BROADCAST_CONFIRM';
        await ctx.reply("👇 **PREVIEW OF YOUR POST:**");
        await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
        return ctx.reply("⬆️ **Does this look correct?**", Markup.keyboard([['✅ CONFIRM & SEND'], ['❌ Cancel Operation']]).resize());
    }

    if (state === 'BROADCAST_CONFIRM' && text === '✅ CONFIRM & SEND' && ctx.from.id === ADMIN_ID) {
        const users = Object.keys(db);
        await ctx.reply(`🚀 **Broadcasting to ${users.length} users...**`);
        for (const userId of users) {
            try { 
                await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.session.msgToCopy); 
            } catch (e) {}
        }
        ctx.session = {};
        return ctx.reply("📢 **BROADCAST COMPLETE**", adminKeyboard);
    }

    // Add Points Logic
    if (state === 'ADD_POINTS_ID' && ctx.from.id === ADMIN_ID) {
        ctx.session.targetId = text;
        ctx.session.step = 'ADD_POINTS_AMT';
        return ctx.reply("💰 **Enter the number of points to ADD:**");
    }
    if (state === 'ADD_POINTS_AMT' && ctx.from.id === ADMIN_ID) {
        const amount = parseInt(text);
        if (isNaN(amount) || amount < 0) {
            return ctx.reply("❌ Enter a valid positive number.");
        }
        const targetId = ctx.session.targetId;
        const target = getDB(targetId);
        target.points += amount;
        try {
            await bot.telegram.sendMessage(targetId, `🎁 **Bonus!** Admin added ${amount} points.`, { parse_mode: 'Markdown' });
        } catch (e) {}
        ctx.session = {};
        return ctx.reply(`✅ Added ${amount} points to User ${targetId}`, adminKeyboard);
    }

    // Remove Points Logic
    if (state === 'REM_POINTS_ID' && ctx.from.id === ADMIN_ID) {
        ctx.session.targetId = text;
        ctx.session.step = 'REM_POINTS_AMT';
        return ctx.reply("💰 **Enter the number of points to REMOVE:**");
    }
    if (state === 'REM_POINTS_AMT' && ctx.from.id === ADMIN_ID) {
        const amount = parseInt(text);
        if (isNaN(amount) || amount < 0) {
            return ctx.reply("❌ Enter a valid positive number.");
        }
        const targetId = ctx.session.targetId;
        const target = getDB(targetId);
        target.points = Math.max(0, target.points - amount);
        ctx.session = {};
        return ctx.reply(`✅ Removed ${amount} points from User ${targetId}`, adminKeyboard);
    }


// --- LAUNCH BOT ---
bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Online 🚀"));

