# -*- coding: utf-8 -*-
"""r41 bodyen Executor 自测（r39 notebird _selftest 范式；r19 静音双保险+r37 M1 键构造直调）
腿清单：
  1a 谱投影：post 40 关与 baseline 对照（锚面 flat0q0=hear/eye 保留；40/40 全刷新=r32 词库
      扩容范式：deckOf 新种子流+8→24 词库，旧谱无保留面）+ 确定性（pycheck ①同源对拍即双跑同构）
  1b Python 独立表断言（_r41_pycheck.py 子进程：同源对拍+SPEC 结构/覆盖/分布 10 检票）
  2a 键构造直调（纯函数：VOICE.q3/verbClip/wordClip/PART_ZH×24/ACT_ZH/三语义句——期望值
      SPEC-R41 §R2/§R6 硬编码推导，禁抄 game-data 实现）
  2b do 题真实驱动（正常页 BE 钩子+MUTE_INIT：flat15 qi1=do-touch 爪标卡/错点 miss/qi3=
      do-action 四短语卡恰全集/scene data-ask 防泄）
  2c hear/see 真实驱动（flat0 hear 图卡 p:/题面中性；flat5 see 词卡 w:/题面高亮=真值）
  3a 双视口截图非空白（800×1180 竖屏/1280×800 横屏，含 do 板）
  4  正常模式主流程（种档静音 sound/tts/vol 全关+完整 core 字段→错 1 次+通关=写档 2-0 两星）
  0  pageerror=0 / http 外联=0
用法: python _selftest.py（先跑 _r41_extract.py --out r41-post.json 与 _r41_pycheck.py）"""
import json
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = 'file:///' + str(HERE.parent / 'index.html').replace(chr(92), '/')

# SPEC-R41 §R2/§R6 期望值硬编码（禁抄 game-data 实现）
SPEC_WORDS = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth',
              'tooth', 'tongue', 'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow',
              'hand', 'finger', 'thumb', 'leg', 'knee', 'foot', 'toe', 'belly']
SPEC_ZH = ['头', '脸', '头发', '眉毛', '眼睛', '耳朵', '鼻子', '嘴巴', '牙齿', '舌头',
           '下巴', '脸颊', '脖子', '肩膀', '胳膊', '胳膊肘', '手', '手指', '大拇指', '腿',
           '膝盖', '脚', '脚趾', '肚子']
SPEC_ACT_ZH = {'clap': '拍拍手', 'shake': '摇摇头', 'stomp': '跺跺脚', 'wave': '挥挥手'}
SPEC_Q3 = '听一听，选出那个动作'
SPEC_SENTS = ['再听一遍这个单词', '再看看它指的地方', '再听一遍这个指令']

RES = []


def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + (('  | ' + str(info)) if info else ''))
    return bool(ok)


