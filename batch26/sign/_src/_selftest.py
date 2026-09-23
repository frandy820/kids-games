# -*- coding: utf-8 -*-
"""sign _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程；
单 page 串行用完即关——内存纪律）SPEC-R36-SIGN §R8
MUTE 静音双保险（r19 红线，r36 补齐）：每 context 挂 MUTE_INIT init script + 种档
settings{sound:false,tts:false,vol:0}
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭表对账（SPEC-R36 §R1 文字口径重列，不引用页面 SIGNS/NEAR/池/ACT）：
   40 关全题 标志∈24表 / 卡∈24 且互异 / 恰 1 正确 / ch1 目标+卡 ⊆ 行走安全5池 /
   ch2 目标 ∈ 红圈黄三角15池+每关 flash==2 / ch3 近对在场+每关 flash==1 且 qi0 不闪 /
   ch4 每关 act==2+flash==1+近对在场 ≥3 / 映射唯一（24 m+24 ACT 互异零碰撞）
3. SG 钩子语义：SG.start(10) 外部切关生效（dch=3）；quiz.sign/meaning/kind/flash/
   cards{id,meaning}；tapCard(i)=下标语义；错反馈链=sgn_wrong+引导句绑题面 fam
   （键化口径 __lastQueue[1].key='sgn_guide_'+fam——r36 修复基线存量红）
4. act 行为题腿（flat17 dch4）：真实 pointer 驱动至 act 题——board.act 类/标签=ACT 表/
   题面句文案/错行为卡真实点击 wrong+miss+1/后续真实点卡通关
5. flash 闪现腿（flat5 dch2）：驱动至 flash 位——1800×0.12=216ms 后遮面 .on 在场/
   reflashCover() 揭面复遮/遮面期真实点卡 wrong
6. 双 viewport(1280x800/800x1180) ch1/ch4-act：卡 ≥96、题面卡 ≥64、overflowX≤0、截图像素非空白
7. 正常模式（非 verify 页，MUTE 种档 tutSeen=false）真实主流程：教学自动触发（看→帮）
   → 真实 pointer 点卡通关 → celebrate → 写档 stars=2（1 错+4 对）+ tutSeen + v1.0
8. 正常模式错选路径：反馈拼播链=sgn_wrong+按题面标志 fam 的引导句（voice.queue spy 断言）
"""
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
TODAY = time.strftime('%Y-%m-%d')
OLD = (date.today() - timedelta(days=3)).strftime('%Y-%m-%d')
RESULTS = []

MUTE_INIT = """Object.defineProperty(HTMLMediaElement.prototype,'muted',{set:function(){},get:function(){return true}});
window.__sfx=0;window.__spk=0;
window.speechSynthesis && (speechSynthesis.speak = function(){}, speechSynthesis.cancel = function(){});
const _aplay = Audio.prototype.play;
Audio.prototype.play = function(){ try { this.dispatchEvent(new Event('ended')); } catch(e){} return Promise.resolve(); };
const _ac = window.AudioContext || window.webkitAudioContext;
if (_ac) window.AudioContext = function(){ return {
  state:'closed',
  resume:function(){},
  createOscillator:function(){ return {
    connect:function(){ return { connect:function(){} }; },
    start:function(){}, stop:function(){}, onended:null,
    frequency:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  createGain:function(){ return {
    connect:function(){},
    gain:{ value:0, setValueAtTime:function(){}, linearRampToValueAtTime:function(){}, exponentialRampToValueAtTime:function(){} }
  }; },
  destination:{}, currentTime:0, sampleRate:44100
}; };"""

# ---------- Python 独立封闭表（SPEC-R36-SIGN §R1 文字逐条转译，禁抄页面表） ----------
PY_SIGN24 = ['light', 'zebra', 'bridge', 'tunnel', 'walk', 'noentry', 'nocar', 'noped',
             'nobike', 'horn', 'stop', 'yield', 'ped', 'child', 'work', 'slow',
             'cross', 'turn', 'slip', 'rail', 'oneway', 'straight', 'goleft', 'goright']
PY_NEAR = {'noentry': 'nocar', 'nocar': 'noentry', 'noped': 'nobike', 'nobike': 'noped',
           'stop': 'yield', 'yield': 'stop', 'ped': 'child', 'child': 'ped',
           'cross': 'turn', 'turn': 'cross', 'slip': 'slow', 'slow': 'slip',
           'oneway': 'straight', 'straight': 'oneway', 'goleft': 'goright', 'goright': 'goleft',
           'zebra': 'walk', 'walk': 'zebra'}
