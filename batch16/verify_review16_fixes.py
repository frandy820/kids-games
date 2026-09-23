# -*- coding: utf-8 -*-
"""batch16 审查修复定向实证（b16 review：S1 救援发音/S2 tile 态格 breathe/S5 题面卡首击双触发）
T1(S1) spellen 救援触发播 P:sp_word_<当前词>（修复前 sayWord(q) 拼出 [object Object] 恒不播）
T2(S2) tile 态点提示=首未对格 .cell breathe 在场（修复前 rescueTarget tile 分支不带 j→cellEl(undefined)）
T3(S5) read 首点 #tip 只重听题句不播 rd_hint；idiom 首点 #idcard 只播读音不播 idm_hint（修复前冒泡空白分支首击必劫持）"""
import asyncio, io, os, sys
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

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _q = KIDS.voice.queue.bind(KIDS.voice);
  KIDS.voice.queue = parts => { window.__vlog.push('Q:' + parts.map(p => typeof p === 'string' ? p : (p && p.key || 'null')).join('|')); return _q(parts); };
  return true;
})()"""

def seed(g, n, base=5):   # r16 收口适配：spellen/idiom CH_LEN=8 键基（read 未改造仍 5——按款传参防迁移 IIFE 洗档）
    svname = {'read': 'read', 'spellen': 'spellen', 'idiom': 'idiom'}[g]
    return """(() => { const sv = KIDS._save() || { levels: {} }; sv.levels = {};
  for (let i = 0; i < %d; i++) sv.levels[(Math.floor(i/%d)+1)+'-'+(i%%%d)] = { stars: 1 };
  sv.%s = { tutSeen: true }; KIDS.store.persist(); })()""" % (n, base, base, svname)

async def click_el(pg, sel, ry=0.55):
    pos = await pg.evaluate("(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return {x: b.left + b.width / 2, y: b.top + b.height * %s}; })('%s')" % (ry, sel))
    if pos is None:
        return False
    await pg.mouse.click(pos['x'], pos['y'])
    await pg.wait_for_timeout(250)
    return True

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1+S2（S1 救援发音 / S2 tile 态提示格 breathe）
        ctx = await b.new_context()
        await ctx.add_init_script(INIT_SND)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'spellen' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        await pg.evaluate(seed('spellen', 1, 8))
        await pg.reload()
        await pg.wait_for_timeout(2400)
        # T2：tile 态（未拼任何字母）点提示 → 首格 breathe（修复前 cellEl(undefined) 无 breathe）
        await pg.evaluate('SP.hear()')
        await pg.wait_for_timeout(300)
        await click_el(pg, '#hint-btn', ry=0.5)
        await pg.wait_for_timeout(300)
        st0 = await pg.evaluate("!!document.querySelector('#slots .cell[data-j=\"0\"].breathe')")
        # 点一个错误字母造成 miss（避开 flaky：点干扰字母拼满——简化：拼错到满）
        q = await pg.evaluate('SP.quiz')
        rest = ''.join(sorted(__import__('collections').Counter(q['tiles']) - __import__('collections').Counter(q['word'])))
        used = set()
        for ch in q['word'][:-1]:
            i = next(k for k, t in enumerate(q['tiles']) if k not in used and t == ch)
            await click_el(pg, '#tile-pool .tile[data-i="%d"]' % i)
            used.add(i)
        fill = next((k for k, t in enumerate(q['tiles']) if k not in used and t != q['word'][-1]), None)
        if fill is None:
            fill = next(k for k in range(len(q['tiles'])) if k not in used)
        await click_el(pg, '#tile-pool .tile[data-i="%d"]' % fill)
        await pg.wait_for_timeout(900)
        # T1：等救援触发（14s，错放不重置）→ P:sp_word_<word> 必须在场
        await pg.evaluate(HOOK)
        for _ in range(20):
            bl = (await pg.evaluate('SP.quiz'))['built']
            js = [j for j, x in enumerate(bl) if x is not None]
            if not js:
                break
            await click_el(pg, '#slots .cell[data-j="%d"]' % max(js), ry=0.5)
            await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(8500)
        r0 = await pg.evaluate('SP.rescues')
        await pg.wait_for_timeout(6500)   # r16 收口：13.6s→15.1s（reload→r1 距救援钟起点裕度 0.4s 不足，放等待不放阈值）
        r1 = await pg.evaluate('SP.rescues')
        v = await pg.evaluate('window.__vlog')
        w = (await pg.evaluate('SP.quiz'))['word']
        heard = any(x == 'P:sp_word_' + w for x in v)
        rec('T1 救援发音重播 P:sp_word_%s' % w, r0 == 0 and r1 >= 1 and heard and not errs,
            'r=%s→%s heard=%s vlog=%s errs=%s' % (r0, r1, heard, v[:4], errs[:1]))
        rec('T2 tile 态点提示=首格 breathe', st0, 'breathe=%s' % st0)
        await ctx.close()

        # T3（S5）：read 首点 #tip 不被 hint 劫持
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
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(1000)          # 开场语音静置（vlog 起点后清零更准）
        await pg.evaluate('window.__vlog = []')
        await click_el(pg, '#tip', ry=0.5)
        await pg.wait_for_timeout(600)
        v3 = await pg.evaluate('window.__vlog')
        has_ask = any(('rd_q' in x) for x in v3)
        has_hint = any('rd_hint' in x for x in v3)
        rec('T3a read 首点#tip=只重听题句', has_ask and not has_hint, 'vlog=%s' % v3[:4])
        await ctx.close()

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
        await pg.evaluate(HOOK)
        await pg.wait_for_timeout(1000)
        await pg.evaluate('window.__vlog = []')
        await click_el(pg, '#qcard', ry=0.5)   # r16：#idcard→#qcard（点情境卡=重读情境句，game-main.js:399）
        await pg.wait_for_timeout(600)
        v4 = await pg.evaluate('window.__vlog')
        has_read = any(('idm_q_' in x) for x in v4)      # 重听链含 idm_q_fill/idm_q_near（题句键）
        has_ihint = any('idm_hint2' in x for x in v4)
        rec('T3b idiom 首点#qcard=只重听情境句', has_read and not has_ihint and not errs, 'vlog=%s errs=%s' % (v4[:4], errs[:1]))
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
