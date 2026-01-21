const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;

// List of required channels (Username or ID)
const CHANNELS = [
    '@Hayre37',
    '@Digital_Claim',
    '@BIgsew_community',
    '@hayrefx'
];

const bot = new Telegraf(BOT_TOKEN);

// Function to check if user is in ALL channels
async function checkAllChannels(ctx) {
    for (const channel of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            const joined = ['member', 'administrator', 'creator'].includes(member.status);
            if (!joined) return false; // If even one is not joined, return false
        } catch (error) {
            console.error(`Error checking ${channel}:`, error.message);
            return false; 
        }
    }
    return true;
}

bot.start(async (ctx) => {
    const isJoined = await checkAllChannels(ctx);

    if (isJoined) {
        return ctx.reply("✅ Welcome! You have joined all channels and now have access to the bot.");
    } else {
        return ctx.reply(
            "⚠️ **Access Denied!**\n\nTo use this bot, you must join our official channels below:",
            Markup.inlineKeyboard([
                [Markup.button.url("1️⃣ Join Channel", "https://t.me/Hayre37")],
                [Markup.button.url("2️⃣ Join Channel", "https://t.me/Digital_Claim")],
                [Markup.button.url("3️⃣ Join Channel", "https://t.me/BIgsew_community")],
                [Markup.button.url("4️⃣ Join Channel", "https://t.me/hayrefx")],
                [Markup.button.callback("I have joined all ✅", "verify_membership")]
            ])
        );
    }
});

bot.action('verify_membership', async (ctx) => {
    const isJoined = await checkAllChannels(ctx);

    if (isJoined) {
        await ctx.answerCbQuery("Success! Verification complete.");
        await ctx.editMessageText("✅ Thank you for joining! You now have full access. Send /start to begin.");
    } else {
        await ctx.answerCbQuery("❌ You haven't joined all channels yet!", { show_alert: true });
    }
});

// Simple Admin Command
bot.command('admin', (ctx) => {
    if (ctx.from.id === ADMIN_ID) {
        ctx.reply("Welcome Boss! Admin panel is active.");
    } else {
        ctx.reply("❌ This command is for the administrator only.");
    }
});

bot.launch().then(() => console.log("Force Join Bot is running..."));
