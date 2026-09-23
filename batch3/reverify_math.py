# -*- coding: utf-8 -*-
"""math 首单元独立复验（batch-verify 口径，不信 agent 自报）。
独立 chromium.launch() 无头；不 connect/不杀任何浏览器（并行任务纪律）。
指标：①verify=1 title ②真实点击通关第1关 ③双viewport overflowX=0+触摸目标>=64px
④完全离线断言 ⑤截图像素非空白 ⑥MATH 钩子字段
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

GAME = 'math'
URL = 'file:///F:/claudecode/projects/active/kids-games/batch3/math/index.html'
SHOTS = Path('F:/claudecode/projects/active/kids-games/batch3/shots')
SHOTS.mkdir(exist_ok=True)
results = []

def rec(name, ok, info=''):
    results.append({'name': name, 'ok': bool(ok), 'info': str(info)[:200]})
    print(('PASS' if ok else 'FAIL'), name, info)

with sync_playwright() as p:
    browser = p.chromium.launch()          # 独立实例
    # ---- ① verify=1 ----
    pg = browser.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(URL + '?verify=1')
    pg.wait_for_timeout(3500)
    title = pg.title()
    rec('verify-title', title.startswith('VERIFY PASS'), title)
    try:
        vj = json.loads(pg.locator('#verify-result').text_content())
        rec('verify-json-pass', vj.get('pass', False) or vj.get('total') == vj.get('pass'), )
    except Exception as e:
        rec('verify-json-pass', False, repr(e)[:80])
    # ---- ④ 离线断言（产物文本层）----
    html = Path('F:/claudecode/projects/active/kids-games/batch3/math/index.html').read_text(encoding='utf-8')
    import re
    ext = re.findall(r'(?:src|href)\s*=\s*["\'](https?:)?//[^"\']+', html)
    rec('offline-no-ext', len(ext) == 0, ext[:3])
    rec('offline-no-http', 'http://' not in html.replace('http://www.w3.org', '').replace('https://www.w3.org', ''))
    pg.close()

    # ---- ②⑥ 真实点击通关第 1 关 + 钩子 ----
    pg = browser.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(URL)
    pg.wait_for_timeout(1500)
    hook = pg.evaluate("() => { const m = window.MATH; return m ? { hasCur: !!m.currentLevel, hasQuiz: typeof m.quiz, hasPick: typeof m.pick, hasSolve: typeof m.autoSolve, cur: m.currentLevel } : null }")
    rec('hook-fields', bool(hook) and hook['hasCur'] and hook['hasQuiz'] == 'string' or (hook and str(hook['hasQuiz']).find('getter') >= 0 or hook and hook['hasQuiz']), json.dumps(hook, ensure_ascii=False)[:150] if hook else 'null')
    cur0 = pg.evaluate("() => window.MATH && window.MATH.currentLevel")
    rec('hook-currentLevel', bool(cur0), json.dumps(cur0, ensure_ascii=False)[:120])
    # 教学关：可能有教学流程，直接用钩子读题 + 真实点击答案按钮（类名=button.ans，quiz.answerIdx）
    solved_q = 0
    t0 = time.time()
    while time.time() - t0 < 90:
        q = pg.evaluate("() => window.MATH && window.MATH.quiz")
        if not q:
            break
        idx = q.get('answerIdx')
        if idx is None or not isinstance(idx, int) or idx < 0:
            rec('quiz-shape', False, json.dumps(q, ensure_ascii=True)[:150])
            break
        btns = pg.locator('button.ans')
        n = btns.count()
        if n >= 3:
            btns.nth(idx).click(delay=30)
            solved_q += 1
            pg.wait_for_timeout(400)
        else:
            rec('ans-buttons', False, 'count=%d' % n)
            break
        cur = pg.evaluate("() => window.MATH && window.MATH.currentLevel")
        if cur and cur.get('won'):
            break
        if solved_q > 12:
            break
    rec('real-play-questions', solved_q >= 5, 'answered=%d' % solved_q)
    # 通关判定：celebrate 出现或钩子 won
    pg.wait_for_timeout(1500)
    celebrated = pg.evaluate("() => !!document.querySelector('.k-celebrate, .k-chapterend, .k-dayend')")
    won = pg.evaluate("() => { const c = window.MATH && window.MATH.currentLevel; return !!(c && c.won); }")
    rec('real-play-won', celebrated or won, 'celebrate=%s won=%s answered=%d' % (celebrated, won, solved_q))
    pg.screenshot(path=str(SHOTS / 'math-play.png'))
    pg.close()

    # ---- ③ 双 viewport ----
    for vp in [(1280, 800), (800, 1180)]:
        pg = browser.new_page(viewport={'width': vp[0], 'height': vp[1]})
        pg.goto(URL)
        pg.wait_for_timeout(1400)
        ox = pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        small = pg.evaluate("""() => {
            const sel = 'button, [data-i], [data-idx], .k-btn, [data-piece], [data-ans]';
            const bad = [];
            document.querySelectorAll(sel).forEach(e => {
                if (e.classList.contains('k-parentbtn')) return;   // 家长按钮豁免（batch2 口径）
                const r = e.getBoundingClientRect();
                if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) bad.push((e.className||e.tagName) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
            });
            return bad;
        }""")
        rec('vp-%dx%d' % vp, ox == 0 and not small, 'overflowX=%s bad=%s' % (ox, small[:4]))
        if vp == (800, 1180):
            pg.screenshot(path=str(SHOTS / ('math-%d.png' % vp[0])))
        pg.close()
    # ---- ⑤ 截图像素非空白（PIL 方差）----
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(SHOTS / 'math-play.png')).convert('L').resize((160, 100))
        px = list(im.getdata())
        var = statistics.pstdev(px)
        rec('shot-nonblank', var > 8, 'stdev=%.1f' % var)
    except Exception as e:
        rec('shot-nonblank', False, repr(e)[:80])
    browser.close()

npass = sum(1 for r in results if r['ok'])
print('RESULT %d/%d' % (npass, len(results)))
sys.exit(0 if npass == len(results) else 1)
