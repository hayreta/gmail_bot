const { Telegraf, Markup, session } = require('telegraf');

// --- CONFIGURATION ---
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_NAME = "createUnlimitedGmail Bot";
const BOT_USERNAME = "createUnlimitedGmail_Bot"; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- ADVANCED DATABASE (In-Memory) ---
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
            lastBonus: null,
            username: ctx ? ctx.from.username : "User"
        };
    }
    return db.users[id];
};

const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

// --- PREMIUM KEYBOARDS ---
const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account', '🚸 My Referrals'],
    ['🎁 Daily Bonus', '🏥 Help'],
    ['🛠 Admin Panel']
]).resize();

const adminMenu = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '⬅️ Exit Admin']
]).resize();

const cancelBtn = Markup.keyboard([['❌ Cancel Operation']]).resize();

// --- 🛡️ THE SUPREME GUARD (FORCE JOIN) ---
async function forceJoin(ctx, next) {
    if (ctx.from.id === ADMIN_ID) return next();
    
    let needsToJoin = [];
    for (const channel of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) needsToJoin.push(channel);
        } catch (e) { continue; }
    }

    if (needsToJoin.length > 0) {
        return ctx.replyWithPhoto(
            { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' },
            {
                caption: `⛔️ **ACCESS LOCKED**\n\nYou must be a member of all our channels to use ${BOT_NAME}.\n\n📌 **Missing:** ${needsToJoin.join(', ')}`,
                ...Markup.inlineKeyboard([
                    [Markup.button.url("Join Channel 1", "https://t.me/Hayre37"), Markup.button.url("Join Channel 2", "https://t.me/Digital_Claim")],
                    [Markup.button.callback("Verify Access ✅", "check_again")]
                ])
            }
        );
    }
    return next();
}

// --- CORE FEATURES ---

bot.start(async (ctx) => {
    const user = getDB(ctx.from.id, ctx);
    const refId = ctx.payload;
    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId);
        referrer.points += 2;
        referrer.referrals += 1;
        bot.telegram.sendMessage(refId, `🎉 **Referral Success!**\nSomeone joined via your link! You earned +2 Points.`, { parse_mode: 'Markdown' });
    }
    ctx.replyWithMarkdown(`🔰 **Welcome to ${BOT_NAME}**\n\nFastest Gmail registration system.`, mainMenu);
});

// 🎁 DAILY BONUS SYSTEM
bot.hears('🎁 Daily Bonus', forceJoin, (ctx) => {
    const user = getDB(ctx.from.id);
    const now = new Date().getTime();
    const cooldown = 24 * 60 * 60 * 1000; // 24 Hours

    if (user.lastBonus && (now - user.lastBonus < cooldown)) {
        const remaining = cooldown - (now - user.lastBonus);
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        return ctx.reply(`❌ **Bonus already claimed!**\nCome back in ${hours} hours.`);
    }

    user.points += 1;
    user.lastBonus = now;
    ctx.replyWithMarkdown(`🎁 **Daily Bonus Claimed!**\nYou received **+1 Point**. Check back tomorrow!`);
});

// ⚙️ ACCOUNT VIEW
bot.hears('⚙️ Account', forceJoin, (ctx) => {
    const user = getDB(ctx.from.id);
    ctx.replyWithMarkdown(
        `👤 **USER DASHBOARD**\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 **Balance:** \`${user.points} pts\`\n` +
        `🚸 **Referrals:** \`${user.referrals}\`\n` +
        `📧 **Gmails Created:** \`${user.registered}\`\n` +
        `🆔 **Your ID:** \`${ctx.from.id}\`\n` +
        `━━━━━━━━━━━━━━━━━━`, mainMenu
    );
});

// 🛠 ADMIN PANEL LOGIC
bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Forbidden.");
    ctx.replyWithMarkdown(`🛠 **CONTROL PANEL ACTIVATED**\nWelcome back, Boss.`, adminMenu);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db.users).length;
    ctx.replyWithMarkdown(`📈 **Global Stats**\n\n👥 Total Users: ${totalUsers}\n📧 Total Gmails: ${db.stats.totalGmails}`);
});

bot.hears('📢 Broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'B_CAST' };
    ctx.reply("📣 **Enter message for Broadcast:**", cancelBtn);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADD_ID' };
    ctx.reply("🆔 **Enter User ID:**", cancelBtn);
});

// --- TEXT FLOW HANDLER (Advanced State Machine) ---
bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Operation Terminated.", mainMenu);
    }

    const state = ctx.session?.step;

    // Register Gmail Logic
    if (state === 'REG_EMAIL') {
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'REG_PASS';
        return ctx.reply("🔑 **Send Password:**", cancelBtn);
    }
    if (state === 'REG_PASS') {
        const email = ctx.session.email;
        ctx.session = null;
        const loader = await ctx.reply("🚀 *Registering account...*");
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, `✅ **Gmail Registered!**\n📧 \`${email}\`\n🔑 \`${ctx.message.text}\``, { parse_mode: 'Markdown' });
            getDB(ctx.from.id).points -= 5;
            getDB(ctx.from.id).registered += 1;
            db.stats.totalGmails += 1;
        }, 2000);
        return;
    }

    // Admin Broadcast
    if (state === 'B_CAST' && ctx.from.id === ADMIN_ID) {
        const users = Object.keys(db.users);
        ctx.reply(`📢 Sending to ${users.length} users...`);
        users.forEach(id => {
            bot.telegram.sendMessage(id, `📢 **ANNOUNCEMENT**\n\n${ctx.message.text}`).catch(e => {});
        });
        ctx.session = null;
        return ctx.reply("✅ Broadcast sent.", adminMenu);
    }

    // Admin Add Points
    if (state === 'ADD_ID' && ctx.from.id === ADMIN_ID) {
        ctx.session.target = ctx.message.text;
        ctx.session.step = 'ADD_AMT';
        return ctx.reply("💰 **How many points?**");
    }
    if (state === 'ADD_AMT' && ctx.from.id === ADMIN_ID) {
        const user = getDB(ctx.session.target);
        user.points += parseInt(ctx.message.text);
        ctx.reply(`✅ Added! New balance for ${ctx.session.target}: ${user.points}`);
        ctx.session = null;
        return;
    }

    return next();
});

bot.hears('➕ Register New Gmail', forceJoin, (ctx) => {
    if (getDB(ctx.from.id).points < 5) return ctx.reply("❌ You need 5 points!");
    ctx.session = { step: 'REG_EMAIL' };
    ctx.reply("🟢 **Send Gmail Email:**", cancelBtn);
});

bot.action('check_again', forceJoin, (ctx) => {
    ctx.answerCbQuery("✅ Verified!");
    ctx.reply("🔰 Welcome To Main Menu", mainMenu);
});

bot.launch().then(() => console.log("System Fully Operational 🚀"));
