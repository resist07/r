"""1v1 Elo ladder Discord bot.

Rules:
- Every player starts at 1000 Elo (registered automatically on first command).
- Games are first-to-10. The WINNER reports the result with /report,
  entering their score of 10 and the loser's score (0-9).
- Bigger blowouts move ratings slightly more (margin-of-victory multiplier).
- After 7 days without playing, a player's rating slowly decays
  (DECAY_PER_DAY points per day) until they play again or hit RATING_FLOOR.

Run:
    pip install -r requirements.txt
    DISCORD_TOKEN=<your bot token> python bot.py
"""

import json
import os
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import tasks

# ---------------------------------------------------------------- config

STARTING_ELO = 1000
K_FACTOR = 32
WIN_SCORE = 10          # games are first-to-10; the winner always enters 10

GRACE_DAYS = 7          # days of inactivity before decay starts
DECAY_PER_DAY = 2       # Elo lost per day once decay starts
RATING_FLOOR = 800      # decay never drops a player below this

DATA_FILE = Path(__file__).parent / "elo_data.json"

# ---------------------------------------------------------------- storage

_lock = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def load_data() -> dict:
    if DATA_FILE.exists():
        with open(DATA_FILE) as f:
            return json.load(f)
    return {"players": {}, "matches": []}


def save_data(data: dict) -> None:
    tmp = DATA_FILE.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    tmp.replace(DATA_FILE)


def get_player(data: dict, user_id: int) -> dict:
    key = str(user_id)
    if key not in data["players"]:
        now = _now().isoformat()
        data["players"][key] = {
            "rating": STARTING_ELO,
            "wins": 0,
            "losses": 0,
            "last_active": now,
            "last_decay": now,
        }
    return data["players"][key]


# ---------------------------------------------------------------- elo math

def expected_score(rating_a: float, rating_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def rating_change(winner_elo: int, loser_elo: int, loser_score: int) -> int:
    # 10-0 scales K by 1.5x, 10-9 by 1.05x
    mov = 1.0 + ((WIN_SCORE - loser_score) / WIN_SCORE) * 0.5
    change = K_FACTOR * mov * (1.0 - expected_score(winner_elo, loser_elo))
    return max(1, round(change))


# ---------------------------------------------------------------- decay

def apply_decay(player: dict, now: datetime | None = None) -> int:
    """Apply any decay owed to a player. Returns Elo points removed."""
    now = now or _now()
    last_active = datetime.fromisoformat(player["last_active"])
    last_decay = datetime.fromisoformat(player["last_decay"])
    decay_start = max(last_active + timedelta(days=GRACE_DAYS), last_decay)

    days_owed = (now - decay_start).days
    if days_owed <= 0:
        return 0

    loss = min(days_owed * DECAY_PER_DAY, max(0, player["rating"] - RATING_FLOOR))
    player["rating"] -= loss
    player["last_decay"] = (decay_start + timedelta(days=days_owed)).isoformat()
    return loss


def apply_decay_all(data: dict) -> bool:
    now = _now()
    changed = False
    for player in data["players"].values():
        if apply_decay(player, now):
            changed = True
    return changed


def decay_status(player: dict) -> str:
    idle = _now() - datetime.fromisoformat(player["last_active"])
    days_left = GRACE_DAYS - idle.days
    if days_left > 0:
        return f"active (decay in {days_left}d)"
    return f"decaying -{DECAY_PER_DAY}/day"


# ---------------------------------------------------------------- bot

intents = discord.Intents.default()
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)


@client.event
async def on_ready():
    await tree.sync()
    if not decay_loop.is_running():
        decay_loop.start()
    print(f"Logged in as {client.user}")


@tasks.loop(hours=1)
async def decay_loop():
    with _lock:
        data = load_data()
        if apply_decay_all(data):
            save_data(data)


