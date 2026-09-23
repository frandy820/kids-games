# -*- coding: utf-8 -*-
"""weather _selftest v2（条件推理改造）— headless playwright 自测（独立 chromium.launch，不连不杀浏览器）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立真值对账（SPEC v2 文字口径重列，不引用页面符号）：
   池 13 件 cls/zone + 5 区间 outfit（<0 羽绒+手套 / 0-8 厚外套+围巾 / 9-16 小外套 / 17-24 长袖 /
   25+ 短袖+太阳帽）+ 边界题 8/16/24 + 梯子升降档（怕冷-1/怕热+1）+ ch1 行表 + ch2 组合表 +
   anti 场景表 × 40 关全题：need 对表 / 候选唯一正确 / 卡数 6-5-4
3. 多件提交语义（WE.start(5)→dch2 真实 UI）：含错件=wrong_more 清空+miss / 未选满=wrong_less 保留 /
   取消勾选零惩罚 / 勾满提交=推进
4. WE.start(12) 外部切关生效（b21 三款系统性遗漏教训）
5. 双 viewport(1280x800/800x1180) flat0/10/15：卡 ≥96、条件 chip ≥56、场景 ≥64、overflowX≤0、截图像素非空白
6. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看=双条件演示→帮）→ 真实 pointer
   点卡通关（multi=点两件+点「穿好啦」提交）→ celebrate → 写档 stars=3 + tutSeen
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# ---------- Python 独立真值表（SPEC v2 文字逐条转译，禁抄页面符号） ----------
SPEC_POOL = {  # id: (cls 天气类, zone 唯一温度区间 1-5 / 0=雨具)
    'downcoat': ('snow', 1), 'gloves': ('snow', 1), 'snowboots': ('snow', 1),
    'coat': ('snow', 2), 'scarf': ('snow', 2),
    'jacket': ('wind', 3), 'longsleeve': ('mild', 4),
    'shorts': ('sun', 5), 'sunhat': ('sun', 5), 'sandals': ('sun', 5), 'swimwear': ('sun', 5),
    'raincoat': ('rain', 0), 'rainboots': ('rain', 0),
}
def spec_zone(t):  # t<0→1 / 0-8→2 / 9-16→3 / 17-24→4 / ≥25→5
    return 1 if t < 0 else 2 if t <= 8 else 3 if t <= 16 else 4 if t <= 24 else 5
SPEC_OUTFIT = {1: ['downcoat', 'gloves'], 2: ['coat', 'scarf'], 3: ['jacket'],
               4: ['longsleeve'], 5: ['shorts', 'sunhat']}
SPEC_LADDER = ['downcoat', 'coat', 'jacket', 'longsleeve', 'shorts']
SPEC_WHO_SHIFT = {'mom': -1, 'bunny': 1}
SPEC_WHO_TEMPS = {5, 8, 12, 16, 18, 24}
SPEC_ROWS = {  # ch1：场景+天气 → 核心 1 件
    'r0': ('rain', 'school', 'raincoat'), 'r1': ('rain', 'puddle', 'rainboots'),
    'r2': ('sun', 'school', 'sunhat'), 'r3': ('sun', 'beach', 'shorts'),
    'r4': ('sun', 'swim', 'swimwear'), 'r5': ('snow', 'school', 'coat'),
    'r6': ('snow', 'snowman', 'gloves'), 'r7': ('snow', 'snowwalk', 'snowboots'),
    'r8': ('wind', 'park', 'jacket'),
}
SPEC_COMBOS = {  # ch2：两条件 → 2 件
    'cm0': ['raincoat', 'jacket'], 'cm1': ['coat', 'rainboots'], 'cm2': ['sunhat', 'shorts'],
    'cm3': ['scarf', 'coat'], 'cm4': ['downcoat', 'gloves'],
}
SPEC_ANTI = {  # 反向题场景：会用上=干扰恰「会用上」
    'beach': ['shorts', 'sunhat', 'sandals', 'swimwear'],
    'snowman': ['downcoat', 'gloves', 'scarf', 'snowboots'],
    'swim': ['swimwear', 'sandals', 'sunhat'],
}
SPEC_TEMPS = {-5, 5, 8, 12, 16, 18, 24, 25, 32}
SPEC_BOUNDARY = {8, 16, 24}


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

        # ---- 2. Python 独立真值对账（40 关全题：need 对表+候选唯一正确+卡数） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'kind: q.kind, id: q.id, conds: q.conds, need: q.need, '
                                  'stem: q.stem, '
                                  'cards: q.cards.map(c => c.id) })) }; })')
        bad = []
        seen_boundary = set()
        for lv in levels_js:
            for k, q in enumerate(lv['quizzes']):
                ids = q['cards']
                if any(i not in SPEC_POOL for i in ids):
                    bad.append((lv['flat'], k, 'lib', ids))
                    continue
                if q['kind'] == 'one':
                    w, sc, need = SPEC_ROWS.get(q['id'], (None,) * 3)
                    if not w or q['need'] != [need] or q['conds'][0]['v'] != w or q['conds'][1]['v'] != sc:
                        bad.append((lv['flat'], k, 'row', q['id'], q['need']))
                    n_cls = sum(1 for i in ids if SPEC_POOL[i][0] == w)
                    if n_cls != 1 or len(ids) != 6:
                        bad.append((lv['flat'], k, 'oneUnique', ids))
                elif q['kind'] == 'multi':
                    cb = SPEC_COMBOS.get(q['id'])
                    if not cb or sorted(q['need']) != sorted(cb) or len(q['need']) != 2:
                        bad.append((lv['flat'], k, 'combo', q['id'], q['need']))
                    n_in = sum(1 for i in ids if i in cb)
                    if n_in != 2 or len(ids) != 6:
                        bad.append((lv['flat'], k, 'multiUnique', ids))
                elif q['kind'] == 'temp':
                    t = q['conds'][0]['v']
                    Z = spec_zone(t)
                    if sorted(q['need']) != sorted(SPEC_OUTFIT[Z]):
                        bad.append((lv['flat'], k, 'outfit', t, q['need']))
                    z_in = [i for i in ids if SPEC_POOL[i][1] == Z]
                    if sorted(z_in) != sorted(SPEC_OUTFIT[Z]) or len(ids) != 6:
                        bad.append((lv['flat'], k, 'tempUnique', t, ids))
                    if t in SPEC_BOUNDARY and 10 <= lv['flat'] < 15:
                        seen_boundary.add(t)
                elif q['kind'] == 'who':
                    t, pk = q['conds'][0]['v'], q['conds'][1]['v']
                    if t not in SPEC_WHO_TEMPS:
                        bad.append((lv['flat'], k, 'whoTemp', t))
                    exp = SPEC_LADDER[max(0, min(4, spec_zone(t) - 1 + SPEC_WHO_SHIFT[pk]))]
                    if q['need'] != [exp] or sorted(ids) != sorted(SPEC_LADDER) or len(ids) != 5:
                        bad.append((lv['flat'], k, 'who', t, pk, q['need']))
                else:  # anti
                    used = SPEC_ANTI.get(q['conds'][0]['v'])
                    if not used or q['need'][0] in used:
                        bad.append((lv['flat'], k, 'antiNeed', q['conds'][0]['v'], q['need']))
                    n_out = sum(1 for i in ids if i not in used)
                    if n_out != 1 or len(ids) != 4:
                        bad.append((lv['flat'], k, 'antiUnique', ids))
        check('python-side truth parity (40 levels x 5 quizzes)', not bad, bad[:5])
        check('ch3 static levels cover boundary 8/16/24', seen_boundary == SPEC_BOUNDARY, sorted(seen_boundary))
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor multi cm0',
              anchor['kind'] == 'multi' and anchor['id'] == 'cm0' and
              sorted(anchor['need']) == ['jacket', 'raincoat'], anchor)

        # ---- 2b. r9 时长独立副本复核（py 常量重列，禁页内 levelDurMs 互证）+与源对账 ----
        py_est = lambda c: c * 345 + 600                     # estMs 家族定版式（独立副本）
        py_decide = {'one': 7400, 'multi': 8000, 'temp': 7800, 'who': 8200, 'anti': 7000}
        dur_list = [sum(max(py_est(len(q['stem'])), py_decide[q['kind']]) +
                        (1600 if len(q['need']) > 1 else 0)
                        for q in lv['quizzes']) + 5 * 900 for lv in levels_js]
        src_list = page.evaluate('Array.from({length:40}, (_, f) => levelDurMs(genLevel(f)))')
        check('r9 modeled duration >=40s every level (py independent + source parity)',
              min(dur_list) >= 40000 and dur_list == src_list, 'min=%d' % min(dur_list))
        check('verify duration unit green (page-side independent copy)',
              out['units'].get('duration', {}).get('ok') is True and
              out['units'].get('duration', {}).get('minMs', 0) >= 40000,
              out['units'].get('duration'))

        # ---- 3. 多件提交语义（真实 UI，WE.start(5)→dch2 全 multi） ----
        page.evaluate('WE.start(5)')
        qz = page.evaluate('() => WE.quiz')
        qz_id = page.evaluate('genLevel(5).quizzes[0].id')     # id 从引擎读（钩子契约不含 id）
        need_ids = qz['need'] if isinstance(qz['need'], list) else [qz['need']]
        check('ch2 quiz is multi/2-need/6-cards', qz['kind'] == 'multi' and len(need_ids) == 2 and
              qz_id in SPEC_COMBOS and sorted(need_ids) == sorted(SPEC_COMBOS[qz_id]) and
              len(qz['picks']) == 6, {'id': qz_id, 'qz': qz})
        wi = next(i for i, cid in enumerate(qz['picks']) if cid not in need_ids)
        ni = [i for i, cid in enumerate(qz['picks']) if cid in need_ids]
        pw = page.evaluate('i => WE.tapCloth(i)', wi)           # 勾错件（fire-and-forget 窗内紧邻）
        sw = page.evaluate('() => WE.tapSubmit()')              # 含错件提交=wrong_more
        m1 = page.evaluate('() => ({ picked: WE.quiz.picked, miss: WE.quiz.miss })')
        check('wrong_more clears picks + miss', pw == 'pick' and sw == 'wrong_more' and
              m1['picked'] == [] and m1['miss'] == 1, {'pw': pw, 'sw': sw, 'm1': m1})
        p1 = page.evaluate('i => WE.tapCloth(i)', ni[0])
        s1 = page.evaluate('() => WE.tapSubmit()')              # 只勾 1 件提交=wrong_less 保留
        m2 = page.evaluate('() => ({ picked: WE.quiz.picked, miss: WE.quiz.miss })')
        check('wrong_less keeps picks', p1 == 'pick' and s1 == 'wrong_less' and m2['picked'] == [ni[0]], m2)
        pu = page.evaluate('i => WE.tapCloth(i)', ni[0])        # 取消勾选零惩罚
        p1b = page.evaluate('i => WE.tapCloth(i)', ni[0])       # 重新勾
        p2 = page.evaluate('i => WE.tapCloth(i)', ni[1])
        s2 = page.evaluate('() => WE.tapSubmit()')              # 勾满提交=推进
        page.wait_for_timeout(300)
        st = page.evaluate('() => ({ step: WE.quiz.step, miss: WE.currentLevel.miss })')
        check('unpick free + full submit advances',
              pu == 'unpick' and p1b == 'pick' and p2 == 'pick' and s2 in ('right', 'done') and
              st['step'] == 1 and st['miss'] == 1, {'pu': pu, 's2': s2, 'st': st})

        # ---- 4. WE.start(12) 外部切关生效（ch3 温度计章） ----
        page.evaluate('WE.start(12)')
        lv = page.evaluate('() => WE.currentLevel')
        q3 = page.evaluate('() => WE.quiz')
        t3 = q3['conds'][0]['v']
        need3 = q3['need'] if isinstance(q3['need'], list) else [q3['need']]   # 单件=字符串契约
        check('WE.start(12) takes effect (ch3 temp)', lv['flat'] == 12 and lv['ch'] == 3 and lv['dch'] == 3
              and q3['kind'] == 'temp' and sorted(need3) == sorted(SPEC_OUTFIT[spec_zone(t3)]),
              {'lv': lv, 't': t3, 'need': need3})

        # ---- 5. 双 viewport 布局 + 截图非空白（verify 页，卡=主答案 ≥96；chips ≥56） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 10), (800, 1180, 10),
                           (1280, 800, 15), (800, 1180, 15)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            for _ in range(120):                   # 先等 runVerify 收尾（防其内部 startLevel 与截图竞态）
                if page.title().startswith('VERIFY PASS'):
                    break
                page.wait_for_timeout(500)
            page.evaluate('WE.start(%d)' % flat)
            page.wait_for_timeout(250)
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const chips = [...document.querySelectorAll('#conds .chip')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       chips: chips.length, minChip: chips.length ? Math.min(...chips.flat()) : 0,
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
                  m['minWH'] >= 96 and m['scene'][0] >= 64 and m['scene'][1] >= 64 and
                  m['chips'] >= 1 and m['minChip'] >= 56 and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'chips': m['chips'], 'minChip': m['minChip'],
                   'scene': m['scene'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 6. 正常模式（非 verify 页）真实主流程：教学（看=双条件演示→帮）→ 真实点卡通关 → 写档 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        tut = ''
        for _ in range(40):                       # watch ≈8s（真实 SPEED=1：圈注×2+两勾+提交）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('WE.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__weDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__weDemoR': demo_r})
        # 真实 pointer 逐题（multi=点两件 need+点「穿好啦」；单件=点 right 卡）
        guard = 0
        while guard < 120:
            guard += 1
            st = pg2.evaluate('() => ({ done: WE.currentLevel.done, quiz: WE.quiz })')
            if st['done']:
                break
            qz2 = st['quiz']
            if not qz2:
                break
            need2 = qz2['need'] if isinstance(qz2['need'], list) else [qz2['need']]
            if len(need2) > 1:
                todo = [i for i, cid in enumerate(qz2['picks'])
                        if cid in need2 and i not in qz2['picked']]
                if todo:
                    pg2.click('.card[data-i="%d"]' % todo[0], timeout=3000)
                    pg2.wait_for_timeout(700)     # pick 300ms 演出窗节拍
                    continue
                pg2.click('#btn-wear', timeout=3000)
                pg2.wait_for_timeout(1400)        # 提交成演出窗（亮卡+换装）
            else:
                idx = next((i for i, cid in enumerate(qz2['picks']) if cid == need2[0]), None)
                if idx is None:
                    break
                pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
                pg2.wait_for_timeout(1200)        # single 1050ms 演出窗
        cel = False
        for _ in range(10):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('WE.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3200)                # celebrate 2.3s + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_weather")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('weather', {}).get('tutSeen')
              and st1.get('stars') == 3,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('weather'), 'stars10': st1.get('stars')})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
