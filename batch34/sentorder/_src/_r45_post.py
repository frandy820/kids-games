# -*- coding: utf-8 -*-
"""r45 谱投影工具：从 index.html 真实页提取 genLevel 全量谱（flat0-59 × 5 题）→ JSON 落盘。
用法: python batch34/sentorder/_src/_r45_post.py [输出路径] [flat 上限]
- 改造前跑 = 基线谱（_r45_baseline.json）；改造后跑 = 投影谱（_r45_post.json）
- 提取面：每关 {flat, ch, dch, lv, quizzes:[{words, text, opts:[{w}]}]}——逐字段可对账
（r27 §7④：谱证据工具随款归档 _src/，不落 F:/claudecode/test）"""
import asyncio, io, json, os, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from pathlib import Path
from playwright.async_api import async_playwright

URL = 'file:///' + (Path(os.path.dirname(os.path.abspath(__file__))).parent / 'index.html').as_posix()
OUT = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parent / '_r45_post.json')
NMAX = int(sys.argv[2]) if len(sys.argv) > 2 else 60

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--mute-audio'])
        pg = await b.new_page()
        await pg.goto(URL + '?verify=1')
        await pg.wait_for_timeout(1200)
        rows = await pg.evaluate('''(n) => {
          const out = [];
          for (let f = 0; f < n; f++) {
            const L = genLevel(f);
            out.push({ flat: f, ch: L.ch, dch: L.dch, lv: L.lv,
              quizzes: L.quizzes.map(q => ({ words: q.words.slice(), text: q.text,
                opts: q.opts.map(c => ({ w: c.w })) })) });
          }
          return out; }''', NMAX)
        await b.close()
    Path(OUT).write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    print('written:', OUT, len(rows), 'levels')

asyncio.run(main())
