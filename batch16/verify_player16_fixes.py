# -*- coding: utf-8 -*-
"""batch16 试玩修复实证（b16 player：read/idiom P2-1 连点亏星修+read P3-1 教学演示压缩）
U1(P2-1) 150ms×5 连击同错卡 → miss 仅 +1（防重入窗 1000ms 内全吞）
U2(P3-1) read 教学 watch 全程 ≤16s（demo 听读只读首句，原 25.8s）
U3 回归保护：idiom 两错后小注仍触发（1000ms 窗收尾后可重点）"""
import asyncio, io, os, sys, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
# 声音纪律①（r16 收口）：底层通道接管（context 级 add_init_script，reload 自动生效；
# 对 HOOK vlog 记录透明——KIDS.voice.play 照常走、底层不发声）
INIT_SND = '''(() => {
  if (window.__sndStubbed) return; window.__sndStubbed = 1;
  try { if (window.speechSynthesis) { speechSynthesis.speak = function () {};
    speechSynthesis.cancel = function () {}; } } catch (e) {}
  try { window.Audio = function () { return { play: function () { return Promise.resolve(); },
    pause: function () {}, load: function () {}, canPlayType: function () { return ''; },
    volume: 0, muted: true, autoplay: false }; }; } catch (e) {}
  try { var AC0 = window.AudioContext || window.webkitAudioContext;
    if (AC0) { var fac = function () { return {
      resume: function () { return Promise.resolve(); },
      close: function () { return Promise.resolve(); }, state: 'running', currentTime: 0,
      destination: {},
      createOscillator: function () { return { frequency: { value: 0, setValueAtTime: function () {} },
        connect: function () {}, start: function () {}, stop: function () {} }; },
      createGain: function () { return { gain: { value: 0, setValueAtTime: function () {},
        linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} },
        connect: function () {} }; } }; };
      window.AudioContext = fac; window.webkitAudioContext = fac; } } catch (e) {}
})();'''

PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

def seed(g, n, base=5):   # r16 收口适配：idiom CH_LEN=8 键基（read 未改造仍 5——按款传参防迁移 IIFE 洗档）
    return """(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/%d)+1)+'-'+(i%%%d)] = { stars: 1 };
  sv.%s = { tutSeen: true }; KIDS.store.persist(); })()""" % (n, base, base, g)

async def pos_of(pg, sel):
    return await pg.evaluate("(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height * 0.55}; })('%s')" % sel)

async def burst_click(pg, sel, times=5, gap=150):
    p = await pos_of(pg, sel)
    for _ in range(times):
        await pg.mouse.click(p['x'], p['y'])
        await pg.wait_for_timeout(gap)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # U1a read 连击
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'read' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('read', 1))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        a1 = (await pg.evaluate('RD.quiz'))['answer']
        wsel = '#cards .card[data-i="%d"]' % next(i for i in range(3) if i != a1)
        m0 = (await pg.evaluate('RD.quiz'))['miss']
        await burst_click(pg, wsel, 5, 150)
        await pg.wait_for_timeout(1400)
        m1 = (await pg.evaluate('RD.quiz'))['miss']
        rec('U1a read 5连击错卡 miss仅+1', m1 == m0 + 1 and not errs, 'm=%s→%s errs=%s' % (m0, m1, errs[:1]))
        await ctx.close()

        # U1b idiom 连击
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'idiom' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('idiom', 1, 8))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        # r16 收口适配：ID→IDM 钩子；quiz 脱敏副本暴露 optionIdxs（非内部 options——b28 坑③）；
        # options[4|2]（fill 4 候选/near 2 候选）——按实际长度取错卡
        iq = await pg.evaluate('IDM.quiz')
        a2, nopt = iq['answer'], len(iq['optionIdxs'])
        wsel = '.card[data-i="%d"]' % next(i for i in range(nopt) if i != a2)
        m0 = (await pg.evaluate('IDM.quiz'))['miss']
        await burst_click(pg, wsel, 5, 150)
        await pg.wait_for_timeout(1400)
        m1 = (await pg.evaluate('IDM.quiz'))['miss']
        rec('U1b idiom 5连击错卡 miss仅+1', m1 == m0 + 1 and not errs, 'm=%s→%s errs=%s' % (m0, m1, errs[:1]))
        # U3 两错后小注仍触发（r16 收口适配：错链锁定窗 WRONG_CHAIN_MS=6480——U1b 首错链播完前的
        # 重复错选被吞属设计（错反馈链完整播完再收下一输入，b32 家族形态），前置等待补足链窗+余量）
        await pg.wait_for_timeout(7000)
        await burst_click(pg, wsel, 1, 0)
        await pg.wait_for_timeout(2000)
        h = await pg.evaluate('IDM.quiz.hinted')
        note = await pg.evaluate("!!document.querySelector('#note.show')")
        rec('U3 idiom 两错小注仍触发', bool(h) and bool(note), 'hinted=%s note=%s' % (h, note))
        await ctx.close()

        # U2 read 教学 watch 时长（demo 听读只读首句）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'read' / 'index.html').as_posix())
        await pg.wait_for_timeout(1500)
        await pg.evaluate("localStorage.clear()")
        await pg.reload()
        t0 = time.time()
        demo_r = None
        for _ in range(120):
            demo_r = await pg.evaluate('window.__rdDemoR || null')
            t = await pg.evaluate('RD.tutorial')
            if demo_r or t == 'help':
                break
            await pg.wait_for_timeout(400)
        dt = time.time() - t0
        rec('U2 read watch 演示≤16s(demoR=right)', demo_r == 'right' and dt <= 16 and not errs,
            'dur=%.1fs demoR=%s errs=%s' % (dt, demo_r, errs[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
