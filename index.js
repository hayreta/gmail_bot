import { Telegraf, Markup } from 'telegraf';
import fs from 'fs';
import 'dotenv/config';

// CONFIGURATION
const BOT_TOKEN = '8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8';
const ADMIN_ID = 5522724001;
const CHANNELS = ['@Hayre37', '@Digital_Claim', '@BIgsew_community', '@hayrefx'];
const DB_FILE = './db.json';

const bot = new Telegraf(BOT_TOKEN);

// DATABASE HELPERS
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function getUser(id) {
    let db = loadDB();
    let user = db.users.find(u => u.userId === id);
    if (!user) {
        user = { userId: id, points: 0 };
        db.users.push(user);
        saveDB(db);
    }
    return user;
}

// CHANNEL JOIN CHECKER
async function checkJoin(ctx) {
    for (const chan of CHANNELS) {
        try {
            const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
            if (['left', 'kicked'].includes(member.status)) return false;
        } catch (e) { return false; }
    }
    return true;
}

// KEYBOARDS (Matches your screenshots)
const joinButtons = Markup.inlineKeyboard([
    [Markup.button.url('Join', 'https://t.me/Hayre37'), Markup.button.url('Join', 'https://t.me/Digital_Claim')],
    [Markup.button.url('Join', 'https://t.me/BIgsew_community'), Markup.button.url('Join', 'https://t.me/hayrefx')],
    [Markup.button.callback('Joined ✅', 'verify')]
]);

const mainMenu = Markup.keyboard([
    ['➕ Register New Gmail'],
    ['⚙️ Account'],
    ['🚸 My Referrals'],
    ['🚨 Help']
]).resize();

// BOT LOGIC
bot.start(async (ctx) => {
    await getUser(ctx.from.id);
    
    // Referral Logic
    const refId = Number(ctx.startPayload);
    if (refId && refId !== ctx.from.id) {
        let db = loadDB();
        let inviter = db.users.find(u => u.userId === refId);
        if (inviter) {
            inviter.points += 1;
            saveDB(db);
            bot.telegram.sendMessage(refId, "🎁 Someone joined! +1 Point.");
        }
    }
    
    // Send Image and Join Message
    ctx.replyWithPhoto('https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/2560px-Gmail_icon_%282020%29.svg.png', {
        caption: "⛔️ **MUST JOIN OUR ALL CHANNELS**",
        parse_mode: 'Markdown',
        ...joinButtons
    });
});

bot.action('verify', async (ctx) => {
    if (await checkJoin(ctx)) {
        await ctx.deleteMessage();
        ctx.reply("🔰 Welcome To Main Menu\n\n⚙️ Join @Free_Op To Get Free Recharge", mainMenu); //
    } else {
        ctx.answerCbQuery("❌ You haven't joined all channels!", { show_alert: true });
    }
});

bot.hears('➕ Register New Gmail', async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (user.points < 5) {
        return ctx.reply(`⚠️ You Must Have 5 Points To Register New Gmail 📧\n💰 Balance: ${user.points} Points`);
    }
    ctx.reply("✅ Requirement met! Send your registration details.");
});

bot.hears('⚙️ Account', async (ctx) => {
    const user = await getUser(ctx.from.id);
    ctx.reply(`👤 Profile: ${ctx.from.first_name}\n💰 Points: ${user.points}\n🆔 ID: ${ctx.from.id}`);
});

bot.hears('🚸 My Referrals', (ctx) => {
    ctx.reply(`🔗 Referral Link:\nhttps://t.me/${ctx.botInfo.username}?start=${ctx.from.id}`);
});

// Admin Command: /add ID Amount
bot.command('add', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const [_, id, amount] = ctx.message.text.split(' ');
    let db = loadDB();
    let user = db.users.find(u => u.userId === Number(id));
    if (user) {
        user.points += Number(amount);
        saveDB(db);
        ctx.reply(`✅ Added ${amount} points to ${id}`);
    }
});

bot.launch();
