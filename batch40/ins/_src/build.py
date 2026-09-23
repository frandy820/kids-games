# -*- coding: utf-8 -*-
"""ins 昆虫还是蜘蛛 单文件拼接：_src/game-head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch40/ins/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力（b37 R4：三款 build 断言对称）。
b39/b40 定版：首错锁断言一律总窗口径（常量×SPEED+尾窗常数全算，禁只断常量——
b38 R1 major 教训）。b38 坑①：题表写完先 python 独立验算分布律。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch40/ins/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'game-head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（ins_ 15 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('ins') 全量返回（manifest games 已含 ins 的
# core_* 3 条自动带上）——本脚本不写任何手工 core 补注入循环，
# 并以计数断言防双注入（若日后需补注入必须幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('ins')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r26 SPEC-R26 §R8 子集式）：必备 20 条（ins 17+core 3）精确在册
# +总数 ≥20（主线注册 8 新键后 28 亦过，防注册前后断言漂移——r24 范式）
INS_KEYS = ['ins_tut_watch', 'ins_tut_turn', 'ins_hint', 'ins_right', 'ins_wrong',
            'ins_a_ant', 'ins_a_butterfly', 'ins_a_bee', 'ins_a_ladybird',
            'ins_a_spider', 'ins_a_wolfspider', 'ins_a_jumpspider', 'ins_a_scorpion',
            'ins_sci_insect', 'ins_sci_spider', 'ins_t_judge', 'ins_t_legs']
# r26 新 8 键（SPEC-R26 §R10——上报主线 gen_clips 中央登记，禁自注册）：
# 注册前不在册（链静默不崩），注册后须 8 条全在（防部分注册静默残缺）
INS_KEYS4 = ['ins_a_snail', 'ins_a_centipede', 'ins_t_judge3', 'ins_t_legs3',
             'ins_t_bodyseg', 'ins_t_mix6', 'ins_t_mix8', 'ins_sci_none']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in INS_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n4 = sum(1 for k in INS_KEYS4 if '"%s"' % k in clips)
assert n4 in (0, 8), 'r26 新键在册 %d 条（须 0=注册前 或 8=全量注册，禁部分注册）' % n4
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 20, 'clips 条数 %d < 20（ins 17+core 3 必备子集）' % n_clips
assert n_clips == 20 + n4, 'clips 条数 %d != %d（20 必备+%d 新键——禁夹带其他键）' % (n_clips, 20 + n4, n4)
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 ins_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('ins_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 ins_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('ins_') or k in CORE_KEYS)))

# ===== b38 坑①：题表分布律 python 独立验算（SPEC §1 数学先验——写完先验再交付）=====
# r26（SPEC-R26 §R3）：封闭表扩 10 键（+snail 0/centipede 20）+SEGS 分段表
# +dch4 谱/诚实池独立镜像——题表 ROWS 分布律原样（dch1-3 取材域零变化）
LEGS = {'ant': 6, 'butterfly': 6, 'bee': 6, 'ladybird': 6,
        'spider': 8, 'wolfspider': 8, 'jumpspider': 8, 'scorpion': 8,
        'snail': 0, 'centipede': 20}
SEGS = {'ant': 3, 'butterfly': 3, 'bee': 3, 'ladybird': 3,
        'spider': 2, 'wolfspider': 2, 'jumpspider': 2, 'scorpion': 2,
        'snail': 0, 'centipede': 15}
BODY_POOL = ['ant', 'bee', 'spider', 'wolfspider', 'jumpspider', 'centipede']
DCH4_KINDS = ['judge3', 'legs3', 'bodyseg', 'judge3', 'mixfind']
ROWS = [('judge', 'ant'), ('judge', 'butterfly'), ('judge', 'spider'), ('judge', 'bee'), ('judge', 'wolfspider'),
        ('judge', 'jumpspider'), ('judge', 'ladybird'), ('judge', 'scorpion'), ('judge', 'butterfly'), ('judge', 'spider'),
        ('legs', 'bee'), ('legs', 'wolfspider'), ('legs', 'ladybird'), ('legs', 'ant'), ('legs', 'scorpion'),
        ('legs', 'jumpspider'), ('judge', 'spider'), ('legs', 'butterfly'), ('legs', 'bee'), ('judge', 'ant')]
assert len(ROWS) == 20
bug = lambda a: LEGS[a] == 6
for lo, kind_want, n_bug, n_sp in [(0, 'judge', 3, 2), (1, 'judge', None, None), (2, 'legs', 3, 2)]:
    pool = ROWS[lo * 5:lo * 5 + 5]
    assert all(r[0] == kind_want for r in pool), '章池 %d kind 分布违约' % (lo + 1)
    if n_bug is not None:
        assert sum(1 for r in pool if bug(r[1])) == n_bug and sum(1 for r in pool if not bug(r[1])) == n_sp, \
            '章池 %d 昆虫/蜘蛛分布违约' % (lo + 1)
p2 = ROWS[5:10]   # ch2 judge：蜘蛛 3+昆虫 2
assert sum(1 for r in p2 if not bug(r[1])) == 3 and sum(1 for r in p2 if bug(r[1])) == 2, 'ch2 蜘蛛3+昆虫2 违约'
p4 = ROWS[15:20]  # ch4 混合：legs 3+judge 2
assert sum(1 for r in p4 if r[0] == 'legs') == 3 and sum(1 for r in p4 if r[0] == 'judge') == 2, 'ch4 legs3+judge2 违约'
for lo in range(4):   # 每章池 5 行 anim 互异（同关取池天然互异）
    assert len(set(a for _, a in ROWS[lo * 5:lo * 5 + 5])) == 5, '章池 %d anim 互异违约' % (lo + 1)
assert set(a for _, a in ROWS) == {a for a in LEGS if a not in ('snail', 'centipede')}, '8 核心动物未全覆盖'
# LEGS 推导律（6→昆虫 4 只/8→蛛形纲 4 只/其余→都不是 2 只——r26 三向）
assert sum(1 for v in LEGS.values() if v == 6) == 4 and sum(1 for v in LEGS.values() if v == 8) == 4
assert sum(1 for v in LEGS.values() if v not in (6, 8)) == 2, '干扰动物须恰 2 只（snail 0/centipede 20）'
# SEGS 推导律（3→三段 4 只/2→两段 4 只/≥4→很多段 1 只/0 惰性 1 只）
assert sum(1 for v in SEGS.values() if v == 3) == 4 and sum(1 for v in SEGS.values() if v == 2) == 4
assert sum(1 for v in SEGS.values() if v >= 4) == 1 and SEGS['centipede'] == 15
# bodyseg 诚实池域：⊆LEGS 全键集+三分支全档成立（3/2/≥4 各≥1 只）
assert set(BODY_POOL) <= set(LEGS)
assert any(SEGS[a] == 3 for a in BODY_POOL) and any(SEGS[a] == 2 for a in BODY_POOL) and any(SEGS[a] >= 4 for a in BODY_POOL), \
    'BODY_POOL 三分支（three/two/many）须全档成立'
# 类目一致性引理（mixfind 双条件逻辑相容）：表内 LEGS==6 ⟺ 昆虫/==8 ⟺ 蛛形纲
# （腿数唯一决定类目，无例外——「六条腿的昆虫」恒=6 腿候选，封闭表内恒一）
assert all((v == 6) == (k in ('ant', 'butterfly', 'bee', 'ladybird')) for k, v in LEGS.items())
# dch4 谱形状：5 位、4 形态全在场（judge3×2+legs3+bodyseg+mixfind）
assert len(DCH4_KINDS) == 5 and set(DCH4_KINDS) == {'judge3', 'legs3', 'bodyseg', 'mixfind'}
assert DCH4_KINDS.count('judge3') == 2

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'ins'" in main, 'main 缺 KIDS.init ins（存档键 kidsgame_ins）'
assert 'window.INS =' in main, 'main 缺 INS 钩子'
assert '__insDemoR' in main, 'main 缺教学演示实证 __insDemoR'
assert '__insTutSolo' in main, 'main 缺教学帮→独实证 __insTutSolo'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH40 §0：seeded mulberry32(flat*7919+887)——本款常量 887）
assert 'flat * 7919 + 887' in engine, 'engine 缺本款常量 seed 887（SPEC §0）'
# SPEC §1 LEGS 封闭表逐字（推导律即真值——verify 独立对账依据；r26 扩 10 键）
assert "const LEGS = { ant: 6, butterfly: 6, bee: 6, ladybird: 6," in engine
assert "spider: 8, wolfspider: 8, jumpspider: 8, scorpion: 8," in engine
assert "snail: 0, centipede: 20 };" in engine, 'engine 缺 r26 干扰动物入 LEGS 表（SPEC-R26 §R3）'
# r26 结构锚（SPEC-R26 §R3/§R4/§R6）：封闭表扩展+谱+基线分流锚
assert "const SEGS = { ant: 3, butterfly: 3, bee: 3, ladybird: 3," in engine, 'engine 缺 SEGS 分段表（维度②推导律）'
assert "snail: 0, centipede: 15 };" in engine, 'engine 缺 SEGS 表尾（centipede=15 很多段）'
assert "const BODY_POOL = ['ant', 'bee', 'spider', 'wolfspider', 'jumpspider', 'centipede'];" in engine, \
    'engine 缺 bodyseg 视觉诚实池（SPEC-R26 §R3）'
assert "const DCH4_KINDS = ['judge3', 'legs3', 'bodyseg', 'judge3', 'mixfind'];" in engine, \
    'engine 缺 dch4 固定谱（SPEC-R26 §R2）'
assert 'if (dch === 4) return buildQuiz4(rowIdx, qi, rnd);' in engine, \
    'engine 缺 dch4 分流锚（基线双证据①：dch4 取数先于旧 shuffled 消耗——SPEC-R26 §R6）'
assert 'const picks = shuffled(PICKS_OF(row.kind), rnd);' in engine, 'engine 旧分支两选消耗原样锚（基线）'
assert "const PICKS3_OF = { judge3: ['insect', 'spider', 'none']," in engine, 'engine 缺三选候选集'
assert "EXTRA_ANIMALS = ['snail', 'centipede'];" in engine, 'engine 缺干扰动物池声明'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(trayEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.ins.tutSeen）
assert 'sv.ins && sv.ins.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=6638）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 6638' in data, 'data 缺错链豁免窗常量 6638（SPEC §1）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip；b36 m3：教学迷你关 flat=-1
# 每错必播——条件写 cur.flat < 3 恒定字面）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J b36 m3 教训）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：题面=拼接链（动物名 clip+尾段 ins_t_ clip——T46 阶段2 全 clip）；确认链=ins_right 单 clip；
# 错链=[wrong, sci] 全 clip；科普句按动物类取（知识红线：蛛形纲=「它不是昆虫」句式）
# r26（SPEC-R26 §R4）：mixfind 题面/重播=单段链（防泄主角名）；mixfind 确认链=right+名音两段
assert "['ins_a_' + q.anim, 'ins_t_' + q.kind]" in main, \
    'main 缺题面全 clip 双段链（T46 阶段2 ins_t_ 尾段键）'
assert "['ins_t_mix' + q.cond]" in main, 'main 缺 mixfind 题面单段链（r26 防泄主角名）'
assert 'KIDS.voice.queue([VOICE.right.key])' in main, 'main 缺确认链 right 单 clip（SPEC §1）'
assert "[VOICE.right.key, 'ins_a_' + q.anim]" in main, 'main 缺 mixfind 确认链尾名音（r26 末步名音先例）'
assert 'sciKeyOf(q.anim)' in main, 'main 缺错链科普句按动物类取（SPEC §1 知识红线）'
assert "sciKeyOf(q.anim) === 'sciNone'" in main, 'main 缺干扰动物错链 WIN4 分流（r26 SPEC-R26 §R4）'
# r26 主逻辑结构锚：撤腿可数锚+救援分层+MIX_WIN+VERIFY 驱动
assert "classList.toggle('leg-hide', q.kind === 'legs3')" in main, 'main 缺 legs3 叶挡腿锚（r26 撤视锚）'
assert "q.kind === 'legs3') animalEl.classList.remove('leg-hide')" in main, 'main 缺 30s 答案级掀叶（r26 分层救援）'
assert 'const winR = q.kind === \'mixfind\' ? MIX_WIN : PICK_WIN;' in main, 'main 缺 mixfind 确认窗分流（MIX_WIN）'
assert 'function rescueCore()' in main, 'main 缺救援核心体抽取（rescueCore——r26 verify 直驱依据）'
assert '_rescueCore()' in main and '_idleHack(ms)' in main, 'main 缺 VERIFY 页救援驱动（⑭ 单元依据）'
assert 'SAY_T4[q.kind] || SAY_T[q.kind]' in main, 'main 缺 dch4 尾段文本分流（题面窗家族 T）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §1 演出时序常量：出场 400/选对窗 2964/摇头锁 1100/教学延窗
for frag in ('const ENTER_MS = 400', 'const PICK_WIN = 2964',
             'const SHAKE_MS = 1100',
             'const TUT_WATCH_WAIT = 3400', 'const TUT_TURN_WAIT = 2200'):
    assert frag in data, 'data 缺 SPEC §1 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapPick 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapPick 演出期 null）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH40 §1 实长表）=====
est_ms = lambda n: n * 345 + 600
INS_WATCH, INS_TURN = 3072, 1824                  # ins_tut_watch / ins_tut_turn 实长
INS_RIGHT, INS_WRONG = 2664, 1944                 # 实长（SPEC §1 实长表）
SCI_MAX = 3744                                    # 科普句实长 max=sci_insect（SPEC 括注 sci_spider 为笔误，实测 3504）
TAIL_J, TAIL_L = '呀，它是昆虫还是蜘蛛？', '的腿有几条呀？数一数'   # 题面尾段（11/10 字符）
# ① 选对窗（按钮闪亮+确认链）：PICK_WIN 2964 == right 2664+300 精确（家族 H）
assert 2964 == INS_RIGHT + 300, '选对窗 2964 != right %d+300' % INS_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链实算=wrong 1944+150+sci max 3744+300=6138；
#    SPEC §1/任务书写 6638 为加法笔误（实算 6138，姊妹款 cbx 6834/brk 3330 均对）——
#    窗取 SPEC 字面值 6638：满足「窗 ≥ 错链下界」（6638 ≥ 6138，余 500ms 更稳）
#    且与主会话 gate/verify_batch40 口径对齐；断言用 ≥ 下界语义（禁 == 两头不能同时成立）
assert 6638 >= INS_WRONG + 150 + SCI_MAX + 300, '链豁免窗 6638 < 错链下界 %d+150+%d+300=%d' % (INS_WRONG, SCI_MAX, INS_WRONG + 150 + SCI_MAX + 300)
# ③ 首错演出锁（b37 R3+b39/b40 定版总窗口径）：SHAKE_MS 1100×SPEED(实页=1)+尾窗 140=1240
#    ≤ wrong 1944+150=2094（禁覆盖豁免窗——留对选放行活跃段；禁只断常量——b38 R1 major）
assert 1100 * 1 + 140 <= INS_WRONG + 150, '首错演出锁总窗 %d > %d（b37 R3+b39 总窗口径）' % (1100 + 140, INS_WRONG + 150)
# ④ 题面窗（家族 T 动态）：ENTER 400+名 clip 实长 max 1440+150+estMs(judge 尾 11 字) 4395+300=6685
#    r26（SPEC-R26 §R9 回填后）：dch4 具名题窗=ENTER+名实长（snail/centipede 实测 1344/1248）+150+
#    estMs(SAY_T4 尾——judge3 17 字 6465) +300 max 8815；mixfind=ENTER+estMs(mix 尾 11 字)+300
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(11) == 4395 and est_ms(10) == 4050, 'estMs 静态验算失败'
assert 'NAME_DUR[q.anim] + 150 + estMs(SAY_T4[q.kind] || SAY_T[q.kind]) + 300' in main, \
    'main 缺题面窗动态公式（家族 T+r26 dch4 尾段分流）'
assert 'ENTER_MS + estMs(MIX_SAY[q.cond]) + 300' in main, 'main 缺 mixfind 题面窗公式（r26 单段链）'
# 题面尾段双录（SPEC §1 拼接链尾段——句表实现定）
for kv in ("judge: '呀，它是昆虫还是蜘蛛？'", "legs: '的腿有几条呀？数一数'"):
    assert kv in data, 'data 缺题面尾段 %s（SPEC §1 句表）' % kv
assert len(TAIL_J) == 11 and len(TAIL_L) == 10
# r26 dch4 尾段双录（SPEC-R26 §R4——SAY_T4+MIX_SAY；字数=estMs 预算锚）
TAIL_J3, TAIL_L3, TAIL_B, TAIL_M6, TAIL_M8 = \
    '呀，它是昆虫、蜘蛛，还是都不是呀？', '的腿有几条呀？想一想', '的身体分几段呀？数一数', \
    '找一找呀，六条腿的昆虫', '找一找呀，八条腿的蜘蛛'
for kv, n in (("judge3: '" + TAIL_J3 + "'", 17), ("legs3: '" + TAIL_L3 + "'", 10),
              ("bodyseg: '" + TAIL_B + "'", 11)):
    assert kv in data, 'data 缺 r26 尾段 %s（SPEC-R26 §R4 句表）' % kv
for kv in ('6: \'' + TAIL_M6 + '\'', '8: \'' + TAIL_M8 + '\''):
    assert kv in data, 'data 缺 mixfind 尾段 %s（SPEC-R26 §R4）' % kv
assert len(TAIL_J3) == 17 and len(TAIL_L3) == 10 and len(TAIL_B) == 11
assert len(TAIL_M6) == 11 and len(TAIL_M8) == 11
assert est_ms(17) == 6465, 'judge3 尾 estMs 静态验算失败'
# r26 科普句新键文案双录（注册后以实长回填——回填锚：4344=mutagen 实测）
SCI_NONE = '蜗牛和蜈蚣呀，不是昆虫也不是蜘蛛'
assert "sciNone:   { key: 'ins_sci_none',    text: '" + SCI_NONE + "' }" in data, \
    'data 缺 sciNone 科普句文案（r26 知识红线三向）'
assert len(SCI_NONE) == 16 and est_ms(16) == 6120, 'sci_none estMs 静态验算失败（文案长度锚——回填后窗用实长不用 estMs）'
# ⑧ r26 干扰动物错链窗（SPEC-R26 §R9 回填后口径）：SCI_NONE_DUR=4344（clip 实测，
#    原 estMs 占位 6120 已收严）；WIN4=1944+150+4344+300=6738（宁宽勿掐——dch1-3 窗 6638 不动）
assert 'const SCI_NONE_DUR = 4344;' in data, 'data 缺 SCI_NONE_DUR 实测常量 4344（r26 回填锚——占位 6120 已收严）'
assert 'const WRONG_CHAIN_WIN4 = 1944 + 150 + SCI_NONE_DUR + 300;' in data, 'data 缺 WIN4 推导式（r26）'
assert 1944 + 150 + 4344 + 300 == 6738 and 6738 >= INS_WRONG + 150 + 4344 + 300, \
    'WIN4 6738 < 干扰动物错链 clip 实长下界'
# ⑨ r26 mixfind 确认链窗（SPEC-R26 §R9 实测口径）：right 2664+150+名 clip 实长 max
#    1440（ladybird，_clipdur40——契合动物恒核心 8 种，无占位）+300=4554
assert 'const MIX_WIN = 2664 + 150 + 1440 + 300;' in data, 'data 缺 MIX_WIN 实测口径常量（r26）'
assert 2664 + 150 + 1440 + 300 == 4554, 'MIX_WIN 静态验算失败'
# 名 clip 实长表双录（_clipdur40.json——题面窗依据；r26 snail/centipede 实测
# 回填 1344/1248——原占位 1500 已收严，mutagen 口径）
for kv in ('ant: 1344', 'bee: 1368', 'butterfly: 1416', 'jumpspider: 1416',
           'ladybird: 1440', 'scorpion: 1416', 'spider: 1344', 'wolfspider: 1368',
           'snail: 1344, centipede: 1248'):
    assert kv in data, 'data 缺名 clip 实长 %s（_clipdur40.json r26 回填）' % kv
# ⑤ 教学延窗（watch 3400≥3072+300 / turn 2200≥1824+300 防尾截）
assert 3400 >= INS_WATCH + 300 and 2200 >= INS_TURN + 300
# ⑥ winFlow celebrate 2620+400=3020 ≥ right 2664+300=2964（家族 H）
assert 2620 + 400 >= INS_RIGHT + 300, 'celebrate 3020 < %d+300' % INS_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（ins_right 2664）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 R4 对称）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_ROWS' in verif and 'SPEC_LEGS' in verif, 'verify 缺题表/LEGS 独立硬编码表（单元⑥）'
assert 'SHAKE_MS * 1 + 140 <= D.ins_wrong + 150' in verif, 'verify 缺首错锁总窗口径断言（b39/b40 定版）'
# r26 verify 适配素材（SPEC-R26 §R8）：SEGS/谱独立硬编码表+⑭ 救援直驱+⑮ 谱聚合
assert 'SPEC_SEGS' in verif and 'SPEC_DCH4_KINDS' in verif, 'verify 缺 SEGS/dch4 谱独立硬编码表（r26）'
assert '_rescueCore()' in verif and '_idleHack' in verif, 'verify 缺 ⑭ 救援分层直驱断言素材（r26）'
assert 'SPEC_BODY_POOL' in verif and 'SPEC_MIX' in verif, 'verify 缺诚实池/mixfind 双录表（r26）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.anim', 'dataset.kind', "classList.contains('leg-focus')",
            "classList.contains('good')", "classList.contains('happy')",
            '__lastQueue', 'dataset.i', '.pick[data-i=', 'data-pick='):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-leg=' in data, 'game-data SVG 缺 data-leg 腿锚（知识对账依据——每动物可数）'
assert "querySelector('.pick[data-i=" in main, 'main 缺候选下标选择器（契约 M）'
# r26 渲染锚（SPEC-R26 §R4）：分段知识锚+找一找场景+叶挡腿
assert 'data-seg=' in data, 'game-data SVG 缺 data-seg 身体分段锚（维度②知识对账依据）'
assert 'const SEARCH_SVG' in data, 'data 缺 mixfind 找一找场景图（r26）'
assert 'function segIcon' in data, 'data 缺 bodyseg 分段图标（r26）'
assert '#animal.leg-hide [data-leg]{visibility:hidden}' in head, 'head 缺叶挡腿 CSS（r26 撤视锚）'
assert '.leafcover' in head and 'leafcover' in main, 'head/main 缺叶遮挡条锚（r26）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加）=====
# tutorialWatch watch 段名义分账：watch 延 3400（≥3072+300）+ 开题演出
# （出场 400+ant 名 clip 1344+150+estMs(judge 尾 11 字) 4395+300=6589）
# + ghost 移入 800+press 320 + demo 演出窗 2964（罩确认链 2664+300 精确）
# = 14073 ≤ 16000（r26：教学链零改动——demo 题 row0 ant judge 走 winR=PICK_WIN 通道）
TUT_SUM = 3400 + (400 + 1344 + 150 + est_ms(11) + 300) + 800 + 320 + 2964
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED',
            'const winR = q.kind === \'mixfind\' ? MIX_WIN : PICK_WIN;', 'winR * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据；r26 PICK_WIN→winR 分流）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>昆虫还是蜘蛛</title>' in head, 'head 缺标题 昆虫还是蜘蛛'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('estMs check: wrong-chain 6638 >= 6138 lower-bound (SPEC literal value); pick-win 2964 == 2664+300 (exact); '
      'shake total-window %d <= %d (b37 R3+b39 总窗口径); quiz-win max %d; tut-budget %dms <= 16000' %
      (1100 + 140, INS_WRONG + 150, 400 + 1440 + 150 + est_ms(11) + 300, TUT_SUM))
print('r26: WIN4 6738 == 1944+150+4344+300 (sci_none measured, backfilled); '
      'MIX_WIN 4554 == 2664+150+1440+300 (measured); dch4 quiz-win max %d; new clips registered: %d/8' %
      (400 + 1344 + 150 + est_ms(17) + 300, n4))
