# -*- coding: utf-8 -*-
"""batch6 首单元门禁（gate_common40 通用版适配 words——r28 首建）：verify selftest 复跑 + 真实页通关/写档 + clips 注入
用法: python gate_common6.py <game> <hook> [clips_n]
  game: words|compare|subbug  hook: WRD|CMP|SUB
  clips_n: manifest games 计数（words=63（r28 注册 7 键后：55 字+5 UI+3 通用））
差异 vs batch40 版：words 老批次无 __xxxDemoR 教学演示全局变量——G2 教学链细节
由 _selftest 覆盖，本门 G2 验真实页 autoSolve 通关+写档 3 星+0 pageerror；全程 MUTE
静音双保险（r19 红线——batch40 版未挂系历史缺口，本版起补；MUTE_INIT 取 words r28
Executor 定稿 function 版——任务书旧版括号失衡语法错已由 node --check 实锤）。"""
import asyncio, io, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(os.path.dirname(os.path.abspath(__file__)))
GAME, HOOK = sys.argv[1], sys.argv[2]
NCLIPS = int(sys.argv[3]) if len(sys.argv) > 3 else None
GAME_DIR = {'words': 'words', 'compare': 'compare', 'subbug': 'subbug',
             'neighbors': '../batch8/neighbors',   # r31 起跨批次款（b8）相对 BASE 解析
             'worden': '../batch8/worden',         # r32 起接入（b8 同批）
             'whereistand': '../batch9/whereistand'}   # r33 起接入（b9）
URL_V = 'file:///' + (BASE / GAME_DIR[GAME] / 'index.html').resolve().as_posix() + '?verify=1'
URL_R = 'file:///' + (BASE / GAME_DIR[GAME] / 'index.html').resolve().as_posix()
MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""
# 款字段映射（game→存档内款键；r28 words/r29 compare 首测——后续款按需扩）
SAVE_GAME_KEY = {'words': 'wrd', 'compare': 'cmp', 'subbug': 'sub', 'neighbors': 'neb',
                 'worden': 'wen', 'whereistand': 'wis'}
GKEY = SAVE_GAME_KEY[GAME]
SEED_SAVE = ('{"v": "1.0", "game": "%s", "firstDay": "2026-09-01", "lastDay": "2026-09-21",'
             '"levels": {}, "dailyMin": {}, "bonus": {},'
             '"settings": {"sound": false, "tts": false, "vol": 0},'
             '"restTip": {"day": "", "shown": 0}, "%s": {"tutSeen": true}}'
             ) % (GAME, GKEY)  # 完整 core 档字段（缺字段 core 走新档重建丢款字段——r28 两坑之二；tutSeen 跳教学（教学链 _selftest 专测）
PASS, FAIL = [], []
def rec(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    print(('[PASS] ' if ok else '[FAIL] ') + name + (' | ' + detail if detail else ''))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # G1 verify selftest 复跑
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
        rec('G1 verify selftest 复跑', 'VERIFY PASS' in title and not errs, 'title=%r errs=%s' % (title, errs[:1]))
        await ctx.close()

        # G2 真实页通关+写档（教学链细节在 _selftest；此处真实管线 autoSolve+3 星写档+0 pageerror）
        ctx = await b.new_context()
        await ctx.add_init_script(MUTE_INIT)
        await ctx.add_init_script("localStorage.setItem('kidsgame_%s', '%s')" % (GAME, SEED_SAVE))
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL_R)
        await pg.wait_for_timeout(2500)
        r = await pg.evaluate('%s.autoSolve()' % HOOK)
        stars = None
        for _ in range(30):
            stars = await pg.evaluate("(KIDS._save()||{levels:{}}).levels['1-0'] ? KIDS._save().levels['1-0'].stars : null")
            if stars is not None:
                break
            await pg.wait_for_timeout(500)
        rec('G2 通关+写档', r.get('done') and stars == 3 and not errs,
            'auto=%s stars=%s errs=%s' % (r, stars, errs[:1]))
        await ctx.close()

        # G3 clips 注入（manifest games 全集+计数对账 words 63（r28 注册后））
        ctx = await b.new_context()
        await ctx.add_init_script(MUTE_INIT)
        pg = await ctx.new_page()
        await pg.goto(URL_R)
        await pg.wait_for_timeout(1800)
        mani = open(BASE.parent / 'voice' / 'clips' / 'manifest.json', encoding='utf-8').read()
        js = "((g, m) => { const miss = []; let n = 0; for (const k in m) if (m[k].games.includes(g)) {" \
             "n++; if (!KIDS.voice.clips[k] || !KIDS.voice.clips[k].startsWith('data:audio/mpeg;base64,')) miss.push(k); }" \
             "return {n, miss}; })('%s', %s)" % (GAME, mani)
        r = await pg.evaluate(js)
        n_ok = (NCLIPS is None or r['n'] == NCLIPS)
        rec('G3 clips 全注入', not r['miss'] and n_ok, 'n=%d miss=%s' % (r['n'], r['miss'][:3]))
        await ctx.close()
        await b.close()
    print('')
    print('TOTAL %d/%d PASS' % (len(PASS), len(PASS) + len(FAIL)))
    sys.exit(0 if not FAIL else 1)

asyncio.run(main())
