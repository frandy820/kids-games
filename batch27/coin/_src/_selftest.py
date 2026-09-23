# -*- coding: utf-8 -*-
"""coin _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
（r38 适配版：SPEC-R38-COIN 口径——七题型/开放组合域/找零+最少几枚/近对必在/MUTE 双保险）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭集对账（SPEC-R38 §R1/§R3 文字口径重列，不引用页面 MONEY/ITEMS/COMBOS/函数）：
   40 关全题 答案面额∈封闭7 / combo 多重集∈COIN3 域 2-4 枚降序 / chg 找零独立复算 / min 贪心独立复算 /
   恰 1 卡=答案 / 候选 4 张互异 / 近对必在（sameval→jiao1 / combo→|Δ|≤5 / chg→|Δ|≤2）/
   干扰域（combo ±{1,5,10} / chg ±{1,2,5,10}）/ dch1=coin·rev / dch2=3bill+2chg(book·blocks) /
   dch3=2sameval+3combo(遗留1+深水≥3枚+多重集/和值互异) / dch4=3难(≥1∈chg·min)+2易
3. 键链纯函数直调（r37 M1）：quizPartsOf/confirmPartsOf/guideKeyFor 期望链从 SPEC §R6 推导
   硬编码（Python 侧字符串对账，禁从页面读回拼装）
4. CO 钩子语义 + r30 重入矩阵：CO.start(10) 切关；quiz 契约七字段；错=wrong+miss+1+step 不变；
   窗内二击 false（fire-and-forget 首击）；越界=null
5. 双 viewport(1280x800/800x1180) flat0/5/10/15（七 kind 卡型覆盖）：候选卡 ≥96、题面卡 ≥64、
   overflowX≤0、截图像素非空白
6. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮）→ 真实 pointer
   点卡通关 → celebrate → 写档 stars=3 + coin.tutSeen + v1.0
7. 语音链 spy（r38 段链口径）：wrap play/queue → 对路径 flat0 题0=coin/yuan1 确认段=coi_cf_yuan1（在册）；
   错路径链=[coi_wrong(串), 引导段{key,text}]（flat<3 恒播）——新键未注册期 queue 缺 clip=静默放弃
   不炸（core 语义），仅断言链构造正确（key 序列），不断言出声
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# MUTE 静音双保险（r19 红线）：每 context 挂 init script + 正常模式腿种档 settings 全关
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
Audio.prototype.pause = function(){};"""

# ---------- Python 独立封闭表（SPEC-R38-COIN §R1/§R3 文字逐条转译，禁抄页面 MONEY/ITEMS） ----------
PY_JIAO = {'jiao1': 1, 'jiao5': 5, 'yuan1': 10, 'yuan1p': 10, 'yuan5': 50, 'yuan10': 100, 'yuan20': 200}
PY_TEXT = {'jiao1': '1角', 'jiao5': '5角', 'yuan1': '1元', 'yuan1p': '1元', 'yuan5': '5元',
           'yuan10': '10元', 'yuan20': '20元'}
PY_COIN3 = ['jiao1', 'jiao5', 'yuan1']
PY_BILL4 = ['yuan1p', 'yuan5', 'yuan10', 'yuan20']
PY_R4C = ['jiao1', 'jiao5', 'yuan1', 'yuan1p']
PY_COMBOS = {'c_yj_j': (['yuan1', 'jiao5'], 15), 'c_j5j5': (['jiao5', 'jiao5'], 10), 'c_yy': (['yuan1', 'yuan1'], 20)}
PY_SAMEVAL = {'yuan1': 'yuan1p', 'yuan1p': 'yuan1'}
PY_ITEMS = {'soda': ('汽水', 6, 'yuan1p'), 'candy': ('棒棒糖', 8, 'yuan1p'),
            'sticker': ('贴纸', 9, 'yuan1p'), 'balloon': ('气球', 3, 'yuan1p'),
            'book': ('绘本', 30, 'yuan5'), 'blocks': ('积木', 40, 'yuan5')}
PY_CHG_YUAN = ['book', 'blocks']


def py_sum_text(v):
    y, j = v // 10, v % 10
    return ('%d元%d角' % (y, j)) if y and j else ('%d元' % y if y else '%d角' % j)


