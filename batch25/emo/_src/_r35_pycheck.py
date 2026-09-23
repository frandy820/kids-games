# -*- coding: utf-8 -*-
"""r35 Python 独立复算（r26/r27/r33 范式）：按 SPEC-R35-EMO §R3 生成律 Python 实现
mulberry32/shuffled/ri/takeScene（与 JS 同源副本，逐位一致），40 关 genLevel 全字段与页内
提取的 r35-post-full.json 对拍。用法: python _r35_pycheck.py"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5
STATIC_LEVELS = 20
ALL6 = ['happy', 'sad', 'angry', 'scared', 'surprised', 'worried']
HARD4 = ['sad', 'worried', 'angry', 'scared']
NEAR = {'sad': 'worried', 'worried': 'sad', 'angry': 'scared', 'scared': 'angry',
        'happy': 'surprised', 'surprised': 'happy'}          # r35 三对（含 happy<->surprised）
SCENES = {
    'h_gift': 'happy', 'h_icecream': 'happy', 'h_sticker': 'happy', 'h_park': 'happy',
    's_icecream': 'sad', 's_balloon': 'sad', 's_teddy': 'sad', 's_flower': 'sad',
    'a_grab': 'angry', 'a_blocks': 'angry', 'a_queue': 'angry', 'a_laugh': 'angry',
    'c_dark': 'scared', 'c_thunder': 'scared', 'c_bdog': 'scared', 'c_shot': 'scared',
    'w_test': 'worried', 'w_mom': 'worried', 'w_rain': 'worried', 'w_path': 'worried',
    'su_party': 'surprised', 'su_snow': 'surprised', 'su_egg': 'surprised', 'su_balls': 'surprised',
}
SCENES_BY_EMO = {}
for _sid, _e in SCENES.items():
    SCENES_BY_EMO.setdefault(_e, []).append(_sid)


def _u32(x):
    return x & 0xFFFFFFFF


def mulberry32(a):
    a = _u32(a)
    while True:
        a = _u32(a + 0x6D2B79F5)
        t = _u32((a ^ (a >> 15)) * (1 | a))
        t = _u32(t + _u32((t ^ (t >> 7)) * (61 | t)) ^ t)
        yield ((t ^ (t >> 14)) >> 0) / 4294967296.0


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(next(rnd) * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


def ri(rnd, lo, hi):
    return lo + int(next(rnd) * (hi - lo + 1))


def spec_seq_of(dch, rnd, flat):
    modes = None
    if dch == 2:
        modes = shuffled(['fwd', 'fwd', 'fwd', 'rev', 'rev'], rnd)
    elif dch == 3:
        modes = shuffled(['rev', 'rev', 'rev', 'fwd', 'fwd'], rnd)
    elif dch == 4:
        coin = 'fwd' if next(rnd) < 0.5 else 'rev'
        modes = shuffled(['fwd', 'fwd', 'rev', 'rev', coin], rnd)
    if dch == 3:
        a = shuffled(HARD4, rnd)
        emos = a + [a[ri(rnd, 0, 2)]]
    elif dch == 1 and flat == 0:
        emos = ['happy'] + shuffled([x for x in ALL6 if x != 'happy'], rnd)[:4]
    else:
        emos = shuffled(ALL6, rnd)[:CH_LEN]
    return [{'emo': e, 'mode': modes[i] if modes else 'fwd'} for i, e in enumerate(emos)]


def take_scene(emo, rnd, pools, level_slots):
    pool = pools.get(emo)
    if not pool:
        pool = pools[emo] = shuffled(SCENES_BY_EMO[emo], rnd)
    sc = pool.pop(0)
    level_slots[emo] = level_slots.get(emo, 0) + 1
    return sc


def build_quiz(spec, rnd, pools, level_slots):
    emo, mode = spec['emo'], spec['mode']
    scene = take_scene(emo, rnd, pools, level_slots)
    if mode == 'rev':
        rest = shuffled([x for x in ALL6
                         if x != emo and x != NEAR[emo] and level_slots.get(x, 0) < 4], rnd)[:2]
        cands = [emo, NEAR[emo]] + rest
        objs = [(e, scene if e == emo else take_scene(e, rnd, pools, level_slots)) for e in cands]
        order = shuffled(objs, rnd)
        faces = [{'id': 'f%d' % j, 'emo': o[0], 'scene': o[1], 'right': o[1] == scene}
                 for j, o in enumerate(order)]
    else:
        ds = [NEAR[emo]] + shuffled([x for x in ALL6 if x != emo and x != NEAR[emo]], rnd)[:2]
        order = shuffled([emo] + ds, rnd)
        faces = [{'id': 'f%d' % j, 'emo': e, 'scene': None, 'right': e == emo}
                 for j, e in enumerate(order)]
    return {'mode': mode, 'scene': scene, 'emo': emo, 'faces': faces,
            '_miss': 0, '_answered': False}


def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch = (ch - 1) % 4 + 1
    rnd = mulberry32(flat * 7919 + 13)
    if flat >= STATIC_LEVELS:
        dch = ri(rnd, 1, 4)
    specs = spec_seq_of(dch, rnd, flat)
    pools, level_slots = {}, {}
    quizzes = [build_quiz(s, rnd, pools, level_slots) for s in specs]
    return {'ch': ch, 'dch': dch, 'lv': flat % CH_LEN, 'quizzes': quizzes}


def main():
    src = json.loads((HERE / 'r35-post-full.json').read_text(encoding='utf-8'))
    identical, diffs = 0, []
    for f in range(40):
        L = gen_level(f)
        exp = src[str(f)]
        ok = (L['ch'] == exp['ch'] and L['dch'] == exp['dch'] and L['lv'] == exp['lv'] and
              all(_q_match(a, b) for a, b in zip(L['quizzes'], exp['qs'])))
        if ok:
            identical += 1
        else:
            diffs.append(f)
    print('PYCHECK %d/40 identical' % identical)
    if diffs:
        for f in diffs[:3]:
            print(' flat %d py=%s' % (f, json.dumps(gen_level(f)['quizzes'][0], ensure_ascii=False)[:170]))
            print('        js=%s' % json.dumps(src[str(f)]['qs'][0], ensure_ascii=False)[:170])
        raise SystemExit(1)


def _q_match(a, b):
    if a['mode'] != b.get('mode') or a['scene'] != b.get('scene') or a['emo'] != b.get('emo'):
        return False
    if len(a['faces']) != len(b.get('faces', [])):
        return False
    for x, y in zip(a['faces'], b['faces']):
        if x['id'] != y['id'] or x['emo'] != y['emo'] or x['scene'] != y.get('scene') \
           or x['right'] != y['right']:
            return False
    return True


if __name__ == '__main__':
    main()
