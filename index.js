const { Telegraf, Markup, session } = require('telegraf');

// --- CONFIGURATION ---
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_NAME = "createUnlimitedGmail Bot";
const BOT_USERNAME = "createUnlimitedGmail_Bot"; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- DATABASE (In-Memory) ---
const db = {}; 
const getDB = (id) => {
    if (!db[id]) {
        db[id] = { points: 10, referrals: 0, registered: 0, status: "Free" };
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

const adminMenu = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '⬅️ Back to User Menu']
]).resize();

// --- 🛡️ THE LOCK (STRICT MIDDLEWARE) ---
async function checkMembership(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();

    for (const channel of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            if (['left', 'kicked', 'restricted'].includes(member.status)) {
                return ctx.replyWithPhoto(
                    { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' },
                    {
                        caption: `⛔️ **ACCESS DENIED**\n\nYou must be a subscriber of our channels to use **${BOT_NAME}**.\n\n_If you leave the channels, your access is automatically locked._`,
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.url("Join @Hayre37", "https://t.me/Hayre37")],
                            [Markup.button.url("Join @Digital_Claim", "https://t.me/Digital_Claim")],
                            [Markup.button.callback("I have joined all ✅", "verify")]
                        ])
                    }
                );
            }
        } catch (e) { continue; }
    }
    return next();
}

// --- CORE HANDLERS ---

bot.start(async (ctx) => {
    const user = getDB(ctx.from.id);
    
    // Referral Logic
    const refId = ctx.payload;
    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId);
        referrer.points += 2;
        referrer.referrals += 1;
        bot.telegram.sendMessage(refId, `🎁 *Referral Bonus!*\nSomeone joined using your link. +2 Points added!`, { parse_mode: 'Markdown' });
    }

    ctx.replyWithMarkdown(`🔰 **Welcome to ${BOT_NAME}**\n\nCreate unlimited Gmail accounts for your farm. Use the menu below to start.`, mainMenu);
});

bot.hears('➕ Register New Gmail', checkMembership, (ctx) => {
    const user = getDB(ctx.from.id);
    if (user.points < 5) {
        return ctx.replyWithMarkdown(`⚠️ **Insufficient Points**\n\nYou need **5 Points** to register.\n💰 *Balance:* ${user.points} pts`);
    }
    ctx.session = { step: 'EMAIL' };
    ctx.replyWithMarkdown("🟢 **Please Send Email** 📧\n\n⚙️ *Example:* `name@gmail.com`", Markup.keyboard([['❌ Cancel Operation']]).resize());
});

bot.hears('⚙️ Account', checkMembership, (ctx) => {
    const user = getDB(ctx.from.id);
    ctx.replyWithMarkdown(
        `💎 **${BOT_NAME} ACCOUNT**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 **User:** \`${ctx.from.first_name}\`\n` +
        `🆔 **ID:** \`${ctx.from.id}\`\n` +
        `💰 **Balance:** \`${user.points} Points\`\n` +
        `📧 **Created:** \`${user.registered} Gmails\`\n` +
        `━━━━━━━━━━━━━━━━━━`, mainMenu
    );
});

bot.hears('🚸 My Referrals', checkMembership, (ctx) => {
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(
        `🚸 **REFERRAL SYSTEM**\n\nInvite friends to earn points!\n💰 *Reward:* 2 Points per friend.\n\n🔗 **Your Link:** \`${link}\``,
        Markup.inlineKeyboard([[Markup.button.url("Share Link 🚀", `https://t.me/share/url?url=${link}`)]])
    );
});

// --- ADMIN PANEL LOGIC ---

bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Access Denied.");
    ctx.reply("🛠 **CONTROL PANEL**", adminMenu);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADD_POINTS_ID' };
    ctx.reply("Please send the **User ID** you want to give points to:");
});

// --- GLOBAL TEXT HANDLER (State Machine) ---

bot.on('text', async (ctx, next) => {
    const state = ctx.session?.step;

    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Operation Cancelled.", mainMenu);
    }

    // Gmail Steps
    if (state === 'EMAIL') {
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.replyWithMarkdown("🔋 **Please Send Password** 🔑");
    }
    if (state === 'PASS') {
        const { email } = ctx.session;
        ctx.session = null;
        const msg = await ctx.reply("🚀 *Registering...*", { parse_mode: 'Markdown' });
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `✅ **Successfully Registered!**\n\n📧 \`${email}\`\n🔑 \`${ctx.message.text}\``, { parse_mode: 'Markdown' });
            getDB(ctx.from.id).points -= 5;
            getDB(ctx.from.id).registered += 1;
        }, 1500);
        return;
    }

    // Admin Steps
    if (state === 'ADD_POINTS_ID') {
        ctx.session.targetId = ctx.message.text;
        ctx.session.step = 'ADD_POINTS_AMOUNT';
        return ctx.reply("How many points to add?");
    }
    if (state === 'ADD_POINTS_AMOUNT') {
        const target = getDB(ctx.session.targetId);
        target.points += parseInt(ctx.message.text);
        ctx.session = null;
        return ctx.reply(`✅ Added points to user!`, adminMenu);
    }

    return next();
});

bot.action('verify', checkMembership, (ctx) => {
    ctx.answerCbQuery("✅ Verified!");
    ctx.reply("🔰 Welcome To Main Menu", mainMenu);
});

bot.launch().then(() => console.log(`${BOT_NAME} is Online 🚀`));
