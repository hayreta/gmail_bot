const { Telegraf, Markup, session } = require('telegraf');

const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;

const bot = new Telegraf(BOT_TOKEN);

// Using memory sessions to track user progress (In production, use MongoDB)
bot.use(session());

// Mock database for user points
const db = {}; 

const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];

const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account'], ['🚸 My Referrals'],
    ['🏥 Help']
]).resize();

// --- Registration Logic ---

bot.hears('➕ Register New Gmail', async (ctx) => {
    const userId = ctx.from.id;
    const userPoints = db[userId]?.points || 0;

    if (userPoints < 5) {
        return ctx.replyWithMarkdown(
            `⚠️ *Access Denied*\n\nYou must have **5 Points** to register a new Gmail 📧\n\n*Your Balance:* ${userPoints} Points`,
            Markup.inlineKeyboard([[Markup.button.callback("Get More Points ⚡️", "get_points")]])
        );
    }

    ctx.session = { step: 'WAITING_EMAIL' };
    await ctx.replyWithMarkdown(
        "🟢 **Please Send Email** 📧\n\n" +
        "⚙️ *Example:* `name@gmail.com` \n\n" +
        "👉 _Copy the address from the Gmail Farmer bot_"
    );
});

bot.on('text', async (ctx, next) => {
    const state = ctx.session?.step;

    if (state === 'WAITING_EMAIL') {
        const email = ctx.message.text;
        if (!email.includes('@gmail.com')) {
            return ctx.reply("❌ Invalid format. Please send a valid @gmail.com address.");
        }
        ctx.session.email = email;
        ctx.session.step = 'WAITING_PASSWORD';
        return ctx.replyWithMarkdown(
            "🔋 **Please Send Password** 🔑\n\n" +
            "⚙️ *Example:* `name@0924` \n\n" +
            "👉 _Don't send an easy password!_"
        );
    }

    if (state === 'WAITING_PASSWORD') {
        const password = ctx.message.text;
        const email = ctx.session.email;

        // Simulate processing
        const loading = await ctx.reply("🚀 Processing your registration...");
        
        setTimeout(async () => {
            await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);
            await ctx.replyWithMarkdown(
                "✅ **Registration Successful!** 🚀\n\n" +
                `📧 *Email:* \`${email}\`\n` +
                `🔑 *Password:* \`${password}\`\n\n` +
                "Your details have been securely logged in our database."
            );
            // Deduct points
            db[ctx.from.id].points -= 5;
            ctx.session = null; 
        }, 2000);
        return;
    }
    return next();
});

// --- Account View ---
bot.hears('⚙️ Account', (ctx) => {
    const userId = ctx.from.id;
    if (!db[userId]) db[userId] = { points: 10 }; // Giving 10 points for testing

    ctx.replyWithMarkdown(
        `👤 **USER PROFILE**\n` +
        `━━━━━━━━━━━━━━\n` +
        `🆔 *ID:* \`${userId}\`\n` +
        `💰 *Balance:* ${db[userId].points} Points\n` +
        `📈 *Status:* Premium User\n` +
        `📅 *Joined:* ${new Date().toLocaleDateString()}`
    );
});

// --- Administrative ---
bot.command('admin', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("❌ Restricted.");
    ctx.reply("👑 Admin Dashboard Loaded", Markup.keyboard([['📊 Stats', '➕ Add Points'], ['⬅️ Exit']]).resize());
});

bot.launch();
