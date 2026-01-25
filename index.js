const { Telegraf, Markup, session } = require('telegraf');

const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// --- DATABASE HELPER (Assumes you have your fix for persistent data here) ---
const db = {}; // Replace with your file-loading logic if using JSON
const getDB = (ctx) => {
    const id = (typeof ctx === 'object' && ctx.from) ? ctx.from.id : ctx;
    if (!db[id]) {
        db[id] = { points: 0, referrals: 0, registered: 0, name: (ctx.from?.first_name) || "User", referredBy: null };
    }
    return db[id];
};

// --- DYNAMIC KEYBOARD (Admin Only Logic) ---
const getMenu = (ctx) => {
    let buttons = [
        ['➕ Register New Gmail'],
        ['⚙️ Account', '🚸 My Referrals'],
        ['🏥 Help']
    ];
    if (ctx.from && ctx.from.id === ADMIN_ID) {
        buttons.push(['🛠 Admin Panel']);
    }
    return Markup.keyboard(buttons).resize();
};

// --- MIDDLEWARE: FORCE JOIN CHECK ---
async function checkJoin(ctx, next) {
    if (ctx.from && ctx.from.id === ADMIN_ID) return next(); 
    
    let joinedAll = true;
    for (const chan of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) {
                joinedAll = false;
                break;
            }
        } catch (e) { continue; }
    }

    if (!joinedAll) {
        return ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `⛔️ **ACCESS DENIED**\n\nYou must join our official channels to use this bot.`,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url("Join Channel", "https://t.me/Hayre37")], // Add more buttons as needed
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
        } catch (e) { continue; }
    }

    if (joinedAll) {
        try { await ctx.deleteMessage(); } catch (e) {}
        const user = getDB(ctx);
        await ctx.answerCbQuery("Success! ✅");
        await ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `👋 *Welcome Back!*\n\n👤 **User:** ${user.name}\n💰 **Points:** \`${user.points}\``,
                parse_mode: 'Markdown',
                ...getMenu(ctx)
            }
        );
    } else {
        await ctx.answerCbQuery("❌ Please join all channels first!", { show_alert: true });
    }
});

// --- COMMANDS ---

bot.start(checkJoin, async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.payload;

    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(refId); 
        if (referrer) {
            referrer.points += 1; 
            referrer.referrals += 1;
            bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user earned +1 Point.`).catch(()=>{});
        }
    }

    await ctx.replyWithPhoto(
        { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' }, 
        {
            caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Balance:** \`${user.points} Points\``,
            parse_mode: 'Markdown',
            ...getMenu(ctx)
        }
    );
});

bot.hears('⚙️ Account', checkJoin, async (ctx) => {
    const user = getDB(ctx);
    await ctx.replyWithMarkdown(`👤 **Account Info**\n\n💰 **Balance:** \`${user.points} Points\`\n👥 **Referrals:** \`${user.referrals}\``, getMenu(ctx));
});

bot.hears('🏥 Help', checkJoin, async (ctx) => {
    await ctx.replyWithMarkdown(`🏥 **Support Center**\n\nNeed help? Contact admin or join the support group.`, getMenu(ctx));
});

bot.hears('⬅️ Back to User Menu', async (ctx) => {
    await ctx.reply("🔄 Returning to main menu...", getMenu(ctx));
});

bot.hears('❌ Cancel Operation', async (ctx) => {
    await ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
});

bot.hears('🛠 Admin Panel', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await ctx.reply("👑 **Admin Command Center**", Markup.keyboard([['📊 Stats', '📢 Broadcast'], ['⬅️ Back to User Menu']]).resize());
});

bot.launch().then(() => console.log("Bot Fix Applied - Online 🚀"));
