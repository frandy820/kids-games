# -*- coding: utf-8 -*-
"""cir r4 独立对账（batch39 难度批 r4——r3 spec_check 先例形态）：
python 侧重列 SPEC §3 r4 真值源（20 题全表/四题型真值律/生成流/窗口算式/
clip 实长/时序分账），与 node vm 转储的引擎产物双向对账——期望值全部由
SPEC 文本独立推导，禁读引擎常量当期望。
用法: python _verify_spec39r4.py   （batch39 根；前置：_src 源已 build 过与否无关，
       本脚本直读 _src 引擎源，不经 index.html）
对账面：
  A. SPEC_TABLE 20 行逐字段（python 表 == 引擎表——双录一致）
  B. flat0-39 全题（40×5=200 题）：kind/blank/blankAt/need/second/branch/short/sw/
     predAns/litAns/brightAns/deadIdx/answer/picks/slots 全字段独立复算
     （python 自带 mulberry32/Fisher-Yates 副本——消耗序与引擎同构）
  C. 四题型真值律独立复算（'up' 恒非真值）+分布先验（题库 20 题内计数）
  D. 窗口常量算式（4266/5490/4962=clip+150+hint+300；锁 1998/3222/2694=clip+150；
     LIT+FLOW≥2268；obsWin=estMs(len)+300；tut 预算 ≤16000；名义最薄章 ≥45000）
  E. clip 实长表（voice/clips/manifest.json 的 cir_ 7 条与 _clipdur39.json 真值源
     一致——脚本只对键集合与实长，不碰音频内容）
"""
import io, json, pathlib, subprocess, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HERE = pathlib.Path(__file__).resolve().parent          # batch39/
DUMP = HERE / '_dump_engine_r4.js'
CLIPDUR = HERE / '_clipdur39.json'
MANI = HERE.parent / 'voice' / 'clips' / 'manifest.json'

PASSC, FAILC = 0, 0
def chk(name, ok, detail=''):
    global PASSC, FAILC
    PASSC, FAILC = PASSC + (1 if ok else 0), FAILC + (0 if ok else 1)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

# ---------- python 独立真值源（SPEC §3 r4 重列——禁读引擎） ----------
SPEC_TABLE = [
    dict(kind='twogap', blank=1, need='M', second=dict(at='main', i=3, size='L')),
    dict(kind='twogap', blank=2, need='L', second=dict(at='main', i=0, size='S')),
    dict(kind='twogap', blank=0, need='S', second=dict(at='dead', size='S')),
    dict(kind='twogap', blank=3, need='M', second=dict(at='main', i=1, size='S')),
    dict(kind='twogap', blank=2, need='M', second=dict(at='dead', size='M')),
    dict(kind='fault', blank=1, need='M', second=dict(at='dead', size='M'), sw=True),
    dict(kind='fault', blankAt='dead', need='L', sw=True),
    dict(kind='fault', blank=3, need='S', second=dict(at='dead', size='S'), sw=True),
    dict(kind='fault', short=True, need=None, sw=True),
    dict(kind='fault', blankAt='dead', need='M', sw=True),
    dict(kind='switch', blank=2, need='M', branch=dict(bridge='lamp', sw=True)),
    dict(kind='switch', blank=0, need='S', branch=dict(bridge='seg', sw=True)),
    dict(kind='switch', blank=1, need='L', branch=dict(bridge='lamp', sw=True)),
    dict(kind='switch', blank=3, need='M', branch=dict(bridge='seg', sw=True)),
    dict(kind='switch', blank=2, need='S', sw=True),
    dict(kind='bright', blank=1, need='M'),
    dict(kind='bright', blank=0, need='M', branch=dict(bridge='lamp')),
    dict(kind='bright', blank=3, need='L'),
    dict(kind='bright', blank=0, need='L', branch=dict(bridge='lamp')),
    dict(kind='bright', blank=0, need='S'),
]
SPEC_DUR = {'cir_tut_watch': 2856, 'cir_tut_turn': 1824, 'cir_hint': 1968,
            'cir_right': 1968, 'cir_wrong': 1848, 'cir_pred_wrong': 3072,
            'cir_bright_wrong': 2544}
