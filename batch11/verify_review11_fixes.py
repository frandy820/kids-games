# -*- coding: utf-8 -*-
"""batch11 审查修复定向实证（M1/M2 + m1-m5/mm7）
T1 M1 生成关随机化：shp flat20-39 dch 分布（静态 20 关恒定各 5 + 生成关 1-4 全覆盖）+ 确定性双跑
T2 M2/页面 verify：shp ?verify=1 title=VERIFY PASS 50/50（stub say 已补、覆盖判据新口径生效）
T3 m3 sortsize 排序条槽内 s-num 恰一个（无重复 DOM 叠放）——真实通关后逐槽断言
T4 m4 rabbit 守卫：shadow/sortsize won 后点兔子 UI 状态不变（无 hop 类）
T5 m5 shp 舞台空白反馈：locked 期点 stage 留白 → sfx('pop')；非 locked 期 10s 节流 sayR
"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

SEED = """const sv = KIDS._save();
  for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 };
  sv.SUBK = sv.SUBK || {}; sv.SUBK.tutSeen = true;
  if (n >= 10) KIDS.calendar.bonusSet(10);
  KIDS.store.persist();"""

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k + '#' + String(t || '').slice(0, 4)); return _p(k, t); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 6)); return _sy(t); };
  const _s = KIDS.audio.sfx.bind(KIDS.audio);
  KIDS.audio.sfx = n => { window.__vlog.push('S:' + n); return _s(n); };
  return true;
})()"""

# 音频静音纪律（09-19 用户实证本机 TTS 外放后立）：context 级先掐声（仅静音，断言零影响）
SILENCE = """(() => {
  const noop = () => {};
  window.__sndLog = [];
  try { window.speechSynthesis = { speak: u => window.__sndLog.push('tts'), cancel: noop, pause: noop, resume: noop, getVoices: () => [] }; } catch (e) {}
  try {
    const OA = window.Audio;
    window.Audio = function (src) {
      if (OA && typeof src === 'string' && src.indexOf('data:audio/') === 0) {
        const a = new OA(src);
        a.play = () => { window.__sndLog.push('clip');
          setTimeout(() => { try { a.dispatchEvent(new Event('ended')); } catch (e) {} }, 1500);  /* 拟真片段时长推进链（40ms 会把开场链加速到装钩前播完——P2 SP 实证） */  /* 掐声但补发 ended：core queue 靠 onended 链推进（09-19 P2 SP 链卡修复） */
          return Promise.resolve(); };
        a.pause = () => {};
        return a;
      }
      this.__src = src || ''; this.play = () => { window.__sndLog.push('audio'); return Promise.resolve(); };
      this.pause = noop; this.load = noop; this.addEventListener = noop; this.removeEventListener = noop;
      return this;
    };
  } catch (e) {}
  try {
    const OC = window.AudioContext || window.webkitAudioContext;
    if (OC) { const S = function () { this.state = 'suspended'; this.destination = {}; this.listener = {};
      this.createOscillator = () => ({ connect: noop, start: noop, stop: noop, frequency: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop }, type: '' });
      this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop, linearRampToValueAtTime: noop } });
      this.resume = () => Promise.resolve(); this.close = () => Promise.resolve(); };
      window.AudioContext = S; window.webkitAudioContext = S; }
  } catch (e) {}
})();"""

