# -*- coding: utf-8 -*-
"""t4_play.py — batch4 三款游戏 7.5 岁人设试玩 harness（纯 DOM 断言，独立 chromium.launch）
用法: python t4_play.py clock|times|sudoku
观察数据落盘 shots/t4_<game>_obs.json + t4_<game>_NN_tag.png
"""
import json, math, random, sys, time, traceback
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r'F:/claudecode/projects/active/kids-games/batch4')
SHOTS = ROOT / 'shots'
URI = {g: (ROOT / g / 'index.html').as_uri() for g in ('clock', 'times', 'sudoku')}
HOOK = {'clock': 'CLK', 'times': 'TIM', 'sudoku': 'SUD'}
random.seed(20260906)

INIT_JS = r"""
window.__errs = [];
window.addEventListener('error', function(e){ window.__errs.push({wall: Date.now(), m: String(e.message||'').slice(0,220), src: String(e.filename||'')+':'+(e.lineno||0)}); });
window.addEventListener('unhandledrejection', function(e){ window.__errs.push({wall: Date.now(), m: 'rejection:' + String(e.reason).slice(0,220)}); });
"""

PATCH_JS = r"""
(() => {
  if (window.__patched) return;
  window.__patched = true;
  window.__voices = []; window.__sfx = [];
  try {
    const vp = KIDS.voice.play.bind(KIDS.voice);
    KIDS.voice.play = function(k, txt){ window.__voices.push({wall: Date.now(), key: k || '(tts)', text: String(txt||'').slice(0,60)}); return vp(k, txt); };
    const vq = KIDS.voice.queue.bind(KIDS.voice);
    KIDS.voice.queue = function(parts){ try { window.__voices.push({wall: Date.now(), key: 'queue:' + parts.map(function(p){return typeof p==='string'?p:(p&&p.key);}).join('+'), text: parts.map(function(p){return (p&&p.text)||'';}).join('').slice(0,60)}); } catch(e){} return vq(parts); };
  } catch(e) { window.__patchErr1 = String(e); }
  try {
    const af = KIDS.audio.sfx.bind(KIDS.audio);
    KIDS.audio.sfx = function(n){ window.__sfx.push({wall: Date.now(), n: n}); return af(n); };
  } catch(e) { window.__patchErr2 = String(e); }
})();
"""

SNAP = r"""
(game) => {
  const q = s => document.querySelector(s), qa = s => Array.from(document.querySelectorAll(s));
  const ov = q('.k-ov');
  const out = { wall: Date.now(),
    ov: ov ? {cls: String(ov.className), text: ov.innerText.replace(/\s+/g,' ').slice(0,80)} : null,
    ghost: (() => { const g = q('#ghost'); return g ? {show: g.classList.contains('show'), pressing: g.classList.contains('pressing'), x: Math.round(parseFloat(g.style.left)||0), y: Math.round(parseFloat(g.style.top)||0)} : null; })(),
    ghostAt: (() => { const g = q('#ghost'); if (!g || !g.classList.contains('show')) return null;
      const x = parseFloat(g.style.left)||0, y = parseFloat(g.style.top)||0;
      const sels = ['#answers .opt', '#fish-grid .fish-btn', '#aid .aid-ans', '#clock-zone .clock-card', '#btn-groups', '#btn-hint', '#animals .abtn', '#board .cell'];
      for (const s of sels) for (const e of qa(s)) { const r = e.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s + '[' + (e.dataset.i || e.dataset.a || '') + ']'; }
      return 'none'; })(),
    errs: (window.__errs || []).length };
  if (game === 'clock') {
    out.hk = window.CLK ? { level: CLK.currentLevel, quiz: CLK.quiz, tut: CLK.tutorial } : null;
    out.opts = qa('#answers .opt').map(e => ({i: e.dataset.i, txt: e.textContent, cls: String(e.className)}));
    out.cards = qa('#clock-zone .clock-card').map(c => { const h = c.querySelector('.clk-h'), m = c.querySelector('.clk-m'); const r = c.getBoundingClientRect();
      return {cls: String(c.className), w: Math.round(r.width), hrot: h ? h.getAttribute('transform') : null, mrot: m ? m.getAttribute('transform') : null}; });
    const ro = q('#dial-readout');
    out.readout = {show: ro.classList.contains('show'), ok: ro.classList.contains('ok'), txt: ro.textContent};
    const ch = q('#prompt-chip');
    out.chip = {show: ch.classList.contains('show'), txt: ch.textContent.trim().slice(0,44)};
    out.dots = {step: qa('#step-dots i').map(e=>String(e.className)), ch: qa('#chapter-dots i').map(e=>String(e.className))};
  } else if (game === 'times') {
    out.hk = window.TIM ? { level: TIM.currentLevel, quiz: TIM.quiz, tut: TIM.tutorial } : null;
    out.fish = qa('#fish-grid .fish-btn').map(e => ({i: e.dataset.i, v: (e.querySelector('.bubble')||{textContent:''}).textContent, cls: String(e.className)}));
    const aid = q('#aid');
    out.aid = {open: aid.classList.contains('open'), title: (q('#aid .aid-title')||{textContent:''}).textContent,
      groupsLit: qa('#aid .a-group.lit').length,
      ansPulse: qa('#aid .aid-ans.pulse').map(e=>e.dataset.i), ansWrong: qa('#aid .aid-ans.wrong').map(e=>e.dataset.i),
      ans: qa('#aid .aid-ans').map(e=>({i:e.dataset.i, v:e.textContent}))};
    const cv = q('#convert');
    out.convert = {show: cv.classList.contains('show'), last: cv.dataset.last || null, txt: cv.textContent.trim().slice(0,44)};
    out.quizTxt = (q('#quiz-text')||{textContent:''}).textContent;
    const gb = q('#btn-groups');
    out.groupsBtn = gb ? (function(){ const r = gb.getBoundingClientRect(); return {vis: r.width>0, cls: String(gb.className)}; })() : null;
    out.dots = {step: qa('#step-dots i').map(e=>String(e.className)), ch: qa('#chapter-dots i').map(e=>String(e.className))};
  } else {
    out.hk = window.SUD ? { level: SUD.currentLevel, tut: SUD.tutorial } : null;
    out.bd = window.SUD ? SUD.board : null;
    out.pulseCells = qa('#board .cell.pulse').map(e=>Number(e.dataset.i));
    out.pulseAbtn = qa('#animals .abtn.pulse').map(e=>Number(e.dataset.a));
    out.sel = qa('#board .cell.sel').map(e=>Number(e.dataset.i));
    out.conflict = qa('#board .cell.conflict').map(e=>Number(e.dataset.i));
    out.filled = (out.bd ? out.bd.cells : []).map(function(v,i){return v>=0?i:-1;}).filter(function(i){return i>=0;});
    out.abtnCls = qa('#animals .abtn').map(e=>String(e.className));
    out.lamps = qa('#hint-lamps i').map(e=>String(e.className));
    const fc = q('#board .cell');
    out.cellW = fc ? Math.round(fc.getBoundingClientRect().width) : 0;
    const hb = q('#btn-hint');
    out.hintBtn = hb ? {spent: hb.classList.contains('spent')} : null;
    out.dots = qa('#chapter-dots i').map(e=>String(e.className));
  }
  return out;
}
"""

