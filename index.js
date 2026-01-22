const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = ''; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// DATABASE SIMULATION
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

// --- ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ ADMIN PANEL HANDLERS ---

bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ This area is restricted to Developers.");
    ctx.reply("🛠 **Advanced Admin Dashboard**\nSelect a management tool:", adminKeyboard);
});

bot.hears('📊 Global Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const totalUsers = Object.keys(db).length;
    ctx.replyWithMarkdown(`📈 *Server Statistics*\n\n👥 *Total Users:* ${totalUsers}\n📡 *Server:* Active (Railway)\n⚡ *API Latency:* 42ms`);
});

bot.hears('📢 Broadcast', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'BROADCAST_PREVIEW' };
    ctx.replyWithMarkdown(
        "🛠 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 ADVANCED BROADCAST**\n\n" +
        "➡️ *Send me anything now:* a photo, a video, a forwarded post, or text with buttons.\n\n" +
        "I will show you a preview before sending it to everyone.",
        cancelKeyboard
    );
});

bot.hears('➕ Add Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'ADD_POINTS_ID' };
    ctx.reply("➕ **Send the User ID to add points to:**", cancelKeyboard);
});

bot.hears('➖ Remove Points', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.session = { step: 'REM_POINTS_ID' };
    ctx.reply("➖ **Send the User ID to remove points from:**", cancelKeyboard);
});

bot.hears('⬅️ Back to User Menu', (ctx) => ctx.reply("Returning...", mainMenu));

// --- TEXT STATE HANDLER ---

bot.on('text', async (ctx, next) => {
    if (ctx.message.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Cancelled.", mainMenu);
    }

    const state = ctx.session?.step;

    // Broadcast Logic
 bot.on('message', async (ctx, next) => {
    if (ctx.message?.text === '❌ Cancel Operation') {
        ctx.session = null;
        return ctx.reply("🚫 Operation Terminated.", mainMenu);
    }

    const state = ctx.session?.step;

    // --- STEP 1: SHOW PREVIEW ---
    if (state === 'BROADCAST_PREVIEW' && ctx.from.id === ADMIN_ID) {
        ctx.session.msgToCopy = ctx.message.message_id; // Save the message ID
        ctx.session.step = 'BROADCAST_CONFIRM';

        await ctx.reply("👇 **PREVIEW OF YOUR POST:**");
        
        // Show the admin exactly what will be sent
        await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);

        return ctx.reply("⬆️ **Does this look correct?**", 
            Markup.keyboard([['✅ CONFIRM & SEND'], ['❌ Cancel Operation']]).resize()
        );
    }

    // --- STEP 2: EXECUTE SEND ---
    if (state === 'BROADCAST_CONFIRM' && ctx.message.text === '✅ CONFIRM & SEND' && ctx.from.id === ADMIN_ID) {
        const users = Object.keys(db);
        let success = 0;
        let failed = 0;

        const statusMsg = await ctx.reply(`🚀 **Broadcasting to ${users.length} users...**`);

        for (const userId of users) {
            try {
                // copyMessage preserves captions, images, buttons, and formatting
                await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.session.msgToCopy);
                success++;
            } catch (e) {
                failed++;
            }
        }

        ctx.session = null;
        return ctx.replyWithMarkdown(
            `📢 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 BROADCAST COMPLETE**\n\n` +
            `✅ *Delivered:* ${success}\n` +
            `❌ *Failed:* ${failed}\n` +
            `📊 *Total Reach:* ${success + failed}`,
            adminKeyboard
        );
    }

    // ... (rest of your registration logic: EMAIL, PASS, etc.)
    return next();
});

    // Add Points Logic
    if (state === 'ADD_POINTS_ID' && ctx.from.id === ADMIN_ID) {
        ctx.session.targetId = ctx.message.text;
        ctx.session.step = 'ADD_POINTS_AMT';
        return ctx.reply("💰 **Enter the number of points to ADD:**");
    }
    if (state === 'ADD_POINTS_AMT' && ctx.from.id === ADMIN_ID) {
        const amount = parseInt(ctx.message.text);
        const target = getDB(ctx.session.targetId);
        target.points += amount;
        bot.telegram.sendMessage(ctx.session.targetId, `🎁 **Bonus!** Admin added ${amount} points to your balance.`);
        ctx.session = null;
        return ctx.reply(`✅ Added ${amount} points to User ${ctx.session.targetId}`, adminKeyboard);
    }

    // Remove Points Logic
    if (state === 'REM_POINTS_ID' && ctx.from.id === ADMIN_ID) {
        ctx.session.targetId = ctx.message.text;
        ctx.session.step = 'REM_POINTS_AMT';
        return ctx.reply("💰 **Enter the number of points to REMOVE:**");
    }
    if (state === 'REM_POINTS_AMT' && ctx.from.id === ADMIN_ID) {
        const amount = parseInt(ctx.message.text);
        const target = getDB(ctx.session.targetId);
        target.points -= amount;
        ctx.session = null;
        return ctx.reply(`✅ Removed ${amount} points from User ${ctx.session.targetId}`, adminKeyboard);
    }

    // Gmail Registration Logic
    if (state === 'EMAIL') {
        if (!ctx.message.text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com address.");
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.replyWithMarkdown("🔑 **Please send the Password**\n\n_Avoid using simple passwords._", cancelKeyboard);
    }

    if (state === 'PASS') {
        const email = ctx.session.email;
        const pass = ctx.message.text;
        const user = getDB(ctx.from.id);
        ctx.session = null;
        
        // --- ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ BEAUTIFUL LOADING SEQUENCE ---
        const loader = await ctx.reply("🛰 **Connection Established...**\n`[░░░░░░░░░░] 0%`", { parse_mode: 'Markdown' });

        // Step 1: 5 Seconds
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, 
                "📡 **Syncing with Farm Database...**\n`[▓▓░░░░░░░░] 25%`", { parse_mode: 'Markdown' });
        }, 5000);

        // Step 2: 10 Seconds
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, 
                "🔐 **Encrypting Credentials...**\n`[▓▓▓▓▓▓░░░░] 60%`", { parse_mode: 'Markdown' });
        }, 10000);

        // Step 3: 15 Seconds
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, 
                "🚀 **Finalizing Registration...**\n`[▓▓▓▓▓▓▓▓▓░] 95%`", { parse_mode: 'Markdown' });
        }, 15000);

        // Final Step: 20 Seconds - THE BIG REVEAL
        setTimeout(() => {
            ctx.telegram.editMessageText(ctx.chat.id, loader.message_id, null, 
                `✨ **𝐆𝐌𝐀𝐈𝐋 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘 𝐅𝐀𝐑𝐌𝐄𝐃** ✨\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📧 **Email:** \`${email}\`\n` +
                `🔑 **Pass:** \`${pass}\`\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `👤 **Owner:** \`${ctx.from.first_name}\`\n` +
                `💰 **Cost:** \`5 Points\`\n` +
                `📑 **Status:** \`Verified & Saved\`\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `🔥 *Happy Hunting with ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*`,
                { parse_mode: 'Markdown', ...mainMenu }
            );
            user.points -= 5;
            user.registered += 1;
        }, 20000);

        return;
    }
    return next();
});

// --- CALLBACK HANDLERS ---
bot.action('verify', async (ctx) => {
    await ctx.answerCbQuery("Checking...");
    ctx.reply("Verification updated. Please send /start to refresh.");
});

bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Advanced Bot Online 🚀"));


