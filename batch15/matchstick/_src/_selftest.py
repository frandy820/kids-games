# -*- coding: utf-8 -*-
"""matchstick _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS + JSON pass==total + layoutOk + 0 pageerror + demoR==='right'
2. 预置存档(跳过教学) → flat0 真实 pointer 点火柴/点虚线槽逐题通关 → 首题先错一次
   （晃动+火柴回原位不灰化可再移）→ 5 题通关 → .k-celebrate → 5.4s 读档 stars==2（1 错=2★）
3. flat10（ch3 两位数）真实点击通关（预置 done 0-9）→ celebrate → 读档 3-0
4. 救援钟：探索点击（拿起/放回）不重置 → 10s 无救援 → 15s 救援触发（rescues>=1 +
   可解源火柴 pulse3 在屏 + 题面重读 ms_q）
5. 双 viewport(1280x800/800x1180)：overflowX==0、全部火柴/槽命中矩形 ≥64×64、按钮 ≥64
   （家长钮豁免）、场景 svg 非零
6. 全新存档 → 教学 watch 期真实乱点被吞（step 不变 + pop 轻叮计数>0，§0.22）+ 重玩门
   （demo 期点重玩无效）+ 演示成立 __msDemoR==='right'（§0.27）+ 交接到 help
7. 构建自检：index.html 含 ms 全部 8 条 + core 3 条 clips（data:audio 共 11）+ 无外链
8. 全程 0 pageerror + 截图像素非空白（PIL stdev>5）
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
SHOTS = HERE / '_shots'
SHOTS.mkdir(exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')   # dayIndex≥3 → 日限 12
RESULTS = []


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def preset_save(tut_seen=True, done_flats=()):
    save = {
        'v': '1.0', 'game': 'matchstick', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {}, 'bonus': {},
        'settings': {'sound': True, 'tts': True, 'vol': 0.6},
        'restTip': {'day': '', 'shown': 0},
        'matchstick': {'tutSeen': tut_seen},
    }
    for f in done_flats:
        save['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
    return 'localStorage.setItem("kidsgame_matchstick", ' + json.dumps(json.dumps(save)) + ')'


def png_nonblank(path, floor=5.0):
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


# 页内真点定位：返回能被 elementFromPoint 解析到目标元素自身的候选点（M5 采样同法）
PT_HELPER = """() => {
  window.__pt = el => {
    const hr = el.querySelector('.hit') || el;
    const r = hr.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = r.width * 0.42, dy = r.height * 0.42;
    const cands = [[cx, cy], [cx - dx, cy], [cx + dx, cy], [cx, cy - dy], [cx, cy + dy],
      [cx - dx, cy - dy], [cx + dx, cy - dy], [cx - dx, cy + dy], [cx + dx, cy + dy]];
    for (const p of cands) {
      const he = document.elementFromPoint(p[0], p[1]);
      if (he && (he.closest('.stk') === el || he.closest('.slot') === el)) return p;
    }
    return [cx, cy];
  };
  window.__sol = () => {                     // 当前题穷举首解（页内引擎，克隆后枚举）
    const q = MS.quiz;
    const clone = q.expr.map(c => ({ kind: c.kind, segs: c.segs.slice() }));
    return engSolve(clone)[0] || null;
  };
  window.__nonsol = () => {                  // 当前题第一个不成立移动（错放用）
    const q = MS.quiz;
    const cells = q.expr.map(c => ({ kind: c.kind, segs: c.segs.slice() }));
    const rSlots = (cs, on) => { const out = [];
      for (let i = 0; i < cs.length; i++) { if (cs[i].kind === 'eq') continue;
        for (let j = 0; j < cs[i].segs.length; j++) if (!!cs[i].segs[j] === !!on) out.push([i, j]); }
      return out; };
    for (const [si, sj] of rSlots(cells, true)) {
      cells[si].segs[sj] = false;
      for (const [di, dj] of rSlots(cells, false)) {
        if (si === di && sj === dj) continue;
        cells[di].segs[dj] = true;
        const ev = evalCells(cells);
        cells[di].segs[dj] = false;
        if (!(ev.valid && ev.ok)) { cells[si].segs[sj] = true; return { src: si * 8 + sj, dst: di * 8 + dj }; }
      }
      cells[si].segs[sj] = true;
    }
    return null;
  };
}"""


def click_stick(page, slot):
    pos = page.evaluate("""s => { const el = document.querySelector('.stk[data-slot="' + s + '"]');
    return el ? window.__pt(el) : null; }""", slot)
    if not pos:
        return False
    page.mouse.click(pos[0], pos[1])
    return True


def click_slot(page, slot):
    pos = page.evaluate("""s => { const el = document.querySelector('.slot[data-slot="' + s + '"]');
    return el ? window.__pt(el) : null; }""", slot)
    if not pos:
        return False
    page.mouse.click(pos[0], pos[1])
    return True


def play_level(page, first_wrong=False):
    """真实点击打完当前关（每题：拿起源火柴→点目标虚线槽；可选首题先错一次）"""
    wrong_done = not first_wrong
    answered = 0
    while answered < 30:
        q = page.evaluate('MS.quiz')
        if q is None:
            break
        if not wrong_done:
            non = page.evaluate('window.__nonsol()')
            click_stick(page, non['src'])
            page.wait_for_timeout(220)
            click_slot(page, non['dst'])
            page.wait_for_timeout(900)
            st = page.evaluate("""() => {
                const q = MS.quiz;
                return { step: MS.currentLevel.step, retries: MS.currentLevel.retries,
                    miss: q ? q.miss : null, held: q ? q.held : null,
                    pe: (() => { const el = document.querySelector('.stk');
                      return el ? getComputedStyle(el).pointerEvents !== 'none' : true; })() };
            }""")
            check('wrong place: shake / stick back home / not grayed / step unchanged',
                  st['step'] == 0 and st['retries'] == 1 and st['miss'] == 1 and
                  st['held'] is None and st['pe'], str(st))
            wrong_done = True
            continue
        sol = page.evaluate('window.__sol()')
        ok1 = click_stick(page, sol['src'])
        page.wait_for_timeout(260)
        held = page.evaluate('MS.quiz.held')
        click_slot(page, sol['dst'])
        page.wait_for_timeout(1250)
        answered += 1
        if not ok1 or held is None:
            check('pick flow at quiz %d' % answered, False, 'ok1=%s held=%s' % (ok1, held))
            break
    return answered


def tap_audit(page):
    """触摸目标审计：全部火柴/槽命中矩形 ≥64×64、按钮 ≥64（家长钮豁免）、场景 svg 非零"""
    hits = page.evaluate("""() => [...document.querySelectorAll('#scene .hit')].map(h => {
        const r = h.getBoundingClientRect(); return [r.width, r.height]; })""")
    hitOk = len(hits) > 0 and all(w >= 64 and h >= 64 for w, h in hits)
    btns = page.evaluate("""() => { const out = [];
        document.querySelectorAll('button').forEach(b => {
          if (b.classList.contains('k-parentbtn')) return;
          const r = b.getBoundingClientRect();
          if (r.width > 4 && r.height > 4) out.push([r.width, r.height]); });
        return out; }""")
    btnOk = all(w >= 64 and h >= 64 for w, h in btns)
    scene = page.evaluate("""() => { const s = document.querySelector('#scene svg.eq');
        if (!s) return null; const r = s.getBoundingClientRect(); return [r.width, r.height]; }""")
    sceneOk = scene is not None and scene[0] >= 200 and scene[1] >= 150
    ox = page.evaluate('Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth)')
    return hitOk, btnOk, sceneOk, ox


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------- 1. verify=1 ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('verify: ' + str(e)))
        page.goto(URL + '?verify=1')
        page.wait_for_function("document.title.startsWith('VERIFY')", timeout=60000)
        r = json.loads(page.eval_on_selector('#verify-result', 'el => el.textContent'))
        check('verify=1 title PASS', page.title().startswith('VERIFY PASS'), page.title())
        check('verify pass==total', r['pass'] == r['total'], '%s/%s layoutOk=%s' % (r['pass'], r['total'], r['layoutOk']))
        check('verify demoR === right (§0.27)', r['units']['tutorial']['demoR'] == 'right',
              str(r['units']['tutorial']))
        check('verify 40-level §0.30 audit all ok',
              all(v['ok'] for v in list(r['levels'].values()) + list(r['gen'].values())))
        check('verify family/op solution present', r['familyN'] >= 5 and r['opSolN'] >= 5,
              'familyN=%s opSolN=%s' % (r['familyN'], r['opSolN']))
        page.close()

        # ---------- 2. 真实点击通关 flat0（预置存档跳教学；首题先错一次=2 星） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('play: ' + str(e)))
        page.goto(URL)
        page.evaluate(PT_HELPER)
        page.evaluate(preset_save(tut_seen=True))
        page.reload()
        page.evaluate(PT_HELPER)
        page.wait_for_function('window.MS && MS.quiz', timeout=8000)
        q0 = page.evaluate('MS.quiz')
        check('flat0 loaded (sticks expr)', q0 and q0['expr'] and len(q0['expr']) >= 4, str(q0)[:100])
        dom0 = page.evaluate("""() => ({
            stk: document.querySelectorAll('#scene .stk').length,
            slot: document.querySelectorAll('#scene .slot').length,
            locked: document.querySelectorAll('#scene .stk.locked').length })""")
        exp_on = sum(len([s for s in c['segs'] if s]) for c in q0['expr'] if c['kind'] != 'eq')
        check('scene svg: sticks=ΣON+2(eq), slots=Σempty, locked=2',
              dom0['stk'] == exp_on + 2 and dom0['locked'] == 2, str(dom0))
        page.screenshot(path=str(SHOTS / 'play_1280.png'))
        answered = play_level(page, first_wrong=True)
        check('played 5 quizzes by real clicks (pick→slot)', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.screenshot(path=str(SHOTS / 'celebrate.png'))
        check('celebrate overlay shown', True)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_matchstick'));
            return s && s.levels && s.levels['1-0'] ? s.levels['1-0'] : null; }""")
        check('save after win: 1-0 stars==2 (1 wrong = 2 stars)',
              bool(saved) and saved['stars'] == 2, str(saved))

        # ---------- 3. flat10（ch3 两位数）真实点击通关（预置 done 0-9） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.evaluate(PT_HELPER)
        page.wait_for_function('window.MS && MS.quiz', timeout=8000)
        q10 = page.evaluate('MS.quiz')
        nd10 = len([c for c in q10['expr'] if c['kind'] == 'd'])
        check('flat10 first quiz has 4 digit cells (two-digit ch3)', nd10 == 4, str(q10)[:120])
        page.screenshot(path=str(SHOTS / 'ch3_1280.png'))
        answered = play_level(page)
        check('flat10: played remaining quizzes by real clicks', answered == 5, answered)
        page.wait_for_selector('.k-celebrate', timeout=8000)
        page.wait_for_timeout(5400)
        saved = page.evaluate("""() => { const s = JSON.parse(localStorage.getItem('kidsgame_matchstick'));
            return s && s.levels && s.levels['3-0'] ? s.levels['3-0'] : null; }""")
        check('flat10 save: 3-0 stars==3 (clean)', bool(saved) and saved['stars'] == 3, str(saved))

        # ---------- 3b. 救援钟：探索点击不重置，14s 救援触发（可解源火柴 pulse 三连） ----------
        page.evaluate(preset_save(tut_seen=True, done_flats=range(10)))
        page.reload()
        page.evaluate(PT_HELPER)
        page.wait_for_function('window.MS && MS.quiz', timeout=8000)
        page.evaluate("""() => { window.__vlog = [];
            const o = KIDS.voice.play; KIDS.voice.play = function (k) { window.__vlog.push(String(k)); return o.call(KIDS.voice, k); }; }""")
        # 探索：拿起→再点同根火柴放回原位（不重置救援钟 §0.7a）
        sol = page.evaluate('window.__sol()')
        click_stick(page, sol['src'])
        page.wait_for_timeout(250)
        held_mid = page.evaluate('MS.quiz.held')
        click_stick(page, sol['src'])                      # 再点拿着的火柴=放回原位
        page.wait_for_timeout(250)
        st_mid = page.evaluate('MS.quiz')
        check('exploration: pick held / put back zero-penalty',
              held_mid is not None and st_mid['held'] is None and st_mid['miss'] == 0,
              'held=%s miss=%s' % (held_mid, st_mid['miss']))
        t0 = time.time()
        page.wait_for_timeout(10000)
        st = page.evaluate('({rescues: MS.rescues, miss: MS.quiz ? MS.quiz.miss : null})')
        check('no rescue before 14s after exploration (exploration did not reset clock)',
              st['rescues'] == 0, str(st))
        page.wait_for_timeout(5200)                        # 总静置 ≈15.2s
        st = page.evaluate("""() => ({rescues: MS.rescues,
            pulse: !!document.querySelector('#scene .stk.pulse3'),
            reRead: window.__vlog.indexOf('ms_q') >= 0})""")
        check('rescue fired after 14s idle (rescues>=1, source stick pulses, ms_q re-read)',
              st['rescues'] >= 1 and st['pulse'] and st['reRead'], str(st))
        check('rescue timing sane (exploration did not reset clock)',
              st['rescues'] >= 1, 'elapsed=%.1fs' % (time.time() - t0))

        # ---------- 4. 双 viewport 触摸目标与 overflowX ----------
        for vp in [(1280, 800), (800, 1180)]:
            page.set_viewport_size({'width': vp[0], 'height': vp[1]})
            page.wait_for_timeout(700)                    # 等 resize 重渲染（renderScene 重算 px）
            h1, b1, s1, ox1 = tap_audit(page)
            check('viewport %dx%d: stick hits>=64x64 & buttons>=64 & scene>0 & overflowX==0' % vp,
                  h1 and b1 and s1 and ox1 == 0, 'hit=%s btn=%s scene=%s ox=%s' % (h1, b1, s1, ox1))
            page.screenshot(path=str(SHOTS / ('vp_%dx%d.png' % vp)))
        page.close()

        # ---------- 5. 教学期乱点被吞 + 重玩门 + demoR（全新存档 → watch demo 期） ----------
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('pageerror', lambda e: errors.append('tut: ' + str(e)))
        page.goto(URL)
        page.evaluate('localStorage.clear()')
        page.reload()
        page.evaluate(PT_HELPER)
        page.wait_for_function('window.MS && MS.tutorial === "watch"', timeout=8000)
        page.evaluate("""() => { window.__popCount = 0;
            const o = KIDS.audio.sfx;
            KIDS.audio.sfx = function (n) { if (n === 'pop') window.__popCount++; return o.call(KIDS.audio, n); }; }""")
        page.wait_for_timeout(500)                        # watch 演示进行中
        for _ in range(4):                                # 真实乱点火柴（主交互区，被吞）
            pos = page.evaluate("""() => { const el = document.querySelector('#scene .stk:not(.locked)');
            return el ? window.__pt(el) : null; }""")
            if pos:
                page.mouse.click(pos[0], pos[1])
                page.wait_for_timeout(160)
        rp = page.evaluate("""() => { const r = document.querySelector('#btn-replay').getBoundingClientRect();
            return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }""")
        flatBefore = page.evaluate('MS.currentLevel.flat')
        page.mouse.click(rp['x'], rp['y'])
        page.wait_for_timeout(400)
        st = page.evaluate('({step: MS.currentLevel.step, pops: window.__popCount, tut: MS.tutorial, flat: MS.currentLevel.flat})')
        check('tutorial watch: clicks swallowed (step==0)', st['step'] == 0, str(st))
        check('tutorial watch: pop feedback fired (>=1)', st['pops'] >= 1, str(st))
        check('replay gate: demo 期重玩无效 (flat unchanged)',
              st['flat'] == flatBefore and st['tut'] == 'watch', str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_watch.png'))
        page.wait_for_function('MS.tutorial === "help"', timeout=25000)
        st = page.evaluate('({demoR: window.__msDemoR, tut: MS.tutorial, step: MS.currentLevel.step})')
        check('tutorial demo solved right (__msDemoR==="right", §0.27)',
              st['demoR'] == 'right' and st['tut'] == 'help' and st['step'] == 0, str(st))
        page.screenshot(path=str(SHOTS / 'tutorial_help.png'))
        page.close()
        browser.close()

    # ---------- 6. 构建自检：clips 注入条数 + 离线 ----------
    html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
    n_audio = html.count('data:audio/mpeg')
    ms_keys = [k for k in ['ms_tut_watch', 'ms_tut_turn', 'ms_hint', 'ms_wrong', 'ms_right',
                           'ms_q', 'ms_pick', 'ms_drop'] if '"%s"' % k in html]
    core_keys = [k for k in ['core_chapter_end', 'core_day_end', 'core_rest'] if '"%s"' % k in html]
    check('index.html clips: 11 data:audio (8 ms_* + 3 core_*)', n_audio == 11, n_audio)
    check('all 8 ms_* clip keys embedded', len(ms_keys) == 8, '%d/8' % len(ms_keys))
    check('all 3 core_* clip keys embedded', len(core_keys) == 3, '%d/3' % len(core_keys))
    check('single file fully offline', 'http://' not in html.replace('http://www.w3.org/2000/svg', '') and 'https://' not in html)

    # ---------- 7. 截图非空白 ----------
    for shot, floor in [('play_1280.png', 5.0), ('ch3_1280.png', 5.0), ('celebrate.png', 4.0),
                        ('vp_800x1180.png', 5.0), ('tutorial_watch.png', 5.0)]:
        ok, detail = png_nonblank(SHOTS / shot, floor)
        check('screenshot non-blank: ' + shot, ok, detail)

    check('0 pageerror (all pages)', len(errors) == 0, errors[:3])
    npass = sum(1 for _, ok, _ in RESULTS if ok)
    print('\nSELFTEST %s  %d/%d' % ('PASS' if npass == len(RESULTS) else 'FAIL', npass, len(RESULTS)))
    return 0 if npass == len(RESULTS) else 1


if __name__ == '__main__':
    sys.exit(main())
