# -*- coding: utf-8 -*-
"""Task#46 阶段2 决定性门禁：主流程 speechSynthesis.speak 调用数 == 0（keyless 清零证明）
- headless 独立 chromium.launch()（不连不杀任何既有浏览器）
- init_script：①种档（sound:false / tts:true——语音路径全开）②speechSynthesis.speak 计数
  window.__ttsCalls ③Audio.play no-op（防 autoplay 拒绝→speak 回退外放+假计数）④KIDS.voice
  三 API 包装计数（证明语音路径确实跑了，防「零调用 trivially 零」假阴性）
用法: python t46_speak_probe.py habit [cipher ...]
"""
import json, sys, time
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(r'F:/claudecode/projects/active/kids-games')
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')


def mk_seed(game, extra=None, done_flats=(), save_key=None, per_ch=5):
    save = {'v': '1.0', 'game': game, 'firstDay': OLD, 'lastDay': TODAY,
            'levels': {}, 'dailyMin': {}, 'bonus': {},
            'settings': {'sound': False, 'tts': True, 'vol': 0.0},
            'restTip': {'day': '', 'shown': 0}}
    for f in done_flats:
        save['levels']['%d-%d' % (f // per_ch + 1, f % per_ch)] = {'stars': 3, 'plays': 1}
    if extra is not None:
        save[save_key or game] = extra
    return 'localStorage.setItem("kidsgame_%s", %s);' % (game, json.dumps(json.dumps(save)))


INIT_TMPL = """(() => {
  /* 静音纪律（主线 2026-09-19 第三次外放投诉后强制）：规范 INIT_SND 模板
  （F:/claudecode/test/t46_speak0_gate.py 同源）——原型级 Audio.play/pause no-op + 5ms ended 派发
  （queue 链可走完）+ speechSynthesis.speak 计数 no-op。开页即挂，先于一切页面 JS。 */
  window.__ttsCalls = 0; window.__clipPlays = 0;
  window.__vCalls = {play: 0, queue: 0, say: 0, parts: []};
  try {
    if (window.speechSynthesis) {
      speechSynthesis.speak = function () { window.__ttsCalls++; };
      speechSynthesis.cancel = function () {};
    }
  } catch (e) {}
  try {
    const proto = window.Audio.prototype;
    proto.play = function () {
      window.__clipPlays++;
      const self = this;
      setTimeout(() => { try { self.dispatchEvent(new Event('ended')); } catch (e) {} }, 5);
      return Promise.resolve();
    };
    proto.pause = function () {};
  } catch (e) {}
  %s  /* SEED */
  const iv = setInterval(() => {
    try {
      /* 顶层 const KIDS 不上 window——裸标识符经全局词法环境解析（init script 与页面同世界） */
      const v = (typeof KIDS !== 'undefined' && KIDS.voice) ||
                (window.KIDS && window.KIDS.voice);
      if (v && !v.__t46) {
        v.__t46 = 1;
        const wp = v.play.bind(v), wq = v.queue.bind(v), ws = v.say.bind(v);
        v.play = function (k, t) { window.__vCalls.play++; return wp(k, t); };
        v.queue = function (p) { window.__vCalls.queue++; window.__vCalls.parts.push(String(p)); return wq(p); };
        v.say = function (t) { window.__vCalls.say++; return ws(t); };
        clearInterval(iv);
      }
    } catch (e) {}
  }, 30);
})();"""

# 每款：dir（相对 ROOT）/seed( Extra 存档片段 )/ready（wait_for_function 表达式）/act（async 主流程 JS）
GAMES = {
    'habit': dict(
        dir='batch10/habit', extra={'tutSeen': True}, done_flats=(0, 1, 2),
        ready='window.HB && HB.currentLevel',
        act="""async () => {
          const q = HB.quiz;
          HB.tapCard((q.answerIdx + 1) % q.cards.length);      // 错点 → 纠错锚 hb_w_*
          await new Promise(r => setTimeout(r, 400));
          await HB.autoSolve();                                  // 通关（题面/对链全走）
          await new Promise(r => setTimeout(r, 600));
          return 'wrong+solve flat3';
        }"""),
    'cipher': dict(
        dir='batch19/cipher', extra={'tutSeen': True}, done_flats=(0, 1, 2),
        ready='window.CI && CI.currentLevel',
        act="""async () => {
          document.querySelector('.csym').click();               // 查表闪联 → sayPair 3 段链
          await new Promise(r => setTimeout(r, 350));
          document.querySelector('.trow').click();               // 表行朗读
          await new Promise(r => setTimeout(r, 350));
          const hb = document.getElementById('btn-hear'); if (hb) hb.click();   // readAsk 链
          await new Promise(r => setTimeout(r, 350));
          const it = document.getElementById('intel');
          if (it && it.classList.contains('show')) it.click();   // 情报例卡链（ch3 才在场）
          await new Promise(r => setTimeout(r, 350));
          await CI.autoSolve();                                   // 通关（值词链+对反馈）
          await new Promise(r => setTimeout(r, 600));
          return 'sym+row+hear+intel+solve';
        }"""),
    'memduel': dict(
        dir='batch20/memduel', extra={'tutSeen': True}, save_key='md', per_ch=10,
        done_flats=(0, 1, 2),
        ready='window.MD && MD.currentLevel',
        act="""async () => {
          await MD.autoSolve();                                   // 通关（展示期逐卡值词链+对反馈）
          await new Promise(r => setTimeout(r, 600));
          return 'solve flat3(df)';
        }"""),
    'fruitsplit': dict(
        dir='batch7/fruitsplit', extra={'tutSeen': True}, save_key='fru', done_flats=(0, 1, 2),
        ready='window.FRU && FRU.currentLevel',
        act="""async () => {
          document.getElementById('btn-hear').dispatchEvent(new Event('pointerdown'));   // 读题链
          await new Promise(r => setTimeout(r, 400));
          await FRU.autoSolve();                                  // 通关（五型题面/公平句链）
          await new Promise(r => setTimeout(r, 600));
          return 'hear+solve flat3';
        }"""),
    'fishcolor': dict(
        dir='batch7/fishcolor', extra={'tutSeen': True}, save_key='fis', done_flats=(0, 1, 2),
        ready='window.FIS && FIS.currentLevel',
        act="""async () => {
          document.getElementById('btn-hear').dispatchEvent(new Event('pointerdown'));   // 再听链
          await new Promise(r => setTimeout(r, 400));
          await FIS.autoSolve();                                  // 通关（题面链+间色合成句）
          await new Promise(r => setTimeout(r, 600));
          return 'hear+solve flat3';
        }"""),
    'hopscotch': dict(
        dir='batch7/hopscotch', extra={'tutSeen': True}, save_key='hop', done_flats=(0, 1, 2),
        ready='window.HOP && HOP.currentLevel',
        act="""async () => {
          document.getElementById('btn-hear').dispatchEvent(new Event('pointerdown'));   // 读题链
          await new Promise(r => setTimeout(r, 400));
          await HOP.autoSolve();                                  // 通关（题面链+逐格报数 hop_n_*）
          await new Promise(r => setTimeout(r, 600));
          return 'hear+solve flat3';
        }"""),
    'whereistand': dict(
        dir='batch9/whereistand', extra={'tutSeen': True}, save_key='wis', done_flats=(0, 1, 2),
        ready='window.WIS && WIS.currentLevel',
        act="""async () => {
          const q = WIS.quiz;
          WIS.tapSlot((q.answerIdx + 1) % 5);                   // 错点 → wis_wrong
          await new Promise(r => setTimeout(r, 400));
          await WIS.autoSolve();                                  // 通关（edge/ordinal 题面链）
          await new Promise(r => setTimeout(r, 600));
          return 'wrong+solve flat3';
        }"""),
    'chainsum': dict(
        dir='batch10/chainsum', extra={'tutSeen': True}, save_key='cs', done_flats=(0, 1, 2),
        ready='window.CS && CS.currentLevel',
        act="""async () => {
          const q = CS.quiz;
          const wi = q.options.findIndex(v => v !== q.answer);   // 错点 → cs_wrong
          if (wi >= 0) await CS.tapCard(wi);
          await new Promise(r => setTimeout(r, 400));
          await CS.autoSolve();                                   // 通关（题面链 cs_n_/cs_op_/cs_tail）
          await new Promise(r => setTimeout(r, 600));
          return 'wrong+solve flat3';
        }"""),
    'neighbors': dict(
        dir='batch8/neighbors', extra={'tutSeen': True}, save_key='neb', done_flats=(0, 1, 2),
        ready='window.NEB && NEB.currentLevel',
        act="""async () => {
          const q = NEB.quiz;
          const wi = q.options.findIndex(v => v !== q.answer);   // 错点 → neb_wrong
          if (wi >= 0) await NEB.tapOption(wi);
          await new Promise(r => setTimeout(r, 400));
          await NEB.autoSolve();                                  // 通关（题面链 neb_n_/neb_mid_+neb_q*）
          await new Promise(r => setTimeout(r, 600));
          return 'wrong+solve flat3';
        }"""),
}


def run_one(browser, name, cfg):
    pg = browser.new_page()
    pg.add_init_script(INIT_TMPL % mk_seed(
        name, cfg.get('extra'), cfg.get('done_flats', ()),
        cfg.get('save_key'), cfg.get('per_ch', 5)))
    pg.goto((ROOT / cfg['dir'] / 'index.html').as_uri())
    pg.wait_for_function(cfg['ready'], timeout=10000)
    pg.wait_for_timeout(2500)                    # 开场链（queue）落完
    desc = pg.evaluate('(%s)()' % cfg['act'])
    pg.wait_for_timeout(1500)                    # 尾部语音（通关/下一关预告）落完
    r = pg.evaluate('({tts: window.__ttsCalls, clips: window.__clipPlays, v: window.__vCalls})')
    pg.close()
    played = r['v']['play'] + r['v']['queue'] + r['v']['say']
    ok = r['tts'] == 0 and played > 0
    print('[%s] %s ttsCalls=%d clipPlays=%d voiceCalls(play=%d queue=%d say=%d) act=%s parts=%s' %
          ('PASS' if ok else 'FAIL', name, r['tts'], r['clips'], r['v']['play'], r['v']['queue'],
           r['v']['say'], desc, r['v']['parts'][:6]))
    return ok


def main():
    names = sys.argv[1:] or list(GAMES)
    fails = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for n in names:
            try:
                ok = run_one(b, n, GAMES[n])
            except Exception as e:
                print('[FAIL] %s EXC %r' % (n, e)); ok = False
            fails += not ok
        b.close()
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
