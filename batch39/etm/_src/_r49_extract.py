# -*- coding: utf-8 -*-
"""r49 谱提取器（r33/r44 范式，谱证据工具随款归档）：
页内 genLevel 60 关（flat 0-59）投影 JSON 落盘，供 baseline/post 对拍与 pycheck 复算。
用法: python _r49_extract.py <out.json> [--full]
--full: 落全量字段（含 row/_miss/_answered 等，供 pycheck 位级对拍）；
默认=语义投影 [kind, scene, ans, answer, picks]（r31 口径：投影比对防假差异——
baseline 旧题型无 mix 族，投影键恒在，防字段缺省假差异）。
静音纪律（r28 定稿 function 版 1500ms ended）：ctx 级静音（谱提取页=verify 外真实页，
genLevel 直调不触发播放，双保险仍挂）。"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()

MUTE_JS = ("try{if(window.speechSynthesis){speechSynthesis.speak=function(){};"
           "speechSynthesis.cancel=function(){};}}catch(e){}"
           "try{const p=window.Audio.prototype;p.play=function(){const s=this;"
           "setTimeout(()=>{try{s.dispatchEvent(new Event('ended'));}catch(e){}},1500);"
           "return Promise.resolve();};p.pause=function(){};}catch(e){};")

N_FLATS = 60

PROJ = """(() => {
  const proj = q => ({ kind: q.kind, scene: q.scene, ans: q.picks[q.answer],
    answer: q.answer, picks: q.picks.slice() });
  const full = q => JSON.parse(JSON.stringify(q));
  const out = {};
  for (let f = 0; f < %d; f++) {
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
        data = pg.evaluate(PROJ % (N_FLATS, 'full' if full else 'proj'))
        browser.close()
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    n = sum(len(v['qs']) for v in data.values())
    print('EXTRACT %s levels=%d quizzes=%d full=%s' % (out_path.name, len(data), n, full))


if __name__ == '__main__':
    main()
