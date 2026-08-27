"""Discord UI for the Elo bot: queue panel, match threads, ladder panel.

All views are persistent (fixed custom_ids, timeout=None) so buttons keep
working after the bot restarts. Per-match state lives in the data file keyed
by thread id, never on the view objects themselves.

The queue and ladder panels are "sticky": whenever something is posted in
their channel they are deleted and re-sent so they stay the most recent
message.
"""

from datetime import datetime, timedelta

import discord

import core


# ---------------------------------------------------------------- helpers

def is_ref(member: discord.Member, data: dict) -> bool:
    if member.guild_permissions.manage_guild:
        return True
    ref_role_id = data["config"].get("ref_role_id")
    return any(
        role.id == ref_role_id or role.name.lower() in core.REF_ROLE_NAMES
        for role in member.roles
    )


def find_ref_role(guild: discord.Guild | None, data: dict) -> discord.Role | None:
    if guild is None:
        return None
    ref_role_id = data["config"].get("ref_role_id")
    if ref_role_id:
        role = guild.get_role(ref_role_id)
        if role:
            return role
    for role in guild.roles:
        if role.name.lower() in core.REF_ROLE_NAMES:
            return role
    return None


def display_name(guild: discord.Guild | None, user_id: int) -> str:
    member = guild.get_member(user_id) if guild else None
    return member.display_name if member else f"<@{user_id}>"


def ref_mention(data: dict) -> str:
    ref_role_id = data["config"].get("ref_role_id")
    return f"<@&{ref_role_id}>" if ref_role_id else "a ref"


async def safe_edit_message(channel, message_id: int, **kwargs) -> None:
    try:
        message = await channel.fetch_message(message_id)
        await message.edit(**kwargs)
    except discord.HTTPException:
        pass


# ---------------------------------------------------------------- embeds

def build_queue_embed(data: dict, guild: discord.Guild | None) -> discord.Embed:
    embed = discord.Embed(
        title="1v1 Queue",
        description=(
            "Press **Join Queue** to look for a match. As soon as two players "
            "are in, a **private match thread** (players + refs only) is "
            "created.\n\n"
            f"Games are first to **{core.WIN_SCORE}**, no draws. "
            "Report **1-0** for a forfeit."
        ),
        color=discord.Color.blurple(),
    )
    queue = data["queue"]
    if queue:
        lines = [f"{i}. {display_name(guild, uid)}" for i, uid in enumerate(queue, 1)]
        embed.add_field(name=f"Waiting ({len(queue)})", value="\n".join(lines))
    else:
        embed.add_field(name="Waiting (0)", value="Nobody in queue.")
    return embed


def build_ladder_embed(data: dict, guild: discord.Guild | None) -> discord.Embed:
    embed = discord.Embed(
        title=f"Top {core.LADDER_SIZE} Ladder",
        description=(
            "Press **Challenge** to call out the player directly above you "
            f"(or **#{core.LADDER_SIZE}** if you're unranked). Win and you take "
            f"their spot. Lose as challenger and you're on a "
            f"{core.COOLDOWN_DAYS}-day cooldown.\n"
            f"Challenges must be played within **{core.CHALLENGE_DAYS} days**.\n\n"
            "\N{UP-POINTING RED TRIANGLE} climbed \N{BULLET} "
            "\N{SHIELD}\N{VARIATION SELECTOR-16} defended \N{BULLET} "
            "\N{DOWN-POINTING RED TRIANGLE} dropped"
        ),
        color=discord.Color.gold(),
    )
    lad = data["ladder"]
    symbols = {
        "up": "\N{UP-POINTING RED TRIANGLE} ",
        "down": "\N{DOWN-POINTING RED TRIANGLE} ",
        "defended": "\N{SHIELD}\N{VARIATION SELECTOR-16} ",
    }
    if lad:
        lines = []
        for i, uid in enumerate(lad, 1):
            rating = data["players"].get(str(uid), {}).get("rating", core.STARTING_ELO)
            sym = symbols.get(data["ladder_status"].get(str(uid)), "")
            lines.append(f"**#{i}** {sym}{display_name(guild, uid)} - {rating} Elo")
        embed.add_field(name="Rankings", value="\n".join(lines))
    else:
        embed.add_field(name="Rankings", value="Not set yet. A ref runs /set_top10.")
    return embed


