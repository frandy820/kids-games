# -*- coding: utf-8 -*-
"""kitchen-rhythm r18 SPEC 数学先验复算工具（与 game-data.js 同公式同序——modeled 双钉 python 侧）
输出：10 曲审计（N/密度/间隔/变速段时刻表）+ 40 关全表（song/dch/gates/modeled 精确值）+ SPEC_MODELED_MIN。
用法: python _spec_calc.py   （SPEC-R18-KITCHEN.md 的表由本脚本产出，禁手算）
"""
import json

BPM60 = lambda bpm: 60.0 / bpm

# ---- 曲库 10 首（与 game-data.js SONGS 逐字一致：t 拍/k 食材/lane 轨/melody 频率）----
def rng(a, b):  # [a,b] 整数闭区间
    return list(range(a, b + 1))

SONGS = [
    dict(id='star', title='小星星', icon='star', style='steady', beats=36,
         seg=[{'bpm': 88}],
         t=rng(0, 6) + rng(8, 14) + rng(16, 22) + rng(24, 30),
         melody=[523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
                 698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25,
                 523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
                 698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25],
         lane=None),
    dict(id='tiger', title='两只老虎', icon='tiger', style='steady', beats=36,
         seg=[{'bpm': 92}],
         t=rng(0, 13) + rng(16, 21) + rng(24, 29),
         melody=[523.25, 587.33, 659.25, 523.25, 523.25, 587.33, 659.25, 523.25,
                 659.25, 698.46, 783.99, 659.25, 698.46, 783.99,
                 783.99, 880.00, 784.00 - 0.01, 698.46, 659.25, 523.25,
                 783.99, 880.00, 783.99, 698.46, 659.25, 523.25],
         lane=None),
    dict(id='ode', title='欢乐颂', icon='note', style='steady', beats=32,
         seg=[{'bpm': 84}],
         t=rng(0, 11) + rng(16, 27),
         melody=[659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
                 523.25, 523.25, 587.33, 659.25,
                 659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
                 523.25, 523.25, 587.33, 523.25],
         lane=None),
    dict(id='bee', title='小蜜蜂', icon='bee', style='tempo', beats=24,
         seg=[{'bpm': 88}, {'bpm': 110, 'from': 16}],
         t=[0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 21, 22],
         melody=[783.99, 659.25, 659.25, 698.46, 587.33, 587.33, 523.25, 587.33,
                 659.25, 698.46, 783.99, 783.99, 783.99,
                 783.99, 659.25, 659.25, 698.46, 587.33, 587.33],
         lane=None),
    dict(id='brush', title='粉刷匠', icon='brush', style='tempo', beats=24,
         seg=[{'bpm': 104}, {'bpm': 84, 'from': 12}],
         t=[0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21],
         melody=[698.46, 587.33, 698.46, 587.33, 698.46, 587.33,
                 587.33, 698.46, 659.25, 587.33,
                 698.46, 587.33, 698.46, 587.33, 698.46, 587.33,
                 587.33, 523.25],
         lane=None),
    dict(id='bridge', title='伦敦桥', icon='bridge', style='tempo', beats=28,
         seg=[{'bpm': 96}, {'bpm': 120, 'from': 16}],
         t=rng(0, 6) + [8, 9, 10] + [12, 13, 14] + rng(16, 22),
         melody=[783.99, 880.00, 783.99, 698.46, 659.25, 698.46, 783.99,
                 587.33, 659.25, 698.46,
                 659.25, 698.46, 783.99,
                 783.99, 880.00, 783.99, 698.46, 659.25, 698.46, 783.99],
         lane=None),
    dict(id='jingle', title='铃儿响叮当', icon='bell', style='long', beats=32,
         seg=[{'bpm': 96}],
         t=[0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12] + rng(16, 28),
         melody=[659.25, 659.25, 659.25, 659.25, 659.25, 659.25,
                 659.25, 783.99, 523.25, 587.33, 659.25,
                 698.46, 698.46, 698.46, 698.46, 698.46, 659.25, 659.25, 659.25,
                 659.25, 587.33, 587.33, 659.25, 783.99],
         lane=None),
    dict(id='birthday', title='生日快乐变奏', icon='cake', style='long', beats=40,
         seg=[{'bpm': 84}, {'bpm': 100, 'from': 24}],
         t=[0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 16, 17, 18, 19, 20, 22,
            24, 25, 26, 27, 28, 30, 32],
         melody=[523.25, 523.25, 587.33, 523.25, 659.25, 587.33,
                 523.25, 523.25, 587.33, 523.25, 698.46, 659.25,
                 523.25, 523.25, 1046.50, 783.99, 659.25, 587.33,
                 698.46, 698.46, 783.99, 659.25, 523.25, 587.33, 523.25],
         lane=None),
    dict(id='symph', title='厨房交响', icon='pot', style='dual', beats=32,
         seg=[{'bpm': 90}],
         t=rng(0, 13) + rng(16, 25),
         melody=[523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 783.99, 698.46,
                 659.25, 587.33, 523.25, 587.33, 659.25, 698.46,
                 783.99, 880.00, 987.77, 1046.50, 987.77, 880.00, 783.99, 698.46,
                 659.25, 587.33],
         lane=[i % 2 for i in range(24)]),
    dict(id='chef', title='快乐厨师', icon='chef', style='dual', beats=40,
         seg=[{'bpm': 88}, {'bpm': 104, 'from': 24}],
         t=rng(0, 11) + rng(14, 23) + rng(26, 31),
         melody=[523.25, 587.33, 659.25, 523.25, 587.33, 659.25, 523.25, 587.33,
                 659.25, 698.46, 783.99, 880.00,
                 880.00, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 880.00,
                 987.77, 880.00,
                 1046.50, 987.77, 880.00, 783.99, 698.46, 659.25],
         lane=[i % 2 for i in range(24)] + [0, 1, 1, 0]),
]

