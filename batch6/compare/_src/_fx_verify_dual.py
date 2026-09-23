# -*- coding: utf-8 -*-
"""r29 家族修复门禁辅助：verify 页双视口复跑（1280x800 + 375x700）
独立 chromium 无头（不连/不杀任何浏览器进程）；每页 goto 前挂 MUTE init_script + 种档
（完整 core 字段，settings sound/tts/vol 全关）。判据：title=VERIFY PASS n/n + 0 pageerror。"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri() + '?verify=1'

# 任务书 MUTE 原文（每页 goto 前挂）
MUTE = "(() => { const P = Audio.prototype.play; Audio.prototype.play = function(){ setTimeout(()=>{ try{ this.dispatchEvent(new Event('ended')); }catch(e){} }, 1500); return P.call(this); }; Audio.prototype.pause = function(){}; })()"
# 种档：完整 core 字段 + 款字段 cmp.tutSeen（settings 全关）
SEED = ('localStorage.setItem("kidsgame_compare", '
        '"{\\"v\\": \\"1.0\\", \\"game\\": \\"compare\\", \\"firstDay\\": \\"2026-09-01\\", '
        '\\"lastDay\\": \\"2026-09-23\\", \\"levels\\": {}, \\"dailyMin\\": {}, \\"bonus\\": {}, '
        '\\"settings\\": {\\"sound\\": false, \\"tts\\": false, \\"vol\\": 0}, '
        '\\"restTip\\": {\\"day\\": \\"\\", \\"shown\\": 0}, \\"cmp\\": {\\"tutSeen\\": true}}")')

fails = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(1280, 800), (375, 700)]:
        ctx = b.new_context(viewport={'width': w, 'height': h})
        ctx.add_init_script(MUTE)
        ctx.add_init_script(SEED)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL)
        title = ''
        for _ in range(120):
            title = pg.title()
            if 'VERIFY' in title:
                break
            pg.wait_for_timeout(500)
        ok = title.startswith('VERIFY PASS') and not errs
        fails += 0 if ok else 1
        print('[%s] viewport %dx%d | title=%r pageerror=%d %s'
              % ('PASS' if ok else 'FAIL', w, h, title, len(errs), errs[:2]))
        ctx.close()
    b.close()
print('RESULT', 'ALL PASS' if fails == 0 else 'FAIL x%d' % fails)
sys.exit(0 if fails == 0 else 1)
