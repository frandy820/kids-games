# -*- coding: utf-8 -*-
"""datacollect _selftest — headless playwright 自测（独立 chromium.launch --mute-audio，不连/不杀任何浏览器进程）
r14 数据收集员版（2026-09-15）：
P1.  ?verify=1（横 1280×800）→ title=VERIFY PASS + JSON pass==total + 0 pageerror
P1b. 真竖 800×1180 verify 复跑（@media 真通道）全绿 + #logo 锚宽 38
P2.  真实页（非 verify，SPEED=1）：
     a. stub 发声（voice.play/queue/say 计数 + audio.note/sfx 静默）→ 清 KIDS 内存档教学特例
        → start(0) 教学链真实重跑 → wall 实测 ≤16000（build TUT_SUM=15920 名义分账）
        + __dcDemoR='right' + tut='help' + turn 题=chick 10（SPEC §3-r14 定版锚）
     b. 预置存档（tutSeen，1-0 未通）→ flat0 autoSolve（UI 路径：tapCell/settle）真实通关
        → .k-celebrate → 写档 1-0 stars>=1（plays>=1）
     c. 构建自检：index.html 含 23 条 clips（dc_ 20+core 3）+ 单文件完全离线
     d. 截图非空白（PIL stdev>5）
"""
import json, re, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(done_flats=()):
    save = {
        'v': '1.0', 'game': 'datacollect', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'datacollect': {'tutSeen': True},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_datacollect", %s)' % json.dumps(json.dumps(save))


def png_nonblank(path, floor=5.0):
    try:
        from PIL import Image
        import statistics
        im = Image.open(str(path)).convert('L').resize((160, 100))
        sd = statistics.pstdev(list(im.getdata()))
        return sd > floor, 'PIL pixel stdev=%.1f' % sd
    except ImportError:
        n = path.stat().st_size
        return n >= 40000, 'PNG %d bytes (PIL 不可用，按体积判定)' % n


STUB_VOICE = """() => {
    window.__vcPlays = []; window.__vcQueues = [];
    KIDS.voice.play = function (k, t) { window.__vcPlays.push(k); };
    KIDS.voice.say = function (t) { window.__vcSay = (window.__vcSay || 0) + 1; };
    KIDS.voice.queue = function (parts) { window.__vcQueues.push(parts); };
    KIDS.audio.note = function () {};
    KIDS.audio.sfx = function () {};
}"""


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])

        # ---------- P1. verify=1（横 1280×800） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=180000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('P1 verify=1 (land) title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('P1 verify pass==total', r['pass'] == r['total'], '%s/%s' % (r['pass'], r['total']))
        page.close()

        # ---------- P1b. 真竖 800×1180 verify 复跑（@media 真通道） ----------
        page = browser.new_page(viewport={'width': 800, 'height': 1180})
        page.on('pageerror', lambda e: errors.append('verifyP: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=180000)
        title_b = page.title()
        logo_w = page.evaluate("document.getElementById('logo') && document.getElementById('logo').offsetWidth")
        check('P1b verify(portrait 800x1180) PASS + logoW=38',
              title_b.startswith('VERIFY PASS') and logo_w and abs(logo_w - 38) <= 1,
              '%s | logoW=%s' % (title_b, logo_w))
        page.close()

        # ---------- P2a. 真实页教学链 wall 实测（SPEED=1，stub 发声） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.evaluate(STUB_VOICE)
        # 清 KIDS 内存档教学特例（首次 load 已跑过教学的话 tutSeen 在内存档）→ start(0) 真实重跑
        st = page.evaluate("""() => {
            const sv = KIDS._save();
            if (sv.datacollect) delete sv.datacollect;
            if (sv.levels) delete sv.levels['1-0'];
            window.__tutWall = -1;
            const t0 = Date.now();
            window.__tutT0 = t0;
            const iv = setInterval(() => {
                if (window.DC && window.DC.tutorial === 'help') {
                    window.__tutWall = Date.now() - t0;
                    clearInterval(iv);
                }
            }, 40);
            window.DC.start(0);
            return { tut0: window.DC.tutorial };
        }""")
        page.wait_for_function('window.__tutWall > 0', timeout=30000)
        wall = page.evaluate('window.__tutWall')
        tut_st = page.evaluate("""() => ({ demoR: window.__dcDemoR, tut: window.DC.tutorial,
            q: window.DC.quiz && { kind: window.DC.quiz.kind, ask: window.DC.quiz.ask, answer: window.DC.quiz.answer } })""")
        check('P2a tutorial wall <= 16000 (real SPEED=1)', 0 < wall <= 16000, 'wall=%dms' % wall)
        check('P2a tutorial chain shape (demoR=right, tut=help, turn q=chick:10)',
              tut_st['demoR'] == 'right' and tut_st['tut'] == 'help' and
              tut_st['q'] and tut_st['q']['kind'] == 'count' and
              tut_st['q']['ask'] == 'chick' and tut_st['q']['answer'] == 10, str(tut_st))
        page.screenshot(path=str(SHOTS / 'tutorial_help.png'))
        page.close()

        # ---------- P2b. 预置存档 flat0 autoSolve 真实通关 + 写档 ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save())
        page.evaluate(STUB_VOICE)
        page.reload()
        page.wait_for_function('window.DC && window.DC.quiz', timeout=8000)
        q0 = page.evaluate('window.DC.quiz')
        check('P2b flat0 loaded (count rabbit 8)', q0['step'] == 0 and q0['kind'] == 'count' and
              q0['ask'] == 'rabbit' and q0['answer'] == 8, str(q0)[:100])
        page.screenshot(path=str(SHOTS / 'quiz_1280.png'))
        # autoSolve=UI 路径真实驱动（tapCell→settle 900→确认窗；5 题全 count≈34s）
        page.wait_for_function('window.DC.autoSolve().then(r => { window.__asR = r; return true; })',
                               timeout=120000)
        asr = page.evaluate('window.__asR')
        check('P2b autoSolve done (flat0 5 count quizzes)', asr and asr['done'] and asr['taps'] >= 5, str(asr))
        page.wait_for_selector('.k-celebrate', timeout=15000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('P2b celebrate overlay shown', True)
        page.wait_for_timeout(5400)                      # celebrate→pass 写档，等足 5.4s 再读
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_datacollect'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('P2b save after win: 1-0 stars>=1 plays>=1',
              bool(saved) and saved['stars'] >= 1 and saved['plays'] >= 1, str(saved))
        page.close()

        # ---------- P2 触摸目标双 viewport（真实页 verify 结束态无关，本页复用） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('vp: ' + str(e)))
        page.goto(URL)
        page.evaluate(preset_save())
        page.evaluate(STUB_VOICE)
        page.reload()
        page.wait_for_function('window.DC && window.DC.quiz', timeout=8000)
        page.evaluate('window.DC.dcStartNumeric(6)')     # flat6 dch2 → sum 数值题（4 卡在场）
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(900)                   # 等入场/朝向切换动画结束
            m = page.evaluate("""() => {
                const w = Math.max(document.documentElement.scrollWidth - innerWidth,
                                   document.documentElement.scrollWidth - document.documentElement.clientWidth);
                const cards = [...document.querySelectorAll('.ncard')].map(e => e.offsetWidth);
                const btnBad = [];
                document.querySelectorAll('button').forEach(b => {
                    if (b.classList.contains('k-parentbtn') || b.classList.contains('cell') ||
                        b.classList.contains('ncard')) return;
                    if (b.offsetWidth > 4 && b.offsetHeight > 4 &&
                        (b.offsetWidth < 36 || b.offsetHeight < 36)) btnBad.push(b.id || b.className);
                });
                return { ox: w, cardMin: cards.length ? Math.min.apply(null, cards) : 0, btnBad: btnBad };
            }""")
            check('P2 viewport %dx%d: ncard>=84(cardMin 96/84) & buttons>=36 & overflowX==0' % vp,
                  m['ox'] == 0 and len(m['btnBad']) == 0 and m['cardMin'] >= 84, str(m))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()
        browser.close()

    # ---------- P2c. 构建自检：clips 23 条 + dc_ 20 键 + 单文件完全离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('"data:audio/mpeg;base64,')
    dc_keys = set(re.findall(r'"(dc_[a-z0-9_]+)":"data:audio', html))
    check('P2c index.html clips: 23 data:audio (dc 20+core 3)', n_audio == 23, n_audio)
    check('P2c all 20 dc_* keys embedded', len(dc_keys) == 20, '%d/20' % len(dc_keys))
    check('P2c single file fully offline',
          'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- P2d. 截图非空白（PIL stdev>5） ----------
    for shot in ['tutorial_help.png', 'quiz_1280.png', 'celebrate.png', 'vp_800x1180.png']:
        ok, detail = png_nonblank(SHOTS / shot)
        check('P2d screenshot non-blank: ' + shot, ok, detail)

    check('P2 0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
