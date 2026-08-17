# r

hello

## Elo Bot

A Discord bot that runs a 1v1 Elo ladder (first to 10) with inactivity decay.

### Rules

- Everyone starts at **1000 Elo** (players are registered automatically the
  first time they play or use a command).
- Games are **first to 10**. The **winner** reports the match with `/report`,
  entering their score of 10 and the loser's score (0-9).
- Ratings move using standard Elo (K=32) with a margin-of-victory bonus:
  a 10-0 win moves ratings up to 1.5x more than a 10-9 win.
- **Inactivity decay:** after **7 days** without playing, a player loses
  **2 Elo per day** until they play again. Decay never drops anyone below
  **800**. Playing a match resets the 7-day clock.

### Commands

| Command | What it does |
| --- | --- |
| `/report opponent your_score their_score` | Winner reports a result (your score is always 10) |
| `/elo [player]` | Show a player's rating, record, and decay status |
| `/leaderboard` | Top 15 players by Elo |
| `/history [player]` | Last 10 matches, optionally filtered to one player |
| `/undo` | Undo the most recent match, if you were part of it |

### Setup

1. Create an application + bot at <https://discord.com/developers/applications>
   and invite it to your server with the `applications.commands` and `bot`
   scopes.
2. Install and run:

   ```sh
   pip install -r requirements.txt
   DISCORD_TOKEN=<your bot token> python bot.py
   ```

Ratings are stored in `elo_data.json` next to the bot. Tuning knobs
(starting Elo, K-factor, decay rate, grace period, rating floor) are
constants at the top of `bot.py`.
