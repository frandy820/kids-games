# -*- coding: utf-8 -*-
"""5 岁半试玩修复轮定向实证（2026-09-06）
①spotdiff 横屏图幅（row 布局+每幅 ≥580 宽） ②connect 超纲对知识语音+每关限2
③三款 flat≥3 开场任务语音 ④countchick 选项永不含 0 ⑤connect 反向拖提示节流
⑥spotdiff 点上图提示节流 ⑦countchick 重新数语音
方法=独立 chromium 无头 + wrap KIDS.voice.play 计数（DOM 断言口径，零图像分析）"""
import asyncio, json, sys
from playwright.async_api import async_playwright

BASE = r'F:/claudecode/projects/active/kids-games/batch5'
PASS, FAIL = [], []

def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, detail))

async def wrapv(page):
    """wrap KIDS.voice.play 计数（须在最后一次 reload 之后装——reload 清 JS 上下文）"""
    await page.evaluate("""() => {
      window.__vcalls = [];
      const o = KIDS.voice.play.bind(KIDS.voice);
      KIDS.voice.play = (k, t) => { window.__vcalls.push(k); return o(k, t); };
    }""")

async def new_ready(ctx, game, seed_levels, extra_save=None):
    """开页面 + 页内 KIDS._save() 种档 + persist（直接 setItem 会被存档写入竞态覆盖）"""
    page = await ctx.new_page()
    await page.goto('file:///%s/%s/index.html' % (BASE, game))
    await page.wait_for_timeout(600)
    seed = {k: 3 for k in seed_levels}
    save_js = json.dumps(extra_save or {})
    await page.evaluate("""([seed, extra]) => {
      const sv = KIDS._save();
      Object.assign(sv.levels, seed);
      Object.assign(sv, extra);
      KIDS.store.persist();
    }""", [seed, json.loads(save_js)])
    return page

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1280, 'height': 800})

        # ---------- ① spotdiff 横屏图幅 ----------
        page = await new_ready(ctx, 'spotdiff', {'1-0': 3, '1-1': 3, '1-2': 3},
                               {'spotdiff': {'tutSeen': True}})
        await page.reload(); await page.wait_for_timeout(900)
        await wrapv(page)
        m = await page.evaluate("""() => {
          const dir = getComputedStyle(document.getElementById('pics')).flexDirection;
          const svgs = [...document.querySelectorAll('.pic svg')].map(s => Math.round(s.getBoundingClientRect().width));
          const hs = [...document.querySelectorAll('.pic svg')].map(s => Math.round(s.getBoundingClientRect().height));
          return {dir, w: svgs, h: hs, ow: document.documentElement.scrollWidth - document.documentElement.clientWidth};
        }""")
        rec('① spotdiff 横屏 row 布局', m['dir'] == 'row', 'dir=%s' % m['dir'])
        rec('① spotdiff 横屏图幅 ≥580', all(w >= 580 for w in m['w']) and all(h >= 200 for h in m['h']),
            'w=%s h=%s (修前 483×278) overflowX=%s' % (m['w'], m['h'], m['ow']))
        # ⑥ 点上图提示节流
        top = page.locator('#pic-top')
        await top.dispatch_event('pointerdown'); await page.wait_for_timeout(200)
        await top.dispatch_event('pointerdown'); await page.wait_for_timeout(200)
        calls6 = await page.evaluate('window.__vcalls.filter(k => k === "spd_top").length')
        rec('⑥ 点上图提示 spd_top 10s 节流', calls6 == 1, '两次连点播 %d 次(期望1)' % calls6)
        # ③ spotdiff flat3 开场语音（开场在 init 时播、wrap 前不可见 → 点重玩重触发 startLevel）
        await page.locator('#btn-replay').dispatch_event('pointerdown')
        await page.wait_for_timeout(400)
        calls3 = await page.evaluate('window.__vcalls.filter(k => k === "spd_hint").length')
        cur3 = await page.evaluate('SPD.currentLevel.flat')
        rec('③ spotdiff flat≥3 开场任务语音', cur3 == 3 and calls3 >= 1, 'flat=%s 播 %d 次' % (cur3, calls3))
        await page.close()

        # ---------- ②⑤③ connect（firstDay=昨天：dayIndex=2→lim=12，种 10 关不触发 dayEnd 落回 flat0） ----------
        import datetime
        ystd = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
        page = await new_ready(ctx, 'connect',
                               {'1-0': 3, '1-1': 3, '1-2': 3, '1-3': 3, '1-4': 3,
                                '2-0': 3, '2-1': 3, '2-2': 3, '2-3': 3, '2-4': 3},
                               {'connect': {'tutSeen': True}, 'firstDay': ystd})
        await page.reload(); await page.wait_for_timeout(900)
        await wrapv(page)
        flat = await page.evaluate('CON.currentLevel.flat')
        # ③ 开场语音：重玩按钮重触发 startLevel（开场在 init 时播、wrap 前不可见）
        await page.locator('#btn-replay').dispatch_event('pointerdown')
        await page.wait_for_timeout(400)
        calls3 = await page.evaluate('window.__vcalls.filter(k => k === "con_hint").length')
        rec('③ connect flat≥3 开场任务语音', flat == 10 and calls3 >= 1, 'flat=%s 播 %d 次' % (flat, calls3))
        # ⑤ 反向拖提示节流（先于解题测：确保有未吃食物卡）
        f = await page.evaluate("""() => {
          const el = document.querySelector('.fcard:not(.eaten)');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return [r.left + r.width / 2, r.top + r.height / 2];
        }""")
        if f:
            await page.mouse.move(f[0], f[1])
            await page.mouse.down(); await page.wait_for_timeout(120)
            await page.mouse.up(); await page.wait_for_timeout(150)
            await page.mouse.down(); await page.wait_for_timeout(120)
            await page.mouse.up(); await page.wait_for_timeout(150)
            n5 = await page.evaluate("window.__vcalls.filter(k => k === 'con_rev').length")
            rec('⑤ connect 反向拖提示 con_rev 10s 节流', n5 == 1, '两次连点播 %d 次(期望1)' % n5)
        else:
            rec('⑤ connect 反向拖提示', False, '无未吃食物卡')
        # ② 知识语音：当前关找超纲对连它
        info = await page.evaluate("""async () => {
          const q = CON.quiz;
          const kv = q.pairs.filter(p => PAIR_VOICE[p]);
          const out = {pairs: q.pairs, kv, played: []};
          for (const a of kv.slice(0, 3)) {
            await CON.dragTo(a, a);
            await new Promise(r => setTimeout(r, 300));
          }
          out.played = window.__vcalls.filter(k => k.startsWith('con_pair_'));
          return out;
        }""")
        rec('② connect 知识语音（本关超纲对 %d 个）' % len(info['kv']),
            len(info['kv']) >= 1 and len(info['played']) == min(2, len(info['kv'])),
            'pairs=%s 播=%s' % (info['pairs'], info['played']))
        # 每关限 2：第三对（若有）不再播
        if len(info['kv']) >= 3:
            n3 = await page.evaluate("window.__vcalls.filter(k => k.startsWith('con_pair_')).length")
            rec('② connect 知识语音每关限 2', n3 == 2, '连3对播 %d 次' % n3)
        await page.close()

        # ---------- ④⑦③ countchick ----------
        page = await new_ready(ctx, 'countchick', {'1-0': 3, '1-1': 3, '1-2': 3},
                               {'chk': {'tutSeen': True}})
        await page.reload(); await page.wait_for_timeout(900)
        await wrapv(page)
        flat = await page.evaluate('CHK.currentLevel.flat')
        # ③ 开场语音：重玩按钮重触发 startLevel
        await page.locator('#btn-replay').dispatch_event('pointerdown')
        await page.wait_for_timeout(400)
        calls3 = await page.evaluate('window.__vcalls.filter(k => k === "chk_hint").length')
        rec('③ countchick flat≥3 开场任务语音', flat == 3 and calls3 >= 1,
            'flat=%s 播 %d 次' % (flat, calls3))
        # ④ 选项永不含 0（40 关全量）
        z = await page.evaluate("""() => {
          let bad = [];
          for (let f = 0; f < 40; f++) {
            const L = genLevel(f);
            L.quizzes.forEach((q, i) => { if (q.items.indexOf(0) >= 0) bad.push(f + '-' + i + ':' + q.items); });
          }
          return bad;
        }""")
        rec('④ countchick 40 关选项永不含 0', len(z) == 0, '违规 %s' % z[:3] if z else '(n=1 → 2,3)')
        # ⑦ 重新数语音
        await page.evaluate("CHK.tapChick(0)")
        await page.wait_for_timeout(150)
        await page.evaluate("CHK.recount()")
        await page.wait_for_timeout(150)
        n7 = await page.evaluate("window.__vcalls.filter(k => k === 'chk_rec').length")
        rec('⑦ countchick 重新数语音 chk_rec', n7 == 1, '播 %d 次' % n7)
        await page.close()
        await browser.close()

    print('\nTOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
