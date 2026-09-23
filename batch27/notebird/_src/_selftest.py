# -*- coding: utf-8 -*-
"""r39 notebird Executor 自测（SIGN/EMO _selftest 范式；r19 静音双保险+r31 判别力+r37 M1 键构造直调）
腿清单：
  1a 谱投影：post.json 40 关与 baseline 对照（保留面=flat0 q0 find/do/完全升序+200 题）+确定性双跑
  1b Python 独立表断言（_r39_pycheck.gen_level 四型结构律+乱序律+dch4 构成 40 关全量）
  2a 键构造直调（纯函数：quizTextOf/confirmKeyOf/confirmText/guideKeyOf/guideTextOf——
      期望值从 SPEC-R39 §R10 硬编码推导，禁抄实现）
  2b melody 真实驱动（真页+NB 钩子：prog 状态机/错点进度保留/picked 高亮/3 位推进）
  2c interval 真实驱动（三文字卡固定序+分类独立复算+错对判定+确认键）
  2d 防泄露 DOM 断言（find/melody 唱窗+重听后零 .singing；higher 两鸟亮）
  3a 双视口布局（flat0 递增站台/乱序等高站台/iv 三卡 ≥96）+像素非空白截图
  4  正常模式主流程（教学 stub→通关→写档 2 星，种档静音）
  0  pageerror=0 / http 外联=0
用法: python _selftest.py"""
import json
import sys
import subprocess
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from _r39_pycheck import gen_level, hist_check, IDX, ORDER, IV_KEYS   # Python 独立实现（1b 用）

URL = ('file:///' + str(HERE.parent / 'index.html').replace(chr(92), '/'))
CH_LEN = 5

# SPEC-R39 §R10 键表硬编码（期望值从 SPEC 推导，禁抄 game-data 实现）
SPEC_KEYS = {
    'q_find': ('not_q', '是哪只小鸟在唱？'),
    'q_higher': ('not_q2', '谁的声音高？'),
    'q_melody': ('not_q_mel', '听一听，学着唱一遍'),
    'q_iv': ('not_q_iv', '听一听，隔了多远'),
    'cf_find_do': ('not_cf_s_0', '对啦，红小鸟在唱歌'),
    'cf_find_dop': ('not_cf_s_7', '对啦，白小鸟在唱歌'),
    'cf_higher_sol': ('not_cf_h_4', '对啦，蓝小鸟的声音高'),
    'cf_melody': ('not_cf_mel', '对啦，唱得真好'),
    'cf_iv': ('not_cf_iv', '对啦，耳朵真准'),
    'g_find_low': ('not_g_hi2', '再听一听，它更高些'),      # 所点 re(1) < 答案 sol(4)
    'g_find_high': ('not_g_lo2', '再听一听，它更低些'),      # 所点 la(5) > 答案 mi(2)
    'g_higher': ('not_g_h2', '再听一遍，谁的声音高'),      # r39-bis 9 字版（唱序随机后去时序明示）
    'g_melody': ('not_g_mel', '再听一遍，照顺序点'),
    'g_iv': ('not_g_iv', '再听听，隔了多远'),
}
SPEC_IV_LABEL = ['挨着', '隔一个', '隔好几个']

RES = []


def chk(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('[PASS] ' if ok else '[FAIL] ') + name + (('  | ' + str(info)) if info else ''))
    return bool(ok)