DECIDE_MIN = {'steady': 550, 'tempo': 620, 'long': 620, 'dual': 800}
OPEN_MS, END_MS, TAIL_BEATS = 900, 1800, 1.5
GATE2 = [1/3, 1/2, 2/3, 3/4]
GATE3 = [1/2, 2/3, 3/4, 4/5]
SONG_OF_STATIC = ([0, 1, 2, 0, 1, 2, 0, 1] + [3, 4, 5, 3, 4, 5, 3, 4] +
                  [6, 7, 6, 7, 6, 7, 6, 7] + [8, 9, 8, 9, 8, 9, 8, 9])
CH_LEN, STATIC_LEVELS, SEED = 8, 32, 1002   # SEED 扫描定 1002：flat32-39 四 dch 全现+7 曲分散


def sec_at(seg, t):
    """分段积分：拍 → 秒（与 game-data.js secAt 同序：逐段累加 60/bpm×拍差）"""
    s, prev, bpm = 0.0, 0, seg[0]['bpm']
    for i in range(1, len(seg)):
        f = seg[i]['from']
        if t <= f:
            break
        s += (f - prev) * BPM60(bpm)
        prev, bpm = f, seg[i]['bpm']
    return s + (t - prev) * BPM60(bpm)


U32 = 0xFFFFFFFF


def i32(v):                       # JS |0 / >>>0 语义的 int32 回绕
    v &= U32
    return v - 0x100000000 if v >= 0x80000000 else v


def imul(x, y):                   # JS Math.imul：32 位乘取 int32
    return i32(x * y)


def mulberry32(a):
    """与 game-core.js mulberry32 位级一致（node 对照验证过前 8 值）"""
    a = i32(a)
    state = [a]

    def rnd():
        v = state[0]
        v = i32(v + 0x6D2B79F5)
        state[0] = v
        t = imul(i32(v ^ ((v & U32) >> 15)), i32(1 | v))
        t = i32(i32(t + imul(i32(t ^ ((t & U32) >> 7)), i32(61 | t))) ^ t)
        return (i32(t ^ ((t & U32) >> 14)) & U32) / 4294967296.0
    return rnd


