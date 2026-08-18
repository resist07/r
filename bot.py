"""1v1 Elo Discord bot: matchmaking queue, top-10 challenge ladder, Elo decay.

Run:
    pip install -r requirements.txt
    DISCORD_TOKEN=<your bot token> python bot.py

See README.md for the full feature list and setup.
"""

import os
from datetime import datetime, timedelta

import discord
from discord import app_commands
from discord.ext import tasks

import core
import ui

intents = discord.Intents.default()
intents.members = True  # needed to resolve names on the leaderboard/ladder


class EloBot(discord.Client):
    def __init__(self):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

    async def setup_hook(self):
        # re-register persistent views so buttons survive restarts
        self.add_view(ui.QueuePanelView())
        self.add_view(ui.LadderPanelView())
        self.add_view(ui.MatchView())
        self.add_view(ui.ConfirmView())
        await self.tree.sync()


client = EloBot()
tree = client.tree


def ref_check(interaction: discord.Interaction, data: dict) -> bool:
    return isinstance(interaction.user, discord.Member) \
        and ui.is_ref(interaction.user, data)


@client.event
async def on_ready():
    if not maintenance_loop.is_running():
        maintenance_loop.start()
    print(f"Logged in as {client.user}")


# ---------------------------------------------------------------- setup cmds

@tree.command(name="setup_queue", description="Post the 1v1 queue panel in this channel (ref)")
async def setup_queue(interaction: discord.Interaction):
    data = core.load_data()
    if not ref_check(interaction, data):
        await interaction.response.send_message("Refs only.", ephemeral=True)
        return
    await interaction.response.send_message(
        embed=ui.build_queue_embed(data, interaction.guild),
        view=ui.QueuePanelView(),
    )
    message = await interaction.original_response()
    with core.lock:
        data = core.load_data()
        data["config"]["queue_channel_id"] = interaction.channel.id
        data["config"]["queue_message_id"] = message.id
        core.save_data(data)


@tree.command(name="setup_ladder", description="Post the top-10 ladder panel in this channel (ref)")
async def setup_ladder(interaction: discord.Interaction):
    data = core.load_data()
    if not ref_check(interaction, data):
        await interaction.response.send_message("Refs only.", ephemeral=True)
        return
    await interaction.response.send_message(
        embed=ui.build_ladder_embed(data, interaction.guild),
        view=ui.LadderPanelView(),
    )
    message = await interaction.original_response()
    with core.lock:
        data = core.load_data()
        data["config"]["ladder_channel_id"] = interaction.channel.id
        data["config"]["ladder_message_id"] = message.id
        core.save_data(data)


@tree.command(name="set_ref_role", description="Set which role counts as ref/mod (admin)")
async def set_ref_role(interaction: discord.Interaction, role: discord.Role):
    if not interaction.user.guild_permissions.manage_guild:
        await interaction.response.send_message(
            "You need Manage Server permission for this.", ephemeral=True)
        return
    with core.lock:
        data = core.load_data()
        data["config"]["ref_role_id"] = role.id
        core.save_data(data)
    await interaction.response.send_message(
        f"Ref role set to {role.mention}.",
        allowed_mentions=discord.AllowedMentions.none())


@tree.command(name="set_top10", description="Set the ladder top 10, rank 1 first (ref)")
@app_commands.describe(p1="Rank 1", p2="Rank 2", p3="Rank 3", p4="Rank 4",
                       p5="Rank 5", p6="Rank 6", p7="Rank 7", p8="Rank 8",
                       p9="Rank 9", p10="Rank 10")
async def set_top10(interaction: discord.Interaction,
                    p1: discord.Member, p2: discord.Member, p3: discord.Member,
                    p4: discord.Member, p5: discord.Member, p6: discord.Member,
                    p7: discord.Member, p8: discord.Member, p9: discord.Member,
                    p10: discord.Member):
    members = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10]
    with core.lock:
        data = core.load_data()
        if not ref_check(interaction, data):
            await interaction.response.send_message("Refs only.", ephemeral=True)
            return
        if len({m.id for m in members}) != len(members):
            await interaction.response.send_message(
                "Each rank must be a different player.", ephemeral=True)
            return
        if any(m.bot for m in members):
            await interaction.response.send_message(
                "Bots can't be on the ladder.", ephemeral=True)
            return
        data["ladder"] = [m.id for m in members]
        for m in members:
            core.get_player(data, m.id)
        core.save_data(data)
    await interaction.response.send_message("Ladder updated.")
    await ui.refresh_ladder_panel(client, data)


