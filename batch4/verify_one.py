# -*- coding: utf-8 -*-
"""batch3 通用单款复验（batch-verify 口径）。用法：
python verify_one.py <game> <hook> <btn_sel> <ans_mode> [shots_label]
  ans_mode: idx   = quiz.answer 直接是按钮索引
            items = quiz.answer 是值，按钮按 items 顺序渲染，idx=items.index(answer)
指标：verify=1 / 真实点击通关 / 双viewport / 离线 / 截图 / 钩子
独立 chromium.launch() 无头；不 connect/不杀任何浏览器。
"""
import json, re, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

game, HOOK, BTN, ANS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
BASE = Path('F:/claudecode/projects/active/kids-games/batch4')
URL = 'file:///' + str(BASE / game / 'index.html').replace('\\', '/')
SHOTS = BASE / 'shots'; SHOTS.mkdir(exist_ok=True)
results = []

def rec(name, ok, info=''):
    results.append({'name': name, 'ok': bool(ok), 'info': str(info)[:200]})
    print(('PASS' if ok else 'FAIL'), name, info)

with sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(URL + '?verify=1')
    pg.wait_for_timeout(3500)
    title = pg.title()
    rec('verify-title', title.startswith('VERIFY PASS'), title)
    try:
        vj = json.loads(pg.locator('#verify-result').text_content())
        ok = vj.get('pass') if isinstance(vj, dict) and 'pass' in vj else True
        rec('verify-json', ok is not False)
    except Exception as e:
        rec('verify-json', False, repr(e)[:80])
    html = (BASE / game / 'index.html').read_text(encoding='utf-8')
    ext = re.findall(r'(?:src|href)\s*=\s*["\'](?:https?:)?//[^"\']+', html)
    rec('offline-no-ext', len(ext) == 0, ext[:3])
    body = html.replace('http://www.w3.org', '').replace('https://www.w3.org', '')
    rec('offline-no-http', 'http' not in body.lower() or body.lower().count('http') == 0)
    pg.close()

    # 真实点击通关
    pg = browser.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(URL)
    pg.wait_for_timeout(1600)
    cur0 = pg.evaluate("() => window.%s && window.%s.currentLevel" % (HOOK, HOOK))
    rec('hook-currentLevel', bool(cur0), json.dumps(cur0, ensure_ascii=True)[:120])
    answered = 0
    t0 = time.time()
    while time.time() - t0 < 120:
        q = pg.evaluate("() => { const h = window.%s; if (!h) return null; const q = h.quiz; return typeof q === 'function' ? q() : q; }" % HOOK)
        if not q: break
        # 索引兼容三形态：answerIdx 显式 / answer 是数字索引 / answer 是值按 items 查
        idx = q.get('answerIdx')
        if not isinstance(idx, int) or idx < 0:
            a = q.get('answer')
            if isinstance(a, int): idx = a
            elif a in q.get('items', []): idx = q['items'].index(a)
            else: idx = -1
        if not isinstance(idx, int) or idx < 0:
            rec('quiz-shape', False, json.dumps(q, ensure_ascii=True)[:150]); break
        btns = pg.locator(BTN)
        if btns.count() < 2:
            rec('ans-buttons', False, 'count=%d' % btns.count()); break
        btns.nth(idx).click(delay=30)
        answered += 1
        pg.wait_for_timeout(420)
        cur = pg.evaluate("() => window.%s && window.%s.currentLevel" % (HOOK, HOOK))
        if cur and cur.get('won'): break
        if answered > 30: break
    rec('real-play-answered', answered >= 3, 'answered=%d' % answered)
    pg.wait_for_timeout(1500)
    celebrated = pg.evaluate("() => !!document.querySelector('.k-celebrate, .k-chapterend, .k-dayend')")
    won = pg.evaluate("() => { const c = window.%s && window.%s.currentLevel; return !!(c && c.won); }" % (HOOK, HOOK))
    rec('real-play-won', celebrated or won, 'celebrate=%s won=%s answered=%d' % (celebrated, won, answered))
    pg.screenshot(path=str(SHOTS / (game + '-play.png')))
    # 初始态截图（celebrate 遮罩不影响）
    pg.goto(URL)
    pg.wait_for_timeout(1600)
    pg.screenshot(path=str(SHOTS / (game + '-init.png')))
    pg.close()

    for vp in [(1280, 800), (800, 1180)]:
        pg = browser.new_page(viewport={'width': vp[0], 'height': vp[1]})
        pg.goto(URL)
        pg.wait_for_timeout(1400)
        ox = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        small = pg.evaluate("""() => {
            const bad = [];
            document.querySelectorAll('button, [data-i], [data-idx], .k-btn, [data-piece], [data-ans]').forEach(e => {
                if (e.classList.contains('k-parentbtn')) return;
                const r = e.getBoundingClientRect();
                if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) bad.push((e.className||e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
            });
            return bad;
        }""")
        rec('vp-%dx%d' % vp, ox == 0 and not small, 'overflowX=%s bad=%s' % (ox, small[:4]))
        pg.close()
    browser.close()

try:
    from PIL import Image
    import statistics
    im = Image.open(str(SHOTS / (game + '-init.png'))).convert('L').resize((160, 100))
    px = list(im.getdata())
    var = statistics.pstdev(px)
    rec('shot-nonblank-init', var > 8, 'stdev=%.1f' % var)
except Exception as e:
    rec('shot-nonblank-init', False, repr(e)[:80])

npass = sum(1 for r in results if r['ok'])
print('RESULT %s %d/%d' % (game, npass, len(results)))
sys.exit(0 if npass == len(results) else 1)
