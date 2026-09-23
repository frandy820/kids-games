# -*- coding: utf-8 -*-
"""season 独立复验 r4：断言全部从 SPEC §0.62 r4 块推导（Python 侧独立 30 物品双属性表，
不引用页面 ITEMS/OUT2/OUT3/TRAP_PAIRS）——提交制三路径 / 反向题结构 / 唯一性铁律复核"""
import os, sys, json, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'season', 'index.html').replace(chr(92), '/')

# ---- Python 独立真值（SPEC §0.62 r4 块）----
TEMPS = ['cold', 'cool', 'hot']
OCCS = ['school', 'sport', 'sleep', 'party']
ITEMS = {                                   # item -> (temp 集, occ 集)
    'umbrella':    (['cool'], ['school', 'party']),
    'rainboots':   (['cool'], ['school']),
    'lightjacket': (['cool'], ['school', 'sport', 'party']),
    'kite':        (['cool'], ['sport']),
    'tshirt':      (['hot'], ['school', 'sport', 'party']),
    'sandals':     (['hot'], ['school', 'party']),
    'sunhat':      (['hot'], ['school', 'sport', 'party']),
    'goggles':     (['hot'], ['sport']),
    'longsleeve':  (['cool'], ['school', 'sport', 'party']),
    'vest':        (['cool'], ['school', 'party']),
    'pants':       (['cool', 'cold'], ['school', 'sport', 'party']),
    'trench':      (['cool'], ['school', 'party']),
    'heavycoat':   (['cold'], ['school', 'sport', 'party']),
    'gloves':      (['cold'], ['school', 'sport']),
    'scarf':       (['cold'], ['school', 'party']),
    'snowboots':   (['cold'], ['school']),
    'sweater':     (['cold'], ['school', 'sport', 'party']),
    'shorts':      (['hot'], ['school', 'sport']),
    'skirt':       (['hot', 'cool'], ['school', 'party']),
    'dress':       (['hot', 'cool', 'cold'], ['party']),
    'sneaker':     (['hot', 'cool'], ['school', 'sport']),
    'partyshoes':  (['cool', 'cold'], ['school', 'party']),
    'woolhat':     (['cold'], ['school', 'party']),
    'cap':         (['hot', 'cool'], ['sport']),
    'thinscarf':   (['cool'], ['school', 'party']),
    'earmuffs':    (['cold'], ['school', 'sport', 'party']),
    'warmpants':   (['cold'], ['school', 'sport']),
    'swimsuit':    (['hot'], ['sport']),
    'pajamas':     (['hot', 'cool', 'cold'], ['sleep']),
    'slippers':    (['hot', 'cool', 'cold'], ['sleep']),
}
OUT2 = {
    'cold|school': [['heavycoat', 'pants'], ['sweater', 'warmpants']],
    'cold|sport': [['sweater', 'pants'], ['heavycoat', 'warmpants']],
    'cold|sleep': [['pajamas', 'slippers']],
    'cold|party': [['heavycoat', 'dress'], ['sweater', 'dress']],
    'cool|school': [['lightjacket', 'pants'], ['trench', 'skirt']],
    'cool|sport': [['longsleeve', 'pants'], ['lightjacket', 'pants']],
    'cool|sleep': [['pajamas', 'slippers']],
    'cool|party': [['trench', 'skirt'], ['lightjacket', 'skirt']],
    'hot|school': [['tshirt', 'shorts'], ['tshirt', 'skirt']],
    'hot|sport': [['tshirt', 'shorts'], ['swimsuit', 'goggles']],
    'hot|sleep': [['pajamas', 'slippers']],
    'hot|party': [['dress', 'sandals'], ['tshirt', 'skirt']],
}
OUT3 = {
    'cold|school': [['heavycoat', 'pants', 'scarf'], ['sweater', 'warmpants', 'woolhat']],
    'cold|sport': [['sweater', 'pants', 'gloves'], ['heavycoat', 'warmpants', 'earmuffs']],
    'cold|party': [['heavycoat', 'dress', 'partyshoes'], ['sweater', 'dress', 'partyshoes']],
    'cool|school': [['lightjacket', 'pants', 'rainboots'], ['trench', 'skirt', 'umbrella']],
    'cool|sport': [['longsleeve', 'pants', 'cap'], ['lightjacket', 'pants', 'kite'],
                   ['longsleeve', 'pants', 'sneaker']],
    'cool|party': [['trench', 'dress', 'partyshoes'], ['lightjacket', 'skirt', 'thinscarf']],
    'hot|school': [['tshirt', 'shorts', 'sandals'], ['tshirt', 'skirt', 'sunhat']],
    'hot|sport': [['tshirt', 'shorts', 'cap'], ['tshirt', 'shorts', 'sneaker'],
                  ['swimsuit', 'goggles', 'cap']],
    'hot|party': [['tshirt', 'skirt', 'sunhat'], ['tshirt', 'dress', 'sandals']],
}
TRAP = [('lightjacket', 'heavycoat'), ('thinscarf', 'scarf'), ('sunhat', 'woolhat'),
        ('tshirt', 'longsleeve'), ('sandals', 'sneaker'), ('pants', 'shorts')]
