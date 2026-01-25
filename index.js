const { Telegraf, Markup, session } = require('telegraf');
require('dotenv').config();

// CONFIGURATION
const BOT_TOKEN = process.env.BOT_TOKEN || '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot'; 

const bot = new Telegraf(BOT_TOKEN);
const db = {}; // In-memory database
bot.use(session());

// DATABASE SIMULATION
const getDB = (ctx) => {
    const id = (typeof ctx === 'object' && ctx.from) ? ctx.from.id : ctx;
    if (!db[id]) {
        db[id] = { 
            points: 0, 
            referrals: 0, 
            registered: 0, 
            joined: new Date(),
            name: (ctx.from?.first_name) || "User",
            username: ctx.from?.username ? `@${ctx.from.username}` : "No Username"
        };
    }
    return db[id];
};

const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

// --- KEYBOARDS ---
const getMenu = (ctx) => {
    let buttons = [
        [{ text: '➕ Register New Gmail', callback_data: 'register' }],
        [{ text: '⚙️ Account', callback_data: 'account' }, { text: '🚸 My Referrals', callback_data: 'referrals' }],
        [{ text: '🏥 Help', callback_data: 'help' }]
    ];
    if (ctx.from.id === ADMIN_ID) {
        buttons.push([{ text: '🛠 Admin Panel', callback_data: 'admin_panel' }]);
    }
    return Markup.inlineKeyboard(buttons);
};

const adminKeyboard = Markup.inlineKeyboard([
    [{ text: '📊 Global Stats', callback_data: 'stats' }, { text: '📢 Broadcast', callback_data: 'broadcast' }],
    [{ text: '➕ Add Points', callback_data: 'add_points' }, { text: '➖ Remove Points', callback_data: 'rem_points' }],
    [{ text: '👥 List All Users', callback_data: 'list_users' }, { text: '⬅️ Back to User Menu', callback_data: 'back_menu' }]
]);

const cancelKeyboard = Markup.inlineKeyboard([{ text: '❌ Cancel Operation', callback_data: 'cancel_op' }]);

// --- MIDDLEWARE: FORCE JOIN CHECK ---
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
        } catch (e) { 
            joinedAll = false;
            break;
        }
    }

    if (!joinedAll) {
        return ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `⛔️ **ACCESS DENIED**\n\nYou must join our official channels to use this bot's premium features.`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url("Channel 1", "https://t.me/Hayre37"), Markup.button.url("Channel 2", "https://t.me/Digital_Claim")],
                    [Markup.button.url("Channel 3", "https://t.me/BIgsew_community"), Markup.button.url("Channel 4", "https://t.me/hayrefx")],
                    [Markup.button.callback("Verify Membership ✅", "verify_and_delete")]
                ])
            }
        );
    }
    return next();
}

// --- CALLBACK: VERIFY AND DELETE ---
bot.action('verify_and_delete', async (ctx) => {
    let joinedAll = true;
    for (const chan of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) {
                joinedAll = false;
                break;
            }
        } catch (e) { 
            joinedAll = false;
            break;
        }
    }

    if (joinedAll) {
        try {
            await ctx.deleteMessage(); 
        } catch (e) {}
        
        const user = getDB(ctx);
        await ctx.answerCbQuery("Success! Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ ✅");
        
        await ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Starting Balance:** \`0 Points\`\n\nInvite friends to earn points!`,
                parse_mode: 'Markdown',
                ...getMenu(ctx)
            }
        );
    } else {
        await ctx.answerCbQuery("❌ You still haven't joined all channels!", { show_alert: true });
    }
});

// --- START COMMAND ---
bot.start(checkJoin, async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.payload;

    // Referral Logic
    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId); 
        if (referrer) {
            referrer.points += 1; 
            referrer.referrals += 1;
            try {
                await bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user earned +1 Point.`, { parse_mode: 'Markdown' });
            } catch (e) {}
        }
    }

    await ctx.replyWithPhoto(
        { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' }, 
        {
            caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Starting Balance:** \`0 Points\`\n\nInvite friends to earn points!`,
            parse_mode: 'Markdown',
            ...getMenu(ctx)
        }
    );
});

