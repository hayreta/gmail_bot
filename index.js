const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'YourBotUsername'; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// DATABASE SIMULATION (Note: Data resets on bot restart unless you use MongoDB)
const db = {}; 
const getDB = (id) => {
    if (!db[id]) db[id] = { points: 10, referrals: 0, registered: 0, joined: new Date() };
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
    ['⬅️ Back to User Menu']
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
                        caption: "⛔️ **ACCESS DENIED**\n\nYou must join our official channels to use this bot.",
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
    const user = getDB(ctx.from.id);
    const refId = ctx.payload;
    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId);
        referrer.points += 2;
        referrer.referrals += 1;
        bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user joined! You earned +2 Points.`, { parse_mode: 'Markdown' });
    }

    ctx.replyWithMarkdown(
        `👋 *Welcome to the Advanced Gmail Manager*\n\n` +
        `Use the menu below to start registering accounts or checking your balance.`,
        mainMenu
    );
});

// --- MAIN MENU HANDLERS ---

bot.hears('➕ Register New Gmail', checkJoin, async (ctx) => {
    const user = getDB(ctx.from.id);
    if (user.points < 5) {
        return ctx.replyWithMarkdown(`⚠️ *Insufficient Balance*\n\nYou need **5 Points** to register.\n*Current Balance:* ${user.points} pts`);
    }
    ctx.session = { step: 'EMAIL' };
    ctx.replyWithMarkdown("📧 **Please send the Gmail Address**", cancelKeyboard);
});

bot.hears('⚙️ Account', (ctx) => {
    const user = getDB(ctx.from.id);
    ctx.replyWithMarkdown(
        `⭐ *PREMIUM ACCOUNT STATUS*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *User ID:* \`${ctx.from.id}\`\n` +
        `💰 *Balance:* \`${user.points} Points\`\n` +
        `📊 *Registered:* \`${user.registered} Gmails\`\n` +
        `🚸 *Invites:* \`${user.referrals} Users\`\n` +
        `━━━━━━━━━━━━━━━━━━`,
        mainMenu
    );
});

bot.hears('🚸 My Referrals', (ctx) => {
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(
        `📢 *Referral Program*\n\nEarn **2 Points** for every friend you invite!\n\n🔗 *Your Link:* \`${link}\``,
        Markup.inlineKeyboard([[Markup.button.url("Share With Friends 🚀", `https://t.me/share/url?url=${link}`)]])
    );
});

// --- ADMIN PANEL HANDLERS ---

bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Restricted Area.");
    ctx.reply("🛠 **Admin Dashboard**", adminKeyboard);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.replyWithMarkdown(`📈 *Server Statistics*\n\n👥 *Total Users:* ${totalUsers}\n📡 *Server:* Active`);
});

bot.hears('📢 Broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADMIN_BROADCAST' };
    ctx.reply("📣 **Enter the message to broadcast to ALL users:**", cancelKeyboard);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADMIN_ADD_ID' };
    ctx.reply("👤 **Enter User ID to give points:**", cancelKeyboard);
});

bot.hears('➖ Remove Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADMIN_REM_ID' };
    ctx.reply("👤 **Enter User ID to remove points:**", cancelKeyboard);
});

bot.hears('⬅️ Back to User Menu', (ctx) => ctx.reply("Returning...", mainMenu));

// --- STATE HANDLER ---

bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Cancelled.", mainMenu);
    }

    const state = ctx.session?.step;

    // Admin: Broadcast Logic
    if (state === 'ADMIN_BROADCAST' && ctx.from.id === ADMIN_ID) {
        const users = Object.keys(db);
        users.forEach(id => bot.telegram.sendMessage(id, ctx.message.text).catch(e => {}));
        ctx.session = null;
        return ctx.reply(`✅ Broadcast sent to ${users.length} users.`, adminKeyboard);
    }

    // Admin: Add Points Logic
    if (state === 'ADMIN_ADD_ID') {
        ctx.session.target = ctx.message.text;
        ctx.session.step = 'ADMIN_ADD_AMT';
        return ctx.reply("💰 **How many points to add?**");
    }
    if (state === 'ADMIN_ADD_AMT') {
        const amt = parseInt(ctx.message.text);
        const user = getDB(ctx.session.target);
        user.points += amt;
        bot.telegram.sendMessage(ctx.session.target, `🎁 **Admin Reward!** You received ${amt} points.`);
        ctx.session = null;
        return ctx.reply("✅ Points Added.", adminKeyboard);
    }

    // Admin: Remove Points Logic
    if (state === 'ADMIN_REM_ID') {
        ctx.session.target = ctx.message.text;
        ctx.session.step = 'ADMIN_REM_AMT';
        return ctx.reply("💰 **How many points to remove?**");
    }
    if (state === 'ADMIN_REM_AMT') {
        const amt = parseInt(ctx.message.text);
        const user = getDB(ctx.session.target);
        user.points -= amt;
        ctx.session = null;
        return ctx.reply("✅ Points Removed.", adminKeyboard);
    }

    // User: Email Registration Logic
    if (state === 'EMAIL') {
        if (!ctx.message.text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com.");
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.reply("🔑 **Please send the Password**");
    }

    if (state === 'PASS') {
        const user = getDB(ctx.from.id);
        user.points -= 5;
        user.registered += 1;
        ctx.session = null;
        return ctx.replyWithMarkdown(`✅ **Success!**\n\n📧 *Email:* \`${ctx.session?.email}\`\n\nBalance: ${user.points}`, mainMenu);
    }

    return next();
});

bot.action('verify', (ctx) => ctx.answerCbQuery("Check updated! Refresh with /start"));

bot.launch().then(() => console.log("Bot Online 🚀"));
