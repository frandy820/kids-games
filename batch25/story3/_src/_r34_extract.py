# -*- coding: utf-8 -*-
"""r34 谱提取器：从 index.html（verify=1 页内 genLevel）提取 40 关 quizzes 投影 JSON
用法: python _r34_extract.py <out.json>
投影字段（r32 范式）：flat → 关元数据 + 每题 {story, frames[{id,pos}], why}
（pos=-1=干扰帧标记，r34 新增；baseline 无 -1 自然缺省）"""
import json, sys, io
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri() + '?verify=1'
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'r34-post.json'

JS = """() => {
  const out = {};
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    out[flat] = {
      ch: L.ch, dch: L.dch,
      quizzes: L.quizzes.map(q => ({
        story: q.story,
        frames: q.frames.map(f => ({ id: f.id, pos: f.pos })),
        why: q.why ? { qi_opts: q.why.opts } : null
      }))
    };
  }
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    for _ in range(240):
        t = pg.title()
        if 'VERIFY' in t and t != 'VERIFY':
            break
        pg.wait_for_timeout(500)
    assert 'VERIFY PASS' in t, 'verify 页未 PASS: %r errs=%s' % (t, errs[:2])
    data = pg.evaluate(JS)
    b.close()

OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
n_q = sum(len(v['quizzes']) for v in data.values())
n_frames = sum(len(q['frames']) for v in data.values() for q in v['quizzes'])
print('OK %s: %d 关 %d 题 %d 帧, errs=%s' % (OUT.name, len(data), n_q, n_frames, errs[:2]))