def ri(rnd, lo, hi):
    import math
    return lo + math.floor(rnd() * (hi - lo + 1))


def modeled(song):
    ts = song['t']
    gaps = [(sec_at(song['seg'], ts[i + 1]) - sec_at(song['seg'], ts[i])) * 1000.0
            for i in range(len(ts) - 1)]
    gaps.append((sec_at(song['seg'], ts[-1] + TAIL_BEATS) -
                 sec_at(song['seg'], ts[-1])) * 1000.0)
    dm = DECIDE_MIN[song['style']]
    play = 0.0
    for g in gaps:                    # reduce 左序=同 JS reduce((s,v)=>s+Math.max(v,dm),0)
        play += max(g, dm)
    return int(round(OPEN_MS + play + END_MS))


def gen_level(flat):
    ch = flat // CH_LEN + 1
    if flat < STATIC_LEVELS:
        dch = ch if ch <= 4 else 4
        song = SONG_OF_STATIC[flat]
    else:
        rnd = mulberry32(flat * 7919 + SEED)
        dch = ri(rnd, 1, 4)
        song = ri(rnd, 0, 9)
    return dict(flat=flat, ch=ch, dch=dch, lv=flat % CH_LEN, song=song)


def main():
    errs = []
    print('==== 曲库审计（10 曲）====')
    for i, s in enumerate(SONGS):
        n = len(s['t'])
        dens = n / s['beats']
        assert len(s['melody']) == n, '%s melody %d != notes %d' % (s['id'], len(s['melody']), n)
        if dens > 0.8 + 1e-9:
            errs.append('%s density %.3f' % (s['id'], dens))
        for j in range(1, n):
            d = s['t'][j] - s['t'][j - 1]
            if d <= 0:
                errs.append('%s t-not-inc @%d' % (s['id'], j))
            elif d < 0.5 - 1e-9:
                errs.append('%s gap<0.5 @%d (%s)' % (s['id'], j, d))
        if s['lane']:
            assert len(s['lane']) == n
        seg_s = []
        prev_t = 0
        for k in range(1, len(s['seg'])):
            seg_s.append('t>=%d %d->%d' % (s['seg'][k]['from'], s['seg'][k - 1]['bpm'], s['seg'][k]['bpm']))
        print('s%d %-10s %-7s N=%-3d beats=%-3d dens=%.3f bpm=%s %s %s' %
              (i, s['id'], s['style'], n, s['beats'], dens,
               '/'.join(str(x['bpm']) for x in s['seg']),
               (' '.join(seg_s)) if seg_s else '(恒速)',
               'dual' if s['lane'] else ''))
        print('    t=%s' % s['t'])
        if s['lane']:
            print('    lane=%s' % s['lane'])
    print()
    print('==== 40 关全表（flat song dch N gate2 gate3 modeled）====')
    rows, mn = [], None
    for flat in range(40):
        L = gen_level(flat)
        s = SONGS[L['song']]
        n = len(s['t'])
        g2 = int(n * GATE2[L['dch'] - 1] // 1) if False else __import__('math').floor(n * GATE2[L['dch'] - 1])
        g3 = __import__('math').floor(n * GATE3[L['dch'] - 1])
        m = modeled(s)
        rows.append((flat, L['ch'], L['dch'], L['song'], s['id'], n, g2, g3, m))
        if mn is None or m < mn[0]:
            mn = (m, flat)
    for r in rows:
        print('flat%-3d ch%d dch%d s%-2d %-10s N=%-3d gate2=%-3d gate3=%-3d modeled=%d' %
              (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]))
    print()
    print('SPEC_MODELED_MIN = %d  (flat%d)' % (mn[0], mn[1]))
    print('modeled all 40 unique:', sorted(set(r[8] for r in rows)))
    if errs:
        print('AUDIT FAIL:')
        for e in errs:
            print('  -', e)
        raise SystemExit(1)
    print('AUDIT OK')


if __name__ == '__main__':
    main()
