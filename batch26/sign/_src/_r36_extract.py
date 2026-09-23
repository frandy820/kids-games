# -*- coding: utf-8 -*-
"""r36 谱提取器：从 sign/index.html 页内提取 40 关 quizzes JSON（baseline/post 对照共用）。
投影口径：[{flat,dch,quizzes:[{sign,kind,flash,near,cards:[meaning...]}]}]
（r31 范式：baseline 旧谱无 kind/flash 字段——提取器统一补默认值防假差异）。
用法: python _r36_extract.py <out.json>"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'r36-post.json'

JS = """() => Array.from({length: 40}, (_, f) => {
  const L = genLevel(f);
  return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({
    sign: q.sign,
    kind: q.kind || 'mean',
    flash: !!q.flash,
    near: !!q.near,
    cards: q.cards.map(c => c.meaning)
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
kinds = {}
flash_n = 0
for lv in data:
    for q in lv['quizzes']:
        kinds[q['kind']] = kinds.get(q['kind'], 0) + 1
        flash_n += 1 if q['flash'] else 0
print('written:', OUT, '| levels:', len(data),
      '| kind dist:', kinds, '| flash quizzes:', flash_n)
