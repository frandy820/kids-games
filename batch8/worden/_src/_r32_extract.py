# -*- coding: utf-8 -*-
"""r32 谱提取器（r30/r31 范式，随款归档 _src/）
用法: python _r32_extract.py [baseline|post]
从 ../index.html 页内提取 40 关（flat 0-39）quizzes JSON → r32-<tag>.json
字段口径（语义投影）: [mode, target, options, pick?, blankPos?]——r32 新增 blank 型
携带 pick/blankPos（post 侧 pycheck 复算覆盖）；baseline 无 blank 型自然缺字段。
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
TAG = sys.argv[1] if len(sys.argv) > 1 else 'post'

JS = """() => {
  const out = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    out[f] = L.quizzes.map(q => q.mode === 'blank'
      ? { mode: q.mode, target: q.target, options: q.options.slice(), pick: q.pick, blankPos: q.blankPos }
      : { mode: q.mode, target: q.target, options: q.options.slice() });
  }
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={'width': 1280, 'height': 800}).new_page()
    pg.goto(URL + '?verify=1')
    pg.wait_for_function('window.WEN && typeof genLevel === "function"', timeout=8000)
    data = pg.evaluate(JS)
    b.close()

out = HERE / ('r32-%s.json' % TAG)
out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
nq = sum(len(v) for v in data.values())
modes = {}
for v in data.values():
    for q in v:
        modes[q['mode']] = modes.get(q['mode'], 0) + 1
print('OK %s: %d levels %d quizzes modes=%s -> %s' % (TAG, len(data), nq, modes, out))
