# -*- coding: utf-8 -*-
"""habitat _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r4 六族题型契约版（SPEC-BATCH25 §0.60 r4 版本块文字口径）：
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭表对账（从 SPEC r4 文字重列 24 动物习性标签表/食物 6/链 4/特征 4/冬眠集/
   交集对 5，不引用页面 ANIMALS/FOOD/CHAINS/STRUCTS/CONDS）：40 关全题按 kind 独立复算
   （home=表值+ch1 常见池+ch4 近对在场 / feed=food 表+candy 在场+dch1 三题互异 /
   chain=链位+干扰非链成员+up 干扰 food≠base / hib=冬眠集两向 / struct=能力 4 全集 /
   dual=四分类双干扰在场）+ dch3 五对全覆盖与答案互异
3. HB 钩子语义：HB.start(10) 外部切关生效（dch3 dual）；quiz.kind/animal/conds 契约；
   flat1(<3 必播通道) chain 题点错反馈=hab_w_chain（tapScene 下标语义）
4. 双 viewport(1280x800/800x1180) home/dual：场景卡 ≥96、题面卡 ≥64、overflowX≤0、截图像素非空白
5. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮）→ 真实 pointer
   点场景通关（判对演出窗 5400ms 节拍）→ celebrate → 写档 stars=3 + tutSeen + v1.0
6. 正常模式错选路径：home 题反馈 clip key=所点环境（hab_w_<env>，voice.play spy 断言）
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# ---------- Python 独立封闭表（SPEC-BATCH25 §0.60 r4 版本块文字逐条转译，禁抄页面表） ----------
PY_ENV7 = ['forest', 'grassland', 'ocean', 'desert', 'pond', 'sky', 'farm']
PY_NEAR = {'pond': 'ocean', 'ocean': 'pond',
           'grassland': 'desert', 'desert': 'grassland',
           'forest': 'farm', 'farm': 'forest'}
PY_COMMON = ['fish', 'frog', 'bird', 'hen', 'pig', 'rabbit']
PY_COMMON_ENVS = ['pond', 'sky', 'farm', 'forest']
# id: (home, diet, hib, swim, egg, fly, food)  food=None → 非 feed 题面
PY_A = {
    'fish': ('pond', 'carn', 0, 1, 1, 0, None), 'frog': ('pond', 'carn', 1, 1, 1, 0, 'bug'),
    'bird': ('sky', 'carn', 0, 0, 1, 1, 'bug'), 'hen': ('farm', 'omni', 0, 0, 1, 0, None),
    'pig': ('farm', 'omni', 0, 0, 0, 0, None), 'rabbit': ('forest', 'herb', 0, 0, 0, 0, 'grass'),
    'lion': ('grassland', 'carn', 0, 0, 0, 0, 'meat'), 'elephant': ('grassland', 'herb', 0, 0, 0, 0, 'grass'),
    'zebra': ('grassland', 'herb', 0, 0, 0, 0, 'grass'), 'monkey': ('forest', 'omni', 0, 0, 0, 0, 'fruit'),
    'woodpecker': ('forest', 'carn', 0, 0, 1, 1, 'bug'), 'dolphin': ('ocean', 'carn', 0, 1, 0, 0, 'fish'),
    'whale': ('ocean', 'carn', 0, 1, 0, 0, 'fish'), 'camel': ('desert', 'herb', 0, 0, 0, 0, 'grass'),
    'scorpion': ('desert', 'carn', 0, 0, 1, 0, 'bug'), 'bear': ('forest', 'omni', 1, 0, 0, 0, 'fish'),
    'snake': ('grassland', 'carn', 1, 0, 1, 0, None), 'turtle': ('pond', 'omni', 1, 1, 1, 0, None),
    'fox': ('forest', 'carn', 0, 0, 0, 0, 'meat'), 'eagle': ('sky', 'carn', 0, 0, 1, 1, 'meat'),
    'duck': ('pond', 'omni', 0, 1, 1, 1, None), 'squirrel': ('forest', 'herb', 0, 0, 0, 0, 'fruit'),
    'cow': ('farm', 'herb', 0, 0, 0, 0, 'grass'), 'tiger': ('forest', 'carn', 0, 0, 0, 0, 'meat'),
}
PY_FOOD6 = ['grass', 'meat', 'bug', 'fish', 'fruit', 'candy']
PY_CHAINS = {'c1': ('grass', 'rabbit', 'eagle'), 'c2': ('grass', 'zebra', 'lion'),
             'c3': ('bug', 'frog', 'snake'), 'c4': ('fruit', 'monkey', 'tiger')}
PY_HIB = {'bear', 'snake', 'turtle', 'frog'}
PY_ABILITY4 = ['swim', 'fly', 'run', 'dig']
PY_STRUCTS = {'web': 'swim', 'wing': 'fly', 'legs': 'run', 'claws': 'dig'}
PY_DUALS = {'swim_hib': ('swim', 'hib'), 'water_nowegg': ('water', 'nowegg'),
            'hib_egg': ('hib', 'egg'), 'swim_egg': ('swim', 'egg'), 'farm_herb': ('farm', 'herb')}


def py_t(cond, a):
    """交集谓词独立实现（禁引用页面 CONDS）"""
    home, diet, hib, swim, egg, fly, food = PY_A[a]
    return {'swim': swim, 'hib': hib, 'egg': egg, 'nowegg': 1 - egg,
            'water': 1 if home in ('pond', 'ocean') else 0,
            'farm': 1 if home == 'farm' else 0,
            'herb': 1 if diet == 'herb' else 0}[cond]


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

        # ---- 2. Python 独立封闭表对账（40 关全题，按六族 kind 独立复算） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'kind: q.kind, animal: q.animal, home: q.home, chain: q.chain, '
                                  'dir: q.dir, feat: q.feat, pair: q.pair, '
                                  'scenes: q.scenes.map(s => s.kind) })) }; })')
        bad = []
        for lv in levels_js:
            dch3_pairs, dch3_answers, dch1_foods = set(), [], []
            for k, q in enumerate(lv['quizzes']):
                kinds = q['scenes']
                flat = lv['flat']
                if len(kinds) != 4 or len(set(kinds)) != 4:
                    bad.append((flat, k, 'scenesDup', kinds))
                if sum(1 for kk in kinds if kk == q['home']) != 1:
                    bad.append((flat, k, 'homeN', kinds))
                kd = q['kind']
                if kd == 'home':
                    if q['animal'] not in PY_A or q['home'] != PY_A[q['animal']][0]:
                        bad.append((flat, k, 'home-table', q['animal'], q['home']))
                    if any(kk not in PY_ENV7 for kk in kinds):
                        bad.append((flat, k, 'home-lib', kinds))
                    if lv['dch'] == 1:
                        if q['animal'] not in PY_COMMON or sorted(kinds) != sorted(PY_COMMON_ENVS):
                            bad.append((flat, k, 'home-ch1', q['animal'], kinds))
                    else:
                        near = PY_NEAR.get(q['home'])
                        if near and near not in kinds:
                            bad.append((flat, k, 'home-near', q['home'], kinds))
                elif kd == 'feed':
                    if PY_A[q['animal']][6] is None or q['home'] != PY_A[q['animal']][6]:
                        bad.append((flat, k, 'feed-ans', q['animal'], q['home']))
                    if any(kk not in PY_FOOD6 for kk in kinds) or 'candy' not in kinds:
                        bad.append((flat, k, 'feed-lib', kinds))
                    if lv['dch'] == 1:
                        dch1_foods.append(q['home'])
                elif kd == 'chain':
                    c = PY_CHAINS.get(q['chain'])
                    if not c:
                        bad.append((flat, k, 'chain-lib', q['chain']))
                    else:
                        if q['home'] != (c[2] if q['dir'] == 'up' else c[1]):
                            bad.append((flat, k, 'chain-ans', q['chain'], q['dir'], q['home']))
                        for v in kinds:
                            if v != q['home'] and v in (c[1], c[2]):
                                bad.append((flat, k, 'chain-member', v))
                            if q['dir'] == 'up' and v != q['home'] and \
                               PY_A.get(v, ('?',) * 7)[6] == c[0]:
                                bad.append((flat, k, 'chain-base', v))
                        if any(v not in PY_A for v in kinds):
                            bad.append((flat, k, 'chain-lib2', kinds))
                elif kd == 'hib':
                    in_hib = q['home'] in PY_HIB
                    others_ok = all((v in PY_HIB) != in_hib for v in kinds if v != q['home'])
                    want = (q['dir'] == 'sleep')
                    if in_hib != want or not others_ok:
                        bad.append((flat, k, 'hib-set', q['dir'], q['home'], kinds))
                elif kd == 'struct':
                    if PY_STRUCTS.get(q['feat']) != q['home'] or sorted(kinds) != sorted(PY_ABILITY4):
                        bad.append((flat, k, 'struct-set', q['feat'], q['home'], kinds))
                else:  # dual
                    dd = PY_DUALS.get(q['pair'])
                    if not dd:
                        bad.append((flat, k, 'dual-lib', q['pair']))
                    else:
                        both = [v for v in kinds if py_t(dd[0], v) and py_t(dd[1], v)]
                        only_a = [v for v in kinds if py_t(dd[0], v) and not py_t(dd[1], v)]
                        only_b = [v for v in kinds if not py_t(dd[0], v) and py_t(dd[1], v)]
                        never = [v for v in kinds if not py_t(dd[0], v) and not py_t(dd[1], v)]
                        if len(both) != 1 or both[0] != q['home'] or \
                           not only_a or not only_b or not never:
                            bad.append((flat, k, 'dual-set', q['pair'], kinds))
                    if lv['dch'] == 3:
                        dch3_pairs.add(q['pair'])
                        dch3_answers.append(q['home'])
            if lv['dch'] == 1 and len(set(dch1_foods)) != 3:
                bad.append((lv['flat'], 'dch1-foods', dch1_foods))
            if lv['dch'] == 3 and (len(dch3_pairs) != 5 or len(set(dch3_answers)) != 5):
                bad.append((lv['flat'], 'dch3-pairs/answers', sorted(dch3_pairs), dch3_answers))
        check('python-side closed-table parity (40 levels x 5 quizzes, by kind)', not bad, bad[:5])
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor fish->pond (home)',
              anchor['kind'] == 'home' and anchor['animal'] == 'fish' and anchor['home'] == 'pond', anchor)

        # ---- 3. HB 钩子语义（外部切关 / dual 题契约字段 / flat1<3 必播通道错反馈绑定题型） ----
        page.evaluate('HB.start(10)')
        lv = page.evaluate('() => HB.currentLevel')
        check('HB.start(10) takes effect (ch3 dual)', lv['flat'] == 10 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        qz = page.evaluate('() => HB.quiz')
        ids_ok = [s['id'] for s in qz['scenes']] == ['s0', 's1', 's2', 's3']
        kinds = [s['kind'] for s in qz['scenes']]
        dd = PY_DUALS.get((qz.get('conds') or {}).get('a', '') + '_' + (qz.get('conds') or {}).get('b', ''))
        both = [v for v in kinds if dd and py_t(dd[0], v) and py_t(dd[1], v)] if dd else []
        check('HB.quiz dual contract (kind/animal=null/conds/scenes id+kind)',
              qz['kind'] == 'dual' and qz['animal'] is None and qz['step'] == 0 and qz['miss'] == 0 and
              len(qz['scenes']) == 4 and ids_ok and len(set(kinds)) == 4 and
              dd is not None and len(both) == 1 and both[0] == qz['home'], qz)
        # 错反馈绑定题型（flat1 <3 每错必播，无 10s 节流竞态）：直驱 q4=chain
        page.evaluate('HB.start(1)')
        page.evaluate('cur.step = 4; renderQuiz();')
        qch = page.evaluate('() => HB.quiz')
        wrong_i = next(i for i, s in enumerate(qch['scenes']) if s['kind'] != qch['home'])
        page.evaluate('i => HB.tapScene(i)', wrong_i)          # fire-and-forget（1000ms 窗）
        page.wait_for_timeout(1300)
        after = page.evaluate('() => ({ miss: HB.quiz.miss, lvlMiss: HB.currentLevel.miss, step: HB.quiz.step })')
        vkey = page.evaluate('window.__lastVoiceKey')
        check('tapScene(index) semantics + chain wrong-feedback = hab_w_chain',
              qch['kind'] == 'chain' and after['miss'] == 1 and after['lvlMiss'] == 1 and
              after['step'] == 4 and vkey == 'hab_w_chain',
              {'kind': qch['kind'], 'after': after, 'key': vkey})

        # ---- 4. 双 viewport 布局 + 截图非空白（verify 页，场景卡=主答案 ≥96；home/dual 双题型）
        #     先等 runVerify 跑完（title=VERIFY PASS）再 HB.start 量测——防 runVerify 异步单元
        #     （④b cur.step=4 / ⑩ simView）在量测瞬间覆盖渲染（实测竞态：flat0 量到 chain 题面） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 10), (800, 1180, 10)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.goto(URL + '?verify=1')
            for _ in range(120):
                if page.title().startswith('VERIFY'):
                    break
                page.wait_for_timeout(500)
            page.evaluate('HB.start(%d)' % flat)
            page.wait_for_timeout(200)
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       scene: [sc.offsetWidth, sc.offsetHeight],
                       kind: sc.dataset.kind,
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
            check('layout %dx%d flat%d (%s)' % (w, h, flat, m.get('kind')),
                  m['minWH'] >= 96 and m['scene'][0] >= 64 and m['scene'][1] >= 64 and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'scene': m['scene'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 5. 正常模式（非 verify 页）真实主流程：教学（看→帮）→ 真实点卡通关 → 写档 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        # 先装 voice.play spy（错选反馈 clip 断言用；原调用透传不破坏行为）
        pg2.evaluate('''() => {
          const orig = KIDS.voice.play.bind(KIDS.voice);
          window.__vkLog = [];
          KIDS.voice.play = function (k, t) { window.__vkLog.push(k || null); return orig(k, t); };
        }''')
        tut = ''
        for _ in range(40):                       # watch 链 ≈9.7s（真实 SPEED=1：900+2544+320+5400+500）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('HB.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__hbDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__hbDemoR': demo_r})
        # 错选一次：真实 pointer 点一张错误场景卡 → home 题反馈 clip=所点环境（机制沿 v1）
        qz2 = pg2.evaluate('() => HB.quiz')
        wi = next(i for i, s in enumerate(qz2['scenes']) if s['kind'] != qz2['home'])
        wk = qz2['scenes'][wi]['kind']
        log_len0 = pg2.evaluate('window.__vkLog.length')      # 基线（错选后新增段判据）
        pg2.click('.card[data-i="%d"]' % wi, timeout=3000)
        pg2.wait_for_timeout(1300)                # 1000ms 防重入窗
        log1 = pg2.evaluate('window.__vkLog')
        new_seg = log1[log_len0:]                 # 错选后新增的语音调用（turn 后 2100ms 读题 TTS 可能插 None）
        seg_clips = [k for k in new_seg if k]     # 过滤读题 None（play 掐断读题、错反馈完整播——时序竞态非缺陷）
        st_after_wrong = pg2.evaluate('() => ({ miss: HB.quiz.miss, step: HB.quiz.step })')
        check('normal-mode wrong tap feedback clip = tapped env',
              qz2['kind'] == 'home' and seg_clips and seg_clips[0] == 'hab_w_' + wk and
              st_after_wrong['miss'] == 1 and st_after_wrong['step'] == 0,
              {'tapped': wk, 'newSeg': new_seg, 'after': st_after_wrong})
        # 真实 pointer 逐题点应选场景卡（help 首点即放手 solo；判对演出窗 1800+3600=5400ms 节拍）
        guard = 0
        while guard < 80:
            guard += 1
            st = pg2.evaluate('() => ({ done: HB.currentLevel.done, quiz: HB.quiz })')
            if st['done'] or not st['quiz']:
                break
            idx = next((i for i, s in enumerate(st['quiz']['scenes'])
                        if s['kind'] == st['quiz']['home']), None)
            if idx is None:
                break
            pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
            pg2.wait_for_timeout(5900)            # 判对演出窗 5400ms + 读题余量（真实 SPEED=1 节拍）
        cel = False
        for _ in range(10):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('HB.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3400)                # celebrate 2.3s+320 + 补窗 400 + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_habitat")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save (2 stars: 1 wrong + 4 right)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('habitat', {}).get('tutSeen')
              and st1.get('stars') == 2,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('habitat'), 'stars10': st1.get('stars')})
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
