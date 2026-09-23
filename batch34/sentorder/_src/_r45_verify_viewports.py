# -*- coding: utf-8 -*-
"""r45 双视口 VERIFY 门禁（SPEC-R45 §R10②）：横 1280×800 + 真竖 800×1180 各跑 13 单元，
0 pageerror 才算过。静音双保险（r19 红线）：每页 goto 前挂 init_script——种档
kidsgame_sentorder settings{sound:false,tts:false,vol:0} + speechSynthesis/Audio.play no-op。
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀浏览器）；单 browser 串行 context 即 close。
用法: python batch34/sentorder/_src/_r45_verify_viewports.py"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

URL = 'file:///' + (Path(os.path.dirname(os.path.abspath(__file__))).parent / 'index.html').as_posix()
VIEWPORTS = [(1280, 800, 'landscape'), (800, 1180, 'portrait')]

MUTE_INIT = """(() => {
  try {
    const _d = new Date();
    const _t = _d.getFullYear() + '-' + String(_d.getMonth()+1).padStart(2,'0') + '-' + String(_d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_sentorder', JSON.stringify({v:'1.0',game:'sentorder',
      firstDay:_t, lastDay:_t, levels:{}, dailyMin:{},
      settings:{sound:false,tts:false,vol:0}}));
  } catch(e){}
  window.speechSynthesis && (speechSynthesis.speak = () => {}, speechSynthesis.cancel = () => {});
  const ap = Audio.prototype.play; Audio.prototype.play = function(){ try{ this.dispatchEvent(new Event('ended')); }catch(e){} return Promise.resolve(); };
})();"""

async def main():
    fails = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        for w, h, name in VIEWPORTS:
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script(MUTE_INIT)          # 静音双保险（r19 红线）
            await pg.goto(URL + '?verify=1')
            title = ''
            for _ in range(360):                          # 13 单元含全关驱动——等终态 title
                title = await pg.evaluate('document.title')
                if 'VERIFY' in title and title != 'VERIFY':
                    break
                await pg.wait_for_timeout(500)
            v = await pg.evaluate('window.VERIFY || null')
            okv = bool(v) and v['pass'] == v['total'] and 'PASS' in title
            print('[%s %dx%d] title=%s units=%s pageerrors=%d' % (
                name, w, h, title,
                ('%s/%s' % (v['pass'], v['total'])) if v else 'null', len(errs)))
            if v:
                for u in v['units']:
                    if not u['ok']:
                        print('   FAIL %s: %s' % (u['name'], u['note']))
            if errs:
                print('   pageerrors:', errs[:3])
            if not okv or errs:
                fails += 1
            await ctx.close()
        await b.close()
    print('VIEWPORTS', 'ALL PASS' if fails == 0 else 'FAIL x%d' % fails)
    sys.exit(1 if fails else 0)

asyncio.run(main())
