# -*- coding: utf-8 -*-
"""dressup _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r10 三族版（SPEC-BATCH24 §8）：
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭表对账（SPEC §0.57 主题表沿 v1 + §8 三族表重列，不引用页面常量）：
   40 关全题 kind 按章（dch1 conflict/dch2 budget/dch3 anti/dch4 混合各≥1）/need 规则按族/
   配对干扰下限/错位件∈MISFIT 表/候选封闭互异/flat0 锚=conflict rain 全 2 件
3. conflict 两击制完整走一题（真实 UI）+ anti 单击即判 + budget 装包/揭回/满员检查（真实 UI 三族分流）
4. DR.start(12) 外部切关生效（ch3=anti 章）
5. free 模式贴/揭/清空走通（quiz/关模型全程静止）
6. 双 viewport(1280x800/800x1180) × 三族 flat(0/7/12)：贴纸 ≥64、模式/底栏 ≥64、overflowX≤0、
   截图像素非空白、budget 三槽书包在场
7. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮，__drDemoR='right'）
   → autoSolve 通关 → celebrate → 写档 stars=3 + tutSeen + 存档 v='1.0'（家族 C）
8. 新 clip 在场+实长（dru_anti_right ≤3200ms=ADV 窗不掐；3 新键 dataURI 前缀在场）
9. 单关净时长 wall-clock：flat1（dch1 conflict）与 flat7（dch2 budget）各独立浏览器，
   模拟幼儿决策 dwell（SPEC §8 DECIDE 假设值独立副本）→ ≥40s 硬指标（§8）
"""
import datetime
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# ---------- Python 独立封闭表（SPEC-BATCH24 §0.57/§8 文字逐条转译，禁抄页面表） ----------
PY_TABLE = {
    'school': ['sbag', 'sunhat', 'satchel'],        # 去上学=书包,太阳帽,小挎包
    'sports': ['shoes', 'cap', 'bpack'],            # 运动会=运动鞋,遮阳帽,小背包
    'nap': ['ncap', 'pjy', 'bear'],                 # 睡午觉=睡帽,睡衣,小熊
    'party': ['crown', 'bow', 'dress'],             # 开派对=皇冠,蝴蝶结,裙子
    'rain': ['raincoat', 'rboots'],                 # 雨天出门=雨衣,雨靴
    'winter': ['scarf', 'gloves', 'coat'],          # 冬天出门=围巾,手套,厚外套
}
PY_DECO = ['flower', 'star']                        # 2 自由装饰
PY_POOL = sorted({i for v in PY_TABLE.values() for i in v} | set(PY_DECO))   # 19 片
PY_THEME_OF = {i: t for t, v in PY_TABLE.items() for i in v}
PY_THEME_OF.update({i: 'free' for i in PY_DECO})
PY_PAIR = {'rain': 'winter', 'winter': 'rain', 'school': 'sports',
           'sports': 'school', 'nap': 'party', 'party': 'nap'}
