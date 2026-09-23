# -*- coding: utf-8 -*-
"""
teach_observe.py — 儿童游戏教学观察（模拟 6 岁女孩，幼小衔接）
每款游戏：独立 chromium.launch_persistent_context（全新实例+临时 user-data-dir）、headless、
file:// 只读运行、不修改游戏文件。孩子的点击全部用真实坐标 mouse.click（保留 CSS
pointer-events 防重点的真实检验力），决策按人设概率。
产出：teach_obs_data.json（结构化证据）+ shots/teach_*.png 截图。
用法：python teach_observe.py [pinyin|math|pattern|all]
"""
import json
import random
import tempfile
import time
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(r'F:/claudecode/projects/active/kids-games/batch3')
SHOTS = BASE / 'shots'
OUT = BASE / 'teach_obs_data.json'
RNG = random.Random(60906)  # 固定种子，可复现
VIEW = {'width': 1024, 'height': 768}

# 注入到页面的观察器：语音调用记录 + #ghost class 变化时间轴（观察，不修改游戏逻辑）
INIT_JS = """
window.__obs = []; window.__voice = []; window.__clicks = [];
const __stamp = () => Math.round(performance.now());
window.__push = e => window.__obs.push(Object.assign({t: __stamp()}, e));
(function(){
  // voice patch：周期重挂（KIDS.init() 可能重写 play，用 __p 标记防重复包装）
  // 注意：游戏用 const 声明 KIDS，不挂 window，必须裸引用判断
  setInterval(() => {
    if (typeof KIDS !== 'undefined' && KIDS.voice && typeof KIDS.voice.play === 'function' && !KIDS.voice.play.__p) {
      const orig = KIDS.voice.play.bind(KIDS.voice);
      const wrapped = function(k, x) {
        window.__voice.push({t: __stamp(), key: k, text: String(x == null ? '' : x).slice(0, 40)});
        return orig(k, x);
      };
      wrapped.__p = 1;
      KIDS.voice.play = wrapped;
    }
  }, 100);
  // ghost observer：等 #ghost 出现再挂（init script 运行时 body 尚未解析）
  const giv = setInterval(() => {
    const g = document.getElementById('ghost');
    if (g) {
      clearInterval(giv);
      new MutationObserver(() => {
        window.__push({ev: 'ghost-class', cls: g.className,
          show: g.classList.contains('show'), pressing: g.classList.contains('pressing')});
      }).observe(g, {attributes: true, attributeFilter: ['class']});
    }
  }, 100);
})();
"""


def mk_ctx(p):
    tmp = tempfile.mkdtemp(prefix='kids-teach-')
    return p.chromium.launch_persistent_context(
        tmp, headless=True, viewport=VIEW, has_touch=True, args=['--mute-audio'])


def click_center(page, sel):
    """模拟孩子手指：真实坐标点击元素中心"""
    el = page.query_selector(sel)
    if not el:
        return None
    b = el.bounding_box()
    if not b:
        return None
    x = b['x'] + b['width'] / 2
    y = b['y'] + b['height'] / 2
    page.evaluate('c => window.__clicks.push({t: Math.round(performance.now()), x: c[0], y: c[1]})', [x, y])
    page.mouse.click(x, y)
    return [round(x), round(y)]


def react(lo=1.5, hi=4.0):
    time.sleep(RNG.uniform(lo, hi))


def shot(page, name):
    SHOTS.mkdir(exist_ok=True)
    page.screenshot(path=str(SHOTS / ('teach_' + name + '.png')))


def dump(page, data, game):
    data['obs'] = page.evaluate('() => ({obs: window.__obs, voice: window.__voice, clicks: window.__clicks})')


# ---------------- 快照（各游戏 DOM 证据） ----------------
SNAP_PY = """() => {
  const lv = PYI.currentLevel, q = PYI.quiz;
  const g = document.getElementById('ghost');
  const cars = [...document.querySelectorAll('.car')].map(el => ({
    i: el.dataset.i, cls: el.className,
    pe: getComputedStyle(el).pointerEvents, op: getComputedStyle(el).opacity}));
  let onAns = null;
  if (q) {
    const el = document.querySelector('.car[data-i="' + q.answer + '"]');
    if (el) {
      const gr = g.getBoundingClientRect(), r = el.getBoundingClientRect();
      onAns = !(gr.right < r.left || gr.left > r.right || gr.bottom < r.top || gr.top > r.bottom);
    }
  }
  return {lv: lv && {flat: lv.flat, idx: lv.idx, solved: lv.solved, retries: lv.retries},
    q: q && {answer: q.answer, items: q.items, target: q.target, type: q.type},
    tut: PYI.tutorial,
    ghost: {show: g.classList.contains('show'), pressing: g.classList.contains('pressing'), onAnswer: onAns},
    cars};
}"""

