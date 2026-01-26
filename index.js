const { Telegraf, Markup, session } = require('telegraf');
const db = require('./db');

// CONFIGURATION
const BOT_TOKEN = process.env.BOT_TOKEN || '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const BOT_USERNAME = 'createUnlimitedGmail_Bot'; 

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

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
        } catch (e) { 
            joinedAll = false;
            break;
        }
    }

    if (joinedAll) {
        try {
            await ctx.deleteMessage(); 
        } catch (e) {}
        
        // Get or create user in Supabase
        const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
        await ctx.answerCbQuery("Success! Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ ✅");
        
        await ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' },
            {
                caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.first_name}\n💰 **Starting Balance:** \`0 Points\`\n\nInvite friends to earn points!`,
                parse_mode: 'Markdown',
                ...getMenu(ctx)
            }
        );
    } else {
        await ctx.answerCbQuery("❌ You still haven't joined all channels!", { show_alert: true });
    }
});

// --- START COMMAND ---
bot.start(checkJoin, async (ctx) => {
    try {
        const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
        const refId = ctx.payload;

        // Referral Logic
        if (refId && refId != ctx.from.id) {
            const referred = await db.getUserReferral(ctx.from.id);
            if (!referred) {
                await db.addReferral(parseInt(refId), ctx.from.id);
                try {
                    await bot.telegram.sendMessage(refId, `🔔 *Referral Alert!*\nNew user earned +1 Point.`, { parse_mode: 'Markdown' });
                } catch (e) {}
            }
        }

        await ctx.replyWithPhoto(
            { url: 'https://hayre32.wordpress.com/wp-content/uploads/2026/01/image_2026-01-24_114307874.png' }, 
            {
                caption: `👋 *Welcome to ❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞*\n\n👤 **User:** ${user.first_name}\n💰 **Starting Balance:** \`${user.points} Points\`\n\nInvite friends to earn points!`,
                parse_mode: 'Markdown',
                ...getMenu(ctx)
            }
        );
    } catch (error) {
        console.error('Error in start command:', error);
        ctx.reply('❌ An error occurred. Please try again later.');
    }
});

