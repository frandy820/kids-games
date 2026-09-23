# -*- coding: utf-8 -*-
"""season _selftest r4 — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭表对账（SPEC-BATCH26 §0.62 r4 块文字口径重列，不引用页面 ITEMS/OUT2/OUT3）：
   40 关全题 带∈3 / 场合∈4（outfit）/ need=表内变体且逐件 fits / 干扰恒 !fits（唯一性铁律）/
   卡数=need+3 且互异 / 反向题结构（need !fits 带、干扰 3 件 fits 带、卡数 4）/ stem 独立重算 /
   dch1 全两件 / dch2 全三件且 occ≠sleep / dch3 陷阱对件在场 / dch4 反向 ≥2 / flat0q0 锚定
3. SE 钩子语义 r4：tapItem→pick/unpick 切换；tapSubmit 三路径（wrong_less 保留不算 miss /
   wrong_more 清空+miss+1+反馈句绑定 / right 推进）；按题型方向 hint clip（outfit/anti 各验一条）
4. 反馈/确认句表 Python 独立重算（SUBMIT_TEXT/ANTI_ANCHOR/confirmOf 全格 ≤11 码点）+
   TTS 窗护栏（620+430+4350=5400 ≥ estMs(11)+300；4750 ≥ estMs+300——m-5 统一 +600 口径）
5. 双 viewport(1280x800/800x1180) ch1/ch4：物品卡 ≥96、场景卡 ≥64、overflowX≤0、截图像素非空白
6. 防重入（b25 坑①方法学）：wrong_more 提交 fire-and-forget + 40ms 窗内二击提交 → 二击=False
   且 miss 只 +1
7. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮，演示=勾两件+提交）→
   wrong_more 一次（反馈句 TTS=voice.say spy 断言）→ 真实 pointer 勾满+点「穿好啦」通关 →
   celebrate → 写档 stars=2 + tutSeen + v1.0 + 0 pageerror
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# ---------- Python 独立封闭表（SPEC-BATCH26 §0.62 r4 块文字逐条转译，禁抄页面表） ----------
PY_TEMPS = ['cold', 'cool', 'hot']
PY_OCCS = ['school', 'sport', 'sleep', 'party']
PY_TEMP_N = {'cold': '很冷', 'cool': '凉爽', 'hot': '很热'}
PY_OCC_N = {'school': '去上学', 'sport': '做运动', 'sleep': '去睡觉', 'party': '去派对'}
PY_ITEMS = {                                   # 30 物品双属性（t=带 o=场合）
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
PY_OUT2 = {
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
PY_OUT3 = {
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
PY_TRAP = [('lightjacket', 'heavycoat'), ('thinscarf', 'scarf'), ('sunhat', 'woolhat'),
           ('tshirt', 'longsleeve'), ('sandals', 'sneaker'), ('pants', 'shorts')]
PY_ANTI_POOL = ['tshirt', 'longsleeve', 'lightjacket', 'heavycoat', 'thinscarf', 'scarf',
                'sunhat', 'woolhat', 'sandals', 'snowboots', 'shorts', 'warmpants']
PY_SUBMIT = {'less': '还差一件，再挑一挑', 'more': '多选了一件，再挑一挑'}
PY_ANCHOR = {'cold': '很冷的天，哪件会发抖', 'cool': '凉爽的天，哪件不合适', 'hot': '很热的天，哪件会出汗'}
PY_ANTI_NOT_WORN = ['kite', 'umbrella']


def py_fits(k, b, o):
    t, oc = PY_ITEMS[k]
    return b in t and o in oc


def py_trap_mate(k):
    for a, b in PY_TRAP:
        if k == a:
            return b
        if k == b:
            return a
    return None


def py_stem(q):
    if q['kind'] == 'anti':
        return PY_TEMP_N[q['band']] + '的天，哪件穿上不合适'
    return PY_TEMP_N[q['band']] + '的天' + PY_OCC_N[q['occ']] + '，穿什么'


def py_confirm(kind, band, occ):
    if kind == 'anti':
        return PY_TEMP_N[band] + '的天，它不合适'
    return PY_TEMP_N[band] + '的天' + PY_OCC_N[occ] + '，穿好啦'


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def audit_level(lv):
    bad = []
    n_anti = 0
    for k, q in enumerate(lv['quizzes']):
        tag = 'f%s/q%s' % (lv['flat'], k)
        if q['band'] not in PY_TEMPS:
            bad.append((tag, 'band', q['band']))
            continue
        if q['stem'] != py_stem(q):
            bad.append((tag, 'stem', q['stem']))
        if q['kind'] == 'anti':
            n_anti += 1
            if lv['dch'] != 4:
                bad.append((tag, 'antiDch', lv['dch']))
            if len(q['need']) != 1 or q['need'][0] not in PY_ANTI_POOL:
                bad.append((tag, 'antiNeed', q['need']))
                continue
            nk = q['need'][0]
            if q['band'] in PY_ITEMS[nk][0]:
                bad.append((tag, 'antiFits', nk, q['band']))
            ks = q['items']
            if len(ks) != 4 or len(set(ks)) != 4 or nk not in ks:
                bad.append((tag, 'antiCards', ks))
                continue
            distr = [c for c in ks if c != nk]
            for c in distr:
                if q['band'] not in PY_ITEMS[c][0]:
                    bad.append((tag, 'antiDistr', c))
            continue
        if q['occ'] not in PY_OCCS:
            bad.append((tag, 'occ', q['occ']))
            continue
        key = q['band'] + '|' + q['occ']
        table = PY_OUT2 if len(q['need']) == 2 else PY_OUT3
        if q['need'] not in table.get(key, []):
            bad.append((tag, 'variant', key, q['need']))
            continue
        for nk in q['need']:
            if not py_fits(nk, q['band'], q['occ']):
                bad.append((tag, 'needFits', nk))
        ks = q['items']
        if len(ks) != len(q['need']) + 3 or len(set(ks)) != len(ks):
            bad.append((tag, 'cards', ks))
            continue
        for nk in q['need']:
            if nk not in ks:
                bad.append((tag, 'needIn', nk))
        for c in ks:
            if c in q['need']:
                continue
            if py_fits(c, q['band'], q['occ']):
                bad.append((tag, 'distrFits', c, key))
        if lv['dch'] == 1 and len(q['need']) != 2:
            bad.append((tag, 'dch1size'))
        if lv['dch'] == 2 and (len(q['need']) != 3 or q['occ'] == 'sleep'):
            bad.append((tag, 'dch2', q['occ']))
        if lv['dch'] == 3:
            has_trap = False
            for nk in q['need']:
                mate = py_trap_mate(nk)
                if mate and not py_fits(mate, q['band'], q['occ']):
                    has_trap = True
                    if mate not in ks:
                        bad.append((tag, 'trapMiss', nk, mate))
            if not has_trap:
                bad.append((tag, 'noTrap', key, q['need']))
    if lv['dch'] == 4 and n_anti < 2:
        bad.append(('f%s' % lv['flat'], 'antiLt2', n_anti))
    return bad


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

        # ---- 2. Python 独立封闭表对账（40 关全题：变体/双约束/唯一性/陷阱/反向结构/stem） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'kind: q.kind, band: q.band, occ: q.occ, need: q.need.slice(), '
                                  'items: q.items.map(t => t.item), stem: q.stem })) }; })')
        bad = []
        for lv in levels_js:
            bad += audit_level(lv)
        check('python-side closed-table parity (40 levels x 5 quizzes)', not bad, bad[:5])
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor cold|school [heavycoat,pants]',
              anchor['kind'] == 'outfit' and anchor['band'] == 'cold' and anchor['occ'] == 'school'
              and anchor['need'] == ['heavycoat', 'pants'], anchor)
        # 确定性双跑（Python 侧再验：同 flat 两次生成全等）
        det = page.evaluate('JSON.stringify(genLevel(7).quizzes) === JSON.stringify(genLevel(7).quizzes) && '
                            'JSON.stringify(genLevel(23).quizzes) === JSON.stringify(genLevel(23).quizzes)')
        check('deterministic double-run (flat 7/23)', det is True)

        # ---- 3. SE 钩子语义 r4（tapItem 切换 / tapSubmit 三路径 / 按题型方向 hint clip） ----
        page.evaluate('SE.start(0)')
        qz = page.evaluate('() => SE.quiz')
        check('SE.quiz contract r4 (kind/band/occ/need/picks/picked/step/miss)',
              qz['kind'] == 'outfit' and qz['band'] in PY_TEMPS and qz['occ'] in PY_OCCS and
              len(qz['need']) == 2 and len(qz['picks']) == 5 and
              len(set(qz['picks'])) == 5 and all(c in PY_ITEMS for c in qz['picks']) and
              all(c in qz['picks'] for c in qz['need']) and
              qz['picked'] == [] and qz['step'] == 0 and qz['miss'] == 0, qz)
        # tapItem pick/unpick 切换（零惩罚）
        ia = qz['picks'].index(qz['need'][0])
        r_pick = page.evaluate('(i) => SE.tapItem(i)', ia)
        r_unpick = page.evaluate('(i) => SE.tapItem(i)', ia)
        picked_after = page.evaluate('() => SE.quiz.picked')
        check('tapItem pick/unpick toggle (zero penalty)',
              r_pick == 'pick' and r_unpick == 'unpick' and picked_after == [] and
              page.evaluate('() => SE.quiz.miss') == 0, {'pick': r_pick, 'unpick': r_unpick})
        # tapSubmit 三路径：less（保留不算 miss）→ more（清空+miss+反馈句）→ right（勾满推进）
        page.evaluate('(i) => SE.tapItem(i)', qz['picks'].index(qz['need'][0]))
        page.evaluate('window.__lastSayText = null; window.__lastVoiceKey = null; lastWrongVoice = 0')
        r_less = page.evaluate('() => SE.tapSubmit()')
        st_less = page.evaluate('() => ({ miss: SE.quiz.miss, picked: SE.quiz.picked.length })')
        iw = next(i for i, c in enumerate(qz['picks']) if c not in qz['need'])
        page.evaluate('(i) => SE.tapItem(i)', iw)
        r_more = page.evaluate('() => SE.tapSubmit()')
        page.wait_for_timeout(900)
        st_more = page.evaluate('() => ({ miss: SE.quiz.miss, picked: SE.quiz.picked.length, step: SE.quiz.step })')
        say_more = page.evaluate('window.__lastSayText')
        check('tapSubmit wrong_less keeps picks (no miss)',
              r_less == 'wrong_less' and st_less['miss'] == 0 and st_less['picked'] == 1,
              {'r': r_less, 'st': st_less})
        check('tapSubmit wrong_more clears picks + miss+1 + feedback sentence',
              r_more == 'wrong_more' and st_more['miss'] == 1 and st_more['picked'] == 0 and
              st_more['step'] == 0 and say_more == PY_SUBMIT['more'],
              {'r': r_more, 'st': st_more, 'say': say_more})
        for c in qz['need']:
            page.evaluate('(i) => SE.tapItem(i)', qz['picks'].index(c))
        r_right = page.evaluate('() => SE.tapSubmit()')
        page.wait_for_timeout(300)
        st_right = page.evaluate('() => ({ step: SE.quiz.step, miss: SE.quiz.miss })')
        check('tapSubmit right advances step', r_right == 'right' and st_right['step'] == 1, st_right)
        # 按题型方向 hint clip（outfit→sea_hint_outfit / anti→sea_hint_anti）
        page.evaluate('SE.start(0); window.__lastVoiceKey = null')
        page.evaluate('speakDirHint(cur.quizzes[cur.step])')
        vk_outfit = page.evaluate('window.__lastVoiceKey')
        anti_flat = page.evaluate('''(() => {
          for (let f = 15; f < 40; f++) { if (genLevel(f).quizzes[0].kind === 'anti') return f; }
          return -1; })()''')
        page.evaluate('(f) => { SE.start(f); window.__lastVoiceKey = null; }', anti_flat)
        page.evaluate('speakDirHint(cur.quizzes[cur.step])')
        vk_anti = page.evaluate('window.__lastVoiceKey')
        check('direction hint clip by kind (outfit/anti)',
              vk_outfit == 'sea_hint_outfit' and vk_anti == 'sea_hint_anti' and anti_flat >= 15,
              {'outfit': vk_outfit, 'anti': vk_anti, 'antiFlat': anti_flat})

        # ---- 4. 反馈/确认句表 Python 独立全格对账 + TTS 窗护栏 ----
        grid = page.evaluate('JSON.stringify((() => { const out = []; '
                             'for (const b of ALL_BANDS) { '
                             '  out.push([SUBMIT_TEXT.less, SUBMIT_TEXT.more, ANTI_ANCHOR[b], '
                             '             confirmOf({kind:"anti", band:b})]); '
                             '  for (const o of ALL_OCCS) out.push([confirmOf({kind:"outfit", band:b, occ:o})]); '
                             '} return out; })())')
        cells = [c for row in json.loads(grid) for c in row]
        py_expect = []
        for b in PY_TEMPS:
            py_expect += [PY_SUBMIT['less'], PY_SUBMIT['more'], PY_ANCHOR[b], py_confirm('anti', b, None)]
            for o in PY_OCCS:
                py_expect.append(py_confirm('outfit', b, o))
        mismatch = [(a, e) for a, e in zip(cells, py_expect) if a != e]
        long_cells = [c for c in cells if len(c) > 11]
        check('feedback/confirm sentences parity & <=11 codepoints',
              not mismatch and not long_cells and len(cells) == len(py_expect) == 3 * 8,
              (mismatch[:2], long_cells[:2], len(cells)))
        win_ok = page.evaluate('(() => (620 + 430 + 4350) === 5400 && '
                               '5400 >= estMs(TTS_MAX_CHARS) + 300 && TTS_MAX_CHARS === 11 && '
                               '4750 >= estMs(TTS_MAX_CHARS) + 300)()')
        check('TTS win 5400 >= estMs(11)+300 & chain 4750 >= estMs+300 (m-5 +600 口径)', win_ok is True)

        # ---- 5. 双 viewport 布局 + 截图非空白（ch1 flat0 / ch4 flat17 混排） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 17), (800, 1180, 17)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            page.wait_for_timeout(300)
            page.evaluate('SE.start(%d)' % flat)
            page.wait_for_timeout(200)
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

        # ---- 6. 防重入（wrong_more 提交 40ms 窗内二击吞掉，miss 只 +1） ----
        page.goto(URL + '?verify=1')
        for _ in range(120):                                   # 等 runVerify 跑完，防后台流程搅状态
            page.wait_for_timeout(500)
            if page.title().startswith('VERIFY'):
                break
        page.evaluate('SE.start(0)')
        page.wait_for_timeout(150)
        qz6 = page.evaluate('() => SE.quiz')
        ia6 = qz6['picks'].index(qz6['need'][0])
        iw6 = next(i for i, c in enumerate(qz6['picks']) if c not in qz6['need'])
        page.evaluate('(i) => SE.tapItem(i)', ia6)
        page.evaluate('(i) => SE.tapItem(i)', iw6)
        # 两击都发在页面内（CDP 往返一次 >40ms 会假性出窗）：首击 fire-and-forget，
        # 二击由页面内 setTimeout(40) 严格在 40ms 发出（wrong_more 锁窗=600ms）
        r_second = page.evaluate('''() => new Promise(res => {
          SE.tapSubmit();
          setTimeout(() => { Promise.resolve(SE.tapSubmit()).then(r => res(r)); }, 40);
        })''')
        page.wait_for_timeout(1000)
        st6 = page.evaluate('() => ({ miss: SE.quiz.miss, step: SE.quiz.step, picked: SE.quiz.picked.length })')
        check('reentry 40ms second submit swallowed (miss +1 only)',
              r_second is False and st6['miss'] == 1 and st6['step'] == 0 and st6['picked'] == 0,
              {'second': r_second, 'after': st6})

        # ---- 7. 正常模式（非 verify 页）真实主流程：教学（看→帮）→ wrong_more → 真实勾选+提交通关 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        # 先装 voice.play/voice.say spy（反馈句断言用；原调用透传不破坏行为）
        pg2.evaluate('''() => {
          const origPlay = KIDS.voice.play.bind(KIDS.voice);
          const origSay = KIDS.voice.say.bind(KIDS.voice);
          window.__vkLog = []; window.__vsLog = [];
          KIDS.voice.play = function (k, t) { window.__vkLog.push(k || null); return origPlay(k, t); };
          KIDS.voice.say = function (t) { window.__vsLog.push(t || null); return origSay(t); };
        }''')
        tut = ''
        for _ in range(60):                       # watch 链 ≈13s（真实 SPEED=1：圈注+勾两件+提交演出 5400）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('SE.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__seDemoR')
        check('normal-mode tutorial watch->help (demo pick,pick,right)',
              tut == 'help' and demo_r == 'right' and
              pg2.evaluate('JSON.stringify(window.__seDemoSteps)') == '["pick","pick","right"]',
              {'tut': tut, '__seDemoR': demo_r})
        # wrong_more 一次：真实 pointer 勾 1 件 need + 1 件错件 → 点「穿好啦」（flat0<3 反馈句必播）
        qz2 = pg2.evaluate('() => SE.quiz')
        na = qz2['picks'].index(qz2['need'][0])
        nw = next(i for i, c in enumerate(qz2['picks']) if c not in qz2['need'])
        say_len0 = pg2.evaluate('window.__vsLog.length')
        pg2.click('.card[data-i="%d"]' % na, timeout=3000)
        pg2.wait_for_timeout(450)                 # pick 演出 300ms
        pg2.click('.card[data-i="%d"]' % nw, timeout=3000)
        pg2.wait_for_timeout(450)
        pg2.click('#btn-wear', timeout=3000)
        pg2.wait_for_timeout(1100)                # wrong_more 锁窗 600ms
        says = pg2.evaluate('window.__vsLog')
        new_says = says[say_len0:]
        st_after_wrong = pg2.evaluate('() => ({ miss: SE.quiz.miss, step: SE.quiz.step, picked: SE.quiz.picked.length })')
        check('normal-mode wrong_more feedback TTS + clear picks',
              new_says and new_says[-1] == PY_SUBMIT['more'] and
              st_after_wrong['miss'] == 1 and st_after_wrong['step'] == 0 and st_after_wrong['picked'] == 0,
              {'newSays': new_says, 'after': st_after_wrong})
        # 真实 pointer 逐题通关（outfit=勾满 need→点「穿好啦」；anti=点 need 卡）
        guard = 0
        while guard < 90:
            guard += 1
            st = pg2.evaluate('() => ({ done: SE.currentLevel.done, quiz: SE.quiz })')
            if st['done'] or not st['quiz']:
                break
            q = st['quiz']
            if q['kind'] == 'anti':
                idx = q['picks'].index(q['need'][0])
                pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
                pg2.wait_for_timeout(6300)        # 判对演出窗 5400 + 读题节拍
            else:
                for c in q['need']:
                    idx = q['picks'].index(c)
                    if idx in q['picked']:
                        continue
                    pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
                    pg2.wait_for_timeout(450)
                pg2.click('#btn-wear', timeout=3000)
                pg2.wait_for_timeout(6300)
        cel = False
        for _ in range(12):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('SE.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(1200)
        sv = None                                                # 轮询写档（winFlow 在末题演出窗后弹层写档）
        for _ in range(30):
            sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_season")||"null")')
            if (sv or {}).get('levels', {}).get('1-0'):
                break
            pg2.wait_for_timeout(500)
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save (2 stars: 1 wrong_more + rest right)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('season', {}).get('tutSeen')
              and st1.get('stars') == 2,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('season'), 'stars10': st1.get('stars')})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()                               # 内存纪律：page/context 用完即关

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
