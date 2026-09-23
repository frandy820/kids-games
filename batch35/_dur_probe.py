# -*- coding: utf-8 -*-
"""量 turntake 新合成 mp3 浏览器 Audio 实时长（verify 同口径）"""
from playwright.sync_api import sync_playwright
import pathlib, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

D = pathlib.Path('F:/claudecode/projects/active/kids-games/voice/clips')
KEYS = ['tt_tut_watch', 'tt_tut_turn', 'tt_hint', 'tt_right', 'tt_wrong', 'tt_wait',
        'tt_order_hint', 'tt_order_wrong', 'tt_rabbit_wrong']

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto('about:blank')
    for k in KEYS:
        u = (D / (k + '.mp3')).as_uri()
        d = pg.evaluate('''async (u) => {
            const a = new Audio(u);
            await a.load();
            return new Promise(r => {
                a.onloadedmetadata = () => r(Math.round(a.duration * 1000));
                setTimeout(() => r(-1), 8000);
            });
        }''', u)
        print(k, d)
    b.close()
