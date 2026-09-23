# -*- coding: utf-8 -*-
"""r29 compare 改造前后对照：从真实页提取 genLevel(flat) 全量 quizzes JSON
用法: python _r29_extract.py <输出json路径>   （对象=../index.html 已构建产物）
提取 flat 0-39（静态 20 + 生成 20）。r27 m4 教训：谱证据工具随款归档本目录。
字段口径（符号题/三卡题统一抽取，r28 教训：精确定义防外部复算假差异）：
  符号题 {mode:count|num|mix, answer:'>'|'<'|'=', L,R:{n,kind}, isEq}
  tri    {mode:'tri', qtype:'max'|'min', cards:[n×3], answer:idx}
  near   {mode:'near', target:N, cards:[n×3], dists:[d×3], answer:idx(距离最小)}"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SRC = (HERE.parent / 'index.html').resolve()
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE / 'r29-baseline.json'

EXTRACT = """() => {
  const out = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    out[f] = { ch: L.ch, dch: L.dch, lv: L.lv, quizzes: L.quizzes.map(q => {
      if (q.mode === 'tri') return { mode: 'tri', qtype: q.qtype,
        cards: q.cards.map(c => c.n), answer: q.answer };
      if (q.mode === 'near') return { mode: 'near', target: q.target,
        cards: q.cards.map(c => c.n), dists: q.cards.map(c => c.d), answer: q.answer };
      return { mode: q.mode, answer: q.answer, isEq: q.answer === '=',
               L: q.left.n, Lk: q.left.kind, R: q.right.n, Rk: q.right.kind };
    }) };
  }
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    pg = ctx.new_page()
    pg.goto(SRC.as_uri() + '?verify=1')
    pg.wait_for_function("typeof genLevel === 'function'", timeout=10000)
    data = pg.evaluate(EXTRACT)
    b.close()

OUT.write_text(json.dumps(data, ensure_ascii=False, sort_keys=True), encoding='utf-8')
nq = sum(len(v['quizzes']) for v in data.values())
print('OK %s: %d levels, %d quizzes' % (OUT.name, len(data), nq))
