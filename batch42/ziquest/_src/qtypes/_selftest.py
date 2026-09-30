# -*- coding: utf-8 -*-
"""ziquest M2b qtypes selftest — playwright 真交互（独立 chromium.launch，禁连/禁杀任何浏览器）
链路：_dev.html 临时独立链（game-data + t1..t6 + mock api——M2a build 未拼 qtypes 前的独立测试；
build 集成后主线另跑全链 selftest）。全程静音（init_script 禁音频自动播放；qtypes 无 KIDS 环境本就
静默，双保险）。输出全 ASCII（GBK 控制台红线），明细写 _r_selftest_report.txt（utf-8）回读。
断言（≥15）：
  A01 六题型注册 ZQ.QT.t1..t6
  A02 t1 DOM：4 选项 + 触摸目标 >=96x96（800x1180 竖屏）
  A03 t1 防泄露：stem 文本不含答案字
  A04 t1 点对流：right()==1 + good 类
  A05 t1 错1：鼓励气泡 + wrong()==1
  A06 t1 错2：正确卡 breathe + replay()>=1（breathe 元素文本==答案字）
  A07 t1 错3：dimmed 恰 1 且非答案 + hint(1)
  A08 t2 演出完成态（picto 路径）+ 点击收字 right()==1
  A09 t2 parts 路径（地=土+也）演出完成可点
  A10 注入 CSS 全部 @keyframes 只动 transform/opacity（家族红线源码级 DOM 复核）
  A11 t3 DOM：4 选项 + 空位 + stem 不含答案字；点对空位 lit==答案字
  A12 t4 DOM：题面=本字+空位、4 词选项、stem 不含完整正确词；点对飞入
  A13 t5 句库在：句子渲染+挖空；句库缺：zq-fb 占位可玩（4 选项可点对）
  A14 t6 DOM：题面主田字格字==q.ch 且在选项中；4 选项 >=96
  A15 乱序确定性：同 seed 两跑选项序全等；不同 seed 存在不同序
  A16 救援双锚（QT_.now 注入）：14s 方向级 replay；30s 答案级正确卡 breathe
  A17 源码级：qtypes/*.js 无 Math.random / 无 KIDS.voice.play 带 text 参 / 无 </script> 字面
  A18 t2 象形 SVG 内联：DOM 无 img/无 http 外链
"""
import io, json, re, sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
DEV_URL = (HERE / '_dev.html').as_uri()
REPORT = HERE / '_r_selftest_report.txt'
RESULTS = []
DETAIL = []


def check(name, ok, detail=''):
    RESULTS.append((name, bool(ok)))
    DETAIL.append('%-6s %s %s' % ('PASS' if ok else 'FAIL', name, detail))
    print('%-6s %s %s' % ('PASS' if ok else 'FAIL', name, re.sub(r'[^\x20-\x7e]', '?', str(detail))[:120]))


MUTE_INIT = """
window.__MUTE = true;
try {
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () {};
  HTMLMediaElement.prototype.autoplay = false;
} catch (e) {}
"""


def opts_info(pg):
    return pg.evaluate("""() => {
    const els = [...document.querySelectorAll('.zq-opt')];
    return els.map(b => {
      const r = b.getBoundingClientRect();
      return { t: b.textContent, w: Math.round(r.width), h: Math.round(r.height),
               v: b.dataset.v, cls: b.className };
    });
  }""")


def click_opt(pg, text):
    pg.evaluate("""t => {
    const b = [...document.querySelectorAll('.zq-opt')].find(x => x.textContent.trim() === t);
    if (b) b.click();
  }""", text)