SPEC_OBS = {1: '接好这一根，灯会亮吗', 2: '闭合开关，灯会亮吗',
            3: '修好闭合开关，灯会亮吗', 4: '两盏灯会比一盏更亮吗'}
SPEC_HINTS = {1: '断口还是短路，找一找', 2: '开关在哪条路上',
              3: '两盏灯会更亮吗', 4: '新一轮修电路开始'}
SPEC_GEN = ['两处断口，接好就亮', '断路短路，先找一找', '开关在哪条路上', '两盏灯有多亮']

def mulberry32(a):
    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF      # Math.imul 低 32 位
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) ^ t) & 0xFFFFFFFF   # JS (t+imul)^t 结合律
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rnd

def ri(rnd, lo, hi):
    return lo + int(rnd() * (hi - lo + 1))

def shuffle(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = ri(rnd, 0, i)
        a[i], a[j] = a[j], a[i]
    return a

def pred_ans(row):
    blank_at = 'dead' if row.get('blankAt') == 'dead' else 'main'
    if row['kind'] == 'bright':
        return 'same' if row.get('branch') else 'down'
    if row['kind'] == 'twogap':
        return 'dark' if (row.get('second') and row['second']['at'] == 'main') else 'lit'
    if row['kind'] == 'fault':
        return 'lit' if (not row.get('short') and blank_at != 'main') else 'dark'
    br = row.get('branch')
    return 'lit' if not (br and br['bridge'] == 'lamp' and br.get('sw')) else 'dark'

def spec_flow(flat):
    rnd = mulberry32(flat * 7919 + 877)
    d0 = flat // 5 % 4 + 1
    dch = d0 if flat < 20 else ri(rnd, 1, 4)
    lv = flat % 5
    if flat < 20:
        base = (dch - 1) * 5
        rows = [base + (lv + k) % 5 for k in range(5)]
    else:
        pool = [(dch - 1) * 5 + i for i in range(5)]
        rows = []
        for _ in range(5):
            rows.append(pool.pop(ri(rnd, 0, len(pool) - 1)))
    return dch, rows, rnd

def spec_quiz(row_idx, rnd):
    row = SPEC_TABLE[row_idx]
    layout = ('B??L?' if row.get('branch') else 'B??L') if row['kind'] == 'bright' else 'B??L'
    is_cut = row['kind'] == 'fault' and row.get('short')
    blank_at = 'dead' if row.get('blankAt') == 'dead' else 'main'
    dead_slot = len(layout)
    blank = -1 if is_cut else (dead_slot if blank_at == 'dead' else row['blank'])
    has_dead = blank_at == 'dead' or (row.get('second') and row['second']['at'] == 'dead')
    bunny = -1
    if row.get('second'):
        bunny = row['second']['i'] if row['second']['at'] == 'main' else dead_slot
    slots = []
    for k in range(len(layout)):
        typ = 'blank' if k == blank else ('bunny' if k == bunny else 'fix')
        part = None if (k == blank or k == bunny) else 'M'
        slots.append(dict(k=k, type=typ, part=part, on=False))
    if has_dead:
        slots.append(dict(k=dead_slot, type='blank' if dead_slot == blank else 'bunny',
                          part=None, on=False))
    if is_cut:
        picks = shuffle([dict(t='cut', size=None), dict(t='wire', size='M'), dict(t='wire', size='L')], rnd)
        answer = next(i for i, p in enumerate(picks) if p['t'] == 'cut')
        dead_idx = -1
    elif row.get('second') and row['second']['at'] == 'dead':
        adj = ('S' if rnd() < 0.5 else 'L') if row['need'] == 'M' else 'M'
        picks = shuffle([dict(t='wire', size=row['need']),
                         dict(t='wire', size=row['need'], dead=True),
                         dict(t='wire', size=adj)], rnd)
        dead_idx = next(i for i, p in enumerate(picks) if p.get('dead'))
        answer = next(i for i, p in enumerate(picks)
                      if p['t'] == 'wire' and p['size'] == row['need'] and not p.get('dead'))
    else:
        others = [s for s in ('S', 'M', 'L') if s != row['need']]
        picks = shuffle([dict(t='wire', size=row['need']),
                         dict(t='wire', size=others[0]), dict(t='wire', size=others[1])], rnd)
        answer = next(i for i, p in enumerate(picks) if p['size'] == row['need'])
        dead_idx = -1
    second_n = None
    if row.get('second'):
        second_n = dict(at=row['second']['at'], i=bunny, size=row['second']['size'])   # 引擎归一口径：i=补齐槽位
    branch_n = dict(bridge=row['branch']['bridge'], sw=bool(row['branch'].get('sw'))) if row.get('branch') else None   # 引擎归一口径
    return dict(kind=row['kind'], layout=layout, blank=blank, blankAt=blank_at,
                need=row.get('need'), second=second_n,
                branch=branch_n, short=bool(row.get('short')),
                sw=bool(row.get('sw')), predAns=pred_ans(row), deadIdx=dead_idx,
                answer=answer, picks=picks, slots=slots)

def est_ms(n):
    return n * 345 + 600

def main():
    r = subprocess.run(['node', str(DUMP)], capture_output=True, timeout=60)   # bytes——GBK 解码坑
    if r.returncode != 0:
        print('ENGINE DUMP FAIL:', r.stderr[:500]); sys.exit(1)
    E = json.loads(r.stdout.decode('utf-8'))

    # A. SPEC_TABLE 20 行逐字段双录一致
    tbl_ok = True
    for i, (pe, py) in enumerate(zip(E['SPEC_TABLE'], SPEC_TABLE)):
        ej, pj = json.dumps(pe, sort_keys=True, ensure_ascii=False), json.dumps(py, sort_keys=True, ensure_ascii=False)
        if ej != pj:
            tbl_ok = False
            print('  row %d engine=%s python=%s' % (i + 1, ej, pj))
    chk('A SPEC_TABLE 20 行双录一致', tbl_ok and len(E['SPEC_TABLE']) == 20)

    # B. flat0-39 全题独立复算（ch/dch/lv/rows+全字段+picks/slots）
    bad = []
    for flat in range(40):
        F = E['flats'][flat]
        dch, rows, rnd = spec_flow(flat)
        if F['ch'] != flat // 5 + 1 or F['dch'] != dch or F['rows'] != rows:
            bad.append('flow %d' % flat); continue
        for qi in range(5):
            q = F['quizzes'][qi]
            exp = spec_quiz(rows[qi], rnd)
            pa = q.pop('predAns') if False else q['predAns']
            fields = ['kind', 'layout', 'blank', 'blankAt', 'need', 'second', 'branch',
                      'short', 'sw', 'predAns', 'deadIdx', 'answer']
            if any(json.dumps(q[f], sort_keys=True) != json.dumps(exp[f], sort_keys=True) for f in fields) \
               or json.dumps(q['picks'], sort_keys=True) != json.dumps(exp['picks'], sort_keys=True) \
               or json.dumps(q['slots'], sort_keys=True) != json.dumps(exp['slots'], sort_keys=True):
                bad.append('quiz %d/%d' % (flat, qi))
    chk('B flat0-39×5 全字段独立复算', not bad, str(bad[:4]))

    # C. 真值律+派生字段+分布先验（python 侧独立）
    law_ok, up_true, tally, kinds = True, False, {}, {}
    for row in SPEC_TABLE:
        pa = pred_ans(row)
        if pa == 'up':
            up_true = True
        tally[pa] = tally.get(pa, 0) + 1
        kinds[row['kind']] = kinds.get(row['kind'], 0) + 1
    for flat in range(40):
        for q in E['flats'][flat]['quizzes']:
            la = q['litAns'] if q['kind'] != 'bright' else None
            ba = q['brightAns'] if q['kind'] == 'bright' else None
            if q['kind'] == 'bright':
                law_ok = law_ok and ba == q['predAns'] and la is None
            else:
                law_ok = law_ok and la == (q['predAns'] == 'lit') and ba is None
            if q['predAns'] == 'up':
                up_true = True
    chk('C 四题型真值律派生一致（lit/bright 分型）', law_ok)
    chk('C "up" 恒非真值', not up_true)
    chk('C 分布先验 20 题（lit 7/dark 8/same 2/down 3；题型 5×4）',
        tally == {'lit': 7, 'dark': 8, 'same': 2, 'down': 3} and
        kinds == {'twogap': 5, 'fault': 5, 'switch': 5, 'bright': 5},
        'tally=%s kinds=%s' % (tally, kinds))

    # D. 窗口常量算式（引擎常量 vs python 算式——期望由 SPEC 实长表推导）
    C = E['CONST']
    w = C['WRONG_CHAIN_WIN'] == 1848 + 150 + 1968 + 300 == 4266 and \
        C['PRED_CHAIN_WIN'] == 3072 + 150 + 1968 + 300 == 5490 and \
        C['BRIGHT_CHAIN_WIN'] == 2544 + 150 + 1968 + 300 == 4962 and \
        C['WRONG_LOCK_1'] == 1848 + 150 == 1998 and \
        C['PRED_LOCK_1'] == 3072 + 150 == 3222 and \
        C['BRIGHT_LOCK_1'] == 2544 + 150 == 2694 and \
        C['WRONG_LOCK_2'] == 1000 and \
        C['LIT_MS'] == 1400 and C['FLOW_MS'] == 1600 and \
        C['LIT_MS'] + C['FLOW_MS'] >= 1968 + 300 and \
        C['CUT_MS'] + C['FLOW_MS'] >= 1968 + 300 and \
        C['FULL_WIN'] >= 1968 + 300 and \
        C['PRED_OK_MS'] == 500 and C['REVEAL_MS'] == 1800 and \
        C['BUNNY_MS'] == 700 and C['SPAN'] == {'S': 56, 'M': 84, 'L': 112} and \
        C['CH_LEN'] == 5 and C['STATIC_LEVELS'] == 20 and \
        C['PRED_KINDS'] == {'twogap': ['lit', 'dark'], 'fault': ['lit', 'dark'],
                            'switch': ['lit', 'dark'], 'bright': ['up', 'same', 'down']}
    chk('D 窗口/演出常量算式', w)
    ch_ok = all(E['CHAPTERS'][str(k)]['obs'] == SPEC_OBS[k] and
                E['CHAPTERS'][str(k)]['obsWin'] == est_ms(len(SPEC_OBS[k])) + 300 and
                E['CHAPTERS'][str(k)]['hint'] == SPEC_HINTS[k] for k in (1, 2, 3, 4)) and \
        C['GEN_HINTS'] == SPEC_GEN
    obswins = [E['CHAPTERS'][str(k)]['obsWin'] for k in (1, 2, 3, 4)]
    chk('D 题面句/章预告/生成预告双录', ch_ok, 'obsWin=%s（期望 4350/4005/4695/4350）' % obswins)
    TUT = 3156 + 4350 + 800 + 320 + 500 + 140 + 800 + 320 + 1400 + 1600
    NOMINAL = 5 * (4350 + 640 + 3000) + 2400 + 3020
    chk('D 教学预算 ≤16000 与名义最薄章 ≥45000（python 分账）',
        TUT == 13386 and TUT <= 16000 and NOMINAL == 45370 and NOMINAL >= 45000,
        'tut=%d nominal=%d' % (TUT, NOMINAL))

    # E. clip 实长表（_clipdur39.json 真值源 ↔ SPEC_DUR ↔ manifest 键在）
    cd = json.loads(CLIPDUR.read_text(encoding='utf-8')) if CLIPDUR.exists() else {}
    mani = json.loads(MANI.read_text(encoding='utf-8'))
    e_ok = all(cd.get(k) == v for k, v in SPEC_DUR.items()) and len(cd) >= 7
    m_ok = all(k in mani and 'cir' in mani[k].get('games', []) for k in SPEC_DUR)
    n_cir = sum(1 for k, v in mani.items() if 'cir' in v.get('games', []))
    chk('E clip 实长=SPEC_DUR（_clipdur39.json 真值源）', e_ok, str({k: cd.get(k) for k in SPEC_DUR}))
    chk('E manifest cir_ 7 键在册（games 计数 10=7+core3）', m_ok and n_cir == 10, 'n=%d' % n_cir)

    print('')
    print('SPEC39R4 RECON %d/%d PASS' % (PASSC, PASSC + FAILC))
    sys.exit(0 if not FAILC else 1)

if __name__ == '__main__':
    main()
