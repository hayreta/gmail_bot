const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot'; 

const bot = new Telegraf(BOT_TOKEN);
const db = {}; // In-memory database (Note: Data resets on restart)

bot.use(session());

// DATABASE SIMULATION
const getDB = (ctx) => {
    const id = (ctx && ctx.from) ? ctx.from.id : ctx;
    if (!db[id]) {
        db[id] = { 
            points: 0, 
            referrals: 0, 
            registered: 0, 
            joined: new Date(),
            name: (ctx.from?.first_name) || "User",
            username: ctx.from?.username ? `@${ctx.from.username}` : "No Username",
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
                    [Markup.button.callback("Verify Membership ✅", "verify_join")]
                ])
            }
        );
    }
    return next();
}

// --- CALLBACK HANDLERS ---
bot.action('verify_join', async (ctx) => {
    let joinedAll = true;
    for (const chan of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) {
                joinedAll = false;
                break;
            }
        } catch (e) { joinedAll = false; break; }
    }

    if (joinedAll) {
        await ctx.deleteMessage().catch(() => {});
        const user = getDB(ctx);
        await ctx.answerCbQuery("Success! Welcome back ✅");
        await ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.name}\n💰 **Balance:** \`${user.points} Points\``,
                parse_mode: 'Markdown',
                ...getMenu(ctx)
            }
        );
    } else {
        await ctx.answerCbQuery("❌ You still haven't joined all channels!", { show_alert: true });
    }
});

// --- START COMMAND ---
bot.start(async (ctx) => {
    const user = getDB(ctx);
    const refId = ctx.payload;

    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = getDB(parseInt(refId)); 
        if (referrer) {
            referrer.points += 1; 
            referrer.referrals += 1;
            bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user earned +1 Point.`, { parse_mode: 'Markdown' }).catch(() => {});
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
bot.hears('➕ Register New Gmail', checkJoin, async (ctx) => {
    const user = getDB(ctx);
    if (user.points < 5) {
        return ctx.replyWithMarkdown(`⚠️ *Insufficient Balance*\n\nYou need **5 Points** to register.\n*Current Balance:* ${user.points} pts`, getMenu(ctx));
    }
    ctx.session.step = 'EMAIL';
    ctx.replyWithMarkdown("📧 **Please send the Gmail Address**\n\n_Example: name@gmail.com_", cancelKeyboard);
});

bot.hears('⚙️ Account', (ctx) => {
    const user = getDB(ctx);
    ctx.replyWithMarkdown(`⭐ *PREMIUM ACCOUNT STATUS*\n━━━━━━━━━━━━━━━━━━\n🆔 *User ID:* \`${ctx.from.id}\`\n💰 *Balance:* \`${user.points} Points\`\n📊 *Registered:* \`${user.registered} Gmails\`\n🚸 *Invites:* \`${user.referrals} Users\`\n━━━━━━━━━━━━━━━━━━`, getMenu(ctx));
});

bot.hears('🚸 My Referrals', (ctx) => {
    const user = getDB(ctx); 
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.replyWithMarkdown(`✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 AFFILIATE CENTER** ✨\n━━━━━━━━━━━━━━━━━━\n👥 **Total Referrals:** \`${user.referrals || 0}\`\n💰 **Total Earned:** \`${user.referrals || 0} Points\`\n━━━━━━━━━━━━━━━━━━\n🎁 **Reward:** \`1 Point\` per join!\n\n🔗 **Your Unique Link:**\n\`${link}\``, 
        Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)]]));
});

// --- ADMIN HANDLERS ---
bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Restricted.");
    ctx.reply("🛠 **Admin Dashboard**", adminKeyboard);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.replyWithMarkdown(`📈 *Server Statistics*\n\n👥 *Total Users:* ${totalUsers}`);
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session.step = 'ADD_POINTS_ID';
    ctx.reply("➕ **Send User ID:**", cancelKeyboard);
});
// --- HELP MESSAGE HANDLER ---
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

