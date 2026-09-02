require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { App } = require("@slack/bolt");

const STARTING_BALANCE = 100;
const MIN_BET = 1;
const MAX_BET = 500_000;

const DAILY_REWARD = 1_000;
const WORK_MIN = 100;
const WORK_MAX = 500;

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;
const WORK_COOLDOWN = 60 * 60 * 1000;
const DATA_FILE = path.join(__dirname, "data", "users.json");

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Could not read user data:", error);
    return {};
  }
}

const users = loadUsers();

function saveUsers() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, `${JSON.stringify(users, null, 2)}\n`);
  fs.renameSync(temporaryFile, DATA_FILE);
}

function getUser(command) {
  const userId = command.user_id;
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      username: command.user_name || "unknown",
      displayName: command.user_name || "unknown",
      balance: STARTING_BALANCE,
      lastDaily: 0,
      lastWork: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      totalWinnings: 0
    };
    saveUsers();
  } else {
    users[userId].username = command.user_name || users[userId].username;
  }
  return users[userId];
}

function formatCoins(amount) {
  return `${Math.floor(amount).toLocaleString()} coins`;
}

function remainingTime(lastClaim, cooldown) {
  const remaining = cooldown - (Date.now() - lastClaim);
  if (remaining <= 0) return null;
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.ceil((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function helpText() {
  return [
    "*Casino commands*",
    "`/casino-balance` - show your balance",
    "`/casino-daily` - claim your daily reward",
    "`/casino-work` - earn coins from work",
    "`/casino-coin-flip <heads|tails> <bet>` - flip a coin",
    "`/casino-leaderboard` - show the richest players"
  ].join("\n");
}
DATA_FILE
const COMMAND_ACTIONS = {
  "/casino-balance": "balance",
  "/casino-daily": "daily",
  "/casino-work": "work",
  "/casino-coin-flip": "coinflip",
  "/casino-leaderboard": "leaderboard"
};

async function handleCommand({ command, ack, respond }) {
  await ack();

  try {
    const user = getUser(command);
    const action = COMMAND_ACTIONS[command.command];
    const [choice, betText] = command.text.trim().split(/\s+/);

    if (action === "balance") {
      await respond({ response_type: "ephemeral", text: `You have *${formatCoins(user.balance)}*.` });
      return;
    }

    if (action === "daily") {
      const remaining = remainingTime(user.lastDaily, DAILY_COOLDOWN);
      if (remaining) {
        await respond({ response_type: "ephemeral", text: `Your daily reward is ready in *${remaining}*.` });
        return;
      }
      user.balance += DAILY_REWARD;
      user.lastDaily = Date.now();
      saveUsers();
      await respond({ text: `You claimed *${formatCoins(DAILY_REWARD)}*! Your balance is *${formatCoins(user.balance)}*.` });
      return;
    }

    if (action === "work") {
      const remaining = remainingTime(user.lastWork, WORK_COOLDOWN);
      if (remaining) {
        await respond({ response_type: "ephemeral", text: `You can work again in *${remaining}*.` });
        return;
      }
      const reward = randomInteger(WORK_MIN, WORK_MAX);
      user.balance += reward;
      user.lastWork = Date.now();
      saveUsers();
      await respond({ text: `You earned *${formatCoins(reward)}*! Your balance is *${formatCoins(user.balance)}*.` });
      return;
    }

    if (action === "coinflip") {
      const wager = Number(betText);
      if (!["heads", "tails"].includes(choice?.toLowerCase()) || !Number.isInteger(wager)) {
        await respond({ response_type: "ephemeral", text: "Usage: `/casino coinflip <heads|tails> <whole number bet>`" });
        return;
      }
      if (wager < MIN_BET || wager > MAX_BET) {
        await respond({ response_type: "ephemeral", text: `Bet between *${formatCoins(MIN_BET)}* and *${formatCoins(MAX_BET)}*.` });
        return;
      }
      if (wager > user.balance) {
        await respond({ response_type: "ephemeral", text: `You only have *${formatCoins(user.balance)}*.` });
        return;
      }

      const result = Math.random() < 0.5 ? "heads" : "tails";
      const won = choice.toLowerCase() === result;
      user.gamesPlayed += 1;
      user.balance += won ? wager : -wager;
      if (won) {
        user.gamesWon += 1;
        user.totalWinnings += wager;
      }
      saveUsers();
      await respond({ text: `The coin landed on *${result}*. ${won ? `You won *${formatCoins(wager)}*!` : `You lost *${formatCoins(wager)}*.`} Balance: *${formatCoins(user.balance)}*.` });
      return;
    }

    if (action === "leaderboard" || action === "leaders") {
      const leaders = Object.values(users)
        .sort((first, second) => second.balance - first.balance)
        .slice(0, 10);
      const lines = leaders.length
        ? leaders.map((leader, index) => `${index + 1}. *${leader.displayName || leader.username}* - ${formatCoins(leader.balance)}`)
        : ["No players yet."];
      await respond({ text: `*Casino leaderboard*\n${lines.join("\n")}` });
      return;
    }

    await respond({ response_type: "ephemeral", text: helpText() });
  } catch (error) {
    console.error("Casino command failed:", error);
    await respond({ response_type: "ephemeral", text: "Something went wrong while processing that command." });
  }
}


const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

Object.keys(COMMAND_ACTIONS).forEach((commandName) => {
  app.command(commandName, handleCommand);
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();