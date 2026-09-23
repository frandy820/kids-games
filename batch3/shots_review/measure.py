# -*- coding: utf-8 -*-
"""定量布局度量：三款游戏 × 双视口，提取元素实测尺寸/字号/位置"""
import asyncio, json
from playwright.async_api import async_playwright

GAMES = [
    ("pinyin",  "PYI",  "file:///F:/claudecode/projects/active/kids-games/batch3/pinyin/index.html",
     ["#target-card", "#track .car", "#btn-hear", "#btn-rabbit", "#btn-replay", "#train-tray", "#hud"]),
    ("math",    "MATH", "file:///F:/claudecode/projects/active/kids-games/batch3/math/index.html",
     ["#quiz-card", "#answers .ans", "#btn-rabbit", "#btn-replay", "#step-dots", "#hud", "#btn-count"]),
    ("pattern", "PAT",  "file:///F:/claudecode/projects/active/kids-games/batch3/pattern/index.html",
     ["#seq .seqcard", "#choices .choice", "#btn-rabbit", "#btn-replay", "#quiz-tray", "#hud"]),
]
VPS = [("desktop", 1280, 800), ("portrait", 800, 1180)]

JS = """(sels) => {
  const out = { vp: {w: innerWidth, h: innerHeight}, els: {} };
  for (const s of sels) {
    const n = document.querySelector(s);
    if (!n) { out.els[s] = null; continue; }
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    out.els[s] = {
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      fs: cs.fontSize, bg: cs.backgroundColor, color: cs.color,
      radius: cs.borderRadius, border: cs.borderColor
    };
  }
  // 所有 .car/.ans/.choice 逐个尺寸
  out.multi = {};
  for (const cls of ['.car', '.ans', '.choice', '.seqcard']) {
    const arr = [...document.querySelectorAll(cls)];
    if (arr.length) out.multi[cls] = arr.map(n => {
      const r = n.getBoundingClientRect();
      const g = n.querySelector('.glyph, .zi');
      const gs = g ? getComputedStyle(g).fontSize : null;
      return { w: Math.round(r.width), h: Math.round(r.height), fs: gs };
    });
  }
  return out;
}"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await ctx.new_page()
        report = {}
        for slug, api, url, sels in GAMES:
            report[slug] = {}
            for vp, w, h in VPS:
                await page.set_viewport_size({"width": w, "height": h})
                await page.goto(url)
                await page.wait_for_timeout(1300)
                data = await page.evaluate(JS, sels)
                report[slug][vp] = data
        with open("F:/claudecode/projects/active/kids-games/batch3/shots_review/measure.json", "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=1)
        # 控制台摘要
        for slug in report:
            for vp in report[slug]:
                m = report[slug][vp]["multi"]
                keys = {k: v for k, v in m.items()}
                hud = report[slug][vp]["els"].get("#hud")
                print(f"[{slug}/{vp}] hud={hud and (str(hud['h'])+'px')}", json.dumps(keys, ensure_ascii=False)[:300])
        await browser.close()

asyncio.run(main())
