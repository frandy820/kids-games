# -*- coding: utf-8 -*-
"""r31 neighbors 改造前后对照：从真实页提取 genLevel(flat) 全量 quizzes JSON
用法: python _r31_extract.py <输出json路径>   （对象=../index.html 已构建产物）
提取 flat 0-39（静态 20 + 生成 20）。r27 m4 教训：谱证据工具随款归档本目录。
字段口径（r28 教训：精确定义防外部复算假差异）：
  {mode, n, s(dual 中间态，仅 dual), answer, options[3], hidden[藏牌房号]}
  genOne 不写 kind 字段（r31 修复 m6：docstring 旧 kind(dual 'A'/'B') 说法删除——
  mode 已含 A/B 信息；EXTRACT 内 kind 行为历史遗留容错恒 null，保留是为与 r31-post.json
  逐字节对照不破，勿作为有效字段读）。baseline（改造前）无 s/hidden 字段——
  提取器容错缺省，对照按语义投影比对。"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SRC = (HERE.parent / 'index.html').resolve()
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE / 'r31-baseline.json'

EXTRACT = """() => {
  const out = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    out[f] = { ch: L.ch, dch: L.dch, lv: L.lv, quizzes: L.quizzes.map(q => ({
      mode: q.mode, n: q.n,
      s: q.s !== undefined ? q.s : undefined,
      kind: q.kind !== undefined ? q.kind : undefined,
      answer: q.answer, options: q.options,
      hidden: q.hidden ? q.hidden.slice() : []
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
