# -*- coding: utf-8 -*-
"""comfort r11 独立复验（SPEC-BATCH36 §6——r11 难度改造；断言从 SPEC 文字独立推导，禁抄实现）
W0 verify 页双视口（1280×800 + 800×1180 各自完整跑完 title=VERIFY PASS 14/14）+0 pageerror
W1 章约束（Python 封闭题库表 × 40 关全题驱动）：
   best2（dch≤2）恰 [best,gray] 2 卡 / grad3（dch≥3）恰 [best,gray,bad] 3 卡 /
   卡集=(label,tier) 与 SPEC 表逐张相等 / best 恒唯一 / answer=唯一 best 下标（独立推导）/
   scene 池域（dch≤2 → 0-9 / dch≥3 → 10-19）/ 静态 rotate 序=(ch-1)*5+((lv+qi)%5) /
   静态 dch=flat//5+1 / 生成 dch=mulberry32(flat*7919+757) 首随机 ri(1,4)（Python 移植复算）
W1b 覆盖（静态 20 关各情景恰现 5 次=题库域全档 / flat0 q0 锚=scene0 best2 2 卡）
W2 灰色路径（delta②）：gray 卡 wrong+miss 1+朋友 meh+#outcome[data-out=gray]+灰链
   [co_gray] 单 clip；豁免窗内 gray 二击吞 false 且 miss 不变；窗内 best 放行 'right'
W3 后果因果链三档 DOM（delta③）：best=friend.happy+outcome best+卡 .good /
   gray=meh+outcome gray（W2）/ bad=sadder+无后果气泡（renderOutcome 不触发）
W4 nextHint 章末逐点（静态 4/9/14/19 ↔ Python 硬编码章末预告表 + 左右 off-by-one 哨兵
   + 生成关 24/29/34/39 实算 + 契约 F 字面哨兵：实算≠字面撞点必须存在且 nextHint 跟实算）
W5 时长门禁（delta 前置）：genLevel 40 关独立复算——每题 max(voiceWin,DECIDE)+ADV
   ≥40000/关+逐题 DECIDE≥voiceWin（语音窗从不撑时长）+与页面 levelDurMs 逐关对账
W6 钩子契约（quiz/currentLevel 字段）+clips 10（co 7+core 3）+锚不泄答案
   （co_pick 文本与全部卡 label 无子串交集——双向）+非法下标 null+生成关 autoSolve 整关
纪律：独立 chromium.launch(--mute-audio)（禁 connect/禁杀浏览器）；驱动先等锁释放
     （verify SPEED=0.12，presentQuiz 窗 best2≈1.04s/grad3≈0.66s 真时钟）；tap 吞
     （null/false）400ms 重试（b34 坑④）。"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))
URL = 'file:///' + os.path.join(BASE, 'comfort', 'index.html').replace(chr(92), '/') + '?verify=1'

results = []
def chk(name, ok, note=''):
    results.append((name, bool(ok)))
    print('[%s] %s %s' % ('PASS' if ok else 'FAIL', name, note), flush=True)

# ---------- Python 独立封闭真值表（SPEC §6 文字逐条转译，不引用页面符号） ----------
# (情景句, [(label, tier), ...])——best2 无 bad / grad3 恰 1 bad；answer=唯一 best 下标
CO_BANK = [
    ('小熊的冰淇淋掉了，好想吃', [('递自己的', 'best'), ('抱抱它', 'gray')]),
    ('小兔摔了一跤，膝盖流血了', [('找老师帮', 'best'), ('扶它起来', 'gray')]),
    ('小猫的积木塔塌了，好想搭好', [('一起搭', 'best'), ('说没关系', 'gray')]),
    ('小狗的风筝挂树上了，够不到', [('找大人帮', 'best'), ('换样玩', 'gray')]),
    ('小羊的水杯打翻了', [('拿纸巾', 'best'), ('等水干', 'gray')]),
    ('小猴想妈妈了，眼泪汪汪', [('陪它等', 'best'), ('给块糖', 'gray')]),
    ('小熊害怕打雷声，躲起来了', [('抱抱它', 'best'), ('陪它玩', 'gray')]),
    ('小兔跑步输了，好难过', [('说没关系', 'best'), ('再跑一次', 'gray')]),
    ('小猫的小汽车不见了', [('一起找', 'best'), ('抱抱它', 'gray')]),
    ('小狗把画画坏了，想哭', [('夸它努力', 'best'), ('陪它再画', 'gray')]),
    ('小熊的冰淇淋掉了，好想吃', [('递自己的', 'best'), ('抱抱它', 'gray'), ('笑话它', 'bad')]),
    ('小猴想妈妈了，眼泪汪汪', [('陪它等', 'best'), ('给块糖', 'gray'), ('催别哭', 'bad')]),
    ('小鸡的气球飞走了', [('再送一个', 'best'), ('陪它玩', 'gray'), ('说活该', 'bad')]),
    ('小兔跑步输了，好难过', [('说没关系', 'best'), ('再跑一次', 'gray'), ('嘲笑它', 'bad')]),
    ('小猪午睡被吵醒了', [('轻声说话', 'best'), ('拍拍它', 'gray'), ('大声吵', 'bad')]),
    ('小鹿的新鞋踩脏了', [('帮它擦', 'best'), ('说没关系', 'gray'), ('踩一脚', 'bad')]),
    ('小猫的小汽车不见了', [('帮着找', 'best'), ('抱抱它', 'gray'), ('藏起来偷笑', 'bad')]),
    ('小松鼠的拼图少一块', [('一起找', 'best'), ('夸它努力', 'gray'), ('推乱拼图', 'bad')]),
    ('小熊害怕打雷声', [('抱抱它', 'best'), ('陪它玩', 'gray'), ('关灯吓它', 'bad')]),
    ('小马摔破了膝盖，流血了', [('找老师帮', 'best'), ('扶它起来', 'gray'), ('说娇气', 'bad')]),
]
# 章末预告文案（SPEC §6；hint=下一章预告——nextHint(f)=CHAPTERS[floor(f/5)+1].hint）
CH_HINTS = {4: '有时候最好的办法会变，想一想',     # f=4 → CHAPTERS[1]（预告 ch2 情境翻转）
            9: '三个做法里，哪个最有用呢',         # f=9 → CHAPTERS[2]（预告 ch3 梯度三选）
            14: '新老情景都来啦，帮朋友想到最好',   # f=14 → CHAPTERS[3]
            19: '新的难过情景来啦，继续帮朋友'}    # f=19 → CHAPTERS[4]
GEN_HINTS = ['两个做法都很好，哪个现在最好', '帮法会变，想一想哪个最合适',
             '三种做法，哪个最有用', '三个里挑最好的，帮朋友开心']
ANCHOR_TXT = '都很好，哪个现在最好'                 # co_pick（择优题面锚——不指认）
# r11 时长模型常量（SPEC §6 独立重列；estMs=n*345+600 家族定版全字符口径）
V_DECIDE = {'best2': 10000, 'grad3': 11000}
V_ADV, V_MIN, V_PICK, V_ENTER = 2940, 40000, 3252, 400


def dch_reseed(flat):
    """生成关 dch 独立复算：mulberry32 标准算法 python 移植首随机数 ri(1,4)（seed=flat*7919+757）"""
    a = (flat * 7919 + 757) & 0xFFFFFFFF
    a = (a + 0x6D2B79F5) & 0xFFFFFFFF
    t = a
    t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
    t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
    r = ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return 1 + int(r * 4)


def check_quiz(flat, k, q, dch, fails):
    """单题独立对账（期望全从 Python 表推导）；返回 None（lawful）或原因串。"""
    say, cards, scene, kind = q.get('say'), q.get('cards') or [], q.get('scene'), q.get('kind')
    ncards = 2 if dch <= 2 else 3
    if len(cards) != ncards:
        return 'f%dq%d ch%d 卡数=%d' % (flat, k, dch, len(cards))
    # 题库对账=say+卡数反查（复现句前后池同句异卡集——按卡数区分）
    rows = [r for r in CO_BANK if r[0] == say and len(r[1]) == ncards]
    if not rows:
        return 'f%dq%d 情景句不在 SPEC 题库（%d 卡域）%s' % (flat, k, ncards, say)
    got = set((c.get('label'), c.get('tier')) for c in cards)
    if got != set(rows[0][1]):
        return 'f%dq%d 卡集≠SPEC %s' % (flat, k, sorted(got))
    # kind 域（r11 题型=卡数档）+ scene 池域（择优池 0-9/梯度池 10-19）
    if kind != ('best2' if ncards == 2 else 'grad3'):
        return 'f%dq%d kind=%s' % (flat, k, kind)
    if not (0 <= scene < 20):
        return 'f%dq%d scene=%s 域外' % (flat, k, scene)
    if dch <= 2 and scene >= 10:
        return 'f%dq%d 择优池出现梯度题 scene=%s' % (flat, k, scene)
    if dch >= 3 and scene < 10:
        return 'f%dq%d 梯度池出现择优题 scene=%s' % (flat, k, scene)
    # best 唯一 + answer 独立推导（=唯一 tier==='best' 的下标）
    bests = [i for i, c in enumerate(cards) if c.get('tier') == 'best']
    if len(bests) != 1:
        return 'f%dq%d best 非唯一 %s' % (flat, k, bests)
    if q.get('answer') != bests[0]:
        return 'f%dq%d answer≠唯一best %s/%s' % (flat, k, q.get('answer'), bests[0])
    if q.get('step') != k or q.get('miss') != 0:
        return 'f%dq%d 初始态 step=%s miss=%s' % (flat, k, q.get('step'), q.get('miss'))
    return None


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--mute-audio'])

        # ---- W0 verify 页双视口：各自完整跑完 14 单元 ----
        titles = []
        for vp in [(1280, 800), (800, 1180)]:
            ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]})
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL, timeout=60000)
            t = ''
            for _ in range(240):
                t = pg.title()
                if 'VERIFY' in t and t != 'VERIFY':
                    break
                pg.wait_for_timeout(500)
            titles.append((vp, t, len(errs)))
            if vp == (1280, 800):
                vlog = pg.evaluate('window.__coVlog')
                bad_units = [k for k, u in vlog['units'].items() if not u.get('ok')]
                if bad_units:
                    print('W0 in-page FAIL units:', json.dumps(
                        {k: vlog['units'][k] for k in bad_units}, ensure_ascii=False)[:1500])
                n14 = vlog['pass'] == 14 and vlog['total'] == 14
                pg.close(); ctx.close()
            else:
                n14 = True
                pg.close(); ctx.close()
        chk('W0 verify 双视口全绿 14/14+0 pageerror',
            all('VERIFY PASS' in t and not e for _, t, e in titles) and n14,
            str([(vp, t, e) for vp, t, e in titles]))

        # ---- 主驱动上下文（1280×800）----
        ctx = b.new_context(viewport={'width': 1280, 'height': 800})
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL, timeout=60000)
        for _ in range(240):
            if 'VERIFY PASS' in pg.title():
                break
            pg.wait_for_timeout(500)

        def read_q():
            return pg.evaluate('() => CO.quiz')

        def read_lv():
            return pg.evaluate('() => CO.currentLevel ? {step: CO.currentLevel.step, done: CO.currentLevel.done, dch: CO.currentLevel.dch, won: CO.currentLevel.won, stars: CO.currentLevel.stars} : null')

        def call(expr):
            return pg.evaluate('(async () => { try { return await (%s) } catch(e){ return "ERR:" + e.message } })()' % expr)

        def tap(i):
            return call('CO.tapCard(%d)' % i)

        def wait_quiz(timeout_ms=8000):
            for _ in range(int(timeout_ms / 30)):
                q = read_q()
                if q:
                    return q
                pg.wait_for_timeout(30)
            return None

        def wait_step(k, timeout_ms=15000):
            for _ in range(int(timeout_ms / 50)):
                lv = read_lv()
                if lv and (lv['step'] > k or lv['done']):
                    return True
                pg.wait_for_timeout(50)
            return False

        def wait_unlock(timeout_ms=6000):
            for _ in range(int(timeout_ms / 30)):
                if not pg.evaluate('() => state.locked || state.demo || Date.now() < (state.showUntil || 0)'):
                    return True
                pg.wait_for_timeout(30)
            return False

        def wait_chain(timeout_ms=7000):
            for _ in range(int(timeout_ms / 100)):
                if not pg.evaluate('() => wrongChainUntil && Date.now() < wrongChainUntil'):
                    return True
                pg.wait_for_timeout(100)
            return False

        # ---- W1/W1b 全量审计：40 关 × 5 题（章约束+覆盖+驱动最优） ----
        ch_fail, drive_fail = [], []
        scene_cnt = {}
        anchor_ok = False
        seen_dch = set()
        for flat in range(40):
            pg.evaluate('(f) => { CO.start(f) }', flat)
            lv0 = read_lv()
            dch = lv0['dch']
            seen_dch.add(dch)
            if flat < 20:
                if dch != flat // 5 + 1:
                    ch_fail.append((flat, 'dch', dch, flat // 5 + 1))
            else:
                if dch != dch_reseed(flat):
                    ch_fail.append((flat, 'gen-dch', dch, dch_reseed(flat)))
            scenes = []
            for k in range(5):
                q = wait_quiz()
                if not q:
                    drive_fail.append((flat, k, 'quiz 不可读'))
                    break
                why = check_quiz(flat, k, q, dch, ch_fail)
                if why:
                    ch_fail.append(why)
                scenes.append(q['scene'])
                if flat < 20:                       # 静态 rotate 序独立复算
                    exp_scene = (flat // 5) * 5 + ((flat % 5 + k) % 5)
                    if q['scene'] != exp_scene:
                        ch_fail.append((flat, k, 'rotate', q['scene'], exp_scene))
                    scene_cnt[q['scene']] = scene_cnt.get(q['scene'], 0) + 1
                else:
                    scenes_set = set(scenes)
                    if len(scenes_set) != len(scenes):
                        ch_fail.append((flat, k, '重复情景', scenes))
                if flat == 0 and k == 0:            # 教学锚：scene0 best2 2 卡（演示题同款起步域）
                    anchor_ok = (q['scene'] == 0 and q['kind'] == 'best2' and len(q['cards']) == 2)
                best = q['answer']
                r = None
                for _ in range(20):                 # 吞（null/false）重试（b34 坑④）
                    r = tap(best)
                    if r in ('right', 'done'):
                        break
                    pg.wait_for_timeout(300)
                if r not in ('right', 'done') or not wait_step(k):
                    drive_fail.append((flat, k, '驱动未推进 r=%s' % r))
                    break
        chk('W1 章约束（tier 构成/卡集对账/best 唯一/answer 推导/kind·scene 池域/rotate/dch 复算）',
            not ch_fail, str(ch_fail[:5]))
        chk('W1 驱动 40 关全推进', not drive_fail, str(drive_fail[:4]))
        cover_ok = (len(scene_cnt) == 20 and all(v == 5 for v in scene_cnt.values()))
        chk('W1b 覆盖（静态 20 关题库 20 情景恰各现 5 次）+flat0 q0 锚 scene0·best2',
            cover_ok and anchor_ok,
            'scenes=%d 计数集=%s anchor=%s' % (len(scene_cnt), sorted(set(scene_cnt.values())), anchor_ok))
        chk('W1c 生成关 dch1-4 全现', seen_dch >= {1, 2, 3, 4}, str(sorted(seen_dch)))

        # ---- W2 灰色路径（delta②）：wrong+miss+meh+部分缓解+灰链单 clip+豁免窗 ----
        pg.evaluate('() => { CO.start(0) }')
        wait_quiz(); wait_unlock()
        q2 = read_q()
        gray_i = next((i for i, c in enumerate(q2['cards']) if c['tier'] == 'gray'), -1)
        h0 = pg.evaluate('window.__queueHist.length')
        r_g = tap(gray_i)
        wait_unlock()                              # 等灰反馈演出锁过（豁免窗仍在真时钟 3540）
        dom_g = pg.evaluate('''() => ({
            meh: friendEl.classList.contains('meh') && !friendEl.classList.contains('sad')
                 && !friendEl.classList.contains('happy'),
            out: outcomeEl.dataset.out === 'gray' && outcomeEl.classList.contains('show')
                 && !!outcomeEl.querySelector('g[data-anim="out-gray"]') })''')
        chain_g = pg.evaluate('(a) => window.__queueHist.slice(a).some(h => h.length === 1 && h[0] === "co_gray")', h0)
        rej_g = tap(gray_i)                        # 豁免窗内 gray 二击=吞 false
        miss1 = pg.evaluate('CO.quiz.miss')
        r_best = tap(q2['answer'])                 # 窗内 best 放行 → 推进
        step1 = pg.evaluate('CO.currentLevel.step')
        w2_ok = (r_g == 'wrong' and rej_g is False and miss1 == 1 and
                 r_best == 'right' and step1 == 1 and dom_g['meh'] and dom_g['out'] and chain_g)
        chk('W2 灰色路径（wrong+miss1+meh+outcome gray+灰链[co_gray]+窗内吞/放行）',
            w2_ok, str((r_g, rej_g, miss1, r_best, step1, dom_g, chain_g)))
        wait_chain(7000)                           # 等灰链豁免窗过（真时钟 3540）

        # ---- W3 后果因果链三档 DOM（delta③）：best 档+bad 档（gray 档 W2 已证） ----
        q3 = read_q()                              # W2 推进后当前题（scene1）
        pg.evaluate('(i) => { window.__pBest = CO.tapCard(i); return true; }', q3['answer'])
        pg.wait_for_timeout(250)                   # 演出中段采样（cele 窗 353ms@SPEED.12——先发不待）
        mid = pg.evaluate('''() => ({
            happy: friendEl.classList.contains('happy') && !friendEl.classList.contains('sad'),
            out: outcomeEl.dataset.out === 'best' && outcomeEl.classList.contains('show')
                 && !!outcomeEl.querySelector('g[data-anim="out-best"]'),
            good: (() => { const w = cardWrapAt(%d); return !!w && w.classList.contains('good'); })() })''' % q3['answer'])
        r_best3 = pg.evaluate('window.__pBest')    # 收 promise 终值（非末题='right'）
        # bad 档：flat10（grad3）点 bad → sadder 类驻留+无后果气泡（bad 不触发 renderOutcome）
        pg.evaluate('() => { CO.start(10) }')
        wait_quiz(); wait_unlock()
        q3b = read_q()
        bad_i = next((i for i, c in enumerate(q3b['cards']) if c['tier'] == 'bad'), -1)
        h0b = pg.evaluate('window.__queueHist.length')
        r_bad = tap(bad_i)
        wait_unlock()
        dom_bad = pg.evaluate('''() => ({
            sadder: friendEl.classList.contains('sadder'),
            noOut: !outcomeEl.classList.contains('show') && (outcomeEl.dataset.out === ''
                    || outcomeEl.dataset.out == null) })''')
        chain_b = pg.evaluate('(a) => window.__queueHist.slice(a).some(h => h.length === 2 && h[0] === "co_wrong" && h[1] === "co_hint")', h0b)
        w3_ok = (r_best3 in ('right', 'done') and mid['happy'] and mid['out'] and mid['good'] and
                 r_bad == 'wrong' and dom_bad['sadder'] and dom_bad['noOut'] and chain_b)
        chk('W3 后果链三档 DOM（best=happy+outcome best+卡good / bad=sadder+无气泡+错链[co_wrong,co_hint]）',
            w3_ok, str((r_best3, mid, r_bad, dom_bad, chain_b)))
        wait_chain(8000)                           # 等坏链豁免窗过（真时钟 5898）

        # ---- W4 nextHint 章末逐点+off-by-one 哨兵+契约 F 字面哨兵（页面实算 vs Python 期望） ----
        nh = pg.evaluate('''() => {
          const pts = {};
          for (const f of [4, 9, 14, 19]) pts['s' + f] = nextHint(f);
          for (const f of [24, 29, 34, 39]) pts['g' + f] = nextHint(f);
          const off = {};
          for (const f of [4, 9, 14, 19]) {
            const ci = Math.floor(f / 5), got = nextHint(f);
            off['s' + f] = got !== (CHAPTERS[ci] || {}).hint &&
                           (ci + 2 > 4 || got !== CHAPTERS[ci + 2].hint);
          }
          let sent = null;                          // F 字面哨兵：实算≠(ci+1)%4 撞点必须存在且跟实算
          for (let f = 24; f < 60; f++) {
            const ci = Math.floor(f / 5), real = genLevel(f + 1).dch - 1, lit = (ci + 1) % 4;
            if (ci >= 4 && real !== lit) {
              sent = { f: f, real: real, lit: lit,
                       followsReal: nextHint(f) === GEN_HINTS[real] && nextHint(f) !== GEN_HINTS[lit] };
              break;
            }
          }
          const parity = [4, 9, 14, 19, 24, 29, 34, 39].every(f => {
            const ci = Math.floor(f / 5);
            return nextHint(f) === (ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1]);
          });
          return { pts, off, sent, parity };
        }''')
        pts_ok = all(nh['pts']['s%d' % f] == CH_HINTS[f] for f in (4, 9, 14, 19)) and \
                 all(nh['pts']['g%d' % f] == GEN_HINTS[pg.evaluate('genLevel(%d).dch' % (f + 1)) - 1]
                     for f in (24, 29, 34, 39))
        off_ok = all(nh['off'].values())
        sent_ok = bool(nh['sent']) and nh['sent']['followsReal']
        chk('W4 nextHint 章末逐点（Python 表对账）+off-by-one 哨兵+F 字面哨兵',
            pts_ok and off_ok and sent_ok and nh['parity'],
            str((pts_ok, off_ok, nh['sent'], nh['parity'])))

        # ---- W5 时长门禁：genLevel 40 关 Python 独立复算+页面 levelDurMs 对账 ----
        levels = json.loads(pg.evaluate(
            'JSON.stringify(Array.from({ length: 40 }, (_, f) => {'
            ' const L = genLevel(f);'
            ' return { flat: f, d: levelDurMs(L), qs: L.quizzes.map(q => ({ k: q.kind, y: q.say })) }; }))'))
        dur_fail, dmin, voice_fail = [], None, False
        for L in levels:
            tot = 0
            for q in L['qs']:
                vw = V_ENTER + (len(q['y']) * 345 + 600) + 300 + (V_PICK if q['k'] == 'best2' else 0)
                if V_DECIDE[q['k']] < vw:
                    voice_fail = True              # 语音窗撑时长=认知步被演出挤占
                tot += max(vw, V_DECIDE[q['k']]) + V_ADV
            if tot != L['d']:
                dur_fail.append((L['flat'], tot, L['d']))   # 独立复算 vs 页面模型逐关对账
            dmin = tot if dmin is None else min(dmin, tot)
        chk('W5 时长门禁（40 关独立复算 ≥40000+语音窗从不撑时长+与页面模型逐关对账）',
            not dur_fail and not voice_fail and dmin >= V_MIN,
            'min=%d 对账失败=%s voice_fail=%s' % (dmin if dmin is not None else -1, dur_fail[:3], voice_fail))

        # ---- W6 钩子契约+clips+锚不泄+非法+autoSolve 生成关 ----
        pg.evaluate('() => { CO.start(0) }')
        wait_quiz()
        bad_idx = call('CO.tapCard(99)')            # 非法下标=null（不炸）
        contract = pg.evaluate('''() => {
          const q = CO.quiz, lv = CO.currentLevel;
          return { qFields: ['scene', 'kind', 'say', 'cards', 'answer', 'step', 'miss']
                     .every(k => Object.prototype.hasOwnProperty.call(q, k)),
                   lvFields: ['flat', 'ch', 'dch', 'lv', 'step', 'done', 'stars'].every(k => k in lv),
                   clips: Object.keys(KIDS.voice.clips).length,
                   coClips: Object.keys(KIDS.voice.clips).filter(k => k.indexOf('co_') === 0).length,
                   pickText: VOICE.pick.text, grayText: VOICE.gray.text };
        }''')
        leak_ok = all(ANCHOR_TXT.find(lb) < 0 and lb.find(ANCHOR_TXT) < 0
                      for _, cards in CO_BANK for lb, _t in cards)
        pg.evaluate('() => { CO.start(27) }')       # 生成关 autoSolve 整关
        r_auto = call('CO.autoSolve()')
        lv_auto = read_lv()
        w6_ok = (contract['qFields'] and contract['lvFields'] and bad_idx is None and
                 contract['clips'] == 10 and contract['coClips'] == 7 and leak_ok and
                 contract['pickText'] == ANCHOR_TXT and
                 contract['grayText'] == '这样有点用，还有更好的办法' and
                 isinstance(r_auto, dict) and r_auto.get('done') and r_auto.get('taps') == 5 and
                 lv_auto.get('done') and not errs)
        chk('W6 钩子契约+clips 10（co7）+锚不泄+非法 null+autoSolve 生成关整关+0 pageerror',
            w6_ok, str((bad_idx, contract, leak_ok, r_auto, errs[:2])))
        pg.close(); ctx.close()
        b.close()

    fails = [r for r in results if not r[1]]
    print('\nTOTAL %d/%d PASS' % (len(results) - len(fails), len(results)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