# ---------------------------------------------------------------- stats cmds

@tree.command(name="elo", description="Show a player's Elo profile")
@app_commands.describe(user="Player to look up (default: you)")
async def elo(interaction: discord.Interaction, user: discord.Member | None = None):
    target = user or interaction.user
    with core.lock:
        data = core.load_data()
        player = core.get_player(data, target.id)
        if core.apply_decay(player):
            core.save_data(data)

        standings = sorted(data["players"].items(),
                           key=lambda kv: kv[1]["rating"], reverse=True)
        rank = next(i for i, (uid, _) in enumerate(standings, 1)
                    if uid == str(target.id))
        records = core.head_to_head(data, target.id)

    embed = discord.Embed(
        title=target.display_name,
        description=f"**{player['rating']} Elo** - rank #{rank} of {len(standings)}",
        color=discord.Color.blurple(),
    )
    embed.set_thumbnail(url=target.display_avatar.url)
    embed.add_field(name="Record",
                    value=f"{player['wins']}W - {player['losses']}L", inline=True)
    embed.add_field(name="Status", value=core.decay_status(player), inline=True)

    if records:
        victim_id, (vw, vl) = max(records.items(), key=lambda kv: kv[1][0])
        nemesis_id, (nw, nl) = max(records.items(), key=lambda kv: kv[1][1])
        if vw > 0:
            embed.add_field(
                name="Most wins vs",
                value=f"{ui.display_name(interaction.guild, victim_id)} ({vw}-{vl})",
                inline=False)
        if nl > 0:
            embed.add_field(
                name="Most losses vs",
                value=f"{ui.display_name(interaction.guild, nemesis_id)} ({nw}-{nl})",
                inline=False)
    await interaction.response.send_message(embed=embed)


@tree.command(name="leaderboard", description="Everyone ranked from highest to lowest Elo")
async def leaderboard(interaction: discord.Interaction):
    with core.lock:
        data = core.load_data()
        if core.apply_decay_all(data):
            core.save_data(data)
        standings = sorted(data["players"].items(),
                           key=lambda kv: kv[1]["rating"], reverse=True)

    if not standings:
        await interaction.response.send_message("No players yet.")
        return

    lines = []
    for rank, (uid, p) in enumerate(standings, 1):
        name = ui.display_name(interaction.guild, int(uid))
        lines.append(f"`#{rank:>3}` **{name}** - {p['rating']} "
                     f"({p['wins']}W-{p['losses']}L)")

    chunks, chunk = [], "__**Leaderboard**__"
    for line in lines:
        if len(chunk) + len(line) + 1 > 1900:
            chunks.append(chunk)
            chunk = line
        else:
            chunk += "\n" + line
    chunks.append(chunk)

    await interaction.response.send_message(
        chunks[0], allowed_mentions=discord.AllowedMentions.none())
    for chunk in chunks[1:]:
        await interaction.followup.send(
            chunk, allowed_mentions=discord.AllowedMentions.none())


@tree.command(name="history", description="Recent matches")
@app_commands.describe(user="Only show matches involving this player")
async def history(interaction: discord.Interaction, user: discord.Member | None = None):
    data = core.load_data()
    matches = [m for m in data["matches"] if not m["voided"]]
    if user:
        matches = [m for m in matches
                   if user.id in (m["winner_id"], m["loser_id"])]
    matches = matches[-10:]
    if not matches:
        await interaction.response.send_message("No matches found.")
        return
    lines = []
    for m in reversed(matches):
        when = datetime.fromisoformat(m["at"]).strftime("%b %d")
        tag = {"ladder": " [ladder]", "ref": " [ref entry]"}.get(m["type"], "")
        ff = " FF" if m["ff"] else ""
        lines.append(f"`#{m['id']}` {when}: <@{m['winner_id']}> def. "
                     f"<@{m['loser_id']}> {m['score']}{ff}{tag}")
    await interaction.response.send_message(
        "__**Recent matches**__\n" + "\n".join(lines),
        allowed_mentions=discord.AllowedMentions.none())


# ---------------------------------------------------------------- ref cmds

@tree.command(name="refmatch",
              description="Manually enter a match result, e.g. from a tournament (ref)")
@app_commands.describe(winner="Match winner", loser="Match loser",
                       winner_score="Winner's score (10, or 1 for a forfeit win)",
                       loser_score="Loser's score (0-9, or 0 for a forfeit)")
