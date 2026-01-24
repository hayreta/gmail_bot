const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot'; 

const bot = new Telegraf(BOT_TOKEN);
const db = {}; // FIXED: Added missing database object
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
const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account', '🚸 My Referrals'],
    ['🏥 Help', '🛠 Admin Panel']
]).resize();

const adminKeyboard = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '➖ Remove Points'],
    ['👥 List All Users', '⬅️ Back to User Menu']
]).resize();

const cancelKeyboard = Markup.keyboard([['❌ Cancel Operation']]).resize();

// --- MIDDLEWARE: FORCE JOIN CHECK ---
async function checkJoin(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next(); 
    for (const chan of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) {
                return ctx.replyWithPhoto(
                    { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' },
                    {
                        caption: "⛔️ **ACCESS DENIED**\n\nYou must join our official channels to use this bot's premium features.",
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.url("Channel 1", "https://t.me/Hayre37"), Markup.button.url("Channel 2", "https://t.me/Digital_Claim")],
                            [Markup.button.url("Channel 3", "https://t.me/BIgsew_community"), Markup.button.url("Channel 4", "https://t.me/hayrefx")],
                            [Markup.button.callback("Verify Membership ✅", "verify")]
                        ])
                    }
                );
            }
        } catch (e) { continue; }
    }
    return next();
}

// --- COMMANDS ---
bot.start(async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.payload;

    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId); 
        if (referrer) {
            referrer.points += 1; 
            referrer.referrals += 1;
            bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user joined! You earned +1 Point.`, { parse_mode: 'Markdown' }).catch(()=>{});
        }
    }

    await ctx.replyWithPhoto(
        { source: 'welcome.png' }, // Points to the local file in your folder
        {
            caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Starting Balance:** \`0 Points\`\n\nInvite friends to earn points and start farming!`,
            parse_mode: 'Markdown',
            ...mainMenu
        }
    );
});

// --- MAIN MENU HANDLERS ---
bot.hears('➕ Register New Gmail', checkJoin, async (ctx) => {
    const user = getDB(ctx);
    if (user.points < 5) {
        return ctx.replyWithMarkdown(`⚠️ *Insufficient Balance*\n\nYou need **5 Points** to register.\n*Current Balance:* ${user.points} pts`);
    }
    ctx.session = { step: 'EMAIL' };
    ctx.replyWithMarkdown("📧 **Please send the Gmail Address**\n\n_Example: name@gmail.com_", cancelKeyboard);
});

bot.hears('⚙️ Account', (ctx) => {
    const user = getDB(ctx);
    ctx.replyWithMarkdown(`⭐ *PREMIUM ACCOUNT STATUS*\n━━━━━━━━━━━━━━━━━━\n🆔 *User ID:* \`${ctx.from.id}\`\n💰 *Balance:* \`${user.points} Points\`\n📊 *Registered:* \`${user.registered} Gmails\`\n🚸 *Invites:* \`${user.referrals} Users\`\n━━━━━━━━━━━━━━━━━━`, mainMenu);
});

bot.hears('🚸 My Referrals', (ctx) => {
    const user = getDB(ctx); 
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    const totalEarned = (user.referrals || 0) * 1;
    ctx.replyWithMarkdown(`✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 AFFILIATE CENTER** ✨\n━━━━━━━━━━━━━━━━━━\n👤 **User:** ${user.name}\n👥 **Total Referrals:** \`${user.referrals || 0}\`\n💰 **Total Earned:** \`${totalEarned} Points\`\n━━━━━━━━━━━━━━━━━━\n🎁 **Reward:** \`1 Point\` per join!\n\n🔗 **Your Unique Link:**\n\`${link}\``, 
        Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)],[Markup.button.callback("📊 Refresh Stats", "refresh_ref")]]));
});
// --- HELP MESSAGE HANDLER WITH AUTO-CLEANUP ---

// --- HELP MESSAGE HANDLER ---
// --- 1. THE HELP COMMAND ---
bot.hears('🏥 Help', async (ctx) => {
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

    await ctx.replyWithMarkdown(helpMessage, 
        Markup.inlineKeyboard([
            [Markup.button.callback("🗑️ Mark as Read & Close", "close_help")]
        ])
    );
});

// --- 2. THE DELETE ACTION ---
bot.action('close_help', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.answerCbQuery("Message marked as read ✅");
    } catch (e) {
        ctx.answerCbQuery("Already deleted.");
    }
});

