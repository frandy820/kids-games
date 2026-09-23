# -*- coding: utf-8 -*-
"""plant _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
r47（SPEC-R47-PLANT）：网格 3/4/5/6+wide 布局 / 标尺闪现（ch3-4）/ rel 相对指令题（星星徽章）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total（12 单元）+ rel 专项单元（frame/wrong/gen/contract）
2. 全新存档：教学 看→帮→独 真实链路（ghost 演示→真点 turn 目标格）→ PL.autoSolve 通关 flat0
   → 写档 kidsgame_plant levels['1-0'] 3★ + clips 在册 59（段二注册后口径：pl 56+core 3）
3. rel 专项（真实页 flat5 ch2 4×4）：q0 abs 真点 → q1 rel 开题（Python 位级独立复算
   star/moves/target 对账）→ 星星徽章 DOM → 真点错格 miss=1 → 点星星格 false 不计 miss
   → 真点目标格推进 step2
4. 800×1180 竖屏 flat15 ch4 6×6 wide 布局：#game.wide 在场+36 格 ≥96+overflowX==0
   +标尺 rulers-off 淡出态+星星徽章+卡 .rel 类+截图非空白
5. 完全离线（运行时无 http(s) 请求）+ 全程 0 pageerror
MUTE 静音双保险（r19 红线）：每 context 挂 MUTE_INIT init_script + 种档 settings sound:false/tts:false/vol:0
"""
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _r47_pycheck import spec_level          # Python 位级复算（独立复验核心，禁读引擎期望）

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'plant', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {},
        'settings': {'sound': False, 'tts': False, 'vol': 0},          # MUTE 双保险之一（r19）
        'restTip': {'day': '', 'shown': 0},
        'plant': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_plant", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
    """每 context 必挂 MUTE_INIT（r19 双保险之二）+ 可选种档"""
    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
    ctx.add_init_script(MUTE_INIT)
    if seed:
        ctx.add_init_script(seed)
    return ctx


