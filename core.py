"""Core logic for the 1v1 Elo bot: storage, Elo math, decay, matches, ladder.

No discord imports here so the logic is easy to test on its own.
"""

import json
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------- config

STARTING_ELO = 1000
K_FACTOR = 32
WIN_SCORE = 10          # games are first-to-10
FF_PENALTY = 1.5        # a forfeiting player loses 1.5x the normal Elo
GRACE_DAYS = 7          # days of inactivity before decay starts
DECAY_PER_DAY = 2       # Elo lost per day once decay starts
RATING_FLOOR = 800      # ratings never drop below this

LADDER_SIZE = 10        # the challenge ladder is a top 10
CHALLENGE_DAYS = 3      # days to play out a ladder challenge
COOLDOWN_DAYS = 3       # challenge cooldown after losing as challenger

REF_ROLE_NAMES = {"ref", "refs", "referee", "mod", "mods"}

DATA_FILE = Path(__file__).parent / "elo_data.json"

lock = threading.Lock()


def now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- storage

def load_data() -> dict:
    if DATA_FILE.exists():
        with open(DATA_FILE) as f:
            data = json.load(f)
    else:
        data = {}
    data.setdefault("players", {})
    data.setdefault("matches", [])
    data.setdefault("next_match_id", 1)
    data.setdefault("queue", [])
    data.setdefault("active_matches", {})   # thread_id(str) -> match state
    data.setdefault("challenges", [])
    data.setdefault("next_challenge_id", 1)
    data.setdefault("ladder", [])           # list of user ids, rank 1 first
    data.setdefault("ladder_status", {})    # user_id(str) -> "up"|"down"|"defended"
    data.setdefault("cooldowns", {})        # user_id(str) -> iso until
    data.setdefault("config", {})
    return data


def save_data(data: dict) -> None:
    tmp = DATA_FILE.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    tmp.replace(DATA_FILE)


def get_player(data: dict, user_id: int) -> dict:
    key = str(user_id)
    if key not in data["players"]:
        ts = now().isoformat()
        data["players"][key] = {
            "rating": STARTING_ELO,
            "wins": 0,
            "losses": 0,
            "last_active": ts,
            "last_decay": ts,
        }
    return data["players"][key]


# ---------------------------------------------------------------- elo math

