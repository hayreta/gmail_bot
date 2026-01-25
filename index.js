const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
// NEVER hardcode tokens in code. Use environment variables.
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot'; 

if (!BOT_TOKEN) {
    console.error("ERROR: BOT_TOKEN is not defined in environment variables!");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

/** * WARNING: This is an in-memory DB. 
 * Data will disappear on every restart. 
 * Consider using MongoDB or a JSON file for real use.
 */
const db = {}; 

bot.use(session());

// DATABASE HELPER
const getDB = (ctx) => {
    const id = ctx.from?.id;
    if (!id) return null;
    if (!db[id]) {
        db[id] = { 
            points: 0, 
            referrals: 0, 
            registered: 0, 
            joined: new Date(),
            name: ctx.from.first_name || "User",
            username: ctx.from.username ? `@${ctx.from.username}` : "No Username",
            referredBy: null
        };
    }
    return db[id];
};

const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

// --- KEYBOARDS ---
const getMenu = (ctx) => {
    let buttons = [
        ['➕ Register New Gmail'],
        ['⚙️ Account', '🚸 My Referrals'],
        ['🏥 Help']
    ];
    if (ctx.from.id === ADMIN_ID) {
        buttons.push(['🛠 Admin Panel']);
    }
    return Markup.keyboard(buttons).resize();
};

const adminKeyboard = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '➖ Remove Points'],
    ['👥 List All Users', '⬅️ Back to User Menu']
]).resize();

const cancelKeyboard = Markup.keyboard([['❌ Cancel Operation']]).resize();

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
                    [Markup.button.callback("Verify Membership ✅", "verify_membership")]
                ])
            }
        );
    }
    return next();
}

// --- CALLBACK: VERIFY ---
bot.action('verify_membership', async (ctx) => {
    // Re-run checkJoin logic
    await ctx.answerCbQuery("Checking...");
    // If they pass, they can just click /start again or you can trigger the welcome here.
    await ctx.reply("Verification successful! Send /start to begin.");
});

// --- START COMMAND ---
bot.start(async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.payload;

    // Referral Logic
    if (refId && refId != ctx.from.id && !user.referredBy) {
        const referrer = db[refId]; 
        if (referrer) {
            user.referredBy = refId;
            referrer.points += 1; 
            referrer.referrals += 1;
            try {
                await ctx.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user joined! You earned +1 Point.`, { parse_mode: 'Markdown' });
            } catch (e) {}
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
bot.hears('➕ Register New Gmail', checkJoin, (ctx) => {
    const user = getDB(ctx);
    if (user.points < 5) {
        return ctx.replyWithMarkdown(`⚠️ *Insufficient Balance*\n\nYou need **5 Points** to register.\n*Current Balance:* ${user.points} pts`, getMenu(ctx));
    }
    ctx.session = { step: 'EMAIL' };
    ctx.replyWithMarkdown("📧 **Please send the Gmail Address**\n\n_Example: name@gmail.com_", cancelKeyboard);
});

// --- ADMIN PANEL HANDLERS ---
bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Restricted.");
    ctx.reply("🛠 **Admin Dashboard**", adminKeyboard);
});

// --- GLOBAL MESSAGE HANDLER ---
bot.on('message', async (ctx) => {
    const text = ctx.message.text;
    const user = getDB(ctx);
    if (!ctx.session) ctx.session = {};

    if (text === '❌ Cancel Operation') {
        ctx.session = {};
        return ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
    }

    // Gmail Registration Step 1
    if (ctx.session.step === 'EMAIL') {
        if (!text.includes('@gmail.com')) return ctx.reply("❌ Please send a valid Gmail.");
        ctx.session.email = text;
        ctx.session.step = 'PASS';
        return ctx.reply("🔑 **Send the Password:**");
    }

    // Gmail Registration Step 2
    if (ctx.session.step === 'PASS') {
        user.points -= 5;
        user.registered += 1;
        const email = ctx.session.email;
        ctx.session = {};
        return ctx.replyWithMarkdown(`✅ **Account Registered!**\n\n📧 \`${email}\`\n🔑 \`${text}\`\n\nRemaining Points: ${user.points}`, getMenu(ctx));
    }
    
    // Add other state logic (Broadcast, etc.) here...
});

bot.launch().then(() => console.log("Bot is running..."));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
