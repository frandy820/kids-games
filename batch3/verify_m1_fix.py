# -*- coding: utf-8 -*-
"""M1 修复验证：flat 20（生成关首关）通关后写档键='5-0' 且推进 flat 21（不软锁）。
预置存档：flat 0..19 全通（键 1-0..4-4）+ bonus 无需（用 startLevel 直驱 flat20 后真实通关）。
另验 M2：ch4 两拼题 j+军 正确答案=ün（运行时 quiz 断言）。
独立 chromium.launch() 无头。
"""
import datetime, json, sys
from playwright.sync_api import sync_playwright

today = datetime.date.today().strftime('%Y-%m-%d')
fails = []

def rec(name, ok, info=''):
    print(('PASS' if ok else 'FAIL'), name, info)
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---- M1: math flat20 软锁修复 ----
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    levels = {}
    for flat in range(20):
        levels['%d-%d' % (flat // 5 + 1, flat % 5)] = {'stars': 3, 'plays': 1}
    import datetime as _dt
    d3 = (_dt.date.today() - _dt.timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex=3 → 基数封顶 12
    save = {'v': '1.0', 'game': 'math', 'firstDay': d3, 'lastDay': today,
            'levels': levels, 'dailyMin': {}, 'settings': {'sound': False, 'tts': False, 'vol': 0.3},
            'restTip': {'day': '', 'shown': 0}, 'bonus': {today: 15}}   # limit=12+15=27 含 flat20-24
    URL = 'file:///F:/claudecode/projects/active/kids-games/batch3/math/index.html'
    pg.goto(URL)
    pg.evaluate("s => localStorage.setItem('kidsgame_math', s)", json.dumps(save))
    pg.goto(URL)   # reload 生效
    pg.wait_for_timeout(1600)
    cur = pg.evaluate("() => window.MATH.currentLevel")
    rec('m1-start-flat20', cur and cur.get('flat') == 20, json.dumps(cur, ensure_ascii=True)[:100])
    # 真实点完 5 题（answerIdx 驱动）
    import time
    t0 = time.time()
    stall = 0
    while time.time() - t0 < 120:
        if pg.evaluate("() => !!document.querySelector('.k-dayend')"): break   # 5 个生成关全通=日完弹层（M1 修复生效的完整链路）
        q = pg.evaluate("() => window.MATH.quiz")
        if not q:
            pg.wait_for_timeout(800); continue
        try:
            pg.locator('button.ans').nth(q['answerIdx']).click(delay=25, timeout=3000)
            stall = 0
        except Exception:
            stall += 1
            if stall > 8: break
            pg.wait_for_timeout(1500); continue    # celebrate/章末遮罩期，等它收起再点
        pg.wait_for_timeout(420)
    pg.wait_for_timeout(2600)   # celebrate 1.8s 后 pass+推进
    after = pg.evaluate("""() => {
        const sv = JSON.parse(localStorage.getItem('kidsgame_math'));
        const gens = ['5-0','5-1','5-2','5-3','5-4'].filter(k => sv.levels[k]);
        return { key20: !!(sv.levels && sv.levels['5-0']), genKeys: gens, dayend: !!document.querySelector('.k-dayend'), cur: window.MATH.currentLevel };
    }""")
    rec('m1-key-5-0-written', after['key20'], json.dumps(after, ensure_ascii=True)[:160])
    curf = (after['cur'] or {}).get('flat', -1)
    rec('m1-gen-chain-complete', len(after['genKeys']) == 5 and curf == 25, 'genKeys=%s curFlat=%s' % (after['genKeys'], curf))
    pg.close()

    # ---- M2: pinyin jun 韵母=ün（运行时关卡扫描）----
    pg = b.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto('file:///F:/claudecode/projects/active/kids-games/batch3/pinyin/index.html')
    pg.wait_for_timeout(1500)
    r = pg.evaluate("""() => {
        const out = { junQ: null, lunQ: null };
        for (let flat = 0; flat < 60; flat++) {
            makeLevel(flat).questions.forEach(q => {
                if (q.type !== 'pin') return;
                if (q.syl === 'jun' && !out.junQ) out.junQ = { flat: flat, ym: q.ym, items: q.items, ansIdx: q.answer };
                if (q.syl === 'lun' && !out.lunQ) out.lunQ = { flat: flat, ym: q.ym, items: q.items, ansIdx: q.answer };
            });
        }
        return out;
    }""")
    j = r.get('junQ') or {}
    jok = j.get('ym') == 'ün' and j.get('items', [None])[j.get('ansIdx', -1)] == 'ün'
    rec('m2-jun-answer-ün', jok, json.dumps(j, ensure_ascii=True)[:130])
    l = r.get('lunQ') or {}
    lok = l.get('ym') == 'un' and l.get('items', [None])[l.get('ansIdx', -1)] == 'un'
    rec('m2-lun-answer-un', lok, json.dumps(l, ensure_ascii=True)[:130])
    pg.close()
    b.close()

print('RESULT', 'PASS' if not fails else 'FAIL %s' % fails)
sys.exit(0 if not fails else 1)
