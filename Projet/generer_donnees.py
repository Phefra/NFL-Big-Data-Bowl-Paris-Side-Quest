"""
Man-Beating Separation - NFL Big Data Bowl (Paris Side Quest)
=============================================================

IDEE
----
Se demarquer de son defenseur est la base du metier de receveur. Mais il y a
deux mondes tres differents :

  - contre une couverture de ZONE, les defenseurs gardent une surface, pas un
    joueur : il est relativement facile de trouver un espace libre ;
  - contre un marquage INDIVIDUEL (man-to-man), un defenseur colle le receveur
    partout : se liberer y est bien plus difficile.

On mesure donc la SEPARATION (distance au defenseur le plus proche au moment ou
le ballon arrive sur le receveur vise) et on la decompose man vs zone. Le
"Man-Beating Separation Score" recompense les receveurs capables de gagner leur
duel EN INDIVIDUEL : c'est l'information n.1 qu'un recruteur veut avant de signer
un receveur, car elle predit directement la reussite de l'action.

PREUVE (calculee sur les donnees, voir onglet Analyse) : plus la separation de
la cible est grande, plus l'action reussit (de ~39% a 0 yd a ~70% a 5+ yd).

REPERE TEMPOREL : on s'ancre sur 'pass_forward' (frequent) puis on observe
FRAMES_AFTER frames plus tard, quand le ballon est en l'air.

Python pur (bibliotheque standard uniquement).
"""
import csv
import os
import json
import math
from collections import defaultdict

BASE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "nfl-big-data-bowl-regional-event-data", "data"
)
TRACKING_DIR = os.path.join(BASE, "tracking")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resultats")

OFFENSIVE_POS = ("WR", "TE", "RB", "FB")
MIN_MAN_PLAYS = 8     # actions en man-to-man min. pour etre classe
FRAMES_AFTER = 8      # ~0.8 s apres le depart de la passe
MAX_PLAYS = 400       # taille max du catalogue d'actions


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def dist(ax, ay, bx, by):
    return math.hypot(ax - bx, ay - by)


def load_reference():
    players = {p["nflId"]: p for p in read_csv(os.path.join(BASE, "players.csv"))}
    plays = {(r["gameId"], r["playId"]): r for r in read_csv(os.path.join(BASE, "plays.csv"))}
    pff_idx = {}
    for r in read_csv(os.path.join(BASE, "pffScoutingData.csv")):
        pff_idx[(r["gameId"], r["playId"], r["nflId"])] = r
    return players, plays, pff_idx


def analyse_play(rows, game_id, pid, players, pff_idx):
    """Renvoie les infos cle d'une action, ou None si inexploitable."""
    pass_frame = snap_frame = None
    for r in rows:
        if r["event"] in ("pass_forward", "autoevent_passforward") and pass_frame is None:
            pass_frame = int(r["frameId"])
        if r["event"] in ("ball_snap", "autoevent_ballsnap") and snap_frame is None:
            snap_frame = int(r["frameId"])
    if pass_frame is None:
        return None

    max_frame = max(int(r["frameId"]) for r in rows)
    obs_frame = min(pass_frame + FRAMES_AFTER, max_frame)

    snap = [r for r in rows if int(r["frameId"]) == obs_frame]
    receivers, defenders, ball, offense_team = [], [], None, None
    for r in snap:
        if r["team"] == "football":
            try:
                ball = (float(r["x"]), float(r["y"]))
            except ValueError:
                ball = None
            continue
        nfl = r["nflId"]
        if nfl == "":
            continue
        info = pff_idx.get((game_id, pid, nfl))
        if not info:
            continue
        pos = players.get(nfl, {}).get("officialPosition", "?")
        try:
            x, y = float(r["x"]), float(r["y"])
        except ValueError:
            continue
        node = {"nflId": nfl, "x": x, "y": y, "pos": pos, "team": r["team"]}
        if info["pff_role"] == "Pass Route" and pos in OFFENSIVE_POS:
            receivers.append(node)
            offense_team = r["team"]
        elif info["pff_role"] == "Coverage":
            defenders.append(node)

    if not receivers or not defenders or not ball:
        return None

    # Cible = receveur le plus proche du ballon a l'observation
    target = min(receivers, key=lambda rc: dist(rc["x"], rc["y"], ball[0], ball[1]))
    nd = min(defenders, key=lambda d: dist(target["x"], target["y"], d["x"], d["y"]))
    target_sep = dist(target["x"], target["y"], nd["x"], nd["y"])
    nearest_def_id = nd_id = None
    nearest_def_id = min(
        range(len(defenders)),
        key=lambda i: dist(target["x"], target["y"], defenders[i]["x"], defenders[i]["y"])
    )
    nearest_def_nfl = None  # on retrouve l'id reel
    best = None
    for d in defenders:
        dd = dist(target["x"], target["y"], d["x"], d["y"])
        if best is None or dd < best[0]:
            best = (dd, d["nflId"])
    nearest_def_nfl = best[1] if best else None

    return {
        "pass_frame": pass_frame, "snap_frame": snap_frame, "obs_frame": obs_frame,
        "receivers": receivers, "defenders": defenders, "ball": ball,
        "target": target, "target_sep": target_sep,
        "nearest_def_nfl": nearest_def_nfl,
        "offense_team": offense_team,
    }