SNAP_MA = """() => {
  const lv = MATH.currentLevel, q = MATH.quiz;
  const g = document.getElementById('ghost');
  const aid = document.getElementById('aid');
  const btns = [...document.querySelectorAll('.ans')].map(el => ({
    i: el.dataset.i, txt: el.textContent, cls: el.className,
    pe: getComputedStyle(el).pointerEvents, op: getComputedStyle(el).opacity}));
  let onAid = null, onAns = null;
  const gr = g.getBoundingClientRect();
  const cb = document.getElementById('btn-count');
  if (cb) { const r = cb.getBoundingClientRect();
    onAid = !(gr.right < r.left || gr.left > r.right || gr.bottom < r.top || gr.top > r.bottom); }
  if (q) { const el = document.querySelector('.ans[data-i="' + q.answerIdx + '"]');
    if (el) { const r = el.getBoundingClientRect();
      onAns = !(gr.right < r.left || gr.left > r.right || gr.bottom < r.top || gr.top > r.bottom); } }
  return {lv: lv && {flat: lv.flat, step: lv.step, retries: lv.retries, done: lv.done},
    q: q && {text: q.text, answer: q.answer, items: q.items, answerIdx: q.answerIdx, op: q.op, a: q.a, b: q.b, wrong: q.wrong},
    tut: MATH.tutorial,
    ghost: {show: g.classList.contains('show'), pressing: g.classList.contains('pressing'), onAidBtn: onAid, onAnswer: onAns},
    aid: {open: aid.classList.contains('open'), kind: aid.classList.contains('line') ? 'line' : (aid.classList.contains('open') ? 'apple' : null),
      numline: !!aid.querySelector('svg.numline'), apples: aid.querySelectorAll('.appl').length,
      startRing: !!aid.querySelector('.nl-start')},
    btns};
}"""

SNAP_PA = """() => {
  const lv = PAT.currentLevel, q = PAT.quiz();
  const g = document.getElementById('ghost');
  const chs = [...document.querySelectorAll('.choice')].map(el => ({
    i: el.dataset.i, cls: el.className,
    pe: getComputedStyle(el).pointerEvents, op: getComputedStyle(el).opacity}));
  let onAns = null;
  if (q) { const el = document.querySelector('.choice[data-i="' + q.answerIdx + '"]');
    if (el) { const gr = g.getBoundingClientRect(), r = el.getBoundingClientRect();
      onAns = !(gr.right < r.left || gr.left > r.right || gr.bottom < r.top || gr.top > r.bottom); } }
  const leads = [...document.querySelectorAll('.seqcard.lead')].map(el => el.dataset.i);
  return {lv: lv && {flat: lv.flat, qi: lv.qi, quizCount: lv.quizCount, misses: lv.misses, won: lv.won},
    q: q && {seq: q.seq, items: q.items, answer: q.answer, missingIdx: q.missingIdx, answerIdx: q.answerIdx},
    tut: PAT.tutorial,
    ghost: {show: g.classList.contains('show'), pressing: g.classList.contains('pressing'), onAnswer: onAns},
    leadCards: leads, choices: chs};
}"""


def wait_flat(page, expr, expect, timeout=30):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            v = page.evaluate(expr)
            if v == expect:
                return round(time.time() - t0, 2)
        except Exception:
            pass
        time.sleep(0.3)
    return None


def tut_watch_phase(page, snap_expr, item_sel, mid_after, data, tag, ans_key):
    """教程『看』阶段：时间轴采样 + 中途点击被吞验证"""
    t0 = time.time()
    tl = []
    mid_done = [False]
    while time.time() - t0 < 45:
        st = page.evaluate(snap_expr)
        el = round(time.time() - t0, 2)
        tl.append({'s': el, 'tut': st['tut'], 'idx': (st['lv'] or {}).get('idx', (st['lv'] or {}).get('step', (st['lv'] or {}).get('qi'))), 'ghost': st['ghost']['show']})
        if st['tut'] == 'watch' and not mid_done[0] and el >= mid_after:
            q = st['q']
            ans = q[ans_key]
            tgt = 0 if ans != 0 else 1
            click_center(page, item_sel % tgt)
            time.sleep(0.25)
            after = page.evaluate(snap_expr)
            data['events'].append({
                'ev': 'tut_mid_click', 'game': tag, 'at_s': el, 'target_i': tgt,
                'after': {'tut': after['tut'], 'idx': (after['lv'] or {}).get('idx', (after['lv'] or {}).get('step', (after['lv'] or {}).get('qi')))},
                'correct_now': sum(1 for c in after.get('cars', after.get('btns', after.get('choices', []))) if 'correct' in c['cls'] or 'right' in c['cls'])})
            mid_done[0] = True
        if st['tut'] == 'help':
            break
        time.sleep(0.15)
    return tl


