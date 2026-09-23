# -*- coding: utf-8 -*-
"""calendar _selftest — headless playwright 自测（独立 chromium.launch，不连/不杀任何浏览器进程）
1. ?verify=1 → title=VERIFY PASS n/n + JSON pass==total + layoutOk + units/levels/gen 全绿 + 0 pageerror
2. Python 侧独立封闭表对账（SPEC-R37 §R2/§R3 文字口径重列，不引用页面 DAYS/MONTHS/CB 表）：
   40 关全题 kind∈10 型 / base·answer·opts ∈ 对应封闭表（星期 7+月份 12+日期词+月末行表）/
   answer=独立算环步进（±1/±2）或 cbound 行表 / 4 卡互异且恰 1 right / 干扰 3 互异不含答案 /
   近对在场（环族=答案环距 1 ≥1；cbound=不存在日期 d1 在场）/ dateq 锚不入干扰 /
   dch1 全 day·五关并集全 7 天 / dch2 全 month 族·全题并集全 12 月 /
   dch3 每关接龙跨界恰 1+反向多步跨界恰 2+rev 恰 2 / dch4 dateq+cbound 各恰 1+kinds ≥4
3. CA 钩子语义：CA.start(10) 外部切关生效；quiz.kind/base/answer/opts{id,word}；
   tapOpt(i)=下标语义；flat<3 错反馈=语音轨（±1=TTS 方向句；jump=TTS 数数教育句）
4. 防重入 fire-and-forget（b25 坑①方法学）：首击不 await，40ms 内二击=被拦 false
5. 双 viewport(1280x800/800x1180) ch1/ch4：词卡 ≥96、题面卡 ≥64、序列条 7/12 格可见、
   overflowX≤0、截图像素非空白
6. 正常模式（非 verify 页）真实主流程：全新存档 → 教学自动触发（看→帮）→ 真实 pointer
   错选一次（cal_self_d_f clip——T46 段链轨）→ 逐题点应选词卡通关 → celebrate →
   写档 stars=2 + tutSeen + v1.0
r37 适配：T46 段链化后 4 腿过时断言修正（基线 24/28 的 4 FAIL=存量断言未跟 T46，非本轮引入）。
r37-bis 适配：§R6-bis 37 键注册后救援腿 jump 分支 say→queue 段链断言（2026-09-21）。
MUTE 静音双保险（r19 红线）：每 context 挂 MUTE_INIT init_script + normal 模式种档
sound:false/tts:false/vol:0（教学链仍触发——freshTut 只看 levels/tutSeen）。
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
RESULTS = []

# ---------- r19 测试静音双保险（照 batch6/words 先例）：每 context 挂 MUTE_INIT 静音 init script
# + normal 模式种档 sound:false/tts:false/vol:0（游戏层第二道）；verify 页另有 KIDS 级 stub 三道兜底
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


def mute_seed():
    """normal 模式种档：settings 三关闭（教学链仍触发——无 tutSeen/无 levels）"""
    save = {'v': '1.0', 'game': 'calendar', 'levels': {}, 'dailyMin': {},
            'settings': {'sound': False, 'tts': False, 'vol': 0}}       # MUTE 双保险之一（r19）
    return 'localStorage.setItem("kidsgame_calendar", ' + json.dumps(json.dumps(save)) + ')'

# ---------- Python 独立封闭表（SPEC-R37 §R2/§R3 文字逐条转译，禁抄页面表） ----------
PY_DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
PY_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
PY_KINDS = ['day', 'month', 'day_rev', 'month_rev',
            'day_2', 'day_m2', 'month_2', 'month_m2', 'dateq', 'cbound']
PY_DNUMS = ['一号', '二号', '三号', '四号', '五号', '六号', '七号', '八号']
PY_TNUMS = ['三号', '四号', '五号', '六号', '七号', '八号', '九号', '十号']
# 月末边界行表（11 源月，二月不做源月）：src → (月末数字词, 不存在日期数字词)
PY_CB = {'一月': ('三十一', '三十二'), '三月': ('三十一', '三十二'), '四月': ('三十', '三十一'),
         '五月': ('三十一', '三十二'), '六月': ('三十', '三十一'), '七月': ('三十一', '三十二'),
         '八月': ('三十一', '三十二'), '九月': ('三十', '三十一'), '十月': ('三十一', '三十二'),
         '十一月': ('三十', '三十一'), '十二月': ('三十一', '三十二')}
PY_TAIL = {'day': '星期日', 'month': '十二月'}       # 接龙跨界题面词（答案绕回环首）
PY_HEAD = {'day': '星期一', 'month': '一月'}          # 跨界答案


def py_fam(kind):
    return PY_DAYS if kind in ('day', 'day_rev', 'day_2', 'day_m2', 'dateq') else PY_MONTHS


def py_step(kind):
    return {'day': 1, 'month': 1, 'day_rev': -1, 'month_rev': -1,
            'day_2': 2, 'month_2': 2, 'dateq': 2, 'day_m2': -2, 'month_m2': -2}[kind]


def py_succ(kind, base):
    f = py_fam(kind)
    return f[(f.index(base) + 1) % len(f)]


def py_pred(kind, base):
    f = py_fam(kind)
    return f[(f.index(base) - 1 + len(f)) % len(f)]


def py_stepN(kind, base, d):
    f = py_fam(kind)
    return f[(f.index(base) + d + len(f)) % len(f)]


def py_cb_words(m):
    ni = PY_MONTHS.index(m)
    endw, d1w = PY_CB[m]
    return {'stem': m + endw + '号，明天是几月几号？',
            'answer': PY_MONTHS[(ni + 1) % 12] + '一号',
            'd1': m + d1w + '号',
            'd2': PY_MONTHS[(ni + 1) % 12] + '二号',
            'd3': PY_MONTHS[(ni + 2) % 12] + '一号'}


def py_rev(kind):
    return kind in ('day_rev', 'month_rev', 'day_m2', 'month_m2')


def check(name, ok, detail=''):
    RESULTS.append((name, ok, detail))
    print(('PASS' if ok else 'FAIL'), '|', name, ('| ' + str(detail) if detail else ''))
    return ok


def main():
    page_errors, http_reqs = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()                          # 独立 headless，不弹不连不杀
        ctx1 = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx1.add_init_script(MUTE_INIT)                        # r19 双保险之二：每 context 必挂
        page = ctx1.new_page()
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on('request', lambda r: http_reqs.append(r.url) if r.url.startswith('http') else None)

        # ---- 1. verify=1 自检 ----
        page.goto(URL + '?verify=1')
        title = ''
        for _ in range(120):                                   # runVerify 异步（教学链+冒烟），轮询 title
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

        # ---- 2. Python 独立封闭表对账（40 关全题；SPEC-R37 十型） ----
        levels_js = page.evaluate('Array.from({length:40}, (_, f) => { const L = genLevel(f); '
                                  'return { flat: f, dch: L.dch, quizzes: L.quizzes.map(q => ({ '
                                  'kind: q.kind, base: q.base, answer: q.answer, '
                                  'opts: q.opts.map(o => o.word) })) }; })')
        bad = []
        dch1_union, dch2_union = set(), set()
        for lv in levels_js:
            cross_n, m2c_n, rev_n = 0, 0, 0
            for k, q in enumerate(lv['quizzes']):
                if q['kind'] not in PY_KINDS:
                    bad.append((lv['flat'], k, 'kind', q['kind'])); continue
                if q['kind'] == 'cbound':                       # 月末边界行表对账（独立表）
                    if q['base'] not in PY_CB:
                        bad.append((lv['flat'], k, 'cbBase', q['base'])); continue
                    cw = py_cb_words(q['base'])
                    if q['answer'] != cw['answer']:
                        bad.append((lv['flat'], k, 'cbAns', q['base'], q['answer']))
                    words = q['opts']
                    legal = {cw['answer'], cw['d1'], cw['d2'], cw['d3']}
                    if len(words) != 4 or len(set(words)) != 4 or set(words) != legal:
                        bad.append((lv['flat'], k, 'cbWords', q['base'], words))
                    if lv['dch'] != 4:
                        bad.append((lv['flat'], k, 'cbDch', lv['dch']))
                    continue
                fam = py_fam(q['kind'])
                if q['base'] not in fam:
                    bad.append((lv['flat'], k, 'baseNotInTable', q['base']))
                exp = py_stepN(q['kind'], q['base'], py_step(q['kind']))   # 独立算 ±1/±2 环步
                if q['answer'] != exp:
                    bad.append((lv['flat'], k, 'answerNotSeq', q['kind'], q['base'], q['answer'], exp))
                words = q['opts']
                if len(words) != 4 or len(set(words)) != 4:
                    bad.append((lv['flat'], k, 'optsDup', words))
                for w in words:
                    if w not in fam:
                        bad.append((lv['flat'], k, 'optNotInTable', w))
                if words.count(q['answer']) != 1:
                    bad.append((lv['flat'], k, 'answerN', words))
                # 干扰=3 互异不含答案（恰 1 答案 + 4 互异已保；显式列干扰口径）
                dis = [w for w in words if w != q['answer']]
                if len(dis) != 3 or len(set(dis)) != 3:
                    bad.append((lv['flat'], k, 'distractors', words))
                # 近对：答案环距 1 的相邻词 ≥1 在干扰（独立推导；±2 由中转+外侧邻保证）
                ai = fam.index(q['answer'])
                near_ok = any(fam.index(w) != ai and
                              ((fam.index(w) - ai) % len(fam) == 1 or (ai - fam.index(w)) % len(fam) == 1)
                              for w in dis)
                if not near_ok:
                    bad.append((lv['flat'], k, 'nearMissing', q['answer'], dis))
                # ±2 题中转词在场（强近对=路径中转=答案往 base 方向 1 格，SPEC-R37 §R3）
                if q['kind'] in ('day_2', 'day_m2', 'month_2', 'month_m2', 'dateq'):
                    d = py_step(q['kind'])
                    mid = py_stepN(q['kind'], q['answer'], 1 if d < 0 else -1)
                    if mid not in dis:
                        bad.append((lv['flat'], k, 'midMissing', q['kind'], mid, dis))
                # dateq 锚不入干扰（self 句语义防错配）
                if q['kind'] == 'dateq' and q['base'] in words:
                    bad.append((lv['flat'], k, 'dateAnchorInOpts', q['base']))
                if lv['dch'] == 1:
                    if q['kind'] != 'day':
                        bad.append((lv['flat'], k, 'ch1kind', q['kind']))
                    if lv['flat'] < 5:
                        dch1_union.add(q['base'])
                if lv['dch'] == 2:
                    if q['kind'] not in ('month', 'month_2', 'month_m2'):
                        bad.append((lv['flat'], k, 'ch2kind', q['kind']))
                    if 5 <= lv['flat'] < 10:
                        dch2_union.add(q['base'])           # 全题并集（单步+多步）
                if lv['dch'] == 3:
                    fam_key = 'day' if q['kind'].startswith('day') else 'month'
                    is_cross = q['kind'] in ('day', 'month') and q['base'] == PY_TAIL.get(fam_key)
                    is_m2c = ((q['kind'] == 'day_m2' and q['base'] in ('星期一', '星期二')) or
                              (q['kind'] == 'month_m2' and q['base'] in ('一月', '二月')))
                    if is_cross:
                        cross_n += 1
                        if q['answer'] != PY_HEAD[fam_key]:
                            bad.append((lv['flat'], k, 'crossAnsNotHead', q['base'], q['answer']))
                    elif is_m2c:
                        m2c_n += 1
                    elif q['kind'] in ('day_rev', 'month_rev'):
                        rev_n += 1
                    else:
                        bad.append((lv['flat'], k, 'ch3bad', q['kind']))
            if lv['dch'] == 3 and not (cross_n == 1 and m2c_n == 2 and rev_n == 2):
                bad.append((lv['flat'], 'ch3spec', (cross_n, m2c_n, rev_n)))
            if lv['dch'] == 4:
                kinds4 = {q['kind'] for q in lv['quizzes']}
                n_dq = sum(1 for q in lv['quizzes'] if q['kind'] == 'dateq')
                n_cb = sum(1 for q in lv['quizzes'] if q['kind'] == 'cbound')
                if n_dq != 1 or n_cb != 1 or len(kinds4) < 4:
                    bad.append((lv['flat'], 'ch4spec', (sorted(kinds4), n_dq, n_cb)))
        check('python-side closed-table parity (40 levels x 5 quizzes)', not bad, bad[:5])
        check('ch1 five-level union covers all 7 days', dch1_union == set(PY_DAYS), sorted(dch1_union))
        check('ch2 five-level union covers all 12 months', dch2_union == set(PY_MONTHS), sorted(dch2_union))
        anchor = levels_js[0]['quizzes'][0]
        check('flat0 q0 anchor day/星期三→星期四',
              anchor['kind'] == 'day' and anchor['base'] == '星期三' and anchor['answer'] == '星期四', anchor)

        # ---- 3. CA 钩子语义（外部切关 / quiz 契约 / tapOpt 下标 + 方向句语音轨 spy） ----
        page.evaluate('CA.start(10)')
        lv = page.evaluate('() => CA.currentLevel')
        check('CA.start(10) takes effect (ch3)', lv['flat'] == 10 and lv['ch'] == 3 and lv['dch'] == 3, lv)
        qz = page.evaluate('() => CA.quiz')
        ids_ok = [o['id'] for o in qz['opts']] == ['o0', 'o1', 'o2', 'o3']
        fam10 = py_fam(qz['kind'])
        words10 = [o['word'] for o in qz['opts']]
        check('CA.quiz contract (kind/base/answer/opts id+word)',
              qz['kind'] in PY_KINDS and qz['base'] in fam10 and qz['answer'] in fam10 and
              qz['answer'] == py_stepN(qz['kind'], qz['base'], py_step(qz['kind'])) and
              len(qz['opts']) == 4 and ids_ok and len(set(words10)) == 4 and
              qz['step'] == 0 and qz['miss'] == 0, qz)
        # 近对锚断言按步长分口径：±1=base 恒在干扰（v1 律）；±2=中转词恒在干扰（SPEC-R37 §R3）
        if abs(py_step(qz['kind'])) == 1:
            near_anchor = qz['base'] in words10
            near_what = 'base'
        else:
            mid = py_stepN(qz['kind'], qz['answer'], -py_step(qz['kind']))
            near_anchor = mid in words10
            near_what = mid
        check('near-pair anchor in distractors (step-aware)', near_anchor,
              {'kind': qz['kind'], 'anchor': near_what, 'opts': words10})

        # flat<3 方向句语音轨（CA.start(0)：flat0 错点 base→self 专属句——T46 后=cal_self_d_f clip/文本）
        page.evaluate('CA.start(0)')
        q0 = page.evaluate('() => CA.quiz')
        w0 = [o['word'] for o in q0['opts']]
        i_base = w0.index(q0['base'])
        page.evaluate('i => { CA.tapOpt(i); }', i_base)        # fire-and-forget 首击
        page.wait_for_timeout(40)                              # verify 页错窗 120ms，40ms 在窗内
        rej = page.evaluate('i => CA.tapOpt(i)', i_base)       # 窗内二击（同步 false 立即返回）
        page.wait_for_timeout(1200)                            # 首击错窗走完
        st_after = page.evaluate('() => ({ miss: CA.quiz.miss, step: CA.quiz.step, k: window.__lastVoiceKey, txt: window.__lastVoiceText })')
        check('double-tap within window blocked (fire-and-forget)', rej is False, rej)
        check('tapOpt(index) semantics + dir-sentence (flat<3, self-sentence on base)',
              st_after['miss'] == 1 and st_after['step'] == 0 and
              st_after['k'] == 'cal_self_d_f' and
              st_after['txt'] == '就是今天哦，找它后面的', st_after)

        # 救援方向级 queue 链对账（T46+R37-bis 段链轨）：±1 接龙=[cal_q 引导, 词键, 骨架键] 全 clip 段链 /
        # ±1 反向=[骨架键, 词键, 骨架键] / 反向多步（day_m2/month_m2）=题面段链重读（§R6-bis 注册键）
        page.evaluate('CA.start(0)')
        q_chain = page.evaluate('() => { rescueDirVoice(); return { q: window.__lastQueue, k: window.__lastVoiceKey }; }')
        qz0 = page.evaluate('() => CA.quiz')
        check('rescue fwd chain = queue([cal_q, word-key, cal_q_day])',
              q_chain['q'] == ['cal_q', 'cal_d_2', 'cal_q_day'] and not py_rev(qz0['kind']), q_chain)
        page.evaluate('CA.start(10)')
        q_rev = page.evaluate('() => { rescueDirVoice(); return { q: window.__lastQueue, t: window.__lastVoiceText }; }')
        qz10 = page.evaluate('() => CA.quiz')
        # r37 审查 minor5：本腿 seed 耦合——flat10 首题确定性恒 rev 族；未来谱改动（rnd 消耗序变）
        # 使首题变接龙跨界时此腿假红，届时按新谱适配（腿自身非产品缺陷）
        if qz10['kind'] in ('day_rev', 'month_rev'):           # ±1 反向=题面段链重读
            wk = ('cal_d_' if qz10['kind'] == 'day_rev' else 'cal_m_') + str(py_fam(qz10['kind']).index(qz10['base']))
            rev_ok = q_rev['q'] == [('cal_q_dr1' if qz10['kind'] == 'day_rev' else 'cal_q_mr1'), wk,
                                    ('cal_q_dr2' if qz10['kind'] == 'day_rev' else 'cal_q_mr2')]
        else:                                                  # ch3 首题可为反向多步（day_m2/month_m2）=jump 题面段链（§R6-bis）
            pfx = 'cal_q_dr1' if qz10['kind'] == 'day_m2' else 'cal_q_mr1'
            sfx = 'cal_q_dm2' if qz10['kind'] == 'day_m2' else 'cal_q_mm2'
            wk = ('cal_d_' if qz10['kind'] == 'day_m2' else 'cal_m_') + str(py_fam(qz10['kind']).index(qz10['base']))
            rev_ok = q_rev['q'] == [pfx, wk, sfx]
        check('rescue rev path (chain re-say or TTS re-say by kind)', py_rev(qz10['kind']) and rev_ok, q_rev)

        # ---- 3c. 段链键构造直调（r37 审查 M1 补强）：quizKeys/confirmKeys/dirKey 纯函数对账
        # 期望链从 SPEC §R6-bis 四路键构造定稿推导硬编码（非实现镜像——r31 判别力）；
        # 覆盖十型代表+dateq dn=0/7 边界+cbound 大/小月（31|30 切换）+jump s=1/≥2 两路反馈。
        # 输入构造仅 kind/base/dn/answer（与函数签名匹配）；词键索引按 DAYS/MONTHS 封闭表。
        chain_cases = [
            ({'kind': 'day', 'base': '星期三', 'answer': '星期四'},
             ['cal_d_2', 'cal_q_day'], ['cal_d_2', 'cal_cf_fwd', 'cal_d_3']),
            ({'kind': 'month', 'base': '三月', 'answer': '四月'},
             ['cal_m_2', 'cal_q_month'], ['cal_m_2', 'cal_cf_fwd', 'cal_m_3']),
            ({'kind': 'day_rev', 'base': '星期三', 'answer': '星期二'},
             ['cal_q_dr1', 'cal_d_2', 'cal_q_dr2'], ['cal_d_2', 'cal_cf_rev', 'cal_d_1']),
            ({'kind': 'month_rev', 'base': '三月', 'answer': '二月'},
             ['cal_q_mr1', 'cal_m_2', 'cal_q_mr2'], ['cal_m_2', 'cal_cf_rev', 'cal_m_1']),
            ({'kind': 'day_2', 'base': '星期三', 'answer': '星期五'},
             ['cal_q_dr1', 'cal_d_2', 'cal_q_d2'], ['cal_d_2', 'cal_cf_d2', 'cal_d_4']),
            ({'kind': 'day_m2', 'base': '星期一', 'answer': '星期六'},
             ['cal_q_dr1', 'cal_d_0', 'cal_q_dm2'], ['cal_d_0', 'cal_cf_dm2', 'cal_d_5']),
            ({'kind': 'month_2', 'base': '三月', 'answer': '五月'},
             ['cal_q_mr1', 'cal_m_2', 'cal_q_m2'], ['cal_m_2', 'cal_cf_m2', 'cal_m_4']),
            ({'kind': 'month_m2', 'base': '一月', 'answer': '十一月'},
             ['cal_q_mr1', 'cal_m_0', 'cal_q_mm2'], ['cal_m_0', 'cal_cf_mm2', 'cal_m_10']),
            ({'kind': 'dateq', 'base': '星期六', 'dn': 0, 'answer': '星期一'},
             ['cal_num_1', 'cal_q_dq1', 'cal_d_5', 'cal_num_3', 'cal_q_dq2'],
             ['cal_num_3', 'cal_q_dq1', 'cal_d_0']),
            ({'kind': 'dateq', 'base': '星期二', 'dn': 7, 'answer': '星期四'},
             ['cal_num_8', 'cal_q_dq1', 'cal_d_1', 'cal_num_10', 'cal_q_dq2'],
             ['cal_num_10', 'cal_q_dq1', 'cal_d_3']),
            ({'kind': 'cbound', 'base': '十月', 'answer': '十一月一号'},
             ['cal_m_9', 'cal_num_31', 'cal_q_cb'], ['cal_cf_cb', 'cal_m_10', 'cal_num_1']),
            ({'kind': 'cbound', 'base': '四月', 'answer': '五月一号'},
             ['cal_m_3', 'cal_num_30', 'cal_q_cb'], ['cal_cf_cb', 'cal_m_4', 'cal_num_1']),
        ]
        dir_cases = [
            ({'kind': 'cbound', 'base': '十月'}, '十月三十二号', ['cal_m_9', 'cal_fb_cb_32']),
            ({'kind': 'cbound', 'base': '四月'}, '四月三十一号', ['cal_m_3', 'cal_fb_cb_31']),
            ({'kind': 'day_2', 'base': '星期三'}, '星期四', 'cal_fb_j_p1d'),
            ({'kind': 'day_2', 'base': '星期三'}, '星期日', 'cal_fb_j_over'),
        ]
        got = page.evaluate('(cs) => cs.map(c => [JSON.stringify(quizKeys(c[0])), JSON.stringify(confirmKeys(c[0]))])',
                            [list(c) for c in chain_cases])
        _jq = lambda a: json.dumps(a, separators=(',', ':'))   # JS JSON.stringify 无空格口径
        bad = [i for i, (g, c) in enumerate(zip(got, chain_cases))
               if g[0] != _jq(c[1]) or g[1] != _jq(c[2])]
        check('quizKeys/confirmKeys 12 cases == SPEC R6-bis chains (10 kinds+dn 0/7+cb 31|30)',
              not bad, {'badIdx': bad, 'got': [got[i] for i in bad[:2]]} if bad else None)
        gotd = page.evaluate('(cs) => cs.map(c => JSON.stringify(dirKey(c[0], c[1])))',
                             [list(c[:2]) for c in dir_cases])
        badd = [i for i, (g, c) in enumerate(zip(gotd, dir_cases)) if g != _jq(c[2])]
        check('dirKey 4 cases (cbound d1 array 31|32 / jump s=1 key / s>=2 over)',
              not badd, {'badIdx': badd, 'got': [gotd[i] for i in badd]} if badd else None)

        # ---- 4. 双 viewport 布局 + 截图非空白（序列条=主教育点一并列测）
        # 不重新 goto（段 1 已等 verify title 完成；goto 重跑 runVerify 会与 CA.start 竞态换关） ----
        for w, h, flat in [(1280, 800, 0), (800, 1180, 0), (1280, 800, 17), (800, 1180, 17)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.evaluate('CA.start(%d)' % flat)
            page.wait_for_timeout(250)
            m = page.evaluate('''() => {
              const cards = [...document.querySelectorAll('.card')].map(b => [b.offsetWidth, b.offsetHeight]);
              const sc = document.getElementById('scene');
              const cells = [...document.querySelectorAll('#seq .cell')].map(c => [c.offsetWidth, c.offsetHeight]);
              const g = document.getElementById('game');
              return { cards: cards, minWH: Math.min(...cards.flat()),
                       cells: cells.length, minCell: cells.length ? Math.min(...cells.flat()) : 0,
                       scene: [sc.offsetWidth, sc.offsetHeight],
                       ox: Math.max(g.scrollWidth - g.clientWidth,
                                    document.documentElement.scrollWidth - document.documentElement.clientWidth) };
            }''')
            exp_cells = 7 if flat == 0 else None               # flat17 混合关族随题（7/12 皆合法）
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
            cell_ok = m['cells'] in (7, 12) and m['minCell'] >= 24 and (exp_cells is None or m['cells'] == exp_cells)
            check('layout %dx%d flat%d' % (w, h, flat),
                  m['minWH'] >= 96 and m['scene'][0] >= 64 and m['scene'][1] >= 64 and
                  cell_ok and m['ox'] <= 0 and nonblank,
                  {'minCard': m['minWH'], 'cells': m['cells'], 'minCell': m['minCell'],
                   'scene': m['scene'], 'ox': m['ox'], 'pixelSd': round(sd, 1)})

        # ---- 5. 正常模式（非 verify 页）真实主流程：教学（看→帮）→ 错选方向句 → 点卡通关 → 写档 ----
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        ctx.add_init_script(MUTE_INIT)                         # r19：normal 模式同样必挂
        ctx.add_init_script(mute_seed())                       # 种档 settings 三关闭（教学链仍触发）
        pg2 = ctx.new_page()
        errs2 = []
        pg2.on('pageerror', lambda e: errs2.append(str(e)))
        pg2.goto(URL)
        # 先装 voice.say/play spy（错选方向句 TTS 断言用；原调用透传不破坏行为）
        pg2.evaluate('''() => {
          const origPlay = KIDS.voice.play.bind(KIDS.voice);
          const origSay = KIDS.voice.say.bind(KIDS.voice);
          window.__vsLog = [];
          KIDS.voice.play = function (k, t) { window.__vsLog.push(k || ('TTS:' + (t || ''))); return origPlay(k, t); };
          KIDS.voice.say = function (t) { window.__vsLog.push('TTS:' + (t || '')); return origSay(t); };
        }''')
        tut = ''
        for _ in range(40):                       # watch 链 ≈9.4s（真实 SPEED=1：900+2712+320+~5150+500）
            pg2.wait_for_timeout(500)
            tut = pg2.evaluate('CA.tutorial')
            if tut in ('help', 'solo'):
                break
        demo_r = pg2.evaluate('window.__caDemoR')
        check('normal-mode tutorial watch->help', tut == 'help' and demo_r == 'right',
              {'tut': tut, '__caDemoR': demo_r})
        # 错选一次：真实 pointer 点 base 词卡 → 方向句语音轨（flat0=±1 段链题型→cal_self_d_f clip；
        # T46 后 base 错点=self 专属句 clip 轨——SPEC-R37 §R4 播放分路口径）
        qz2 = pg2.evaluate('() => CA.quiz')
        wi = next(i for i, o in enumerate(qz2['opts']) if o['word'] == qz2['base'])
        log_len0 = pg2.evaluate('window.__vsLog.length')
        pg2.click('.card[data-i="%d"]' % wi, timeout=3000)
        pg2.wait_for_timeout(1300)                # 1000ms 防重入窗
        log1 = pg2.evaluate('window.__vsLog')
        new_seg = log1[log_len0:]
        st_after_wrong = pg2.evaluate('() => ({ miss: CA.quiz.miss, step: CA.quiz.step })')
        check('normal-mode wrong tap = self-sentence clip (cal_self_d_f)',
              any(s == 'cal_self_d_f' for s in new_seg) and
              st_after_wrong['miss'] == 1 and st_after_wrong['step'] == 0,
              {'newSeg': new_seg, 'after': st_after_wrong})
        # 真实 pointer 逐题点应选词卡（help 首点即放手 solo）
        guard = 0
        while guard < 80:
            guard += 1
            st = pg2.evaluate('() => ({ done: CA.currentLevel.done, quiz: CA.quiz })')
            if st['done'] or not st['quiz']:
                break
            idx = next((i for i, o in enumerate(st['quiz']['opts'])
                        if o['word'] == st['quiz']['answer']), None)
            if idx is None:
                break
            pg2.click('.card[data-i="%d"]' % idx, timeout=3000)
            pg2.wait_for_timeout(6200)            # 判对窗 800+estMs(≤4050)+300 + 读题（真实 SPEED=1 节拍）
        cel = False
        for _ in range(10):                       # celebrate 层存在 2.3s，轮询抓取
            cel = pg2.evaluate('!!document.querySelector(".k-celebrate")') or \
                  pg2.evaluate('CA.currentLevel.done')
            if cel:
                break
            pg2.wait_for_timeout(300)
        pg2.wait_for_timeout(3400)                # celebrate 2.3s+320 + 补窗 400 + pass 写档
        sv = pg2.evaluate('JSON.parse(localStorage.getItem("kidsgame_calendar")||"null")')
        st1 = (sv or {}).get('levels', {}).get('1-0', {})
        check('normal-mode solve & celebrate & save (2 stars: 1 wrong + 4 right)',
              cel and (sv or {}).get('v') == '1.0' and (sv or {}).get('calendar', {}).get('tutSeen')
              and st1.get('stars') == 2,
              {'celebrate_or_done': cel, 'v': (sv or {}).get('v'),
               'tutSeen': (sv or {}).get('calendar'), 'stars10': st1.get('stars')})
        check('0 pageerror (normal mode)', not errs2, errs2[:3])
        ctx.close()                               # 内存纪律：page/context 用完即关

        # ---- 离线复核：全程无 http(s) 请求（file:// 本页除外） ----
        check('offline (no http requests)', not [u for u in http_reqs if not u.startswith('file://')],
              [u for u in http_reqs if not u.startswith('file://')][:3])
        check('0 pageerror (overall)', not page_errors, page_errors[:3])
        ctx1.close()                                           # 内存纪律：context 用完即关
        browser.close()

    fails = [r for r in RESULTS if not r[1]]
    print('\n==== %d/%d PASS ====' % (len(RESULTS) - len(fails), len(RESULTS)))
    if fails:
        for n, _, d in fails:
            print('FAIL:', n, d)
        sys.exit(1)


if __name__ == '__main__':
    main()