FMT = lambda m: ('12' if m // 60 == 0 else str(m // 60)) + ':' + str(m % 60).zfill(2)
def mirror_of(m):
    return ((m // 60 + 1) * 60 + (60 - m % 60)) % 720

class Session:
    def __init__(self, browser, game, viewport):
        self.game, self.hook = game, HOOK[game]
        self.ctx = browser.new_context(viewport={'width': viewport[0], 'height': viewport[1]})
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(8000)
        self.page.add_init_script(INIT_JS)
        self.page.on('pageerror', lambda e: self.ev('pageerror', str(e)))
        self.t0 = time.time()
        self.timeline = []
        self.stats = {'levelsPlayed': [], 'questions': 0, 'wrongs': 0, 'idles': [], 'pageerrors': []}
        self._shot = 0
        self.acc = {'voices': [], 'sfx': [], 'errs': []}

    def harvest(self):
        """window.* 数组不跨导航——换页前收割到 Python 累积"""
        try:
            o = self.page.evaluate("() => ({voices: window.__voices||[], sfx: window.__sfx||[], errs: window.__errs||[]})")
            for k in ('voices', 'sfx', 'errs'): self.acc[k].extend(o.get(k, []))
        except Exception:
            pass

    def ev(self, kind, detail=''):
        self.timeline.append({'wall': round(time.time() - self.t0, 2), 'kind': kind, 'd': detail})

    def goto(self, save=None):
        self.harvest()
        if save is not None:
            self.page.evaluate("([k, s]) => localStorage.setItem(k, s)", ['kidsgame_' + self.game, json.dumps(save)])
        self.page.goto(URI[self.game], wait_until='load')
        self.page.evaluate(PATCH_JS)
        self.page.wait_for_timeout(400)

    def read_save(self):
        raw = self.page.evaluate("k => localStorage.getItem(k)", ['kidsgame_' + self.game])
        return json.loads(raw) if raw else None

    def jump_save(self, done_flats, keep_clock=None):
        sv = self.read_save() or {}
        today = date.today().isoformat()
        sv.update({'v': '1.0', 'game': self.game,
                   'firstDay': (date.today() - timedelta(days=3)).isoformat(), 'lastDay': today,
                   'levels': sv.get('levels', {}), 'dailyMin': sv.get('dailyMin', {}),
                   'settings': sv.get('settings', {'sound': True, 'tts': True, 'vol': 0.6}),
                   'restTip': {'day': '', 'shown': 0}, 'bonus': {today: 12}})
        for f in done_flats:
            sv['levels']['%d-%d' % (f // 5 + 1, f % 5)] = {'stars': 3, 'plays': 1}
        if keep_clock: sv.update(keep_clock)
        self.goto(save=sv)

    def snap(self, tag):
        s = self.page.evaluate(SNAP, self.game)
        self.timeline.append({'wall': round(time.time() - self.t0, 2), 'kind': 'snap', 'tag': tag, 's': s})
        return s

    def shot(self, tag):
        self._shot += 1
        p = SHOTS / ('t4_%s_%02d_%s.png' % (self.game, self._shot, tag))
        try: self.page.screenshot(path=str(p))
        except Exception as e: self.ev('shot_fail', '%s %s' % (tag, e))

    def think(self, lo=1.0, hi=2.4):
        self.page.wait_for_timeout(int(random.uniform(lo, hi) * 1000))

    def hook_level(self):
        return self.page.evaluate("h => window[h] ? window[h].currentLevel : null", self.hook)

    def hook_quiz(self):
        return self.page.evaluate("h => window[h] ? window[h].quiz : null", self.hook)

    def wait_level(self, flat, timeout=15):
        t0 = time.time()
        while time.time() - t0 < timeout:
            lv = self.hook_level()
            if lv and lv.get('flat') == flat: return True
            self.page.wait_for_timeout(300)
        return False

    def wait_step(self, step, timeout=8):
        t0 = time.time()
        while time.time() - t0 < timeout:
            lv = self.hook_level()
            if lv and lv.get('step') == step: return True
            self.page.wait_for_timeout(200)
        return False

    def wait_win(self, timeout=8):
        t0 = time.time()
        while time.time() - t0 < timeout:
            lv = self.hook_level()
            if lv and lv.get('won'): return True
            self.page.wait_for_timeout(250)
        return False

    def wait_unlock(self, timeout=6):
        """等 UI 解锁（times 的 sum 型答案有 780+1650ms 演出，期间点击被静默吞掉）"""
        t0 = time.time()
        while time.time() - t0 < timeout:
            lv = self.hook_level()
            if lv and not lv.get('locked'): return True
            self.page.wait_for_timeout(200)
        return False

    def click(self, sel):
        try:
            self.page.click(sel, timeout=6000)
            return True
        except Exception as e:
            self.ev('click_fail', '%s :: %s' % (sel, str(e).split('\n')[0][:120]))
            return False

    def idle_probe(self, label, secs):
        self.ev('idle_start', label)
        self.page.wait_for_timeout(2800)   # 先等答题演出结束（sum 型答案动画 780+1650ms），避免动画边界污染变化检测
        strip = lambda s: json.dumps({k: v for k, v in s.items() if k != 'wall'}, ensure_ascii=False, sort_keys=True)
        v0, s0 = self.voice_count(), strip(self.snap('idle_%s_t0' % label))
        samples = []
        for i in range(int(secs / 2)):
            self.page.wait_for_timeout(2000)
            s = self.snap('idle_%s_t+%ds' % (label, (i + 1) * 2))
            v = self.voice_count()
            samples.append({'t': (i + 1) * 2, 'voices': v - v0, 'changed': strip(s) != s0})
        end = self.snap('idle_%s_end' % label)
        rescue = 'none' if all(x['voices'] == 0 and not x['changed'] for x in samples) else 'something'
        self.stats['idles'].append({'at': label, 'secs': secs, 'rescue': rescue,
                                    'voiceCalls': max([x['voices'] for x in samples] or [0]), 'domChanged': any(x['changed'] for x in samples)})
        self.ev('idle_end', '%s rescue=%s' % (label, rescue))
        return rescue, end

    def voice_count(self):
        return self.page.evaluate("() => (window.__voices||[]).length")

    def collect(self):
        self.harvest()
        try:
            patchErr = self.page.evaluate("() => [window.__patchErr1||null, window.__patchErr2||null]")
        except Exception:
            patchErr = ['collect-fail']
        obs = dict(self.acc); obs['patchErr'] = patchErr
        out = {'game': self.game, 'wallSec': round(time.time() - self.t0, 1),
               'stats': self.stats, 'obs': obs, 'timeline': self.timeline}
        (SHOTS / ('t4_%s_obs.json' % self.game)).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
        return out

# ============================ CLOCK ============================
def run_clock(browser):
    S = Session(browser, 'clock', (1280, 800))
    print('[clock] A: fresh + tutorial')
    S.goto()
    # -- 教学"看"：自动演示（~4s）--
    for t, tag in [(800, 'tut_watch_early'), (1600, 'tut_watch_ghost'), (2600, 'tut_watch_press'), (3600, 'tut_watch_pick')]:
        S.page.wait_for_timeout(t if tag == 'tut_watch_early' else 800)
        S.snap(tag)
    S.shot('tut_watch')
    # 演示中人设乱点（应被 demo 锁住，无反应）
    before = S.hook_level()
    q = S.hook_quiz()
    if q:
        S.page.mouse.click(*center_of(S.page, '#answers .opt'))
    S.page.wait_for_timeout(400)
    after = S.hook_level()
    S.ev('tut_watch_tap_during_demo', 'step %s->%s (locked ok)' % (before and before.get('step'), after and after.get('step')))
    # -- 教学"帮"：幽灵手指指正确按钮 --
    S.page.wait_for_timeout(1200)
    s = S.snap('tut_help_ghost')
    S.shot('tut_help')
    ghost_help = bool(s['ghost'] and s['ghost']['show'])
    # 人设跟着手指点
    S.think(1.2, 2.0)
    q = S.hook_quiz()
    if q:
        S.click('#answers .opt[data-i="%d"]' % q['answer'])
        S.page.wait_for_timeout(900)
        s = S.snap('tut_help_followed')
        S.ev('tut_solo_entered', 'tut=%s' % s['hk']['tut'])
    # -- 1-0 独立完成（人设会整点半点）--
    for qi in range(1, 5):
        S.think()
        q = S.hook_quiz()
        if not q: break
        if qi == 1:
            S.idle_probe('1-0_q2_thinking', 21)
        if qi == 2:
            # 双击习惯：快速连点两下正确键（第二下应落在锁定态，无副作用）
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
            S.page.mouse.click(*center_of(S.page, '#answers .opt[data-i="%d"]' % q['answer']))
            S.page.wait_for_timeout(300)
            s = S.snap('q3_doubleclick_during_lock')
        else:
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        S.wait_step(q['step'] + 1)
    S.snap('level_1_0_win_anim')
    S.page.wait_for_timeout(3300)
    s = S.snap('after_1_0')
    S.shot('celebrate_1_0' if s['ov'] else 'after_1_0')
    S.page.wait_for_timeout(2500)
    S.stats['levelsPlayed'].append({'flat': 0, 'questions': 5})

    print('[clock] B: 1-1 with deliberate hour-hand confusion')
    ok = S.wait_level(1)
    S.ev('auto_proceed_flat1', str(ok))
    for qi in range(5):
        S.think()
        q = S.hook_quiz()
        if not q: break
        wrong_i = None
        if qi == 1:  # 时针近邻混淆（人设把 3:00 读成 4:00 这类）
            H = q['clockMin'] // 60; mm = q['clockMin'] % 60
            for d in (1, -1):
                t = FMT(((H + d) % 12) * 60 + mm)
                for i, txt in enumerate(q['items']):
                    if txt == t and i != q['answer']: wrong_i = i
        if wrong_i is not None:
            S.click('#answers .opt[data-i="%d"]' % wrong_i)
            S.page.wait_for_timeout(700)
            s = S.snap('B_wrong_feedback')
            S.shot('wrong_feedback_flat1')
            S.think(1.6, 2.8)
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        else:
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        S.wait_step(q['step'] + 1)
    S.page.wait_for_timeout(5800)
    S.stats['levelsPlayed'].append({'flat': 1, 'questions': 5})

    print('[clock] C: jump flat5 (ch2 镜像)')
    S.jump_save(list(range(5)))
    ok = S.wait_level(5)
    s = S.snap('C_flat5_loaded')
    S.ev('jump_flat5', 'ok=%s dch=%s' % (ok, s['hk']['level'].get('ch')))
    mirror_hits = 0
    for qi in range(5):
        q = S.hook_quiz()
        if not q: break
        mm = q['clockMin'] % 60
        mirror_txt = FMT(mirror_of(q['clockMin']))
        mirror_i = next((i for i, t in enumerate(q['items']) if t == mirror_txt and i != q['answer']), None)
        # 人设模型：分针在左半区(25-55)会先犯镜像错
        if mirror_i is not None and 25 <= mm <= 55:
            mirror_hits += 1
            S.think(2.4, 3.8)
            v0 = S.voice_count()
            S.click('#answers .opt[data-i="%d"]' % mirror_i)
            S.page.wait_for_timeout(800)
            s = S.snap('C_mirror_wrong_q%d' % qi)
            vdelta = S.voice_count() - v0
            S.ev('C_mirror_wrong', 'q%d voices_delta=%d (flat>=3 语音应哑)' % (qi, vdelta))
            S.shot('mirror_wrong_flat5')
            S.think(1.8, 3.0)
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        else:
            S.think(2.2, 3.6)
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        S.wait_step(q['step'] + 1)
        if qi == 1:
            S.idle_probe('flat5_q3_stuck', 24)
            # 静置后按小兔子求助
            S.click('#btn-rabbit'); S.page.wait_for_timeout(600)
            S.snap('flat5_rabbit_pressed')
            S.click('#btn-hear'); S.page.wait_for_timeout(600)
            S.snap('flat5_hear_pressed')
    S.page.wait_for_timeout(5800)
    S.stats['levelsPlayed'].append({'flat': 5, 'questions': 5, 'mirrorErrors': mirror_hits})

    print('[clock] D: jump flat10 (ch3 拨针, 首进演示)')
    S.jump_save(list(range(10)))
    ok = S.wait_level(10)
    # 拨针教学演示（读数步进 5 分钟）
    for i in range(7):
        S.page.wait_for_timeout(600)
        S.snap('D_dialdemo_%d' % i)
    S.shot('dial_demo')
    s = S.snap('D_dialdemo_end')
    S.ev('dial_demo', 'readout=%s tut=%s ghost=%s' % (s['readout']['txt'], s['hk']['tut'], s['ghost']))
    # 帮阶段：手指指钟面
    S.page.wait_for_timeout(1000)
    s = S.snap('D_dial_help')
    for qi in range(5):
        q = S.hook_quiz()
        if not q: break
        target = q.get('targetMin', q['clockMin'] % 60)
        if qi == 0:
            drag_dial(S, target, 'overshoot')   # 人设拖过冲
            S.page.wait_for_timeout(800)
            s = S.snap('D_dial_overshoot_wrong')
            S.shot('dial_overshoot')
            S.think(1.6, 2.6)
            drag_dial(S, target, 'ok')
        elif qi == 3:
            drag_dial(S, (target + 10) % 60, 'wrong_release')
            S.page.wait_for_timeout(800)
            S.snap('D_dial_wrong_q4')
            S.think(1.5, 2.5)
            drag_dial(S, target, 'ok')
        else:
            S.think(2.0, 3.2)
            drag_dial(S, target, 'ok')
        S.wait_step(q['step'] + 1, timeout=8)
        if qi == 1:
            S.idle_probe('flat10_dial_stuck', 22)
    S.page.wait_for_timeout(3000)
    s = S.snap('D_after_flat10')
    S.stats['levelsPlayed'].append({'flat': 10, 'questions': 5})

    print('[clock] E: jump flat15 (ch4 经过时间)')
    S.jump_save(list(range(15)))
    ok = S.wait_level(15)
    s = S.snap('E_flat15_loaded')
    S.shot('elapsed_question')
    for qi in range(3):
        q = S.hook_quiz()
        if not q: break
        dur = q.get('dur')
        wrong_i = None
        if qi == 0 and dur:
            for i, t in enumerate(q['items']):
                n = int(t.replace('分钟', '')) if '分钟' in t else None
                if n is not None and i != q['answer'] and abs(n - dur) == 5: wrong_i = i
        if wrong_i is not None:
            S.think(2.6, 4.0)
            v0 = S.voice_count()
            S.click('#answers .opt[data-i="%d"]' % wrong_i)
            S.page.wait_for_timeout(800)
            S.snap('E_elapsed_wrong')
            S.ev('E_wrong_voice_delta', str(S.voice_count() - v0))
            S.think(2.0, 3.2)
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        else:
            S.think(2.8, 4.2)
            S.click('#answers .opt[data-i="%d"]' % q['answer'])
        S.wait_step(q['step'] + 1)
    S.idle_probe('flat15_stuck', 22)
    S.snap('E_end')
    S.stats['levelsPlayed'].append({'flat': 15, 'questions': 3})
    # 汇总题数/错误数
    for lv in S.stats['levelsPlayed']:
        S.stats['questions'] += lv.get('questions', 0)
    return S

def center_of(page, sel):
    return page.evaluate("""(s) => { const e = document.querySelector(s); if (!e) return null;
        const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }""", sel)

def drag_dial(S, target_min, mode):
    geo = S.page.evaluate("""() => { const s = document.querySelector('#clock-zone .clock-card svg.clock');
        const r = s.getBoundingClientRect(); return {cx: r.left+r.width/2, cy: r.top+r.height/2, R: r.width*0.38}; }""")
    pt = lambda m: (geo['cx'] + math.sin(math.radians(m * 6)) * geo['R'], geo['cy'] - math.cos(math.radians(m * 6)) * geo['R'])
    S.page.mouse.move(*pt(0)); S.page.mouse.down()
    for m in (target_min * 0.4, target_min * 0.75):
        S.page.mouse.move(*pt(m)); S.page.wait_for_timeout(90)
    if mode in ('overshoot', 'wrong_release'):
        over = (target_min + 15) % 60
        S.page.mouse.move(*pt(over)); S.page.wait_for_timeout(280)
        S.snap('dial_hold_at_%d(target %d)' % (over, target_min))
        S.page.mouse.up(); return
    S.page.mouse.move(*pt(target_min)); S.page.wait_for_timeout(320)
    S.page.mouse.up()

# ============================ TIMES ============================
def tim_wrong_pref(q):
    """人设偏好干扰：近邻积 > a+b 混淆 > 其它"""
    items, ans, a, b = q['items'], q['answerIdx'], q.get('a'), q.get('b')
    prefs = []
    if a is not None and b is not None:
        prefs = [(a + 1) * b, a * (b + 1), (a - 1) * b, a * (b - 1), a + b, (a + 2) * b]
    for pv in prefs:
        for i, v in enumerate(items):
            if i != ans and v == pv: return i
    for i, v in enumerate(items):
        if i != ans: return i
    return None

def run_times(browser):
    S = Session(browser, 'times', (1280, 800))
    print('[times] A: fresh + tutorial')
    S.goto()
    for t in range(8):
        S.page.wait_for_timeout(900)
        S.snap('tut_watch_%d' % t)
        if t == 3: S.shot('tut_watch')
    s = S.snap('tut_end_help')
    S.ev('tut_end', 'tut=%s ghost=%s convert=%s' % (s['hk']['tut'], s['ghost'], s['convert']))
    # 帮：手指指"看一看"。人设跟手指点开分组图
    S.think(1.2, 2.0)
    S.click('#btn-groups')
    S.page.wait_for_timeout(500)
    s = S.snap('A_help_groups_opened')
    S.shot('tut_help_aid')
    S.ev('help_stage_target', 'ghost was at groupsBtn=%s, now ghost=%s' % (ghost_help_target(s), s['ghost']))
    q = S.hook_quiz()
    if q:
        S.think(2.0, 3.0)  # 数鱼
        S.click('#aid .aid-ans[data-i="%d"]' % q['answerIdx'])
        S.page.wait_for_timeout(900)
        s = S.snap('A_help_answered')
        S.ev('tut_solo_entered', 'tut=%s' % s['hk']['tut'])
    for qi in range(1, 5):
        S.think()
        S.wait_unlock()
        q = S.hook_quiz()
        if not q: break
        if qi == 2:  # 故意错误路径：口诀混淆（3×4 挑 3+4 之类）
            wi = tim_wrong_pref(q)
            v0 = S.voice_count()
            S.click('#fish-grid .fish-btn[data-i="%d"]' % wi)
            S.page.wait_for_timeout(900)
            s = S.snap('A_wrong_q3')
            S.shot('wrong_aid_autoopen')
            S.ev('A_wrong', 'voices_delta=%d aidOpen=%s aidPulse=%s fishPulse=%s' % (
                S.voice_count() - v0, s['aid']['open'], s['aid']['ansPulse'], [f['i'] for f in s['fish'] if 'pulse' in f['cls']]))
            S.think(1.8, 2.8)
            S.click('#aid .aid-ans[data-i="%d"]' % q['answerIdx'])
        else:
            if qi == 3:
                S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
                S.page.mouse.click(*center_of(S.page, '#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx']))
            else:
                S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        S.wait_step(q['step'] + 1)
        if qi == 1:
            S.idle_probe('flat0_q2', 21)
    S.page.wait_for_timeout(3000)
    s = S.snap('A_win')
    S.shot('celebrate_flat0')
    S.page.wait_for_timeout(2800)
    S.stats['levelsPlayed'].append({'flat': 0, 'questions': 5})

    print('[times] B: 1-1 with aidAuto probe')
    ok = S.wait_level(1)
    for qi in range(3):
        S.think()
        S.wait_unlock()
        q = S.hook_quiz()
        if not q: break
        if qi == 1:
            wi = tim_wrong_pref(q)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % wi)
            S.page.wait_for_timeout(800)
            s = S.snap('B_wrong_autoaid')
            # 人设(被自动亮起的救援吸引后)又按了一下"看一看"——面板不应关
            S.click('#btn-groups')
            S.page.wait_for_timeout(400)
            s2 = S.snap('B_groups_first_tap')
            S.ev('B_aidAuto_firsttap', 'aid still open=%s' % s2['aid']['open'])
            S.click('#btn-groups')
            S.page.wait_for_timeout(400)
            s3 = S.snap('B_groups_second_tap')
            S.ev('B_aid_secondtap', 'aid open=%s' % s3['aid']['open'])
            S.think(1.5, 2.5)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        else:
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        S.wait_step(q['step'] + 1)
    S.stats['levelsPlayed'].append({'flat': 1, 'questions': 3})

    print('[times] C: jump flat10 (×6×7)')
    S.jump_save(list(range(10)))
    ok = S.wait_level(10)
    s = S.snap('C_flat10_loaded')
    S.ev('C_loaded', 'groupsBtnVis=%s quiz=%s' % (s['groupsBtn'] and s['groupsBtn']['vis'], s['quizTxt'] if 'quizTxt' in s else ''))
    wrongs = 0
    for qi in range(5):
        S.wait_unlock()
        q = S.hook_quiz()
        if not q: break
        a, b = q.get('a'), q.get('b')
        hard = a in (6, 7) and b >= 6
        if qi == 0 or (hard and qi % 2 == 1):  # 人设 ×6×7 大因数不稳
            wi = tim_wrong_pref(q)
            S.think(2.8, 4.0)
            v0 = S.voice_count()
            S.click('#fish-grid .fish-btn[data-i="%d"]' % wi)
            wrongs += 1
            S.page.wait_for_timeout(900)
            s = S.snap('C_wrong_q%d' % qi)
            pulses = [f['i'] for f in s['fish'] if 'pulse' in f['cls']]
            S.ev('C_wrong', 'q%d voices_delta=%d answerRevealedByPulse=%s' % (qi, S.voice_count() - v0, pulses))
            S.think(1.8, 2.8)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        else:
            S.think(2.6, 3.8)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        S.wait_step(q['step'] + 1)
        if qi == 1:
            S.idle_probe('flat10_stuck', 24)
            S.click('#btn-rabbit'); S.page.wait_for_timeout(500)
            S.snap('flat10_rabbit')
    S.page.wait_for_timeout(5800)
    S.stats['levelsPlayed'].append({'flat': 10, 'questions': 5, 'wrongs': wrongs})

    print('[times] D: jump flat15 (×8×9+缺因数)')
    S.jump_save(list(range(15)))
    ok = S.wait_level(15)
    for qi in range(5):
        S.think()
        S.wait_unlock()
        q = S.hook_quiz()
        if not q: break
        if q['type'] == 'miss':
            # 人设第一反应：把已见的因数 a 当答案（干扰项里就有 a）
            wi = next((i for i, v in enumerate(q['items']) if v == q['a']), None)
            if wi is None: wi = tim_wrong_pref(q)
            S.think(2.8, 4.0)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % wi)
            S.page.wait_for_timeout(900)
            s = S.snap('D_miss_wrong')
            S.shot('miss_type_wrong')
            S.ev('D_miss_wrong', 'quiz=%s items=%s picked=%s(answer=%s)' % (q['text'], q['items'], q['items'][wi], q['answer']))
            S.think(2.0, 3.0)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        elif q.get('a') in (8, 9) and q.get('b', 0) >= 6:
            wi = tim_wrong_pref(q)
            S.think(2.8, 4.0)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % wi)
            S.page.wait_for_timeout(900)
            S.snap('D_89_wrong_q%d' % qi)
            S.think(1.8, 2.8)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        else:
            S.think(2.4, 3.6)
            S.click('#fish-grid .fish-btn[data-i="%d"]' % q['answerIdx'])
        S.wait_step(q['step'] + 1)
    S.idle_probe('flat15_stuck', 22)
    S.snap('D_end')
    for lv in S.stats['levelsPlayed']:
        S.stats['questions'] += lv.get('questions', 0)
        S.stats['wrongs'] += lv.get('wrongs', 0)
    return S

def ghost_help_target(s):
    return None

# ============================ SUDOKU ============================
def box_cells(i, n, boxR, boxC):
    r, c = divmod(i, n)
    br, bc = r // boxR, c // boxC
    return [rr * n + cc for rr in range(br * boxR, (br + 1) * boxR) for cc in range(bc * boxC, (bc + 1) * boxC)]

def candidates(cells, i, n, boxR, boxC):
    used = set()
    bx = set(box_cells(i, n, boxR, boxC))
    for j in range(n * n):
        if j != i and cells[j] >= 0 and (j // n == i // n or j % n == i % n or j in bx):
            used.add(cells[j])
    return [v for v in range(n) if v not in used]

SUD_MEASURE = r"""
() => {
  function boxOf(i, n, boxR, boxC){ const r=(i/n)|0, c=i%n, br=(r/boxR)|0, bc=(c/boxC)|0, out=[];
    for(let rr=br*boxR; rr<br*boxR+boxR; rr++) for(let cc=bc*boxC; cc<bc*boxC+boxC; cc++) out.push(rr*n+cc); return out; }
  const res = {};
  for (let flat=0; flat<20; flat++){
    const L = makeLevel(flat);
    const cells = L.cells.slice(); let singles=0, rounds=0;
    while (rounds++ < 40){
      let prog=false;
      for (let i=0;i<cells.length;i++){
        if (cells[i]>=0) continue;
        const used=new Set(), bx=new Set(boxOf(i,L.n,L.boxR,L.boxC));
        for (let j=0;j<cells.length;j++) if (j!==i&&cells[j]>=0&&(((j/L.n)|0)===((i/L.n)|0)||j%L.n===i%L.n||bx.has(j))) used.add(cells[j]);
        const cand=[...Array(L.n).keys()].filter(v=>!used.has(v));
        if (cand.length===1){ cells[i]=cand[0]; singles++; prog=true; }
      }
      if (!prog) break;
    }
    const rem = cells.filter(v=>v<0).length;
    res[flat] = { n: L.n, holes: L.holes, bySingles: rem === 0, remaining: rem };
  }
  return res;
}
"""

def run_sudoku(browser):
    S = Session(browser, 'sudoku', (820, 1180))
    print('[sudoku] pre-measure singles solvability')
    S.goto()
    meas = S.page.evaluate(SUD_MEASURE)
    six = {int(k): v for k, v in meas.items() if v['n'] == 6}
    four = {int(k): v for k, v in meas.items() if v['n'] == 4}
    S.stats['measure6x6'] = six
    print('  6x6 all singles-solvable:', all(v['bySingles'] for v in six.values()),
          ' 4x4:', all(v['bySingles'] for v in four.values()))

    print('[sudoku] A: tutorial')
    for t in range(5):
        S.page.wait_for_timeout(700)
        s = S.snap('tut_watch_%d' % t)
        if t == 1: S.shot('tut_conflict_demo')
    # 等"帮"手指出现（重发后 +700ms 才 pointGhost）
    help_s = None
    for _ in range(10):
        S.page.wait_for_timeout(400)
        s = S.snap('tut_help_poll')
        if s['pulseCells'] and s['pulseAbtn']:
            help_s = s; break
    if help_s:
        S.shot('tut_help_ghost')
        S.ev('tut_help', 'ghostAt=%s ghost=%s pulseCells=%s pulseAbtn=%s cellW=%s' % (
            help_s.get('ghostAt'), help_s['ghost'], help_s['pulseCells'], help_s['pulseAbtn'], help_s.get('cellW')))
        S.think(1.0, 1.8)
        cell, ani = help_s['pulseCells'][0], help_s['pulseAbtn'][0]
        S.click('#board .cell[data-i="%d"]' % cell)
        S.page.wait_for_timeout(250)
        # 双击习惯：再点同格=取消选中
        S.page.mouse.click(*center_of(S.page, '#board .cell[data-i="%d"]' % cell))
        S.page.wait_for_timeout(250)
        s2 = S.snap('A_doubleclick_cell')
        S.ev('A_doubleclick_deselect', 'sel=%s' % s2['sel'])
        S.click('#board .cell[data-i="%d"]' % cell)
        S.think(0.8, 1.4)
        S.click('#animals .abtn[data-a="%d"]' % ani)
        S.page.wait_for_timeout(700)
        s3 = S.snap('A_help_filled')
        S.ev('A_solo', 'tut=%s' % s3['hk']['tut'])
    else:
        S.ev('tut_help', 'GHOST NOT FOUND within 4s')
    # 人设好奇乱点：没选格直接点动物（应无反应）
    bd0 = S.page.evaluate("() => SUD.board")
    S.click('#animals .abtn[data-a="0"]')
    S.page.wait_for_timeout(300)
    bd1 = S.page.evaluate("() => SUD.board")
    S.ev('A_animal_without_sel', 'board unchanged=%s' % (bd0['cells'] == bd1['cells']))

    # 1-0 其余：单候选扫描 + 保证冲突演示 + 双击清空演示
    done_deliberate = done_dbl = False
    for it in range(14):
        bd = S.page.evaluate("() => SUD.board")
        lv = S.hook_level()
        if bd is None or (lv and lv.get('won')): break
        n, cells = bd['n'], bd['cells']
        empt = [i for i, v in enumerate(cells) if v < 0]
        if not empt: break
        sol = S.page.evaluate("() => SUD.solution")
        if not done_deliberate:
            # 构造必然冲突：取同行已填格的动物填到另一空格
            i = empt[0]
            r = i // n
            src_j = next((j for j in range(r * n, r * n + n) if cells[j] >= 0 and j != i), None)
            if src_j is not None:
                done_deliberate = True
                S.click('#board .cell[data-i="%d"]' % i); S.think(0.7, 1.2)
                S.click('#animals .abtn[data-a="%d"]' % cells[src_j])
                S.page.wait_for_timeout(400)
                sc = S.snap('A_conflict_shown')
                S.shot('conflict_feedback')
                S.ev('A_conflict', 'conflict=%s wrongs=%s' % (sc['conflict'], sc['hk']['level']['wrongs']))
                S.page.wait_for_timeout(1100)
                sc2 = S.snap('A_conflict_after_1s')
                S.ev('A_conflict_cleared', 'conflict=%s' % sc2['conflict'])
                S.click('#board .cell[data-i="%d"]' % i)  # 点已填格=清除
                S.page.wait_for_timeout(300)
                sc3 = S.page.evaluate("() => SUD.board.cells[%d]" % i)
                S.ev('A_conflict_cleared_by_tap', 'cell=%d now=%s' % (i, sc3))
                S.think(0.9, 1.5)
                S.click('#animals .abtn[data-a="%d"]' % sol[i])
                S.page.wait_for_timeout(400)
                continue
        tgt = None
        for i in empt:
            c = candidates(cells, i, n, 2, 2 if n == 4 else 3)
            if len(c) == 1: tgt = (i, c[0]); break
        if tgt is None:
            S.ev('A_unexpected_stuck_flat0', 'empt=%d' % len(empt)); break
        i, v = tgt
        S.think(0.9, 1.8)
        S.click('#board .cell[data-i="%d"]' % i)
        S.page.wait_for_timeout(220)
        S.click('#animals .abtn[data-a="%d"]' % v)
        S.page.wait_for_timeout(320)
        if not done_dbl and it >= 2:
            done_dbl = True
            b0 = S.page.evaluate("() => SUD.board.cells[%d]" % i)
            S.page.mouse.click(*center_of(S.page, '#board .cell[data-i="%d"]' % i))
            S.page.wait_for_timeout(140)
            S.page.mouse.click(*center_of(S.page, '#board .cell[data-i="%d"]' % i))
            S.page.wait_for_timeout(300)
            b1 = S.page.evaluate("() => SUD.board.cells[%d]" % i)
            sdc = S.snap('A_doubleclick_filled_cell')
            S.ev('A_doubleclick_filled', 'cell %d: %s -> %s sel=%s' % (i, b0, b1, sdc['sel']))
            if b1 == -1:
                S.think(0.8, 1.4)
                S.click('#board .cell[data-i="%d"]' % i)
                S.page.wait_for_timeout(200)
                S.click('#animals .abtn[data-a="%d"]' % v)
                S.page.wait_for_timeout(300)
    S.idle_probe('flat0_stuck', 21)
    S.wait_win(10)
    S.snap('A_win'); S.shot('celebrate_flat0')
    S.page.wait_for_timeout(3000)
    S.stats['levelsPlayed'].append({'flat': 0})

    print('[sudoku] B: flat1 quick')
    ok = S.wait_level(1)
    t0 = time.time(); fills = 0
    while fills < 16:
        bd = S.page.evaluate("() => SUD.board")
        lv = S.hook_level()
        if bd is None or (lv and lv.get('won')): break
        cells, n = bd['cells'], bd['n']
        empt = [i for i, v in enumerate(cells) if v < 0]
        if not empt: break
        tgt = None
        for i in empt:
            c = candidates(cells, i, n, 2, 2 if n == 4 else 3)
            if len(c) == 1: tgt = (i, c[0]); break
        if tgt is None:
            S.ev('B_stuck_flat1', 'remaining=%d' % len(empt)); break
        i, v = tgt
        S.think(0.8, 1.6)
        S.click('#board .cell[data-i="%d"]' % i)
        S.page.wait_for_timeout(200)
        S.click('#animals .abtn[data-a="%d"]' % v)
        S.page.wait_for_timeout(260)
        fills += 1
    S.wait_win(8)
    S.page.wait_for_timeout(2600)
    S.stats['levelsPlayed'].append({'flat': 1, 'fills': fills, 'sec': round(time.time() - t0, 1)})

    print('[sudoku] C: jump flat10 (6x6)')
    S.jump_save(list(range(10)))
    ok = S.wait_level(10)
    s = S.snap('C_flat10_loaded')
    S.shot('six_by_six')
    S.ev('C_loaded', 'level=%s cellW=%s lamps=%s' % (s['hk']['level'], s.get('cellW'), s.get('lamps')))
    hints_used, wrongs, stuck_events = 0, 0, 0
    idle_done, given_tap_done, mash_done = False, False, False
    for it in range(40):
        bd = S.page.evaluate("() => SUD.board")
        lv = S.hook_level()
        if bd is None or (lv and lv.get('won')): break
        cells, n = bd['cells'], bd['n']
        empt = [i for i, v in enumerate(cells) if v < 0]
        if not empt:
            break
        if not given_tap_done and it == 1:
            given_tap_done = True
            gi = next(i for i in range(n * n) if bd['given'][i])
            S.click('#board .cell[data-i="%d"]' % gi)
            S.page.wait_for_timeout(400)
            sg = S.snap('C_given_cell_tap')
            S.ev('C_given_tap', 'sel=%s (given not selectable)' % sg['sel'])
        if not idle_done and it == 2:
            idle_done = True
            S.idle_probe('flat10_mid', 23)
        if not mash_done and it == 3:
            mash_done = True
            S.think(1.2, 2.0)
            for _ in range(4):   # 连按提示灯 4 下（3 额度+1 超限）
                S.click('#btn-hint')
                S.page.wait_for_timeout(700)
                sm = S.snap('C_hint_mash_%d' % hints_used)
                hints_used += 1
                S.ev('C_hint_press', 'ghost=%s pulseCells=%s pulseAbtn=%s lamps=%s spent=%s' % (
                    sm['ghost'], sm['pulseCells'], sm['pulseAbtn'], sm['lamps'], sm['hintBtn']))
                if sm['pulseCells'] and sm['pulseAbtn']:
                    S.think(1.2, 2.0)
                    S.click('#board .cell[data-i="%d"]' % sm['pulseCells'][0])
                    S.page.wait_for_timeout(220)
                    S.click('#animals .abtn[data-a="%d"]' % sm['pulseAbtn'][0])
                    S.page.wait_for_timeout(300)
        tgt = None
        for i in empt:
            c = candidates(cells, i, n, 2, 3)
            if len(c) == 1: tgt = (i, c[0]); break
        if tgt is not None:
            i, v = tgt
            S.think(1.4, 2.6)
            S.click('#board .cell[data-i="%d"]' % i)
            S.page.wait_for_timeout(220)
            S.click('#animals .abtn[data-a="%d"]' % v)
            S.page.wait_for_timeout(300)
            continue
        stuck_events += 1
        S.ev('C_stuck_no_single', 'remaining=%d hintsUsed=%d' % (len(empt), lv['hintsUsed']))
        if lv['hintsUsed'] < 3:
            S.click('#btn-hint')
            S.page.wait_for_timeout(1300)
            sm = S.snap('C_hint_stuck')
            hints_used += 1
            S.ev('C_hint_stuck_follow', 'pulseCells=%s pulseAbtn=%s' % (sm['pulseCells'], sm['pulseAbtn']))
            if sm['pulseCells'] and sm['pulseAbtn']:
                S.think(1.4, 2.2)
                S.click('#board .cell[data-i="%d"]' % sm['pulseCells'][0])
                S.page.wait_for_timeout(220)
                S.click('#animals .abtn[data-a="%d"]' % sm['pulseAbtn'][0])
                S.page.wait_for_timeout(300)
            continue
        i = empt[0]
        cands = candidates(cells, i, n, 2, 3)
        sol = S.page.evaluate("() => SUD.solution")
        guess = cands[0] if cands else 0
        S.think(1.6, 2.6)
        S.click('#board .cell[data-i="%d"]' % i)
        S.page.wait_for_timeout(200)
        S.click('#animals .abtn[data-a="%d"]' % guess)
        S.page.wait_for_timeout(600)
        sc = S.page.evaluate("() => ({conflict: Array.from(document.querySelectorAll('#board .cell.conflict')).map(e=>Number(e.dataset.i)), board: SUD.board})")
        if sc['conflict']:
            wrongs += 1
            S.ev('C_guess_conflict', 'cell=%d guess=%d' % (i, guess))
            S.page.wait_for_timeout(1000)
            S.click('#board .cell[data-i="%d"]' % i)
            S.page.wait_for_timeout(250)
            if wrongs >= 3:
                S.ev('C_giveup', 'wrong guesses=%d' % wrongs)
                S.idle_probe('flat10_giveup', 23)
                for _ in range(3):
                    S.page.mouse.click(*center_of(S.page, '#board .cell'))
                    S.page.wait_for_timeout(400)
                S.snap('C_after_giveup'); S.shot('giveup_state')
                S.stats['levelsPlayed'].append({'flat': 10, 'hints': hints_used, 'guessConflicts': wrongs,
                                                'gaveUp': True, 'stuckEvents': stuck_events})
                return S
        elif guess != sol[i]:
            S.ev('C_silent_wrong_fill', 'cell=%d guess=%d sol=%d no-conflict-but-wrong' % (i, guess, sol[i]))
    won = S.wait_win(12)
    s = S.snap('C_win')
    S.ev('C_win', 'won=%s ov=%s hints=%d' % (won, s['ov'], hints_used))
    if s['ov']: S.shot('celebrate_6x6')
    S.page.wait_for_timeout(3200)
    S.stats['levelsPlayed'].append({'flat': 10, 'hints': hints_used, 'guessConflicts': wrongs,
                                    'gaveUp': False, 'stuckEvents': stuck_events})
    return S

# ============================ main ============================
def main():
    game = sys.argv[1]
    with sync_playwright() as pw:
        browser = pw.chromium.launch()   # 独立 launch，不 connect 不杀进程
        try:
            if game == 'clock': S = run_clock(browser)
            elif game == 'times': S = run_times(browser)
            elif game == 'sudoku': S = run_sudoku(browser)
            else: raise SystemExit('unknown game ' + game)
            out = S.collect()
            errs = out['obs']['errs']
            print('\n== %s done: wall=%.0fs levels=%s voices=%d sfx=%d jsErr=%d' % (
                game, out['wallSec'], out['stats']['levelsPlayed'], len(out['obs']['voices']), len(out['obs']['sfx']), len(errs)))
            if errs: print('JS ERRORS:', json.dumps(errs, ensure_ascii=False)[:1500])
            print('idles:', json.dumps(out['stats']['idles'], ensure_ascii=False))
        finally:
            browser.close()

if __name__ == '__main__':
    main()
