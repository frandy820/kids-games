# -*- coding: utf-8 -*-
"""pattern 首单元门禁（r27② 维护轮建，gate_common6 同构三门）：
G1 verify selftest 复跑（VERIFY PASS+0 pageerror）
G2 真实页 autoSolve 通关+写档 3 星+0 pageerror（pattern 差异：PAT.autoSolve() 返
   boolean 非 {done}——gate_common6 的 r.get('done') 不适用，本门独立适配，不动共享工具）
G3 clips 注入（manifest games 含 pattern=6 键全注入）
全程 MUTE 静音双保险（任务书定稿 function 版 init_script + 完整 core 字段种档
sound:false/tts:false/vol:0——缺字段 core 走新档重建丢款字段，r28 教训⑤）。
用法: python _gate3.py   （在 batch3/pattern/ 下运行；独立 chromium 无头，不连/不杀浏览器）"""
import asyncio, io, json, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent
URL_V = 'file:///' + (BASE / 'index.html').as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / 'index.html').as_posix()
MUTE_INIT = "(() => { const P = Audio.prototype.play; Audio.prototype.play = function(){ setTimeout(()=>{ try{ this.dispatchEvent(new Event('ended')); }catch(e){} }, 1500); return P.call(this); }; Audio.prototype.pause = function(){}; })()"
# 完整 core 档字段 + 款字段 pat.tutSeen（跳教学；缺字段=core 新档重建丢款字段）
SEED_SAVE = ('{"v": "1.0", "game": "pattern", "firstDay": "2026-09-01", "lastDay": "2026-09-23",'
             ' "levels": {}, "dailyMin": {}, "bonus": {},'
             ' "settings": {"sound": false, "tts": false, "vol": 0},'
             ' "restTip": {"day": "", "shown": 0}, "pat": {"tutSeen": true}}')
NCLIPS = 6  # manifest games 含 pattern：core_chapter_end/core_day_end/core_rest/pat_hint/pat_tut_turn/pat_tut_watch

PASS, FAIL = [], []


def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print(('[PASS] ' if ok else '[FAIL] ') + name + (' | ' + detail if detail else ''))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # G1 verify 复跑
        ctx = await b.new_context()
        await ctx.add_init_script(MUTE_INIT)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_V)
        title = ''
        for _ in range(240):
            title = await pg.evaluate('document.title')
            if 'VERIFY' in title:
                break
            await pg.wait_for_timeout(500)
        rec('G1 verify selftest 复跑', 'VERIFY PASS' in title and not errs,
            'title=%r errs=%s' % (title, errs[:1]))
        await ctx.close()

        # G2 真实页通关+写档（PAT.autoSolve() 返 boolean——pattern 专属适配）
        ctx = await b.new_context()
        await ctx.add_init_script(MUTE_INIT)
        await ctx.add_init_script("localStorage.setItem('kidsgame_pattern', '%s')" % SEED_SAVE)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_R)
        await pg.wait_for_timeout(2500)
        r = await pg.evaluate('PAT.autoSolve()')
        stars = None
        for _ in range(30):
            stars = await pg.evaluate(
                "(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg.wait_for_timeout(500)
        rec('G2 通关+写档', r is True and stars == 3 and not errs,
            'autoSolve=%s stars=%s errs=%s' % (r, stars, errs[:1]))
        await ctx.close()

        # G3 clips 注入（manifest games 全集=6+零缺）
        ctx = await b.new_context()
        await ctx.add_init_script(MUTE_INIT)
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(1800)
        mani = (BASE.parent.parent / 'voice' / 'clips' / 'manifest.json').read_text(encoding='utf-8')
        js = ("((g, m) => { const miss = []; let n = 0; for (const k in m) if (m[k].games.includes(g)) {"
              "n++; if (!KIDS.voice.clips[k] || !KIDS.voice.clips[k].startsWith('data:audio/mpeg;base64,')) miss.push(k); }"
              "return {n, miss}; })('pattern', %s)") % mani
        r = await pg.evaluate(js)
        rec('G3 clips 全注入', not r['miss'] and r['n'] == NCLIPS,
            'n=%d miss=%s' % (r['n'], r['miss'][:3]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)


asyncio.run(main())
