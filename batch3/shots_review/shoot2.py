# -*- coding: utf-8 -*-
"""补拍 pattern-02/03（上传缓存冲突）"""
import asyncio
from playwright.async_api import async_playwright

OUT = "F:/claudecode/projects/active/kids-games/batch3/shots_review"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await ctx.new_page()
        await page.goto("file:///F:/claudecode/projects/active/kids-games/batch3/pattern/index.html")
        await page.wait_for_timeout(1600)
        # 答对 2 题后拍 play 态
        for _ in range(2):
            q = await page.evaluate("() => window.PAT.quiz()")
            await page.evaluate("i => window.PAT.pick(i)", q["answerIdx"])
            await page.wait_for_timeout(1700)
        await page.screenshot(path=f"{OUT}/pat-mid-a.png")
        print("saved pat-mid-a")
        # 答错态
        q = await page.evaluate("() => window.PAT.quiz()")
        bad = next(i for i in range(len(q["items"])) if i != q["answerIdx"])
        await page.evaluate("i => window.PAT.pick(i)", bad)
        await page.wait_for_timeout(420)
        await page.screenshot(path=f"{OUT}/pat-err-a.png")
        print("saved pat-err-a")
        await browser.close()

asyncio.run(main())