def main():
    pw = sync_playwright().start()
    try:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={'width': 800, 'height': 1180})
        ctx.add_init_script(MUTE_INIT)
        pg = ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(DEV_URL)
        pg.wait_for_function("() => window.ZQ && ZQ.QT && ZQ.QT.t6")

        # A01 registration
        reg = pg.evaluate("() => ['t1','t2','t3','t4','t5','t6'].map(t => !!ZQ.QT[t] && typeof ZQ.QT[t].render === 'function')")
        check('A01-six-qtypes-registered', all(reg), reg)

        # A02/A03 t1 render + touch + leak
        pg.evaluate("() => runQ('t1','天',7)")
        info = opts_info(pg)
        check('A02-t1-4opts-96px', len(info) == 4 and all(o['w'] >= 96 and o['h'] >= 96 for o in info),
              json.dumps(info, ensure_ascii=False))
        stem_txt = pg.evaluate("() => document.querySelector('.zq-stem').textContent")
        qch = pg.evaluate("() => window.__q.ch")
        check('A03-t1-no-leak-in-stem', qch not in stem_txt, 'stem=%s ans=%s' % (stem_txt, qch))

        # A04 right flow
        click_opt(pg, qch)
        pg.wait_for_timeout(750)
        m = pg.evaluate("() => ({r: MOCK.right, w: MOCK.wrong})")
        good = pg.evaluate("() => document.querySelector('.zq-opt.good') ? document.querySelector('.zq-opt.good').textContent : null")
        check('A04-t1-right-flow', m['r'] == 1 and m['w'] == 0 and good == qch, m)

        # A05-A07 wrong ladder
        pg.evaluate("() => runQ('t1','天',7)")
        wrongs = pg.evaluate("() => window.__q.options.filter(o => o !== window.__q.ch)")
        click_opt(pg, wrongs[0])            # miss 1
        pg.wait_for_timeout(1000)           # 过错后演出锁 800ms
        bub = pg.evaluate("() => { const b = document.querySelector('.zq-bub'); return b && b.classList.contains('show') ? b.textContent : null; }")
        m1 = pg.evaluate("() => ({w: MOCK.wrong, r: MOCK.right})")
        check('A05-miss1-encourage-bubble', m1['w'] == 1 and m1['r'] == 0 and bool(bub), bub)

        click_opt(pg, wrongs[1])            # miss 2
        pg.wait_for_timeout(1000)
        br = pg.evaluate("""() => {
        const b = document.querySelector('.zq-opt.breathe');
        return { txt: b ? b.textContent : null, replay: MOCK.replays };
      }""")
        check('A06-miss2-replay-breathe-on-answer', br['txt'] == qch and br['replay'] >= 1, br)

        click_opt(pg, wrongs[2])            # miss 3 (错的是第 3 个干扰)
        pg.wait_for_timeout(1000)
        dim = pg.evaluate("""() => {
        const els = [...document.querySelectorAll('.zq-opt.dimmed')];
        return { n: els.length, txts: els.map(x => x.textContent), hints: MOCK.hints.slice() };
      }""")
        check('A07-miss3-dim-one-not-answer', dim['n'] == 1 and qch not in dim['txts'] and 1 in dim['hints'], dim)

        # A08 t2 picto path (天 has svg)
        pg.evaluate("() => runQ('t2','天',7)")
        pg.wait_for_selector('.zq-t2-big.ready', timeout=9000)
        picto = pg.evaluate("() => !!document.querySelector('.zq-t2-picto svg')")
        big = pg.evaluate("""() => { const b = document.querySelector('.zq-t2-big'); const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        return { t: b.textContent, w: Math.round(r.width), h: Math.round(r.height),
                 op: cs.opacity }; }""")
        check('A08-t2-picto-ready-96px', picto and big['w'] >= 96 and big['h'] >= 96, big)
        check('A08c-t2-big-visible', float(big['op']) >= 0.99, big)
        pg.evaluate("() => document.querySelector('.zq-t2-big').click()")
        pg.wait_for_timeout(700)
        m = pg.evaluate("() => ({r: MOCK.right, w: MOCK.wrong, v: MOCK.voices})")
        check('A08b-t2-tap-right', m['r'] == 1 and m['w'] == 0, m)

        # A09 t2 parts path (地 = 土+也, no picto)
        pg.evaluate("() => runQ('t2','地',9)")
        pg.wait_for_selector('.zq-t2-big.ready', timeout=9000)
        parts = pg.evaluate("""() => {
        const els = [...document.querySelectorAll('.zq-t2-part')].map(x => x.textContent);
        const joined = document.querySelector('.zq-t2-parts').classList.contains('join');
        return { parts: els, joined: joined };
      }""")
        check('A09-t2-parts-join', parts['parts'] == ['土', '也'] and parts['joined'], parts)
        bigop = pg.evaluate("() => getComputedStyle(document.querySelector('.zq-t2-big')).opacity")
        check('A09b-t2-parts-big-visible', float(bigop) >= 0.99, bigop)

        # A19 t2 词句条（v4 P2：words[0] 加粗 + 首个含字句；独立驱动「天」=天空+含天句）
        pg.evaluate("() => runQ('t2','天',7)")
        pg.wait_for_selector('.zq-t2-big.ready', timeout=9000)
        ws = pg.evaluate("""() => {
        const el = document.querySelector('.zq-t2-ws');
        if (!el) return { on: false };
        return { on: el.classList.contains('on'), b: el.querySelector('b') ? el.querySelector('b').textContent : '',
                 i: el.querySelector('i') ? el.querySelector('i').textContent : '' };
      }""")
        check('A19-t2-ws-word-sent', ws['on'] and ws['b'] == '天空' and ws['i'] != '' and '天' in ws['i'], ws)

        # A10 keyframes transform/opacity only
        kf = pg.evaluate("""() => {
        const BAD = [];
        for (const sh of document.styleSheets) {
          let rules; try { rules = sh.cssRules; } catch (e) { continue; }
          for (const r of rules || []) {
            if (r.type === CSSRule.KEYFRAMES_RULE || (r.cssRules && r.type === 7)) {
              for (const k of r.cssRules) {
                for (let i = 0; i < k.style.length; i++) {
                  const p = k.style[i];
                  if (p !== 'transform' && p !== 'opacity' && p !== 'offset') BAD.push(r.name + ':' + p);
                }
              }
            }
          }
        }
        return BAD;
      }""")
        check('A10-keyframes-transform-opacity-only', len(kf) == 0, kf[:6])

        # A11 t3
        pg.evaluate("() => runQ('t3','天',7)")
        info = opts_info(pg)
        stem_txt = pg.evaluate("() => document.querySelector('.zq-stem').textContent")
        blank = pg.evaluate("() => { const b = document.querySelector('.zq-t3-blank'); return b ? b.textContent : null; }")
        check('A11-t3-blank-no-leak-4opts', len(info) == 4 and blank == '□' and qch_not(stem_txt, '天'),
              'stem=%s' % stem_txt)
        check('A11b-t3-opts-96px', all(o['w'] >= 96 and o['h'] >= 96 for o in info), '')
        click_opt(pg, '天')
        pg.wait_for_timeout(600)
        lit = pg.evaluate("() => document.querySelector('.zq-t3-blank.lit') ? document.querySelector('.zq-t3-blank.lit').textContent : null")
        m = pg.evaluate("() => MOCK.right")
        check('A11c-t3-fill-blank', lit == '天' and m == 1, 'lit=%s right=%s' % (lit, m))

        # A12 t4
        pg.evaluate("() => runQ('t4','天',7)")
        info = opts_info(pg)
        stem_txt = pg.evaluate("() => document.querySelector('.zq-stem').textContent")
        ans_word = pg.evaluate("() => window.__q.options[window.__q.answer]")
        check('A12-t4-stem-ch-4word-opts', '天' in stem_txt and ans_word not in stem_txt and len(info) == 4,
              'stem=%s ans=%s' % (stem_txt, ans_word))
        click_opt(pg, ans_word)
        pg.wait_for_timeout(700)
        slot = pg.evaluate("() => { const s = document.querySelector('.zq-t4-slot'); return s ? s.textContent : null; }")
        m = pg.evaluate("() => MOCK.right")
        tail = ans_word.replace('天', '')
        check('A12b-t4-slot-filled', m == 1 and slot == tail, 'slot=%s tail=%s' % (slot, tail))

        # A13 t5 with sentences / fallback
        pg.evaluate("() => setSents([{id:1,text:'天上有个大太阳'},{id:2,text:'我在天上看云'}])")
        pg.evaluate("() => runQ('t5','天',7)")
        sent = pg.evaluate("() => document.querySelector('.zq-t5-sent') ? document.querySelector('.zq-t5-sent').textContent : ''")
        fb = pg.evaluate("() => !!document.querySelector('.zq-t5-sent.zq-fb')")
        info = opts_info(pg)
        check('A13-t5-sentence-blank', ('□' in sent) and ('天' not in sent) and not fb and len(info) == 4, sent)
        click_opt(pg, '天')
        pg.wait_for_timeout(700)
        m = pg.evaluate("() => MOCK.right")
        lit = pg.evaluate("() => document.querySelector('.zq-t5-blank.lit') ? document.querySelector('.zq-t5-blank.lit').textContent : null")
        check('A13b-t5-fill', m == 1 and lit == '天', 'lit=%s' % lit)
        pg.evaluate("() => setSents(null)")
        pg.evaluate("() => runQ('t5','地',7)")
        fb2 = pg.evaluate("""() => ({
        fb: document.querySelector('.zq-t5-sent').classList.contains('zq-fb'),
        n: document.querySelectorAll('.zq-opt').length })""")
        check('A13c-t5-fallback-playable', fb2['fb'] and fb2['n'] == 4, fb2)
        click_opt(pg, '地')
        pg.wait_for_timeout(700)
        check('A13d-t5-fallback-right', pg.evaluate("() => MOCK.right") == 1, '')

        # A14 t6
        pg.evaluate("() => runQ('t6','地',7)")
        info = opts_info(pg)
        main_ch = pg.evaluate("() => document.querySelector('.zq-t6-main .zi').textContent")
        opt_txts = [o['t'].strip() for o in info]
        check('A14-t6-main-in-opts-96px', main_ch == '地' and main_ch in opt_txts and len(info) == 4
              and all(o['w'] >= 96 and o['h'] >= 96 for o in info), opt_txts)
        minis = pg.evaluate("() => [...document.querySelectorAll('.zq-t6-mini .zi')].map(x => x.textContent)")
        check('A14b-t6-distract-row', len(minis) == 3 and '地' not in minis, minis)

        # A15 deterministic shuffle
        seq = pg.evaluate("""() => {
        const out = [];
        for (const s of [7, 7, 12, 3, 3]) { runQ('t1','天',s); out.push([...document.querySelectorAll('.zq-opt')].map(b => b.dataset.v)); }
        return out;
      }""")
        same_seed_eq = seq[0] == seq[1]
        diff_exists = seq[0] != seq[2] or seq[3] != seq[0]
        check('A15-shuffle-deterministic', same_seed_eq and diff_exists, seq)

        # A16 rescue anchors with injected clock（先覆写时钟再 render——lastAct 锚取注入值）
        pg.evaluate("""() => {
        let F = 1000000;
        ZQ._qt.now = () => F;
        runQ('t1','天',7);
        window.__adv = ms => { F += ms; };
      }""")
        pg.evaluate("() => window.__adv(14600)")     # >14s directional
        pg.wait_for_timeout(2200)
        m = pg.evaluate("() => ({replay: MOCK.replays, w: MOCK.right})")
        check('A16-rescue-14s-directional', m['replay'] >= 1 and m['w'] == 0, m)
        pg.evaluate("() => window.__adv(31000 - 14600 + 2000)")  # idle >=30s, >15s since last ans rescue
        pg.wait_for_timeout(2200)
        br = pg.evaluate("""() => {
        const b = document.querySelector('.zq-opt.breathe');
        return { txt: b ? b.textContent : null };
      }""")
        check('A16b-rescue-30s-answer-breathe', br['txt'] == '天', br)

        # A18 no external refs
        ext = pg.evaluate("""() => {
        const bad = [];
        if (document.querySelector('img')) bad.push('img');
        document.querySelectorAll('[src]').forEach(e => { if (/^http/.test(e.getAttribute('src'))) bad.push('http-src'); });
        return bad;
      }""")
        check('A18-inline-svg-no-external', len(ext) == 0, ext)

        # page errors across all steps
        check('A00-zero-pageerror', len(errors) == 0, errors[:3])

        browser.close()
    finally:
        pw.stop()

    # A17 source-level checks（剥注释后查——纪律注释里的字面不误报）
    src_bad = []
    for f in sorted(HERE.glob('t*.js')):
        s = f.read_text(encoding='utf-8')
        code = re.sub(r'/\*.*?\*/', '', s, flags=re.S)
        code = re.sub(r'//[^\n]*', '', code)
        if 'Math.random' in code:
            src_bad.append('%s:Math.random' % f.name)
        if re.search(r'KIDS\.voice\.play\([^)]*,', code):
            src_bad.append('%s:voice.play-2args' % f.name)
        if '</script' in s:
            src_bad.append('%s:script-close-literal' % f.name)
    check('A17-source-clean', len(src_bad) == 0, src_bad)

    n_pass = sum(1 for _, ok in RESULTS if ok)
    REPORT.write_text('ziquest M2b qtypes selftest\n%d/%d PASS\n\n%s\n\nDETAIL\n%s\n' %
                      (n_pass, len(RESULTS),
                       '\n'.join('%-6s %s' % ('PASS' if ok else 'FAIL', n) for n, ok in RESULTS),
                       '\n'.join(DETAIL)), encoding='utf-8')
    print('SELFTEST %d/%d PASS' % (n_pass, len(RESULTS)))
    sys.exit(0 if n_pass == len(RESULTS) else 1)


def qch_not(txt, ch):
    return ch not in txt


if __name__ == '__main__':
    main()
