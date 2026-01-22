const { Telegraf, Markup, session } = require('telegraf');

// --- ኮንፊገሬሽን (CONFIGURATION) ---
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_NAME = "createUnlimitedGmail Bot";
const BOT_USERNAME = "createUnlimitedGmail_Bot"; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- ዳታቤዝ (DATABASE SIMULATION) ---
const db = { 
    users: {}, 
    stats: { totalGmails: 0 } 
};

const getDB = (id, ctx = null) => {
    if (!db.users[id]) {
        db.users[id] = { 
            points: 10, 
            referrals: 0, 
            registered: 0, 
            username: ctx ? ctx.from.username : "User"
        };
    }
    return db.users[id];
};

const CHANNELS = [
    { name: '@Hayre37', link: 'https://t.me/Hayre37' },
    { name: '@Digital_Claim', link: 'https://t.me/Digital_Claim' },
    { name: '@BIgsew_community', link: 'https://t.me/BIgsew_community' },
    { name: '@hayrefx', link: 'https://t.me/hayrefx' }
];

// --- 🎹 ኪቦርዶች (KEYBOARDS) ---

// በምስሉ መሰረት ዋናው ሜኑ
const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account'],
    ['🚸 My Referrals'],
    ['🏥 Help'],
    ['🛠 Admin Panel']
]).resize();

const adminMenu = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '⬅️ Exit Admin']
]).resize();

const cancelBtn = Markup.keyboard([['❌ Cancel Operation']]).resize();

// --- 🛡️ የግዳጅ ግባ (STRICT FORCE JOIN) መከላከያ ---
const checkMembership = async (ctx) => {
    if (ctx.from.id === ADMIN_ID) return true;
    for (const channel of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(channel.name, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) return false;
        } catch (e) { continue; }
    }
    return true;
};

const sendJoinGate = async (ctx) => {
    return ctx.replyWithPhoto(
        { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' }, //
        {
            caption: "⛔️ **MUST JOIN OUR ALL CHANNELS**",
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url("Join ↗️", CHANNELS[0].link), Markup.button.url("Join ↗️", CHANNELS[1].link)], //
                [Markup.button.url("Join ↗️", CHANNELS[2].link), Markup.button.url("Join ↗️", CHANNELS[3].link)], //
                [Markup.button.callback("Joined ✅", "verify_access")] //
            ])
        }
    );
};

// --- ⚙️ የቦቱ ዋና ተግባራት (HANDLERS) ---

bot.start(async (ctx) => {
    getDB(ctx.from.id, ctx);
    const isJoined = await checkMembership(ctx);
    if (!isJoined) return sendJoinGate(ctx);
    
    // Referral logic
    const refId = ctx.payload;
    if (refId && refId != ctx.from.id && !db.users[ctx.from.id].referredBy) {
        db.users[ctx.from.id].referredBy = refId;
        getDB(refId).points += 2;
        bot.telegram.sendMessage(refId, "🎉 *New Referral!* You earned +2 Points.");
    }
    ctx.replyWithMarkdown(`🔰 **Welcome to ${BOT_NAME}**`, mainMenu);
});

bot.action('verify_access', async (ctx) => {
    const isJoined = await checkMembership(ctx);
    if (isJoined) {
        await ctx.answerCbQuery("✅ Access Granted!");
        await ctx.deleteMessage();
        return ctx.reply("🔰 Welcome To Main Menu", mainMenu);
    }
    await ctx.answerCbQuery("❌ You haven't joined all channels!", { show_alert: true });
});

// Register New Gmail (ከጥበቃ ጋር)
bot.hears('➕ Register New Gmail', async (ctx) => {
    if (!(await checkMembership(ctx))) return sendJoinGate(ctx);
    const user = getDB(ctx.from.id);
    if (user.points < 5) return ctx.reply(`⚠️ Need 5 pts! (Current: ${user.points})`);
    
    ctx.session = { step: 'REG_EMAIL' };
    ctx.replyWithMarkdown("🟢 **Please Send Email** 📧\n\n⚙️ *Example:* `name@gmail.com`", cancelBtn);
});

// Account View
bot.hears('⚙️ Account', async (ctx) => {
    if (!(await checkMembership(ctx))) return sendJoinGate(ctx);
    const user = getDB(ctx.from.id);
    ctx.replyWithMarkdown(
        `👤 **USER PROFILE**\n━━━━━━━━━━━━━━\n` +
        `💰 **Balance:** \`${user.points} pts\`\n` +
        `🚸 **Referrals:** \`${user.referrals}\`\n` +
        `🆔 **ID:** \`${ctx.from.id}\`\n━━━━━━━━━━━━━━`, mainMenu);
});

// Help Section
bot.hears('🏥 Help', async (ctx) => {
    if (!(await checkMembership(ctx))) return sendJoinGate(ctx);
    ctx.replyWithMarkdown("🏥 **Help Center**\n\nNeed assistance? Contact our support admin: @YourAdminUsername");
});

// --- 🛠 ADMIN PANEL ---

bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Access Denied.");
    ctx.replyWithMarkdown(`🛠 **CONTROL PANEL ACTIVATED**\nWelcome back, Boss.`, adminMenu);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.replyWithMarkdown(`📈 **Global Stats**\n\n👥 Users: ${Object.keys(db.users).length}\n📧 Gmails Created: ${db.stats.totalGmails}`);
});

bot.hears('📢 Broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'B_CAST' };
    ctx.reply("📣 **Enter Message for Broadcast:**", cancelBtn);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADD_ID' };
    ctx.reply("🆔 **Enter User ID:**", cancelBtn);
});

bot.hears('⬅️ Exit Admin', (ctx) => ctx.reply("Returning...", mainMenu));

// --- 🔄 ጽሑፍ ተቀባይ (TEXT FLOW HANDLER) ---

bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Operation Terminated.", mainMenu);
    }

    const state = ctx.session?.step;

    if (state === 'REG_EMAIL') {
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'REG_PASS';
        return ctx.reply("🔋 **Please Send Password** 🔑");
    }
    if (state === 'REG_PASS') {
        const email = ctx.session.email;
        ctx.session = null;
        const msg = await ctx.reply("🛰 *Processing...*");
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `✅ **Gmail Registered!**\n📧 \`${email}\`\n🔑 \`${ctx.message.text}\``, { parse_mode: 'Markdown' });
            getDB(ctx.from.id).points -= 5;
            db.stats.totalGmails += 1;
        }, 1500);
        return;
    }

    // Admin: Add Points logic
    if (state === 'ADD_ID') {
        ctx.session.target = ctx.message.text;
        ctx.session.step = 'ADD_AMT';
        return ctx.reply("💰 **How many points?**");
    }
    if (state === 'ADD_AMT') {
        const user = getDB(ctx.session.target);
        user.points += parseInt(ctx.message.text);
        ctx.reply(`✅ Added! New balance for ${ctx.session.target}: ${user.points}`);
        ctx.session = null;
        return;
    }

    return next();
});

bot.launch().then(() => console.log("System Updated & Online 🚀"));
