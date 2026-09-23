# -*- coding: utf-8 -*-
"""coin 独立复验（r38 适配版，归档 _src/；主线收编时按 verify_batch27.py coin 单元对齐）
断言全部从 SPEC-R38-COIN §R1/§R3 推导（Python 侧独立角值表+物品价表+贪心+和值文字复算）。
适配面（相对主线版）：T3 章型腿 ch1=coin/rev 交替 / ch2=3bill+2chg(book·blocks) / ch3 新谱
（2sameval+3combo 遗留1+深水≥3枚+互异）/ ch4=3难(≥1∈chg·min)+2易；audit_quiz 七 kind
答案独立复算+近对必在+干扰域；T9 家族 A/F/I/J；T10 C7 新章名预告计分。"""
import os, sys, json, re
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, '..', 'index.html').replace(chr(92), '/')

# ---- Python 独立真值（SPEC-R38 §R1/§R3）----
JIAO = {'jiao1': 1, 'jiao5': 5, 'yuan1': 10, 'yuan1p': 10, 'yuan5': 50, 'yuan10': 100, 'yuan20': 200}
TEXT = {'jiao1': '1角', 'jiao5': '5角', 'yuan1': '1元', 'yuan1p': '1元', 'yuan5': '5元',
        'yuan10': '10元', 'yuan20': '20元'}
COIN3, BILL4 = ['jiao1', 'jiao5', 'yuan1'], ['yuan1p', 'yuan5', 'yuan10', 'yuan20']
R4C = ['jiao1', 'jiao5', 'yuan1', 'yuan1p']
COMBOS = {'c_yj_j': (['yuan1', 'jiao5'], 15), 'c_j5j5': (['jiao5', 'jiao5'], 10), 'c_yy': (['yuan1', 'yuan1'], 20)}
SAMEVAL = {'yuan1': 'yuan1p', 'yuan1p': 'yuan1'}
ITEMS = {'soda': 6, 'candy': 8, 'sticker': 9, 'balloon': 3, 'book': 30, 'blocks': 40}
PAY = {'soda': 'yuan1p', 'candy': 'yuan1p', 'sticker': 'yuan1p', 'balloon': 'yuan1p',
       'book': 'yuan5', 'blocks': 'yuan5'}

def sum_text(v):
    y, j = v // 10, v % 10
    return ('%d元%d角' % (y, j)) if y and j else ('%d元' % y if y else '%d角' % j)

def jiao_of(t):
    m = re.match(r'^(\d+)元(\d+)角$|^(\d+)元$|^(\d+)角$', t)
    if not m:
        return 0
    if m.group(1):
        return int(m.group(1)) * 10 + int(m.group(2))
    if m.group(3):
        return int(m.group(3)) * 10
    return int(m.group(4))

def greedy(v):
    return v // 10 + (v % 10) // 5 + v % 5

RES = []
def chk(name, ok, info=''):
    RES.append((name, ok))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(info) if info else ''))