def png_nonblank(path, floor=10.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        px = list(im.getdata())
        sd = statistics.pstdev(px)
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


def wait_open(pg, timeout=30000):
    """等演出/锁窗结束（真实页 SPEED=1：rel 开题窗 ~9.1s）——state 为全局词法绑定可直接求值"""
    pg.wait_for_function(
        "() => typeof state !== 'undefined' && !state.locked && !state.demo && Date.now() >= state.showUntil",
        timeout=timeout)


def tap_cell(pg, i):
    """真实 pointer 点格 data-i（格心）"""
    box = pg.locator('.cell[data-i="%d"]' % i).bounding_box()
    pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    pg.wait_for_timeout(120)


def main():
    offline_bad = []
    page_errors = []

    def watch(pg, tag):
        pg.on('pageerror', lambda e: page_errors.append(tag + ': ' + str(e)))
        pg.on('request', lambda r: offline_bad.append(tag + ': ' + r.url)
              if r.url.startswith('http') else None)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            # ---- 1. verify=1（12 单元全绿 + r47 专项单元抽查）----
            ctx = new_ctx(browser, (1280, 800))
            pg = ctx.new_page(); watch(pg, 'verify')
            pg.goto(URL + '?verify=1')
            pg.wait_for_function("document.title.startsWith('VERIFY')", timeout=120000)
            title = pg.title()
            check('verify title', title.startswith('VERIFY PASS'), title)
            vj = json.loads(pg.locator('#verify-result').text_content())
            check('verify JSON pass==total (12 units)',
                  vj['pass'] == vj['total'] and vj['total'] == 12,
                  'pass=%s/%s' % (vj['pass'], vj['total']))
            for u in ('drive', 'gen', 'tutorial', 'wrong', 'frame', 'prior', 'stars',
                      'confirm', 'contract', 'struct', 'save', 'realPath'):
                check('verify unit %s' % u, vj['units'][u]['ok'], str(vj['units'][u])[:160])
            check('verify frame rel star DOM (flat15 6x6)', vj['units']['frame']['frames'][2]['star'],
                  str(vj['units']['frame']['frames'][2]))
            check('verify gen distribution (dir/step/row all ok)',
                  vj['units']['gen']['dirOk'] and vj['units']['gen']['stepOk'] and vj['units']['gen']['rowOk'],
                  'dir=%s step=%s' % (vj['units']['gen']['dist']['dir'], vj['units']['gen']['dist']['step']))
            check('verify sims n=3/4/5/6 dual viewport all pass',
                  all(s['pass'] for s in vj['units']['struct']['sims']),
                  str([(s['vp'], s['flat'], s['n'], s['pass']) for s in vj['units']['struct']['sims']]))
            ctx.close()

            # ---- 2. 全新存档：教学 看→帮→独 真实链路 → autoSolve 通关 → 写档+clips 59 ----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=False))
            pg = ctx.new_page(); watch(pg, 'tut')
            pg.goto(URL)
            pg.wait_for_function('window.PL && PL.currentLevel', timeout=10000)
            pg.wait_for_function("PL.tutorial === 'help'", timeout=30000)   # watch 段 ~13.4s（SPEED=1）
            q_t = pg.evaluate('PL.quiz')
            check('tutorial turn mini-level 3x3 abs (3,1)',
                  q_t and q_t['n'] == 3 and q_t['mode'] == 'abs' and q_t['row'] == 3 and q_t['col'] == 1,
                  str(q_t)[:100])
            try:
                # turn 开题演出（ask 2172+卡句 3315）后 600ms 才指目标格——等待窗须罩 ~6.1s
                pg.wait_for_function("document.getElementById('ghost').classList.contains('show')",
                                     timeout=10000)
                ghost_shown = True
            except Exception:
                ghost_shown = False
            check('tutorial help ghost -> target cell', ghost_shown)
            wait_open(pg)
            tap_cell(pg, (3 - 1) * 3 + (1 - 1))       # turn 目标格 idx=6（真实 pointer）
            pg.wait_for_function('PL.currentLevel && PL.currentLevel.flat === 0', timeout=8000)
            check('tutorial solo -> real level flat=0 (n=5 ch1)', True,
                  str(pg.evaluate('PL.currentLevel')))
            r = pg.evaluate('PL.autoSolve()')          # 真实判定链通关（钩子驱动）
            check('autoSolve flat0 done 5 taps', r and r['done'] and r['taps'] == 5, str(r))
            pg.wait_for_function('PL.currentLevel && PL.currentLevel.flat === 1', timeout=15000)
            saved = json.loads(pg.evaluate('localStorage.getItem("kidsgame_plant")'))
            check('save 1-0 recorded 3 stars (real winFlow persistWin)',
                  saved['levels'].get('1-0', {}).get('stars') == 3, str(saved.get('levels')))
            check('plant.tutSeen persisted', (saved.get('plant') or {}).get('tutSeen') is True,
                  str(saved.get('plant')))
            n_clips = pg.evaluate('Object.keys(KIDS.voice.clips).length')
            check('clips in-register = 59 (r47 段二注册后：pl 56 + core 3)', n_clips == 59, 'clips=%s' % n_clips)
            dk_miss = pg.evaluate('Object.keys(DESIGN_KEYS).filter(k => !KIDS.voice.clips[k])')
            check('r47 34 design keys all registered (段二销账)', dk_miss == [], str(dk_miss[:5]))
            ctx.close()

            # ---- 3. rel 专项（真实页 flat5 ch2 4×4：q0 abs → q1 rel 全链）----
            ctx = new_ctx(browser, (1280, 800), preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, 'rel')
            pg.goto(URL)
            pg.wait_for_function('window.PL && PL.currentLevel', timeout=10000)
            pg.evaluate('PL.start(5)')                 # 直达 flat5（绕日限，钩子入口）
            wait_open(pg)
            exp5 = spec_level(5)                       # Python 位级独立复算（禁读引擎期望）
            q0 = pg.evaluate('PL.quiz')
            check('flat5 q0 abs shape (py-recomputed)',
                  q0 and q0['mode'] == 'abs' and q0['n'] == 4 and
                  q0['row'] == exp5['qs'][0]['row'] and q0['col'] == exp5['qs'][0]['col'],
                  'page=(%s,%s) py=(%s,%s)' % (q0['row'], q0['col'], exp5['qs'][0]['row'], exp5['qs'][0]['col']))
            tap_cell(pg, exp5['qs'][0]['idx'])         # 真点 q0 目标 → q1 rel 开题（~9.1s 演出）
            pg.wait_for_function("PL.quiz && PL.quiz.step === 1 && PL.quiz.mode === 'rel'", timeout=8000)
            wait_open(pg)
            e1 = exp5['qs'][1]
            q1 = pg.evaluate('PL.quiz')
            check('flat5 q1 rel shape (py-recomputed star/moves/target)',
                  q1 and q1['mode'] == 'rel' and q1['row'] == e1['row'] and q1['col'] == e1['col'] and
                  q1['star'] == e1['star'] and [list(m) for m in q1['moves']] == [list(m) for m in e1['moves']] and
                  q1['card'].startswith('从星星出发，') and len(q1['card']) == 15,
                  'page=%s py=%s' % (json.dumps(q1, ensure_ascii=False)[:150],
                                     json.dumps(e1, ensure_ascii=False)[:150]))
            star_dom = pg.evaluate('''(si) => {
              const s = document.querySelector('.cell[data-i="' + si + '"]');
              return !!(s && s.classList.contains('star') && s.dataset.star === '1' &&
                        s.querySelector('g[data-anim="star"]'));
            }''', e1['starIdx'])
            check('rel star badge DOM (.star+data-star+g[data-anim=star])', star_dom)
            wrong_i = next(i for i in range(16)
                           if i != e1['idx'] and i != e1['starIdx'] and i != exp5['qs'][0]['idx'])
            tap_cell(pg, wrong_i)                      # 真点错格 → miss=1（错锁 2214+140）
            pg.wait_for_function('PL.quiz.miss === 1', timeout=6000)
            wait_open(pg, timeout=10000)               # 出错锁尾（豁免窗 6219 仍在）
            tap_cell(pg, e1['starIdx'])                # 窗内点星星格 → false 不计 miss（星星拒绝分支在豁免窗 guard 之前——r47-fix m4 归因勘正）
            m_star = pg.evaluate('PL.quiz.miss')
            check('tap star cell -> rejected, miss stays 1', m_star == 1, 'miss=%s' % m_star)
            tap_cell(pg, e1['idx'])                    # 真点目标格（豁免窗内对选放行）
            pg.wait_for_function('PL.quiz && PL.quiz.step === 2', timeout=8000)
            star_gone = pg.evaluate('''(si) => { const c = document.querySelector('.cell[data-i="' + si + '"]');
              return !c.classList.contains('star') && !c.querySelector('.starbadge'); }''',
                                    e1['starIdx'])   # r47-fix M1：徽章 span 随星拆除（只查类=旧门禁盲区）
            check('rel planted -> star cleared, step=2', star_gone)
            ctx.close()

            # ---- 4. 800×1180 竖屏 flat15 ch4 6×6 wide 布局 ----
            ctx = new_ctx(browser, (800, 1180), preset_save(tut_seen=True))
            pg = ctx.new_page(); watch(pg, 'vp')
            pg.goto(URL)
            pg.wait_for_function('window.PL && PL.currentLevel', timeout=10000)
            pg.evaluate('PL.start(15)')
            pg.wait_for_function("PL.quiz && PL.quiz.mode === 'rel'", timeout=8000)
            wait_open(pg)
            m = pg.evaluate('''() => {
              const de = document.documentElement;
              const cells = [...document.querySelectorAll('#grid .cell')].map(b => b.getBoundingClientRect());
              const cellMin = cells.length ? Math.round(Math.min(...cells.map(r => Math.min(r.width, r.height)))) : 0;
              const e1 = PL.quiz;
              const star = document.querySelector('.cell.star');
              return { wide: document.getElementById('game').classList.contains('wide'),
                       n: e1.n, cells: cells.length, cellMin: cellMin,
                       ox: Math.max(de.scrollWidth - de.clientWidth,
                                    document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth),
                       rulersOff: document.getElementById('garden').classList.contains('rulers-off'),
                       starBadge: !!star, cardRel: document.getElementById('card').classList.contains('rel'),
                       cardText: e1.card };
            }''')
            check('vp 800x1180 flat15: wide layout + 6x6=36 cells + cell>=96',
                  m['wide'] and m['n'] == 6 and m['cells'] == 36 and m['cellMin'] >= 96,
                  'wide=%s n=%s cells=%s cellMin=%s' % (m['wide'], m['n'], m['cells'], m['cellMin']))
            check('vp 800x1180 overflowX==0 (wide 紧凑不横溢)', m['ox'] == 0, 'ox=%s' % m['ox'])
            check('vp 800x1180 rulers faded (dch4) + star badge + card.rel 15-char',
                  m['rulersOff'] and m['starBadge'] and m['cardRel'] and len(m['cardText']) == 15,
                  'off=%s star=%s rel=%s card=%r' % (m['rulersOff'], m['starBadge'], m['cardRel'], m['cardText']))
            shot = SHOTS / 'plant-vp800x1180.png'
            pg.screenshot(path=str(shot))
            ok, detail = png_nonblank(shot, floor=10.0)
            check('screenshot 800x1180 non-blank (stdev>10)', ok, detail)
            if ok:
                shot.unlink()
            ctx.close()
        finally:
            browser.close()

    # ---- 5. 完全离线 + 0 pageerror ----
    check('fully offline (no http(s) requests at runtime)', not offline_bad, str(offline_bad[:4]))
    check('zero pageerror across all scenarios', not page_errors, str(page_errors[:4]))

    n_ok = sum(1 for _, ok, _ in RESULTS if ok)
    print('\n==== SELFTEST %d/%d PASS ====' % (n_ok, len(RESULTS)))
    sys.exit(0 if n_ok == len(RESULTS) else 1)


if __name__ == '__main__':
    main()
