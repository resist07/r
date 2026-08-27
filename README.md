# r

hello

## Elo Bot

A Discord bot for a 1v1 ladder: button-based matchmaking queue, Elo ratings
with inactivity decay, forfeit penalties, ref overrides, and a separate
top-10 challenge ladder.

### Elo rules

- Everyone starts at **1000 Elo** (auto-registered the first time they play).
- Games are **first to 10**, no draws.
- Standard Elo (K=32): the higher-rated the opponent you beat compared to
  you, the more you gain and the more they lose. Blowouts count a bit extra
  (10-0 moves up to 1.5x more than 10-9).
- **Forfeits:** a **1-0** score means a forfeit. The winner gains normal Elo,
  but the player who FF'd loses **1.5x** the normal amount.
- **Inactivity decay:** after **7 days** without playing, you lose
  **2 Elo/day** until you play again (never below **800**).

### Matchmaking queue

A ref runs `/setup_queue` in the queue channel. The bot posts a panel with
**Join Queue** / **Leave Queue** buttons:

- Join the queue and the bot announces you're waiting for an opponent.
- As soon as a second player joins, the bot creates a **private match
  thread** visible only to the two players and the refs.
- The panel is **sticky**: the bot re-posts it so it's always the most
  recent message in the channel (same for the ladder panel).
- In the thread, either player presses **Submit score** (your score +
  opponent's score); the opponent presses **Confirm** to lock it in, or
  **Dispute** to cancel the report and ping the refs.
- Refs can press **Void match** in the thread to cancel it entirely.

### Top-10 challenge ladder

A ref runs `/setup_ladder` in a separate ladder channel and `/set_top10`
to enter the rankings (e.g. after a tournament). The panel has one
**Challenge** button:

- Pressing it challenges the player **directly above you** (or **#10** if
  you're unranked).
- The bot opens a **private thread** visible only to the two players (and
  mods/refs via thread moderation).
- The match must be played within **3 days** or it expires; refs can
  `/extend` it from inside the thread.
- Scores work exactly like queue matches (to 10, no draws, 1-0 = FF) and
  **also affect Elo**.
- Win as challenger and you **take their spot** (everyone below shifts
  down). Lose as challenger and you get a **3-day cooldown**.
- The panel shows movement symbols next to names: 🔺 climbed a place,
  🛡️ defended their spot, 🔻 dropped a place. Symbols reset when a ref
  sets a fresh top 10.
- Ranked players can press **Leave Ladder** to give up their spot -
  everyone below moves up a place (not allowed mid-challenge).

### Leaderboard + history channels

Three dedicated channels, each set up by a ref running one command in it:

- `/setup_elo_lb` - the bot posts a **live Elo leaderboard embed** that
  auto-updates after every match, void, and decay pass.
- `/setup_queue_history` - every queue match result (and ref-entered
  tournament game) is logged here with the score and both Elo changes.
- `/setup_ladder_history` - every ladder match result is logged here.

Void notices go to the matching history channel.

### Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/elo [user]` | anyone | Profile embed: avatar, Elo, rank, W-L, most wins vs / most losses vs (with records), decay status |
| `/leaderboard` | anyone | Every player ranked highest to lowest with their place |
| `/history [user]` | anyone | Last 10 matches (queue, ladder, and ref entries) |
| `/setup_queue` | ref | Post the queue panel in the current channel |
| `/setup_ladder` | ref | Post the ladder panel in the current channel |
| `/setup_elo_lb` | ref | Live Elo leaderboard in the current channel |
| `/setup_queue_history` | ref | Log queue/ref match results in the current channel |
| `/setup_ladder_history` | ref | Log ladder match results in the current channel |
| `/set_top10 p1..p10` | ref | Set the ladder rankings, rank 1 first |
| `/refmatch winner loser ws ls` | ref | Manually enter a result (e.g. tournament games) - affects Elo |
| `/void match_id` | ref | Void a completed match and reverse its Elo |
| `/extend days` | ref | Extend the current challenge thread's deadline |
| `/set_ref_role role` | admin | Set the ref/mod role |

**Who counts as a ref:** anyone with Manage Server permission, the role set
via `/set_ref_role`, or a role literally named **Ref Administrator** /
ref / refs / referee / mod / mods (case-insensitive). Refs are added to
every private match thread automatically.

### Setup

1. Create an application + bot at <https://discord.com/developers/applications>,
   enable the **Server Members** intent, and invite it with the `bot` +
   `applications.commands` scopes (needs permissions to create public and
   private threads, send messages, and embed links).
2. Install and run:

   ```sh
   pip install -r requirements.txt
   DISCORD_TOKEN=<your bot token> python bot.py
   ```

Data persists in `elo_data.json`. All tuning knobs (starting Elo, K-factor,
decay, forfeit penalty, cooldowns, deadlines) are constants at the top of
`core.py`.