def build_result_embed(data: dict, guild: discord.Guild | None, match: dict) -> discord.Embed:
    winner = display_name(guild, match["winner_id"])
    loser = display_name(guild, match["loser_id"])
    w_rating = data["players"][str(match["winner_id"])]["rating"]
    l_rating = data["players"][str(match["loser_id"])]["rating"]
    title = f"Match #{match['id']}: {winner} def. {loser} {match['score']}"
    if match["ff"]:
        title += " (forfeit)"
    embed = discord.Embed(title=title, color=discord.Color.green())
    embed.description = (
        f"**{winner}**: {w_rating} (+{match['winner_change']})\n"
        f"**{loser}**: {l_rating} (-{match['loser_change']})"
    )
    if match["ff"]:
        embed.set_footer(text=f"Forfeit: the FF'd player loses {core.FF_PENALTY}x Elo.")
    return embed


def build_lb_embed(data: dict, guild: discord.Guild | None,
                   limit: int = 20) -> discord.Embed:
    standings = sorted(data["players"].items(),
                       key=lambda kv: kv[1]["rating"], reverse=True)
    lines = [
        f"`#{rank:>3}` **{display_name(guild, int(uid))}** - {p['rating']} "
        f"({p['wins']}W-{p['losses']}L)"
        for rank, (uid, p) in enumerate(standings[:limit], 1)
    ]
    embed = discord.Embed(
        title="Elo Leaderboard",
        description="\n".join(lines) if lines else "No players yet.",
        color=discord.Color.blurple(),
    )
    if len(standings) > limit:
        embed.set_footer(text=f"Top {limit} of {len(standings)} - "
                              "use /leaderboard for the full list.")
    embed.timestamp = core.now()
    return embed


# ---------------------------------------------------------------- panels/log

async def repost_panel(client: discord.Client, kind: str) -> None:
    """Delete and re-send a panel so it's the newest message in its channel.

    kind is "queue" or "ladder".
    """
    with core.lock:
        data = core.load_data()
    channel = client.get_channel(data["config"].get(f"{kind}_channel_id") or 0)
    if not channel:
        return
    old_id = data["config"].get(f"{kind}_message_id")
    if kind == "queue":
        embed, view = build_queue_embed(data, channel.guild), QueuePanelView()
    else:
        embed, view = build_ladder_embed(data, channel.guild), LadderPanelView()
    try:
        message = await channel.send(embed=embed, view=view)
    except discord.HTTPException:
        return
    with core.lock:
        data = core.load_data()
        data["config"][f"{kind}_message_id"] = message.id
        core.save_data(data)
    if old_id and old_id != message.id:
        try:
            old = await channel.fetch_message(old_id)
            await old.delete()
        except discord.HTTPException:
            pass


async def refresh_lb_channel(client: discord.Client, data: dict) -> None:
    channel_id = data["config"].get("lb_channel_id")
    message_id = data["config"].get("lb_message_id")
    if not channel_id or not message_id:
        return
    channel = client.get_channel(channel_id)
    if channel:
        await safe_edit_message(channel, message_id,
                                embed=build_lb_embed(data, channel.guild))


def history_channel(client: discord.Client, data: dict, mtype: str):
    key = "ladder_history_channel_id" if mtype == "ladder" \
        else "queue_history_channel_id"
    return client.get_channel(data["config"].get(key) or 0)


async def log_match(client: discord.Client, data: dict,
                    guild: discord.Guild | None, match: dict,
                    note: str | None = None) -> None:
    """Post a match result to the right history channel + refresh the Elo LB."""
    channel = history_channel(client, data, match["type"])
    if channel:
        try:
            await channel.send(content=note,
                               embed=build_result_embed(data, guild, match))
        except discord.HTTPException:
            pass
    await refresh_lb_channel(client, data)


# ---------------------------------------------------------------- match flow

