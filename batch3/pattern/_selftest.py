# -*- coding: utf-8 -*-
"""pattern _selftest — headless playwright 自测（不弹窗/不连已开浏览器/不杀进程）
1. ?verify=1 → title=VERIFY PASS（40 关规律校验+autoSolve+单元+布局+r27 谱对账/新形态）
2a. 预置存档(跳过教学) → PAT.quiz() 取答案 → page.click 真实点击通关 → .k-celebrate → 写档
2b. 全新存档 → 教学"看"自动演示 → "帮"高亮序列前段+幽灵手指 → 真实点击通关 → tutSeen 持久化
2c. 错选零惩罚：点错→晃+正确项高亮→重点正确推进
2d. r27 flat14 实测：dualP 双轴独立周期关真实点击通关+写档（新形态端到端）
2e. r27 flat17 实测：compound 双变量复合关真实点击通关+写档（新形态端到端）
3. 双 viewport(1280x800/800x1180)：overflowX<=0、选项按钮>=80、序列卡>=64、间距>=16
4. 全页截图非空白（PIL 可用时做像素方差检查，否则按 PNG 体积判定）
r19 红线：MUTE 静音双保险——每个 context goto 前挂 MUTE_INIT init_script
+种档 sound:false/tts:false/vol:0（种档在 MUTE 之后注册，覆盖为静音档）。
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
RESULTS = []

# r19 静音双保险第一层：无操作环境 + 静音种档 + speechSynthesis/Audio 打桩（原文，键 kidsgame_pattern）
MUTE_INIT = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_pattern', JSON.stringify({v:'1.0',game:'pattern',
      firstDay:_t, lastDay:_t, levels:{}, dailyMin:{},
      settings:{sound:false,tts:false,vol:0}}));
  } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))


def preset_save(tut_seen=True):
    """静音双保险第二层：完整结构种档，settings 全静音（覆盖 MUTE_INIT 的精简档）"""
    save = {
        'v': '1.0', 'game': 'pattern', 'firstDay': TODAY, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': False, 'tts': False, 'vol': 0},
        'restTip': {'day': '', 'shown': 0},
    }
    if tut_seen:
        save['pat'] = {'tutSeen': True}
    return 'localStorage.setItem("kidsgame_pattern", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path):
    try:
        from PIL import Image
        import statistics
        im = Image.open(path).convert('L').resize((160, 100))
        px = list(im.getdata())
        return statistics.pstdev(px) > 4, 'PIL pixel stdev=%.1f' % statistics.pstdev(px)
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def click_through(page, kinds=None):
    """按 PAT.quiz().answerIdx 逐题真实点击，等待 .k-celebrate，返回耗时
    （单题管线 ~2.4-3.0s：翻开 600ms + 回放 len*150+600ms，r27 最长 8 卡=2.4s）"""
    t0 = time.time()
    for _ in range(8):
        q = page.evaluate('PAT.quiz()')
        if not q:
            break
        if kinds is not None:
            kinds.append(q.get('kind'))
        page.click('.choice[data-i="%d"]' % q['answerIdx'])
        page.wait_for_timeout(3000)
        if page.evaluate('PAT.currentLevel.won'):
            break
    page.wait_for_selector('.k-celebrate', timeout=4000)
    return time.time() - t0


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()  # 无头全新实例，绝不触碰用户浏览器
        try:
            # ---- 1. verify=1 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total', vj['pass'] == vj['total'] and vj['layoutOk'],
                  'pass=%s/%s layoutOk=%s' % (vj['pass'], vj['total'], vj['layoutOk']))
            check('verify units spec27/newKinds', vj['units'].get('spec27', {}).get('ok') is True and
                  vj['units'].get('newKinds', {}).get('ok') is True,
                  'spec27=%s newKinds=%s longest=%s' % (vj['units'].get('spec27', {}).get('ok'),
                                                        vj['units'].get('newKinds', {}).get('ok'),
                                                        vj['units'].get('newKinds', {}).get('longest')))
            check('verify 0 pageerror', not errs, str(errs[:2]))
            ctx.close()

            # ---- 2a. 预置存档跳过教学，真实点击通关（flat0 首题=教学链逐字节锚 AB_END）----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PAT && PAT.quiz() !== null', timeout=8000)
            lv = pg.evaluate('PAT.currentLevel')
            check('start at 1-0 (ch 1-based)', lv['ch'] == 1 and lv['lv'] == 0 and lv['flat'] == 0, str(lv))
            tut = pg.evaluate('PAT.tutorial')
            check('tutorial skipped (preset)', tut == 'none', 'tut=%s' % tut)
            q0 = pg.evaluate('PAT.quiz()')
            check('quiz shape', q0['missingIdx'] == 4 and q0['seq'][4] is None and
                  len(q0['items']) == 3 and 0 <= q0['answerIdx'] <= 2, str(q0['missingIdx']))
            check('flat0 quiz0 = AB_END anchor (r27)', q0.get('tk') == 'AB_END' and q0.get('kind') == 'cycle',
                  'tk=%s kind=%s' % (q0.get('tk'), q0.get('kind')))
            dt = click_through(pg)
            check('real-click win -> .k-celebrate', True, '%.1fs' % dt)
            star_html = pg.locator('.k-celebrate .k-star').count()
            check('celebrate shows 3 stars (0-miss perfect)', star_html == 3, 'stars=%d' % star_html)
            pg.wait_for_timeout(2600)  # 过关推进
            lv2 = pg.evaluate('PAT.currentLevel')
            check('auto-proceed to next level', lv2['flat'] == 1, str(lv2))
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_pattern")'))
            check('save 1-0 recorded (3 stars)', saved['levels'].get('1-0', {}).get('stars') == 3,
                  str(saved['levels']))
            ctx.close()

            # ---- 2b. 全新存档：教学"看→帮→独"真实链路 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PAT && PAT.quiz() !== null', timeout=8000)
            pg.wait_for_function("PAT.tutorial === 'help'", timeout=15000)  # 等"看"演示完成
            q = pg.evaluate('PAT.quiz()')
            check('tutorial watch done -> quiz re-dealt (q0, ? hidden)',
                  q['missingIdx'] is not None and q['seq'][q['missingIdx']] is None, str(q['missingIdx']))
            lead = pg.evaluate("document.querySelectorAll('.seqcard.lead').length")
            check('help: sequence front segment highlighted', lead >= 2, 'lead=%d' % lead)
            try:
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')", timeout=4500)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost visible', ghost_shown)
            click_through(pg)  # "帮"首次答对→"独"，真实点击继续通关
            check('tutorial level playable -> .k-celebrate', True)
            tut_end = pg.evaluate('PAT.tutorial')
            check('tutorial reached solo after first correct', tut_end == 'solo', 'tut=%s' % tut_end)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_pattern")'))
            check('pat.tutSeen persisted', (saved.get('pat') or {}).get('tutSeen') is True, str(saved.get('pat')))
            ctx.close()

            # ---- 2c. 错选零惩罚：点错→晃+正确项高亮→重点正确推进 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PAT && PAT.quiz() !== null', timeout=8000)
            q = pg.evaluate('PAT.quiz()')
            wrong = (q['answerIdx'] + 1) % 3
            pg.click('.choice[data-i="%d"]' % wrong)
            pg.wait_for_timeout(700)
            st = pg.evaluate('''() => ({
              wrongCls: document.querySelector('.choice[data-i="%d"]').classList.contains('wrong'),
              revealCls: document.querySelector('.choice[data-i="%d"]').classList.contains('reveal'),
              qi: PAT.currentLevel.qi, misses: PAT.currentLevel.misses
            })''' % (wrong, q['answerIdx']))
            check('wrong pick: shake+dim correct-highlight, stays on quiz',
                  st['wrongCls'] and st['revealCls'] and st['qi'] == 0 and st['misses'] == 1, str(st))
            pg.wait_for_timeout(900)  # 高亮 1.2s 结束解锁
            pg.click('.choice[data-i="%d"]' % q['answerIdx'])
            pg.wait_for_timeout(2800)
            st2 = pg.evaluate('PAT.currentLevel')
            check('retry-correct advances to quiz 2', st2['qi'] == 1 and st2['misses'] == 1, str(st2))
            ctx.close()

            # ---- 2d. r27 新形态实测：flat14（ch3 章末）dualP 双轴独立周期 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PAT && PAT.quiz() !== null', timeout=8000)
            pg.evaluate('PAT.start(14)')
            pg.wait_for_timeout(300)
            lv = pg.evaluate('PAT.currentLevel')
            check('r27 flat14 start (ch3 lv4)', lv['flat'] == 14 and lv['ch'] == 3 and lv['quizCount'] == 4, str(lv))
            kinds14 = []
            dt = click_through(pg, kinds14)
            check('r27 flat14 real-click win (dualP present)',
                  'dualP' in kinds14 and 'dual' in kinds14, '%.1fs %s' % (dt, kinds14))
            pg.wait_for_timeout(3000)  # celebrate 收尾+写档
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_pattern")'))
            check('r27 flat14 save 3-4 recorded (3 stars)',
                  saved['levels'].get('3-4', {}).get('stars') == 3, str(saved['levels'].get('3-4')))
            ctx.close()

            # ---- 2e. r27 新形态实测：flat17（ch4）compound 双变量复合 ----
            ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
            ctx.add_init_script(MUTE_INIT)
            ctx.add_init_script(preset_save(tut_seen=True))
            pg = ctx.new_page()
            pg.goto(URL)
            pg.wait_for_function('window.PAT && PAT.quiz() !== null', timeout=8000)
            pg.evaluate('PAT.start(17)')
            pg.wait_for_timeout(300)
            lv = pg.evaluate('PAT.currentLevel')
            check('r27 flat17 start (ch4 lv2)', lv['flat'] == 17 and lv['ch'] == 4 and lv['quizCount'] == 5, str(lv))
            kinds17 = []
            dt = click_through(pg, kinds17)
            check('r27 flat17 real-click win (compound present)',
                  'compound' in kinds17 and 'count' in kinds17, '%.1fs %s' % (dt, kinds17))
            pg.wait_for_timeout(3000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_pattern")'))
            check('r27 flat17 save 4-2 recorded (3 stars)',
                  saved['levels'].get('4-2', {}).get('stars') == 3, str(saved['levels'].get('4-2')))
            ctx.close()

            # ---- 3+4. 双 viewport 布局 + 截图 ----
            for vp in [(1280, 800), (800, 1180)]:
                ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
                ctx.add_init_script(MUTE_INIT)
                pg = ctx.new_page()
                pg.goto(URL + '?verify=1&layout=1')  # verify 分支会实建最长序列供测量
                pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=20000)
                m = pg.evaluate('''() => {
                  const de = document.documentElement;
                  const cards = [...document.querySelectorAll('.seqcard')];
                  const chs = [...document.querySelectorAll('.choice')];
                  const cr = cards[0].getBoundingClientRect(), chr = chs[0].getBoundingClientRect();
                  const rs = cards.map(c => c.getBoundingClientRect());
                  let gapMin = 999;
                  for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
                    if (a === b) continue;
                    if (Math.abs(rs[a].y - rs[b].y) < 2) gapMin = Math.min(gapMin, Math.abs(rs[a].x - rs[b].x) - rs[a].width);
                  }
                  return {ox: de.scrollWidth - de.clientWidth, cardW: cr.width, cardH: cr.height,
                          choiceW: chr.width, choiceH: chr.height, gap: gapMin, n: cards.length};
                }''')
                check('viewport %dx%d overflowX<=0' % vp, m['ox'] <= 0, str(m))
                check('viewport %dx%d cards>=64 choice>=80' % vp,
                      m['cardW'] >= 64 and m['cardH'] >= 64 and m['choiceW'] >= 80 and m['choiceH'] >= 80,
                      'card=%.0fx%.0f choice=%.0fx%.0f n=%d' % (m['cardW'], m['cardH'], m['choiceW'], m['choiceH'], m['n']))
                check('viewport %dx%d gap>=16' % vp, m['gap'] >= 16, 'gap=%.0f' % m['gap'])
                # 正常模式截图（真实牌面，8 卡最长序列在 verify 页可量）
                pg2 = ctx.new_page()
                pg2.goto(URL)
                pg2.wait_for_function('window.PAT && PAT.quiz() !== null', timeout=8000)
                pg2.wait_for_timeout(800)
                shot = HERE / ('_shot_%dx%d.png' % vp)
                pg2.screenshot(path=str(shot), full_page=True)
                ok, detail = png_nonblank(shot)
                check('screenshot %dx%d non-blank' % vp, ok, detail)
                if ok:
                    shot.unlink()
                ctx.close()
        finally:
            browser.close()

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
