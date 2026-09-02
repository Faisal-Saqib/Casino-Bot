# Slack Casino Bot

A lightweight casino bot for Slack. Players earn virtual coins, play coin flip, and compete on a shared leaderboard.

## Features

- Persistent balance for every Slack user
- Starting balance of 100 coins
- Daily reward of 1,000 coins
- Work reward between 100 and 500 coins
- One-hour work cooldown
- Twenty-four-hour daily reward cooldown
- Coin flip betting with heads or tails
- Shared top-ten leaderboard
- JSON file storage with atomic writes
- Slack Socket Mode, so no public web server is required

## Commands

| Command | Usage | Description |
| --- | --- | --- |
| `/casino-balance` | `/casino-balance` | Show your current balance |
| `/casino-daily` | `/casino-daily` | Claim the daily reward |
| `/casino-work` | `/casino-work` | Earn coins from work |
| `/casino-coin-flip` | `/casino-coin-flip heads 25` | Bet on heads or tails |
| `/casino-leaderboard` | `/casino-leaderboard` | Show the ten richest players |

Coin flip bets must be whole numbers from 1 to 500,000 and cannot exceed the player's balance. A winning bet adds the wager to the balance; a losing bet subtracts it.

## Requirements

- Node.js 18 or newer
- A Slack workspace where you can create an app
- Slack app-level and bot tokens

## Installation

```bash
git clone <your-repository-url>
cd SlackBot
npm install
```

Create a `.env` file in the project root:

```env
SLACK_APP_TOKEN=xapp-your-app-level-token
SLACK_BOT_TOKEN=xoxb-your-bot-token
```

Never commit `.env` or share its contents. It is already excluded by `.gitignore`.

Start the bot:

```bash
node index.js
```

A successful startup prints:

```text
bot is running!
```

## Slack App Setup

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps).
2. Enable **Socket Mode** and create an app-level token with the `connections:write` scope.
3. Under **OAuth & Permissions**, add the `commands` bot scope.
4. Install the app into your workspace and copy the app-level and bot tokens into `.env`.
5. Under **Slash Commands**, create these commands:
   - `/casino-balance`
   - `/casino-daily`
   - `/casino-work`
   - `/casino-coin-flip`
   - `/casino-leaderboard`
6. For each slash command, enable **Escape channels, users, and links sent to your app** only if your app needs that information. No Request URL is required when using Socket Mode.
7. Invite the bot to the channel where you want to use it.

## Data Storage

Player data is stored locally in `data/users.json`. Each player record includes their Slack user ID, username, balance, cooldown timestamps, games played, wins, and total winnings.

The `data` directory is created automatically when the first player uses a command. Back up `data/users.json` if balances need to survive machine migration. For multi-instance deployments or production use, replace this JSON store with a database such as SQLite or PostgreSQL.

## Development

The project currently has no automated test suite. Check JavaScript syntax with:

```bash
node --check index.js
```

## License

This project is available under the license included in the repository.