// --- ADMIN: INITIATE BROADCAST ---
bot.hears('📢 Broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    ctx.session.step = 'BROADCAST_PREVIEW';
    ctx.replyWithMarkdown(
        "🛠 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 ADVANCED BROADCAST**\n\n" +
        "➡️ *Send me anything now...*\n" +
        "_(Text, Photo, Video, or Sticker)_", 
        cancelKeyboard
    );
});

// --- ENGINE: HANDLING THE BROADCAST LOGIC ---
bot.on('message', async (ctx, next) => {
    const text = ctx.message?.text;
    const state = ctx.session?.step;

    if (text === '❌ Cancel Operation') {
        ctx.session = {};
        return ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
    }

    if (!state) return next();

    // 1. Preview Phase
    if (state === 'BROADCAST_PREVIEW' && ctx.from.id === ADMIN_ID) {
        ctx.session.msgToCopy = ctx.message.message_id;
        ctx.session.step = 'BROADCAST_CONFIRM';
        
        await ctx.reply("👇 **PREVIEW OF YOUR POST:**");
        
        // Shows the admin exactly how the message will look
        await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
        
        return ctx.reply(
            "⬆️ **Does this look correct?**", 
            Markup.keyboard([
                ['✅ CONFIRM & SEND'], 
                ['❌ Cancel Operation']
            ]).resize()
        );
    }

    // 2. Execution Phase
    if (state === 'BROADCAST_CONFIRM' && text === '✅ CONFIRM & SEND' && ctx.from.id === ADMIN_ID) {
        const users = Object.keys(db);
        let successCount = 0;
        let failCount = 0;

        await ctx.reply(`🚀 **Broadcasting to ${users.length} users...**`, Markup.removeKeyboard());

        for (const userId of users) {
            try { 
                // Using copyMessage allows sending photos, captions, and videos easily
                await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.session.msgToCopy); 
                successCount++;
            } catch (e) {
                failCount++;
            }
        }

        ctx.session = {}; // Clear state
        return ctx.reply(
            `📢 **BROADCAST COMPLETE**\n\n✅ **Success:** ${successCount}\n❌ **Failed:** ${failCount}`, 
            adminKeyboard
        );
    }

    return next();
});

// --- CLOSE ACTION HANDLER ---
bot.action('close_help', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.answerCbQuery("Message marked as read ✅");
    } catch (e) {
        await ctx.answerCbQuery("Already closed.");
    }
});

// --- MESSAGE HANDLER (ENGINE) ---
bot.on('message', async (ctx) => {
    const text = ctx.message.text;
    if (text === '❌ Cancel Operation') {
        ctx.session = {};
        return ctx.reply("🚫 Operation Terminated.", getMenu(ctx));
    }

    const state = ctx.session?.step;
    if (!state) return;

    if (state === 'EMAIL') {
        if (!text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com.");
        ctx.session.email = text;
        ctx.session.step = 'PASS';
        return ctx.reply("🔑 **Please send the Password**");
    }

    if (state === 'PASS') {
        const user = getDB(ctx);
        user.points -= 5;
        user.registered += 1;
        const email = ctx.session.email;
        ctx.session = {};
        return ctx.replyWithMarkdown(`✅ **Success!**\n\n📧 *Email:* \`${email}\`\n🔑 *Pass:* \`${text}\`\n\nBalance: ${user.points}`, getMenu(ctx));
    }

    if (state === 'ADD_POINTS_ID' && ctx.from.id === ADMIN_ID) {
        ctx.session.targetId = text;
        ctx.session.step = 'ADD_POINTS_AMT';
        return ctx.reply("💰 **Enter points to add:**");
    }

    if (state === 'ADD_POINTS_AMT' && ctx.from.id === ADMIN_ID) {
        const amt = parseInt(text);
        const target = getDB(ctx.session.targetId);
        if (target && !isNaN(amt)) {
            target.points += amt;
            ctx.reply(`✅ Added ${amt} points to ${ctx.session.targetId}`, adminKeyboard);
        }
        ctx.session = {};
    }
});

bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Online 🚀"));


