# -*- coding: utf-8 -*-
"""stamp 20 题新表先验自验（改造门禁——b38 主线教训：SPEC 题表写完须脚本验算再实现）：
  1. 表内数学先验独立验算（不 import 实现）：
     - ch1-2 单属性：seq=period 循环子串、demo ≥2 周期、unit 与 period 长度一致（ABC=3/AABB=ABCC=4）
     - ch2 双同块：period 含连续同图案（XXYY 两同对 / XYY(Y) 尾双同形态）
     - ch3-4 双属性：每格 item=colors[i%3]+shapes[i%6] 全落封闭池 8；组合周期恰 6（形状周期 6
       非塌缩——存在 i 使 shapes[i]≠shapes[i+3]）；颜色周期 3 互异；示范 12 位=2 个组合周期
     - ch3 答位真值（cell12）非 GH（形状伴章存在）；ch4 badIdx 域 [6,10] 真值非 GH
     - 唯一性：ch1-2 全 seq 互异；双属性行 6 位前缀互异（反查定位锚）
     - say 句映射：ch1-2 task_next / ch3 task_dual / ch4 task_fix；禁出现规律句（去泄题）
  2. 引擎 rnd 消耗序 python 镜像（mulberry32/ri/shuffled 逐 draw 对账）：
     genLevel(flat) 消耗序 = [flat>=20: dch 1 draw] + [生成关: 5 draws 取题] +
       逐题：scene<10: 2 ri + shuffled(3)=2；scene 10-14: shuffled(4)=3；
             scene 15-19: badIdx 1 ri + shuffled(4)=3
  3. node 沙箱跑真引擎（data+core 无 DOM）dump flat0-39 全 quiz，与 python 期望逐项对账：
     seq/badIdx/picks/answer/kind——引擎-镜像-表三方一致才过。
用法: python _table_check.py   （cwd 任意，路径按 __file__ 解析；需 node 在 PATH）"""
import json, pathlib, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent

# ---- 独立硬编码新表（SPEC v3 定版；禁 import 实现）----
# 单属性行: (scene, kind, unit, period, seqLen)
SINGLE = [
    (0,  'next', 'ABC',  'FSH',  6),
    (1,  'next', 'ABC',  'FSH',  7),
    (2,  'next', 'ABC',  'SHO',  6),
    (3,  'next', 'ABC',  'SHO',  8),
    (4,  'next', 'ABC',  'HOF',  9),
    (5,  'next', 'AABB', 'FFSS', 8),
    (6,  'next', 'AABB', 'HHOO', 8),
    (7,  'next', 'ABCC', 'FHOO', 9),
    (8,  'next', 'AABB', 'OOFF', 8),
    (9,  'next', 'ABCC', 'SHOO', 10),
]
# 双属性行: (scene, kind, colors, shapes)——seqLen 恒 12
DUAL = [
    (10, 'next', ['R', 'Y', 'B'], ['T', 'C', 'S', 'C', 'S', 'T']),
    (11, 'next', ['B', 'Y', 'R'], ['S', 'C', 'T', 'T', 'S', 'C']),
    (12, 'next', ['B', 'R', 'Y'], ['S', 'T', 'C', 'T', 'C', 'S']),
    (13, 'next', ['R', 'Y', 'B'], ['C', 'S', 'T', 'T', 'C', 'S']),
    (14, 'next', ['G', 'R', 'Y'], ['C', 'T', 'C', 'H', 'C', 'S']),
    (15, 'fix',  ['Y', 'B', 'R'], ['C', 'S', 'T', 'S', 'T', 'C']),
    (16, 'fix',  ['B', 'G', 'R'], ['S', 'C', 'T', 'T', 'C', 'C']),
    (17, 'fix',  ['R', 'G', 'Y'], ['T', 'C', 'S', 'T', 'C', 'C']),
    (18, 'fix',  ['G', 'Y', 'R'], ['C', 'S', 'T', 'C', 'C', 'T']),
    (19, 'fix',  ['Y', 'B', 'G'], ['C', 'S', 'C', 'S', 'T', 'H']),
]
POOL8 = ['RT', 'YC', 'BS', 'GH', 'RC', 'YS', 'BT', 'GC']
MOTIF4 = ['F', 'S', 'H', 'O']
COLOR_MATE = {'RT': 'RC', 'RC': 'RT', 'YC': 'YS', 'YS': 'YC', 'BS': 'BT', 'BT': 'BS', 'GC': 'GH', 'GH': 'GC'}
SHAPE_MATE = {'RT': 'BT', 'BT': 'RT', 'YC': 'RC', 'RC': 'GC', 'GC': 'YC', 'BS': 'YS', 'YS': 'BS', 'GH': None}
SAY_MAP = {0: 'spm_task_next', 10: 'spm_task_dual', 15: 'spm_task_fix'}
BAD_LO, BAD_HI = 6, 10

