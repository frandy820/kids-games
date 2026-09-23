# -*- coding: utf-8 -*-
"""memory r19 SPEC 复算器（S7）——python 侧独立重列 40 关表，与 game-verify.js SPEC_LEVELS 逐格对账。
真值源：_src/game-data.js LEVEL_SPECS/常量 + _src/game-core.js genLevel/makeLevel 消费序。
覆盖：
  A. mulberry32 int32 位级复算（Math.imul 对照）；
  B. 静态 24 关（LEVEL_SPECS_PY 与 game-data.js 逐行对账）+ 生成关 16 关（seed 1056）；
  C. modeled 全表（OPEN 1000 + peek(800+对数x750) + 对数x2xDECIDE + END 2000，round）；
  D. MEM_SEED=1056 定值依据复核（flat24-39：四 dch 各 4 次 + 双模式各 8 次）；
  E. estMs 口径（len*345+600）锚值；
  F. game-verify.js SPEC_LEVELS 字面逐格对账（正则抽行）。
用法: python _src/_spec_calc.py   → 全绿退出 0，任何一格不符退出 1 并打印差异。
"""
import re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


# ---- A. mulberry32 int32 位级复算（与 JS Math.imul / |0 等价）----
def _i32(v):
    v &= 0xFFFFFFFF
    return v - 0x100000000 if v >= 0x80000000 else v


def _imul(x, y):
    return _i32((x * y) & 0xFFFFFFFF)


def mulberry32_py(a):
    a = _i32(a)
    def rnd():
        nonlocal a
        a = _i32(a + 0x6D2B79F5)
        t = _imul(a ^ ((a & 0xFFFFFFFF) >> 15), _i32(1 | a))
        # JS 优先级：t + Math.imul(...) ^ t == (t + Math.imul(...)) ^ t（+ 高于 ^；XOR 交换律=canonical 式）
        t = _i32(_i32(t + _imul(t ^ ((t & 0xFFFFFFFF) >> 7), _i32(61 | t))) ^ t)
        return ((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd


def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))


# ---- B. 关表（静态 24 行与 game-data.js LEVEL_SPECS 同源；模式缩写与 verify 同）----
# 行: (mode, r, c, twins, peek)
LEVEL_SPECS_PY = [
    ('same', 2, 3, 0, 0), ('same', 2, 3, 1, 0), ('same', 2, 4, 1, 0), ('same', 2, 4, 2, 0),
    ('same', 3, 4, 2, 0), ('same', 3, 4, 3, 0),
    ('sum10', 2, 2, 0, 0), ('sum10', 2, 3, 0, 0), ('sum10', 2, 4, 0, 0), ('sum10', 2, 5, 0, 0),
    ('sum10', 2, 5, 0, 0), ('sum10', 2, 5, 0, 0),
    ('same', 2, 3, 1, 1), ('same', 2, 4, 2, 1), ('same', 3, 4, 2, 1), ('same', 3, 4, 3, 1),
    ('same', 4, 4, 3, 1), ('same', 4, 4, 4, 1),
    ('same', 4, 4, 4, 1), ('sum10', 2, 5, 0, 1), ('same', 4, 4, 4, 1), ('sum10', 2, 5, 0, 1),
    ('same', 4, 5, 4, 1), ('same', 4, 5, 5, 1),
]
DECIDE_PY = {'same': 1500, 'sum10': 2400}
OPEN_MS, END_MS, PEEK_BASE, PEEK_PER_PAIR, LEVEL_MIN_MS = 1000, 2000, 800, 750, 12000
MEM_SEED = 1056
STATIC_LEVELS = 24


