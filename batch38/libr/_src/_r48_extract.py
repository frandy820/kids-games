# -*- coding: utf-8 -*-
"""r48 谱提取器（r44 范式，谱证据工具随款归档）：
页内 genLevel 40 关（flat 0-39）投影 JSON 落盘，供 baseline/post 对拍与主线审查轮复算。
用法: python _r48_extract.py <out.json> [--full]
--full: 落全量字段（含 shelf/_miss/_answered 等，供 pycheck 位级对拍）；
默认=语义投影 [kind, card, target, cards, hint, say, answer, n]（r31 口径：投影键恒在
值 null/none，防字段缺省假差异——baseline 旧题型无 target/cards 字段恒 null）。
proj 兼容 baseline（r48 前无 kind 字段的旧 quiz → kind='sort' 补齐）。"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()

# 静音纪律（r28 定稿 function 版 + r44 段二 1500ms ended 版）：谱提取页=verify 外
# 真实页，genLevel 直调不触发播放，双保险仍挂
MUTE_JS = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed', resume:function(){},
  createOscillator:function(){ return { connect:function(){ return { connect:function(){} }; }, start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} } }; },
  createGain:function(){ return { connect:function(){}, gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} } }; },
  destination:{}, currentTime:0, sampleRate:44100 }; };"""

PROJ = """(() => {
  const proj = q => ({ kind: q.kind || 'sort',
    card: q.card === undefined ? null : q.card,
    target: q.target === undefined ? null : q.target,
    cards: q.cards === undefined ? null : (q.cards ? q.cards.slice() : null),
    hint: q.hint === undefined ? 'none' : q.hint,
    say: q.say, answer: q.answer, n: q.shelf.length });
  const full = q => JSON.parse(JSON.stringify(q));
  const out = {};
  for (let f = 0; f < 40; f++) {
    const L = genLevel(f);
    out[f] = { ch: L.ch, dch: L.dch, lv: L.lv, shelf: L.shelf.slice(),
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