# ============================================================ pinyin
def observe_pinyin(p):
    data = {'game': 'pinyin', 'events': [], 'notes': []}
    ctx = mk_ctx(p)
    try:
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append('PAGEERROR: ' + str(e)))
        ctx.add_init_script(INIT_JS)
        page.goto((BASE / 'pinyin' / 'index.html').as_uri(), wait_until='load')
        page.wait_for_function('() => window.PYI && PYI.currentLevel')
        data['console_errors'] = errs

        # ---- Phase A 教学观察（1-0 看-帮-独）----
        tl = tut_watch_phase(page, SNAP_PY, '.car[data-i="%d"]', 0.8, data, 'pinyin', 'answer')
        data['tut_timeline'] = tl
        st = page.evaluate(SNAP_PY)
        data['tut_help_entry'] = st
        shot(page, 'py_tut_help')
        # 『帮』阶段 5s 重演示观察：ghost 常驻？
        time.sleep(6.2)
        data['tut_help_after6s'] = page.evaluate(SNAP_PY)
        # 帮阶段首次答对 → 放手（solo）
        q = page.evaluate('() => PYI.quiz')
        react()
        click_center(page, '.car[data-i="%d"]' % q['answer'])
        time.sleep(0.5)
        data['tut_solo_check'] = page.evaluate(SNAP_PY)
        shot(page, 'py_tut_solo')
        # 完成剩余题（孩子独立，1-0 形近组她大多认识）
        for _ in range(8):
            st = page.evaluate(SNAP_PY)
            if not st['lv'] or st['lv']['flat'] != 0:
                break
            q = st['q']
            if not q:
                break
            react(1.5, 3.5)
            click_center(page, '.car[data-i="%d"]' % q['answer'])
            time.sleep(1.3)
        data['t_1_0_done'] = wait_flat(page, '() => PYI.currentLevel ? PYI.currentLevel.flat : null', 1, 25)
        shot(page, 'py_after_1_0')

        # ---- Phase B 试玩 1-1（SM_EASY 形近组，人设 b/d p/q 混淆）----
        st = page.evaluate(SNAP_PY)
        data['lv_1_1_start'] = st
        for qk in range(5):
            st = page.evaluate(SNAP_PY)
            if not st['lv'] or st['lv']['flat'] != 1:
                break
            q = st['q']
            if not q:
                break
            ans = q['answer']
            # 形近干扰检测（页面内 SM_CONFUSE）
            conf = page.evaluate("""(qq) => {
                const t = qq.items[qq.answer];
                const M = (typeof SM_CONFUSE !== 'undefined') ? SM_CONFUSE : {};
                const set = new Set(M[t] || []);
                return qq.items.map((it, i) => (i !== qq.answer && set.has(it)) ? i : -1).filter(i => i >= 0);
            }""", q)
            data['events'].append({'ev': 'q', 'flat': 1, 'qi': st['lv']['idx'], 'target': q['target'], 'items': q['items'], 'answer': ans, 'confusable': conf})
            if qk == 0 and conf and RNG.random() < 0.55:
                # 人设：形近声母混淆点错
                wi = conf[0]
                react(); click_center(page, '.car[data-i="%d"]' % wi)
                time.sleep(0.55)
                wrong_inst = page.evaluate(SNAP_PY)
                time.sleep(1.0)
                wrong1 = page.evaluate(SNAP_PY)
                data['events'].append({'ev': 'wrong_confuse', 'flat': 1, 'qi': 0, 'picked': wi, 'snap_instant': wrong_inst, 'snap': wrong1})
                shot(page, 'py_1_1_wrong_confuse')
                react(); click_center(page, '.car[data-i="%d"]' % ans)
                time.sleep(1.3)
            elif qk == 1:
                # 连错 2 次 → 停 10s 观察救援
                others = [i for i in range(len(q['items'])) if i != ans]
                for j, wi in enumerate(others[:2]):
                    react(); click_center(page, '.car[data-i="%d"]' % wi)
                    time.sleep(0.55)
                    s0 = page.evaluate(SNAP_PY)
                    time.sleep(1.05)
                    s = page.evaluate(SNAP_PY)
                    data['events'].append({'ev': 'wrong_seq%d' % (j + 1), 'flat': 1, 'qi': 1, 'picked': wi, 'snap_instant': s0, 'snap': s})
                shot(page, 'py_1_1_double_wrong')
                # 防重复点实测：真实坐标点已灰项
                r_before = page.evaluate('() => PYI.currentLevel.retries')
                click_center(page, '.car[data-i="%d"]' % others[0])
                time.sleep(0.6)
                r_after = page.evaluate(SNAP_PY)
                data['events'].append({'ev': 'dead_click_greyed', 'flat': 1, 'qi': 1, 'retries_before': r_before,
                    'retries_after': r_after['lv']['retries'], 'grey_car_computed': [c for c in r_after['cars'] if c['i'] == str(others[0])][0]})
                # 停 10 秒采样救援
                rescue = []
                for k in range(10):
                    time.sleep(1.0)
                    s = page.evaluate(SNAP_PY)
                    vcount = page.evaluate('() => window.__voice.length')
                    rescue.append({'s': k + 1, 'ghost': s['ghost'], 'answer_cls': [c['cls'] for c in s['cars'] if c['i'] == str(ans)][0], 'voices': vcount})
                data['events'].append({'ev': 'rescue_watch_10s', 'flat': 1, 'qi': 1, 'samples': rescue})
                # 回正
                react(); click_center(page, '.car[data-i="%d"]' % ans)
                time.sleep(1.3)
                s = page.evaluate(SNAP_PY)
                data['events'].append({'ev': 'recover_after_rescue', 'flat': 1, 'snap': s})
            elif qk == 2:
                # 21s 停顿 → 20s 无操作语音提示
                v0 = page.evaluate('() => window.__voice.length')
                time.sleep(21.5)
                v1 = page.evaluate('() => window.__voice')
                data['events'].append({'ev': 'idle_20s_voice', 'flat': 1, 'voices_before': v0,
                    'new_voice': v1[v0:], 'snap': page.evaluate(SNAP_PY)})
                react(); click_center(page, '.car[data-i="%d"]' % ans)
                time.sleep(1.3)
            else:
                react(); click_center(page, '.car[data-i="%d"]' % ans)
                time.sleep(1.3)
        data['t_1_1_done'] = wait_flat(page, '() => PYI.currentLevel ? PYI.currentLevel.flat : null', 2, 25)

        # ---- Phase B2 试玩 2-1（单韵母）+ Phase C 注意力乱点 ----
        page.evaluate('() => startLevel(5)')
        time.sleep(0.8)
        for qk in range(4):
            st = page.evaluate(SNAP_PY)
            if not st['lv'] or st['lv']['flat'] != 5:
                break
            q = st['q']
            if not q:
                break
            ans = q['answer']
            data['events'].append({'ev': 'q', 'flat': 5, 'qi': st['lv']['idx'], 'target': q['target'], 'items': q['items'], 'answer': ans})
            react()
            idx_before = page.evaluate('() => PYI.currentLevel.idx')
            click_center(page, '.car[data-i="%d"]' % ans)
            time.sleep(0.25)  # correct 演出（900ms）进行中 → 乱点
            misc = [click_center(page, '.car[data-i="%d"]' % (0 if ans != 0 else 1)),
                    page.mouse.click(512, 120) and None,
                    click_center(page, '.car[data-i="%d"]' % (2 if ans != 2 and len(q['items']) > 2 else 1))]
            time.sleep(1.2)
            idx_after = page.evaluate(SNAP_PY)
            data['events'].append({'ev': 'chaos_during_correct', 'flat': 5, 'idx_before': idx_before,
                'idx_after': idx_after['lv']['idx'], 'advanced_by': idx_after['lv']['idx'] - idx_before, 'misc_clicks': len([m for m in misc if m is not None]) + 1})
            time.sleep(0.6)
        data['final_2_1'] = page.evaluate(SNAP_PY)
        dump(page, data, 'pinyin')
    finally:
        ctx.close()
    return data