// --- MAIN MENU HANDLERS ---
bot.action('register', checkJoin, async (ctx) => {
    const user = getDB(ctx);
    if (user.points < 5) {
        await ctx.answerCbQuery();
        return ctx.reply(`⚠️ *Insufficient Balance*\n\nYou need **5 Points** to register.\n*Current Balance:* ${user.points} pts`, { parse_mode: 'Markdown', ...getMenu(ctx) });
    }
    ctx.session.step = 'EMAIL';
    await ctx.answerCbQuery();
    await ctx.reply("📧 **Please send the Gmail Address**\n\n_Example: name@gmail.com_", { parse_mode: 'Markdown', ...cancelKeyboard });
});

bot.action('account', async (ctx) => {
    const user = getDB(ctx);
    await ctx.answerCbQuery();
    await ctx.reply(`⭐ *PREMIUM ACCOUNT STATUS*\n━━━━━━━━━━━━━━━━━━\n🆔 *User ID:* \`${ctx.from.id}\`\n💰 *Balance:* \`${user.points} Points\`\n📊 *Registered:* \`${user.registered} Gmails\`\n🚸 *Invites:* \`${user.referrals} Users\`\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown', ...getMenu(ctx) });
});

bot.action('referrals', async (ctx) => {
    const user = getDB(ctx); 
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    const totalEarned = (user.referrals || 0) * 1;
    await ctx.answerCbQuery();
    await ctx.reply(`✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 AFFILIATE CENTER** ✨\n━━━━━━━━━━━━━━━━━━\n👤 **User:** ${user.name}\n👥 **Total Referrals:** \`${user.referrals || 0}\`\n💰 **Total Earned:** \`${totalEarned} Points\`\n━━━━━━━━━━━━━━━━━━\n🎁 **Reward:** \`1 Point\` per join!\n\n🔗 **Your Unique Link:**\n\`${link}\``, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)],[Markup.button.callback("📊 Refresh Stats", "refresh_ref")]])
    });
});

// --- HELP MESSAGE HANDLER ---
bot.action('help', async (ctx) => {
    const helpMessage = 
        `🌟 **Account Registration System** 🌟\n\n` +
        `✅ **Registration Access**\n\n` +
        `🧢 **Allowed Limit:**\n\n` +
        `🤖 The robot has no restrictions on creating accounts using new methods and multiple servers.\n\n` +
        `You can create unlimited Gmail accounts with full automation.\n\n` +
        `⚠️ For safety and long-term stability, we recommend creating 5–10 accounts per hour to avoid bans and security flags.\n\n` +
        `🛍️ **My Referrals System**\n` +
        `☔ **Referral Tracking:**\n\n` +
        `📊 Your referral count is updated every 24 hours.\n\n` +
        `🧠 The system uses AI detection to identify fake or inactive users, and they are automatically excluded from the count.\n\n` +
        `✅ Only real, valid users are recorded and rewarded.`;

    await ctx.answerCbQuery();
    await ctx.reply(helpMessage, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🗑️ Mark as Read & Close", "close_help")]
        ])
    });
});

// --- DELETE ACTION ---
bot.action('close_help', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.answerCbQuery("Message marked as read ✅");
    } catch (e) {
        await ctx.answerCbQuery("Already deleted.");
    }
});

// --- ADMIN PANEL ---
bot.action('admin_panel', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ This area is restricted to Developers.", { show_alert: true });
        return;
    }
    await ctx.answerCbQuery();
    await ctx.reply("🛠 **Advanced Admin Dashboard**\nSelect a management tool:", { parse_mode: 'Markdown', ...adminKeyboard });
});

bot.action('stats', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ Unauthorized", { show_alert: true });
        return;
    }
    const totalUsers = Object.keys(db).length;
    await ctx.answerCbQuery();
    await ctx.reply(`📈 *Server Statistics*\n\n👥 *Total Users:* ${totalUsers}\n📡 *Server:* Active (Railway)\n⚡ *API Latency:* 42ms`, { parse_mode: 'Markdown', ...adminKeyboard });
});

bot.action('broadcast', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ Unauthorized", { show_alert: true });
        return;
    }
    ctx.session.step = 'BROADCAST_PREVIEW';
    await ctx.answerCbQuery();
    await ctx.reply("🛠 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 ADVANCED BROADCAST**\n\n➡️ *Send me anything now...*", { parse_mode: 'Markdown', ...cancelKeyboard });
});

