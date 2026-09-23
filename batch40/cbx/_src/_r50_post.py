# -*- coding: utf-8 -*-
"""r50 改造后谱提取：_r50_post.json（静态 20+生成 40=60 关，genLevel 全量谱）
与 _r50_extract.py 同口径（MUTE+种档+sessionStorage 守卫+页面上下文 genLevel）。
用法: python _r50_post.py"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()

MUTE = """
(function(){
  try{const AP=window.AudioContext||window.webkitAudioContext;
    if(AP){window.AudioContext=function(){const c=new AP();c.currentTime=1e6;try{c.suspend();}catch(e){}return c;};window.AudioContext.prototype=AP.prototype;}}catch(e){}
  try{HTMLMediaElement.prototype.play=function(){this.muted=true;const p=Promise.resolve();p.then=function(){return p;};return p;};}catch(e){}
})();
"""
SEED = """
(function(){
  try{
    if (sessionStorage.getItem('__r50seed')) return;
    sessionStorage.setItem('__r50seed', '1');
    var d = new Date();
    var t = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    localStorage.setItem('kidsgame_cbx', JSON.stringify({
      v:'1.0', game:'cbx', firstDay:t, lastDay:t,
      levels:{}, dailyMin:{},
      settings:{sound:false, tts:false, vol:0},
      restTip:{day:'', shown:0}, cbx:{tutSeen:true}
    }));
  }catch(e){}
})();
"""


def main():
    out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--mute-audio'])
        pg = browser.new_page()
        pg.add_init_script(MUTE)
        pg.add_init_script(SEED)
        pg.goto(URL, timeout=60000)
        pg.wait_for_function("typeof genLevel === 'function' && !!KIDS", timeout=30000)
        for flat in range(60):
            r = pg.evaluate(
                "(() => { const L = genLevel(%d);"
                " return { ch: L.ch, dch: L.dch, lv: L.lv,"
                "  qs: L.quizzes.map(q => ({ scene: q.scene, emo: q.emo, say: q.say, sayKey: q.sayKey,"
                "    prop: q.prop, picks: q.picks, answer: q.answer,"
                "    ans: q.picks[q.answer], n: q.picks.length })) }; })()" % flat)
            out[str(flat)] = r
        pg.close()
        browser.close()
    dst = HERE / '_r50_post.json'
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    n3 = sum(1 for f in out.values() if all(q['n'] == 3 for q in f['qs']))
    dch_dist = {}
    for f in range(20, 60):
        dch_dist[out[str(f)]['dch']] = dch_dist.get(out[str(f)]['dch'], 0) + 1
    print('POST written:', dst, '| 60 关 | 恒三选关数:', n3, '| gen dch dist:', dch_dist)


if __name__ == '__main__':
    main()