def expected_score(rating_a: float, rating_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def match_changes(winner_elo: int, loser_elo: int, loser_score: int, ff: bool):
    """Return (winner_gain, loser_loss).

    Beating a higher-rated player yields a bigger gain and costs them more
    (that's the Elo expected-score term). Forfeits give the winner a normal
    gain but cost the forfeiter FF_PENALTY times as much.
    """
    base = K_FACTOR * (1.0 - expected_score(winner_elo, loser_elo))
    if ff:
        gain = max(1, round(base))
        loss = max(1, round(base * FF_PENALTY))
    else:
        # margin-of-victory: 10-0 scales 1.5x, 10-9 scales 1.05x
        mov = 1.0 + ((WIN_SCORE - loser_score) / WIN_SCORE) * 0.5
        gain = max(1, round(base * mov))
        loss = gain
    return gain, loss


def parse_scores(score_a: int, score_b: int):
    """Validate a reported score pair.

    Returns (winner_score, loser_score, ff, a_won) or None if invalid.
    Valid results: 10 vs 0-9 (normal game) or 1 vs 0 (forfeit). No draws.
    """
    if score_a == score_b:
        return None
    hi, lo = max(score_a, score_b), min(score_a, score_b)
    if hi == WIN_SCORE and 0 <= lo < WIN_SCORE:
        ff = False
    elif hi == 1 and lo == 0:
        ff = True
    else:
        return None
    return hi, lo, ff, score_a > score_b


# ---------------------------------------------------------------- decay

def apply_decay(player: dict, at: datetime | None = None) -> int:
    """Apply any decay owed to a player. Returns Elo points removed."""
    at = at or now()
    last_active = datetime.fromisoformat(player["last_active"])
    last_decay = datetime.fromisoformat(player["last_decay"])
    decay_start = max(last_active + timedelta(days=GRACE_DAYS), last_decay)

    days_owed = (at - decay_start).days
    if days_owed <= 0:
        return 0

    loss = min(days_owed * DECAY_PER_DAY, max(0, player["rating"] - RATING_FLOOR))
    player["rating"] -= loss
    player["last_decay"] = (decay_start + timedelta(days=days_owed)).isoformat()
    return loss


def apply_decay_all(data: dict) -> bool:
    at = now()
    changed = False
    for player in data["players"].values():
        if apply_decay(player, at):
            changed = True
    return changed


def decay_status(player: dict) -> str:
    idle = now() - datetime.fromisoformat(player["last_active"])
    days_left = GRACE_DAYS - idle.days
    if days_left > 0:
        return f"active (decay in {days_left}d)"
    return f"decaying -{DECAY_PER_DAY}/day"


# ---------------------------------------------------------------- matches

def apply_match(data: dict, winner_id: int, loser_id: int,
                winner_score: int, loser_score: int, ff: bool,
                mtype: str, thread_id: int | None = None) -> dict:
    """Rate a finished match, update both players, and record it."""
    winner = get_player(data, winner_id)
    loser = get_player(data, loser_id)
    apply_decay(winner)
    apply_decay(loser)

    gain, loss = match_changes(winner["rating"], loser["rating"], loser_score, ff)
    loss = min(loss, max(0, loser["rating"] - RATING_FLOOR))
    winner["rating"] += gain
    loser["rating"] -= loss
    winner["wins"] += 1
    loser["losses"] += 1

    ts = now().isoformat()
    for p in (winner, loser):
        p["last_active"] = ts
        p["last_decay"] = ts

    match = {
        "id": data["next_match_id"],
        "type": mtype,                     # "queue" | "ladder" | "ref"
        "winner_id": winner_id,
        "loser_id": loser_id,
        "score": f"{winner_score}-{loser_score}",
        "ff": ff,
        "winner_change": gain,
        "loser_change": loss,
        "at": ts,
        "voided": False,
        "thread_id": thread_id,
    }
    data["next_match_id"] += 1
    data["matches"].append(match)
    return match


def find_match(data: dict, match_id: int) -> dict | None:
    for m in data["matches"]:
        if m["id"] == match_id:
            return m
    return None


def void_match(data: dict, match: dict) -> bool:
    """Reverse a completed match's Elo and record. Returns False if already voided."""
    if match["voided"]:
        return False
    winner = get_player(data, match["winner_id"])
    loser = get_player(data, match["loser_id"])
    winner["rating"] -= match["winner_change"]
    loser["rating"] += match["loser_change"]
    winner["wins"] -= 1
    loser["losses"] -= 1
    match["voided"] = True
    return True


def head_to_head(data: dict, user_id: int) -> dict:
    """opponent_id -> [wins, losses] from this user's perspective."""
    records: dict[int, list[int]] = {}
    for m in data["matches"]:
        if m["voided"]:
            continue
        if m["winner_id"] == user_id:
            records.setdefault(m["loser_id"], [0, 0])[0] += 1
        elif m["loser_id"] == user_id:
            records.setdefault(m["winner_id"], [0, 0])[1] += 1
    return records


def user_in_active_match(data: dict, user_id: int) -> bool:
    return any(
        user_id in (am["p1"], am["p2"])
        for am in data["active_matches"].values()
    )


# ---------------------------------------------------------------- ladder

def ladder_apply_win(data: dict, winner_id: int, loser_id: int) -> None:
    """Climbing win: winner takes the loser's spot, everyone below shifts down."""
    lad = data["ladder"]
    if loser_id not in lad:
        return
    if winner_id in lad and lad.index(winner_id) < lad.index(loser_id):
        return  # defender already ranked higher; nothing changes
    pos = lad.index(loser_id)
    if winner_id in lad:
        lad.remove(winner_id)
    lad.insert(pos, winner_id)
    del lad[LADDER_SIZE:]


def update_movement(data: dict, old_ladder: list[int]) -> None:
    """Refresh the up/down markers by comparing the ladder to a snapshot
    taken before the change. Entries for players no longer ranked are dropped."""
    status = data["ladder_status"]
    new_ladder = data["ladder"]
    for uid in new_ladder:
        if uid not in old_ladder or new_ladder.index(uid) < old_ladder.index(uid):
            status[str(uid)] = "up"
        elif new_ladder.index(uid) > old_ladder.index(uid):
            status[str(uid)] = "down"
    for key in list(status):
        if int(key) not in new_ladder:
            del status[key]


def mark_defended(data: dict, user_id: int) -> None:
    if user_id in data["ladder"]:
        data["ladder_status"][str(user_id)] = "defended"


def ladder_leave(data: dict, user_id: int) -> bool:
    """Voluntarily leave the ladder; everyone below shifts up a place."""
    if user_id not in data["ladder"]:
        return False
    old = list(data["ladder"])
    data["ladder"].remove(user_id)
    update_movement(data, old)
    return True


def challenge_target(data: dict, user_id: int):
    """Who this user is allowed to challenge: the player directly above them,
    or #10 if they're unranked. Returns user id, or None with a reason."""
    lad = data["ladder"]
    if not lad:
        return None, "No ladder has been set yet - a ref needs to run /set_top10."
    if user_id in lad:
        idx = lad.index(user_id)
        if idx == 0:
            return None, "You're already #1 - defend your spot!"
        return lad[idx - 1], None
    return lad[-1], None


def active_challenge_for(data: dict, user_id: int) -> dict | None:
    for c in data["challenges"]:
        if c["status"] == "active" and user_id in (c["challenger"], c["challenged"]):
            return c
    return None


def challenge_by_thread(data: dict, thread_id: int) -> dict | None:
    for c in data["challenges"]:
        if c["status"] == "active" and c["thread_id"] == thread_id:
            return c
    return None


def cooldown_until(data: dict, user_id: int) -> datetime | None:
    raw = data["cooldowns"].get(str(user_id))
    if not raw:
        return None
    until = datetime.fromisoformat(raw)
    if until <= now():
        del data["cooldowns"][str(user_id)]
        return None
    return until


def start_cooldown(data: dict, user_id: int) -> None:
    data["cooldowns"][str(user_id)] = (now() + timedelta(days=COOLDOWN_DAYS)).isoformat()