def build_frames(rows, game_id, pid, players, pff_idx, target_id, nearest_def_id, offense_team):
    """Serialise toutes les frames de l'action pour l'animation."""
    frames = defaultdict(list)
    for r in rows:
        fid = int(r["frameId"])
        if r["team"] == "football":
            frames[fid].append({"id": "ball", "x": round(float(r["x"]), 2),
                                 "y": round(float(r["y"]), 2), "kind": "ball"})
            continue
        nfl = r["nflId"]
        if nfl == "":
            continue
        is_offense = (r["team"] == offense_team)
        if nfl == target_id:
            kind = "target"
        elif nfl == nearest_def_id:
            kind = "defender"       # le defenseur en duel avec la cible
        elif is_offense:
            kind = "offense"
        else:
            kind = "defense"
        frames[fid].append({
            "id": nfl, "x": round(float(r["x"]), 2), "y": round(float(r["y"]), 2),
            "j": r["jerseyNumber"], "kind": kind,
        })
    return [frames[f] for f in sorted(frames)]


def main():
    print("Chargement des tables de reference...")
    players, plays, pff_idx = load_reference()

    files = sorted(f for f in os.listdir(TRACKING_DIR)
                   if f.startswith("tracking_") and f.endswith(".csv"))
    print(f"{len(files)} matchs a traiter.\n")

    # Stats par joueur (en tant que CIBLE de la passe)
    stats = defaultdict(lambda: {"pos": "?", "man_n": 0, "man_sep": 0.0,
                                 "zone_n": 0, "zone_sep": 0.0,
                                 "man_comp": 0, "zone_comp": 0})
    # Preuve : separation de la cible vs succes
    sep_bucket = defaultdict(lambda: {"n": 0, "comp": 0, "yards": 0.0})
    # Separation / reussite selon la couverture
    cov_stats = defaultdict(lambda: {"n": 0, "sep": 0.0, "comp": 0})
    catalog = []

    for i, fname in enumerate(files, 1):
        gid = fname.replace("tracking_", "").replace(".csv", "")
        by_play = defaultdict(list)
        with open(os.path.join(TRACKING_DIR, fname), newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                by_play[r["playId"]].append(r)

        for pid, rows in by_play.items():
            res = analyse_play(rows, gid, pid, players, pff_idx)
            if not res:
                continue

            prow = plays.get((gid, pid), {})
            cov = prow.get("pff_passCoverageType", "") or "?"   # Man / Zone / Other
            pr = prow.get("passResult", "")
            try:
                yds = float(prow.get("prePenaltyPlayResult", "") or 0)
            except ValueError:
                yds = 0.0
            is_comp = (pr == "C")

            tgt = res["target"]
            sep = res["target_sep"]

            # Stats joueur (cible)
            s = stats[tgt["nflId"]]
            s["pos"] = tgt["pos"]
            if cov == "Man":
                s["man_n"] += 1; s["man_sep"] += sep
                if is_comp: s["man_comp"] += 1
            elif cov == "Zone":
                s["zone_n"] += 1; s["zone_sep"] += sep
                if is_comp: s["zone_comp"] += 1

            # Preuve separation -> succes
            b = min(int(sep), 5)
            sb = sep_bucket[b]; sb["n"] += 1; sb["yards"] += yds
            if is_comp: sb["comp"] += 1

            # Couverture -> separation / reussite
            cs = cov_stats[cov]; cs["n"] += 1; cs["sep"] += sep
            if is_comp: cs["comp"] += 1

            # Catalogue : duels gagnes EN MAN avec forte separation
            if cov == "Man" and sep >= 2.0:
                frames = build_frames(rows, gid, pid, players, pff_idx,
                                      tgt["nflId"], res["nearest_def_nfl"],
                                      res["offense_team"])
                pdesc = prow.get("playDescription", "")
                catalog.append({
                    "gameId": gid, "playId": pid,
                    "receiver": players.get(tgt["nflId"], {}).get("displayName", "?"),
                    "receiverPos": tgt["pos"],
                    "defender": players.get(res["nearest_def_nfl"], {}).get("displayName", "?"),
                    "coverage": cov,
                    "separation": round(sep, 2),
                    "passResult": pr, "yards": yds,
                    "touchdown": "TOUCHDOWN" in pdesc.upper(),
                    "desc": pdesc,
                    "snapFrame": res["snap_frame"], "passFrame": res["pass_frame"],
                    "obsFrame": res["obs_frame"],
                    "frames": frames,
                })

        if i % 20 == 0 or i == len(files):
            print(f"  [{i:3d}/{len(files)}] catalogue: {len(catalog)} duels man")

    # --- Classement : Man-Beating Separation ---
    ranking = []
    for nfl, s in stats.items():
        if s["man_n"] < MIN_MAN_PLAYS:
            continue
        man_sep = s["man_sep"] / s["man_n"]
        zone_sep = s["zone_sep"] / s["zone_n"] if s["zone_n"] else 0.0
        ranking.append({
            "name": players.get(nfl, {}).get("displayName", "?"),
            "pos": s["pos"],
            "manPlays": s["man_n"], "zonePlays": s["zone_n"],
            "manSep": round(man_sep, 2),
            "zoneSep": round(zone_sep, 2),
            "manComp": round(100 * s["man_comp"] / s["man_n"], 1),
            # "resilience" : garde-t-il sa separation en man vs zone ? (ratio)
            "resilience": round(man_sep / zone_sep, 2) if zone_sep else None,
        })
    ranking.sort(key=lambda r: r["manSep"], reverse=True)

    # percentile de manSep par poste + verdict
    by_pos_vals = defaultdict(list)
    for r in ranking:
        by_pos_vals[r["pos"]].append(r["manSep"])
    for v in by_pos_vals.values():
        v.sort()

    def percentile(pos, val):
        arr = by_pos_vals[pos]
        if len(arr) < 2:
            return 50
        below = sum(1 for x in arr if x < val)
        return round(100 * below / (len(arr) - 1))

    for r in ranking:
        p = percentile(r["pos"], r["manSep"])
        r["manPct"] = p
        if p >= 85:
            r["verdict"] = "Separateur d'elite en 1-contre-1 (top 15% a son poste) : gagne ses duels meme colle de pres. Profil tres recherche."
            r["tag"] = "elite"
        elif p >= 60:
            r["verdict"] = "Bon separateur en individuel, au-dessus de la moyenne de son poste."
            r["tag"] = "good"
        elif p <= 20:
            r["verdict"] = "A du mal a se liberer face au marquage individuel : a exploiter surtout contre des couvertures de zone."
            r["tag"] = "low"
        else:
            r["verdict"] = "Separateur dans la moyenne de son poste en individuel."
            r["tag"] = "avg"

    # --- Agregats par poste ---
    by_pos = defaultdict(lambda: {"players": 0, "man": 0.0, "zone": 0.0})
    for r in ranking:
        bp = by_pos[r["pos"]]
        bp["players"] += 1
        bp["man"] += r["manSep"]
        bp["zone"] += r["zoneSep"]
    by_position = [{
        "pos": pos, "players": v["players"],
        "manSep": round(v["man"] / v["players"], 2),
        "zoneSep": round(v["zone"] / v["players"], 2),
    } for pos, v in by_pos.items()]
    by_position.sort(key=lambda x: x["manSep"], reverse=True)

    # --- Preuve separation -> succes ---
    impact = []
    for b in sorted(sep_bucket):
        v = sep_bucket[b]
        if v["n"] == 0:
            continue
        impact.append({
            "sep": f"{b}+" if b >= 5 else str(b),
            "plays": v["n"],
            "compRate": round(100 * v["comp"] / v["n"], 1),
            "avgYards": round(v["yards"] / v["n"], 2),
        })

    # --- Couverture -> separation ---
    coverage = []
    for cov, v in cov_stats.items():
        if v["n"] < 50:
            continue
        coverage.append({
            "coverage": cov, "plays": v["n"],
            "avgSep": round(v["sep"] / v["n"], 2),
            "compRate": round(100 * v["comp"] / v["n"], 1),
        })
    coverage.sort(key=lambda x: x["avgSep"], reverse=True)

    # --- Catalogue : meilleurs duels gagnes en man ---
    catalog.sort(key=lambda c: (c["touchdown"], c["separation"]), reverse=True)
    catalog = catalog[:MAX_PLAYS]

    # --- Index fiche joueur ---
    plays_by_player = defaultdict(list)
    for idx, c in enumerate(catalog):
        plays_by_player[c["receiver"]].append(idx)

    out = {
        "meta": {
            "framesAfter": FRAMES_AFTER, "minManPlays": MIN_MAN_PLAYS,
            "nPlaysCatalog": len(catalog), "nRanked": len(ranking),
        },
        "ranking": ranking,
        "byPosition": by_position,
        "impact": impact,
        "coverage": coverage,
        "playsByPlayer": plays_by_player,
        "plays": catalog,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, "data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"\nEcrit : {out_path}  ({size_mb:.1f} Mo)")
    print(f"  classement : {len(ranking)} receveurs")
    print(f"  catalogue  : {len(catalog)} duels man")
    print(f"  couverture : {coverage}")
    print(f"  postes     : {by_position}")


if __name__ == "__main__":
    main()
