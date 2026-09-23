# -*- coding: utf-8 -*-
"""shaperoof _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
5.5-6.5 段 v2 契约（旋转/镜像/组合三阶 + 分离交互）：
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭表对账（改造 delta 文字口径重列，不引用页面 DIR4/CHIRAL6/MIRROR/SLABS/HOLE_DECOMP）：
   40 关全题：ch1=rot 且洞∈有向4形+正确瓦偏转 1-3 / ch2=mirror 且镜像陷阱在场 /
   ch3=combo 且分解=SPEC 表 / ch4=三型各≥1 / 生成关四 dch 全现 / 相邻同型互异 / flat0q0 锚点
3. SR 钩子语义（分离交互）：start(10)=combo 章；quiz {kind,hole,need,tiles{id,shape,right,dir,used},
   sel,placedN,step,miss}；旋转圈数 Python 独立复算 (need.dir-tile.dir)%4；combo half/used/second；
   combo 无朝向 tapRotate=False；镜像手性（转任意次仍 'mir'）
4. 双 viewport(1280x800/800x1180) ch1/ch3/ch4：瓦片卡 ≥96、房子 ≥64、旋转钮 ≥72、
   overflowX≤0、截图像素非空白
5. 正常模式（非 verify 页）真实主流程：全新存档 → 教学（看=旋转一次+放置 → 帮）→ 真实 pointer
   点瓦→点旋转钮×圈数→再点瓦放置 通关 → celebrate → 写档 stars=3 + tutSeen + v1.0
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# ---------- Python 独立封闭表（改造 delta 文字逐条转译，禁抄页面表） ----------
PY_DIR4 = ['triangle', 'arrow', 'crescent', 'flag']                       # 有向 4 形（旋转目标）
PY_MIRROR = {'flag': 'flagm', 'flagm': 'flag', 'bsh': 'dsh', 'dsh': 'bsh',
             'fish': 'fishm', 'fishm': 'fish'}                            # 镜像对 3 对
PY_CHIRAL6 = list(PY_MIRROR)                                              # ch2 手形池 6
PY_SLABS = ['bar2v', 'bar2h', 'bar3v', 'bar3h', 'sq2']                    # 板瓦 5 型
PY_DECOMP = {'L': ['bar3v', 'bar2h'], 'T': ['bar3h', 'bar2v'], 'Z': ['bar2h', 'bar2v']}  # 分解唯一
PY_KINDS = ('rot', 'mirror', 'combo')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def audit_level(lv):
    """Python 独立对账一关（delta 推导，非实现行为归纳）"""
    bad = []
    kinds = [q['kind'] for q in lv['quizzes']]
    if lv['dch'] == 1 and any(k != 'rot' for k in kinds):
        bad.append(('dch1kind', kinds))
    if lv['dch'] == 2 and any(k != 'mirror' for k in kinds):
        bad.append(('dch2kind', kinds))
    if lv['dch'] == 3 and any(k != 'combo' for k in kinds):
        bad.append(('dch3kind', kinds))
    if lv['dch'] == 4 and len(set(kinds)) != 3:                           # 三型各 ≥1
        bad.append(('mixMissing', kinds))
    for k, q in enumerate(lv['quizzes']):
        if q['kind'] not in PY_KINDS:
            bad.append((lv['flat'], k, 'kind', q['kind']))
            continue
        tiles = q['tiles']
        shp = [t['shape'] for t in tiles]
        if len(shp) != 4 or len(set(shp)) != 4:
            bad.append((lv['flat'], k, 'tilesDup', shp))
        if q['kind'] == 'combo':
            if q['shape'] not in PY_DECOMP:
                bad.append((lv['flat'], k, 'holeLib', q['shape']))
                continue
            need = PY_DECOMP[q['shape']]
            if not all(s in PY_SLABS for s in shp):
                bad.append((lv['flat'], k, 'slabLib', shp))
            for t in tiles:
                if t['right'] != (t['shape'] in need):
                    bad.append((lv['flat'], k, 'rightFlag', t['shape']))
            if sum(1 for t in tiles if t['right']) != 2:
                bad.append((lv['flat'], k, 'rightN', shp))
            if sorted(t['shape'] for t in tiles if t['right']) != sorted(need):
                bad.append((lv['flat'], k, 'decompMismatch', shp, need))
        else:
            pool = PY_DIR4 if q['kind'] == 'rot' else PY_CHIRAL6
            if q['shape'] not in pool or q['dir'] is None or not (0 <= q['dir'] <= 3):
                bad.append((lv['flat'], k, 'holeLib', q['shape'], q['dir']))
                continue
            if not all(s in pool for s in shp):
                bad.append((lv['flat'], k, 'tilesLib', shp))
            for t in tiles:
                if t['right'] != (t['shape'] == q['shape']) or not (0 <= t['dir'] <= 3):
                    bad.append((lv['flat'], k, 'tileFlag', t))
            rights = [t for t in tiles if t['right']]
            if len(rights) != 1:
                bad.append((lv['flat'], k, 'rightN', shp))
            else:
                off = (q['dir'] - rights[0]['dir']) % 4                   # 偏转 ∈ 1-3（90/180/270）
                if off < 1 or off > 3:
                    bad.append((lv['flat'], k, 'offPre', off))
            if q['kind'] == 'mirror' and PY_MIRROR[q['shape']] not in shp:
                bad.append((lv['flat'], k, 'mirMissing', q['shape'], shp))
        if k > 0:
            prev = lv['quizzes'][k - 1]
            if prev['kind'] == q['kind'] and prev['shape'] == q['shape']:
                bad.append((lv['flat'], k, 'adjacent', q['shape']))
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

        # ---- 2. Python 独立封闭表对账（40 关全题；读取引擎产物，断言全在 Python 表上） ----
        levels_js = page.evaluate(
            'Array.from({length:40}, (_, f) => { const L = genLevel(f); '
            'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ kind: q.kind, shape: q.shape, '
            'dir: q.kind === "combo" ? null : q.dir, tiles: q.tiles.map(t => ({ shape: t.shape, right: t.right, dir: t.dir })) })) }; })')
        bad = []
        gen_dch = set()
        for lv in levels_js:
            bad.extend(audit_level(lv))
            if lv['flat'] >= 20:
                gen_dch.add(lv['dch'])
        check('python-side closed-table parity (40 levels x 5 quizzes)', not bad, bad[:5])
        check('gen levels cover dch 1-4 (seeded family)', gen_dch == {1, 2, 3, 4}, sorted(gen_dch))
        anchor = levels_js[0]['quizzes'][0]
        right_a = next(t for t in anchor['tiles'] if t['right'])
        check('flat0 q0 anchor (rot/triangle/dir1/off1)',
              anchor['kind'] == 'rot' and anchor['shape'] == 'triangle' and anchor['dir'] == 1 and
              (anchor['dir'] - right_a['dir']) % 4 == 1, anchor)

        # ---- 3. SR 钩子语义（分离交互三入口 + Python 独立旋转复算） ----
        page.evaluate('SR.start(10)')
        lv = page.evaluate('() => SR.currentLevel')
        check('SR.start(10) takes effect (ch3 combo)', lv['flat'] == 10 and lv['ch'] == 3 and
              lv['dch'] == 3 and lv['kind'] == 'combo', lv)
        qz = page.evaluate('() => SR.quiz')
        ids_ok = [t['id'] for t in qz['tiles']] == ['w0', 'w1', 'w2', 'w3']
        need_ok = sorted(n['shape'] for n in qz['need']) == sorted(PY_DECOMP[qz['hole']])
        check('SR.quiz contract (kind/hole/need/tiles)',
              qz['kind'] == 'combo' and qz['hole'] in PY_DECOMP and need_ok and ids_ok and
              sum(1 for t in qz['tiles'] if t['right']) == 2 and qz['step'] == 0 and
              qz['miss'] == 0 and qz['sel'] == -1 and qz['placedN'] == 0, qz)
        dis_i = next(i for i, t in enumerate(qz['tiles']) if not t['right'])
        r_d = page.evaluate('i => SR.tapPlace(i)', dis_i)      # 干扰板瓦 → wrong
        page.wait_for_timeout(1300)
        i1 = next(i for i, t in enumerate(qz['tiles']) if t['right'])
        sel1 = page.evaluate('i => SR.tapPiece(i)', i1) == 'sel'
        rot_c = page.evaluate('() => SR.tapRotate()') is False  # combo 无朝向
        r_h = page.evaluate('i => SR.tapPlace(i)', i1)          # 第一块 → half
        used1 = page.evaluate('() => SR.quiz.tiles[%d].used' % i1)
        again = page.evaluate('i => SR.tapPlace(i)', i1) is False  # 已用瓦 → false
        i2 = page.evaluate('() => SR.quiz.tiles.findIndex(t => t.right && !t.used)')
        r_2 = page.evaluate('i => SR.tapPlace(i)', i2)          # 第二块 → right
        check('combo separated taps (wrong/half/used/second)',
              r_d == 'wrong' and sel1 and rot_c and r_h == 'half' and used1 and again and
              r_2 == 'right' and page.evaluate('() => SR.quiz.step') == 1,
              {'distract': r_d, 'half': r_h, 'again': again, 'second': r_2})
        # 旋转复算（flat0 锚点题：Python 算圈数 → 钩子驱动放对）
        page.evaluate('SR.start(0)')
        q0 = page.evaluate('() => SR.quiz')
        ri = next(i for i, t in enumerate(q0['tiles']) if t['right'])
        turns = (q0['need']['dir'] - q0['tiles'][ri]['dir']) % 4   # Python 独立复算
        check('anchor turns python-recomputed', turns == 1, (q0['need'], q0['tiles'][ri], turns))
        page.evaluate('i => SR.tapPiece(i)', ri)
        for _ in range(turns):
            page.evaluate('() => SR.tapRotate()')
        r_anchor = page.evaluate('i => SR.tapPlace(i)', ri)
        check('rot place after python-turns', r_anchor == 'right' and page.evaluate('() => SR.quiz.step') == 1,
              {'turns': turns, 'r': r_anchor})
        # 镜像手性（flat5：镜像瓦转任意次仍 mir）
        page.evaluate('SR.start(5)')
        q5 = page.evaluate('() => SR.quiz')
        mi = next(i for i, t in enumerate(q5['tiles']) if t['shape'] == PY_MIRROR[q5['hole']])
        chir = []
        page.evaluate('i => SR.tapPiece(i)', mi)
        for _ in range(3):
            chir.append(page.evaluate('i => SR.tapPlace(i)', mi))
            page.wait_for_timeout(1300)
            page.evaluate('() => SR.tapRotate()')
        check('mirror chirality (rotation never fixes mirror)', q5['kind'] == 'mirror' and
              all(c == 'mir' for c in chir), chir)

        # ---- 4. 双 viewport 布局 + 截图非空白（verify 页，瓦片卡=主答案 ≥96，旋转钮 ≥72） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 10), (800, 1180, 10),
                           (1280, 800, 17), (800, 1180, 17)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            page.wait_for_timeout(300)
            page.evaluate('SR.start(%d)' % flat)
            page.wait_for_timeout(200)
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const rb = document.getElementById('btn-rotate');
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       scene: [sc.offsetWidth, sc.offsetHeight],
                       rot: [rb.offsetWidth, rb.offsetHeight],
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
                  m['rot'][0] >= 72 and m['rot'][1] >= 72 and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'scene': m['scene'], 'rot': m['rot'],
                   'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 5. 正常模式（非 verify 页）真实主流程：教学（看=旋转一次+放置→帮）→ 真实点击通关 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        tut = ''
        for _ in range(40):                       # watch ≈8s（真实 SPEED=1，含旋转演示）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('SR.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__srDemoR')
        demo_rot = pg2.evaluate('window.__srDemoRot')
        check('normal-mode tutorial watch->help (demo=rotate once + place)',
              tut == 'help' and demo_r == 'right' and demo_rot == 1,
              {'tut': tut, '__srDemoR': demo_r, '__srDemoRot': demo_rot})
        # 真实 pointer 分离交互：点瓦选中 → 点旋转钮×Python复算圈数 → 再点瓦放置
        guard = 0
        while guard < 90:
            guard += 1
            st = pg2.evaluate('() => ({ done: SR.currentLevel.done, quiz: SR.quiz })')
            if st['done'] or not st['quiz']:
                break
            q = st['quiz']
            if q['kind'] == 'combo':
                idx = next((i for i, t in enumerate(q['tiles']) if t['right'] and not t['used']), None)
                turns = 0
            else:
                idx = next((i for i, t in enumerate(q['tiles']) if t['right']), None)
                turns = (q['need']['dir'] - q['tiles'][idx]['dir']) % 4
            if idx is None:
                break
            pg2.click('.card[data-i="%d"]' % idx, timeout=3000)          # ① 选瓦
            pg2.wait_for_timeout(220)
            for _ in range(turns):
                pg2.click('#btn-rotate', timeout=3000)                   # ② 旋转钮×圈数
                pg2.wait_for_timeout(240)
            pg2.click('.card[data-i="%d"]' % idx, timeout=3000)          # ③ 再点瓦放置
            pg2.wait_for_timeout(1500)            # 对→读题 900 + 补洞飞行 430 演出窗节拍
        cel = False
        for _ in range(10):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('SR.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3200)                # celebrate 2.3s + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_shaperoof")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('shaperoof', {}).get('tutSeen')
              and st1.get('stars') == 3,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('shaperoof'), 'stars10': st1.get('stars')})
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
