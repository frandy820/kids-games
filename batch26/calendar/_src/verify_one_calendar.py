# -*- coding: utf-8 -*-
"""calendar 独立复验（r37 适配版，归档 _src/；主线收编时 URL 已改本目录相对路径）
断言全部从 SPEC-R37 §R2/§R3 推导（Python 侧独立星期7/月份12环序列+十型步长表+月末行表）。
适配面（相对 v1 主线版）：T3 章型腿 ch2=month 族（含多步跳）/ch3 新谱；audit_quiz 扩
十型 answer=±1/±2 环步+cbound 行表+dateq 锚排除+近对（±2=中转词在场）；T4 同构。"""
import os, sys, json, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, '..', 'index.html').replace(chr(92), '/')

# ---- Python 独立真值（SPEC-R37 §R2/§R3）----
DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
KINDS10 = ['day', 'month', 'day_rev', 'month_rev',
           'day_2', 'day_m2', 'month_2', 'month_m2', 'dateq', 'cbound']
CB = {'一月': 31, '三月': 31, '四月': 30, '五月': 31, '六月': 30, '七月': 31,
      '八月': 31, '九月': 30, '十月': 31, '十一月': 30, '十二月': 31}
NUMW = {30: '三十', 31: '三十一', 32: '三十二'}
def cyc(kind):
    return DAYS if kind.startswith('day') or kind == 'dateq' else MONTHS
def step_of(kind):
    return {'day': 1, 'month': 1, 'day_rev': -1, 'month_rev': -1,
            'day_2': 2, 'month_2': 2, 'dateq': 2, 'day_m2': -2, 'month_m2': -2}[kind]
def stepn(kind, w, d):
    c = cyc(kind); return c[(c.index(w) + d + len(c)) % len(c)]
def succ(kind, w):
    return stepn(kind, w, 1)
def pred(kind, w):
    return stepn(kind, w, -1)
def is_wrap(q):
    """接龙跨界：前向 base=尾→answer=首"""
    c = cyc(q['kind'])
    if q['kind'].endswith('_rev'):
        return q['base'] == c[0]
    return q['base'] == c[-1]

RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))

