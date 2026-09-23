# -*- coding: utf-8 -*-
"""pipe 语音门禁冒烟：第 1 关应播、第 4 关起（flat>=3）应静音
预置存档 3 关已过 → start() 自动进第 4 关；点吉祥物触发 sayP 通道
"""
import os, datetime
from playwright.sync_api import sync_playwright

f = 'file:///' + os.path.abspath(os.path.join(os.path.dirname(__file__), 'pipe-rabbit', 'index.html')).replace(os.sep, '/')
today = datetime.date.today().strftime('%Y-%m-%d')
SAVE_L3 = "localStorage.setItem('kidsgame_pipe', JSON.stringify({v:'1.0',game:'pipe',firstDay:'%s',lastDay:'%s',levels:{'1-0':{stars:3,plays:1},'1-1':{stars:3,plays:1},'1-2':{stars:3,plays:1}},dailyMin:{},settings:{sound:false,tts:true,vol:0.3},restTip:{day:'',shown:0},tutSeen:true}));" % (today, today)

TAP = "() => { const log=[]; const o=KIDS.voice.play.bind(KIDS.voice); KIDS.voice.play=(k)=>log.push(k); document.getElementById('mascot').dispatchEvent(new Event('pointerdown')); KIDS.voice.play=o; return log; }"

with sync_playwright() as p:
    b = p.chromium.launch()
    # 第 1 关（无进度）：sayP 应触发
    p1 = b.new_page()
    p1.add_init_script(SAVE_L3.replace("'1-0':{stars:3,plays:1},'1-1':{stars:3,plays:1},'1-2':{stars:3,plays:1}", ''))
    p1.goto(f); p1.wait_for_timeout(1800)
    lvl1 = p1.evaluate("() => window.GAME.currentLevel")
    first = p1.evaluate(TAP)
    p1.close()
    # 第 4 关（3 关已过）：sayP 应静音
    p2 = b.new_page()
    p2.add_init_script(SAVE_L3)
    p2.goto(f); p2.wait_for_timeout(1800)
    lvl2 = p2.evaluate("() => window.GAME.currentLevel")
    fourth = p2.evaluate(TAP)
    p2.close()
    b.close()
    ok = len(first) >= 1 and len(fourth) == 0 and lvl2 in ('1-3',)
    print('PASS' if ok else 'FAIL', '| %s 播放:%s | %s 播放:%s' % (lvl1, first, lvl2, fourth))
    exit(0 if ok else 1)