PY_WALK5 = ['light', 'zebra', 'bridge', 'tunnel', 'walk']
PY_DENY15 = ['noentry', 'nocar', 'noped', 'nobike', 'horn', 'stop', 'yield',
             'ped', 'child', 'work', 'slow', 'cross', 'turn', 'slip', 'rail']
PY_NEAR_POOL = list(PY_NEAR.keys())
PY_FAM = {'light': 'signal', 'zebra': 'blue', 'bridge': 'blue', 'tunnel': 'blue', 'walk': 'blue',
          'noentry': 'red', 'nocar': 'red', 'noped': 'red', 'nobike': 'red', 'horn': 'red',
          'stop': 'redoct', 'yield': 'redtri', 'ped': 'yellow', 'child': 'yellow',
          'work': 'yellow', 'slow': 'yellow', 'cross': 'yellow', 'turn': 'yellow',
          'slip': 'yellow', 'rail': 'yellow', 'oneway': 'blue', 'straight': 'bluec',
          'goleft': 'bluec', 'goright': 'bluec'}
PY_M = {'light': '看灯走', 'zebra': '走斑马线', 'bridge': '走天桥', 'tunnel': '走地下道',
        'walk': '只能走路', 'noentry': '不能通行', 'nocar': '车不能进', 'noped': '行人禁入',
        'nobike': '单车禁行', 'horn': '禁按喇叭', 'stop': '停下看路', 'yield': '先让一让',
        'ped': '注意行人', 'child': '前方儿童', 'work': '前方施工', 'slow': '慢慢走',
        'cross': '路口小心', 'turn': '急转弯', 'slip': '路滑慢走', 'rail': '小心火车',
        'oneway': '只往前走', 'straight': '只准直行', 'goleft': '往左转', 'goright': '往右转'}
PY_ACT = {'light': '红灯等绿灯走', 'zebra': '走斑马线过街', 'bridge': '从天桥过街',
          'tunnel': '从地下道过街', 'walk': '慢慢走不跑', 'noentry': '绕开这里走',
          'nocar': '汽车绕开走', 'noped': '不走这条路', 'nobike': '不骑车进去',
          'horn': '不按喇叭', 'stop': '停一停再走', 'yield': '让别的人先走',
          'ped': '注意来往的人', 'child': '小心小朋友', 'work': '绕开工地走',
          'slow': '放慢速度走', 'oneway': '顺着箭头走', 'straight': '一直走不转弯',
          'goleft': '往左边转弯', 'goright': '往右边转弯', 'cross': '路口看两边',
          'turn': '转弯慢一点', 'slip': '路滑小心走', 'rail': '一停二看三过'}
PY_GUIDE = {'red': '红圈圈说，不能做', 'redoct': '红八角说，停下来', 'redtri': '红倒三角说，让一让',
            'yellow': '黄三角说，要小心', 'blue': '蓝牌子说，这样走', 'bluec': '蓝圆圈说，这样走',
            'signal': '看看灯的颜色再走'}
PY_ACTQ = '看到这个标志，怎么做'


def preset_save(tut_seen=False):
    """正常模式种档（MUTE 双保险之一：settings 全关；tutSeen=False 触发教学链）"""
    save = {
        'v': '1.0', 'game': 'sign', 'firstDay': OLD, 'lastDay': TODAY,
        'levels': {}, 'dailyMin': {},
        'settings': {'sound': False, 'tts': False, 'vol': 0},
        'restTip': {'day': '', 'shown': 0},
        'sign': {'tutSeen': tut_seen},
    }
    return 'localStorage.setItem("kidsgame_sign", ' + json.dumps(json.dumps(save)) + ')'