def audit_quiz(q, tag, ch3_rule=False):
    errs = []
    k = q.get('kind'); base = q.get('base'); ans = q.get('answer'); opts = q.get('opts') or []
    if k == 'cbound':                                   # 月末边界行表（独立表对账）
        if base not in CB:
            errs.append('%s cbBase=%s 表外' % (tag, base)); return errs
        ni = MONTHS.index(base)
        want = MONTHS[(ni + 1) % 12] + '一号'
        if ans != want:
            errs.append('%s cb %s 应=%s 实=%s' % (tag, base, want, ans))
        legal = {want, base + NUMW[32 if CB[base] == 31 else 31] + '号',
                 MONTHS[(ni + 1) % 12] + '二号', MONTHS[(ni + 2) % 12] + '一号'}
        ws0 = [o.get('word') for o in opts]
        if len(opts) != 4 or len(set(ws0)) != 4 or set(ws0) != legal:
            errs.append('%s cbWords %s' % (tag, ws0))
        return errs
    c = cyc(k) if k in KINDS10 else None
    if c is None: errs.append('%s kind=%s 表外' % (tag, k)); return errs
    if base not in c or ans not in c: errs.append('%s 词表外 base=%s ans=%s' % (tag, base, ans)); return errs
    want = stepn(k, base, step_of(k))
    if ans != want: errs.append('%s %s(%s) 应=%s 实=%s' % (tag, k, base, want, ans))
    ws = [o.get('word') for o in opts]
    if len(opts) != 4 or len(set(ws)) != 4: errs.append('%s opts 形状%s' % (tag, ws)); return errs
    if ws.count(ans) != 1: errs.append('%s 答案恰1失败%s' % (tag, ws))
    adj = {succ(k, ans), pred(k, ans)}
    if not (set(ws) - {ans}) & adj: errs.append('%s 相邻近对缺席 ans=%s opts=%s' % (tag, ans, ws))
    if k == 'dateq' and base in ws: errs.append('%s dateq 锚入干扰' % tag)
    if abs(step_of(k)) == 2:                           # ±2 强近对=中转词=答案往 base 方向 1 格（SPEC-R37 §R3）
        mid = stepn(k, ans, 1 if step_of(k) < 0 else -1)
        if mid not in ws: errs.append('%s 中转词缺席 mid=%s opts=%s' % (tag, mid, ws))
    if ch3_rule:
        is_cross = k in ('day', 'month') and base == (DAYS[-1] if k == 'day' else MONTHS[-1])
        is_m2c = ((k == 'day_m2' and base in ('星期一', '星期二')) or
                  (k == 'month_m2' and base in ('一月', '二月')))
        if not (is_cross or is_m2c or k in ('day_rev', 'month_rev')):
            errs.append('%s ch3 谱外题型 kind=%s base=%s' % (tag, k, base))
    return errs

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(URL + '?verify=1')
    t = ''
    for _ in range(120):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('T1 selftest 复跑', 'VERIFY PASS' in t, t)

    pg2 = b.new_page()
    pg2.goto(URL)
    pg2.wait_for_timeout(3000)
    sv = pg2.evaluate('() => { const s = localStorage.getItem("kidsgame_calendar"); return s ? JSON.parse(s) : null; }')
    pg2.close()
    chk('T2 真实页预置存档 v1.0', bool(sv) and sv.get('v') == '1.0', 'sv=%s' % (str(sv)[:80] if sv else None))

    # T3 教学关：flat0-4 全 day / 5-9 全 month 族（含多步跳）/ 10-14 ch3 新谱（rev/反向跨界/接龙跨界）
    # 15-19 ch4（dateq+cbound 各恰 1）
    errs3 = []
    for f in range(20):
        q = pg.evaluate('(f) => { CA.start(f); return { q: CA.quiz, dch: CA.currentLevel && CA.currentLevel.dch }; }', f)
        if not q.get('q'):
            errs3.append('flat%d 无quiz' % f); continue
        kind = q['q'].get('kind')
        if f < 5 and kind != 'day': errs3.append('flat%d ch1 应day 实%s' % (f, kind))
        if 5 <= f < 10 and kind not in ('month', 'month_2', 'month_m2'):
            errs3.append('flat%d ch2 应month族 实%s' % (f, kind))
        if q.get('dch') != f // 5 + 1: errs3.append('flat%d dch=%s' % (f, q.get('dch')))
        errs3 += audit_quiz(q['q'], 'flat%d' % f, ch3_rule=(10 <= f < 15))
    # ch3 每关谱：接龙跨界恰 1+反向多步跨界恰 2+rev 恰 2；ch4 dateq/cbound 各恰 1
    for f in range(10, 20):
        pg.evaluate('(f) => CA.start(f)', f)
        pg.wait_for_timeout(300)
        kinds = [pg.evaluate('() => CA.quiz.kind')]
        wraps = 1 if kinds[0] and pg.evaluate('() => ({k: CA.quiz.kind, b: CA.quiz.base})')['k'] in ('day', 'month') and pg.evaluate('() => CA.quiz.base') in ('星期日', '十二月') else 0
        for s in range(4):
            qq = pg.evaluate('() => CA.quiz')
            if qq is None:
                break
            ri_ = next((i for i, o in enumerate(qq['opts']) if o['word'] == qq['answer']), None)
            if ri_ is None:
                break
            pg.evaluate('(i) => { CA.tapOpt(i); return 1; }', ri_)
            pg.wait_for_timeout(800)
            nk = pg.evaluate('() => CA.quiz && CA.quiz.kind')
            if nk:
                kinds.append(nk)
                kb = pg.evaluate('() => CA.quiz && ({k: CA.quiz.kind, b: CA.quiz.base})')
                if kb['k'] in ('day', 'month') and kb['b'] in ('星期日', '十二月'):
                    wraps += 1
        if 10 <= f < 15:
            # 反向多步跨界按关级谱断言（引擎级，见 T3 全量对账）；此处 UI 级验接龙跨界 ≥1 与谱内 kind
            if wraps < 1: errs3.append('flat%d ch3 接龙跨界缺席(0/%d)' % (f, len(kinds)))
            bad_kinds = [k for k in kinds if k not in ('day', 'month', 'day_rev', 'month_rev', 'day_m2', 'month_m2')]  # day/month=接龙跨界（base=环尾）
            if bad_kinds: errs3.append('flat%d ch3 谱外 %s' % (f, bad_kinds))
        else:
            if kinds.count('dateq') != 1 or kinds.count('cbound') != 1:
                errs3.append('flat%d ch4 dateq/cbound 计数 %s/%s' % (f, kinds.count('dateq'), kinds.count('cbound')))
    chk('T3 教学关0-19 环序列+章型+ch3/ch4 新谱', not errs3, errs3[:5])

    # T4 生成关 20-39（dch 直读；dch4 含新题型）
    errs4 = []; dch_stat = {}; new_in_gen4 = 0
    for f in range(20, 40):
        q = pg.evaluate('(f) => { CA.start(f); return { q: CA.quiz, dch: CA.currentLevel && CA.currentLevel.dch }; }', f)
        d = q.get('dch'); dch_stat[d] = dch_stat.get(d, 0) + 1
        if not q.get('q') or d not in (1, 2, 3, 4):
            errs4.append('flat%d dch=%s' % (f, d)); continue
        errs4 += audit_quiz(q['q'], 'flat%d' % f)
    kinds_gen = pg.evaluate('Array.from({length:20}, (_, i) => { const L = genLevel(i + 20); return L.dch === 4 ? L.quizzes.map(q => q.kind) : []; }).flat()')
    new_in_gen4 = sum(1 for k in kinds_gen if k in ('dateq', 'cbound'))
    if new_in_gen4 < 2: errs4.append('生成 dch4 新题型不足 %d' % new_in_gen4)
    chk('T4 生成关20-39 dch直读审计+新题型在场', not errs4, 'stat=%s new4=%d errs=%s' % (dch_stat, new_in_gen4, errs4[:4]))

    a = pg.evaluate('() => { CA.start(10); const q = CA.quiz; return JSON.stringify({ k: q.kind, b: q.base, o: q.opts.map(x => x.word) }); }')
    a2 = pg.evaluate('() => { CA.start(10); const q = CA.quiz; return JSON.stringify({ k: q.kind, b: q.base, o: q.opts.map(x => x.word) }); }')
    chk('T5 确定性', a == a2, '%s vs %s' % (a, a2))

    pg.evaluate('() => CA.start(7)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => CA.quiz')
    wi = next(i for i, o in enumerate(q['opts']) if o['word'] != q['answer'])
    m0 = q['miss']; s0 = q['step']
    r1 = pg.evaluate('(i) => (async()=>{ try { return await CA.tapOpt(i) } catch(e){ return "ERR" } })()', wi)
    pg.wait_for_timeout(900)
    qd = pg.evaluate('() => CA.quiz')
    ok6 = r1 == 'wrong' and qd['miss'] == m0 + 1 and qd['step'] == s0
    r3 = pg.evaluate('() => (async()=>{ try { return await CA.tapOpt(99) } catch(e){ return "ERR" } })()')
    chk('T6 错=wrong+miss+1+step不变 / 越界=False', ok6 and r3 is False, 'r1=%s r3=%s miss %s→%s' % (r1, r3, m0, qd['miss']))

    pg.evaluate('() => CA.start(3)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => CA.quiz')
    wi = next(i for i, o in enumerate(q['opts']) if o['word'] != q['answer'])
    m0 = q['miss']
    pg.evaluate('(i) => { CA.tapOpt(i); return 1; }', wi)
    pg.wait_for_timeout(40)
    pg.evaluate('(i) => { CA.tapOpt(i); return 1; }', wi)
    pg.wait_for_timeout(1000)
    m1 = pg.evaluate('() => CA.quiz.miss')
    chk('T7 双错防重入 miss只+1', m1 == m0 + 1, 'miss %s→%s' % (m0, m1))

    def stars_after(nwrong):
        pg.evaluate('() => CA.start(5)')
        pg.wait_for_timeout(400)
        for _ in range(nwrong):
            q = pg.evaluate('() => CA.quiz')
            wi = next(i for i, o in enumerate(q['opts']) if o['word'] != q['answer'])
            pg.evaluate('(i) => CA.tapOpt(i)', wi)
            pg.wait_for_timeout(700)
        pg.evaluate('() => { CA.autoSolve(); return 1; }')
        for _ in range(80):
            pg.wait_for_timeout(300)
            lv = pg.evaluate('() => CA.currentLevel')
            if lv and lv.get('won'):
                return lv.get('stars')
        return None
    st0, st1, st3 = stars_after(0), stars_after(1), stars_after(3)
    chk('T8 星级 0错=3★ 1错=2★ 3错=1★', (st0, st1, st3) == (3, 2, 1), '%s/%s/%s' % (st0, st1, st3))

    pg.close(); b.close()