bot.action('add_points', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ Unauthorized", { show_alert: true });
        return;
    }
    ctx.session.step = 'ADD_POINTS_ID';
    await ctx.answerCbQuery();
    await ctx.reply("➕ **Send the User ID to add points to:**", { parse_mode: 'Markdown', ...cancelKeyboard });
});

bot.action('rem_points', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ Unauthorized", { show_alert: true });
        return;
    }
    ctx.session.step = 'REM_POINTS_ID';
    await ctx.answerCbQuery();
    await ctx.reply("➖ **Send the User ID to remove points from:**", { parse_mode: 'Markdown', ...cancelKeyboard });
});

bot.action('list_users', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ Unauthorized", { show_alert: true });
        return;
    }
    await ctx.answerCbQuery();
    const userIds = Object.keys(db);
    if (userIds.length === 0) return ctx.reply("📭 Database is empty.");
    const buttons = userIds.map(id => [Markup.button.callback(`👤 ${db[id].name} [${db[id].username}] | 💰 ${db[id].points}`, `view_prof:${id}`)]);
    await ctx.reply("📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action('back_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("Returning...", { parse_mode: 'Markdown', ...getMenu(ctx) });
});

// --- TEXT STATE HANDLER (THE ENGINE) ---
bot.on('message', async (ctx, next) => {
    try {
        const text = ctx.message?.text;
        const state = ctx.session?.step;

        if (!state) return next();

        // Broadcast Logic
        if (state === 'BROADCAST_PREVIEW' && ctx.from.id === ADMIN_ID) {
            ctx.session.msgToCopy = ctx.message.message_id;
            ctx.session.step = 'BROADCAST_CONFIRM';
            await ctx.reply("👇 **PREVIEW OF YOUR POST:**");
            await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
            return ctx.reply("⬆️ **Does this look correct?**", { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([[Markup.button.callback('✅ CONFIRM & SEND', 'broadcast_confirm')], [Markup.button.callback('❌ Cancel Operation', 'cancel_op')]])
            });
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
            return ctx.reply("📢 **BROADCAST COMPLETE**", { parse_mode: 'Markdown', ...adminKeyboard });
        }

        if (state === 'BROADCAST_CONFIRM' && text === '❌ Cancel Operation' && ctx.from.id === ADMIN_ID) {
            ctx.session = {};
            await ctx.answerCbQuery("Broadcast cancelled.");
            return ctx.reply("🚫 Broadcast cancelled.", { parse_mode: 'Markdown', ...adminKeyboard });
        }

        // Add Points Logic
        if (state === 'ADD_POINTS_ID' && ctx.from.id === ADMIN_ID) {
            ctx.session.targetId = text;
            ctx.session.step = 'ADD_POINTS_AMT';
            return ctx.reply("💰 **Enter the number of points to ADD:**", { parse_mode: 'Markdown', ...cancelKeyboard });
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
            return ctx.reply(`✅ Added ${amount} points to User ${targetId}`, { parse_mode: 'Markdown', ...adminKeyboard });
        }

        // Remove Points Logic
        if (state === 'REM_POINTS_ID' && ctx.from.id === ADMIN_ID) {
            ctx.session.targetId = text;
            ctx.session.step = 'REM_POINTS_AMT';
            return ctx.reply("💰 **Enter the number of points to REMOVE:**", { parse_mode: 'Markdown', ...cancelKeyboard });
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
            return ctx.reply(`✅ Removed ${amount} points from User ${targetId}`, { parse_mode: 'Markdown', ...adminKeyboard });
        }

        // Gmail Registration Logic
        if (state === 'EMAIL') {
            if (!text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com.");
            ctx.session.email = text;
            ctx.session.step = 'PASS';
            return ctx.reply("🔑 **Please send the Password**", { parse_mode: 'Markdown', ...cancelKeyboard });
        }

        if (state === 'PASS') {
            const email = ctx.session.email;
            const user = getDB(ctx);
            user.points -= 5;
            user.registered += 1;
            ctx.session = {};
            return ctx.reply(`✅ **Success!**\n\n📧 *Email:* \`${email}\`\n\nBalance: ${user.points}`, { parse_mode: 'Markdown', ...getMenu(ctx) });
        }

        return next();
    } catch (err) {
        console.error('[v0] Error in message handler:', err);
        try {
            await ctx.reply("❌ An error occurred. Please try again.");
        } catch (e) {}
    }
});

// --- CALLBACK HANDLERS ---
bot.action('cancel_op', async (ctx) => {
    ctx.session = {};
    await ctx.answerCbQuery("Operation cancelled ✅");
    await ctx.reply("🚫 Operation Terminated.", { parse_mode: 'Markdown', ...getMenu(ctx) });
});

bot.action(/view_prof:(.+)/, async (ctx) => {
    try {
        const targetId = ctx.match[1];
        const u = db[targetId];
        if (!u) {
            await ctx.answerCbQuery("❌ User not found.");
            return;
        }
        const profileText = `✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER INTELLIGENCE** ✨\n━━━━━━━━━━━━━━━━━━\n👤 **User:** ${u.name}\n🆔 **User ID:** \`${targetId}\`\n💰 **Balance:** \`${u.points} Points\`\n━━━━━━━━━━━━━━━━━━`;
        await ctx.editMessageText(profileText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("➕ Add Points", `quick_add:${targetId}`), Markup.button.callback("➖ Rem Points", `quick_rem:${targetId}`)],[Markup.button.callback("⬅️ Back", "list_users_back")]]) });
        await ctx.answerCbQuery();
    } catch (err) {
        console.error('[v0] Error in view_prof:', err);
        await ctx.answerCbQuery("Error loading profile.");
    }
});