def main():
    from playwright.sync_api import sync_playwright

    # ---- 1a 谱投影对照 ----
    post = json.loads((HERE / 'r39-post.json').read_text(encoding='utf-8'))
    base = json.loads((HERE / 'r39-baseline.json').read_text(encoding='utf-8'))
    kinds = {}
    for f, L in post.items():
        for q in L['q']:
            kinds[q['kind']] = kinds.get(q['kind'], 0) + 1
    q00 = post['0']['q'][0]
    b00 = base['0']['q'][0]
    anchor = q00['kind'] == 'find' and q00['ansNote'] == 'do' and q00['notes'] == sorted(q00['notes'], key=lambda x: IDX[x])
    total_q = sum(len(L['q']) for L in post.values())
    # 变更面：dch1 关（ch1 静态 5 关+生成 dch1 关）谱面保留（r39 §R1 ch1 零改动）；dch≥2 关全刷新
    ident = [f for f in post if [x['notes'] for x in post[f]['q']] == [x['notes'] for x in base[f]['q']]]
    ident_dch1 = all(post[f]['dch'] == 1 for f in ident)
    chk('1a 谱投影（200 题/kind 四族/flat0 锚/dch1 保留+其余刷新）',
        total_q == 200 and set(kinds) == {'find', 'higher', 'melody', 'iv'} and anchor and
        b00['kind'] == 'find' and b00['ansNote'] == 'do' and
        ident_dch1 and len(ident) == sum(1 for f in post if post[f]['dch'] == 1),
        'kinds=%s total=%d anchor=%s keptDch1=%d/%d' % (
            kinds, total_q, anchor, len(ident), sum(1 for f in post if post[f]['dch'] == 1)))

    # ---- 1b Python 独立表断言（四型结构律+乱序律+dch4 构成+答案位直方图） ----
    ok = True
    mel = iv = 0
    py_levels = []
    for f in range(40):
        L = gen_level(f)
        py_levels.append(L)
        if len(L['quizzes']) != CH_LEN:
            ok = False; break
        kc = {}
        for q in L['quizzes']:
            kc[q['kind']] = kc.get(q['kind'], 0) + 1
            ns = q['notes']
            if q['kind'] == 'iv':
                iv += 1
                if ns != IV_KEYS:
                    ok = False
                d = IDX[q['sang'][1]] - IDX[q['sang'][0]]
                exp = 0 if d == 1 else 1 if d == 2 else 2
                if q['answer'] != exp:
                    ok = False
                continue
            asc = all(IDX[ns[j]] > IDX[ns[j - 1]] for j in range(1, len(ns)))
            if L['dch'] == 1 and not asc:
                ok = False
            if L['dch'] >= 2 and asc:
                ok = False          # 乱序律：ch2+ 音系题非完全升序
            if q['kind'] == 'melody':
                mel += 1
                if len(q['sang']) != 3 or len(set(q['sang'])) != 3 or \
                        any(s not in ns for s in q['sang']) or \
                        len([n for n in ns if n not in q['sang']]) != 1:
                    ok = False
            if q['kind'] == 'higher':
                d = abs(IDX[q['sang'][1]] - IDX[q['sang'][0]])   # r39-bis 唱序随机：音程判定用绝对值
                if not (1 <= d <= 2):
                    ok = False
        if L['dch'] == 4 and not (kc.get('melody') == 1 and kc.get('iv') == 1 and
                                  kc.get('find', 0) >= 1 and kc.get('higher', 0) >= 1):
            ok = False
    # r39-bis F1 防回归：答案位直方图+iv 三类计数（与 game-verify ④ dist / _r39_pycheck 同律）
    ok_h, h_stats = hist_check(py_levels)
    chk('1b 独立表四型+乱序律+dch4 构成+答案位直方图（40 关）', ok and ok_h,
        'mel=%d iv=%d hist(find/higher/iv)=%s lb=%s' %
        (mel, iv, [h_stats['find'], h_stats['higher'], h_stats['iv']], h_stats['lb']))

    with sync_playwright() as p:
        b = p.chromium.launch()

        # ---- 2a/2b/2c/2d：verify=1 页（钩子+spy；runVerify 并行不干扰——独立 page 上下文） ----
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        errs = []
        pg.on('pageerror', lambda e: errs.append('p1:' + str(e)[:120]))
        pg.goto(URL + '?verify=1')
        pg.wait_for_timeout(1500)

        # 2a 键构造直调（SPEC 推导期望——r37 M1 范式）
        out = pg.evaluate('''(spec) => {
          const g = (kind, notes, ansNote, i) => ({ kind, notes, ansNote, sang: [] });
          const mkQ = (kind, notes, ansNote) => ({ kind, notes, ansNote, sang: kind==='higher' ? [notes[0], ansNote] : kind==='find' ? [ansNote] : kind==='melody' ? [ansNote,'x','y'] : ['do','mi'] });
          const qf = mkQ('find', ['do','re','sol','la'], 'sol');
          const qh = mkQ('higher', ['do','re','sol','la'], 'sol');
          const qm = mkQ('melody', ['do','re','sol','la'], 'sol');
          const qi = mkQ('iv', IV_KEYS, 'iv_far');
          return {
            qText: [quizTextOf('find'), quizTextOf('higher'), quizTextOf('melody'), quizTextOf('iv')],
            cfKey: [confirmKeyOf(qf), confirmKeyOf(qh), confirmKeyOf(qm), confirmKeyOf(qi)],
            cfText: [confirmText(qf), confirmText(qh), confirmText(qm), confirmText(qi)],
            gKey: [guideKeyOf(qf, 1), guideKeyOf(qf, 3), guideKeyOf(qh, 0), guideKeyOf(qm, 1), guideKeyOf(qi, 0)],
            gText: [guideTextOf(qf, 1), guideTextOf(qf, 3), guideTextOf(qh, 0), guideTextOf(qm, 1), guideTextOf(qi, 0)],
            ivKeys: IV_KEYS.join('|'), ivLabel: [IV_LABEL.iv_near, IV_LABEL.iv_mid, IV_LABEL.iv_far],
            ivCls: [ivClsOf(1), ivClsOf(2), ivClsOf(3), ivClsOf(7)]
          };
        }''', None)
        k = SPEC_KEYS
        ka = (out['qText'] == [k['q_find'][1], k['q_higher'][1], k['q_melody'][1], k['q_iv'][1]] and
              out['cfKey'] == [k['cf_find_do'][0].replace('not_cf_s_0', 'not_cf_s_4'), k['cf_higher_sol'][0],
                               k['cf_melody'][0], k['cf_iv'][0]] and
              out['cfText'] == ['对啦，蓝小鸟在唱歌', k['cf_higher_sol'][1], k['cf_melody'][1], k['cf_iv'][1]] and
              out['gKey'] == [k['g_find_low'][0], k['g_find_high'][0], k['g_higher'][0], k['g_melody'][0], k['g_iv'][0]] and
              out['gText'] == [k['g_find_low'][1], k['g_find_high'][1], k['g_higher'][1], k['g_melody'][1], k['g_iv'][1]] and
              out['ivKeys'] == 'iv_near|iv_mid|iv_far' and out['ivLabel'] == SPEC_IV_LABEL and
              out['ivCls'] == [0, 1, 2, 2])
        chk('2a 键构造直调（四型题面/确认/引导键+iv 分类式）', ka,
            json.dumps(out, ensure_ascii=False)[:180] if not ka else '')

        # 2b/2c/2d 在独立注入页（避 runVerify 并发）：重新 open 不带 verify，用普通页+钩子
        pg.close()
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        pg.on('pageerror', lambda e: errs.append('p2:' + str(e)[:120]))
        # MUTE_INIT（r19 静音双保险①：init script stub 发声）
        pg.add_init_script('''Object.defineProperty(HTMLMediaElement.prototype, 'volume', { set: function(){}, get: function(){ return 0; } });''')
        pg.goto(URL)
        pg.wait_for_timeout(1200)
        # 正常页 stub 语音（评价音不阻塞；合成音 spy 记录）
        pg.evaluate('''() => { KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
            KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
            window.__sing = []; NB_AUDIO._tone = function(f, w, d) { window.__sing.push({f, t: performance.now() + w*1000, d: Math.round(d*1000)}); };
            NB_AUDIO._fakeRunning = true; NB_AUDIO.ctx = function() { return NB_AUDIO._fakeRunning ? {state:'running'} : null; }; }''')
        # 无档正常页必跑教学链（freshTut：flat0 看→帮→独，≤16s 预算）——等其完成再驱动，
        # 否则 NB.start 的 cur 会被教学链续体 cur=genLevel(0) 顶掉（2b 调试实证）
        pg.wait_for_timeout(20000)

        # 2d 防泄露：flat5（dch2 find 乱序）唱窗+重听零 .singing
        leak = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          NB.start(5);
          await wait(400);                                        // 唱窗内（700+300 不折算）
          const inWin = document.querySelectorAll('.bird-card.singing').length;
          await wait(1100);
          window.__sing.length = 0;
          NB.replay();
          const replayLit = document.querySelectorAll('.bird-card.singing').length;
          return { inWin, replayLit, sangN: window.__sing.length,
                   notesAsc: NB.quiz.notes.join(','), kind: NB.quiz.kind };
        }''')
        order5 = post['5']['q'][0]
        chk('2d 防泄露（find 唱窗+重听零指认；higher 两鸟亮=题面信息）',
            leak['inWin'] == 0 and leak['replayLit'] == 0 and leak['sangN'] == 1 and leak['kind'] == 'find',
            json.dumps(leak, ensure_ascii=False))
        hi = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          NB.start(10);
          await wait(300);
          const first = document.querySelectorAll('.bird-card.singing').length;
          await wait(1600);
          const after = document.querySelectorAll('.bird-card.singing').length;
          return { first, after, kind: NB.quiz.kind };
        }''')
        chk('2d-b higher 唱窗两鸟亮（题面信息非泄答；第二检查点 >=2——r39-bis M2 收窄）',
            hi['first'] >= 1 and hi['after'] >= 2 and hi['kind'] == 'higher',
            json.dumps(hi, ensure_ascii=False))

        # 2b melody 真实驱动（flat15 推进至 melody 位）
        mel = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          async function drive(kind) {
            NB.start(15);
            for (let g = 0; g < 8; g++) {
              let w = 0; while (state.singing && w++ < 120) await wait(50);
              const q = cur.quizzes[cur.step];
              if (!q) return null;
              if (q.kind === kind) return q;
              if (q.kind === 'melody') { let m = 0; while (!q._answered && m++ < 6) await NB.tapBird(q.notes.indexOf(q.sang[q._prog])); }
              else await NB.tapBird(q.answer);
              await wait(6200);
            }
            return null;
          }
          const q0 = await drive('melody');
          if (!q0) return { driven: false };
          let w = 0; while (state.singing && w++ < 120) await wait(50);
          const Q = NB.quiz;
          const picked0 = document.querySelectorAll('.bird-card.picked').length;
          const r1 = await NB.tapBird(Q.notes.indexOf(Q.sang[0]));
          const picked1 = document.querySelectorAll('.bird-card.picked').length;
          const di = Q.notes.findIndex(n => !Q.sang.includes(n));
          const rw = await NB.tapBird(di);
          const keep = NB.quiz.prog;
          const r2 = await NB.tapBird(NB.quiz.notes.indexOf(Q.sang[1]));
          const r3 = await NB.tapBird(NB.quiz.notes.indexOf(Q.sang[2]));
          return { driven: true, kind: Q.kind, sang: Q.sang, prog0: Q.prog, picked0, r1, picked1,
                   rw, keep, r2, r3, stepAfter: NB.currentLevel.step, doneLv: NB.currentLevel.done,
                   miss: NB.quiz === null ? 'quiznull' : NB.quiz.miss };
        }''')
        ok2b = (mel.get('driven') and mel.get('kind') == 'melody' and mel.get('prog0') == 0 and
                mel.get('picked0') == 0 and mel.get('r1') == 'step' and mel.get('picked1') == 1 and
                mel.get('rw') == 'wrong' and mel.get('keep') == 1 and
                mel.get('r2') == 'step' and (mel.get('r3') in ('right', 'done')))
        chk('2b melody 真实驱动（step/picked/错点进度保留/3 位推进）', ok2b, json.dumps(mel, ensure_ascii=False)[:220])

        # 2c interval 真实驱动（优先非末位 iv）
        iv = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          async function drive(flat, kind) {
            NB.start(flat);
            for (let g = 0; g < 8; g++) {
              let w = 0; while (state.singing && w++ < 120) await wait(50);
              const q = cur.quizzes[cur.step];
              if (!q) return null;
              if (q.kind === kind) return q;
              if (q.kind === 'melody') { let m = 0; while (!q._answered && m++ < 6) await NB.tapBird(q.notes.indexOf(q.sang[q._prog])); }
              else await NB.tapBird(q.answer);
              await wait(6200);
            }
            return null;
          }
          for (const f of [15, 16, 17, 18, 19]) {
            const q0 = await drive(f, 'iv');
            if (q0 && cur.step < 4) {
              let w = 0; while (state.singing && w++ < 120) await wait(50);
              const Q = NB.quiz;
              const cards = Array.from(document.querySelectorAll('.bird-card')).map(b => b.dataset.note);
              const labels = Array.from(document.querySelectorAll('.iv-word')).map(e => e.textContent);
              const sizes = Array.from(document.querySelectorAll('.bird-card')).map(b => ({ w: b.offsetWidth, h: b.offsetHeight }));
              const rw = await NB.tapBird(Q.answer === 0 ? 1 : 0);
              const rr = await NB.tapBird(Q.answer);
              return { flat: f, cards, labels, sizes, sang: Q.sang, answer: Q.answer,
                       rw, rr, stepAfter: NB.currentLevel.step };
            }
          }
          return { none: true };
        }''')
        exp_lbl = SPEC_IV_LABEL
        ok2c = (not iv.get('none') and iv.get('cards') == IV_KEYS and iv.get('labels') == exp_lbl and
                all(s['w'] >= 96 and s['h'] >= 96 for s in iv.get('sizes', [])) and
                iv.get('rw') == 'wrong' and iv.get('rr') in ('right', 'done'))
        chk('2c interval 真实驱动（三卡固定序+尺寸+错对判定）', ok2c, json.dumps(iv, ensure_ascii=False)[:200])

        # 3a 双视口布局+像素非空白
        layout = pg.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          function snap(flat) { return { flat,
            cards: document.querySelectorAll('.bird-card').length,
            perches: Array.from(document.querySelectorAll('.bird-card .perch')).map(p => p.offsetHeight) }; }
          const out = [];
          NB.start(0);
          let w = 0; while (state.singing && w++ < 120) await wait(50);
          out.push(snap(0));
          NB.start(15);
          w = 0; while (state.singing && w++ < 120) await wait(50);
          out.push(snap(15));
          return out;
        }''')
        ch1 = layout[0]['perches']
        ch4 = layout[1]['perches']
        chk('3a 布局（ch1 站台递增 / ch4+ 等高 / iv 三卡 ≥96）',
            len(ch1) == 4 and ch1[3] > ch1[0] and len(ch4) == 4 and len(set(ch4)) == 1 and
            (ok2c or iv.get('none')),
            'ch1=%s ch4=%s' % (ch1, ch4))
        shot = HERE / '_shots'
        shot.mkdir(exist_ok=True)
        pg.set_viewport_size({'width': 800, 'height': 1180})
        pg.wait_for_timeout(400)
        pg.screenshot(path=str(shot / 'r39_portrait.png'))
        pg.set_viewport_size({'width': 1280, 'height': 800})
        pg.wait_for_timeout(400)
        pg.screenshot(path=str(shot / 'r39_landscape.png'))
        okpx = (shot / 'r39_portrait.png').stat().st_size > 20000 and (shot / 'r39_landscape.png').stat().st_size > 20000
        chk('3a-b 双视口截图非空白（>20KB）', okpx)
        pg.close()

        # ---- 4 正常模式主流程（种档静音+教学 stub→通关→写档 2 星） ----
        ctx = b.new_context()
        pg4 = ctx.new_page()
        pg4.on('pageerror', lambda e: errs.append('p4:' + str(e)[:120]))
        # MUTE 双保险②：种档 settings 全关（r19）
        sv = json.dumps({'v': '1.0', 'game': 'notebird',
                         'firstDay': '2026-09-21', 'lastDay': '2026-09-21',
                         'levels': {'1-%d' % i: {'stars': 3, 'plays': 1} for i in range(5)},
                         'dailyMin': {}, 'settings': {'sound': False, 'tts': False, 'vol': 0},
                         'restTip': {'day': '', 'shown': 0}}, ensure_ascii=False)
        pg4.add_init_script('localStorage.setItem("kidsgame_notebird", JSON.stringify(%s));' % sv)
        pg4.goto(URL)
        pg4.wait_for_timeout(1500)
        main4 = pg4.evaluate('''async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          KIDS.voice.play = () => {}; KIDS.voice.queue = () => {}; KIDS.voice.say = () => {};
          KIDS.speak = () => {}; KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {};
          NB_AUDIO._fakeRunning = true; NB_AUDIO.ctx = function() { return {state:'running'}; };
          NB_AUDIO._tone = function() {};
          // 种档 1-0..1-4 完成 → first=flat5（ch2 dch2，wrong 可计 miss）：先点一次错（2 星路径）再通关
          // r39 终态（2026-09-22 九键注册）：唱后读题句 clip 化（~2.9s）——wi 点击可能落读题锁窗被吞，
          // 改轮询重试至 miss+1（过渡态静默 0ms 旧等待已过时）
          let w = 0; while (state.singing && w++ < 120) await wait(50);
          const q = NB.quiz;
          const wi = q.notes.findIndex((n, j) => j !== q.answer);
          for (let t = 0; t < 20 && NB.currentLevel.miss === 0; t++) {
            await NB.tapBird(wi);
            if (NB.currentLevel.miss > 0) break;
            await wait(400);
          }
          const r = await NB.autoSolve();
          await wait(5000);                                  // celebrate+写档
          const sv2 = JSON.parse(localStorage.getItem('kidsgame_notebird') || '{}');
          return { flat: NB.currentLevel.flat, done: r.done, taps: r.taps,
                   lv: sv2.levels && sv2.levels['2-0'], miss: NB.currentLevel.miss };
        }''')
        ok4 = (main4.get('done') and main4.get('lv') and
               main4['lv'].get('stars') == 2 and          # r39 终态（2026-09-22）：判据收窄——写档 stars==2 本身即
               main4['lv'].get('plays') == 1)             # 「错 1-2 次路径」证据（engStars retries 1-2=2★）；旧 miss==1
               # 读数位删：腿内 stub 集（voice/NB_AUDIO 全 stub）在 72-clips 终态下 tapBird 落锁窗不记 miss、
               # currentLevel probe 又时序敏感（通关推进 flat6 后 retries 归 0）——两条 miss 读法均不稳，
               # stars==2（写档快照）为稳定判据；miss 驱动细节交 verify_one T 系真实链覆盖
        chk('4 正常模式主流程（错 1 次+通关=写档 1-2 两星）', ok4, json.dumps(main4, ensure_ascii=False))
        pg4.close(); ctx.close()

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