def py_jiao_of(t):
    import re
    m = re.match(r'^(\d+)元(\d+)角$|^(\d+)元$|^(\d+)角$', t)
    if not m:
        return 0
    if m.group(1):
        return int(m.group(1)) * 10 + int(m.group(2))
    if m.group(3):
        return int(m.group(3)) * 10
    return int(m.group(4))


def py_greedy(v):
    return v // 10 + (v % 10) // 5 + v % 5


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_INIT)                         # MUTE 双保险之一（r19）
        page = ctx.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):                                   # runVerify 异步（教学链+冒烟），轮询 title
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], "%s/%s" % (out['pass'], out['total']))
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, units_fail)
        check('verify smokes all green', not smokes_fail, smokes_fail)
        check('verify 40 levels all green', not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d' % (len(out['levels']) + len(out['gen'])))
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])

        # ---- 2. Python 独立封闭集对账（40 关全题，r38 七题型口径） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'kind: q.kind, face: q.face, near: q.near, coins: q.coins, item: q.item, '
                                  'target: q.target, opts: q.opts.map(o => ({ id: o.id, text: o.text })), '
                                  'answer: q.answer })) }; })')
        bad = []
        kind_cnt, combo_faces = {}, set()
        for lv in levels_js:
            ks = []
            for k, q in enumerate(lv['quizzes']):
                ks.append(q['kind'])
                kind_cnt[q['kind']] = kind_cnt.get(q['kind'], 0) + 1
                tag = 'flat%d/q%d' % (lv['flat'], k)
                texts = [o['text'] for o in q['opts']]
                ids = [o['id'] for o in q['opts']]
                if len(q['opts']) != 4 or len(set(ids)) != 4:
                    bad.append((tag, 'optsShape', len(q['opts']), len(set(ids))))
                    continue
                if q['answer'] < 0 or q['answer'] > 3:
                    bad.append((tag, 'ansIdx', q['answer']))
                    continue
                ans_text, ans_id = texts[q['answer']], ids[q['answer']]
                if q['kind'] == 'coin':
                    if q['face'] not in PY_COIN3 or ans_text != PY_TEXT[q['face']]:
                        bad.append((tag, 'coinAns', q['face'], ans_text))
                    if not all(PY_TEXT[c] in texts for c in PY_COIN3):
                        bad.append((tag, 'coinSet', texts))
                elif q['kind'] == 'bill':
                    bills = [PY_TEXT[c] for c in PY_BILL4]
                    if q['face'] not in PY_BILL4 or ans_text != PY_TEXT[q['face']]:
                        bad.append((tag, 'billAns', q['face'], ans_text))
                    inb = [t for t in texts if t in bills]
                    near = '1角' if q['face'] == 'yuan1p' else ('5角' if q['face'] == 'yuan5' else None)
                    ok_bill = (len(inb) == 3 and near in texts) if near else (len(inb) == 4)
                    if not ok_bill:
                        bad.append((tag, 'billSet', q['face'], texts))
                elif q['kind'] == 'rev':
                    if sorted(ids) != sorted(PY_R4C) or ans_id != q['face'] or q['face'] not in PY_COIN3:
                        bad.append((tag, 'revSet', ids, q['face']))
                elif q['kind'] == 'sameval':
                    if q['face'] not in PY_SAMEVAL or ans_id != PY_SAMEVAL[q['face']]:
                        bad.append((tag, 'svAns', q['face'], ans_id))
                    if 'jiao1' not in ids or ids[q['answer']] == 'jiao1':
                        bad.append((tag, 'svNear', ids))
                elif q['kind'] == 'combo':
                    cs = q['coins'] or []
                    if len(cs) < 2 or len(cs) > 4 or not all(c in PY_COIN3 for c in cs):
                        bad.append((tag, 'cbCoins', cs))
                        continue
                    vals = [PY_JIAO[c] for c in cs]
                    if vals != sorted(vals, reverse=True):
                        bad.append((tag, 'cbOrder', cs))
                    v = sum(vals)
                    if ans_text != py_sum_text(v):
                        bad.append((tag, 'cbVal', cs, ans_text))
                    sig = '-'.join(str(x) for x in vals)
                    legacy = next((cid for cid, (cc, _) in PY_COMBOS.items()
                                   if '-'.join(str(PY_JIAO[x]) for x in cc) == sig), None)
                    if q['face'] != (legacy or 'k' + sig):
                        bad.append((tag, 'cbFace', q['face'], sig))
                    ds = [t for i, t in enumerate(texts) if i != q['answer']]
                    dvs = [py_jiao_of(t) for t in ds]
                    if any(x <= 0 for x in dvs) or \
                       not all(any(abs(x - v) == d for d in (1, 5, 10)) for x in dvs) or \
                       not any(abs(x - v) <= 5 for x in dvs):
                        bad.append((tag, 'cbNear', ds, v))
                    combo_faces.add(q['face'])
                elif q['kind'] == 'chg':
                    if q['item'] not in PY_ITEMS or q['item'] != q['face']:
                        bad.append((tag, 'itFace', q['item']))
                        continue
                    _, price, pay = PY_ITEMS[q['item']]
                    chg = PY_JIAO[pay] - price
                    if chg <= 0 or ans_text != py_sum_text(chg):
                        bad.append((tag, 'chVal', q['item'], ans_text))
                    ds = [t for i, t in enumerate(texts) if i != q['answer']]
                    dvs = [py_jiao_of(t) for t in ds]
                    if any(x <= 0 for x in dvs) or \
                       not all(any(abs(x - chg) == d for d in (1, 2, 5, 10)) for x in dvs) or \
                       not any(abs(x - chg) <= 2 for x in dvs):
                        bad.append((tag, 'chNear', ds, chg))
                elif q['kind'] == 'min':
                    t = q['target']
                    if not (1 <= t <= 40) or py_greedy(t) > 4 or q['face'] != 'm%d' % t:
                        bad.append((tag, 'minT', t))
                    if sorted(texts) != ['1枚', '2枚', '3枚', '4枚'] or ans_text != '%d枚' % py_greedy(t):
                        bad.append((tag, 'minSet', texts, ans_text))
                else:
                    bad.append((tag, 'kind', q['kind']))
            # 关级章构成律（SPEC-R38 §R1）
            if lv['dch'] == 1 and not all(k in ('coin', 'rev') for k in ks):
                bad.append((lv['flat'], 'dch1kind', ks))
            elif lv['dch'] == 2:
                if ks.count('bill') != 3 or ks.count('chg') != 2:
                    bad.append((lv['flat'], 'dch2mix', ks))
                chg_items = sorted(q['item'] for q in lv['quizzes'] if q['kind'] == 'chg')
                if chg_items != sorted(PY_CHG_YUAN):
                    bad.append((lv['flat'], 'dch2Items', chg_items))
            elif lv['dch'] == 3:
                if ks.count('sameval') != 2 or ks.count('combo') != 3:
                    bad.append((lv['flat'], 'dch3mix', ks))
                cbs = [q for q in lv['quizzes'] if q['kind'] == 'combo']
                sigs = ['-'.join(str(PY_JIAO[c]) for c in q['coins']) for q in cbs]
                sums = [sum(PY_JIAO[c] for c in q['coins']) for q in cbs]
                n_lg = sum(1 for q in cbs if q['face'] in PY_COMBOS)
                if len(set(sigs)) != 3 or len(set(sums)) != 3 or n_lg != 1 or \
                   not any(len(q['coins']) >= 3 for q in cbs):
                    bad.append((lv['flat'], 'dch3combo', sigs, n_lg))
            elif lv['dch'] == 4:
                hard = [k for k in ks if k in ('sameval', 'combo', 'chg', 'min')]
                if len(hard) != 3 or not (ks.count('chg') + ks.count('min') >= 1):
                    bad.append((lv['flat'], 'dch4mix', ks))
        check('python-side closed-set parity (40 levels x 5 quizzes, r38)', not bad, bad[:5])
        a0 = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor {coin,yuan1}',
              a0['kind'] == 'coin' and a0['face'] == 'yuan1', (a0['kind'], a0['face']))
        check('seven kinds all present in 40 levels',
              set(kind_cnt) == {'coin', 'bill', 'rev', 'sameval', 'combo', 'chg', 'min'}, kind_cnt)
        check('combo domain widened (>=10 distinct faces in 40lv)', len(combo_faces) >= 10,
              'faces=%d' % len(combo_faces))

        # ---- 3. 键链纯函数直调（r37 M1：期望链 SPEC §R6 硬编码，Python 侧字符串对账） ----
        kc = page.evaluate('''() => ({
          openQuiz: quizPartsOf({ kind: 'combo', coins: ['yuan1','jiao1','jiao1'] }).map(p => p.key),
          legacyQuiz: quizPartsOf({ kind: 'combo', coins: ['yuan1','jiao5'] }).map(p => p.key),
          legacyCf: confirmPartsOf({ kind: 'combo', coins: ['jiao5','jiao5'] }).map(p => p.key),
          openCf: confirmPartsOf({ kind: 'combo', coins: ['yuan1','jiao5','jiao1'] }).map(p => p.key),
          chgQuiz1: quizPartsOf({ kind: 'chg', item: 'soda' }).map(p => p.key),
          chgQuiz5: quizPartsOf({ kind: 'chg', item: 'blocks' }).map(p => p.key),
          chgCf: confirmPartsOf({ kind: 'chg', item: 'book' }).map(p => p.key),
          minQuiz: quizPartsOf({ kind: 'min', target: 15 }).map(p => p.key),
          minCf4: confirmPartsOf({ kind: 'min', target: 26 }).map(p => p.key),
          minCf1: confirmPartsOf({ kind: 'min', target: 10 }).map(p => p.key),
          gMinHi: guideKeyFor({ kind: 'min', target: 10, opts: [{text:'3枚'},{text:'1枚'}] }, { text: '3枚' }),
          gMinLo: guideKeyFor({ kind: 'min', target: 15, opts: [{text:'1枚'},{text:'2枚'}] }, { text: '1枚' }),
          gRev: guideKeyFor({ kind: 'rev', face: 'yuan1' }, { id: 'yuan1p', text: '1元' }),
          gChgHi: guideKeyFor({ kind: 'chg', item: 'soda', answer: 0, opts: [{text:'4角'},{text:'6角'}] }, { text: '6角' })
        })''')
        exp = {
            'openQuiz': ['coi_n10', 'coi_n1', 'coi_n1', 'coi_q_sum'],
            'legacyQuiz': ['coi_say_c_yj_j'],
            'legacyCf': ['coi_cf_c_c_j5j5'],
            'openCf': ['coi_v_gt', 'coi_v_y1', 'coi_v_j6'],
            'chgQuiz1': ['coi_it_soda', 'coi_q_pay1', 'coi_q_chg'],
            'chgQuiz5': ['coi_it_blocks', 'coi_q_pay5', 'coi_q_chg'],
            'chgCf': ['coi_cf_chg', 'coi_v_y2'],
            'minQuiz': ['coi_q_min0', 'coi_v_y1', 'coi_v_j5', 'coi_q_min1'],
            'minCf4': ['coi_cf_min4'], 'minCf1': ['coi_cf_min1'],
            'gMinHi': 'coi_g_minhi', 'gMinLo': 'coi_g_minlo',
            'gRev': 'coi_g_kind', 'gChgHi': 'coi_g_combohi',
        }
        mism = {k: (kc.get(k), v) for k, v in exp.items() if kc.get(k) != v}
        check('keychains direct-call (SPEC-derived, r37 M1)', not mism, mism)

        # ---- 4. CO 钩子语义 + r30 重入矩阵 ----
        lv = page.evaluate('CO.start(10), CO.currentLevel')
        check('CO.start(10) takes effect (ch3)', lv['flat'] == 10 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        qz = page.evaluate('() => CO.quiz')
        qcontract = set(qz.keys()) == {'kind', 'face', 'coins', 'item', 'target', 'opts', 'answer', 'step', 'miss'} \
            and qz['kind'] in ('sameval', 'combo') and len(qz['opts']) == 4 \
            and all(set(o.keys()) == {'id', 'text'} for o in qz['opts']) \
            and qz['step'] == 0 and qz['miss'] == 0
        check('CO.quiz contract (7-kind fields, copy not live)', qcontract, qz)
        wi = next(i for i, o in enumerate(qz['opts']) if i != qz['answer'])
        m0 = qz['miss']
        r1 = page.evaluate('(i) => (async()=>{ try { return await CO.tapOpt(i) } catch(e){ return "ERR" } })()', wi)
        page.wait_for_timeout(1300)
        qd = page.evaluate('() => CO.quiz')
        ok_wrong = r1 == 'wrong' and qd['miss'] == m0 + 1 and qd['step'] == 0
        r_null = page.evaluate('() => (async()=>{ try { return await CO.tapOpt(99) } catch(e){ return "ERR" } })()')
        check('wrong=miss+1+step hold / out-of-bounds=null', ok_wrong and r_null is None,
              (r1, qd['miss'], r_null))
        # r30 重入矩阵：窗内二击 false（fire-and-forget 首击）→ 窗后可重选
        page.evaluate('CO.start(3)')
        page.wait_for_timeout(300)
        q3 = page.evaluate('() => CO.quiz')
        w3 = next(i for i, o in enumerate(q3['opts']) if i != q3['answer'])
        page.evaluate('(i) => { CO.tapOpt(i); return 1; }', w3)      # fire-and-forget 首击
        rej = page.evaluate('(i) => CO.tapOpt(i)', w3)               # 窗内紧邻二击
        page.wait_for_timeout(1200)                                   # 1000ms 防重入窗过
        rr = page.evaluate('(i) => (async()=>{ try { return await CO.tapOpt(i) } catch(e){ return "ERR" } })()',
                           page.evaluate('() => CO.quiz.answer'))
        check('r30 re-entry matrix (in-window 2nd=false, post-window right=right)', rej is False and rr == 'right',
              (rej, rr))

        # ---- 5. 双 viewport 布局 + 截图非空白（flat0=coin·rev / 5=bill·chg / 10=sameval·combo / 15=ch4 混合） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 5), (800, 1180, 5),
                           (1280, 800, 10), (800, 1180, 10), (1280, 800, 15), (800, 1180, 15)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            for _ in range(120):
                if page.title().startswith('VERIFY'):
                    break
                page.wait_for_timeout(500)
            page.evaluate('CO.start(%d)' % flat)
            page.evaluate('document.getElementById("verify-result").style.display="none"')
            page.wait_for_timeout(800)            # 卡 pop 入场动画播完再截，防中途帧方差低
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       scene: [sc.offsetWidth, sc.offsetHeight],
                       ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            shot = HERE / '_shots' / ('vp%d_%d_f%d.png' % (w, h, flat))
            shot.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(shot))
            try:
                from PIL import Image
                import statistics
                im = Image.open(str(shot)).convert('L').resize((160, 100))
                sd = statistics.pstdev(list(im.getdata()))
                nonblank = sd > 10
            except ImportError:
                nonblank, sd = shot.stat().st_size > 30000, -1
            check('layout %dx%d flat%d' % (w, h, flat),
                  m['minWH'] >= 96 and m['scene'][0] >= 64 and m['scene'][1] >= 64 and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'scene': m['scene'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 6+7. 正常模式真实主流程 + 语音链 spy（MUTE 双保险之二：种档 settings 全关） ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_INIT)
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        seeded = json.dumps({'v': '1.0', 'game': 'coin', 'firstDay': '2026-09-21', 'lastDay': '2026-09-21',
                             'levels': {}, 'dailyMin': {},
                             'settings': {'sound': False, 'tts': False, 'vol': 0},
                             'restTip': {'day': '', 'shown': 0}})
        pg2.add_init_script('localStorage.setItem("kidsgame_coin", %s);' % json.dumps(seeded))
        pg2.goto(URL)
        pg2.evaluate('''() => {
          KIDS.voice._log = [];
          const _p = KIDS.voice.play.bind(KIDS.voice);
          KIDS.voice.play = (k, t) => { KIDS.voice._log.push(['play', k]); return _p(k, t); };
          const _q = KIDS.voice.queue.bind(KIDS.voice);
          KIDS.voice.queue = (parts) => { KIDS.voice._log.push(['queue', parts.map(p => typeof p === 'string' ? p : {key: p.key, text: p.text})]); return _q(parts); };
        }''')
        tut = ''
        for _ in range(50):                       # watch≈3.9s（真实 SPEED=1）+ 演示链
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('CO.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__coDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__coDemoR': demo_r})
        log0 = pg2.evaluate('KIDS.voice._log')
        base_len = len(log0)
        # 错路径链：flat0 题0=coin/yuan1，点近对'1角' → [coi_wrong(串), {key:coi_g_silver,...}]
        qz2 = pg2.evaluate('() => CO.quiz')
        wnear = next(i for i, o in enumerate(qz2['opts']) if o['text'] == '1角')
        pg2.click('.card[data-i="%d"]' % wnear, timeout=3000)
        pg2.wait_for_timeout(1500)
        log1 = pg2.evaluate('KIDS.voice._log')
        wrong_seg = [e for e in log1[base_len:] if e[0] == 'queue' and e[1] and e[1][0] == 'coi_wrong']
        wrong_ok = wrong_seg and isinstance(wrong_seg[-1][1][1], dict) and \
            wrong_seg[-1][1][1].get('key') == 'coi_g_silver'
        check('wrong-path chain [coi_wrong, coi_g_silver guide]', bool(wrong_ok),
              wrong_seg[-1][1] if wrong_seg else None)

        # 真实 pointer 逐题点应选卡通关 flat0（DOM 同步轮询——右行链窗 5400 内 DOM 刷新后点）
        def dom_in_sync():
            return pg2.evaluate('''() => {
              const q = CO.quiz, cards = [...document.querySelectorAll('.card')];
              if (!q) return CO.currentLevel && CO.currentLevel.done;
              if (cards.length !== q.opts.length) return false;
              return cards.every((c, i) => c.dataset.i == i && c.dataset.oid === q.opts[i].id);
            }''')

        def wait_true(fn, timeout_ms=15000, step_ms=250):
            for _ in range(int(timeout_ms / step_ms)):
                if fn():
                    return True
                pg2.wait_for_timeout(step_ms)
            return fn()

        base_len = len(pg2.evaluate('KIDS.voice._log'))
        confirm_hits, dom_ok_all, guard = [], True, 0
        while guard < 40:
            guard += 1
            if not wait_true(dom_in_sync):
                dom_ok_all = False
                break
            st = pg2.evaluate('() => ({ done: CO.currentLevel.done, quiz: CO.quiz })')
            if st['done'] or not st['quiz']:
                break
            kind_now = st['quiz']['kind']
            prev_step = st['quiz']['step']
            pg2.click('.card[data-i="%d"]' % st['quiz']['answer'], timeout=3000)
            advanced = wait_true(lambda: pg2.evaluate(
                '() => CO.currentLevel.done || CO.quiz && CO.quiz.step > %d' % prev_step))
            confirm_hits.append(kind_now)
            if not advanced:
                break
        cel = False
        for _ in range(12):
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('CO.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        log2 = pg2.evaluate('KIDS.voice._log')[base_len:]
        # 对路径确认段：coin 题 → play coi_cf_yuan1（在册 clip，flat0 题0）
        confirm_ok = any(e[0] == 'play' and e[1] == 'coi_cf_yuan1' for e in log2) and \
            confirm_hits[0] == 'coin'
        check('right-path confirm segment coi_cf_yuan1 (flat0 q0)', confirm_ok and dom_ok_all,
              {'hits': confirm_hits, 'plays': [e for e in log2 if e[0] == 'play'][:5]})
        sv = None
        for _ in range(60):                       # 写档在右行链窗+celebrate 后——轮询至 30s
            sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_coin")||"null")')
            if sv and sv.get('levels', {}).get('1-0', {}).get('stars') is not None:
                break
            pg2.wait_for_timeout(500)
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        # 期望 2★：本腿在 q0 故意点了 1 次近对错卡（错路径链断言）→ miss=1 → 星级 0=3★/1-2=2★
        check('normal-mode solve & celebrate & save (polled, 1 wrong -> 2 stars)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('coin', {}).get('tutSeen')
              and st1.get('stars') == 2,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('coin'), 'stars10': st1.get('stars')})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        ctx.close()
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