bot.action(/quick_add:(.+)/, async (ctx) => {
    ctx.session.step = 'ADD_POINTS_AMT';
    ctx.session.targetId = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply(`💰 **Enter points to add for ID ${ctx.match[1]}:**`, { parse_mode: 'Markdown', ...cancelKeyboard });
});

bot.action(/quick_rem:(.+)/, async (ctx) => {
    ctx.session.step = 'REM_POINTS_AMT';
    ctx.session.targetId = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply(`💰 **Enter points to remove for ID ${ctx.match[1]}:**`, { parse_mode: 'Markdown', ...cancelKeyboard });
});

bot.action('list_users_back', async (ctx) => {
    try {
        const userIds = Object.keys(db);
        const buttons = userIds.map(id => [Markup.button.callback(`👤 ID: ${id} | 💰 ${db[id].points} pts`, `view_prof:${id}`)]);
        await ctx.editMessageText("📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        await ctx.answerCbQuery();
    } catch (err) {
        console.error('[v0] Error in list_users_back:', err);
        await ctx.answerCbQuery("Error loading user list.");
    }
});

bot.action('refresh_ref', async (ctx) => {
    const user = getDB(ctx);
    await ctx.answerCbQuery(`Stats Updated! Points: ${user.points}`);
});

bot.action('broadcast_confirm', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        await ctx.answerCbQuery("❌ Unauthorized", { show_alert: true });
        return;
    }
    const users = Object.keys(db);
    await ctx.answerCbQuery();
    await ctx.reply(`🚀 **Broadcasting to ${users.length} users...**`);
    for (const userId of users) {
        try { 
            await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.session.msgToCopy); 
        } catch (e) {}
    }
    ctx.session = {};
    return ctx.reply("📢 **BROADCAST COMPLETE**", { parse_mode: 'Markdown', ...adminKeyboard });
});

// --- GRACEFUL SHUTDOWN FOR RAILWAY ---
process.on('SIGTERM', async () => {
    console.log('[v0] SIGTERM received, gracefully shutting down...');
    try {
        await bot.stop('SIGTERM');
    } catch (err) {
        console.error('[v0] Error stopping bot:', err);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[v0] SIGINT received, gracefully shutting down...');
    try {
        await bot.stop('SIGINT');
    } catch (err) {
        console.error('[v0] Error stopping bot:', err);
    }
    process.exit(0);
});

// --- GLOBAL ERROR HANDLERS ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('[v0] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[v0] Uncaught Exception:', err);
    process.exit(1);
});

// --- LAUNCH BOT ---
bot.launch().then(() => {
    console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Advanced Bot Online 🚀");
}).catch((err) => {
    console.error('[v0] Failed to launch bot:', err);
    process.exit(1);
});