ANTI_POOL = ['tshirt', 'longsleeve', 'lightjacket', 'heavycoat', 'thinscarf', 'scarf',
             'sunhat', 'woolhat', 'sandals', 'snowboots', 'shorts', 'warmpants']
TEMP_N = {'cold': '很冷', 'cool': '凉爽', 'hot': '很热'}
OCC_N = {'school': '去上学', 'sport': '做运动', 'sleep': '去睡觉', 'party': '去派对'}
OCC3_POOL = {'school', 'sport', 'party'}      # ch2/ch3 池排除 sleep


def fits(k, b, o):
    t, oc = ITEMS[k]
    return b in t and o in oc


def trap_mate(k):
    for a, b in TRAP:
        if k == a:
            return b
        if k == b:
            return a
    return None


RES = []
def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))


def audit_quiz(q, dch, tag):
    """SE.quiz q0 口径：kind/band/occ/need/picks/picked/step/miss"""
    errs = []
    b, occ, need, picks = q.get('band'), q.get('occ'), q.get('need') or [], q.get('picks') or []
    if b not in TEMPS:
        return ['%s band=%s 表外' % (tag, b)]
    if any(k not in ITEMS for k in picks):
        return ['%s 物品表外 %s' % (tag, picks)]
    if q.get('kind') == 'anti':
        if dch != 4:
            errs.append('%s 反向题出现在 dch%s' % (tag, dch))
        if len(need) != 1 or need[0] not in ANTI_POOL:
            errs.append('%s 反向 need=%s 表外' % (tag, need))
            return errs
        if b in ITEMS[need[0]][0]:
            errs.append('%s 反向 need=%s 却 fits 带 %s' % (tag, need[0], b))
        if len(picks) != 4 or len(set(picks)) != 4 or need[0] not in picks:
            errs.append('%s 反向卡形 %s' % (tag, picks))
            return errs
        nfit = sum(1 for c in picks if c != need[0] and b in ITEMS[c][0])
        if nfit != 3:
            errs.append('%s 反向干扰 fits 数=%d（应 3）' % (tag, nfit))
        return errs
    if occ not in OCCS:
        return ['%s occ=%s 表外' % (tag, occ)]
    key = b + '|' + occ
    table = OUT2 if len(need) == 2 else OUT3
    if need not in table.get(key, []):
        return ['%s need=%s 不在表[%s]' % (tag, need, key)]
    for nk in need:
        if not fits(nk, b, occ):
            errs.append('%s need 件 %s 不 fits' % (tag, nk))
    if len(picks) != len(need) + 3 or len(set(picks)) != len(picks):
        errs.append('%s 卡数/互异 %s' % (tag, picks))
        return errs
    for nk in need:
        if nk not in picks:
            errs.append('%s need 件 %s 缺席' % (tag, nk))
    for c in picks:                              # 唯一性铁律：干扰恒 !fits
        if c not in need and fits(c, b, occ):
            errs.append('%s 干扰 %s 却 fits[%s]' % (tag, c, key))
    if dch == 1 and len(need) != 2:
        errs.append('%s dch1 非两件' % tag)
    if dch == 2 and (len(need) != 3 or occ not in OCC3_POOL):
        errs.append('%s dch2 非三件或 occ=%s 入池' % (tag, occ))
    if dch == 3:
        has = False
        for nk in need:
            mate = trap_mate(nk)
            if mate and not fits(mate, b, occ):
                has = True
                if mate not in picks:
                    errs.append('%s 陷阱对件 %s 缺席' % (tag, mate))
        if not has:
            errs.append('%s dch3 无陷阱成员' % tag)
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
    sv = pg2.evaluate('() => { const s = localStorage.getItem("kidsgame_season"); return s ? JSON.parse(s) : null; }')
    pg2.close()
    chk('T2 真实页预置存档 v1.0', bool(sv) and sv.get('v') == '1.0', 'sv=%s' % (str(sv)[:80] if sv else None))

    errs3 = []
    for f in range(20):
        q = pg.evaluate('(f) => { SE.start(f); return { q: SE.quiz, dch: SE.currentLevel && SE.currentLevel.dch }; }', f)
        exp = f // 5 + 1
        if not q.get('q') or q.get('dch') != exp:
            errs3.append('flat%d dch=%s 期望%d' % (f, q.get('dch'), exp)); continue
        errs3 += audit_quiz(q['q'], q['dch'], 'flat%d' % f)
    a0 = pg.evaluate('() => { SE.start(0); return SE.quiz; }')
    chk('T3 静态关0-19 变体表+双约束+唯一性+章规', not errs3, errs3[:4])
    chk('T3b flat0 q0 锚定 cold|school [heavycoat,pants]',
        a0['kind'] == 'outfit' and a0['band'] == 'cold' and a0['occ'] == 'school'
        and a0['need'] == ['heavycoat', 'pants'], a0)

    errs4 = []; dch_stat = {}
    for f in range(20, 40):
        q = pg.evaluate('(f) => { SE.start(f); return { q: SE.quiz, dch: SE.currentLevel && SE.currentLevel.dch }; }', f)
        d = q.get('dch'); dch_stat[d] = dch_stat.get(d, 0) + 1
        if not q.get('q') or d not in (1, 2, 3, 4):
            errs4.append('flat%d dch=%s' % (f, d)); continue
        errs4 += audit_quiz(q['q'], d, 'flat%d' % f)
    chk('T4 生成关20-39 dch直读审计（四型全现）', not errs4 and len(dch_stat) == 4,
        'stat=%s errs=%s' % (dch_stat, errs4[:4]))

    a = pg.evaluate('() => { SE.start(10); return JSON.stringify(SE.quiz); }')
    a2 = pg.evaluate('() => { SE.start(10); return JSON.stringify(SE.quiz); }')
    chk('T5 确定性', a == a2, a[:60])

    # T6 提交制三路径（flat7=dch2 三件套）：less 保留 / more 清空+miss / 越界 tapItem=False
    pg.evaluate('() => SE.start(7)')
    pg.wait_for_timeout(300)
    q = pg.evaluate('() => SE.quiz')
    na = q['picks'].index(q['need'][0])
    nw = next(i for i, c in enumerate(q['picks']) if c not in q['need'])
    pg.evaluate('(i) => SE.tapItem(i)', na)
    pg.evaluate('window.__lastSayText = null; lastWrongVoice = 0')
    r_less = pg.evaluate('() => SE.tapSubmit()')
    pg.wait_for_timeout(200)
    st_less = pg.evaluate('() => ({ miss: SE.quiz.miss, picked: SE.quiz.picked.length })')
    pg.evaluate('(i) => SE.tapItem(i)', nw)
    pg.evaluate('lastWrongVoice = 0')            # flat≥3 反馈句 10s 节流：重置锚再验 more 句
    r_more = pg.evaluate('() => SE.tapSubmit()')
    pg.wait_for_timeout(900)
    st_more = pg.evaluate('() => ({ miss: SE.quiz.miss, picked: SE.quiz.picked.length, step: SE.quiz.step })')
    say_more = pg.evaluate('window.__lastVoiceKey')   # T46 阶段2：more 反馈 clip 化（sea_sub_more SPEC 键）
    r_oob = pg.evaluate('() => (async()=>{ try { return await SE.tapItem(99) } catch(e){ return "ERR" } })()')
    chk('T6 提交三路径 less保留/more清空+miss+反馈句/越界False',
        r_less == 'wrong_less' and st_less == {'miss': 0, 'picked': 1} and
        r_more == 'wrong_more' and st_more['miss'] == 1 and st_more['picked'] == 0 and
        st_more['step'] == 0 and say_more == 'sea_sub_more' and r_oob is False,   # T46：文本由 manifest 对账（sea_sub_more='多选了一件，再挑一挑'）
        'r=%s/%s oob=%s st=%s/%s say=%s' % (r_less, r_more, r_oob, st_less, st_more, say_more))

    # T7 反向题（flat15-39 首个 anti 关）：点适配件=wrong+miss；点 need=right 推进
    af = pg.evaluate('''(() => { for (let f = 15; f < 40; f++) {
        if (genLevel(f).quizzes[0].kind === 'anti') return f; } return -1; })()''')
    pg.evaluate('(f) => SE.start(f)', af)
    pg.wait_for_timeout(300)
    qa = pg.evaluate('() => SE.quiz')
    i_fit = next(i for i, c in enumerate(qa['picks']) if c != qa['need'][0] and qa['band'] in ITEMS[c][0])
    i_need = qa['picks'].index(qa['need'][0])
    pg.evaluate('(i) => SE.tapItem(i)', i_fit)
    pg.wait_for_timeout(1300)
    st_w = pg.evaluate('() => ({ miss: SE.quiz.miss, step: SE.quiz.step })')
    r_n = pg.evaluate('(i) => SE.tapItem(i)', i_need)
    pg.wait_for_timeout(300)
    st_n = pg.evaluate('() => SE.quiz.step')
    chk('T7 反向题 适配件=wrong+miss / need卡=right推进',
        af >= 15 and st_w == {'miss': 1, 'step': 0} and r_n == 'right' and st_n == 1,
        'flat=%s w=%s n=%s' % (af, st_w, r_n))

    # T8 双提交 40ms 防重入（miss 只 +1）
    pg.evaluate('() => SE.start(3)')
    pg.wait_for_timeout(300)
    q = pg.evaluate('() => SE.quiz')
    na = q['picks'].index(q['need'][0])
    nw = next(i for i, c in enumerate(q['picks']) if c not in q['need'])
    pg.evaluate('(i) => SE.tapItem(i)', na)
    pg.evaluate('(i) => SE.tapItem(i)', nw)
    m0 = pg.evaluate('() => SE.quiz.miss')
    r_second = pg.evaluate('''() => new Promise(res => {
      SE.tapSubmit();
      setTimeout(() => { Promise.resolve(SE.tapSubmit()).then(r => res(r)); }, 40);
    })''')
    pg.wait_for_timeout(1000)
    m1 = pg.evaluate('() => SE.quiz.miss')
    chk('T8 双提交防重入 miss只+1', r_second is False and m1 == m0 + 1, 'miss %s→%s second=%s' % (m0, m1, r_second))

    def stars_after(nwrong):
        pg.evaluate('() => SE.start(5)')
        pg.wait_for_timeout(300)
        for _ in range(nwrong):
            q = pg.evaluate('() => SE.quiz')
            na = q['picks'].index(q['need'][0])
            nw = next(i for i, c in enumerate(q['picks']) if c not in q['need'])
            pg.evaluate('(i) => SE.tapItem(i)', na)
            pg.evaluate('(i) => SE.tapItem(i)', nw)
            pg.evaluate('() => SE.tapSubmit()')
            pg.wait_for_timeout(900)
        pg.evaluate('() => SE.autoSolve()')
        for _ in range(120):
            pg.wait_for_timeout(300)
            lv = pg.evaluate('() => SE.currentLevel')
            if lv and lv.get('won'):
                return lv.get('stars')
        return None
    st0, st1, st3 = stars_after(0), stars_after(1), stars_after(3)
    chk('T9 星级 0错=3★ 1错=2★ 3错=1★', (st0, st1, st3) == (3, 2, 1), '%s/%s/%s' % (st0, st1, st3))

    pg.close(); b.close()

