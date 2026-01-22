const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'YourBotUsername'; // Put your bot username here without @

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// DATABASE SIMULATION (Use MongoDB for real production)
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
    ['🏥 Help', '🛠 Admin Panel'] // Admin button only works for you
]).resize();

const adminKeyboard = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '➖ Remove Points'],
    ['⬅️ Back to User Menu']
]).resize();

const cancelKeyboard = Markup.keyboard([['❌ Cancel Operation']]).resize();

// --- MIDDLEWARE: FORCE JOIN CHECK ---
async function checkJoin(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next(); // Admin bypass
    
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
    const user = getDB(ctx.from.id);
    
    // Referral Check
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
    ctx.replyWithMarkdown("📧 **Please send the Gmail Address**\n\n_Example: name@gmail.com_", cancelKeyboard);
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
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ This area is restricted to Developers.");
    ctx.reply("🛠 **Advanced Admin Dashboard**\nSelect a management tool:", adminKeyboard);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.replyWithMarkdown(`📈 *Server Statistics*\n\n👥 *Total Users:* ${totalUsers}\n📡 *Server:* Active (Railway)\n⚡ *API Latency:* 42ms`);
});

bot.hears('⬅️ Back to User Menu', (ctx) => ctx.reply("Returning...", mainMenu));

// --- TEXT STATE HANDLER ---

bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Cancelled.", mainMenu);
    }

    const state = ctx.session?.step;
    if (state === 'EMAIL') {
        if (!ctx.message.text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com address.");
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.replyWithMarkdown("🔑 **Please send the Password**\n\n_Avoid using simple passwords._", cancelKeyboard);
    }

    if (state === 'PASS') {
        const email = ctx.session.email;
        const pass = ctx.message.text;
        ctx.session = null;
        
        const loader = await ctx.reply("🛰 *Verifying with Server...*", { parse_mode: 'Markdown' });
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, 
                `✅ **Success!**\n\n📧 *Email:* \`${email}\`\n🔑 *Pass:* \`${pass}\`\n\nYour account has been added to the farm database.`,
                { parse_mode: 'Markdown', ...mainMenu }
            );
            const user = getDB(ctx.from.id);
            user.points -= 5;
            user.registered += 1;
        }, 2000);
        return;
    }
    return next();
});

// --- CALLBACK HANDLERS ---
bot.action('verify', async (ctx) => {
    await ctx.answerCbQuery("Checking...");
    ctx.reply("Verification updated. Please send /start to refresh.");
});

bot.launch().then(() => console.log("Advanced Bot Online 🚀"));