async def start_match_thread(channel: discord.TextChannel, p1: int, p2: int,
                             mtype: str, challenge: dict | None = None) -> discord.Thread:
    """Create a private match thread (players + refs), store state, post panel."""
    guild = channel.guild
    name1, name2 = display_name(guild, p1), display_name(guild, p2)
    thread = await channel.create_thread(
        name=f"{'ladder' if mtype == 'ladder' else 'match'}-{name1}-vs-{name2}"[:100],
        type=discord.ChannelType.private_thread,
        invitable=False,
    )

    with core.lock:
        data = core.load_data()
        core.get_player(data, p1)
        core.get_player(data, p2)
        data["active_matches"][str(thread.id)] = {
            "p1": p1, "p2": p2, "type": mtype, "pending": None,
            "challenge_id": challenge["id"] if challenge else None,
        }
        core.save_data(data)

    members = [m for uid in (p1, p2) if (m := guild.get_member(uid))]
    ref_role = find_ref_role(guild, data)
    if ref_role:
        members += [m for m in ref_role.members if not m.bot][:25]
    for member in members:
        try:
            await thread.add_user(member)
        except discord.HTTPException:
            pass

    embed = discord.Embed(
        title=f"{name1} vs {name2}",
        description=(
            f"First to **{core.WIN_SCORE}** wins, no draws.\n"
            "When you're done, either player presses **Submit score** and the "
            "opponent confirms.\n"
            "Forfeit? Report the score as **1-0** (the FF'd player loses extra Elo)."
        ),
        color=discord.Color.gold() if mtype == "ladder" else discord.Color.blurple(),
    )
    if challenge:
        deadline = int(datetime.fromisoformat(challenge["deadline"]).timestamp())
        embed.add_field(
            name="Deadline",
            value=f"Play by <t:{deadline}:F> (<t:{deadline}:R>) or the "
                  "challenge expires. Refs can /extend it.",
        )
    await thread.send(f"<@{p1}> <@{p2}>", embed=embed, view=MatchView())
    return thread


async def finalize_match(interaction: discord.Interaction, active: dict,
                         pending: dict) -> None:
    """Apply the confirmed result: Elo, ladder movement, announcements."""
    thread = interaction.channel
    guild = interaction.guild
    with core.lock:
        data = core.load_data()
        match = core.apply_match(
            data, pending["winner"], pending["loser"],
            pending["w_score"], pending["l_score"], pending["ff"],
            active["type"], thread_id=thread.id,
        )
        challenge = None
        if active["challenge_id"] is not None:
            for c in data["challenges"]:
                if c["id"] == active["challenge_id"]:
                    challenge = c
                    break
        if challenge:
            challenge["status"] = "done"
            challenge["match_id"] = match["id"]
            if pending["winner"] == challenge["challenger"]:
                old_ladder = list(data["ladder"])
                core.ladder_apply_win(data, challenge["challenger"],
                                      challenge["challenged"])
                core.update_movement(data, old_ladder)
            else:
                core.mark_defended(data, challenge["challenged"])
                core.start_cooldown(data, challenge["challenger"])
        data["active_matches"].pop(str(thread.id), None)
        core.save_data(data)

    result = build_result_embed(data, guild, match)
    await interaction.response.edit_message(content="Result confirmed.", view=None)
    await thread.send(embed=result)

    parent = thread.parent
    if parent:
        await parent.send(embed=result)
    await log_match(interaction.client, data, guild, match)
    if challenge and pending["winner"] == challenge["challenger"] and parent:
        lad = data["ladder"]
        if challenge["challenger"] in lad:
            rank = lad.index(challenge["challenger"]) + 1
            await parent.send(
                f"<@{challenge['challenger']}> climbs to **#{rank}**!",
                allowed_mentions=discord.AllowedMentions.none(),
            )
    await repost_panel(interaction.client,
                       "ladder" if active["type"] == "ladder" else "queue")
    try:
        await thread.edit(archived=True, locked=True)
    except discord.HTTPException:
        pass


class ScoreModal(discord.ui.Modal, title="Submit result (first to 10)"):
    own = discord.ui.TextInput(
        label="Your score (10 = win, 1-0 = forfeit)", max_length=2)
    opp = discord.ui.TextInput(label="Opponent's score", max_length=2)

    async def on_submit(self, interaction: discord.Interaction):
        try:
            a, b = int(str(self.own.value)), int(str(self.opp.value))
        except ValueError:
            await interaction.response.send_message(
                "Scores must be numbers.", ephemeral=True)
            return
        parsed = core.parse_scores(a, b)
        if parsed is None:
            await interaction.response.send_message(
                f"Invalid score. Games go to {core.WIN_SCORE} "
                f"({core.WIN_SCORE} vs 0-{core.WIN_SCORE - 1}), or 1-0 for a "
                "forfeit. Draws aren't allowed.", ephemeral=True)
            return
        w_score, l_score, ff, reporter_won = parsed

        with core.lock:
            data = core.load_data()
            active = data["active_matches"].get(str(interaction.channel.id))
            if not active:
                await interaction.response.send_message(
                    "This match is no longer active.", ephemeral=True)
                return
            reporter = interaction.user.id
            other = active["p2"] if reporter == active["p1"] else active["p1"]
            winner, loser = (reporter, other) if reporter_won else (other, reporter)
            active["pending"] = {
                "reporter": reporter, "winner": winner, "loser": loser,
                "w_score": w_score, "l_score": l_score, "ff": ff,
            }
            core.save_data(data)

        summary = f"<@{winner}> def. <@{loser}> **{w_score}-{l_score}**"
        if ff:
            summary += " (forfeit)"
        await interaction.response.send_message(
            f"{interaction.user.mention} reported: {summary}\n"
            f"<@{other}>, press **Confirm** to lock it in.",
            view=ConfirmView(),
        )


