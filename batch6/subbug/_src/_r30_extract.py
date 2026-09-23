# -*- coding: utf-8 -*-
"""r30 subbug 改造前后对照：从真实页提取 genLevel(flat) 全量 quizzes JSON
用法: python _r30_extract.py <输出json路径>   （对象=../index.html 已构建产物）
提取 flat 0-39（静态 20 + 生成 20）。r27 m4 教训：谱证据工具随款归档本目录。
字段口径（r28 教训：精确定义防外部复算假差异）：
  一步题 {type:'sub', n, m, answer, items[n×3], answerIdx, lady:N}
  两步题 {type:'dual', form:'A'|'B', n, b, c, s, m(=飞走数), flyIn(=飞来数),
         answer, items[n×3], answerIdx, lady:0}"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SRC = (HERE.parent / 'index.html').resolve()
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE / 'r30-baseline.json'

EXTRACT = """() => {
  const out = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    out[f] = { ch: L.ch, dch: L.dch, lv: L.lv, quizzes: L.quizzes.map(q => ({
      type: q.type || 'sub',
      form: q.form || undefined,
      n: q.n, m: q.m, b: q.b, c: q.c, s: q.s, flyIn: q.flyIn,
      answer: q.answer, items: q.items, answerIdx: q.answerIdx,
      lady: q.ladybugs.length
    })) };
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
