# -*- coding: utf-8 -*-
"""batch11 试玩 P2 修复定向实证
P1 共性① 教学watch期点兔子/空白：三款 pop 轻反馈+兔子hop+教学状态不变
P2 SP flat5/flat10 开场链规则句（hint 后 TTS 到达）
P3 SO 教学期方向徽章 teach 闪亮（getAnimations running）
P4 SO sor_hint 新文案三方一致（game-data=gen_clips=产物 VOICE）+救援兜底可播
"""
import asyncio, io, os, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

HOOK = """(() => {
  window.__vlog = [];
  const _p = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => { window.__vlog.push('P:' + k); return _p(k, t); };
  const _sy = KIDS.voice.say.bind(KIDS.voice);
  KIDS.voice.say = t => { window.__vlog.push('T:' + String(t).slice(0, 8)); return _sy(t); };
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

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # P1 三款：教学 watch 期点兔子/空白 → pop+hop+教学不变
        for game, sub in (('shadow', 'sha'), ('shapeshome', 'shp'), ('sortsize', 'sortsize')):
            ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
            await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('file:///' + (BASE / game / 'index.html').as_posix())
            await pg.wait_for_timeout(1800)      # watch 期（开场教学）
            hk = {'shadow': 'SH', 'shapeshome': 'SP', 'sortsize': 'SO'}[game]
            tut0 = await pg.evaluate('%s.tutorial' % hk)
            await pg.evaluate(HOOK)
            await pg.locator('#btn-rabbit').dispatch_event('pointerdown')
            await pg.wait_for_timeout(300)
            hop = await pg.evaluate("document.querySelector('#btn-rabbit').classList.contains('hop')")
            tut1 = await pg.evaluate('%s.tutorial' % hk)
            v1 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            # 空白：stage 非卡/非家/非chip处
            await pg.evaluate("document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))")
            await pg.wait_for_timeout(300)
            tut2 = await pg.evaluate('%s.tutorial' % hk)
            v2 = await pg.evaluate("window.__vlog.filter(x => x === 'S:pop').length")
            rec('P1 %s 教学期兔子pop+hop+空白pop(状态不变)' % game,
                tut0 == 'watch' and hop and v1 >= 1 and v2 > v1 and tut1 == 'watch' and tut2 == 'watch' and not errs,
                'tut=%s->%s->%s hop=%s pop=%d/%d' % (tut0, tut1, tut2, hop, v1, v2))
            await ctx.close()

        # P2 SP flat5/flat10 规则句（hint 后 TTS）
        for n, rule8 in ((5, '这一章只看形状'), (10, '这一章要颜色和形状')):
            ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
            await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('file:///' + (BASE / 'shapeshome' / 'index.html').as_posix())
            await pg.wait_for_timeout(900)
            await pg.evaluate("(n) => { const sv = KIDS._save(); for (let i = 0; i < n; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = { stars: 3 }; sv.shp = { tutSeen: true }; if (n >= 10) KIDS.calendar.bonusSet(10); KIDS.store.persist(); }", n)
            await pg.reload()
            await pg.wait_for_timeout(700)
            await pg.evaluate(HOOK)               # hint 由 startLevel 同步播放（装钩前）；钩捕获规则句起
            await pg.wait_for_timeout(6800)
            v = await pg.evaluate('window.__vlog')
            ruleKey = 'P:shp_rule%d' % (2 if n == 5 else 3)
            rule = [i for i, x in enumerate(v) if x == ruleKey]
            # 规则句=晓晓 clip（P:shp_rule*；hint 先于规则句由 openingSpeak 实现顺序保证+页面 verify ⑦ 覆盖）；
            # 题面在规则句后接力到达（P:shp_q_*=题面 clip / P:null=core.say 无头兜底，batch8 同款）
            qafter = any((x.startswith('P:shp_q_') or x.startswith('T:找一找') or x.startswith('P:null')) for x in v[rule[0] + 1:]) if rule else False
            ok = bool(rule) and (not v[:rule[0]] or all(x.startswith('T:' + rule8[:4]) for x in v[:rule[0]])) and qafter
            rec('P2 SP flat%d 开场链规则句+题面接力' % n, ok and not errs, 'log=%s' % [x[:12] for x in v[:4]])
            await ctx.close()

        # P3 SO 教学期徽章 teach 闪亮
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'sortsize' / 'index.html').as_posix())
        await pg.wait_for_timeout(1200)
        st = await pg.evaluate("""(() => {
          const b = document.getElementById('dir-badge');
          return { teach: b.classList.contains('teach'),
                   anim: b.getAnimations().map(a => a.playState),
                   running: b.getAnimations().some(a => a.playState === 'running') };
        })()""")
        rec('P3 SO 教学期方向徽章teach闪亮', st['teach'] and st['running'] and not errs, str(st))
        await ctx.close()

        # P4 SO sor_hint 新文案三方一致 + 救援兜底可播
        gd = (BASE / 'sortsize' / '_src' / 'game-data.js').read_text(encoding='utf-8')
        gc = (BASE.parent / 'voice' / 'gen_clips.py').read_text(encoding='utf-8')
        built = (BASE / 'sortsize' / 'index.html').read_text(encoding='utf-8')
        w = '比一比大小，排一排试试哦'
        rec('P4a SO sor_hint 新文案三方一致', w in gd and w in gc and w in built and '听一听，从哪个开始' not in built,
            'data=%s gen=%s built=%s old_gone=%s' % (w in gd, w in gc, w in built, '听一听，从哪个开始' not in built))
        import json
        mf = json.loads((BASE.parent / 'voice' / 'clips' / 'manifest.json').read_text(encoding='utf-8'))
        rec('P4b manifest 文案同步', mf.get('sor_hint', {}).get('text') == w, str(mf.get('sor_hint', {}).get('text')))
        clip = (BASE.parent / 'voice' / 'clips' / 'sor_hint.mp3')
        rec('P4c sor_hint.mp3 重合成在场', clip.exists() and clip.stat().st_size > 800, '%dB' % (clip.stat().st_size if clip.exists() else 0))

        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