async def refmatch(interaction: discord.Interaction,
                   winner: discord.Member, loser: discord.Member,
                   winner_score: app_commands.Range[int, 1, core.WIN_SCORE],
                   loser_score: app_commands.Range[int, 0, core.WIN_SCORE - 1]):
    with core.lock:
        data = core.load_data()
        if not ref_check(interaction, data):
            await interaction.response.send_message("Refs only.", ephemeral=True)
            return
        if winner.id == loser.id or winner.bot or loser.bot:
            await interaction.response.send_message(
                "Pick two different human players.", ephemeral=True)
            return
        parsed = core.parse_scores(winner_score, loser_score)
        if parsed is None or not parsed[3]:
            await interaction.response.send_message(
                f"Invalid score: use {core.WIN_SCORE} vs 0-{core.WIN_SCORE - 1}, "
                "or 1-0 for a forfeit. No draws.", ephemeral=True)
            return
        w_score, l_score, ff, _ = parsed
        match = core.apply_match(data, winner.id, loser.id, w_score, l_score,
                                 ff, "ref")
        core.save_data(data)
    await interaction.response.send_message(
        content=f"Entered by {interaction.user.mention}:",
        embed=ui.build_result_embed(data, interaction.guild, match))
    await ui.refresh_ladder_panel(client, data)


@tree.command(name="void", description="Void a completed match and undo its Elo (ref)")
@app_commands.describe(match_id="Match id (shown in results and /history)")
async def void(interaction: discord.Interaction, match_id: int):
    with core.lock:
        data = core.load_data()
        if not ref_check(interaction, data):
            await interaction.response.send_message("Refs only.", ephemeral=True)
            return
        match = core.find_match(data, match_id)
        if match is None:
            await interaction.response.send_message(
                f"No match #{match_id}.", ephemeral=True)
            return
        if not core.void_match(data, match):
            await interaction.response.send_message(
                f"Match #{match_id} is already voided.", ephemeral=True)
            return
        core.save_data(data)
    await interaction.response.send_message(
        f"Match #{match_id} voided - Elo changes reversed. "
        "(Ladder positions are not auto-reverted; use /set_top10 if needed.)")
    await ui.refresh_ladder_panel(client, data)


@tree.command(name="extend", description="Extend the current ladder challenge's deadline (ref)")
@app_commands.describe(days="Days to add")
async def extend(interaction: discord.Interaction,
                 days: app_commands.Range[int, 1, 30]):
    with core.lock:
        data = core.load_data()
        if not ref_check(interaction, data):
            await interaction.response.send_message("Refs only.", ephemeral=True)
            return
        challenge = core.challenge_by_thread(data, interaction.channel.id)
        if challenge is None:
            await interaction.response.send_message(
                "Run this inside an active ladder challenge thread.",
                ephemeral=True)
            return
        deadline = datetime.fromisoformat(challenge["deadline"]) + timedelta(days=days)
        challenge["deadline"] = deadline.isoformat()
        core.save_data(data)
    await interaction.response.send_message(
        f"Deadline extended to <t:{int(deadline.timestamp())}:F> "
        f"(<t:{int(deadline.timestamp())}:R>).")


# ---------------------------------------------------------------- background

@tasks.loop(hours=1)
async def maintenance_loop():
    expired = []
    with core.lock:
        data = core.load_data()
        changed = core.apply_decay_all(data)
        for c in data["challenges"]:
            if c["status"] == "active" and \
                    datetime.fromisoformat(c["deadline"]) <= core.now():
                c["status"] = "expired"
                if c["thread_id"]:
                    data["active_matches"].pop(str(c["thread_id"]), None)
                expired.append(c)
                changed = True
        if changed:
            core.save_data(data)

    for c in expired:
        thread = client.get_channel(c["thread_id"]) if c["thread_id"] else None
        if thread:
            try:
                await thread.send(
                    f"This challenge expired unplayed after "
                    f"{core.CHALLENGE_DAYS} days. {ui.ref_mention(data)} can "
                    "re-arrange it if needed.")
                await thread.edit(archived=True, locked=True)
            except discord.HTTPException:
                pass
        channel = client.get_channel(data["config"].get("ladder_channel_id") or 0)
        if channel:
            await channel.send(
                f"Ladder challenge <@{c['challenger']}> vs <@{c['challenged']}> "
                "expired unplayed.",
                allowed_mentions=discord.AllowedMentions.none())


@maintenance_loop.before_loop
async def before_maintenance():
    await client.wait_until_ready()


def main():
    token = os.environ.get("DISCORD_TOKEN")
    if not token:
        raise SystemExit("Set the DISCORD_TOKEN environment variable.")
    client.run(token)


if __name__ == "__main__":
    main()
