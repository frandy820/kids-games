# -*- coding: utf-8 -*-
"""r32 pycheck：Python 独立复刻新生成律（SPEC-R32-WORDEN §R3），与页内提取 40 关全量对拍。
r27-r31 同源副本（mulberry32/shuffled 逐位同构）；不复用引擎 JS——同源陷阱防线。
覆盖字段：mode/target/options 全题型 + blank 的 pick/blankPos。
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
CH_LEN = 5
STATIC_LEVELS = 20

WORDS = {  # (cat, zh)——cat 用于 pickDistract 同类别优先
    'cat': 'animal', 'dog': 'animal', 'fish': 'animal', 'bird': 'animal', 'rabbit': 'animal',
    'sheep': 'animal', 'duck': 'animal', 'mouse': 'animal', 'horse': 'animal',
    'apple': 'fruit', 'banana': 'fruit', 'orange': 'fruit', 'grape': 'fruit',
    'pear': 'fruit', 'peach': 'fruit', 'lemon': 'fruit', 'melon': 'fruit',
    'egg': 'food', 'milk': 'food', 'cake': 'food', 'rice': 'food', 'bread': 'food', 'soup': 'food',
    'sun': 'nature', 'moon': 'nature', 'star': 'nature', 'rain': 'nature',
    'cloud': 'nature', 'snow': 'nature', 'leaf': 'nature', 'wind': 'nature',
    'book': 'object', 'ball': 'object', 'car': 'object', 'tree': 'object',
    'boat': 'object', 'train': 'object', 'house': 'object', 'plant': 'object', 'brush': 'object',
    'hand': 'body', 'eye': 'body', 'ear': 'body', 'nose': 'body',
    'face': 'body', 'hair': 'body', 'foot': 'body', 'tooth': 'body',
}
WORD_KEYS = list(WORDS.keys())
CONFUSE = {'cat': 'cap', 'dog': 'dot', 'book': 'look', 'cake': 'lake', 'star': 'stop', 'hand': 'head',
           'sheep': 'sheet', 'boat': 'coat', 'train': 'brain', 'snow': 'slow', 'rice': 'race', 'mouse': 'moose'}
CONFUSE_KEYS = list(CONFUSE.keys())
NEAR = {'b': 'dq', 'd': 'bp', 'p': 'bq', 'q': 'bd', 'm': 'n', 'n': 'm', 'w': 'v', 'v': 'w',
        'i': 'l', 'l': 'i', 'u': 'v', 'e': 'a', 'a': 'e', 'o': 'u', 's': 'z', 'z': 's',
        'c': 'g', 'g': 'c', 't': 'f', 'f': 't', 'r': 'n', 'h': 'k', 'k': 'h'}
BLANK_POOL = ['a', 'e', 'i', 'o', 'u', 'r', 's', 't', 'n', 'l', 'm', 'p', 'd', 'b']
MASK = 0xFFFFFFFF


def mulberry32(a):
    a = int(a) & MASK
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & MASK
        t = ((a ^ (a >> 15)) * (1 | a)) & MASK
        # JS: t = (t + Math.imul(...)) ^ t——先加后异或（ToInt32(t+imul)=mod 2^32 位模式）
        imul2 = ((t ^ (t >> 7)) * (61 | t)) & MASK
        t = (((t + imul2) & MASK) ^ t) & MASK
        return ((t ^ (t >> 14)) & MASK) / 4294967296
    return nxt


def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))  # JS Math.floor(rnd()*(i+1))——32 位内一致
        a[i], a[j] = a[j], a[i]
    return a


def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))


def pick_distract(target, rnd, n, used):
    out = []
    same = [w for w in WORD_KEYS if w != target and WORDS[w] == WORDS[target] and w not in used]
    rest = [w for w in WORD_KEYS if w != target and WORDS[w] != WORDS[target] and w not in used]
    pool = shuffled(same, rnd) + shuffled(rest, rnd)
    for w in pool:
        if len(out) >= n:
            break
        out.append(w)
    return out


def deck_of(dch, idx):
    pool = CONFUSE_KEYS if dch == 3 else WORD_KEYS
    allw = shuffled(pool, mulberry32(dch * 104729 + 7))
    seg = [allw[(idx * 5 + k) % len(allw)] for k in range(5)]
    if dch >= 3:
        have = len([w for w in seg if len(w) >= 4])
        if have < 2:
            extras = [w for w in allw if len(w) >= 4 and w not in seg]
            for s in range(5):
                if have >= 2 or not extras:
                    break
                if len(seg[s]) < 4:
                    seg[s] = extras.pop(0)
                    have += 1
    return seg


def gen_blank(target, rnd):
    blank_pos = ri(rnd, 1, len(target) - 1)
    pick = target[blank_pos]
    cand = list(NEAR.get(pick, ''))
    cand += [target[k] for k in range(len(target)) if k != blank_pos]
    cand += BLANK_POOL
    dis = []
    for c in cand:
        if len(dis) >= 2:
            break
        if c != pick and len(c) == 1 and c.isalpha() and c.islower() and c not in dis:
            dis.append(c)
    options = shuffled([pick] + dis, rnd)
    return {'mode': 'blank', 'target': target, 'options': options, 'pick': pick, 'blankPos': blank_pos}


def gen_one(dch, lv, qi, rnd, deck, last):
    need_blank = (dch == 3 and qi in (2, 4)) or (dch == 4 and qi == 2)
    k = qi % len(deck)
    target = deck[k]
    if need_blank:
        guard = 0
        while (len(target) < 4 or (last and target == last)) and guard < len(deck):
            guard += 1
            k = (k + 1) % len(deck)
            target = deck[k]
        return gen_blank(target, rnd)
    if last and target == last and len(deck) > 1:
        target = deck[(qi + 1) % len(deck)]
    if dch == 1:
        mode = 'pic2word'
        options = [target] + pick_distract(target, rnd, 2, [target])
    elif dch == 2:
        mode = 'sound2pic'
        options = [target] + pick_distract(target, rnd, 1 if lv == 0 else 2, [target])
    elif dch == 3:
        mode = 'pic2word'
        options = [target] + pick_distract(target, rnd, 1, [target]) + [CONFUSE[target]]
    else:
        mode = 'word2pic' if qi <= 1 else ['pic2word', 'sound2pic', 'word2pic'][int(rnd() * 3)]
        options = [target] + pick_distract(target, rnd, 2, [target])
    return {'mode': mode, 'target': target, 'options': shuffled(options, rnd)}


def gen_level(flat):
    ch = flat // CH_LEN + 1
    dch = (ch - 1) % 4 + 1
    lv = flat % CH_LEN
    rnd = mulberry32(flat * 7919 + 13)
    idx = (flat % STATIC_LEVELS) - (dch - 1) * CH_LEN + (CH_LEN if flat >= STATIC_LEVELS else 0)
    deck = deck_of(dch, idx)
    quizzes, last = [], None
    for qi in range(CH_LEN):
        q = gen_one(dch, lv, qi, rnd, deck, last)
        last = q['target']
        quizzes.append(q)
    return quizzes


def main():
    post = json.loads((HERE / 'r32-post.json').read_text(encoding='utf-8'))
    n_ok, bad = 0, []
    for flat_s, qs in sorted(post.items(), key=lambda kv: int(kv[0])):
        flat = int(flat_s)
        mine = gen_level(flat)
        same = len(mine) == len(qs) and all(
            m['mode'] == g['mode'] and m['target'] == g['target'] and m['options'] == g['options'] and
            m.get('pick') == g.get('pick') and m.get('blankPos') == g.get('blankPos')
            for m, g in zip(mine, qs))
        if same:
            n_ok += 1
        else:
            bad.append((flat, mine[:2], qs[:2]))
    print('PYCHECK %d/%d %s' % (n_ok, len(post), 'identical' if not bad else 'MISMATCH'))
    for f, m, g in bad[:3]:
        print(' flat', f, '\n  mine:', json.dumps(m, ensure_ascii=False)[:160],
              '\n  page:', json.dumps(g, ensure_ascii=False)[:160])
    # 分布与覆盖速览（§R11 回填数据源）
    modes, hist = {}, {}
    for qs in post.values():
        for q in qs:
            modes[q['mode']] = modes.get(q['mode'], 0) + 1
            hist[q['target']] = hist.get(q['target'], 0) + 1
    print('modes:', modes, '| words covered:', len(hist))
    return 0 if not bad else 1


if __name__ == '__main__':
    raise SystemExit(main())