def audit_quiz(q, tag):
    errs = []
    texts = [o['text'] for o in q['opts']]
    ids = [o['id'] for o in q['opts']]
    if len(q['opts']) != 4 or len(set(ids)) != 4:
        return ['%s opts 形 %s/%s' % (tag, len(q['opts']), len(set(ids)))]
    if not (0 <= q['answer'] <= 3):
        return ['%s ansIdx %s' % (tag, q['answer'])]
    a_t, a_id = texts[q['answer']], ids[q['answer']]
    k = q['kind']
    if k == 'coin':
        if q['face'] not in COIN3 or a_t != TEXT[q['face']]:
            errs.append('%s coinAns %s/%s' % (tag, q['face'], a_t))
        if not all(TEXT[c] in texts for c in COIN3):
            errs.append('%s coinSet %s' % (tag, texts))
    elif k == 'bill':
        bills = [TEXT[c] for c in BILL4]
        inb = [t for t in texts if t in bills]
        near = '1角' if q['face'] == 'yuan1p' else ('5角' if q['face'] == 'yuan5' else None)
        if q['face'] not in BILL4 or a_t != TEXT[q['face']]:
            errs.append('%s billAns %s/%s' % (tag, q['face'], a_t))
        elif not ((len(inb) == 3 and near in texts) if near else len(inb) == 4):
            errs.append('%s billSet %s %s' % (tag, q['face'], texts))
    elif k == 'rev':
        if sorted(ids) != sorted(R4C) or a_id != q['face'] or q['face'] not in COIN3:
            errs.append('%s revSet %s' % (tag, ids))
    elif k == 'sameval':
        if q['face'] not in SAMEVAL or a_id != SAMEVAL[q['face']]:
            errs.append('%s svAns %s/%s' % (tag, q['face'], a_id))
        if 'jiao1' not in ids or ids[q['answer']] == 'jiao1':
            errs.append('%s svNear %s' % (tag, ids))
    elif k == 'combo':
        cs = q['coins'] or []
        if len(cs) < 2 or len(cs) > 4 or not all(c in COIN3 for c in cs):
            return ['%s cbCoins %s' % (tag, cs)]
        vals = [JIAO[c] for c in cs]
        if vals != sorted(vals, reverse=True):
            errs.append('%s cbOrder %s' % (tag, cs))
        v = sum(vals)
        sig = '-'.join(str(x) for x in vals)
        lg = next((c for c, (cc, _) in COMBOS.items()
                   if '-'.join(str(JIAO[x]) for x in cc) == sig), None)
        if a_t != sum_text(v):
            errs.append('%s cbVal %s/%s' % (tag, cs, a_t))
        if q['face'] != (lg or 'k' + sig):
            errs.append('%s cbFace %s' % (tag, q['face']))
        dvs = [jiao_of(t) for i, t in enumerate(texts) if i != q['answer']]
        if any(x <= 0 for x in dvs) or \
           not all(any(abs(x - v) == d for d in (1, 5, 10)) for x in dvs) or \
           not any(abs(x - v) <= 5 for x in dvs):
            errs.append('%s cbNear %s v=%s' % (tag, texts, v))
    elif k == 'chg':
        if q['item'] not in ITEMS or q['item'] != q['face']:
            return ['%s itFace %s' % (tag, q['item'])]
        chg = JIAO[PAY[q['item']]] - ITEMS[q['item']]
        if chg <= 0 or a_t != sum_text(chg):
            errs.append('%s chVal %s/%s' % (tag, q['item'], a_t))
        dvs = [jiao_of(t) for i, t in enumerate(texts) if i != q['answer']]
        if any(x <= 0 for x in dvs) or \
           not all(any(abs(x - chg) == d for d in (1, 2, 5, 10)) for x in dvs) or \
           not any(abs(x - chg) <= 2 for x in dvs):
            errs.append('%s chNear %s chg=%s' % (tag, texts, chg))
    elif k == 'min':
        t = q['target']
        if not (1 <= t <= 40) or greedy(t) > 4 or q['face'] != 'm%d' % t:
            errs.append('%s minT %s' % (tag, t))
        if sorted(texts) != ['1枚', '2枚', '3枚', '4枚'] or a_t != '%d枚' % greedy(t):
            errs.append('%s minSet %s' % (tag, texts))
    else:
        errs.append('%s kind %s' % (tag, k))
    return errs

