# -*- coding: utf-8 -*-
import sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright
from collections import Counter
BASE = 'F:/claudecode/projects/active/kids-games/batch21'
def scan(game, peek):
    URL = 'file:///' + BASE + '/' + game + '/index.html?verify=1'
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])
        pg = b.new_page(viewport={'width': 1024, 'height': 700})
        pg.goto(URL)
        for _ in range(120):
            if 'VERIFY' in (pg.title() or '') and pg.title() != 'VERIFY': break
            pg.wait_for_timeout(500)
        out = {}
        for flat in range(20):
            out[flat] = pg.evaluate('(f) => genLevel(f).quizzes.map(q => %s)' % peek, flat)
        b.close()
        return out
feed = scan('feed', "(q.kind === 'add' ? 'add n=' + q.n + '(a+b=' + (q.n - q.extra) + '+' + q.extra + ')' : q.kind + ' n=' + q.n) + ' piles=' + q.piles.length")
bub = scan('bubble', "'n=' + q.n")
brg = scan('bridge', "q.kind")
for name, data in (('feed', feed), ('bubble', bub), ('bridge', brg)):
    by = {}
    for fl, ks in data.items():
        dch = (fl // 5) % 4 + 1
        by.setdefault(dch, Counter()).update(ks)
    print('==', name)
    for d in sorted(by):
        print('  ch%d (flat%d-%d):' % (d, (d - 1) * 5, (d - 1) * 5 + 4), dict(by[d]))
    if name == 'feed':
        pc = Counter()
        for fl, ks in data.items():
            pc.update([k.split('piles=')[1] for k in ks])
        print('  piles 堆数分布:', dict(pc))