@tree.command(name="report", description="Winner reports a 1v1 result (first to 10)")
@app_commands.describe(
    opponent="Who you beat",
    your_score="Your score (always 10, you won)",
    their_score="Opponent's score (0-9)",
)
async def report(
    interaction: discord.Interaction,
    opponent: discord.Member,
    your_score: app_commands.Range[int, WIN_SCORE, WIN_SCORE],
    their_score: app_commands.Range[int, 0, WIN_SCORE - 1],
):
    if opponent.id == interaction.user.id:
        await interaction.response.send_message(
            "You can't play against yourself.", ephemeral=True
        )
        return
    if opponent.bot:
        await interaction.response.send_message(
            "Bots don't have Elo.", ephemeral=True
        )
        return

    with _lock:
        data = load_data()
        winner = get_player(data, interaction.user.id)
        loser = get_player(data, opponent.id)

        # settle any pending decay before rating the match
        apply_decay(winner)
        apply_decay(loser)

        change = rating_change(winner["rating"], loser["rating"], their_score)
        loser_change = min(change, loser["rating"] - RATING_FLOOR)
        loser_change = max(0, loser_change)
        winner["rating"] += change
        loser["rating"] -= loser_change
        winner["wins"] += 1
        loser["losses"] += 1

        now = _now().isoformat()
        winner["last_active"] = now
        winner["last_decay"] = now
        loser["last_active"] = now
        loser["last_decay"] = now

        data["matches"].append({
            "winner_id": interaction.user.id,
            "loser_id": opponent.id,
            "score": f"{your_score}-{their_score}",
            "change": change,
            "loser_change": loser_change,
            "at": now,
        })
        save_data(data)

    await interaction.response.send_message(
        f"**{interaction.user.display_name}** def. **{opponent.display_name}** "
        f"{your_score}-{their_score}\n"
        f"{interaction.user.display_name}: {winner['rating']} (+{change})  |  "
        f"{opponent.display_name}: {loser['rating']} (-{loser_change})"
    )


@tree.command(name="elo", description="Show a player's Elo")
@app_commands.describe(player="Player to look up (default: you)")
async def elo(interaction: discord.Interaction, player: discord.Member | None = None):
    target = player or interaction.user
    with _lock:
        data = load_data()
        p = get_player(data, target.id)
        if apply_decay(p):
            save_data(data)
        rating, wins, losses = p["rating"], p["wins"], p["losses"]
        status = decay_status(p)

    await interaction.response.send_message(
        f"**{target.display_name}** — {rating} Elo "
        f"({wins}W-{losses}L, {status})"
    )


@tree.command(name="leaderboard", description="Top players by Elo")
async def leaderboard(interaction: discord.Interaction):
    with _lock:
        data = load_data()
        if apply_decay_all(data):
            save_data(data)
        players = sorted(
            data["players"].items(), key=lambda kv: kv[1]["rating"], reverse=True
        )[:15]

    if not players:
        await interaction.response.send_message("No matches reported yet.")
        return

    lines = []
    for rank, (user_id, p) in enumerate(players, start=1):
        member = interaction.guild.get_member(int(user_id)) if interaction.guild else None
        name = member.display_name if member else f"<@{user_id}>"
        lines.append(
            f"`#{rank:>2}` **{name}** — {p['rating']} ({p['wins']}W-{p['losses']}L)"
        )
    await interaction.response.send_message(
        "__**Leaderboard**__\n" + "\n".join(lines)
    )


@tree.command(name="history", description="Recent matches")
@app_commands.describe(player="Only show matches involving this player")
async def history(interaction: discord.Interaction, player: discord.Member | None = None):
    with _lock:
        data = load_data()
        matches = data["matches"]
        if player:
            matches = [
                m for m in matches
                if player.id in (m["winner_id"], m["loser_id"])
            ]
        matches = matches[-10:]

    if not matches:
        await interaction.response.send_message("No matches found.")
        return

    lines = []
    for m in reversed(matches):
        when = datetime.fromisoformat(m["at"]).strftime("%b %d")
        lines.append(
            f"{when}: <@{m['winner_id']}> def. <@{m['loser_id']}> "
            f"{m['score']} (±{m['change']})"
        )
    await interaction.response.send_message(
        "__**Recent matches**__\n" + "\n".join(lines),
        allowed_mentions=discord.AllowedMentions.none(),
    )


@tree.command(name="undo", description="Undo the last match you were part of")
async def undo(interaction: discord.Interaction):
    with _lock:
        data = load_data()
        match = None
        for m in reversed(data["matches"]):
            if interaction.user.id in (m["winner_id"], m["loser_id"]):
                match = m
                break
        if match is None:
            await interaction.response.send_message(
                "No match of yours to undo.", ephemeral=True
            )
            return
        if match is not data["matches"][-1]:
            await interaction.response.send_message(
                "Your last match isn't the most recent one recorded, so it "
                "can't be cleanly undone.", ephemeral=True
            )
            return

        data["matches"].pop()
        winner = get_player(data, match["winner_id"])
        loser = get_player(data, match["loser_id"])
        winner["rating"] -= match["change"]
        loser["rating"] += match.get("loser_change", match["change"])
        winner["wins"] -= 1
        loser["losses"] -= 1
        save_data(data)

    await interaction.response.send_message(
        f"Undid <@{match['winner_id']}> def. <@{match['loser_id']}> {match['score']}.",
        allowed_mentions=discord.AllowedMentions.none(),
    )


def main():
    token = os.environ.get("DISCORD_TOKEN")
    if not token:
        raise SystemExit("Set the DISCORD_TOKEN environment variable.")
    client.run(token)


if __name__ == "__main__":
    main()