src = open(os.path.join(BASE, 'season', '_src', 'game-main.js'), encoding='utf-8').read()
data = open(os.path.join(BASE, 'season', '_src', 'game-data.js'), encoding='utf-8').read()
bld = open(os.path.join(BASE, 'season', '_src', 'build.py'), encoding='utf-8').read()

okA = re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', src) and re.search(r'nextHint\(\s*null\s*\)', src)
chk('T10 家族A nextHint(lim-1)+nextHint(null)', bool(okA))

# C7 r4：CHAPTERS[i].hint 预告 i+1 章特征关键词；GEN_HINTS[k] ↔ dch=k+1
hints = re.findall(r"hint:\s*'([^']+)'", data)
gk = re.search(r'GEN_HINTS\s*=\s*\[(.*?)\];', data, re.S)
ghints = re.findall(r"'([^']+)'", gk.group(1)) if gk else []
sem = (len(hints) == 4 and len(ghints) == 4 and
       '三件' in hints[0] and            # ch1 末预告 ch2 三件套
       '像' in hints[1] and '仔细' in hints[1] and   # ch2 末预告 ch3 近季陷阱
       '反' in hints[2] and              # ch3 末预告 ch4 反向题
       '新' in hints[3] and              # ch4 末预告生成关
       '两件' in ghints[0] and '三件' in ghints[1] and
       '像' in ghints[2] and '不合适' in ghints[3])
chk('T11 C7 hint 4章关键词/GEN 4条对应', sem, 'hints=%s g=%s' % (hints, ghints))

okB = ('estMs' in bld and '5400' in bld and '4750' in bld and      # m-5 链窗 4600→4750 定版（T12 锚同步漏网，T46 阶段2 修）
       re.search(r'tts_max\s*==\s*11', bld))
chk('T12 build.py 静态窗断言（win5400/链4750/TTS_MAX_CHARS=11）', bool(okB))

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