# ============================================================ math
def observe_math(p):
    data = {'game': 'math', 'events': [], 'notes': []}
    ctx = mk_ctx(p)
    try:
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append('PAGEERROR: ' + str(e)))
        ctx.add_init_script(INIT_JS)
        page.goto((BASE / 'math' / 'index.html').as_uri(), wait_until='load')
        page.wait_for_function('() => window.MATH && MATH.currentLevel')
        data['console_errors'] = errs

        # ---- Phase A 教学观察 ----
        tl = tut_watch_phase(page, SNAP_MA, '.ans[data-i="%d"]', 1.5, data, 'math', 'answerIdx')
        data['tut_timeline'] = tl
        st = page.evaluate(SNAP_MA)
        data['tut_help_entry'] = st
        shot(page, 'ma_tut_help')
        # 帮阶段 ghost 指向『数一数』按钮？
        time.sleep(6.2)
        data['tut_help_after6s'] = page.evaluate(SNAP_MA)
        # 模拟：孩子在帮阶段先点数一数（发现工具 → ghost 收起）→ 再发呆 5.5s → 重演示？
        click_center(page, '#btn-count')
        time.sleep(0.5)
        st1 = page.evaluate(SNAP_MA)
        time.sleep(5.6)
        st2 = page.evaluate(SNAP_MA)
        data['tut_help_countbtn'] = {'after_click': st1, 'after_5_6s_idle': st2}
        shot(page, 'ma_tut_help_redemo')
        # 帮阶段首答 → solo
        q = page.evaluate('() => MATH.quiz')
        react()
        click_center(page, '.ans[data-i="%d"]' % q['answerIdx'])
        time.sleep(0.5)
        data['tut_solo_check'] = page.evaluate(SNAP_MA)
        shot(page, 'ma_tut_solo')
        for _ in range(8):
            st = page.evaluate(SNAP_MA)
            if not st['lv'] or st['lv']['flat'] != 0:
                break
            q = st['q']
            if not q:
                break
            react(1.5, 3.5)
            click_center(page, '.ans[data-i="%d"]' % q['answerIdx'])
            time.sleep(1.1)
        data['t_1_0_done'] = wait_flat(page, '() => MATH.currentLevel ? MATH.currentLevel.flat : null', 1, 25)
        shot(page, 'ma_after_1_0')

        # ---- Phase B 试玩 1-1（五以内，她熟练；安排手滑/连错/20s）----
        for qk in range(6):
            st = page.evaluate(SNAP_MA)
            if not st['lv'] or st['lv']['flat'] != 1:
                break
            q = st['q']
            if not q:
                break
            ans = q['answerIdx']
            data['events'].append({'ev': 'q', 'flat': 1, 'qi': st['lv']['step'], 'text': q['text'], 'items': q['items'], 'answerIdx': ans})
            if qk == 1:
                # 手滑点错（邻近数值按钮）→ 观察反馈：灰掉/pulse/辅助自动亮
                near = [i for i in range(len(q['items'])) if i != ans and abs(q['items'][i] - q['answer']) == 1]
                wi = near[0] if near else (0 if ans != 0 else 1)
                react(); click_center(page, '.ans[data-i="%d"]' % wi)
                time.sleep(0.45)
                s0 = page.evaluate(SNAP_MA)
                time.sleep(0.55)
                s = page.evaluate(SNAP_MA)
                data['events'].append({'ev': 'wrong_slip', 'flat': 1, 'qi': 1, 'picked': wi, 'snap_instant': s0, 'snap': s})
                shot(page, 'ma_1_1_wrong_slip')
                react(); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
            elif qk == 2:
                # 连错 2 次 → 停 10s 观察救援（辅助亮起+正确项高亮）
                others = [i for i in range(len(q['items'])) if i != ans]
                for j, wi in enumerate(others[:2]):
                    react(); click_center(page, '.ans[data-i="%d"]' % wi)
                    time.sleep(0.45)
                    s0 = page.evaluate(SNAP_MA)
                    time.sleep(0.55)
                    s = page.evaluate(SNAP_MA)
                    data['events'].append({'ev': 'wrong_seq%d' % (j + 1), 'flat': 1, 'qi': 2, 'picked': wi, 'snap_instant': s0, 'snap': s})
                shot(page, 'ma_1_1_double_wrong')
                # 防重复点实测
                r_before = page.evaluate('() => MATH.currentLevel.retries')
                click_center(page, '.ans[data-i="%d"]' % others[0])
                time.sleep(0.6)
                r_after = page.evaluate(SNAP_MA)
                data['events'].append({'ev': 'dead_click_greyed', 'flat': 1, 'retries_before': r_before,
                    'retries_after': r_after['lv']['retries'], 'grey_btn_computed': [b for b in r_after['btns'] if b['i'] == str(others[0])][0]})
                rescue = []
                for k in range(10):
                    time.sleep(1.0)
                    s = page.evaluate(SNAP_MA)
                    vcount = page.evaluate('() => window.__voice.length')
                    rescue.append({'s': k + 1, 'aid': s['aid'], 'ghost': s['ghost'], 'voices': vcount,
                        'answer_cls': [b['cls'] for b in s['btns'] if b['i'] == str(ans)][0]})
                data['events'].append({'ev': 'rescue_watch_10s', 'flat': 1, 'qi': 2, 'samples': rescue})
                react(); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
                data['events'].append({'ev': 'recover_after_rescue', 'flat': 1, 'snap': page.evaluate(SNAP_MA)})
            elif qk == 3:
                v0 = page.evaluate('() => window.__voice.length')
                time.sleep(21.5)
                v1 = page.evaluate('() => window.__voice')
                data['events'].append({'ev': 'idle_20s_voice', 'flat': 1, 'voices_before': v0, 'new_voice': v1[v0:],
                    'snap': page.evaluate(SNAP_MA)})
                react(); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
            else:
                react(); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
        data['t_1_1_done'] = wait_flat(page, '() => MATH.currentLevel ? MATH.currentLevel.flat : null', 2, 25)

        # ---- Phase B2 跳 4-1（flat=15，进位加/退位减，人设 40% 错）----
        page.evaluate('() => startLevel(15)')
        time.sleep(0.8)
        data['lv_4_1_start'] = page.evaluate(SNAP_MA)
        for qk in range(5):
            st = page.evaluate(SNAP_MA)
            if not st['lv'] or st['lv']['flat'] != 15 or st['lv']['done']:
                break
            q = st['q']
            if not q:
                break
            ans = q['answerIdx']
            data['events'].append({'ev': 'q', 'flat': 15, 'qi': st['lv']['step'], 'text': q['text'], 'op': q['op'], 'items': q['items'], 'answerIdx': ans})
            carry = (q['op'] in ('+', '++')) and (q['answer'] > 10)
            if qk == 0:
                will_wrong = True  # 首题固定连错 2 次看数轴救援
                others = [i for i in range(len(q['items'])) if i != ans]
                for j, wi in enumerate(others[:2]):
                    react(); click_center(page, '.ans[data-i="%d"]' % wi)
                    time.sleep(0.45)
                    s0 = page.evaluate(SNAP_MA)
                    time.sleep(0.55)
                    s = page.evaluate(SNAP_MA)
                    data['events'].append({'ev': 'wrong_seq%d' % (j + 1), 'flat': 15, 'qi': 0, 'picked': wi, 'snap_instant': s0, 'snap': s})
                shot(page, 'ma_4_1_double_wrong_numline')
                rescue = []
                for k in range(10):
                    time.sleep(1.0)
                    s = page.evaluate(SNAP_MA)
                    vcount = page.evaluate('() => window.__voice.length')
                    rescue.append({'s': k + 1, 'aid': s['aid'], 'answer_cls': [b['cls'] for b in s['btns'] if b['i'] == str(ans)][0], 'voices': vcount})
                data['events'].append({'ev': 'rescue_watch_10s', 'flat': 15, 'qi': 0, 'samples': rescue})
                # 回正：模拟孩子点『数一数』看数轴再答
                click_center(page, '#btn-count')
                time.sleep(1.5)
                s = page.evaluate(SNAP_MA)
                data['events'].append({'ev': 'countaid_before_recover', 'flat': 15, 'snap': s})
                react(); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
                data['events'].append({'ev': 'recover_after_rescue', 'flat': 15, 'snap': page.evaluate(SNAP_MA)})
            elif carry and RNG.random() < 0.4:
                others = [i for i in range(len(q['items'])) if i != ans]
                wi = RNG.choice(others)
                react(); click_center(page, '.ans[data-i="%d"]' % wi)
                time.sleep(0.45)
                s0 = page.evaluate(SNAP_MA)
                time.sleep(0.55)
                s = page.evaluate(SNAP_MA)
                data['events'].append({'ev': 'wrong_carry_40pct', 'flat': 15, 'qi': st['lv']['step'], 'text': q['text'], 'picked': q['items'][wi], 'snap_instant': s0, 'snap': s})
                shot(page, 'ma_4_1_wrong_carry')
                react(2.0, 4.5); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
            else:
                react(); click_center(page, '.ans[data-i="%d"]' % ans)
                time.sleep(1.1)
            # Phase C 注意力乱点：某次答对演出中乱点
            if qk == 2:
                idx_before = page.evaluate('() => MATH.currentLevel.step')
                time.sleep(0.05)
                click_center(page, '.ans[data-i="%d"]' % (0 if ans != 0 else 1))
                page.mouse.click(512, 120)
                time.sleep(0.4)
                click_center(page, '.ans[data-i="%d"]' % (2 if ans != 2 else 1))
                idx_after = page.evaluate('() => MATH.currentLevel.step')
                data['events'].append({'ev': 'chaos_during_correct', 'flat': 15, 'step_before': idx_before, 'step_after': idx_after})
        data['final_4_1'] = page.evaluate(SNAP_MA)
        dump(page, data, 'math')
    finally:
        ctx.close()
    return data


