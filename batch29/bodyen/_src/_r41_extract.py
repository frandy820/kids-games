# -*- coding: utf-8 -*-
"""r41 谱投影提取器（r27-r32 范式）：页内 genLevel(0..39) 逐关投影 → JSON
用法: python _r41_extract.py [--out r41-baseline.json]
投影口径: {flat, dch, q:[[kind, ask, optIds, answer], ...]}（optIds='p:x'/'w:x'/'t:x'/'a:v'）
基线（改造前）与 post（改造后）同口径；锚面对比用 kind/ask 前两列。"""
import asyncio, io, json, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[sys.argv.index('--out') + 1]) if '--out' in sys.argv else BASE / '_src' / 'r41-baseline.json'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context()
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///' + (BASE / 'index.html').as_posix())
        await pg.wait_for_timeout(600)
        data = await pg.evaluate('''(async () => {
          const out = [];
          for (let f = 0; f < 40; f++) {
            const L = genLevel(f);
            out.push({ flat: f, dch: L.dch,
              q: L.quizzes.map(z => [z.kind, z.ask, z.opts.map(o => o.id), z.answer]) });
          }
          return out;
        })()''')
        await ctx.close()
        await b.close()
    if errs:
        print('PAGEERRORS:', errs[:3]); sys.exit(2)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    kinds = {}
    asks = set()
    for lv in data:
        for q in lv['q']:
            kinds[q[0]] = kinds.get(q[0], 0) + 1
            asks.add(q[1])
    print('OK', OUT, len(data), 'levels;', sum(kinds.values()), 'questions; kinds=', kinds,
          '; distinct asks=', len(asks))

asyncio.run(main())