// --- MAIN MENU HANDLERS ---
bot.hears('➕ Register New Gmail', checkJoin, async (ctx) => {
    try {
        const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
        if (user.points < 5) {
            const needed = 5 - user.points;
            return ctx.replyWithMarkdown(
                `❌ *Insufficient Balance*\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `💰 *Current Balance:* \`${user.points} Points\`\n` +
                `📍 *Points Needed:* \`${needed} Points\`\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `✨ **Ways to Earn Points:**\n` +
                `🔗 Refer Friends → +1 Point per user\n` +
                `🎁 Daily Bonus → +1 Point daily\n` +
                `👑 Premium Tasks → +2-5 Points`,
                Markup.inlineKeyboard([
                    [Markup.button.callback("🚸 Invite Friends", "show_referral_link")],
                    [Markup.button.callback("🔙 Back", "main_menu")]
                ])
            );
        }
        ctx.session.step = 'EMAIL';
        const preview = `
🌟 *Gmail Registration Portal* 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 *Cost:* 5 Points
📊 *Your Balance:* ${user.points} Points
📈 *Registered:* ${user.registered} Gmails
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 **Step 1️⃣ : Send Gmail Address**

Please enter your Gmail address:
_Example: yourname@gmail.com_

⚠️ Ensure the email is valid!
    `;
        ctx.replyWithMarkdown(preview, cancelKeyboard);
    } catch (error) {
        console.error('Error in register gmail:', error);
        ctx.reply('❌ An error occurred. Please try again later.');
    }
});

bot.hears('⚙️ Account', async (ctx) => {
    try {
        const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
        ctx.replyWithMarkdown(`⭐ *PREMIUM ACCOUNT STATUS*\n━━━━━━━━━━━━━━━━━━\n🆔 *User ID:* \`${ctx.from.id}\`\n💰 *Balance:* \`${user.points} Points\`\n📊 *Registered:* \`${user.registered} Gmails\`\n🚸 *Invites:* \`${user.referrals} Users\`\n━━━━━━━━━━━━━━━━━━`, getMenu(ctx));
    } catch (error) {
        console.error('Error in account:', error);
        ctx.reply('❌ An error occurred. Please try again later.');
    }
});

bot.hears('🚸 My Referrals', async (ctx) => {
    try {
        const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
        const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
        const totalEarned = (user.referrals || 0) * 1;
        ctx.replyWithMarkdown(`✨ **𝕏-𝐇𝐔𝐍𝐓𝐄𝐑 AFFILIATE CENTER** ✨\n━━━━━━━━━━━━━━━━━━\n👤 **User:** ${user.first_name}\n👥 **Total Referrals:** \`${user.referrals || 0}\`\n💰 **Total Earned:** \`${totalEarned} Points\`\n━━━━━━━━━━━━━━━━━━\n🎁 **Reward:** \`1 Point\` per join!\n\n🔗 **Your Unique Link:**\n\`${link}\``, 
            Markup.inlineKeyboard([[Markup.button.url("📤 Share Invite Link", `https://t.me/share/url?url=${encodeURIComponent(link)}`)],[Markup.button.callback("📊 Refresh Stats", "refresh_ref")]]) );
    } catch (error) {
        console.error('Error in referrals:', error);
        ctx.reply('❌ An error occurred. Please try again later.');
    }
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

// --- DELETE ACTION ---
bot.action('close_help', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.answerCbQuery("Message marked as read ✅");
    } catch (e) {
        ctx.answerCbQuery("Already deleted.");
    }
});

// ═══════════════════════════════════════════════════════════════════
// 🛠️  ADVANCED ADMIN PANEL - NODE.JS TELEGRAM BOT WITH SUPABASE
// ═══════════════════════════════════════════════════════════════════

class AdvancedAdminPanel {
    constructor(bot, db, adminId) {
        this.bot = bot;
        this.db = db;
        this.adminId = adminId;
        this.adminLog = [];
        this.rateLimits = new Map();
        this.setupHandlers();
    }

    isAdmin(ctx) {
        return ctx.from.id === this.adminId;
    }

    checkRateLimit(userId, action, limit = 3, windowMs = 60000) {
        const key = `${userId}:${action}`;
        const now = Date.now();
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, []);
        }

        const timestamps = this.rateLimits.get(key).filter(t => now - t < windowMs);
        
        if (timestamps.length >= limit) {
            return false;
        }

        timestamps.push(now);
        this.rateLimits.set(key, timestamps);
        return true;
    }

    logAdminAction(action, details) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, action, details };
        this.adminLog.push(logEntry);
        
        if (this.adminLog.length > 100) {
            this.adminLog.shift();
        }

        console.log(`[ADMIN] ${action}:`, details);
        // Also log to Supabase
        this.db.logAdminAction(this.adminId, action, JSON.stringify(details));
    }

    async getDetailedStats() {
        try {
            const users = await this.db.getAllUsers();
            
            return {
                totalUsers: users.length,
                totalPoints: users.reduce((sum, u) => sum + u.points, 0),
                averagePoints: users.length ? (users.reduce((sum, u) => sum + u.points, 0) / users.length).toFixed(2) : 0,
                topUsers: users.sort((a, b) => b.points - a.points).slice(0, 5),
                bottomUsers: users.sort((a, b) => a.points - b.points).slice(0, 5),
                registeredCount: users.length,
                timestamp: new Date().toLocaleString(),
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { error: 'Failed to fetch stats' };
        }
    }

    formatStatsMessage(stats) {
        if (stats.error) return `❌ ${stats.error}`;
        
        return `
╔══════════════════════════════════════════╗
║     📊 ADVANCED SERVER STATISTICS 📊     ║
╚══════════════════════════════════════════╝

👥 **Total Users:** ${stats.totalUsers}
🎯 **Total Points Distributed:** ${stats.totalPoints.toLocaleString()}
📈 **Average Points/User:** ${stats.averagePoints}
⏰ **Updated:** ${stats.timestamp}

┌─ 🏆 TOP 5 USERS ─────────────────────────┐
${stats.topUsers.map((u, i) => `${i + 1}. ${u.first_name} (@${u.username}) • ${u.points} pts`).join('\n')}
└──────────────────────────────────────────┘

┌─ ⬇️  BOTTOM 5 USERS ──────────────────────┐
${stats.bottomUsers.map((u, i) => `${i + 1}. ${u.first_name} (@${u.username}) • ${u.points} pts`).join('\n')}
└──────────────────────────────────────────┘

🔐 **Server Status:** ✅ OPERATIONAL
📡 **Uptime:** ${(process.uptime() / 3600).toFixed(1)}h
        `;
    }

    async searchUsers(query, limit = 20) {
        try {
            const users = await this.db.getAllUsers();
            const lowerQuery = query.toLowerCase();

            return users
                .filter(user => 
                    user.telegram_id.toString().includes(query) ||
                    user.first_name?.toLowerCase().includes(lowerQuery) ||
                    user.username?.toLowerCase().includes(lowerQuery)
                )
                .slice(0, limit);
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    async broadcastMessage(ctx, messageId, targetIds = null) {
        if (!this.checkRateLimit(ctx.from.id, 'broadcast')) {
            return ctx.reply('⏱️ **Rate Limit:** Too many broadcasts. Please wait before trying again.');
        }

        let targets = targetIds;
        if (!targets) {
            const users = await this.db.getAllUsers();
            targets = users.map(u => u.telegram_id);
        }

        let sent = 0, failed = 0;

        await ctx.reply(`📡 **Broadcasting to ${targets.length} users...**\n\n⏳ Processing...`);

        for (const userId of targets) {
            try {
                await ctx.telegram.copyMessage(userId, ctx.chat.id, messageId);
                sent++;
            } catch (e) {
                failed++;
                console.error(`Failed to send to ${userId}:`, e.message);
            }
        }

        this.logAdminAction('BROADCAST', { sent, failed, total: targets.length });

        return ctx.reply(
            `✅ **BROADCAST COMPLETE**\n\n` +
            `✔️ Sent: ${sent}\n` +
            `❌ Failed: ${failed}\n` +
            `📊 Success Rate: ${((sent / targets.length) * 100).toFixed(1)}%`
        );
    }

    async updateUserPoints(userId, amount, reason = 'Manual adjustment') {
        try {
            if (amount > 0) {
                await this.db.addPoints(userId, amount, reason);
            } else {
                await this.db.removePoints(userId, Math.abs(amount), reason);
            }
            
            const user = await this.db.getUser(userId);
            this.logAdminAction('POINTS_UPDATE', {
                userId,
                change: amount,
                newPoints: user.points,
                reason
            });

            return {
                success: true,
                userId,
                newPoints: user.points,
                change: amount
            };
        } catch (error) {
            console.error('Error updating points:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserProfile(userId) {
        try {
            const user = await this.db.getUser(userId);
            if (!user) return null;

            const joinDate = new Date(user.joined);

            return {
                ...user,
                joinedDate: joinDate.toLocaleDateString(),
                accountAgeInDays: Math.floor((Date.now() - joinDate) / (1000 * 60 * 60 * 24)),
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    formatUserProfile(profile) {
        return `
╔══════════════════════════════════════════╗
║        👤 USER PROFILE DETAILS 👤        ║
╚══════════════════════════════════════════╝

🆔 **User ID:** \`${profile.telegram_id}\`
📝 **Name:** ${profile.first_name}
🔗 **Username:** @${profile.username || 'N/A'}
💰 **Points:** ${profile.points}
📅 **Joined:** ${profile.joinedDate}
⏳ **Account Age:** ${profile.accountAgeInDays} days
        `;
    }

    getAdminLog(limit = 10) {
        return this.adminLog.slice(-limit).reverse();
    }

    formatAdminLog() {
        const logs = this.getAdminLog(15);
        const formatted = logs.map((log, i) => 
            `${i + 1}. **${log.action}** (${new Date(log.timestamp).toLocaleTimeString()})`
        ).join('\n');

        return `
╔══════════════════════════════════════════╗
║      📋 RECENT ADMIN ACTIONS LOG 📋      ║
╚══════════════════════════════════════════╝

${formatted || 'No recent actions'}

✏️ *Total Actions Logged:* ${this.adminLog.length}
        `;
    }

    getMainAdminKeyboard() {
        return Markup.keyboard([
            ['📊 Statistics', '📢 Broadcast Message'],
            ['💰 Manage Points', '👥 User Directory'],
            ['🔍 Search User', '📋 Action Logs'],
            ['⬅️ Back to User Menu']
        ]).resize();
    }

    getPointsKeyboard() {
        return Markup.keyboard([
            ['➕ Add Points', '➖ Remove Points'],
            ['⬅️ Back to Admin Menu']
        ]).resize();
    }

    getCancelKeyboard() {
        return Markup.keyboard([
            ['❌ Cancel Operation']
        ]).resize();
    }

    setupHandlers() {
        // Main Admin Panel
        this.bot.hears('🛠 Admin Panel', (ctx) => {
            if (!this.isAdmin(ctx)) {
                return ctx.reply('❌ This area is restricted to administrators only.');
            }
            ctx.reply(
                '╔════════════════════════════════╗\n' +
                '║ 🛠️  ADMIN CONTROL PANEL 🛠️   ║\n' +
                '╚════════════════════════════════╝\n\n' +
                'Select a management tool:',
                this.getMainAdminKeyboard()
            );
            this.logAdminAction('ACCESS_PANEL', { userId: ctx.from.id });
        });

        // Statistics
        this.bot.hears('📊 Statistics', async (ctx) => {
            if (!this.isAdmin(ctx)) return;
            const stats = await this.getDetailedStats();
            ctx.replyWithMarkdown(this.formatStatsMessage(stats));
            this.logAdminAction('VIEW_STATS', {});
        });

        // Search User
        this.bot.hears('🔍 Search User', (ctx) => {
            if (!this.isAdmin(ctx)) return;
            ctx.session.step = 'SEARCH_QUERY';
            ctx.reply('🔍 **Enter user ID, name, or username:**', this.getCancelKeyboard());
        });

        // Action Logs
        this.bot.hears('📋 Action Logs', (ctx) => {
            if (!this.isAdmin(ctx)) return;
            ctx.replyWithMarkdown(this.formatAdminLog());
        });

        // Points Management
        this.bot.hears('💰 Manage Points', (ctx) => {
            if (!this.isAdmin(ctx)) return;
            ctx.reply('💰 **Points Management**', this.getPointsKeyboard());
        });

        // Broadcast
        this.bot.hears('📢 Broadcast Message', (ctx) => {
            if (!this.isAdmin(ctx)) return;
            ctx.session.step = 'BROADCAST_PREVIEW';
            ctx.replyWithMarkdown('📢 **Advanced Broadcast System**\n\n➡️ Send your message now...', this.getCancelKeyboard());
        });

        // Add/Remove Points
        this.bot.hears('➕ Add Points', (ctx) => {
            if (!this.isAdmin(ctx)) return;
            ctx.session.step = 'ADD_POINTS_ID';
            ctx.reply('➕ **Enter User ID to add points:**', this.getCancelKeyboard());
        });

        this.bot.hears('➖ Remove Points', (ctx) => {
            if (!this.isAdmin(ctx)) return;
            ctx.session.step = 'REM_POINTS_ID';
            ctx.reply('➖ **Enter User ID to remove points:**', this.getCancelKeyboard());
        });

        // User Directory
        this.bot.hears('👥 User Directory', async (ctx) => {
            if (!this.isAdmin(ctx)) return;
            try {
                const users = await this.db.getAllUsers();
                if (users.length === 0) return ctx.reply('📭 Database is empty.');
                
                const buttons = users.slice(0, 50).map(user => 
                    [Markup.button.callback(`👤 ${user.first_name} | 💰 ${user.points}`, `view_prof:${user.telegram_id}`)]
                );
                
                ctx.replyWithMarkdown('📂 **USER DIRECTORY**', Markup.inlineKeyboard(buttons));
                this.logAdminAction('VIEW_DIRECTORY', { count: users.length });
            } catch (error) {
                ctx.reply('❌ Error fetching user directory.');
            }
        });

        // Back buttons
        this.bot.hears('⬅️ Back to Admin Menu', (ctx) => {
            ctx.session = {};
            ctx.reply('↩️ Returning to Admin Menu...', this.getMainAdminKeyboard());
        });

        this.bot.hears('⬅️ Back to User Menu', (ctx) => {
            ctx.session = {};
            ctx.reply('↩️ Returning to User Menu...', getMenu(ctx));
        });

        // Cancel
        this.bot.hears('❌ Cancel Operation', (ctx) => {
            ctx.session = {};
            ctx.reply('🚫 Operation cancelled.', this.getMainAdminKeyboard());
        });

        // State Handler
        this.bot.on('message', async (ctx, next) => {
            const state = ctx.session?.step;
            if (!state) return next();

            const text = ctx.message?.text;

            // Gmail Registration Logic
            if (state === 'EMAIL') {
                const emailRegex = /^[a-zA-Z0-9._%-]+@gmail\.com$/;
                if (!emailRegex.test(text.trim())) {
                    return ctx.replyWithMarkdown(
                        `❌ *Invalid Gmail Format*\n\n` +
                        `Please send a valid Gmail address:\n` +
                        `✅ Valid: \`yourname@gmail.com\`\n` +
                        `❌ Invalid: \`yourname@yahoo.com\`\n\n` +
                        `Try again:`,
                        cancelKeyboard
                    );
                }
                ctx.session.email = text.trim();
                
                await ctx.replyWithMarkdown(
                    `⏳ *Validating Email Address...*\n\n` +
                    `Processing: \`${ctx.session.email}\``
                );

                await new Promise(resolve => setTimeout(resolve, 2000));

                const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
                await ctx.replyWithMarkdown(
                    `✅ *Email Validated!*\n\n` +
                    `📧 \`${ctx.session.email}\`\n\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `💰 **Balance Check:**\n` +
                    `├─ Current Balance: ${user.points} Points\n` +
                    `├─ Cost: 5 Points\n` +
                    `└─ Status: ✅ Approved\n` +
                    `━━━━━━━━━━━━━━━━━━\n\n` +
                    `🔑 **Step 2️⃣: Send Password**\n\n` +
                    `Please enter the password for this account:`,
                    cancelKeyboard
                );
                
                ctx.session.step = 'PASS';
                return;
            }

            if (state === 'PASS') {
                const email = ctx.session.email;
                const password = text;
                
                if (!password || password.length < 8) {
                    return ctx.replyWithMarkdown(
                        `❌ *Password Too Weak*\n\n` +
                        `Requirements:\n` +
                        `✓ Minimum 8 characters\n` +
                        `✓ Mix of letters & numbers\n\n` +
                        `Try again:`,
                        cancelKeyboard
                    );
                }
                
                // Deduct points from Supabase
                const user = await db.removePoints(ctx.from.id, 5, 'gmail_registration');
                await db.incrementRegistered(ctx.from.id);
                
                const processingMsg = await ctx.replyWithMarkdown(
                    `⏳ *Processing Registration...*\n\n` +
                    `📧 Email: \`${email}\`\n` +
                    `🔐 Password: Received\n\n` +
                    `━━━━━━━━━━━━━━━━━━\n` +
                    `⚙️ Setting up account...`
                );

                const steps = [
                    { time: 2000, text: `⏳ *Processing...* 20%\n\n🔄 Validating credentials...` },
                    { time: 4000, text: `⏳ *Processing...* 40%\n\n🔄 Setting up account...` },
                    { time: 6000, text: `⏳ *Processing...* 60%\n\n🔄 Configuring settings...` },
                    { time: 8000, text: `⏳ *Processing...* 80%\n\n🔄 Finalizing setup...` }
                ];

                for (const step of steps) {
                    await new Promise(resolve => setTimeout(resolve, step.time));
                    try {
                        await ctx.telegram.editMessageText(
                            ctx.chat.id,
                            processingMsg.message_id,
                            undefined,
                            step.text,
                            { parse_mode: 'Markdown' }
                        );
                    } catch (e) {}
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const updatedUser = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
                const successMessage = `
✅ *Registration Complete!* ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Account Details:*
├─ Email: \`${email}\`
├─ Status: Active ✅
└─ Created: Now

💰 *Payment Processed:*
├─ Cost: -5 Points
├─ Balance: ${updatedUser.points} Pts
└─ Accounts: ${updatedUser.registered} total

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Your account is ready to use!
                `;
                
                ctx.session = {};
                await ctx.replyWithMarkdown(successMessage, getMenu(ctx));
            }

            // Admin-only operations
            if (!this.isAdmin(ctx)) return next();

            // Search Logic
            if (state === 'SEARCH_QUERY') {
                const results = await this.searchUsers(text);
                if (results.length === 0) {
                    ctx.reply('❌ No users found.');
                    ctx.session.step = 'SEARCH_QUERY';
                    return;
                }

                const buttons = results.map(user =>
                    [Markup.button.callback(`${user.first_name} (@${user.username})`, `view_prof:${user.telegram_id}`)]
                );

                ctx.replyWithMarkdown(`🔍 **Found ${results.length} results:**`, Markup.inlineKeyboard(buttons));
                ctx.session = {};
            }

            // Broadcast
            if (state === 'BROADCAST_PREVIEW') {
                ctx.session.msgToCopy = ctx.message.message_id;
                ctx.session.step = 'BROADCAST_CONFIRM';
                await ctx.reply('👇 **PREVIEW:**');
                await ctx.telegram.copyMessage(ctx.chat.id, ctx.chat.id, ctx.message.message_id);
                return ctx.reply('✅ Confirm & Send?', Markup.keyboard([['✅ CONFIRM & SEND'], ['❌ Cancel Operation']]).resize());
            }

            if (state === 'BROADCAST_CONFIRM' && text === '✅ CONFIRM & SEND') {
                await this.broadcastMessage(ctx, ctx.session.msgToCopy);
                ctx.session = {};
            }

            // Add/Remove Points
            if (state === 'ADD_POINTS_ID') {
                const userId = parseInt(text);
                const user = await this.getUserProfile(userId);
                if (!user) {
                    return ctx.reply('❌ User not found.');
                }
                ctx.session.targetId = userId;
                ctx.session.step = 'ADD_POINTS_AMT';
                return ctx.reply('💰 **Enter points amount:**', this.getCancelKeyboard());
            }

            if (state === 'ADD_POINTS_AMT') {
                const amount = parseInt(text);
                if (isNaN(amount) || amount < 0) {
                    return ctx.reply('❌ Enter a valid positive number.');
                }
                const result = await this.updateUserPoints(ctx.session.targetId, amount, 'Admin manual addition');
                ctx.session = {};
                if (result.success) {
                    return ctx.reply(`✅ Added ${amount} points to user ${result.userId}`, this.getMainAdminKeyboard());
                } else {
                    return ctx.reply(`❌ Error: ${result.error}`, this.getMainAdminKeyboard());
                }
            }

            if (state === 'REM_POINTS_ID') {
                const userId = parseInt(text);
                const user = await this.getUserProfile(userId);
                if (!user) {
                    return ctx.reply('❌ User not found.');
                }
                ctx.session.targetId = userId;
                ctx.session.step = 'REM_POINTS_AMT';
                return ctx.reply('💰 **Enter points to remove:**', this.getCancelKeyboard());
            }

            if (state === 'REM_POINTS_AMT') {
                const amount = parseInt(text);
                if (isNaN(amount) || amount < 0) {
                    return ctx.reply('❌ Enter a valid positive number.');
                }
                const result = await this.updateUserPoints(ctx.session.targetId, -amount, 'Admin manual removal');
                ctx.session = {};
                if (result.success) {
                    return ctx.reply(`✅ Removed ${amount} points from user ${result.userId}`, this.getMainAdminKeyboard());
                } else {
                    return ctx.reply(`❌ Error: ${result.error}`, this.getMainAdminKeyboard());
                }
            }
        });

        // Callback for user profile viewing
        this.bot.action(/view_prof:(.+)/, async (ctx) => {
            if (!this.isAdmin(ctx)) return ctx.answerCbQuery('❌ Access denied');
            
            const userId = ctx.match[1];
            const profile = await this.getUserProfile(parseInt(userId));
            if (!profile) return ctx.answerCbQuery('❌ User not found');
            
            ctx.replyWithMarkdown(this.formatUserProfile(profile));
            ctx.answerCbQuery();
        });
    }
}

// Initialize Admin Panel
const adminPanel = new AdvancedAdminPanel(bot, db, ADMIN_ID);

// --- CALLBACK HANDLERS ---
bot.action('show_referral_link', async (ctx) => {
    const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
    const link = `https://t.me/${BOT_USERNAME}?start=${ctx.from.id}`;
    ctx.answerCbQuery();
    ctx.reply(`🔗 Your referral link:\n\`${link}\``, Markup.inlineKeyboard([
        [Markup.button.url("📤 Share", `https://t.me/share/url?url=${encodeURIComponent(link)}`)]
    ]));
});

bot.action('main_menu', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('↩️ Back to main menu', getMenu(ctx));
});

bot.action('refresh_ref', async (ctx) => {
    const user = await db.getUser(ctx.from.id, ctx.from.first_name, ctx.from.username);
    ctx.answerCbQuery(`Stats Updated! Points: ${user.points}`);
});

bot.launch().then(() => console.log("❝𝕏-𝐇𝐮𝐧𝐭𝐞𝐫❞ Advanced Bot Online 🚀 (Supabase Enabled)"));
