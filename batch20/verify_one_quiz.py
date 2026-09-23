# -*- coding: utf-8 -*-
"""quiz 独立复验（SPEC-BATCH20 §3+§0.45 分源·升档版）——断言从 SPEC 推导，禁从实现行为归纳
Q1 题库独立提取对账（Python 正则提取 game-data.js 的 QZ_BANK——禁手抄）：恰 160 题、四域分布
   32/40/40/48（bio 动植物/weather 自然/measure 测量/reason 因果）、每题 ans 索引合法+
   干扰文本互异且 ≠ 正确项+ans 档均衡（各 ≥30）
Q1b 干扰合理性结构层：选项∉题面子串（不泄题）/≥2 个干扰长度 ≥0.4×正确项长（防敷衍短干扰，
   1 字单位类合法）/正确项非恒最长（严格最长占比 ≤65%，防"最长即答案"应试捷径）
Q1c 编译新鲜度：_src 与构建产物 index.html 双侧提取题库 JSON 全等（防 stale build）
Q2 关卡全量对账（40 关×5 题）：qid 在库 / text==库.q / opts 文本集==库.opts 集 / opts[answer].v
   ==库正确项 / cat==库.cat / domain==独立域映射字面量（cat1=bio/2=weather/3=measure/4=reason）
Q3 章映射（静态关 flat0-19：cat==flat//5+1；生成关 flat≥20 四域混抽 qid 互异）
Q4 确定性（flat 0/12/27/39 双读）/ Q5 同关 5 题 qid 互异
Q6 引擎直驱：错选=miss 恰一次+防重入窗内拒绝+重选对推进（零惩罚）
Q7 wrongBank 隔日复现 E2E（真实页 localStorage 预置存档）：serveDay=昨天+bank=[{id,ok:1}] →
   开机首关注入该题置前（served=1）/ 答错 ok 归 0 / 答对 ok+1 / 同日再进不注入 / 存档兼容字段
纪律：tapOpt async——evaluate 侧 await promise（b19 实锤）；先等 title=VERIFY PASS（b17）。
"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'quiz', 'index.html').replace('\\', '/') + '?verify=1'
REAL = 'file:///' + os.path.join(BASE, 'quiz', 'index.html').replace('\\', '/')
VDOM = {1: 'bio', 2: 'weather', 3: 'measure', 4: 'reason'}   # 独立域映射字面量（SPEC 升档定稿，禁用运行时 DOMAINS）

def parse_bank(text):
    m = re.search(r'const QZ_BANK = (\[[\s\S]*?\]);', text)
    assert m, 'QZ_BANK 提取失败'
    return json.loads(m.group(1))                            # 纯 JSON 字面量（§0.45，数组内禁注释）

# ---- Q1 题库独立提取（分源：Python 正则+json，禁复用游戏侧解析）----
BANK = parse_bank(open(os.path.join(BASE, 'quiz', '_src', 'game-data.js'), encoding='utf-8').read())
results = []

def chk(name, ok, note=''):
    results.append((name, bool(ok), note))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note))

cats, ansd, qseen, bank_fail, leak_fail, ratio_fail = {}, {}, {}, [], [], []
longest = 0
for i, t in enumerate(BANK):
    cats[t['cat']] = cats.get(t['cat'], 0) + 1
    ansd[t['ans']] = ansd.get(t['ans'], 0) + 1
    qseen[t['q']] = qseen.get(t['q'], 0) + 1
    corr = t['opts'][t['ans']]
    dis = [o for j, o in enumerate(t['opts']) if j != t['ans']]
    if not (0 <= t['ans'] < len(t['opts'])) or len(t['opts']) != 4:
        bank_fail.append((i, 'ans 越界/opts 数'))
    if any(d == corr for d in dis) or len(set(t['opts'])) != 4 or any(not o for o in t['opts']):
        bank_fail.append((i, '干扰与正确重复/空串'))
    if len(t['ic']) != 4 or any(not re.fullmatch(r'[a-z][a-z0-9_]*', k) for k in t['ic']):
        bank_fail.append((i, 'ic 不平行/键形非法'))
    th = max(1, int(0.4 * len(corr)))
    if sum(1 for d in dis if len(d) >= th) < 2:
        ratio_fail.append((i, corr, dis))
    if any(o in t['q'] for o in t['opts']):
        leak_fail.append((i, next(o for o in t['opts'] if o in t['q'])[:8]))
    if len(corr) > max(len(d) for d in dis):
        longest += 1
chk('Q1a 题库恰 160 题+四域 32/40/40/48+ans 档均衡', len(BANK) == 160 and cats == {1: 32, 2: 40, 3: 40, 4: 48}
    and min(ansd.values()) >= 30 and sum(qseen.values()) == len(qseen) == 160,
    'n=%d cats=%s ans=%s' % (len(BANK), cats, ansd))
chk('Q1b1 每题 4 选互异+ans 合法+ic 平行', not bank_fail, str(bank_fail[:3]))
chk('Q1b2 干扰合理性结构层（长度/不恒最长）', not ratio_fail and longest <= 104,
    'ratio_fail=%s longest=%d/160' % (ratio_fail[:2], longest))
chk('Q1b3 题干不泄题（选项∉题面）', not leak_fail, str(leak_fail[:3]))

# ---- Q1c 编译新鲜度：_src 与 index.html 双侧提取全等 ----
built = parse_bank(open(os.path.join(BASE, 'quiz', 'index.html'), encoding='utf-8').read())
chk('Q1c 构建产物题库全等（防 stale build）', built == BANK, 'built_n=%d' % len(built))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    chk('Q0 selftest 全绿+0 pageerror', 'VERIFY PASS' in pg.title() and not errs, pg.title())

    def read_quiz():
        return pg.evaluate("() => QZ.quiz")

    def level_state():
        return pg.evaluate("() => QZ.currentLevel ? {done:QZ.currentLevel.done, step:QZ.currentLevel.step, locked:QZ.currentLevel.locked, served:QZ.currentLevel.served} : null")

    def tap(i):
        return pg.evaluate("(i) => (async () => { try { const r = await QZ.tapOpt(i); return r !== false && r != null } catch(e){ return false } })()", i)

    def wait_playable():
        for _ in range(300):
            q = read_quiz()
            st = level_state()
            if q and st and not st['locked']:
                return q
            pg.wait_for_timeout(30)
        return None

    # ---- Q2+Q3+Q5 全量：40 关 × 5 题（含 domain 分源对账）----
    all_levels = {}
    map_fail, dupq_fail, chmap_fail = [], [], []
    for flat in range(40):
        pg.evaluate("(f) => QZ.start(f)", flat)
        qids = []
        for k in range(5):
            q = wait_playable()
            if not q:
                chk('Q-start flat%d q%d' % (flat, k), False)
                break
            qids.append(q['qid'])
            t = BANK[q['qid']] if 0 <= q['qid'] < len(BANK) else None
            if not t:
                map_fail.append((flat, k, 'qid 越界 %s' % q['qid']))
            else:
                corr = t['opts'][t['ans']]
                got = q['opts'][q['answer']]['v'] if 0 <= q['answer'] < len(q['opts']) else None
                if q['text'] != t['q'] or got != corr or sorted(o['v'] for o in q['opts']) != sorted(t['opts']):
                    map_fail.append((flat, k, q['qid'], 'text/answer/opts 不符'))
                if q.get('cat') != t['cat']:
                    map_fail.append((flat, k, 'cat 不符'))
                if q.get('domain') != VDOM[t['cat']]:
                    map_fail.append((flat, k, 'domain 不符 %s' % q.get('domain')))
                if len(q['opts']) != 4:
                    map_fail.append((flat, k, 'opts=%d' % len(q['opts'])))
                if flat < 20 and t['cat'] != flat // 5 + 1:
                    chmap_fail.append((flat, k, t['cat']))
            if k < 4:
                if not tap(q['answer']):
                    chk('Q-推进 flat%d q%d 选卡失败' % (flat, k), False)
                    break
                adv = False
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        adv = True
                        break
                    pg.wait_for_timeout(30)
                if not adv:
                    chk('Q-推进 flat%d q%d 未换题' % (flat, k), False)
                    break
        if len(set(qids)) != 5:
            dupq_fail.append((flat, qids))
        all_levels[flat] = qids
    chk('Q2 关卡对账（200 题：qid/文本/answer/选项集/domain）', not map_fail and len(all_levels) == 40, str(map_fail[:3]))
    chk('Q3 章映射（静态关 cat==章号）', not chmap_fail, str(chmap_fail[:3]))
    chk('Q5 同关 5 题 qid 互异（40 关）', not dupq_fail, str(dupq_fail[:3]))

    # ---- Q4 确定性：抽 4 flat 双读 ----
    diff = []
    for flat in (0, 12, 27, 39):
        pg.evaluate("(f) => QZ.start(f)", flat)
        qids2 = []
        for k in range(5):
            q = wait_playable()
            if not q:
                diff.append((flat, k, '不可玩'))
                break
            qids2.append((q['qid'], q['answer'], tuple(o['v'] for o in q['opts'])))
            if k < 4:
                tap(q['answer'])
                for _ in range(300):
                    st = level_state()
                    if st and st['step'] == k + 1:
                        break
                    pg.wait_for_timeout(30)
        if [x[0] for x in qids2] != all_levels.get(flat, []):
            diff.append((flat, '双读不一致'))
    chk('Q4 确定性（flat 0/12/27/39 双读 qid 序一致）', not diff, str(diff[:3]))

    # ---- Q6 引擎直驱：错选 → miss 恰一次 + 窗内拒绝 + 重选推进 ----
    pg.evaluate("(f) => QZ.start(f)", 0)
    q0 = wait_playable()
    wrong_i = next((i for i in range(len(q0['opts'])) if i != q0['answer']), None)
    ok6, notes6 = True, []
    if wrong_i is not None:
        pg.evaluate("(i) => (async () => { await QZ.tapOpt(i) })()", wrong_i)   # await 完成=错分支+窗（120ms）全走完
        q1 = read_quiz()
        if not (q1 and q1['miss'] == 1):
            ok6 = False; notes6.append('miss!=1 got %s' % (q1 and q1['miss']))
        adv = False
        for _ in range(60):
            st = level_state()
            if st and not st['locked']:
                adv = True
                break
            pg.wait_for_timeout(50)
        if not adv:
            ok6 = False; notes6.append('防重入窗未解锁')
        elif tap(q0['answer']):
            adv2 = False
            for _ in range(300):
                st = level_state()
                if st and st['step'] == 1:
                    adv2 = True
                    break
                pg.wait_for_timeout(30)
            if not adv2:
                ok6 = False; notes6.append('重选后未推进')
        else:
            ok6 = False; notes6.append('重选被拒')
    chk('Q6 错选=miss 恰一次+零惩罚重选推进', ok6, ';'.join(notes6))
    chk('Q-end verify 页 0 pageerror', not errs, str(errs[:2]))

    # ---- Q7 wrongBank 隔日复现 E2E（真实页+localStorage 预置存档，独立浏览器上下文）----
    ctx = b.new_context()
    pg2 = ctx.new_page()
    errs2 = []
    pg2.on('pageerror', lambda e: errs2.append(str(e)))
    preset = {'v': '1.0', 'game': 'quiz', 'firstDay': '2026-09-01', 'lastDay': '2026-09-01',
              'levels': {'1-0': 3}, 'dailyMin': {}, 'settings': {'sound': True, 'tts': True, 'vol': 0.6},
              'restTip': {'day': '', 'shown': 0},
              'quiz': {'tutSeen': True, 'wrongBank': [{'id': 7, 'ok': 1}], 'serveDay': '2000-01-01'}}
    pg2.add_init_script("try { localStorage.setItem('kidsgame_quiz', JSON.stringify(%s)) } catch(e){}" % json.dumps(preset))
    pg2.goto(REAL)
    q7 = None
    for _ in range(200):
        q7 = pg2.evaluate("() => QZ.quiz")
        st = pg2.evaluate("() => QZ.currentLevel ? QZ.currentLevel.locked : true")
        if q7 and not st:
            break
        pg2.wait_for_timeout(50)
    ok7, notes7 = True, []
    if not q7:
        ok7 = False; notes7.append('真实页未起')
    else:
        if not (q7['qid'] == 7 and pg2.evaluate("() => QZ.served") == 1):
            ok7 = False; notes7.append('注入 qid=%s served=%s' % (q7['qid'], pg2.evaluate("() => QZ.served")))
        wi = next((i for i in range(len(q7['opts'])) if i != q7['answer']), None)
        pg2.evaluate("(i) => (async () => { await QZ.tapOpt(i) })()", wi)       # 答错 → ok 归 0
        for _ in range(100):
            st = pg2.evaluate("() => QZ.currentLevel ? QZ.currentLevel.locked : true")
            if not st:
                break
            pg2.wait_for_timeout(50)
        bank0 = pg2.evaluate("() => QZ.bank")
        if bank0 != [{'id': 7, 'ok': 0}]:
            ok7 = False; notes7.append('mark=%s' % bank0)
        pg2.evaluate("(i) => (async () => { await QZ.tapOpt(i) })()", q7['answer'])   # 答对 → ok+1
        bank1 = pg2.evaluate("() => QZ.bank")
        if bank1 != [{'id': 7, 'ok': 1}]:
            ok7 = False; notes7.append('pass=%s' % bank1)
        pg2.evaluate("(f) => QZ.start(f)", 2)                                  # 同日再进 → 不再注入
        for _ in range(100):
            st = pg2.evaluate("() => QZ.currentLevel ? QZ.currentLevel.locked : true")
            if not st:
                break
            pg2.wait_for_timeout(50)
        sv_now = json.loads(pg2.evaluate("() => localStorage.getItem('kidsgame_quiz')"))
        if pg2.evaluate("() => QZ.served") != 0:
            ok7 = False; notes7.append('同日重复注入')
        if not (isinstance(sv_now.get('quiz'), dict) and len(sv_now['quiz'].get('serveDay', '')) == 10
                and sv_now['quiz'].get('wrongBank') == [{'id': 7, 'ok': 1}]):
            ok7 = False; notes7.append('存档落账=%s' % sv_now.get('quiz'))
        # 真实 DOM 点击路径：stage pointerdown → .opt 卡 → uiTapOpt（非钩子直调）
        qn = None
        for _ in range(100):
            qn = pg2.evaluate("() => QZ.quiz")
            st = pg2.evaluate("() => QZ.currentLevel ? QZ.currentLevel.locked : true")
            if qn and not st:
                break
            pg2.wait_for_timeout(50)
        if not qn:
            ok7 = False; notes7.append('真实点击前不可玩')
        else:
            wj = next((i for i in range(len(qn['opts'])) if i != qn['answer']), None)
            try:
                pg2.click('.opt[data-i="%d"]' % wj, timeout=3000)
                for _ in range(100):
                    q2 = pg2.evaluate("() => QZ.quiz")
                    if q2 and q2['step'] == qn['step'] and q2['miss'] == 1:
                        break
                    pg2.wait_for_timeout(50)
                else:
                    ok7 = False; notes7.append('真实点击未记 miss')
            except Exception as ex:
                ok7 = False; notes7.append('click=%s' % str(ex)[:60])
    if errs2:
        ok7 = False; notes7.append('pageerror:%s' % errs2[:1])
    chk('Q7 wrongBank 隔日复现 E2E（注入/归零/进位/日闸/落账）', ok7, ';'.join(notes7))
    ctx.close()
    b.close()

fails = [r for r in results if not r[1]]
print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
sys.exit(1 if fails else 0)