MUTE = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
Audio.prototype.pause = function(){};"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script(MUTE)                       # r19 测试静音
    pg = ctx.new_page()
    pg.goto(URL + '?verify=1')
    t = ''
    for _ in range(120):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('T1 verify 复跑', 'VERIFY PASS' in t, t)

    ctx2 = b.new_context(viewport={'width': 1280, 'height': 800})
    ctx2.add_init_script(MUTE)
    pg2 = ctx2.new_page()
    pg2.goto(URL)
    pg2.wait_for_timeout(3000)
    sv = pg2.evaluate('() => { const s = localStorage.getItem("kidsgame_coin"); return s ? JSON.parse(s) : null; }')
    pg2.close(); ctx2.close()
    chk('T2 真实页预置存档 v1.0', bool(sv) and sv.get('v') == '1.0', 'sv=%s' % (str(sv)[:80] if sv else None))

    # T3 静态 20 关全量审计（章型谱：0-4 dch1 coin/rev / 5-9 dch2 bill+chg / 10-14 dch3 sv+combo / 15-19 dch4）
    errs3 = []
    all_levels = pg.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                             'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                             'kind: q.kind, face: q.face, coins: q.coins, item: q.item, target: q.target, '
                             'opts: q.opts.map(o => ({ id: o.id, text: o.text })), answer: q.answer })) }; })')
    for lv in all_levels[:20]:
        ks = [q['kind'] for q in lv['quizzes']]
        if lv['dch'] != lv['flat'] // 5 + 1:
            errs3.append('flat%d dch=%s' % (lv['flat'], lv['dch']))
        if lv['flat'] < 5 and not all(k in ('coin', 'rev') for k in ks):
            errs3.append('flat%d ch1 谱外 %s' % (lv['flat'], ks))
        if 5 <= lv['flat'] < 10:
            if ks.count('bill') != 3 or ks.count('chg') != 2:
                errs3.append('flat%d ch2 混比 %s' % (lv['flat'], ks))
            if sorted(q['item'] for q in lv['quizzes'] if q['kind'] == 'chg') != ['blocks', 'book']:
                errs3.append('flat%d ch2 物品 %s' % (lv['flat'], [q['item'] for q in lv['quizzes'] if q['kind'] == 'chg']))
        if 10 <= lv['flat'] < 15:
            if ks.count('sameval') != 2 or ks.count('combo') != 3:
                errs3.append('flat%d ch3 混比 %s' % (lv['flat'], ks))
            cbs = [q for q in lv['quizzes'] if q['kind'] == 'combo']
            sigs = ['-'.join(str(JIAO[c]) for c in q['coins']) for q in cbs]
            sums = [sum(JIAO[c] for c in q['coins']) for q in cbs]
            nlg = sum(1 for q in cbs if q['face'] in COMBOS)
            if len(set(sigs)) != 3 or len(set(sums)) != 3 or nlg != 1 or not any(len(q['coins']) >= 3 for q in cbs):
                errs3.append('flat%d ch3 组合律 %s lg=%d' % (lv['flat'], sigs, nlg))
        if lv['flat'] >= 15:
            hard = [k for k in ks if k in ('sameval', 'combo', 'chg', 'min')]
            if len(hard) != 3 or ks.count('chg') + ks.count('min') < 1:
                errs3.append('flat%d ch4 混比 %s' % (lv['flat'], ks))
        for k, q in enumerate(lv['quizzes']):
            errs3 += audit_quiz(q, 'flat%d/q%d' % (lv['flat'], k))
    chk('T3 静态20关 章型+七kind全量独立对账', not errs3, errs3[:5])

    # T4 生成关 20-39（dch 直读全 1-4 + 全量审计 + 新题型在场）
    errs4 = []; dch_stat = {}; kind_all = {}
    for lv in all_levels[20:]:
        d = lv['dch']; dch_stat[d] = dch_stat.get(d, 0) + 1
        if d not in (1, 2, 3, 4):
            errs4.append('flat%d dch=%s' % (lv['flat'], d)); continue
        for k, q in enumerate(lv['quizzes']):
            kind_all[q['kind']] = kind_all.get(q['kind'], 0) + 1
            errs4 += audit_quiz(q, 'flat%d/q%d' % (lv['flat'], k))
    new_in_gen = sum(kind_all.get(k, 0) for k in ('rev', 'chg', 'min'))
    if set(kind_all) != {'coin', 'bill', 'rev', 'sameval', 'combo', 'chg', 'min'} or new_in_gen < 3:
        errs4.append('生成关七 kind 不全 %s new=%d' % (kind_all, new_in_gen))
    chk('T4 生成关20-39 dch直读+七kind+新题型在场', not errs4 and len(dch_stat) == 4,
        'stat=%s kinds=%s' % (dch_stat, kind_all))

    a = pg.evaluate('() => { CO.start(10); const q = CO.quiz; return JSON.stringify({ k: q.kind, f: q.face, o: q.opts.map(x => x.text) }); }')
    a2 = pg.evaluate('() => { CO.start(10); const q = CO.quiz; return JSON.stringify({ k: q.kind, f: q.face, o: q.opts.map(x => x.text) }); }')
    chk('T5 确定性', a == a2, '%s vs %s' % (a, a2))

    pg.evaluate('() => CO.start(7)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => CO.quiz')
    wi = next(i for i, o in enumerate(q['opts']) if i != q['answer'])
    m0 = q['miss']; s0 = q['step']
    r1 = pg.evaluate('(i) => (async()=>{ try { return await CO.tapOpt(i) } catch(e){ return "ERR" } })()', wi)
    pg.wait_for_timeout(1300)
    qd = pg.evaluate('() => CO.quiz')
    ok6 = r1 == 'wrong' and qd['miss'] == m0 + 1 and qd['step'] == s0
    r3 = pg.evaluate('() => (async()=>{ try { return await CO.tapOpt(99) } catch(e){ return "ERR" } })()')
    chk('T6 错=wrong+miss+1+step不变 / 越界=null', ok6 and r3 is None, 'r1=%s r3=%s miss %s→%s' % (r1, r3, m0, qd['miss']))

    pg.evaluate('() => CO.start(3)')
    pg.wait_for_timeout(400)
    q = pg.evaluate('() => CO.quiz')
    wi = next(i for i, o in enumerate(q['opts']) if i != q['answer'])
    m0 = q['miss']
    pg.evaluate('(i) => { CO.tapOpt(i); return 1; }', wi)
    pg.wait_for_timeout(40)
    pg.evaluate('(i) => { CO.tapOpt(i); return 1; }', wi)
    pg.wait_for_timeout(1200)
    m1 = pg.evaluate('() => CO.quiz.miss')
    chk('T7 双错防重入 miss只+1', m1 == m0 + 1, 'miss %s→%s' % (m0, m1))

    def stars_after(nwrong):
        pg.evaluate('() => CO.start(5)')
        pg.wait_for_timeout(400)
        for _ in range(nwrong):
            q = pg.evaluate('() => CO.quiz')
            wi = next(i for i, o in enumerate(q['opts']) if i != q['answer'])
            pg.evaluate('(i) => CO.tapOpt(i)', wi)
            pg.wait_for_timeout(1200)              # 1000ms 防重入窗过再点下一错
        pg.evaluate('() => { CO.autoSolve(); return 1; }')
        for _ in range(80):
            pg.wait_for_timeout(300)
            lv = pg.evaluate('() => CO.currentLevel')
            if lv and lv.get('won'):
                return lv.get('stars')
        return None
    st0, st1, st3 = stars_after(0), stars_after(1), stars_after(3)
    chk('T8 星级 0错=3★ 1错=2★ 3错=1★', (st0, st1, st3) == (3, 2, 1), '%s/%s/%s' % (st0, st1, st3))

    pg.close(); ctx.close(); b.close()