def gen_spec(flat):
    if flat < STATIC_LEVELS:
        mode, r, c, twins, peek = LEVEL_SPECS_PY[flat]
        dch = min(4, flat // 6 + 1)
        return mode, r, c, twins, peek, dch
    rnd = mulberry32_py(flat * 7919 + MEM_SEED)
    dch = ri(rnd, 1, 4)
    mode = 'same' if ri(rnd, 0, 1) == 0 else 'sum10'
    if mode == 'same':
        cfg = {1: (4, 4, 3), 2: (4, 4, 4), 3: (4, 5, 4), 4: (4, 5, 5)}[dch]
        return 'same', cfg[0], cfg[1], cfg[2], 1, dch
    return 'sum10', 2, (5 if dch <= 2 else 4), 0, 1, dch


def peek_ms(pairs):
    return PEEK_BASE + pairs * PEEK_PER_PAIR


def modeled(flat):
    mode, r, c, twins, peek, dch = gen_spec(flat)
    pairs = r * c // 2
    return round(OPEN_MS + (peek_ms(pairs) if peek else 0) + pairs * 2 * DECIDE_PY[mode] + END_MS)


def spec_row(flat):
    mode, r, c, twins, peek, dch = gen_spec(flat)
    return [mode, r, c, twins, peek, r * c // 2, dch, modeled(flat)]


# ---- C/D/E. 自检 ----
errs = []
if len(LEVEL_SPECS_PY) != 24:
    errs.append('静态表 %d 行 != 24' % len(LEVEL_SPECS_PY))

# MEM_SEED 定值依据：flat24-39 四 dch 各 4 + 双模式各 8
dch_count, mode_count = {}, {}
for f in range(24, 40):
    m, r, c, tw, pk, dch = gen_spec(f)
    dch_count[dch] = dch_count.get(dch, 0) + 1
    mode_count[m] = mode_count.get(m, 0) + 1
if sorted(dch_count) != [1, 2, 3, 4] or any(v != 4 for v in dch_count.values()):
    errs.append('seed 1056 dch 分布异常: %s' % dch_count)
if mode_count != {'same': 8, 'sum10': 8}:
    errs.append('seed 1056 mode 分布异常: %s' % mode_count)

# modeled 锚：m0=12000、全 40 关 min=12000、全部 >= LEVEL_MIN_MS
m_all = [modeled(f) for f in range(40)]
if m_all[0] != 12000:
    errs.append('modeled(0)=%s != 12000' % m_all[0])
if min(m_all) != LEVEL_MIN_MS:
    errs.append('modeled min=%s != %s' % (min(m_all), LEVEL_MIN_MS))

# estMs 口径锚
est_ms = lambda n: n * 345 + 600
for n, want in [(4, 1980), (8, 3360), (11, 4395), (13, 5085)]:
    if est_ms(n) != want:
        errs.append('estMs(%d)=%s != %s' % (n, est_ms(n), want))
if est_ms(8) + 300 != 3660 or est_ms(11) + 300 != 4695:
    errs.append('错链窗锚不符')

# ---- F. game-verify.js SPEC_LEVELS 逐格对账 ----
verif = (HERE / 'game-verify.js').read_text(encoding='utf-8')
data_js = (HERE / 'game-data.js').read_text(encoding='utf-8')

mm = re.search(r'const SPEC_LEVELS = \[(.*?)\];', verif, re.S)
if not mm:
    errs.append('verify 缺 SPEC_LEVELS 字面')
    rows_js = []
else:
    body = mm.group(1)
    # 每行 [M,2,3,0,0,3,1,12000] 或 [S10,...]
    rows_js = []
    for line in body.split('],'):
        cells = re.findall(r"(M|S10|-?\d+)", line)
        cells = ['same' if x == 'M' else ('sum10' if x == 'S10' else int(x)) for x in cells]
        if cells:
            rows_js.append(cells)
if len(rows_js) != 40:
    errs.append('SPEC_LEVELS 解析 %d 行 != 40' % len(rows_js))
else:
    for f in range(40):
        py, js = spec_row(f), rows_js[f]
        if py != js:
            errs.append('flat%d 不符: py=%s js=%s' % (f, py, js))

# LEVEL_SPECS 静态 24 行与 game-data.js 对账（r/c/mode/twins/peek）
dm = re.search(r'const LEVEL_SPECS = \[(.*?)\];', data_js, re.S)
if not dm:
    errs.append('game-data.js 缺 LEVEL_SPECS 字面')
else:
    js_specs = []
    for line in dm.group(1).split('},'):
        g = re.search(r"r:\s*(\d+),\s*c:\s*(\d+),\s*mode:\s*'(\w+)',\s*twins:\s*(\d+),\s*peek:\s*(\d+)", line)
        if g:
            js_specs.append((g.group(3), int(g.group(1)), int(g.group(2)), int(g.group(4)), int(g.group(5))))
    if len(js_specs) != 24:
        errs.append('game-data LEVEL_SPECS 解析 %d 行 != 24' % len(js_specs))
    elif [tuple(x) for x in LEVEL_SPECS_PY] != js_specs:
        for i, (a, b) in enumerate(zip([tuple(x) for x in LEVEL_SPECS_PY], js_specs)):
            if a != b:
                errs.append('LEVEL_SPECS 第 %d 行不符: py=%s js=%s' % (i, a, b))

# ---- 输出 ----
print('flat | mode  r x c  tw pk pairs dch modeled')
for f in range(40):
    row = spec_row(f)
    print('%4d | %-5s %dx%d  %2d %2d %5d %2d %6d' % (f, row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7]))
print('seed1056 dch=%s mode=%s' % (dch_count, mode_count))
print('modeled: m0=%s min=%s  estMs anchors: 4->1980 8->3360 11->4395 13->5085  chainwin 3660/4695'
      % (m_all[0], min(m_all)))

if errs:
    print('\nSPEC-CALC FAIL (%d):' % len(errs))
    for e in errs:
        print(' -', e)
    sys.exit(1)
print('\nSPEC-CALC PASS: 40/40 rows == game-verify.js SPEC_LEVELS; LEVEL_SPECS 24/24 == game-data.js; seed/modeled/estMs anchors all green')
