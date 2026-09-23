# -*- coding: utf-8 -*-
"""wordpuz _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程；单 page 串行）
1. ?verify=1 → title=VERIFY PASS n/n（n>=50）+ __wpVlog.pass==total+layoutOk + 0 pageerror
2. 真实页（新 context 空存档）：教学 watch 期真实乱点被吞（槽不填）→ watch 演示走完 cat 拼满
   → ghost .show（help 帮指）→ 真实点击 c→a→t 拼满 cat → 换题（zh 徽章变化）→ ghost 收（solo 放手）
3. 真实页 WP 钩子暴露（window.WP 在场，quiz 形状正确，tapLtr/start/autoSolve 可用）+ 截图像素非空白
4. 全程 0 pageerror
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
RESULTS = []

def check(name, ok, info=''):
    RESULTS.append((name, bool(ok), info))
    print(('PASS ' if ok else 'FAIL ') + name + (' | ' + str(info)[:220] if info else ''))

with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ---- 1. verify 页（~100s：flat0-19 autoSolve 全量为大头） ----
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL + '?verify=1')
    title = None
    try:
        page.wait_for_function("document.title.indexOf('VERIFY') === 0", timeout=240000)
        title = page.title()
    except Exception as e:
        title = 'TIMEOUT: ' + repr(e)[:120]
    check('verify title', title and title.startswith('VERIFY PASS'), title)
    vlog = page.evaluate("window.__wpVlog ? {total:__wpVlog.total, pass:__wpVlog.pass, layoutOk:__wpVlog.layoutOk,"
                         "units:__wpVlog.units, smokes:__wpVlog.smokes, genN:Object.keys(__wpVlog.gen||{}).length} : null")
    if vlog:
        check('verify pass==total', vlog['pass'] == vlog['total'], '%s/%s layoutOk=%s' % (vlog['pass'], vlog['total'], vlog['layoutOk']))
        check('verify n>=50', vlog['total'] >= 50, vlog['total'])
        bad = [k for k, v in (vlog.get('units') or {}).items() if not v.get('ok')]
        badL = [k for k, v in (vlog.get('smokes') or {}).items() if not v.get('ok')]
        check('verify all units ok', not bad and not badL, 'bad=%s badSmoke=%s' % (bad, badL))
        lv = vlog.get('units', {}).get('tutorial', {})
        check('tutorial chain', lv.get('ok'), 'demoR=%s watchMs=%s' % (lv.get('demoR'), lv.get('watchMs')))
        eg = vlog.get('units', {}).get('egg', {})
        check('egg multiset paths', eg.get('ok'), eg.get('info'))
        fr = vlog.get('units', {}).get('frame', {})
        check('frame-content M', fr.get('ok'), fr.get('bad'))
        sm = vlog.get('smokes', {}).get('flat19', {})
        check('flat0-19 autoSolve', sm.get('ok'), (sm.get('solved') or [])[:6])
    check('verify 0 pageerror', not errors, errors[:3])
    # flat0-19 全量 UI autoSolve（verify 跑完后同页追加——不占 gate G1 轮询窗）
    full20 = page.evaluate("""(async () => {
      const out = [];
      for (let flat = 0; flat < 20; flat++) {
        WP.start(flat);
        const a = await WP.autoSolve();
        const lv = WP.currentLevel;
        out.push(flat + ':' + (a.done ? '1' : '0') + '/t' + a.taps + '/s' + (lv ? lv.stars : '?'));
      }
      return out;
    })()""")
    check('flat0-19 full autoSolve', all(x.split(':')[1].startswith('1/') and x.endswith('s3') for x in full20), full20[:6])
    page.screenshot(path=str(SHOTS / 'verify.png'))
    ctx.close()

    # ---- 2. 真实页：教学三段（watch→help→solo）+ 乱点吞输入 ----
    ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
    page2 = ctx2.new_page()
    errors2 = []
    page2.on('pageerror', lambda e: errors2.append(str(e)))
    page2.goto(URL)
    page2.wait_for_selector('#scene .zh', timeout=10000)
    # 教学演示期乱点：被吞（槽不填字母）
    page2.click('.ltr >> nth=0', timeout=3000)
    page2.wait_for_timeout(500)
    filled = page2.evaluate("Array.from(document.querySelectorAll('#slots .lt')).filter(e=>e.textContent).length")
    check('tutorial swallow taps', filled == 0, 'filled=' + str(filled))
    # watch 演示走完（真实时长 ~12.5s）→ help 期 ghost.show 帮指
    page2.wait_for_selector('#ghost.show', timeout=25000)
    check('tutorial help ghost', True)
    zh0 = page2.text_content('#scene .zh')
    # 教学期乱点第二击（help 期点击有效——但先验证吞到 watch 结束前；此处已 help，直接真实拼词）
    for ch in ['c', 'a', 't']:
        page2.click('.ltr:has-text("%s")' % ch, timeout=5000)
        page2.wait_for_timeout(300)
    # 判对演出 4800ms 后换题：zh 徽章变化 + ghost 收起（solo 放手）
    page2.wait_for_function("document.querySelector('#scene .zh') && document.querySelector('#scene .zh').textContent !== %s"
                            % json.dumps(zh0), timeout=12000)
    check('advance next quiz', True, '%s -> %s' % (zh0, page2.text_content('#scene .zh')))
    page2.wait_for_timeout(600)
    ghostGone = page2.evaluate("!document.querySelector('#ghost.show')")
    check('solo ghost released', ghostGone)
    wpShape = page2.evaluate("(function(){ if (!window.WP) return null; const q = window.WP.quiz;"
                             "return q && typeof q.word==='string' && typeof q.zh==='string' && Array.isArray(q.pool)"
                             " && q.pool.every(c=>typeof c.ch==='string' && typeof c.used==='boolean')"
                             " && Array.isArray(q.slots) && typeof q.answer==='string' && typeof q.step==='number'"
                             " && typeof q.miss==='number' && typeof window.WP.tapLtr==='function'"
                             " && typeof window.WP.start==='function' && typeof window.WP.autoSolve==='function'"
                             " ? {word:q.word, zh:q.zh, n:q.pool.length, answer:q.answer} : null; })()")
    check('real page WP.quiz shape', bool(wpShape), wpShape)
    page2.screenshot(path=str(SHOTS / 'real.png'))
    check('real 0 pageerror', not errors2, errors2[:3])
    try:
        from PIL import Image, ImageStat
        img = Image.open(str(SHOTS / 'real.png')).convert('L')
        st = ImageStat.Stat(img).stddev
        check('screenshot non-blank', st[0] > 5, 'stdev=%.1f' % st[0])
    except ImportError:
        print('SKIP screenshot pixel check (no PIL)')
    ctx2.close()
    browser.close()

fails = [r for r in RESULTS if not r[1]]
print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
sys.exit(1 if fails else 0)
