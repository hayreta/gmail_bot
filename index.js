const { Telegraf, Markup } = require('telegraf');

// Configuration
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const IMAGE_URL = 'https://raw.githubusercontent.com/your-username/your-repo/main/image_b8cbf6.png'; // Update with your hosted image link

const CHANNELS = [
    '@Hayre37',
    '@Digital_Claim',
    '@BIgsew_community',
    '@hayrefx'
];

const bot = new Telegraf(BOT_TOKEN);

// Main Menu Keyboard
const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account'],
    ['🚸 My Referrals'],
    ['🏥 Help']
]).resize();

// Admin Keyboard
const adminMenu = Markup.keyboard([
    ['📊 Statistics', '📢 Broadcast'],
    ['⬅️ Back to User Menu']
]).resize();

// Membership Check Function
async function checkAllChannels(ctx) {
    for (const channel of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(channel, ctx.from.id);
            const joined = ['member', 'administrator', 'creator'].includes(member.status);
            if (!joined) return false;
        } catch (error) {
            console.error(`Error checking ${channel}:`, error.message);
            return false;
        }
    }
    return true;
}

// Start Command
bot.start(async (ctx) => {
    const isJoined = await checkAllChannels(ctx);

    if (isJoined) {
        return ctx.reply("🔰 Welcome To Main Menu", mainMenu);
    } else {
        // Sends the image and the 2x2 join buttons from your screenshot
        return ctx.replyWithPhoto(
            { url: 'https://i.ibb.co/v6yXyXG/image-b8cbf6.png' }, // Use a direct link to your image
            {
                caption: "⛔️ **MUST JOIN OUR ALL CHANNELS**",
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url("Join ↗️", "https://t.me/Hayre37"), Markup.button.url("Join ↗️", "https://t.me/Digital_Claim")],
                    [Markup.button.url("Join ↗️", "https://t.me/BIgsew_community"), Markup.button.url("Join ↗️", "https://t.me/hayrefx")],
                    [Markup.button.callback("Joined ✅", "verify_membership")]
                ])
            }
        );
    }
});

// Verify Button Handler
bot.action('verify_membership', async (ctx) => {
    const isJoined = await checkAllChannels(ctx);
    if (isJoined) {
        await ctx.answerCbQuery("Verification Successful!");
        await ctx.deleteMessage();
        return ctx.reply("🔰 Welcome To Main Menu", mainMenu);
    } else {
        await ctx.answerCbQuery("❌ You haven't joined all channels yet!", { show_alert: true });
    }
});

// Admin Command
bot.command('admin', (ctx) => {
    if (ctx.from.id === ADMIN_ID) {
        ctx.reply("👑 Welcome to the Admin Panel, Boss!", adminMenu);
    } else {
        ctx.reply("❌ Unauthorized access.");
    }
});

// Back to User Menu button for Admin
bot.hears('⬅️ Back to User Menu', (ctx) => {
    ctx.reply("🔰 Back to Main Menu", mainMenu);
});

bot.launch().then(() => console.log("Bot deployed successfully."));