async def seeded(b, game, sub, n, delay=900):
    ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
    await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
    pg = await ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file:///' + (BASE / game / 'index.html').as_posix())
    await pg.wait_for_timeout(delay)
    await pg.evaluate('(n) => {%s}' % SEED.replace('SUBK', sub), n)
    await pg.reload()
    await pg.wait_for_timeout(delay)
    return ctx, pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # T1 M1：生成关随机分布 + 确定性
        ctx, pg, errs = await seeded(b, 'shapeshome', 'shp', 5)
        dist = await pg.evaluate("""(() => {
          const st = {1:0,2:0,3:0,4:0}, gn = {1:0,2:0,3:0,4:0};
          const det = [];
          for (let f = 0; f < 40; f++) {
            const L1 = genLevel(f), L2 = genLevel(f);
            det.push(JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes));
            (f < 20 ? st : gn)[L1.dch]++;
          }
          return { st, gn, detAll: det.every(Boolean) };
        })()""")
        stOk = all(dist['st'][str(d)] == 5 for d in (1, 2, 3, 4))
        gnOk = all(dist['gn'][str(d)] >= 1 for d in (1, 2, 3, 4))
        rec('T1 M1 生成关随机化(静态各5+生成全覆盖+确定性)', stOk and gnOk and dist['detAll'] and not errs,
            'st=%s gn=%s det=%s' % (dist['st'], dist['gn'], dist['detAll']))
        await ctx.close()

        # T2 M2：shp verify 页全 PASS（stub say + 新覆盖判据）
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
        pg = await ctx.new_page()
        errs2 = []
        pg.on('pageerror', lambda e: errs2.append(str(e)))
        await pg.goto('file:///' + (BASE / 'shapeshome' / 'index.html').as_posix() + '?verify=1')
        title = ''
        for _ in range(18):
            title = await pg.title()
            if 'VERIFY' in title: break
            await pg.wait_for_timeout(1000)
        rec('T2 M2+新判据 shp verify 全 PASS', 'VERIFY PASS' in title and 'FAIL' not in title and not errs2, title + ' errs=%s' % errs2[:1])   # 09-19 s-minor-3：动态 n/n（shp r8 后 53/53，'50/50' 字面永久假挂）
        await ctx.close()

        # T3 m3：sortsize 通关后每槽 s-num 恰一个
        ctx, pg, errs = await seeded(b, 'sortsize', 'sortsize', 10)
        clicks = 0
        for _ in range(60):
            q = await pg.evaluate('SO.quiz')
            if not q: break
            await pg.locator('.card[data-i="%d"]' % q['answerIdx']).click()
            clicks += 1
            await pg.wait_for_timeout(650)
        await pg.wait_for_timeout(5200)
        nums = await pg.evaluate("[...document.querySelectorAll('.slot')].map(s => s.querySelectorAll('.s-num').length)")
        stars = await pg.evaluate("(KIDS._save().levels['3-0'] || {}).stars || 0")
        rec('T3 m3 排序条无重复 s-num', stars >= 1 and all(v == 1 for v in nums) and not errs,
            'clicks=%d stars=%s nums=%s' % (clicks, stars, nums))
        await ctx.close()

        # T4 m4：won 后点兔子零反应（shadow/sortsize）
        for game, sub in (('shadow', 'sha'), ('sortsize', 'sortsize')):
            ctx, pg, errs = await seeded(b, game, sub, 5)
            hk = game == 'shadow' and 'SH' or 'SO'
            await pg.evaluate('%s.autoSolve()' % hk)
            await pg.wait_for_timeout(3500)
            won = await pg.evaluate('%s.currentLevel.won' % hk)
            await pg.locator('#btn-rabbit').dispatch_event('pointerdown')
            await pg.wait_for_timeout(300)
            hopped = await pg.evaluate("document.querySelector('#btn-rabbit').classList.contains('hop')")
            rec('T4 m4 %s won后兔子零反应' % game, won and not hopped and not errs, 'won=%s hop=%s' % (won, hopped))
            await ctx.close()

        # T5 m5：shp stage 空白反馈（非 locked 期 10s 节流 sayR；target=stage 留白本身）
        ctx, pg, errs = await seeded(b, 'shapeshome', 'shp', 5, delay=3200)
        await pg.evaluate(HOOK)
        await pg.evaluate('window.__vlog = []')
        await pg.wait_for_timeout(1000)
        await pg.evaluate('window.__vlog = []')
        await pg.evaluate("""document.getElementById('stage')
          .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))""")
        await pg.wait_for_timeout(400)
        v = await pg.evaluate('window.__vlog')
        hits = [x for x in v if x.startswith('P:shp_hint')]
        rec('T5 m5 stage空白轻反馈(sayR 10s节流)', bool(hits) and not errs, 'log=%s' % [x[:14] for x in v[:4]])
        await ctx.close()

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