# ============================================================ pattern
def observe_pattern(p):
    data = {'game': 'pattern', 'events': [], 'notes': []}
    ctx = mk_ctx(p)
    try:
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append('PAGEERROR: ' + str(e)))
        ctx.add_init_script(INIT_JS)
        page.goto((BASE / 'pattern' / 'index.html').as_uri(), wait_until='load')
        page.wait_for_function('() => window.PAT && PAT.currentLevel')
        data['console_errors'] = errs

        # ---- Phase A 教学观察 ----
        tl = tut_watch_phase(page, SNAP_PA, '.choice[data-i="%d"]', 1.0, data, 'pattern', 'answerIdx')
        data['tut_timeline'] = tl
        st = page.evaluate(SNAP_PA)
        data['tut_help_entry'] = st
        shot(page, 'pa_tut_help')
        time.sleep(6.2)
        data['tut_help_after6s'] = page.evaluate(SNAP_PA)
        # 帮阶段首答 → solo
        q = page.evaluate('() => PAT.quiz()')
        react()
        click_center(page, '.choice[data-i="%d"]' % q['answerIdx'])
        time.sleep(2.6)
        data['tut_solo_check'] = page.evaluate(SNAP_PA)
        shot(page, 'pa_tut_solo')
        for _ in range(8):
            st = page.evaluate(SNAP_PA)
            if not st['lv'] or st['lv']['flat'] != 0:
                break
            q = st['q']
            if not q:
                break
            react(1.5, 3.5)
            click_center(page, '.choice[data-i="%d"]' % q['answerIdx'])
            time.sleep(2.4)
        data['t_1_0_done'] = wait_flat(page, '() => PAT.currentLevel ? PAT.currentLevel.flat : null', 1, 25)
        shot(page, 'pa_after_1_0')

        # ---- Phase B 试玩 1-1（AB/ABB 简单规律她会；手滑一次 + 乱点检查 + 20s）----
        for qk in range(6):
            st = page.evaluate(SNAP_PA)
            if not st['lv'] or st['lv']['flat'] != 1:
                break
            q = st['q']
            if not q:
                break
            ans = q['answerIdx']
            data['events'].append({'ev': 'q', 'flat': 1, 'qi': st['lv']['qi'], 'seq': q['seq'], 'items': q['items'], 'answerIdx': ans})
            if qk == 0:
                # Phase C：答对演出（翻开+回放 ~2s）中乱点
                react()
                qi_before = page.evaluate('() => PAT.currentLevel.qi')
                click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(0.5)
                click_center(page, '.choice[data-i="%d"]' % (0 if ans != 0 else 1))
                page.mouse.click(512, 120)
                time.sleep(0.5)
                click_center(page, '.choice[data-i="%d"]' % (2 if ans != 2 else 1))
                time.sleep(2.2)
                s = page.evaluate(SNAP_PA)
                data['events'].append({'ev': 'chaos_during_correct', 'flat': 1, 'qi_before': qi_before,
                    'qi_after': s['lv']['qi'], 'advanced_by': s['lv']['qi'] - qi_before, 'snap': s})
            elif qk == 1:
                wi = 0 if ans != 0 else 1
                react(); click_center(page, '.choice[data-i="%d"]' % wi)
                time.sleep(0.55)
                s0 = page.evaluate(SNAP_PA)
                time.sleep(1.25)
                s = page.evaluate(SNAP_PA)
                data['events'].append({'ev': 'wrong_once', 'flat': 1, 'qi': 1, 'picked': wi, 'snap_instant': s0, 'snap': s})
                shot(page, 'pa_1_1_wrong_once')
                react(); click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(2.4)
            elif qk == 2:
                v0 = page.evaluate('() => window.__voice.length')
                time.sleep(21.5)
                v1 = page.evaluate('() => window.__voice')
                data['events'].append({'ev': 'idle_20s_voice', 'flat': 1, 'voices_before': v0, 'new_voice': v1[v0:],
                    'snap': page.evaluate(SNAP_PA)})
                react(); click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(2.4)
            else:
                react(); click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(2.4)
        data['t_1_1_done'] = wait_flat(page, '() => PAT.currentLevel ? PAT.currentLevel.flat : null', 2, 25)

        # ---- Phase B2 双维度关（人设：只注意一个维度）----
        dual_flat = page.evaluate("""() => {
          for (let f = 5; f <= 20; f++) {
            const L = makeLevel(f);
            if (L.quizzes.some(q => q.rule.kind === 'dual')) return f;
          }
          return null;
        }""")
        data['dual_flat'] = dual_flat
        page.evaluate('f => startLevel(f)', dual_flat)
        time.sleep(0.8)
        data['dual_start'] = page.evaluate(SNAP_PA)
        for qk in range(4):
            st = page.evaluate(SNAP_PA)
            if not st['lv'] or st['lv']['flat'] != dual_flat or st['lv']['won']:
                break
            q = st['q']
            if not q:
                break
            ans = q['answerIdx']
            a = q['answer']
            data['events'].append({'ev': 'q', 'flat': dual_flat, 'qi': st['lv']['qi'], 'seq': q['seq'], 'items': q['items'], 'answer': a, 'answerIdx': ans})
            # 单维度干扰：形状同色异 / 颜色同形异
            one_dim = []
            for i, it in enumerate(q['items']):
                if i == ans or not it:
                    continue
                if it.get('shape') == a.get('shape') or it.get('color') == a.get('color'):
                    one_dim.append(i)
            if qk == 0 and one_dim:
                # 人设：双维度只注意到一个维度 → 连错（第二次若还有单维度项继续点）
                picks = one_dim[:2] if len(one_dim) >= 2 else (one_dim + [i for i in range(len(q['items'])) if i != ans and i not in one_dim])[:2]
                for j, wi in enumerate(picks):
                    react(); click_center(page, '.choice[data-i="%d"]' % wi)
                    time.sleep(0.55)
                    s0 = page.evaluate(SNAP_PA)
                    time.sleep(1.35)
                    s = page.evaluate(SNAP_PA)
                    data['events'].append({'ev': 'wrong_onedim_seq%d' % (j + 1), 'flat': dual_flat, 'qi': 0, 'picked': wi, 'picked_item': q['items'][wi], 'snap_instant': s0, 'snap': s})
                shot(page, 'pa_dual_double_wrong_ghost')
                rescue = []
                for k in range(10):
                    time.sleep(1.0)
                    s = page.evaluate(SNAP_PA)
                    vcount = page.evaluate('() => window.__voice.length')
                    rescue.append({'s': k + 1, 'ghost': s['ghost'], 'voices': vcount,
                        'answer_cls': [c['cls'] for c in s['choices'] if c['i'] == str(ans)][0]})
                data['events'].append({'ev': 'rescue_watch_10s', 'flat': dual_flat, 'qi': 0, 'samples': rescue})
                # 防重复点实测（已灰项）
                m_before = page.evaluate('() => PAT.currentLevel.misses')
                click_center(page, '.choice[data-i="%d"]' % picks[0])
                time.sleep(0.6)
                s = page.evaluate(SNAP_PA)
                data['events'].append({'ev': 'dead_click_greyed', 'flat': dual_flat, 'misses_before': m_before,
                    'misses_after': s['lv']['misses'], 'grey_choice_computed': [c for c in s['choices'] if c['i'] == str(picks[0])][0]})
                react(); click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(2.4)
                data['events'].append({'ev': 'recover_after_rescue', 'flat': dual_flat, 'snap': page.evaluate(SNAP_PA)})
            elif one_dim and RNG.random() < 0.6:
                wi = RNG.choice(one_dim)
                react(); click_center(page, '.choice[data-i="%d"]' % wi)
                time.sleep(0.55)
                s0 = page.evaluate(SNAP_PA)
                time.sleep(1.35)
                s = page.evaluate(SNAP_PA)
                data['events'].append({'ev': 'wrong_onedim_60pct', 'flat': dual_flat, 'qi': st['lv']['qi'], 'picked': wi, 'picked_item': q['items'][wi], 'snap_instant': s0, 'snap': s})
                react(2.0, 4.5); click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(2.4)
            else:
                react(); click_center(page, '.choice[data-i="%d"]' % ans)
                time.sleep(2.4)
        data['final_dual'] = page.evaluate(SNAP_PA)
        dump(page, data, 'pattern')
    finally:
        ctx.close()
    return data


def main(which):
    results = {}
    with sync_playwright() as p:
        runners = {'pinyin': observe_pinyin, 'math': observe_math, 'pattern': observe_pattern}
        for g in which:
            print('[RUN]', g, flush=True)
            t0 = time.time()
            try:
                results[g] = runners[g](p)
                print('[OK ]', g, 'in', round(time.time() - t0, 1), 's; events =', len(results[g].get('events', [])), flush=True)
            except Exception:
                results[g] = {'game': g, 'fatal': traceback.format_exc()}
                print('[ERR]', g, flush=True)
                print(results[g]['fatal'], flush=True)
    old = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding='utf-8'))
        except Exception:
            old = {}
    old.update(results)
    OUT.write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding='utf-8')
    print('[DONE] data ->', OUT)


if __name__ == '__main__':
    import sys
    args = [a for a in sys.argv[1:] if a in ('pinyin', 'math', 'pattern', 'all')]
    if not args or 'all' in args:
        args = ['pinyin', 'math', 'pattern']
    main(args)