class MatchView(discord.ui.View):
    """Lives on the first message of every match thread."""

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Submit score", style=discord.ButtonStyle.primary,
                       custom_id="elo:match_submit")
    async def submit(self, interaction: discord.Interaction, _):
        data = core.load_data()
        active = data["active_matches"].get(str(interaction.channel.id))
        if not active:
            await interaction.response.send_message(
                "This match is no longer active.", ephemeral=True)
            return
        if interaction.user.id not in (active["p1"], active["p2"]):
            await interaction.response.send_message(
                "Only the two players can submit the score.", ephemeral=True)
            return
        await interaction.response.send_modal(ScoreModal())

    @discord.ui.button(label="Void match (ref)", style=discord.ButtonStyle.danger,
                       custom_id="elo:match_void")
    async def void(self, interaction: discord.Interaction, _):
        with core.lock:
            data = core.load_data()
            if not is_ref(interaction.user, data):
                await interaction.response.send_message(
                    "Only refs can void a match.", ephemeral=True)
                return
            active = data["active_matches"].pop(str(interaction.channel.id), None)
            if not active:
                await interaction.response.send_message(
                    "This match is no longer active.", ephemeral=True)
                return
            if active["challenge_id"] is not None:
                for c in data["challenges"]:
                    if c["id"] == active["challenge_id"]:
                        c["status"] = "voided"
            core.save_data(data)
        await interaction.response.send_message(
            f"Match voided by {interaction.user.mention}. No Elo changes.")
        try:
            await interaction.channel.edit(archived=True, locked=True)
        except discord.HTTPException:
            pass


class ConfirmView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Confirm", style=discord.ButtonStyle.success,
                       custom_id="elo:match_confirm")
    async def confirm(self, interaction: discord.Interaction, _):
        data = core.load_data()
        active = data["active_matches"].get(str(interaction.channel.id))
        if not active or not active["pending"]:
            await interaction.response.send_message(
                "Nothing to confirm here.", ephemeral=True)
            return
        pending = active["pending"]
        is_opponent = (
            interaction.user.id in (active["p1"], active["p2"])
            and interaction.user.id != pending["reporter"]
        )
        if not is_opponent and not is_ref(interaction.user, data):
            await interaction.response.send_message(
                "The opponent (or a ref) has to confirm, not the reporter.",
                ephemeral=True)
            return
        await finalize_match(interaction, active, pending)

    @discord.ui.button(label="Dispute", style=discord.ButtonStyle.danger,
                       custom_id="elo:match_dispute")
    async def dispute(self, interaction: discord.Interaction, _):
        with core.lock:
            data = core.load_data()
            active = data["active_matches"].get(str(interaction.channel.id))
            if not active or not active["pending"]:
                await interaction.response.send_message(
                    "Nothing to dispute here.", ephemeral=True)
                return
            if interaction.user.id not in (active["p1"], active["p2"]) \
                    and not is_ref(interaction.user, data):
                await interaction.response.send_message(
                    "Only the players or a ref can dispute.", ephemeral=True)
                return
            active["pending"] = None
            core.save_data(data)
        await interaction.response.edit_message(
            content="Result disputed - report cancelled.", view=None)
        await interaction.channel.send(
            f"{interaction.user.mention} disputed the reported score. "
            f"Re-submit the correct score, or ping {ref_mention(data)} to sort it out."
        )


# ---------------------------------------------------------------- queue panel

class QueuePanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Join Queue", style=discord.ButtonStyle.success,
                       custom_id="elo:queue_join")
    async def join(self, interaction: discord.Interaction, _):
        uid = interaction.user.id
        pair = None
        with core.lock:
            data = core.load_data()
            if uid in data["queue"]:
                await interaction.response.send_message(
                    "You're already in the queue.", ephemeral=True)
                return
            if core.user_in_active_match(data, uid):
                await interaction.response.send_message(
                    "Finish your current match first.", ephemeral=True)
                return
            core.get_player(data, uid)
            data["queue"].append(uid)
            if len(data["queue"]) >= 2:
                pair = (data["queue"][0], data["queue"][1])
                del data["queue"][:2]
            core.save_data(data)

        await interaction.response.defer()
        channel = interaction.channel
        if pair:
            thread = await start_match_thread(channel, pair[0], pair[1], "queue")
            await channel.send(
                f"Match found: <@{pair[0]}> vs <@{pair[1]}> - your private "
                f"match thread is ready: {thread.mention}")
        else:
            await channel.send(
                f"{interaction.user.mention} joined the queue and is waiting "
                "for an opponent - press **Join Queue** to face them!")
        await repost_panel(interaction.client, "queue")

    @discord.ui.button(label="Leave Queue", style=discord.ButtonStyle.secondary,
                       custom_id="elo:queue_leave")
    async def leave(self, interaction: discord.Interaction, _):
        uid = interaction.user.id
        with core.lock:
            data = core.load_data()
            if uid not in data["queue"]:
                await interaction.response.send_message(
                    "You're not in the queue.", ephemeral=True)
                return
            data["queue"].remove(uid)
            core.save_data(data)
        await interaction.response.defer()
        await interaction.channel.send(f"{interaction.user.mention} left the queue.")
        await repost_panel(interaction.client, "queue")


# ---------------------------------------------------------------- ladder panel

class LadderPanelView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Challenge", style=discord.ButtonStyle.primary,
                       custom_id="elo:ladder_challenge")
    async def challenge(self, interaction: discord.Interaction, _):
        uid = interaction.user.id
        with core.lock:
            data = core.load_data()
            until = core.cooldown_until(data, uid)
            if until:
                await interaction.response.send_message(
                    "You lost your last challenge - you can challenge again "
                    f"<t:{int(until.timestamp())}:R>.", ephemeral=True)
                core.save_data(data)
                return
            if core.active_challenge_for(data, uid):
                await interaction.response.send_message(
                    "You're already in an active challenge.", ephemeral=True)
                return
            target, reason = core.challenge_target(data, uid)
            if target is None:
                await interaction.response.send_message(reason, ephemeral=True)
                return
            if core.active_challenge_for(data, target) \
                    or core.user_in_active_match(data, target):
                await interaction.response.send_message(
                    f"{display_name(interaction.guild, target)} is already in "
                    "a match or challenge - try again once it's done.",
                    ephemeral=True)
                return
            challenge = {
                "id": data["next_challenge_id"],
                "challenger": uid,
                "challenged": target,
                "thread_id": None,
                "deadline": (core.now() + timedelta(days=core.CHALLENGE_DAYS)).isoformat(),
                "status": "active",
            }
            data["next_challenge_id"] += 1
            data["challenges"].append(challenge)
            core.save_data(data)

        await interaction.response.defer()
        thread = await start_match_thread(
            interaction.channel, uid, target, "ladder", challenge=challenge)

        with core.lock:
            data = core.load_data()
            for c in data["challenges"]:
                if c["id"] == challenge["id"]:
                    c["thread_id"] = thread.id
            core.save_data(data)

        lad = data["ladder"]
        rank = f"#{lad.index(target) + 1}" if target in lad else "?"
        await interaction.channel.send(
            f"<@{uid}> has challenged <@{target}> ({rank})! They have "
            f"{core.CHALLENGE_DAYS} days to play it out."
        )
        await repost_panel(interaction.client, "ladder")

    @discord.ui.button(label="Leave Ladder", style=discord.ButtonStyle.secondary,
                       custom_id="elo:ladder_leave")
    async def leave(self, interaction: discord.Interaction, _):
        uid = interaction.user.id
        with core.lock:
            data = core.load_data()
            if uid not in data["ladder"]:
                await interaction.response.send_message(
                    "You're not on the ladder.", ephemeral=True)
                return
            if core.active_challenge_for(data, uid):
                await interaction.response.send_message(
                    "Finish (or have a ref void) your active challenge before "
                    "leaving the ladder.", ephemeral=True)
                return
            rank = data["ladder"].index(uid) + 1
            core.ladder_leave(data, uid)
            core.save_data(data)
        await interaction.response.defer()
        await interaction.channel.send(
            f"{interaction.user.mention} left the ladder, giving up **#{rank}** - "
            "everyone below moves up a spot.")
        await repost_panel(interaction.client, "ladder")
