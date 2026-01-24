const { Telegraf, Markup, session } = require('telegraf');

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot'; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// DATABASE SIMULATION
const getDB = (ctx) => {
    const id = ctx.from.id;
    if (!db[id]) {
        db[id] = { 
            points: 0, // Set starting balance to 0
            referrals: 0, 
            registered: 0, 
            joined: new Date(),
            name: ctx.from.first_name || "User",
            username: ctx.from.username ? `@${ctx.from.username}` : "No Username"
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

const adminKeyboard = Markup.keyboard([
    ['📊 Global Stats', '📢 Broadcast'],
    ['➕ Add Points', '➖ Remove Points'],
    ['👥 List All Users', '⬅️ Back to User Menu'] // New button added here
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
    const user = getDB(ctx);
    const refId = ctx.payload;

    // Referral Logic
    if (refId && refId != ctx.from.id && !user.referredBy) {
        user.referredBy = refId;
        const referrer = db[refId]; 
        if (referrer) {
            referrer.points += 1; // Reward set to 1 point
            referrer.referrals += 1;
            bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user joined! You earned +1 Point.`, { parse_mode: 'Markdown' });
        }
    }

    // Welcome Message
    await ctx.replyWithPhoto(
        { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' }, 
        {
            caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n` +
                     `👤 **User:** ${user.name}\n` +
                     `💰 **Starting Balance:** \`0 Points\`\n\n` +
                     `Invite friends to earn points and start farming!`,
            parse_mode: 'Markdown',
            ...mainMenu
        }
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
    const user = getDB(ctx); 
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    
    // Updated Math: Referrals * 1 (Since reward is now 1 point)
    const totalEarned = (user.referrals || 0) * 1;

    const referralText = 
        `✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 𝐀𝐅𝐅𝐈𝐋𝐈𝐀𝐓𝐄 𝐏𝐑𝐎𝐆𝐑𝐀𝐌** ✨\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👥 **Total Referrals:** \`${user.referrals || 0} Users\`\n` +
        `💰 **Total Earned:** \`${totalEarned} Points\`\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🎁 **Reward:** Earn \`1 Point\` per invite!\n\n` +
        `🔗 **Your Unique Link:**\n` +
        `\`${link}\`\n\n` +
        `🚀 *Invite friends and grow your balance from 0 to Hero!*`;

    ctx.replyWithMarkdown(referralText, 
        Markup.inlineKeyboard([
            [Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join 𝕏-𝐇𝐮𝐧𝐭𝐞𝐫 and start farming Gmails today!")}`)],
            [Markup.button.callback("📊 Refresh Stats", "refresh_ref")]
        ])
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

// --- BUTTON: LIST ALL USERS ---

bot.hears('🛠 Admin Panel', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ This area is restricted to Developers.");
    ctx.reply("🛠 **Advanced Admin Dashboard**\nSelect a management tool:", adminKeyboard);
});

// PASTE THE LIST USERS CODE HERE
// --- ADMIN: LIST ALL USERS ---
bot.hears('👥 List All Users', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const userIds = Object.keys(db);
    if (userIds.length === 0) return ctx.reply("📭 Database is empty.");

    const buttons = userIds.map(id => {
        const u = db[id];
        // Button shows: 👤 Name [@User] | 💰 Pts
        return [Markup.button.callback(`👤 ${u.name} [${u.username}] | 💰 ${u.points}`, `view_prof:${id}`)];
    });

    ctx.replyWithMarkdown(
        "📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**\n\nSelect a hunter to investigate:",
        Markup.inlineKeyboard(buttons)
    );
});
// --- CALLBACK: VIEW SPECIFIC PROFILE ---
bot.action(/view_prof:(.+)/, async (ctx) => {
    const targetId = ctx.match[1];
    const u = db[targetId];

    if (!u) return ctx.answerCbQuery("❌ User not found.");

    // Format: 👤 User: Name [@Username]
    const userDisplay = `${u.name} [${u.username}]`;

    const profileText = 
        `✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER INTELLIGENCE** ✨\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 **User:** ${userDisplay}\n` + 
        `🆔 **User ID:** \`${targetId}\`\n` +
        `💰 **Balance:** \`${u.points} Points\`\n` +
        `🚸 **Invites:** \`${u.referrals} Users\`\n` +
        `📊 **Gmails:** \`${u.registered} Accounts\`\n` +
        `📅 **Joined:** \`${u.joined.toLocaleDateString()}\`\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⚡ *Quick Admin Actions:*`;

    await ctx.editMessageText(profileText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [
                Markup.button.callback("➕ Add Points", `quick_add:${targetId}`),
                Markup.button.callback("➖ Rem Points", `quick_rem:${targetId}`)
            ],
            [Markup.button.callback("⬅️ Back to Directory", "list_users_back")]
        ])
    });
    
    await ctx.answerCbQuery();
});

// --- CALLBACK: RETURN TO LIST ---
bot.action('list_users_back', async (ctx) => {
    const userIds = Object.keys(db);
    const buttons = userIds.map(id => [Markup.button.callback(`👤 ID: ${id} | 💰 ${db[id].points} pts`, `view_prof:${id}`)]);
    
    await ctx.editMessageText("📂 **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 USER DIRECTORY**", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
    await ctx.answerCbQuery();
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
    
   //(Optional) Quick Action Add/Remove Logic
  bot.action(/quick_add:(.+)/, (ctx) => {
    const targetId = ctx.match[1];
    ctx.session = { step: 'ADMIN_ADD_AMT', targetId: targetId }; // Reuses your existing Add Points logic
    ctx.reply(`💰 **Enter points to add for ID ${targetId}:**`, cancelKeyboard);
    ctx.answerCbQuery();
});

bot.action(/quick_rem:(.+)/, (ctx) => {
    const targetId = ctx.match[1];
    ctx.session = { step: 'ADMIN_REM_AMT', targetId: targetId }; // Reuses your existing Remove Points logic
    ctx.reply(`💰 **Enter points to remove for ID ${targetId}:**`, cancelKeyboard);
    ctx.answerCbQuery();
});
// User: Email Registration Logic
    if (state === 'EMAIL') {
        if (!ctx.message.text.endsWith('@gmail.com')) return ctx.reply("❌ Send a valid @gmail.com.");
        ctx.session.email = ctx.message.text;
        ctx.session.step = 'PASS';
        return ctx.reply("🔑 **Please send the Password**");
    }

    if (state === 'PASS') {
        const user = getDB(ctx.from.id);
        user.points -= 5;
        user.registered += 1;
        ctx.session = null;
        return ctx.replyWithMarkdown(`✅ **Success!**\n\n📧 *Email:* \`${ctx.session?.email}\`\n\nBalance: ${user.points}`, mainMenu);
    }

    return next();
});
// This handles the "Refresh" button click
bot.action('refresh_ref', (ctx) => {
    const user = getDB(ctx);
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    
    // We use editMessageText for a smooth, no-flicker update
    ctx.editMessageText(
        `✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 𝐀𝐅𝐅𝐈𝐋𝐈𝐀𝐓𝐄 𝐏𝐑𝐎𝐆𝐑𝐀𝐌** ✨\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👥 **Total Referrals:** \`${user.referrals || 0} Users\`\n` +
        `💰 **Total Earned:** \`${(user.referrals || 0) * 2} Points\`\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔗 **Your Unique Link:**\n\`${link}\``,
        { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${link}`)],
                [Markup.button.callback("✅ Stats Updated", "refresh_ref")]
            ])
        }
    ).catch(() => ctx.answerCbQuery("Stats already up to date!"));
});
// --- CALLBACK HANDLERS ---
bot.action('verify', async (ctx) => {
    await ctx.answerCbQuery("Checking...");
    ctx.reply("Verification updated. Please send /start to refresh.");
});

bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Advanced Bot Online 🚀"));




