def new_ctx(browser, vp, seed=None):
    """每 context 必挂 MUTE_INIT（r19 双保险之二）+ 可选种档"""
    ctx = browser.new_context(viewport={'width': vp[0], 'height': vp[1]})
    ctx.add_init_script(MUTE_INIT)
    if seed:
        ctx.add_init_script(seed)
    return ctx


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        ctx = new_ctx(browser, (1280, 800))                    # r19：MUTE 双保险
        page = ctx.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(150):                                   # runVerify 异步（教学链+冒烟+act/flash 单元），轮询 title
            page.wait_for_timeout(500)
            title = page.title()
            if title.startswith('VERIFY'):
                break
        check('verify title', title.startswith('VERIFY PASS') and '/' in title, title)
        raw = page.eval_on_selector('#verify-result', 'el => el.textContent')
        out = json.loads(raw)
        check('verify pass==total', out['pass'] == out['total'], "%s/%s" % (out['pass'], out['total']))
        check('verify layoutOk', out['layoutOk'] is True)
        units_fail = {k: v for k, v in out['units'].items() if not v.get('ok')}
        smokes_fail = {k: v for k, v in out['smokes'].items() if not v.get('ok')}
        lv_fail = {k: v for k, v in {**out['levels'], **out['gen']}.items() if not v.get('ok')}
        check('verify units all green', not units_fail, units_fail)
        check('verify smokes all green', not smokes_fail, smokes_fail)
        check('verify 40 levels all green', not lv_fail and len(out['levels']) + len(out['gen']) == 40,
              'n=%d' % (len(out['levels']) + len(out['gen'])))
        check('0 pageerror (verify page)', not page_errors, page_errors[:3])

        # ---- 2. Python 独立封闭表对账（40 关全题 + 三表映射唯一 + 构成计数） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'sign: q.sign, kind: q.kind, flash: !!q.flash, near: !!q.near, '
                                  'cards: q.cards.map(c => c.meaning) })) }; })')
        bad = []
        for lv in levels_js:
            near_cnt = 0
            flash_cnt = sum(1 for q in lv['quizzes'] if q['flash'])
            act_cnt = sum(1 for q in lv['quizzes'] if q['kind'] == 'act')
            if lv['dch'] == 1 and (flash_cnt != 0 or act_cnt != 0):
                bad.append((lv['flat'], 'dch1 compose', flash_cnt, act_cnt))
            if lv['dch'] == 2 and (flash_cnt != 2 or act_cnt != 0):
                bad.append((lv['flat'], 'dch2 compose', flash_cnt, act_cnt))
            if lv['dch'] == 3 and (flash_cnt != 1 or act_cnt != 0 or lv['quizzes'][0]['flash']):
                bad.append((lv['flat'], 'dch3 compose', flash_cnt))
            if lv['dch'] == 4 and (act_cnt != 2 or flash_cnt != 1):
                bad.append((lv['flat'], 'dch4 compose', act_cnt, flash_cnt))
            for k, q in enumerate(lv['quizzes']):
                if q['sign'] not in PY_SIGN24:
                    bad.append((lv['flat'], k, 'signNotIn24', q['sign']))
                    continue
                ms = q['cards']
                if len(ms) != 4 or len(set(ms)) != 4:
                    bad.append((lv['flat'], k, 'cardsDup', ms))
                for mm in ms:
                    if mm not in PY_SIGN24:
                        bad.append((lv['flat'], k, 'cardNotIn24', mm))
                if sum(1 for mm in ms if mm == q['sign']) != 1:
                    bad.append((lv['flat'], k, 'ansN', ms))
                if lv['dch'] == 1:
                    if any(m not in PY_WALK5 for m in ms) or q['sign'] not in PY_WALK5:
                        bad.append((lv['flat'], k, 'ch1set', ms))
                if lv['dch'] == 2 and q['sign'] not in PY_DENY15:
                    bad.append((lv['flat'], k, 'ch2pool', q['sign']))
                if PY_NEAR.get(q['sign']) in ms:
                    near_cnt += 1
            if lv['dch'] == 3 and near_cnt != 5:
                bad.append((lv['flat'], 'ch3Near', near_cnt))
            if lv['dch'] == 4 and near_cnt < 3:
                bad.append((lv['flat'], 'ch4NearLt3', near_cnt))
        check('python-side closed-table parity (40 levels x 5 quizzes)', not bad, bad[:5])
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor light mean no-flash',
              anchor['sign'] == 'light' and anchor['kind'] == 'mean' and not anchor['flash']
              and 'light' in anchor['cards'], anchor)
        page_tables = page.evaluate('({ m: Object.fromEntries(Object.keys(SIGNS).map(k => [k, SIGNS[k].m])),'
                                    ' act: Object.fromEntries(Object.keys(ACT).map(k => [k, ACT[k]])) })')
        m_ok = len(page_tables['m']) == 24 and len(set(page_tables['m'].values())) == 24 and \
            all(page_tables['m'][k] == PY_M[k] for k in PY_SIGN24)
        act_ok = len(page_tables['act']) == 24 and len(set(page_tables['act'].values())) == 24 and \
            all(page_tables['act'][k] == PY_ACT[k] for k in PY_SIGN24) and \
            not (set(page_tables['act'].values()) & set(page_tables['m'].values()))
        check('mapping unique & matches SPEC (24 m + 24 ACT, zero collision)', m_ok and act_ok,
              {'n_m': len(page_tables['m']), 'n_act': len(page_tables['act'])})
        gen_dch = {}
        for lv in levels_js:
            if lv['flat'] >= 20:
                gen_dch[lv['dch']] = gen_dch.get(lv['dch'], 0) + 1
        check('generated levels (flat>=20) all 4 dch types present',
              all(gen_dch.get(d, 0) > 0 for d in (1, 2, 3, 4)), gen_dch)

        # ---- 3. SG 钩子语义（外部切关 / quiz 字段含 kind+flash / tapCard 下标语义 + 反馈链绑 fam） ----
        page.evaluate('SG.start(10)')
        lv = page.evaluate('() => SG.currentLevel')
        check('SG.start(10) takes effect (ch3)', lv['flat'] == 10 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        qz = page.evaluate('() => SG.quiz')
        ids_ok = [c['id'] for c in qz['cards']] == ['s0', 's1', 's2', 's3']
        means = [c['meaning'] for c in qz['cards']]
        check('SG.quiz contract (sign/meaning/kind/flash/cards id+meaning)',
              qz['sign'] in PY_SIGN24 and qz['meaning'] == qz['sign'] and
              qz['kind'] == 'mean' and qz['flash'] in (True, False) and
              len(qz['cards']) == 4 and ids_ok and len(set(means)) == 4 and
              qz['step'] == 0 and qz['miss'] == 0, qz)
        near_ok = PY_NEAR.get(qz['sign']) in means
        check('SG.start(10) ch3 near-pair distractor present', near_ok,
              {'sign': qz['sign'], 'means': means})
        wrong_i = next(i for i, c in enumerate(qz['cards']) if c['meaning'] != qz['sign'])
        page.evaluate('lastWrongVoice = 0')                    # 重置 flat≥3 错反馈 10s 节流锚
        page.evaluate('i => SG.tapCard(i)', wrong_i)           # fire-and-forget（1000ms 窗，b25 坑①）
        page.wait_for_timeout(1300)
        after = page.evaluate('() => ({ miss: SG.quiz.miss, lvlMiss: SG.currentLevel.miss, step: SG.quiz.step })')
        chain = page.evaluate('window.__lastQueue')
        guide_ok = (chain and chain[0] == 'sgn_wrong' and chain[1] and
                    chain[1]['key'] == 'sgn_guide_' + PY_FAM[qz['sign']] and
                    chain[1]['text'] == PY_GUIDE[PY_FAM[qz['sign']]])
        check('tapCard(index) semantics (wrong card +1 miss)',
              after['miss'] == 1 and after['lvlMiss'] == 1 and after['step'] == 0, after)
        check('wrong-feedback chain bound to quiz-sign fam (sgn_wrong + keyed guide)',
              guide_ok, {'chain_key': chain and chain[1] and chain[1]['key'],
                         'sign': qz['sign'], 'fam': PY_FAM[qz['sign']]})

        # ---- 4. act 行为题腿（flat17 dch4 真实 pointer） ----
        page.evaluate('document.getElementById("verify-result").style.display="none"')  # 浮层让位真实点击
        page.evaluate('SG.start(17)')
        page.wait_for_timeout(300)
        guard = 0
        reached = False
        while guard < 8:
            q = page.evaluate('() => SG.quiz')
            if q and q['kind'] == 'act':
                reached = True
                break
            idx = next(i for i, c in enumerate(q['cards']) if c['meaning'] == q['sign'])
            page.click('.card[data-i="%d"]' % idx, timeout=3000)
            page.wait_for_timeout(900)                         # verify SPEED=0.12 演出窗 648ms+余量
            guard += 1
        qact = page.evaluate('() => SG.quiz')
        labels = page.evaluate('Array.from(document.querySelectorAll("#board .card .m-label"), el => el.textContent)')
        board_act = page.evaluate('document.getElementById("board").classList.contains("act")')
        qtext = page.evaluate('document.querySelector("#scene .q-text").textContent')
        act_dom_ok = (reached and qact and qact['kind'] == 'act' and board_act and
                      labels == [PY_ACT[c['meaning']] for c in qact['cards']] and
                      PY_ACTQ in qtext)
        check('act quiz reached & DOM (board.act + ACT labels + act q-text)', act_dom_ok,
              {'reached': reached, 'labels': labels, 'qtext': qtext})
        wi = next(i for i, c in enumerate(qact['cards']) if c['meaning'] != qact['sign'])
        page.click('.card[data-i="%d"]' % wi, timeout=3000)    # 错行为卡真实点击
        page.wait_for_timeout(1300)                            # 1000ms 防重入窗
        st_w = page.evaluate('() => ({ miss: SG.quiz.miss, step: SG.quiz.step })')
        check('act wrong card real-click (miss+1, step hold)', st_w['miss'] == 1 and st_w['step'] == 0, st_w)
        guard = 0
        while guard < 8:                                       # 真实点击收尾通关
            st = page.evaluate('() => ({ done: SG.currentLevel.done, q: SG.quiz })')
            if st['done'] or not st['q']:
                break
            idx = next(i for i, c in enumerate(st['q']['cards']) if c['meaning'] == st['q']['sign'])
            page.click('.card[data-i="%d"]' % idx, timeout=3000)
            page.wait_for_timeout(900)
            guard += 1
        done17 = page.evaluate('() => SG.currentLevel.done')
        check('act level solved by real clicks (flat17)', done17 is True)

        # ---- 5. flash 闪现腿（flat5 dch2） ----
        page.evaluate('SG.start(5)')
        page.wait_for_timeout(300)
        guard = 0
        f_reached = False
        while guard < 8:
            q = page.evaluate('() => SG.quiz')
            if q and q['flash']:
                f_reached = True
                break
            idx = next(i for i, c in enumerate(q['cards']) if c['meaning'] == q['sign'])
            page.click('.card[data-i="%d"]' % idx, timeout=3000)
            page.wait_for_timeout(900)
            guard += 1
        # renderQuiz 直调重建当前 flash 题的遮面定时器——同步采样必落 216ms 亮相窗内（防竞态）
        cover_before = page.evaluate('renderQuiz(); !!document.querySelector("#scene .flash-cover.on")')
        page.wait_for_timeout(600)                             # 1800×0.12=216ms 后必遮
        cover_after = page.evaluate('!!document.querySelector("#scene .flash-cover.on")')
        re_ok = page.evaluate('reflashCover()')                # 揭面（救援重闪直调）
        page.wait_for_timeout(60)                              # 揭面期（1200×0.12=144ms 内采样）
        mid = page.evaluate('!!document.querySelector("#scene .flash-cover.on")')
        page.wait_for_timeout(400)                             # 复遮
        re_on = page.evaluate('!!document.querySelector("#scene .flash-cover.on")')
        qf = page.evaluate('() => SG.quiz')
        step0 = qf['step']
        wi = next(i for i, c in enumerate(qf['cards']) if c['meaning'] != qf['sign'])
        page.click('.card[data-i="%d"]' % wi, timeout=3000)    # 遮面期真实点卡（凭记忆作答）
        page.wait_for_timeout(1300)
        st_f = page.evaluate('() => ({ miss: SG.quiz.miss, step: SG.quiz.step })')
        check('flash cover timing + reflash + covered tap',
              f_reached and not cover_before and cover_after and re_ok and not mid and re_on and
              st_f['miss'] == 1 and st_f['step'] == step0,
              {'reached': f_reached, 'before': cover_before, 'after': cover_after,
               'reflash': re_ok, 'mid': mid, 'reOn': re_on, 'tap': st_f, 'step0': step0})

        # ---- 6. 双 viewport 布局 + 截图非空白（flat17 量 act 卡形态） ----
        # verify 已完成（leg1 已等 title）——同页复用不重开，驱动/量测与 runVerify 无竞态
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 17), (800, 1180, 17)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.evaluate('SG.start(%d)' % flat)
            page.wait_for_timeout(250)
            if flat == 17:                                     # 驱动至 act 题再量（长标签形态）
                page.evaluate('''() => (async () => {
                  for (let i = 0; i < 5; i++) {
                    const q = SG.quiz;
                    if (!q || q.kind === 'act') break;
                    await SG.tapCard(q.cards.findIndex(c => c.meaning === q.sign));
                  }
                })()''')
                page.wait_for_timeout(3800)                    # 逐题演出窗 648ms×≤4+余量
                kind17 = page.evaluate('() => SG.quiz && SG.quiz.kind')
                check('layout %dx%d flat17 driven to act quiz' % (w, h), kind17 == 'act', kind17)
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       scene: [sc.offsetWidth, sc.offsetHeight],
                       ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            shot = HERE / '_shots' / ('vp%d_%d_f%d.png' % (w, h, flat))
            shot.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(shot))
            try:
                from PIL import Image
                import statistics
                im = Image.open(str(shot)).convert('L').resize((160, 100))
                sd = statistics.pstdev(list(im.getdata()))
                nonblank = sd > 10
            except ImportError:
                nonblank, sd = shot.stat().st_size > 30000, -1
            check('layout %dx%d flat%d' % (w, h, flat),
                  m['minWH'] >= 96 and m['scene'][0] >= 64 and m['scene'][1] >= 64 and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'scene': m['scene'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})
        page.set_viewport_size({'width': 1280, 'height': 800})
        ctx.close()                                            # 内存纪律

        # ---- 7. 正常模式（非 verify 页，MUTE 种档）真实主流程 ----
        ctx2 = new_ctx(browser, (1280, 800), seed=preset_save(tut_seen=False))
        pg2 = ctx2.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        # 先装 voice.queue spy（错选反馈链断言用；原调用透传不破坏行为）
        pg2.evaluate('''() => {
          const origQ = KIDS.voice.queue.bind(KIDS.voice);
          window.__vqLog = [];
          KIDS.voice.queue = function (parts) { window.__vqLog.push(parts); return origQ(parts); };
        }''')
        tut = ''
        for _ in range(40):                       # watch 链 ≈13.1s（真实 SPEED=1：900+3000+320+5400+500）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('SG.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__sgDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__sgDemoR': demo_r})
        # 错选一次：真实 pointer 点一张错误卡 → 反馈链=sgn_wrong+题面 fam 引导句（键化口径）
        qz2 = pg2.evaluate('() => SG.quiz')
        wi = next(i for i, c in enumerate(qz2['cards']) if c['meaning'] != qz2['sign'])
        log_len0 = pg2.evaluate('window.__vqLog.length')      # 基线
        pg2.click('.card[data-i="%d"]' % wi, timeout=3000)
        pg2.wait_for_timeout(1300)                # 1000ms 防重入窗
        chains = pg2.evaluate('window.__vqLog')
        st_after_wrong = pg2.evaluate('() => ({ miss: SG.quiz.miss, step: SG.quiz.step })')
        new_chain = chains[log_len0:]
        fam2 = PY_FAM[qz2['sign']]
        chain_ok = (new_chain and new_chain[0][0] == 'sgn_wrong' and new_chain[0][1] and
                    new_chain[0][1]['key'] == 'sgn_guide_' + fam2 and
                    new_chain[0][1]['text'] == PY_GUIDE[fam2])
        check('normal-mode wrong tap chain = sgn_wrong + keyed fam guide',
              chain_ok and st_after_wrong['miss'] == 1 and st_after_wrong['step'] == 0,
              {'chain_key': new_chain and new_chain[0][1] and new_chain[0][1]['key'],
               'sign': qz2['sign'], 'after': st_after_wrong})
        # 真实 pointer 逐题点应选卡（help 首点即放手 solo；flat0=ch1 无 act/flash）
        guard = 0
        while guard < 80:
            guard += 1
            st = pg2.evaluate('() => ({ done: SG.currentLevel.done, quiz: SG.quiz })')
            if st['done'] or not st['quiz']:
                break
            idx = next((i for i, c in enumerate(st['quiz']['cards'])
                        if c['meaning'] == st['quiz']['sign']), None)
            if idx is None:
                break
            pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
            pg2.wait_for_timeout(5800)            # 判对演出窗 5400ms + 读题（真实 SPEED=1 节拍）
        cel = False
        for _ in range(10):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('SG.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3400)                # celebrate 2.3s+320 + 补窗 400 + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_sign")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save (2 stars: 1 wrong + 4 right)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('sign', {}).get('tutSeen')
              and st1.get('stars') == 2,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('sign'), 'stars10': st1.get('stars')})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx2.close()                               # 内存纪律：page/context 用完即关

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
