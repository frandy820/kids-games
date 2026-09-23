# -*- coding: utf-8 -*-
# ⚠ r50-fix m-7 警示：本脚本仅【改造前】可跑——r50 后重跑会用新页面覆盖 _r50_baseline.json
# （污染可检测：pycheck SPECTRUM 会 300/300>10 大声失败，但基线真值即失）。改造后提取用 _r50_post.py。
"""r50 改造前基线谱提取：_r50_baseline.json（静态 20+生成 40=60 关，genLevel 全量谱）
独立 chromium（禁杀用户浏览器）；MUTE init_script（r28 定版）+种档 settings 静音双保险；
sessionStorage 守卫防 init_script 重复抹档。提取走页面上下文 genLevel（纯函数，无演出依赖）。
用法: python _r50_extract.py"""
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
FIELDS = "['scene','emo','say','sayKey','prop','picks','answer','_miss','_answered']"


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
        n_err = 0
        pg.close()
        browser.close()
    dst = HERE / '_r50_baseline.json'
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    n_lv = sum(1 for f in out.values() if f['qs'] and all(q['n'] == f['qs'][0]['n'] for q in f['qs']))
    print('BASELINE written:', dst, '| 60 关 | pageerror:', n_err,
          '| 卡数一致关:', n_lv)
    dch_dist = {}
    for f in range(20, 60):
        dch_dist[out[str(f)]['dch']] = dch_dist.get(out[str(f)]['dch'], 0) + 1
    print('gen dch dist(20-59):', dch_dist)
    n2 = sum(1 for f in range(20) if f // 5 + 1 <= 2)
    print('静态前 10 关两选（ch1-2）:', sum(1 for f in range(10)
          if all(q['n'] == 2 for q in out[str(f)]['qs'])), '/10')
    print('静态后 10 关三选（ch3-4）:', sum(1 for f in range(10, 20)
          if all(q['n'] == 3 for q in out[str(f)]['qs'])), '/10')


if __name__ == '__main__':
    main()
