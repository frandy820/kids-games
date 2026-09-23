# -*- coding: utf-8 -*-
"""sign 独立复验 r36 适配版（原 batch26/verify_one_sign.py 按 SPEC-R36-SIGN §R7 逐腿适配；
断言全部从 SPEC §R1/§R2 推导——Python 侧独立封闭表，不读游戏数据表）。
适配点：封闭表 24/近对 9 对/池 5-15-18-24/新章池/quiz 增 kind+flash 字段+关级构成计数/
反馈链键化口径（__lastQueue[1].key='sgn_guide_'+fam——修复基线存量红）/MUTE 双保险（r19）。
建议主线以本文件覆盖 batch26/verify_one_sign.py（SPEC §R8 声明，本 agent 不动原文件）。
b25 五坑全避：fire-and-forget 防重入 / 生成关 dch 钩子直读 / 探测关星级断言不参与
"""
import os
import sys
import json
import re
import time
from datetime import date, timedelta
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(os.path.dirname(HERE), 'index.html').replace(chr(92), '/')

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };"""

TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')

# ---- Python 独立真值（SPEC-R36-SIGN §R1）----
WALK5 = ['light', 'zebra', 'bridge', 'tunnel', 'walk']                   # ch1 行走安全 5
DENY15 = ['noentry', 'nocar', 'noped', 'nobike', 'horn', 'stop', 'yield',
          'ped', 'child', 'work', 'slow', 'cross', 'turn', 'slip', 'rail']  # ch2 红圈黄三角 15
ALL24 = WALK5 + DENY15 + ['oneway', 'straight', 'goleft', 'goright']
NEAR = {'noentry': 'nocar', 'nocar': 'noentry', 'noped': 'nobike', 'nobike:': None} # placeholder 下方重建
NEAR = {'noentry': 'nocar', 'nocar': 'noentry', 'noped': 'nobike', 'nobike': 'noped',
        'stop': 'yield', 'yield': 'stop', 'ped': 'child', 'child': 'ped',
        'cross': 'turn', 'turn': 'cross', 'slip': 'slow', 'slow': 'slip',
        'oneway': 'straight', 'straight': 'oneway', 'goleft': 'goright', 'goright': 'goleft',
        'zebra': 'walk', 'walk': 'zebra'}
NEAR_POOL = list(NEAR.keys())                                            # ch3 目标池 18
FAM = {'light': 'signal', 'zebra': 'blue', 'bridge': 'blue', 'tunnel': 'blue', 'walk': 'blue',
       'noentry': 'red', 'nocar': 'red', 'noped': 'red', 'nobike': 'red', 'horn': 'red',
       'stop': 'redoct', 'yield': 'redtri', 'ped': 'yellow', 'child': 'yellow',
       'work': 'yellow', 'slow': 'yellow', 'cross': 'yellow', 'turn': 'yellow',
       'slip': 'yellow', 'rail': 'yellow', 'oneway': 'blue', 'straight': 'bluec',
       'goleft': 'bluec', 'goright': 'bluec'}
GUIDE = {'red': '红圈圈说，不能做', 'redoct': '红八角说，停下来', 'redtri': '红倒三角说，让一让',
         'yellow': '黄三角说，要小心', 'blue': '蓝牌子说，这样走', 'bluec': '蓝圆圈说，这样走',
         'signal': '看看灯的颜色再走'}


def pool_of(dch):
    return {1: WALK5, 2: DENY15, 3: NEAR_POOL, 4: ALL24}[dch]


RES = []


def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + ('  | ' + str(info) if info else ''))


def audit_quiz(q, dch, tag):
    """单题审计：返回错误列表（空=过）"""
    errs = []
    sg = q.get('sign')
    mn = q.get('meaning')
    cards = q.get('cards') or []
    if sg not in ALL24:
        errs.append('%s sign=%s 表外' % (tag, sg))
        return errs
    if mn != sg:
        errs.append('%s meaning(%s)!=sign(%s)' % (tag, mn, sg))
    if q.get('kind') not in ('mean', 'act'):
        errs.append('%s kind=%s' % (tag, q.get('kind')))
    ms = [c.get('meaning') for c in cards]
    if len(cards) != 4 or len(set(ms)) != 4:
        errs.append('%s cards 形状%s' % (tag, ms))
        return errs
    if ms.count(sg) != 1:
        errs.append('%s 正确含义恰1失败%s' % (tag, ms))
    if sg not in pool_of(dch):
        errs.append('%s sign=%s 不在 dch%d 池' % (tag, sg, dch))
    if dch == 3 and NEAR[sg] not in ms:
        errs.append('%s ch3 近对缺席 sign=%s cards=%s' % (tag, sg, ms))
    if dch == 4 and q.get('kind') != 'act' and NEAR.get(sg) not in ms:
        errs.append('%s ch4 非 act 近对缺席 sign=%s' % (tag, sg))
    if dch == 1 and any(m not in WALK5 for m in ms):
        errs.append('%s ch1 卡出池%s' % (tag, ms))
    return errs


def audit_level(lv_quizzes, dch, flat):
    """关级构成审计（SPEC §R2）：返回错误列表"""
    errs = []
    n_flash = sum(1 for q in lv_quizzes if q.get('flash'))
    n_act = sum(1 for q in lv_quizzes if q.get('kind') == 'act')
    if dch == 1 and (n_flash, n_act) != (0, 0):
        errs.append('flat%d dch1 构成 flash=%d act=%d' % (flat, n_flash, n_act))
    if dch == 2 and (n_flash, n_act) != (2, 0):
        errs.append('flat%d dch2 构成 flash=%d act=%d' % (flat, n_flash, n_act))
    if dch == 3 and (n_flash != 1 or n_act != 0 or lv_quizzes[0].get('flash')):
        errs.append('flat%d dch3 构成 flash=%d' % (flat, n_flash))
    if dch == 4 and (n_act != 2 or n_flash != 1):
        errs.append('flat%d dch4 构成 act=%d flash=%d' % (flat, n_act, n_flash))
    return errs


GET_LEVEL_JS = ('(f) => { SG.start(f); return { q: SG.quiz, dch: SG.currentLevel && SG.currentLevel.dch,'
                ' kinds: genLevel(f).quizzes.map(x => x.kind),'
                ' flashes: genLevel(f).quizzes.map(x => !!x.flash) }; }')

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context()
    ctx.add_init_script(MUTE_INIT)                       # r19 双保险
    pg = ctx.new_page()
    pg.goto(URL + '?verify=1')
    t = ''
    for _ in range(150):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('T1 selftest 复跑', 'VERIFY PASS' in t, t)

    # T2 家族C 预置存档（正常模式 MUTE 种档——r19）
    ctx2 = b.new_context()
    ctx2.add_init_script(MUTE_INIT)
    seed = ('localStorage.setItem("kidsgame_sign", ' +
            json.dumps(json.dumps({'v': '1.0', 'game': 'sign', 'firstDay': OLD, 'lastDay': TODAY,
                                   'levels': {}, 'dailyMin': {},
                                   'settings': {'sound': False, 'tts': False, 'vol': 0},
                                   'restTip': {'day': '', 'shown': 0},
                                   'sign': {'tutSeen': True}})) + ')')
    ctx2.add_init_script(seed)
    pg2 = ctx2.new_page()
    pg2.goto(URL)
    pg2.wait_for_timeout(2500)
    sv = pg2.evaluate('() => { const s = localStorage.getItem("kidsgame_sign"); return s ? JSON.parse(s) : null; }')
    pg2.close()
    ctx2.close()
    chk('T2 真实页预置存档 v1.0', bool(sv) and sv.get('v') == '1.0', 'sv=%s' % (str(sv)[:80] if sv else None))

    # T3 教学关 0-19 审计（dch 直读 + 关级构成 + 逐题封闭表）
    errs3 = []
    for f in range(20):
        r = pg.evaluate(GET_LEVEL_JS, f)
        exp_dch = f // 5 + 1
        if not r.get('q') or r.get('dch') != exp_dch:
            errs3.append('flat%d dch=%s 期望%d' % (f, r.get('dch'), exp_dch))
            continue
        errs3 += audit_quiz(r['q'], r['dch'], 'flat%d' % f)
        errs3 += audit_level([{'kind': k, 'flash': fl} for k, fl in zip(r['kinds'], r['flashes'])],
                             r['dch'], f)
    chk('T3 教学关0-19 封闭集+章池+构成', not errs3, errs3[:4])

    # T4 生成关 20-39 审计（dch 钩子直读，b25 坑④）
    errs4 = []
    dch_stat = {}
    for f in range(20, 40):
        r = pg.evaluate(GET_LEVEL_JS, f)
        d = r.get('dch')
        dch_stat[d] = dch_stat.get(d, 0) + 1
        if not r.get('q') or d not in (1, 2, 3, 4):
            errs4.append('flat%d dch=%s' % (f, d))
            continue
        errs4 += audit_quiz(r['q'], r['dch'], 'flat%d' % f)
        errs4 += audit_level([{'kind': k, 'flash': fl} for k, fl in zip(r['kinds'], r['flashes'])],
                             r['dch'], f)
    chk('T4 生成关20-39 dch直读审计+构成', not errs4, 'stat=%s errs=%s' % (dch_stat, errs4[:4]))

    # T5 确定性（同关两次同题同卡序）
    a = pg.evaluate('() => { SG.start(10); const q = SG.quiz; return JSON.stringify({ s: q.sign, k: q.kind, m: q.cards.map(c => c.meaning) }); }')
    a2 = pg.evaluate('() => { SG.start(10); const q = SG.quiz; return JSON.stringify({ s: q.sign, k: q.kind, m: q.cards.map(c => c.meaning) }); }')
    chk('T5 确定性', a == a2, '%s vs %s' % (a, a2))

    # T6 tapCard 返回值族（SPEC §R1；flat7=dch2）
    pg.evaluate('() => SG.start(7)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => SG.quiz')
    cards = q['cards']
    wi = next(i for i, c in enumerate(cards) if c['meaning'] != q['meaning'])
    ri = next(i for i, c in enumerate(cards) if c['meaning'] == q['meaning'])
    m0 = q['miss']
    s0 = q['step']
    r1 = pg.evaluate('(i) => (async()=>{ try { return await SG.tapCard(i) } catch(e){ return "ERR" } })()', wi)
    pg.wait_for_timeout(900)
    qd = pg.evaluate('() => SG.quiz')
    ok6 = r1 == 'wrong' and qd['miss'] == m0 + 1 and qd['step'] == s0
    r3 = pg.evaluate('() => (async()=>{ try { return await SG.tapCard(99) } catch(e){ return "ERR" } })()')
    chk('T6 错=wrong+miss+1+step不变 / 越界=False', ok6 and r3 is False,
        'r1=%s r3=%s miss %s→%s step %s→%s' % (r1, r3, m0, qd['miss'], s0, qd['step']))

    # T7 双错防重入（fire-and-forget 首击，b25 坑①；flat3=dch1）
    pg.evaluate('() => SG.start(3)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => SG.quiz')
    wi = next(i for i, c in enumerate(q['cards']) if c['meaning'] != q['meaning'])
    m0 = q['miss']
    pg.evaluate('(i) => { SG.tapCard(i); return 1; }', wi)   # 不 await
    pg.wait_for_timeout(40)
    pg.evaluate('(i) => { SG.tapCard(i); return 1; }', wi)   # 窗内二击
    pg.wait_for_timeout(1000)
    m1 = pg.evaluate('() => SG.quiz.miss')
    chk('T7 双错防重入 miss只+1', m1 == m0 + 1, 'miss %s→%s' % (m0, m1))

    # T8 星级三档（flat5 ch2；探测关不参与）
    def stars_after(nwrong):
        pg.evaluate('() => SG.start(5)')
        pg.wait_for_timeout(400)
        for _ in range(nwrong):
            q = pg.evaluate('() => SG.quiz')
            wi = next(i for i, c in enumerate(q['cards']) if c['meaning'] != q['meaning'])
            pg.evaluate('(i) => SG.tapCard(i)', wi)
            pg.wait_for_timeout(700)
        pg.evaluate('() => { SG.autoSolve(); return 1; }')
        for _ in range(80):
            pg.wait_for_timeout(300)
            lv = pg.evaluate('() => SG.currentLevel')
            if lv and lv.get('won'):
                return lv.get('stars')
        return None
    st0, st1, st3 = stars_after(0), stars_after(1), stars_after(3)
    chk('T8 星级 0错=3★ 1错=2★ 3错=1★', (st0, st1, st3) == (3, 2, 1), '%s/%s/%s' % (st0, st1, st3))

    # T8b 反馈链键化口径（flat5 错点 → sgn_guide_<fam>；修复基线存量红判据）
    pg.evaluate('() => SG.start(5)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => SG.quiz')
    wi = next(i for i, c in enumerate(q['cards']) if c['meaning'] != q['meaning'])
    pg.evaluate('lastWrongVoice = 0')
    pg.evaluate('(i) => SG.tapCard(i)', wi)
    pg.wait_for_timeout(1300)
    chain = pg.evaluate('window.__lastQueue')
    fam5 = FAM[q['sign']]
    ok8b = (chain and chain[0] == 'sgn_wrong' and chain[1] and
            chain[1]['key'] == 'sgn_guide_' + fam5 and chain[1]['text'] == GUIDE[fam5])
    chk('T8b 错反馈链=sgn_wrong+键化 fam 引导句', ok8b,
        {'key': chain and chain[1] and chain[1]['key'], 'fam': fam5})

    ctx.close()
    b.close()

# ---- 源码级家族断言（Python 读文件）----
src = open(os.path.join(HERE, 'game-main.js'), encoding='utf-8').read()
data = open(os.path.join(HERE, 'game-data.js'), encoding='utf-8').read()
bld = open(os.path.join(HERE, 'build.py'), encoding='utf-8').read()

# T9 家族A：启动 dayEnd nextHint(lim-1) / winFlow nextHint(null)
okA = re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', src) and re.search(r'nextHint\(\s*null\s*\)', src)
chk('T9 家族A nextHint(lim-1)+nextHint(null)', bool(okA))

# T10 C7 结构：hint 数=章数=4；GEN_HINTS 4 键；hint[i] 预告 CHAPTERS[i+1]（共享≥2字）
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

# T11 build.py 静态窗断言在场（estMs 口径 + wrongChainUntil=7000 九字公式）
okB = ('estMs' in bld or 'est_ms' in bld) and '7000' in bld and 'wrongChainUntil' in src
chk('T11 build.py 静态窗断言（estMs+7000 链豁免）', okB)

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails)
    sys.exit(1)
