# -*- coding: utf-8 -*-
"""batch11 两级入口验证：①batch11/index.html 三卡 ②主入口 5-6 岁区 batch11 三卡锚点
③链接目标文件系统直查 ④双 viewport overflowX ⑤0 错误"""
import asyncio, io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from playwright.async_api import async_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

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
    # ③ 链接目标存在性（文件系统直查）
    ok_all, miss = True, []
    n_links = 0
    for page in ('batch11/index.html', 'index.html'):
        src = open(os.path.join(ROOT, page), encoding='utf-8').read()
        for m in re.findall(r'href="([^"]+)"', src):
            if m.startswith('http') or m == '#':
                continue
            n_links += 1
            target = os.path.normpath(os.path.join(ROOT, page.replace('index.html', ''), m))
            if not os.path.exists(target):
                ok_all = False
                miss.append('%s -> %s' % (page, m))
    rec('3 link targets exist (fs)', ok_all, 'links=%d missing=%s' % (n_links, miss[:3]))

    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, rel in (('batch11/index.html', os.path.join(BASE, 'index.html')),
                          ('main index.html', os.path.join(ROOT, 'index.html'))):
            for vp in ({'width': 1280, 'height': 800}, {'width': 800, 'height': 1180}):
                ctx = await b.new_context(viewport=vp)
                await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
                pg = await ctx.new_page()
                errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto('file:///' + rel.replace('\\', '/'))
                await pg.wait_for_timeout(700)
                ox = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                rec('%s %dx%d overflowX=0+0err' % (name, vp['width'], vp['height']), ox == 0 and not errs, 'ox=%s errs=%s' % (ox, errs[:1]))
                await ctx.close()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.add_init_script(SILENCE)   # 09-19：先掐声再开页
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + os.path.join(ROOT, 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(700)
        cards = await pg.evaluate("""(() => ['batch11/shadow/index.html', 'batch11/shapeshome/index.html', 'batch11/sortsize/index.html']
          .map(h => !!document.querySelector('a.card[href="' + h + '"]')))()""")
        rec('2 main-index batch11 3 cards', all(cards) and not errs, 'cards=%s' % cards)
        await pg.goto('file:///' + os.path.join(BASE, 'index.html').replace('\\', '/'))
        await pg.wait_for_timeout(700)
        cards2 = await pg.evaluate("""(() => ['shadow/index.html', 'shapeshome/index.html', 'sortsize/index.html']
          .map(h => !!document.querySelector('a.card[href="' + h + '"]')))()""")
        rec('1 batch11-index 3 cards', all(cards2) and not errs, 'cards=%s' % cards2)
        await ctx.close()
        await b.close()
    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
