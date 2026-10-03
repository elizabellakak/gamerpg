"""Entry point of the procedural art pipeline.

    python3 blender/build_assets.py                 # build everything
    python3 blender/build_assets.py hero wolf       # build a subset (asset ids or groups)
    python3 blender/build_assets.py --list          # list ids / groups

Groups: weapons, characters, monsters, props, icons, promo, models (= everything but icons/promo)
"""
import os
import sys
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from pipeline import characters, icons, monsters, promo, props, weapons  # noqa: E402


def registry():
    reg = {}
    groups = {}
    for wid in weapons.WEAPONS:
        reg[wid] = (lambda w=wid: weapons.build(w))
    groups["weapons"] = list(weapons.WEAPONS)
    for cid in characters.CHARACTERS:
        reg[cid] = (lambda c=cid: characters.build(c))
    groups["characters"] = list(characters.CHARACTERS)
    for mid in monsters.MONSTERS:
        reg[mid] = (lambda m=mid: monsters.build(m))
    groups["monsters"] = list(monsters.MONSTERS)
    for pid in props.PROPS:
        reg[pid] = (lambda p=pid: props.build(p))
    groups["props"] = list(props.PROPS)
    for iid in icons.ICON_IDS:
        reg["icon_" + iid] = (lambda i=iid: icons.build(i))
    groups["icons"] = ["icon_" + i for i in icons.ICON_IDS]
    reg["promo"] = promo.build
    groups["promo"] = ["promo"]
    groups["models"] = groups["characters"] + groups["monsters"] + groups["weapons"] + \
        groups["props"]
    return reg, groups


def main(argv):
    reg, groups = registry()
    if "--list" in argv:
        for g, ids in groups.items():
            print("%s: %s" % (g, " ".join(ids)))
        return 0
    order = groups["models"] + groups["icons"] + groups["promo"]
    if argv:
        want = []
        for a in argv:
            if a in groups:
                want += groups[a]
            elif a in reg:
                want.append(a)
            elif "icon_" + a in reg and a not in reg:
                want.append("icon_" + a)
            else:
                print("unknown asset/group: %s (use --list)" % a)
                return 2
        order = [x for x in order if x in want]
    fails = []
    t0 = time.time()
    for aid in order:
        t = time.time()
        try:
            out = reg[aid]()
            print("[ok] %-26s %5.1fs  %s" % (aid, time.time() - t, out or ""))
        except Exception:
            traceback.print_exc()
            fails.append(aid)
            print("[FAIL] %s" % aid)
    print("built %d assets in %.1fs, %d failed %s" % (len(order) - len(fails),
                                                       time.time() - t0, len(fails), fails))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