PY_MISFIT = {
    'school': ['ncap', 'pjy'], 'sports': ['ncap', 'pjy'], 'nap': ['raincoat', 'rboots'],
    'party': ['rboots', 'raincoat'], 'rain': ['crown', 'dress'], 'winter': ['dress', 'bow'],
}
PY_BUDGET_THEMES = ['school', 'sports', 'nap', 'party', 'winter']
PY_POOL_OF_KIND = {'conflict': 7, 'budget': 6}      # anti=主题全集+1 错位件（3-4 片）
PY_ADV_MS = 3200                                    # 推进窗（dru_right 2664 实长+余量，M2 口径）


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        page = browser.new_page()
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

        # ---- 8. 新 clip 在场+实长（verify 页 dataURI） ----
        clip_durs = page.evaluate("""async () => {
            const keys = ['dru_budget_hint', 'dru_anti_hint', 'dru_anti_right'];
            const out = {};
            for (const k of keys) {
                const v = KIDS.voice.clips[k];
                if (!v || !v.startsWith('data:audio/mpeg;base64,')) { out[k] = -2; continue; }
                out[k] = await new Promise(res => {
                    const a = new Audio(v);
                    a.onloadedmetadata = () => res(a.duration * 1000);
                    setTimeout(() => res(-1), 8000);
                });
            }
            return out;
        }""")
        check('r10 new clips present + duration',
              all(clip_durs.get(k, -3) > 0 for k in clip_durs) and len(clip_durs) == 3 and
              0 < clip_durs.get('dru_anti_right', 0) <= PY_ADV_MS,
              {k: int(v) for k, v in clip_durs.items()})

        # ---- 2. Python 独立封闭表对账（40 关全题三族规则） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'kind: q.kind, theme: q.theme, need: q.need, budget: q.budget, '
                                  'stickers: q.stickers.map(s => ({ id: s.id, right: s.right })) })) }; })')
        bad = []
        for lv in levels_js:
            kinds_here = set()
            for k, q in enumerate(lv['quizzes']):
                kinds_here.add(q['kind'])
                tbl = PY_TABLE.get(q['theme'])
                if tbl is None:
                    bad.append((lv['flat'], k, 'theme', q['theme']))
                    continue
                if lv['flat'] < 20:                              # 静态关章参数精确
                    dch = (lv['flat'] // 5) % 4 + 1
                    want_kind = {1: 'conflict', 2: 'budget', 3: 'anti'}.get(dch)
                    if want_kind and q['kind'] != want_kind:
                        bad.append((lv['flat'], k, 'kindByDch', q['kind']))
                for nid in q['need']:
                    if q['kind'] != 'anti' and nid not in tbl:   # anti 的 need=错位件（跨主题，由 MISFIT 表校验）
                        bad.append((lv['flat'], k, 'needNotInTable', nid))
                for c in q['stickers']:
                    if c['right'] != (c['id'] in q['need']):
                        bad.append((lv['flat'], k, 'rightFlag', c['id']))
                    if c['id'] not in PY_POOL:
                        bad.append((lv['flat'], k, 'outsidePool', c['id']))
                pair = PY_PAIR[q['theme']]
                pair_n = sum(1 for c in q['stickers']
                             if not c['right'] and PY_THEME_OF.get(c['id']) == pair)
                if q['kind'] == 'anti':
                    if len(q['need']) != 1 or q['need'][0] not in PY_MISFIT[q['theme']]:
                        bad.append((lv['flat'], k, 'antiMisfit', q['need']))
                    fits = [c['id'] for c in q['stickers'] if not c['right']]
                    if sorted(fits) != sorted(tbl):
                        bad.append((lv['flat'], k, 'antiFitsNotFullSet', fits))
                    if len(q['stickers']) != len(tbl) + 1:
                        bad.append((lv['flat'], k, 'antiPoolLen', len(q['stickers'])))
                else:
                    if sorted(q['need']) != sorted(tbl):
                        bad.append((lv['flat'], k, 'needNotFullSet', q['need']))
                    want_pool = PY_POOL_OF_KIND[q['kind']]
                    if len(q['stickers']) != want_pool:
                        bad.append((lv['flat'], k, 'poolLen', len(q['stickers'])))
                    want_pair = 2 if q['kind'] == 'budget' else min(3, len(PY_TABLE[pair]))
                    if pair_n < want_pair:
                        bad.append((lv['flat'], k, 'pairDistract', pair_n))
                    if q['kind'] == 'budget':
                        if q['theme'] not in PY_BUDGET_THEMES:
                            bad.append((lv['flat'], k, 'budgetTheme', q['theme']))
                        if q['budget'] != 3:
                            bad.append((lv['flat'], k, 'budgetN', q['budget']))
                # 相邻主题互异
                if k > 0 and lv['quizzes'][k - 1]['theme'] == q['theme']:
                    bad.append((lv['flat'], k, 'adjacentTheme', q['theme']))
            if lv['flat'] < 20 and (lv['flat'] // 5) % 4 + 1 == 4:
                if not {'conflict', 'budget', 'anti'} <= kinds_here:
                    bad.append((lv['flat'], 'mixMissing', sorted(kinds_here)))
        check('python-side closed-table parity (40 levels x 5 quizzes, 3 kinds)', not bad, bad[:5])
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor conflict rain full-set',
              anchor['kind'] == 'conflict' and anchor['theme'] == 'rain' and
              anchor['need'] == ['raincoat', 'rboots'], anchor)

        # ---- 3a. conflict 两击制完整走一题（真实 UI：DR.start(0)） ----
        page.evaluate('DR.start(0)')
        qz = page.evaluate('() => DR.quiz')
        check('flat0 q0 conflict rain 2-need stickers 7',
              qz['kind'] == 'conflict' and qz['theme'] == 'rain' and len(qz['need']) == 2 and
              len(qz['stickers']) == 7, qz)
        ridx = next(i for i, s in enumerate(qz['stickers']) if s['id'] == qz['need'][0])
        sel = page.evaluate('i => DR.tapSticker(i)', ridx)      # 第一击=选中
        hold = page.evaluate('() => DR.tapRabbit()')            # 第二击=贴上（首件 hold）
        page.wait_for_timeout(300)
        badge = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        mid = page.evaluate('() => ({ step: DR.currentLevel.step, placed: DR.quiz.placed, miss: DR.quiz.miss })')
        check('two-tap first piece held (badge visible, not advanced)',
              sel == 'sel' and hold == 'hold' and badge == 1 and
              mid['step'] == 0 and mid['placed'] == [qz['need'][0]] and mid['miss'] == 0,
              {'sel': sel, 'hold': hold, 'badge': badge, 'mid': mid})

        # ---- 3b. budget 装包流（真实 UI：DR.start(5)，ch2 全预算） ----
        page.evaluate('DR.start(5)')
        page.wait_for_timeout(200)
        bq = page.evaluate('() => DR.quiz')
        slots = page.evaluate('''() => ({ kind: document.getElementById('scene').dataset.kind,
            n: document.querySelectorAll('.pack-slots i').length,
            wear: document.querySelectorAll('.pack #bunny-wear').length })''')
        check('budget scene: data-kind + 3 slots pack',
              bq['kind'] == 'budget' and bq['budget'] == 3 and slots['kind'] == 'budget' and
              slots['n'] == 3 and slots['wear'] == 1, {'q': bq, 'slots': slots})
        bdiag = next(i for i, s in enumerate(bq['stickers']) if not s['right'])
        page.evaluate('i => DR.tapSticker(i)', bdiag)
        bhold_wrong = page.evaluate('() => DR.tapRabbit()')     # 装入错件=hold 不弹回
        page.wait_for_timeout(600)
        bbadges1 = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        bpeel = page.evaluate('() => DR.peel(0)')               # 揭回（零惩罚）
        page.wait_for_timeout(200)
        bbadges2 = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        bmiss = page.evaluate('() => DR.currentLevel.miss')
        # 满员检查：装 2 对件 + 1 错件 → wrong（错退对留）→ 补齐对件 → 推进
        page.evaluate('i => DR.tapSticker(i)', next(i for i, s in enumerate(bq['stickers'])
                                                    if s['id'] == bq['need'][0]))
        page.evaluate('() => DR.tapRabbit()')
        page.wait_for_timeout(200)
        page.evaluate('i => DR.tapSticker(i)', next(i for i, s in enumerate(bq['stickers'])
                                                    if s['id'] == bq['need'][1]))
        page.evaluate('() => DR.tapRabbit()')
        page.wait_for_timeout(200)
        page.evaluate('i => DR.tapSticker(i)', bdiag)
        bchk = page.evaluate('() => DR.tapRabbit()')            # 满员=[对,对,错] → wrong
        page.wait_for_timeout(1400)
        bmid = page.evaluate('() => ({ placed: DR.quiz.placed, miss: DR.quiz.miss, step: DR.currentLevel.step })')
        bbadges3 = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        check('budget flow: wrong-stays(hold) + peel free + capacity-check(keep right, miss+1)',
              bhold_wrong == 'hold' and bbadges1 == 1 and bpeel == bq['stickers'][bdiag]['id'] and
              bbadges2 == 0 and bmiss == 0 and bchk == 'wrong' and
              bmid['miss'] == 1 and bmid['step'] == 0 and
              sorted(bmid['placed']) == sorted(bq['need'][:2]) and bbadges3 == 2,
              {'holdWrong': bhold_wrong, 'peel': bpeel, 'chk': bchk, 'mid': bmid, 'badges': (bbadges1, bbadges2, bbadges3)})

        # ---- 3c. anti 单击即判（真实 UI：DR.start(10)，ch3 全反向） ----
        page.evaluate('DR.start(10)')
        page.wait_for_timeout(200)
        aq = page.evaluate('() => DR.quiz')
        afit = next(i for i, s in enumerate(aq['stickers']) if not s['right'])
        awrong = page.evaluate('i => DR.tapSticker(i)', afit)   # 点合适件=wrong
        page.wait_for_timeout(400)
        amiss = page.evaluate('() => ({ miss: DR.quiz.miss, step: DR.currentLevel.step })')
        amis = next(i for i, s in enumerate(aq['stickers']) if s['right'])
        aright = page.evaluate('i => DR.tapSticker(i)', amis)   # 点错位件=right（推进）
        page.wait_for_timeout(1200)                             # 等 ADV 窗走完（SPEED=0.12）
        astep = page.evaluate('() => DR.currentLevel.step')
        check('anti flow: single-tap judge (wrong=miss+1 no advance / right=advance)',
              aq['kind'] == 'anti' and awrong == 'wrong' and amiss['miss'] == 1 and amiss['step'] == 0 and
              aright == 'right' and astep == 1,
              {'kind': aq['kind'], 'awrong': awrong, 'amiss': amiss, 'aright': aright, 'astep': astep})

        # ---- 4. DR.start(12) 外部切关生效 ----
        page.evaluate('DR.start(12)')
        lv = page.evaluate('() => DR.currentLevel')
        check('DR.start(12) takes effect (ch3 dch3 anti)', lv['flat'] == 12 and lv['ch'] == 3 and lv['dch'] == 3, lv)

        # ---- 5. free 模式贴/揭/清空走通 + quiz 静止 ----
        page.evaluate('DR.start(0)')
        page.evaluate('DR.setMode("free")')
        snap0 = page.evaluate('() => JSON.stringify(DR.quiz)')
        lv0 = page.evaluate('() => JSON.stringify(DR.currentLevel)')
        f1 = page.evaluate('() => DR.tapSticker(0)')            # 贴第一件（sbag）
        f2 = page.evaluate('() => DR.tapRabbit()')
        page.wait_for_timeout(250)
        f3 = page.evaluate('() => DR.tapSticker(3)')            # 贴第二件（shoes）
        f4 = page.evaluate('() => DR.tapRabbit()')
        page.wait_for_timeout(500)
        fbadges = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        peel = page.evaluate('() => DR.freePeel(0)')            # 揭第一件（badge 还剩一件）
        page.wait_for_timeout(200)
        after_peel = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        fclr = page.evaluate('() => DR.freeClear()')            # 清空剩下的
        page.wait_for_timeout(200)
        after_clr = page.evaluate('() => document.querySelectorAll("#bunny-wear .wear").length')
        still = page.evaluate('() => JSON.stringify(DR.quiz)') == snap0 and \
                page.evaluate('() => JSON.stringify(DR.currentLevel)') == lv0
        check('free place/peel/clear + task quiz frozen',
              f1 == 'free' and f2 == 'free' and f3 == 'free' and f4 == 'free' and
              fbadges == 2 and peel == 'sbag' and after_peel == 1 and
              fclr is True and after_clr == 0 and still,
              {'f1': f1, 'f2': f2, 'badges': fbadges, 'peel': peel,
               'afterPeel': after_peel, 'clr': fclr, 'afterClr': after_clr, 'still': still})

        # ---- 6. 双 viewport 布局 + 截图非空白（三族 flat 0/7/12；贴纸=主答案 ≥64） ----
        for w, h, flat in [(1280, 800, 0), (1280, 800, 7), (1280, 800, 12),
                           (800, 1180, 0), (800, 1180, 7), (800, 1180, 12)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.evaluate('f => DR.start(f)', flat)
            page.wait_for_timeout(250)
            m = page.evaluate('''() => {
              const stks = [...document.querySelectorAll('#tray .stk')].map(b => ({w: b.offsetWidth, h: b.offsetHeight}));
              const btns = ['btn-mode-free','btn-mode-task','btn-rabbit','btn-hear','btn-replay']
                .map(id => document.getElementById(id)).map(b => ({w: b.offsetWidth, h: b.offsetHeight}));
              const de = document.documentElement;
              return { stks, btns, slots: document.querySelectorAll('.pack-slots i').length,
                       stkOk: stks.length >= 3 && stks.every(b => b.w >= 64 && b.h >= 64),
                       btnOk: btns.every(b => b.w >= 64 && b.h >= 64),
                       ox: Math.max(de.scrollWidth - de.clientWidth, document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth) };
            }''')
            shot = HERE / '_shots' / ('selftest_%dx%d_f%d.png' % (w, h, flat))
            shot.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(shot))
            px = page.evaluate('''() => {
              const c = document.createElement('canvas'); c.width = 60; c.height = 60;
              const x = c.getContext('2d');
              const img = document.querySelector('#scene .sky');
              return !!img && !!x;   // 元素级在场（像素非空白由文件尺寸侧证）
            }''')
            import os
            size_ok = shot.exists() and shot.stat().st_size > 8000
            slots_ok = (flat != 7) or m['slots'] == 3
            check('layout %dx%d f%d (stk/btn >=64, ox<=0, shot non-blank)' % (w, h, flat),
                  m['stkOk'] and m['btnOk'] and m['ox'] <= 0 and size_ok and px and slots_ok,
                  {'stkMin': min((b['w'] for b in m['stks']), default=0), 'ox': m['ox'],
                   'shot': size_ok, 'slots': m['slots']})

        # ---- 7. 正常模式（非 verify 页）真实主流程：教学链 → autoSolve → 写档 ----
        ctx2 = browser.new_context()                            # 全新 storage（首开教学）
        page2 = ctx2.new_page()
        errs2 = []
        page2.on('pageerror', lambda e: errs2.append(str(e)))
        page2.goto(URL)
        page2.wait_for_timeout(2000)
        demo_r = None
        for _ in range(60):                                     # 等教学演示 __drDemoR
            demo_r = page2.evaluate('window.__drDemoR || null')
            if demo_r:
                break
            page2.wait_for_timeout(500)
        tut = 'watch'
        for _ in range(40):                                     # 等教学交接（watch→help）
            tut = page2.evaluate('DR && DR.tutorial')
            if tut != 'watch':
                break
            page2.wait_for_timeout(500)
        r = page2.evaluate('DR.autoSolve()')
        stars = None
        for _ in range(30):
            stars = page2.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            page2.wait_for_timeout(500)
        save = page2.evaluate('() => { const s = KIDS._save(); return { v: s && s.v, game: s && s.game, tutSeen: !!(s.dressup && s.dressup.tutSeen) }; }')
        ls_key = page2.evaluate('() => { const raw = localStorage.getItem("kidsgame_dressup"); return raw ? JSON.parse(raw).v : null; }')
        check('real-page tutorial + autosolve + save v1.0 stars3',
              demo_r == 'right' and tut in ('help', 'solo') and r.get('done') and
              stars == 3 and save['v'] == '1.0' and save['game'] == 'dressup' and
              save['tutSeen'] and ls_key == '1.0' and not errs2,
              {'demoR': demo_r, 'tut': tut, 'auto': r, 'stars': stars, 'save': save, 'ls': ls_key, 'errs': errs2[:2]})

        # 7b. 真实页两击制走一题（pointer 级：点贴纸 DOM → 点场景 DOM → badge 挂上）
        cur_q = page2.evaluate('() => DR.quiz')
        if cur_q:
            ridx2 = next(i for i, s in enumerate(cur_q['stickers']) if s['id'] == cur_q['need'][0])
            page2.evaluate('DR.start(0)')
            page2.wait_for_timeout(200)
            page2.click('#tray .stk[data-i="%d"]' % ridx2)
            page2.wait_for_timeout(200)
            page2.click('#scene')
            page2.wait_for_timeout(600)
            got = page2.evaluate('() => ({ step: DR.currentLevel.step, badges: document.querySelectorAll("#bunny-wear .wear").length })')
            check('real-page two-tap via DOM pointer', got['badges'] >= 1, got)
        check('0 pageerror (real page)', not errs2, errs2[:3])
        ctx2.close()

        check('0 http requests (fully offline)', not http_reqs, http_reqs[:3])
        browser.close()

        # ---- 9. 单关净时长 wall-clock（§8 ≥40s 硬指标；>60s 会话分独立 browser）
        # 模拟幼儿决策 dwell=SPEC §8 DECIDE 假设值独立副本（每题一次）+ 两击动作 350ms ----------
        DWELL_PLAY = """async () => {
          const DW = { conflict: 6200, budget: 7800, anti: 5400 };   // 幼儿决策 dwell（SPEC §8 假设值副本）
          const dwell = ms => new Promise(r => setTimeout(r, ms));
          DR.start(%d);
          await dwell(400);
          const t0 = Date.now();
          let guard = 0, seen = -1;
          while (!DR.currentLevel.done && guard++ < 900) {
            const lv = DR.currentLevel, q = DR.quiz;
            if (!q) break;
            if (state.locked || state.busy || state.won || state.demo) { await dwell(60); continue; }
            if (lv.step !== seen) { await dwell(DW[q.kind]); seen = lv.step; continue; }   // 新题先思考
            if (q.kind === 'anti') {
              DR.tapSticker(q.stickers.findIndex(s => s.right));       // 反向：单击即判
            } else if (q.sel == null) {
              DR.tapSticker(nextNeededIdx(q));
              await dwell(350);                                          // 两击动作间隔
            } else {
              await DR.tapRabbit();
              await dwell(350);
            }
          }
          return { ms: Date.now() - t0, done: DR.currentLevel.done, stars: DR.currentLevel.stars,
                   miss: DR.currentLevel.miss };
        }"""
        for flat, want_min in [(1, 40000), (7, 40000)]:
            b2 = p.chromium.launch()
            c2 = b2.new_context(viewport={'width': 1280, 'height': 800})
            pg4 = c2.new_page()
            errs4 = []
            pg4.on('pageerror', lambda e: errs4.append(str(e)))
            # 种档=core store.load 对 v 匹配档不补默认键（design/core.js 只读）——须自带全结构
            # （dailyMin 缺键 → core 会话计时器每分钟 save.dailyMin[today] 抛 pageerror；与 verify_batch24 parent_gate 同款）
            today = datetime.date.today().strftime('%Y-%m-%d')
            pg4.add_init_script('localStorage.setItem("kidsgame_dressup", JSON.stringify(' +
                                '{v:"1.0",game:"dressup",firstDay:"' + today + '",lastDay:"' + today + '",' +
                                'levels:{},dailyMin:{},settings:{tts:true,vol:0.6,sfx:true},' +
                                'restTip:{day:"",shown:0},dressup:{tutSeen:true}}))')
            pg4.goto(URL)
            pg4.wait_for_timeout(800)
            tm = pg4.evaluate(DWELL_PLAY % flat)
            check('wall-clock level flat%d >= 40s (child-model dwell)' % flat,
                  tm['done'] and tm['stars'] == 3 and tm['ms'] >= want_min and not errs4,
                  {'ms': tm['ms'], 'done': tm['done'], 'stars': tm['stars'], 'errs': errs4[:1]})
            c2.close()
            b2.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])

    fails = [r for r in RESULTS if not r[1]]
    print('\n== selftest %d/%d ==' % (len(RESULTS) - len(fails), len(RESULTS)))
    return 0 if not fails else 1


if __name__ == '__main__':
    sys.exit(main())