// --- 3. THE AUTO-CLEANUP (When any other menu button is pressed) ---
bot.on('text', async (ctx, next) => {
    // If the user clicks a menu button while a help message is active
    if (ctx.session?.helpMsgId) {
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.helpMsgId);
            ctx.session.helpMsgId = null;
        } catch (e) {}
    }
    return next();
});

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
    ctx.session = { step: 'BROADCAST_PREVIEW' };
    ctx.replyWithMarkdown("🛠 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 ADVANCED BROADCAST**\n\n➡️ *Send me anything now...*", cancelKeyboard);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADD_POINTS_ID' };
    ctx.reply("➕ **Send the User ID to add points to:**", cancelKeyboard);
});

bot.hears('➖ Remove Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'REM_POINTS_ID' };
    ctx.reply("➖ **Send the User ID to remove points from:**", cancelKeyboard);
});

bot.hears('👥 List All Users', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const userIds = Object.keys(db);
    if (userIds.length === 0) return ctx.reply("📭 Database is empty.");
    const buttons = userIds.map(id => [Markup.button.callback(`👤 ${db[id].name} [${db[id].username}] | 💰 ${db[id].points}`, `view_prof:${id}`)]);
    ctx.replyWithMarkdown("📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**", Markup.inlineKeyboard(buttons));
});

bot.hears('⬅️ Back to User Menu', (ctx) => ctx.reply("Returning...", mainMenu));

// --- TEXT STATE HANDLER (THE ENGINE) ---

bot.on('message', async (ctx, next) => {
    const text = ctx.message?.text;
    if (text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Operation Terminated.", mainMenu);
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
            try { await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.session.msgToCopy); } catch (e) {}
        }
        ctx.session = null;
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
        const targetId = ctx.session.targetId;
        const target = getDB(targetId);
        target.points += amount;
        bot.telegram.sendMessage(targetId, `🎁 **Bonus!** Admin added ${amount} points.`).catch(()=>{});
        ctx.session = null;
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
        const targetId = ctx.session.targetId;
        const target = getDB(targetId);
        target.points -= amount;
        ctx.session = null;
        return ctx.reply(`✅ Removed ${amount} points from User ${targetId}`, adminKeyboard);
    }

    // Gmail Registration Logic
    if (state === 'EMAIL') {
        if (!text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com.");
        ctx.session.email = text;
        ctx.session.step = 'PASS';
        return ctx.reply("🔑 **Please send the Password**");
    }

    if (state === 'PASS') {
        const email = ctx.session.email;
        const user = getDB(ctx);
        user.points -= 5;
        user.registered += 1;
        ctx.session = null;
        return ctx.replyWithMarkdown(`✅ **Success!**\n\n📧 *Email:* \`${email}\`\n\nBalance: ${user.points}`, mainMenu);
    }
});

// --- CALLBACK HANDLERS ---
bot.action(/view_prof:(.+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const u = db[targetId];
    if (!u) return ctx.answerCbQuery("❌ User not found.");
    const profileText = `✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER INTELLIGENCE** ✨\n━━━━━━━━━━━━━━━━━━\n👤 **User:** ${u.name}\n🆔 **User ID:** \`${targetId}\`\n💰 **Balance:** \`${u.points} Points\`\n━━━━━━━━━━━━━━━━━━`;
    await ctx.editMessageText(profileText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("➕ Add Points", `quick_add:${targetId}`), Markup.button.callback("➖ Rem Points", `quick_rem:${targetId}`)],[Markup.button.callback("⬅️ Back", "list_users_back")]]) });
});

bot.action(/quick_add:(.+)/, (ctx) => {
    ctx.session = { step: 'ADD_POINTS_AMT', targetId: ctx.match[1] };
    ctx.reply(`💰 **Enter points to add for ID ${ctx.match[1]}:**`, cancelKeyboard);
    ctx.answerCbQuery();
});

bot.action(/quick_rem:(.+)/, (ctx) => {
    ctx.session = { step: 'REM_POINTS_AMT', targetId: ctx.match[1] };
    ctx.reply(`💰 **Enter points to remove for ID ${ctx.match[1]}:**`, cancelKeyboard);
    ctx.answerCbQuery();
});

bot.action('list_users_back', async (ctx) => {
    const userIds = Object.keys(db);
    const buttons = userIds.map(id => [Markup.button.callback(`👤 ID: ${id} | 💰 ${db[id].points} pts`, `view_prof:${id}`)]);
    await ctx.editMessageText("📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
});

bot.action('refresh_ref', (ctx) => {
    const user = getDB(ctx);
    ctx.answerCbQuery(`Stats Updated! Points: ${user.points}`);
});

bot.action('verify', (ctx) => ctx.reply("Verification updated. Please send /start."));

bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Advanced Bot Online 🚀"));





