# -*- coding: utf-8 -*-
"""batch3 视觉审查截图脚本 — 独立 chromium.launch() 无头，不连接/不杀任何现有浏览器"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

BASE = "file:///F:/claudecode/projects/active/kids-games"
OUT = "F:/claudecode/projects/active/kids-games/batch3/shots_review"
DESKTOP = {"width": 1280, "height": 800}
PORTRAIT = {"width": 800, "height": 1180}

async def newpage(ctx):
    page = await ctx.new_page()
    page.on("pageerror", lambda e: print("  [pageerror]", str(e)[:160]))
    return page

async def settle(page, ms=1100):
    await page.wait_for_timeout(ms)

async def shot(page, name):
    await page.screenshot(path=f"{OUT}/{name}.png")
    print("  saved", name)

async def wait_overlay(page, cls=".k-celebrate", timeout=12000):
    """轮询等待 celebrate overlay 挂到 DOM"""
    for _ in range(int(timeout / 100)):
        if await page.evaluate(f"() => !!document.querySelector('{cls}')"):
            return True
        await page.wait_for_timeout(100)
    return False

async def shoot_game(ctx, slug, api, url):
    """每款 5 张：home / play / wrong / celebrate / portrait"""
    page = await newpage(ctx)
    await page.set_viewport_size(DESKTOP)
    print(f"[{slug}] load")
    await page.goto(url)
    await settle(page, 1600)
    await shot(page, f"{slug}-01-home")

    # ---- 答对 1 题进入有进度主界面 ----
    quiz_js = "window." + api + ".quiz" if api != "PAT" else "window.PAT.quiz()"
    q = await page.evaluate("() => " + quiz_js)
    ok = q["answer"] if api == "PYI" else q["answerIdx"]
    # 错误项：pinyin 传值，math/pattern 传索引
    if api == "PYI":
        bad = next(it for it in q["items"] if it != q["answer"])
    else:
        bad = next(i for i in range(len(q["items"])) if i != q["answerIdx"])
    await page.evaluate("v => window.%s.pick(v)" % api, ok)
    await settle(page, 1500)   # 等答对演出结束进入下一题
    await shot(page, f"{slug}-02-play")

    # ---- 答错反馈态（shake 动画进行中） ----
    q2 = await page.evaluate("() => " + quiz_js)
    if q2:
        if api == "PYI":
            bad2 = next(it for it in q2["items"] if it != q2["answer"])
        else:
            bad2 = next(i for i in range(len(q2["items"])) if i != q2["answerIdx"])
        await page.evaluate("v => window.%s.pick(v)" % api, bad2)
        await page.wait_for_timeout(240)   # shake 0.42-0.5s 进行中
        await shot(page, f"{slug}-03-wrong")
        await settle(page, 1300)           # 等演出结束

    # ---- 过关庆祝：启动 autoSolve，轮询 celebrate overlay ----
    await page.evaluate("() => window.%s.autoSolve()" % api)
    found = await wait_overlay(page)
    if found:
        await page.wait_for_timeout(650)   # 庆祝展开中
        await shot(page, f"{slug}-04-celebrate")
    else:
        print(f"  !! {slug} no celebrate overlay found")
    await settle(page, 800)
    await page.close()

    # ---- 竖屏 800x1180 首屏 ----
    page2 = await newpage(ctx)
    await page2.set_viewport_size(PORTRAIT)
    await page2.goto(url)
    await settle(page2, 1600)
    await shot(page2, f"{slug}-05-portrait")
    # 竖屏溢出检测
    ov = await page2.evaluate("() => ({sw: document.documentElement.scrollWidth, iw: window.innerWidth})")
    print(f"  portrait overflow: scrollW={ov['sw']} innerW={ov['iw']} {'OK' if ov['sw'] <= ov['iw'] else '!!OVERFLOW'}")
    await page2.close()

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)   # 独立实例
        ctx = await browser.new_context(viewport=DESKTOP, device_scale_factor=1)

        # ---- 三款 batch3 ----
        await shoot_game(ctx, "pinyin", "PYI", f"{BASE}/batch3/pinyin/index.html")
        await shoot_game(ctx, "math",   "MATH", f"{BASE}/batch3/math/index.html")
        await shoot_game(ctx, "pattern","PAT",  f"{BASE}/batch3/pattern/index.html")

        # ---- 入口页 ----
        page = await newpage(ctx)
        await page.goto(f"{BASE}/batch3/index.html")
        await settle(page, 900)
        await shot(page, "entry-01-desktop")
        await page.set_viewport_size(PORTRAIT)
        await settle(page, 500)
        await shot(page, "entry-02-portrait")
        await page.close()

        # ---- 基准 IP 对照（首页即主界面） ----
        for slug, path in [("ref-pipe", "batch1/pipe-rabbit/index.html"),
                           ("ref-tangram", "batch2/tangram/index.html")]:
            rp = await newpage(ctx)
            await rp.goto(f"{BASE}/{path}")
            await settle(rp, 1800)
            await shot(rp, f"{slug}-01-home")
            await rp.close()

        await browser.close()
    print("DONE")

asyncio.run(main())
