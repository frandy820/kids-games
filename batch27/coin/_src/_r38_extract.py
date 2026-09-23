# -*- coding: utf-8 -*-
"""r38 谱提取器（r35 范式适配 coin）：页内 genLevel 40 关（flat 0-39）投影 JSON 落盘
用法: python _r38_extract.py <out.json> [--full]
--full: 落全量字段（含 answer/_miss/_answered，供 pycheck 对拍）；
默认=语义投影 [kind, face, near, opts{id,text}]（谱对照口径——答案下标洗牌漂移不入谱差，
post 谱新增字段投影 null 防假差异，r31 口径）。"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()

# 静音纪律（r28/r19 定稿）：ctx 级静音 init script，防测试外放
MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")

PROJ = """(() => {
  const proj = q => ({ kind: q.kind, face: q.face, near: !!q.near,
    coins: q.coins || null,
    opts: q.opts.map(o => ({ id: o.id, text: o.text })) });
  const full = q => JSON.parse(JSON.stringify(q));
  const out = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    out[f] = { ch: L.ch, dch: L.dch, lv: L.lv,
      qs: L.quizzes.map(%s) };
  }
  return out;
})()"""


def main():
    out_path = Path(sys.argv[1])
    full = '--full' in sys.argv
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_JS)
        pg = ctx.new_page()
        pg.goto(URL + '?verify=1')
        pg.wait_for_function('() => typeof genLevel === "function"', timeout=8000)
        data = pg.evaluate(PROJ % ('full' if full else 'proj'))
        browser.close()
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    n = sum(len(v['qs']) for v in data.values())
    print('EXTRACT %s levels=%d quizzes=%d full=%s' % (out_path.name, len(data), n, full))


if __name__ == '__main__':
    main()