def dual_items(colors, shapes, n):
    return [colors[i % 3] + shapes[i % 6] for i in range(n)]

def truth_at(scene, cell):
    if scene < 10:
        return SINGLE[scene][3][cell % len(SINGLE[scene][3])]
    _, _, c, s = DUAL[scene - 10]
    return c[cell % 3] + s[cell % 6]

# ---- 1. 表内先验 ----
errs = []
seqs_single = {}
for sc, kind, unit, period, ln in SINGLE:
    if len(unit) != len(period):
        errs.append('s%d unit 长 %d != period 长 %d' % (sc, len(unit), len(period)))
    if kind != 'next':
        errs.append('s%d 单属性行 kind 应 next' % sc)
    seq = ''.join(period[i % len(period)] for i in range(ln))
    if ln < 2 * len(period):
        errs.append('s%d 示范 %d < 2 周期 %d' % (sc, ln, 2 * len(period)))
    if sc >= 5:  # ch2 双同块：period 必含连续同图案
        if not any(period[i] == period[i + 1] for i in range(len(period) - 1)):
            errs.append('s%d 双同块 period %s 无连续同' % (sc, period))
    seqs_single[sc] = seq
vals = list(seqs_single.values())
if len(set(vals)) != len(vals):
    errs.append('ch1-2 seq 互异失败')

prefix6 = {}
for sc, kind, colors, shapes in DUAL:
    if len(colors) != 3 or len(set(colors)) != 3:
        errs.append('s%d 颜色周期非 3 互异' % sc)
    if len(shapes) != 6:
        errs.append('s%d 形状周期非 6' % sc)
    if all(shapes[i] == shapes[i + 3] for i in range(3)):
        errs.append('s%d 形状周期塌缩为 3（双周期同相位）' % sc)
    items = dual_items(colors, shapes, 12)
    bad_pool = [x for x in items if x not in POOL8]
    if bad_pool:
        errs.append('s%d 池外 item %s' % (sc, bad_pool))
    if len(items) != 2 * 6:
        errs.append('s%d 示范非 2 组合周期' % sc)
    prefix6[sc] = ''.join(items[:6])
    if kind == 'next':
        ans = truth_at(sc, 12)
        if SHAPE_MATE.get(ans) is None:
            errs.append('s%d 答位真值 %s 无形状伴章' % (sc, ans))
    else:
        for b in range(BAD_LO, BAD_HI + 1):
            if SHAPE_MATE.get(truth_at(sc, b)) is None:
                errs.append('s%d badIdx 域内真值 %s@%d 无形状伴章' % (sc, truth_at(sc, b), b))
if len(set(prefix6.values())) != len(prefix6):
    errs.append('双属性行 6 位前缀互异失败（反查锚）')
# say 泄题检查：表内不得出现「图案名连读」规律句
LEAK = ['红花星星', '红花红花星星', '红花黄星粉心']
data_js = (HERE / 'game-data.js').read_text(encoding='utf-8') if (HERE / 'game-data.js').exists() else ''
for lk in LEAK:
    if lk in data_js:
        errs.append('game-data.js 残留规律句泄题 %s' % lk)

# ---- 2. 引擎 rnd 消耗序 python 镜像 ----
def mulberry32(a):
    a &= 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

