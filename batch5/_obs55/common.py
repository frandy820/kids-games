# -*- coding: utf-8 -*-
"""obs55 公共测试底座：独立 chromium.launch（绝不 connect 已有浏览器/绝不杀任何浏览器进程）
游戏文件只读；所有测试脚本/数据落在 _obs55/ 下。"""
import asyncio, json, pathlib, sys, io
from playwright.async_api import async_playwright

ROOT = pathlib.Path(r'F:/claudecode/projects/active/kids-games/batch5')
GAMES = {
    'countchick': ROOT / 'countchick' / 'index.html',
    'spotdiff':   ROOT / 'spotdiff'   / 'index.html',
    'connect':    ROOT / 'connect'    / 'index.html',
}
HOOK = {'countchick': 'CHK', 'spotdiff': 'SPD', 'connect': 'CON'}
OUT = ROOT / '_obs55'
SHOTS = OUT / 'shots'
RESULTS = OUT / 'results'
for d in (SHOTS, RESULTS):
    d.mkdir(parents=True, exist_ok=True)

# KIDS.voice.play 包装计数（不改行为：原函数照调；save.settings.tts 默认 true）
VOICE_HOOK = """
window.__voice = [];
(() => {
  const vp = KIDS.voice.play.bind(KIDS.voice);
  KIDS.voice.play = (k, t) => {
    window.__voice.push({ k: k || '', t: t || '', at: Date.now() });
    try { return vp(k, t); } catch (e) {}
  };
})();
"""

# 种档跳关到 flat=target（0..target-1 标 3 星 + bonus 30 + persist）
SEED_JS = """
(target) => {
  const keyOf = f => (Math.floor(f / 5) + 1) + '-' + (f % 5);
  const sv = KIDS._save();
  for (let f = 0; f < target; f++) sv.levels[keyOf(f)] = { stars: 3 };
  KIDS.calendar.bonusSet(30);
  KIDS.store.persist();
  return true;
}
"""

OFFLINE_JS = """
(() => ({ n: window.__netreq ? window.__netreq.length : 0,
          urls: window.__netreq ? window.__netreq.slice(0, 5) : [] }))()
"""

OVERFLOW_JS = """
(() => {
  const de = document.documentElement, b = document.body;
  return { sw: Math.max(de.scrollWidth, b.scrollWidth), cw: de.clientWidth,
           iw: window.innerWidth, overX: Math.max(de.scrollWidth, b.scrollWidth) - de.clientWidth };
})()
"""

def uri(p):
    return p.resolve().as_uri()

class Obs:
    """一个场景 = 一个独立 context（localStorage 隔离）+ 独立 page"""
    def __init__(self, browser, game, viewport=None, tag=''):
        self.browser, self.game, self.tag = browser, game, tag
        self.hook = HOOK[game]
        self.viewport = viewport or {'width': 1280, 'height': 800}
        self.pageerrors, self.console_errors, self.netreq = [], [], []
        self.ctx = None
        self.page = None

    async def __aenter__(self):
        self.ctx = await self.browser.new_context(viewport=self.viewport)
        self.page = await self.ctx.new_page()
        self.page.on('pageerror', lambda e: self.pageerrors.append(str(e)))
        self.page.on('console', lambda m: self.console_errors.append(m.text) if m.type == 'error' else None)
        self.page.on('request', lambda r: self.netreq.append(r.url) if not r.url.startswith('file://') else None)
        await self.page.goto(uri(GAMES[self.game]))
        await self.page.evaluate(VOICE_HOOK)
        await self.wait_ready()
        return self

    async def __aexit__(self, *a):
        await self.ctx.close()

    async def wait_ready(self):
        await self.page.wait_for_function(
            "([h]) => window[h] && window[h].currentLevel !== null", arg=[self.hook], timeout=15000)

    async def reload(self):
        await self.page.reload()
        await self.page.evaluate(VOICE_HOOK)
        await self.wait_ready()

    async def seed(self, target):
        await self.page.evaluate(SEED_JS, target)
        await self.reload()

    async def ev(self, js, *args):
        return await self.page.evaluate(js, list(args) if args else None)

    async def cur(self):
        return await self.ev(f"([h]) => window[h].currentLevel", self.hook)

    async def quiz(self):
        return await self.ev(f"([h]) => window[h].quiz", self.hook)

    async def tut(self):
        return await self.ev(f"([h]) => window[h].tutorial", self.hook)

    async def voice(self):
        return await self.ev("() => window.__voice")

    async def shot(self, name):
        await self.page.screenshot(path=str(SHOTS / f'{self.game}-{self.tag}-{name}.png'))

async def run(game_test_fn, results_name):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()   # 独立实例
        try:
            data = await game_test_fn(browser)
        finally:
            await browser.close()
    out = RESULTS / results_name
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    ok = out.exists() and out.stat().st_size > 100
    print('== RESULT', results_name, 'saved=', ok, out.stat().st_size if ok else 0,
          json.dumps(data, ensure_ascii=False)[:200])
    return data

# ---- 截图像素非空白（本地 PIL 数值检查，非图像分析工具）----
def png_stats(path):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    im = im.resize((im.width // 4 or 1, im.height // 4 or 1))
    px = list(im.getdata())
    n = len(px)
    means = [sum(p[c] for p in px) / n for c in range(3)]
    var = sum((sum(p) / 3 - sum(means) / 3) ** 2 for p in px) / n
    uniq = len(set(px))
    return {'mean': [round(m, 1) for m in means], 'std': round(var ** 0.5, 1), 'colors': uniq,
            'nonblank': bool(var ** 0.5 > 5 and uniq > 20)}
