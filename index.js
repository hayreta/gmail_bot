import { Telegraf, Markup } from "telegraf";
import fs from "fs";
import "dotenv/config";

// --- CONFIGURATION ---
const BOT_TOKEN = "8539976683:AAE02vIE0M_YxpKKluoYNQHsogNz-fYfks8";
const ADMIN_ID = 5522724001;
const CHANNELS = [
  "@Hayre37",
  "@Digital_Claim",
  "@BIgsew_community",
  "@hayrefx",
];
const DB_FILE = "./db.json";

const bot = new Telegraf(BOT_TOKEN);

// --- LOCAL DATABASE HELPERS ---
// This reads and writes to a simple file called db.json in your folder
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
  let user = db.users.find((u) => u.userId === id);
  if (!user) {
    user = { userId: id, points: 0 };
    db.users.push(user);
    saveDB(db);
  }
  return user;
}

// --- CHANNEL JOIN CHECKER ---
async function checkJoin(ctx) {
  for (const chan of CHANNELS) {
    try {
      const member = await ctx.telegram.getChatMember(chan, ctx.from.id);
      const status = ["member", "administrator", "creator"];
      if (!status.includes(member.status)) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

// --- KEYBOARDS ---
const mainMenu = Markup.keyboard([
  ["➕ Register New Gmail"],
  ["⚙️ Account", "🚸 My Referrals"],
  ["🚨 Help"],
]).resize();

const joinButtons = Markup.inlineKeyboard([
  [
    Markup.button.url("Join 1", "https://t.me/Hayre37"),
    Markup.button.url("Join 2", "https://t.me/Digital_Claim"),
  ],
  [
    Markup.button.url("Join 3", "https://t.me/BIgsew_community"),
    Markup.button.url("Join 4", "https://t.me/hayrefx"),
  ],
  [Markup.button.callback("Joined ✅", "verify_join")],
]);

// --- BOT ACTIONS ---

bot.start(async (ctx) => {
  await getUser(ctx.from.id);

  // Referral logic: t.me/bot?start=12345
  const refId = Number(ctx.startPayload);
  if (refId && refId !== ctx.from.id) {
    let db = loadDB();
    let inviter = db.users.find((u) => u.userId === refId);
    if (inviter) {
      inviter.points += 1;
      saveDB(db);
      bot.telegram.sendMessage(
        refId,
        "🎁 Someone joined via your link! You earned 1 point."
      );
    }
  }

  ctx.reply(
    "👋 Welcome! You must join our channels to access the bot:",
    joinButtons
  );
});

bot.action("verify_join", async (ctx) => {
  const joined = await checkJoin(ctx);
  if (joined) {
    await ctx.deleteMessage();
    ctx.reply("✅ Access Granted! Main Menu unlocked.", mainMenu);
  } else {
    ctx.answerCbQuery("❌ You haven't joined all channels!", {
      show_alert: true,
    });
  }
});

bot.hears("➕ Register New Gmail", async (ctx) => {
  const user = await getUser(ctx.from.id);
  if (user.points < 5) {
    return ctx.reply(
      `⚠️ You Must Have 5 Points To Register New Gmail 📧\n\n💰 Your Balance: ${user.points} Points`
    );
  }
  ctx.reply(
    "✅ You have enough points! Please send your Gmail registration details."
  );
});

bot.hears("⚙️ Account", async (ctx) => {
  const user = await getUser(ctx.from.id);
  ctx.reply(
    `👤 Profile: ${ctx.from.first_name}\n💰 Balance: ${user.points} Points\n🆔 ID: ${ctx.from.id}`
  );
});

bot.hears("🚸 My Referrals", (ctx) => {
  ctx.reply(
    `🔗 Your Referral Link:\nhttps://t.me/${ctx.botInfo.username}?start=${ctx.from.id}\n\nShare this link to earn 1 point per join!`
  );
});

// Admin command: /add ID Points
bot.command("add", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  const args = ctx.message.text.split(" ");
  if (args.length !== 3) return ctx.reply("Use: /add [UserID] [Points]");

  const targetId = Number(args[1]);
  const amount = Number(args[2]);

  let db = loadDB();
  let user = db.users.find((u) => u.userId === targetId);
  if (user) {
    user.points += amount;
    saveDB(db);
    ctx.reply(`✅ Successfully added ${amount} points to user ${targetId}`);
    bot.telegram.sendMessage(
      targetId,
      `🎁 Admin added ${amount} points to your account!`
    );
  } else {
    ctx.reply("❌ User not found in the database.");
  }
});

bot.launch();
console.log("🚀 Bot is running perfectly with Local JSON database!");