def main():
    from playwright.sync_api import sync_playwright

    # ---- 1a 谱投影对照 ----
    post = json.loads((HERE / 'r41-post.json').read_text(encoding='utf-8'))
    base = json.loads((HERE / 'r41-baseline.json').read_text(encoding='utf-8'))
    kinds = {}
    asks = set()
    for lv in post:
        for q in lv['q']:
            kinds[q[0]] = kinds.get(q[0], 0) + 1
            asks.add(q[1])
    total_q = sum(len(lv['q']) for lv in post)
    # 锚面保留：改造前后 flat0q0 均 hear/eye（教学演示锚不动）
    a_post, a_base = post[0]['q'][0], base[0]['q'][0]
    anchor = a_post[0] == 'hear' and a_post[1] == 'eye' and a_base[0] == 'hear' and a_base[1] == 'eye'
    # 全刷新面：40 关谱（kind:ask 列）与基线零重合（deckOf 新种子流——r32 范式）
    ident = [lv['flat'] for lv in post
             if [(q[0], q[1]) for q in lv['q']] ==
                [(q[0], q[1]) for q in base[lv['flat']]['q']]]
    # distinct asks = 24 部位 + 4 动作（do-action ask=verb）
    chk('1a 谱投影（200 题/三族 kind/28 ask/flat0 锚面保留/40 关全刷新）',
        total_q == 200 and set(kinds) == {'hear', 'see', 'do'} and anchor and
        len(ident) == 0 and len(asks) == 28,
        'kinds=%s asks=%d anchor=%s ident=%s' % (kinds, len(asks), anchor, ident[:3]))

    # ---- 1b Python 独立表断言（子进程跑 _r41_pycheck，退出码=判据） ----
    r = subprocess.run([sys.executable, '-X', 'utf8', str(HERE / '_r41_pycheck.py')],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    last = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-120:]
    chk('1b pycheck 子进程（同源对拍+SPEC 结构/覆盖/分布）', r.returncode == 0, last)

    with sync_playwright() as p:
        b = p.chromium.launch()
        errs = []

        # ---- 2a 键构造直调（verify 页：纯函数常量可读，stub 后无并发干扰） ----
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('pageerror', lambda e: errs.append('p1:' + str(e)[:120]))
        pg.goto(URL + '?verify=1')
        pg.wait_for_timeout(1500)
        out = pg.evaluate('''() => ({
          q3k: VOICE.q3.key, q3t: VOICE.q3.text,
          vc: [verbClip('touch'), verbClip('clap'), verbClip('shake'), verbClip('stomp'), verbClip('wave')],
          wc: [wordClip('shoulder'), wordClip('toe'), wordClip('eyebrow')],
          zh: WORDS24.map(w => PART_ZH[w]),
          actZh: ['clap', 'shake', 'stomp', 'wave'].map(v => ACT_ZH[v]),
          sents: [HEAR_AGAIN, SEE_AGAIN, DO_AGAIN],
          words: WORDS24
        })''')
        ka = (out['q3k'] == 'bod_q3' and out['q3t'] == SPEC_Q3 and
              out['vc'] == ['bod_v_touch', 'bod_v_clap', 'bod_v_shake', 'bod_v_stomp', 'bod_v_wave'] and
              out['wc'] == ['bod_w_shoulder', 'bod_w_toe', 'bod_w_eyebrow'] and
              out['zh'] == SPEC_ZH and out['actZh'] == list(SPEC_ACT_ZH.values()) and
              out['sents'] == SPEC_SENTS and out['words'] == SPEC_WORDS)
        chk('2a 键构造直调（q3/verbClip×5/wordClip/PART_ZH×24/ACT_ZH/三语义句）', ka,
            json.dumps(out, ensure_ascii=False)[:160] if not ka else '')
        pg.close()

        # ---- 2b/2c 真实驱动（正常页；MUTE_INIT ①+stub） ----
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('pageerror', lambda e: errs.append('p2:' + str(e)[:120]))
        # MUTE 双保险①：init script stub media volume（真实页首关教学链在 stub 前已发声）
        pg.add_init_script('Object.defineProperty(HTMLMediaElement.prototype, "volume", '
                           '{ set: function(){}, get: function(){ return 0; } });')
        pg.goto(URL)
        pg.wait_for_timeout(1200)
        pg.evaluate('''() => { KIDS.voice.play = () => {}; KIDS.voice.queue = () => {};
            KIDS.voice.say = () => {}; KIDS.speak = () => {};
            KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {}; }''')
        # 无档正常页必跑教学链（freshTut flat0 看→帮→独，分账 10188ms 真实时）——等其收尾再驱动，
        # 否则 BE.start 的 cur 会被教学续体 cur=genLevel(0) 顶掉（r39 2b 调试实证）
        tut = 'watch'
        for _ in range(80):
            tut = pg.evaluate('window.BE ? BE.tutorial : "none"')
            if tut in ('help', 'solo', 'none'):
                break
            pg.wait_for_timeout(500)

        # 2c hear/see 帧断言（flat0 hear / flat5 see）
        fr = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          async function settle() { let w = 0;
            while (typeof state !== 'undefined' && (state.locked || state.demo) && w++ < 400) await wait(50); }
          BE.start(0); await settle();
          const qh = BE.quiz;
          const hear = { kind: qh.kind, ask: qh.ask,
            cards: document.querySelectorAll('#board .card.pcard').length,
            oid: document.querySelectorAll('#board .card.pcard')[0].dataset.oid.slice(0, 2),
            hlPerCard: Array.from(document.querySelectorAll('#board .card.pcard svg')).map(s => s.querySelectorAll('.pt.hl').length),
            sceneAsk: document.getElementById('scene').dataset.ask,
            sceneHl: document.querySelectorAll('#scene .pt.hl').length };
          BE.start(5); await settle();
          const qs = BE.quiz;
          const labels = Array.from(document.querySelectorAll('#board .wcard .w-label')).map(e => e.textContent);
          const see = { kind: qs.kind, ask: qs.ask, cards: labels.length,
            lower: labels.every(t => /^[a-z]+$/.test(t)),
            sceneAsk: document.getElementById('scene').dataset.ask,
            sceneHl: document.querySelectorAll('#scene .pt.hl').length,
            hlPart: document.querySelector('#scene .pt.hl') && document.querySelector('#scene .pt.hl').dataset.part };
          return { hear, see };
        }''')
        h, s = fr['hear'], fr['see']
        ok2c = (h['kind'] == 'hear' and h['cards'] == 4 and h['oid'] == 'p:' and
                all(x == 1 for x in h['hlPerCard']) and h['sceneAsk'] == '' and h['sceneHl'] == 0 and
                s['kind'] == 'see' and s['cards'] == 4 and s['lower'] and
                s['sceneAsk'] == s['ask'] and s['sceneHl'] == 1 and s['hlPart'] == s['ask'])
        chk('2c hear/see 帧断言（图卡 p: 恰 1 高亮/题面中性；词卡小写/题面高亮=真值）', ok2c,
            json.dumps(fr, ensure_ascii=False)[:200])

        # 2b do 题真实驱动（flat15：qi1=do-touch/qi3=do-action——确定性谱）
        do = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          async function settle() { let w = 0;
            while (typeof state !== 'undefined' && (state.locked || state.demo) && w++ < 400) await wait(50); }
          async function driveTo(step) {
            for (let g = 0; g < 12; g++) { await settle();
              const L = BE.currentLevel;
              if (!L || L.done || L.step === step) return L;
              await BE.tapOpt(BE.quiz.answer); }
            return null;
          }
          BE.start(15);
          const L1 = await driveTo(1);
          if (!L1) return { fail: 'driveTo1' };
          const qT = BE.quiz;
          const tCards = document.querySelectorAll('#board .card.pcard.dcard');
          const touch = { verb: qT.verb, ask: qT.ask, near20: NEAR20.includes(qT.ask),
            n: tCards.length,
            paw: Array.from(tCards).every(c => c.querySelector('svg .ptouch')),
            hl: Array.from(tCards).every(c => c.querySelectorAll('svg .pt.hl').length === 1),
            oid: Array.from(tCards).map(c => c.dataset.oid),
            vals: qT.opts.map(o => o.part), ans: qT.opts[qT.answer].part };
          const wI = qT.opts.findIndex((o, i) => i !== qT.answer);
          const rw = await BE.tapOpt(wI);                  // do-touch 错点
          const miss = BE.currentLevel.miss;
          const rr = await BE.tapOpt(qT.answer);           // 对回推进
          const L3 = await driveTo(3);
          if (!L3) return { fail: 'driveTo3', touch };
          const qA = BE.quiz;
          const aCards = document.querySelectorAll('#board .card.acard');
          const labels = Array.from(document.querySelectorAll('#board .a-label')).map(e => e.textContent);
          const act = { verb: qA.verb, ask: qA.ask, n: aCards.length, labels,
            oid: Array.from(aCards).map(c => c.dataset.oid),
            ansV: qA.opts[qA.answer].verb };
          const wA = qA.opts.findIndex((o, i) => i !== qA.answer);
          const rwa = await BE.tapOpt(wA);                 // do-action 错点
          const missA = BE.currentLevel.miss;
          const rra = await BE.tapOpt(qA.answer);
          const done = await BE.autoSolve();               // 收尾（qi4）
          return { touch, act, rw, miss, rr, rwa, missA, rra,
                   sceneAskDo: document.getElementById('scene').dataset.ask, done: done.done, taps: done.taps };
        }''')
        t, a = do.get('touch', {}), do.get('act', {})
        ok2b = (do.get('rw') == 'wrong' and do.get('miss') == 1 and do.get('rr') == 'right' and
                do.get('rwa') == 'wrong' and do.get('missA') == 2 and do.get('rra') in ('right', 'done') and
                do.get('sceneAskDo') == '' and do.get('done') and 1 <= do.get('taps', 0) <= 5 and
                t.get('verb') == 'touch' and t.get('near20') and t.get('n') == 4 and
                t.get('paw') and t.get('hl') and t.get('ans') == t.get('ask') and
                all(o.startswith('t:') for o in t.get('oid', [])) and
                a.get('verb') == 'clap' and a.get('ask') == 'clap' and a.get('n') == 4 and
                a.get('ansV') == 'clap' and
                sorted(a.get('labels', [])) == sorted(SPEC_ACT_ZH.values()) and
                all(o.startswith('a:') for o in a.get('oid', [])))
        chk('2b do 真实驱动（touch 爪标卡+族域/错点 miss/action 四短语恰全集/scene 防泄）',
            ok2b, json.dumps(do, ensure_ascii=False)[:260] if not ok2b else
            'touch=%s act=%s miss=%s->%s' % (t.get('ask'), a.get('verb'), do.get('miss'), do.get('missA')))

        # ---- 3a 双视口截图非空白（含 do 板） ----
        shot = HERE / '_shots'
        shot.mkdir(exist_ok=True)
        for vp, name in [((800, 1180), 'r41_do_portrait.png'), ((1280, 800), 'r41_do_landscape.png')]:
            pg.set_viewport_size({'width': vp[0], 'height': vp[1]})
            pg.wait_for_timeout(400)
            pg.screenshot(path=str(shot / name))
        okpx = all((shot / n).stat().st_size > 20000
                   for n in ('r41_do_portrait.png', 'r41_do_landscape.png'))
        chk('3a 双视口截图非空白（>20KB，do 板）', okpx)
        pg.close()

        # ---- 4 正常模式主流程（MUTE 双保险②：种档 settings 全关+完整 core 字段） ----
        ctx = b.new_context()
        pg4 = ctx.new_page()
        pg4.on('pageerror', lambda e: errs.append('p4:' + str(e)[:120]))
        sv = json.dumps({'v': '1.0', 'game': 'bodyen',
                         'firstDay': '2026-09-22', 'lastDay': '2026-09-22',
                         'levels': {'1-%d' % i: {'stars': 3, 'plays': 1} for i in range(5)},
                         'dailyMin': {}, 'settings': {'sound': False, 'tts': False, 'vol': 0},
                         'restTip': {'day': '', 'shown': 0}}, ensure_ascii=False)
        pg4.add_init_script('localStorage.setItem("kidsgame_bodyen", JSON.stringify(%s));' % sv)
        pg4.goto(URL)
        pg4.wait_for_timeout(1500)
        main4 = pg4.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
          KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
          // 种档 1-0..1-4 完成 → first=flat5（ch2 see）：先点一次错（2 星路径）再通关；
          // 错点 1000ms 防重入窗（真实时）内二击被吞 → 轮询重试至 miss+1
          let w = 0; while (state.locked || state.demo) { if (w++ > 200) break; await wait(50); }
          const q = BE.quiz;
          const wi = q.opts.findIndex((o, i) => i !== q.answer);
          for (let t = 0; t < 20 && BE.currentLevel.miss === 0; t++) {
            await BE.tapOpt(wi);
            if (BE.currentLevel.miss > 0) break;
            await wait(400);
          }
          const r = await BE.autoSolve();
          await wait(5000);                                  // celebrate+写档
          const sv2 = JSON.parse(localStorage.getItem('kidsgame_bodyen') || '{}');
          return { flat: BE.currentLevel.flat, done: r.done, taps: r.taps,
                   lv: sv2.levels && sv2.levels['2-0'], miss: BE.currentLevel.miss };
        }''')
        ok4 = (main4.get('flat') == 5 and main4.get('done') and main4.get('taps') == 5 and
               main4.get('lv') and main4['lv'].get('stars') == 2 and main4['lv'].get('plays') == 1)
        chk('4 正常模式主流程（种档静音+错 1 次+通关=写档 2-0 两星）', ok4,
            json.dumps(main4, ensure_ascii=False))
        pg4.close()
        ctx.close()

        # ---- 0 pageerror / http 外联 ----
        html = (HERE.parent / 'index.html').read_text(encoding='utf-8')
        ext = [t for t in ('http://', 'https://') if t in html.replace('http://www.w3.org/2000/svg', '')]
        chk('0 pageerror=0', len(errs) == 0, errs[:3])
        chk('0 http 外联=0', len(ext) == 0, ext)
        b.close()

    fails = [n for n, o in RES if not o]
    print('\nTOTAL %d/%d PASS' % (len(RES) - len(fails), len(RES)))
    if fails:
        print('FAILED:', fails)
        sys.exit(1)


if __name__ == '__main__':
    main()
