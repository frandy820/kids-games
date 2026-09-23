# -*- coding: utf-8 -*-
"""r44 谱提取器（r33 范式，谱证据工具随款归档——r27 m4 落实）：
页内 genLevel 40 关（flat 0-39）投影 JSON 落盘，供 baseline/post 对拍与主线审查轮复算。
用法: python _r44_extract.py <out.json> [--full]
--full: 落全量字段（含 cells/bunnyAt/_miss 等，供 pycheck 位级对拍）；
默认=语义投影 [kind, ask, ask2, house, face, bunnyAt, answer]（r31 口径：投影比对防假差异——
baseline 旧题型无 ask2/house/face 字段，投影键恒在值 null，防字段缺省假差异）。"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()

# 静音纪律（r28 定稿 function 版）：无种子页 ctx 级静音（谱提取页=verify 外真实页，
# genLevel 直调不触发播放，双保险仍挂）
MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},5);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")

PROJ = """(() => {
  const proj = q => ({ kind: q.kind, ask: q.ask || null,
    ask2: q.ask2 || null, house: q.house || null, face: q.face || null,
    bunnyAt: q.bunnyAt === undefined ? null : q.bunnyAt, answer: q.answer });
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
        pg.goto(URL)
        pg.wait_for_function('() => typeof genLevel === "function"', timeout=8000)
        data = pg.evaluate(PROJ % ('full' if full else 'proj'))
        browser.close()
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    n = sum(len(v['qs']) for v in data.values())
    print('EXTRACT %s levels=%d quizzes=%d full=%s' % (out_path.name, len(data), n, full))


if __name__ == '__main__':
    main()