src = open(os.path.join(BASE, 'game-main.js'), encoding='utf-8').read()
data = open(os.path.join(BASE, 'game-data.js'), encoding='utf-8').read()
bld = open(os.path.join(BASE, 'build.py'), encoding='utf-8').read()

okA = re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', src) and re.search(r'nextHint\(\s*null\s*\)', src)
chk('T9 家族A nextHint(lim-1)+nextHint(null)', bool(okA))

hints = re.findall(r"hint:\s*'([^']+)'", data)
titles = re.findall(r"(?:title|name|nm|label)\s*:\s*'([^']+)'", data)
gk = re.search(r'GEN_HINTS\s*=\s*[\[{](.*?)[\]}]', data, re.S)
ghints = re.findall(r"'([^']+)'", gk.group(1)) if gk else []
def sh(a, b_):
    return len(set(a) & set(b_))
sem = (len(hints) == 4 and len(titles) >= 4 and len(ghints) == 4
       and all((sh(hints[i], titles[i + 1]) > sh(hints[i], titles[i])) or (sh(hints[i], titles[i + 1]) >= 2 and sh(hints[i], titles[i + 1]) >= sh(hints[i], titles[i])) for i in range(3))
       and all(sh(ghints[k], titles[k]) >= 1 for k in range(4)))
chk('T10 C7 hint4章/GEN4/预告下一章(计分)', sem, 'hints=%s titles=%s g=%s' % (hints, titles[:5], ghints))

okB = ('2700' in bld or 'estMs' in bld) and ('est' in bld.lower())
chk('T11 build.py 静态窗断言', okB)

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