src = open(os.path.join(BASE, 'game-main.js'), encoding='utf-8').read()
data = open(os.path.join(BASE, 'game-data.js'), encoding='utf-8').read()
bld = open(os.path.join(BASE, 'build.py'), encoding='utf-8').read()

okA = re.search(r'nextHint\(\s*lim\s*-\s*1\s*\)', src) and re.search(r'nextHint\(\s*null\s*\)', src)
chk('T9 家族A nextHint(lim-1)+nextHint(null)', bool(okA))

hints = re.findall(r"hint:\s*'([^']+)'", data)
titles = re.findall(r"name:\s*'([^']+)'", data)
gk = re.search(r'GEN_HINTS\s*=\s*[\[(](.*?)[\])]', data, re.S)
ghints = re.findall(r"'([^']+)'", gk.group(1)) if gk else []
def sh(a_, b_):
    return len(set(a_) & set(b_))
sem = (len(hints) == 4 and len(titles) == 4 and len(ghints) == 4
       and all(sh(hints[i], titles[i + 1]) > sh(hints[i], titles[i]) for i in range(3))
       and all(sh(ghints[k], titles[k]) >= 1 for k in range(4)))
chk('T10 C7 hint4章/GEN4/预告下一章(计分)', sem, 'hints=%s titles=%s g=%s' % (hints, titles, ghints))

okI = 'wrongChainUntil = Date.now() + 9200' in src and 'if (Date.now() < wrongChainUntil) return;' in src
okJ = 'now - lastWrongVoice > 10000' in src
okWin = 'est_ms' in bld and 'estMs' in open(os.path.join(BASE, 'game-verify.js'), encoding='utf-8').read()
okF = 'GEN_HINTS[genLevel(f + 1).dch - 1]' in src
chk('T11 家族F/I/J+窗断言（estMs 双侧）', okI and okJ and okWin and okF,
    (okF, okI, okJ, okWin))

fails = [n for n, ok in RES if not ok]
print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
if fails:
    print('FAILED:', fails); sys.exit(1)
