# -*- coding: utf-8 -*-
"""obs75 公共库：7岁半人设修复复核轮（无头、独立 chromium、禁图像分析）"""
import os

BASE = r'F:/claudecode/projects/active/kids-games/batch4'
OBS = os.path.join(BASE, '_obs75')

# KIDS 为顶层 const（词法绑定不挂 window），init script 拦不到；
# 但 evaluate 在 main world 可直接访问词法标识符 → goto/reload 后 evaluate 覆写
ENSURE_HOOK_JS = r"""
(() => {
  if (typeof KIDS === 'undefined' || !KIDS.voice) return 'noKIDS';
  window.__t0 = window.__t0 || Date.now();
  if (KIDS.__hooked) return 'already';
  KIDS.__hooked = true;
  window.__vc = [];
  window.__stars = [];
  KIDS.voice.play = function(k){ window.__vc.push({k:k, at:Date.now()}); };
  KIDS.voice.queue = function(ks){ window.__vc.push({k:'Q:'+ks.join('+'), at:Date.now()}); };
  const oc = KIDS.ui.celebrate;
  KIDS.ui.celebrate = function(s){ window.__stars.push({stars:s, at:Date.now()}); return oc.call(KIDS.ui, s); };
  return 'hooked';
})()
"""

async def ensure_hook(page):
    return await page.evaluate(ENSURE_HOOK_JS)

def game_url(game):
    return 'file:///' + BASE.replace('\\', '/') + '/' + game + '/index.html'

async def seed_levels(page, flats, bonus):
    """种档：levels 写 flat 0..flats-1 全 3 星 + bonusSet(bonus)，persist 后 reload（reload 后重装 hook）"""
    js = """([flats, bonus]) => {
      const sv = KIDS._save();
      sv.levels = sv.levels || {};
      for (let i = 0; i < flats; i++) sv.levels[(Math.floor(i/5)+1)+'-'+(i%5)] = {stars:3, plays:1};
      KIDS.calendar.bonusSet(bonus);
      KIDS.store.persist();
      return Object.keys(sv.levels).length;
    }"""
    n = await page.evaluate(js, [flats, bonus])
    await page.reload(wait_until='load')
    await ensure_hook(page)
    return n

async def measure(page, sels):
    js = """(sels) => { const o = {overflowX: document.documentElement.scrollWidth - window.innerWidth};
      for (const s of sels){ const els = document.querySelectorAll(s);
        if (!els.length){ o[s] = 'none'; continue; }
        let mw=1e9, mh=1e9; els.forEach(e=>{const r=e.getBoundingClientRect(); if(r.width>0){mw=Math.min(mw,r.width); mh=Math.min(mh,r.height);}});
        o[s] = {n: els.length, w: Math.round(mw), h: Math.round(mh)};
      } return o; }"""
    return await page.evaluate(js, sels)

async def layout_check(browser, game, hook, seed_to, bonus, sels, results):
    """双 viewport 布局：flat0（新档）+ 种档到 seed_to 关"""
    for (w, h) in [(1280, 800), (800, 1180)]:
        ctx = await browser.new_context(viewport={'width': w, 'height': h})
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        r = {'w': w, 'h': h}
        try:
            await page.goto(game_url(game), wait_until='load')
            await page.wait_for_function('window.%s && %s.currentLevel' % (hook, hook), timeout=12000)
            await page.wait_for_timeout(1100)
            r['flat0'] = await measure(page, sels)
            if seed_to:
                await seed_levels(page, seed_to, bonus)
                await page.wait_for_function('%s.currentLevel.flat===%d' % (hook, seed_to), timeout=12000)
                await page.wait_for_timeout(1100)
                r['flat%d' % seed_to] = await measure(page, sels)
        except Exception as ex:
            r['error'] = str(ex)[:200]
        r['pageerrors'] = errs
        results.append(r)
        await ctx.close()
