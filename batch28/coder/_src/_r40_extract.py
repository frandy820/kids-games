# -*- coding: utf-8 -*-
"""r40 谱提取器：从 coder/index.html 页内提取 40 关 quizzes JSON（baseline/post 对照共用）。
投影口径：[{flat,dch,g,quizzes:[{kind,grid{start,goal,stones},pool,seq,opts,answer}]}]
（r36 范式：baseline 旧谱无 g/seq 字段口径——提取器统一补默认值防假差异；
  r40 旧谱 g 恒 3、path seq 恒 2、opts 恒 3——新谱差异即难度改造实证）。
用法: python _r40_extract.py <out.json>"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'r40-post.json'

JS = """() => Array.from({length: 40}, (_, f) => {
  const L = genLevel(f);
  return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({
    kind: q.kind,
    g: q.g || 3,
    start: [q.start.r, q.start.c],
    goal: [q.goal.r, q.goal.c],
    stones: q.stones.map(s => [s.r, s.c]),
    pool: q.kind === 'run' ? q.pool.map(c => c.dir) : null,
    seq: q.kind === 'path' ? q.seq.slice() : null,
    opts: q.kind === 'path' ? q.opts.map(o => [o.r, o.c]) : null,
    answer: q.kind === 'path' ? q.answer : -1
  })) };
})"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(URL + '?verify=1')
    pg.wait_for_timeout(400)
    data = pg.evaluate(JS)
    b.close()

OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
kinds, gs, seqs, optn, dists = {}, {}, {}, {}, 0
for lv in data:
    for q in lv['quizzes']:
        kinds[q['kind']] = kinds.get(q['kind'], 0) + 1
        gs[q['g']] = gs.get(q['g'], 0) + 1
        if q['kind'] == 'path':
            seqs[len(q['seq'])] = seqs.get(len(q['seq']), 0) + 1
            optn[len(q['opts'])] = optn.get(len(q['opts']), 0) + 1
        else:
            dists += abs(q['start'][0] - q['goal'][0]) + abs(q['start'][1] - q['goal'][1])
print('written:', OUT, '| levels:', len(data), '| kind dist:', kinds,
      '| g:', gs, '| seq lens:', seqs, '| opt counts:', optn)