def shuffled(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a

def mirror_level(flat):
    rnd = mulberry32(flat * 7919 + 827)
    if flat >= 20:
        dch = ri(rnd, 1, 4)
        pool = list(range(0, 10)) if dch <= 2 else list(range(10, 20))
        scenes = [pool.pop(ri(rnd, 0, len(pool) - 1)) for _ in range(5)]
    else:
        dch = flat // 5 + 1
        base = (dch - 1) * 5
        scenes = [base + (flat % 5 + k) % 5 for k in range(5)]
    out = []
    for s in scenes:
        if s < 10:
            _, kind, unit, period, ln = SINGLE[s]
            truth = truth_at(s, ln)
            rest = [m for m in MOTIF4 if m != truth]
            d1 = rest.pop(ri(rnd, 0, len(rest) - 1))
            d2 = rest.pop(ri(rnd, 0, len(rest) - 1))
            picks = shuffled([truth, d1, d2], rnd)
            badIdx, wrong = -1, None
            seq = ''.join(period[i % len(period)] for i in range(ln))
        elif s < 15:
            kind, colors, shapes = 'next', DUAL[s - 10][2], DUAL[s - 10][3]
            truth = truth_at(s, 12)
            cand = [truth, COLOR_MATE[truth], SHAPE_MATE[truth]]
            extra = next(x for x in POOL8 if x not in cand)
            picks = shuffled(cand + [extra], rnd)
            badIdx, wrong = -1, None
            seq = ''.join(dual_items(colors, shapes, 12))
        else:
            kind, colors, shapes = 'fix', DUAL[s - 10][2], DUAL[s - 10][3]
            badIdx = ri(rnd, BAD_LO, BAD_HI)
            truth = truth_at(s, badIdx)
            wrong = SHAPE_MATE[truth] if s % 2 == 0 else COLOR_MATE[truth]
            cand = [truth, COLOR_MATE[truth], SHAPE_MATE[truth]]
            extra = next(x for x in POOL8 if x not in cand)
            picks = shuffled(cand + [extra], rnd)
            base_seq = dual_items(colors, shapes, 12)
            base_seq[badIdx] = wrong
            seq = ''.join(base_seq)
        # 干扰章单属性校验（ch3-4）
        if s >= 10:
            for p in picks:
                if p == truth:
                    continue
                same_c = p[0] == truth[0]
                same_s = p[1] == truth[1]
                if same_c and same_s:
                    errs.append('f? s%d 干扰 %s 与真值 %s 双属性全同' % (s, p, truth))
        out.append({'scene': s, 'kind': kind, 'seq': seq, 'picks': picks,
                    'answer': picks.index(truth), 'badIdx': badIdx, 'wrong': wrong})
    return dch, scenes, out

# ---- 3. node 沙箱跑真引擎对账 ----
NODE_JS = r'''
const fs = require('fs'), vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__DATA__, 'utf8'), ctx);
vm.runInContext(fs.readFileSync(__CORE__, 'utf8'), ctx);
const out = [];
for (let flat = 0; flat < 40; flat++) {
  const L = vm.runInContext('genLevel(' + flat + ')', ctx);
  out.push({ flat: flat, dch: L.dch, quizzes: L.quizzes.map(function(q){ return {
    scene: q.scene, kind: q.kind, seq: q.seq.join(''), picks: q.picks,
    answer: q.answer, badIdx: q.badIdx, wrongId: q.wrongId || null }; }) });
}
console.log(JSON.stringify(out));
'''.replace('__DATA__', json.dumps(str(HERE / 'game-data.js').replace('\\', '/'))) \
   .replace('__CORE__', json.dumps(str(HERE / 'game-core.js').replace('\\', '/')))
node_js = NODE_JS

def main():
    if errs:
        print('TABLE ERRORS:', len(errs))
        for e in errs[:20]:
            print(' -', e)
    eng = None
    try:
        r = subprocess.run(['node', '-e', node_js], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            print('NODE FAIL:', r.stderr[:500])
        else:
            eng = json.loads(r.stdout)
    except Exception as ex:
        print('NODE EXC:', ex)
    mism = []
    if eng:
        for lv in eng:
            flat = lv['flat']
            dch, scenes, quizzes = mirror_level(flat)
            if lv['dch'] != dch:
                mism.append('f%d dch %s!=%s' % (flat, lv['dch'], dch))
            for k, (eq, mq) in enumerate(zip(lv['quizzes'], quizzes)):
                for f in ('scene', 'kind', 'seq', 'picks', 'answer', 'badIdx'):
                    if eq[f] != mq[f]:
                        mism.append('f%d q%d %s %r != %r' % (flat, k, f, eq[f], mq[f]))
    n_checks = sum(1 for _ in eng or []) if eng else 0
    print('mirror-vs-engine levels compared: %d, mismatches: %d' % (n_checks, len(mism)))
    for m in mism[:10]:
        print(' -', m)
    ok = not errs and eng and not mism
    print('TABLE-CHECK', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)

if __name__ == '__main__':
    main()
