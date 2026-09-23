# -*- coding: utf-8 -*-
"""robotdance 兔子机器人学跳舞 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch32/robotdance/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch32/robotdance/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（rbd_ 12 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('robotdance')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r43 终态 2026-09-22 主线注册 manifest 5344→5350）：rbd_ 18 条
# （通用 7+名音×10+fix 1）+ core 3 条 = 21 条（SPEC-R43 §R7 键清单）
# 前缀=rbd_ 已核 manifest 无占用（b28 撞前缀双事故立规：新批前缀先查；新 6 键后缀已复核不在册）
RBD_IDS = ['jump', 'spin', 'clap', 'stomp', 'wave', 'nod', 'kick', 'shake', 'bow', 'stretch']  # 动作池 10（SPEC-R43 §R3）
RBD_KEYS = ['rbd_tut_watch', 'rbd_tut_turn', 'rbd_hint', 'rbd_right', 'rbd_wrong',
            'rbd_q', 'rbd_replay', 'rbd_q_fix'] + ['rbd_n_' + w for w in RBD_IDS]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in RBD_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 21, 'clips 条数 %d != 21（r43 终态：rbd 18 + core 3；2026-09-22 注册）' % n_clips
# 注入键前缀对账：只允许 rbd_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('rbd_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 rbd_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('rbd_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'robotdance'" in main, 'main 缺 KIDS.init robotdance（存档键 kidsgame_robotdance）'
assert 'window.RD =' in main, 'main 缺 RD 钩子'
assert '__rdDemoR' in main, 'main 缺教学演示实证 __rdDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.robotdance.tutSeen）
assert 'sv.robotdance && sv.robotdance.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 4650（SPEC §4 rbd 错链=1656+150+2544+300）+ 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + 4650' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=4650'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补：guard 挂 uiTapBlock 入口（错点吞/对选放行——真时钟窗）
assert 'wrongChainUntil && Date.now() < wrongChainUntil && q.blocks[i].anim !== q.steps[q.pos]' in main, \
    'main 缺错链豁免窗 guard（契约 I 补：错点吞/对选放行）'
# 家族契约 J：语义链 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# watch/dance 演出相位豁免 idle（§0.77：演示相位演出即引导，不计时）
assert "q.phase !== 'build') return;" in main, 'main rescueTick 缺演出相位 idle 豁免'
# 家族契约 O：款内自建 button 显式 color（core 兜底之外仍须显式）
assert 'button{color:#4A3B2E' in head, 'head 缺自建 button 显式 color（契约 O）'
# Mj-1 恒真式（SPEC-BATCH32 §2：rbd 链无 keyless——TTS 段恒尾断言改「无 keyless 段」恒真式）：
# 本款全部拼播链均为 clip 段（错链=[rbd_wrong, rbd_hint]/转场链=[tut_turn, q]/确认链=[名音…, right]），
# 不存在任何 {key:null} TTS 段——家族 keylessLast 断言在此退化为恒真式，以「零 keyless 段」钉死
for _name, _s in (('main', main), ('verify', verif)):
    assert '{ key: null' not in _s, 'game-%s 出现 keyless TTS 段——本款语音链全 clip（Mj-1 恒真式违约）' % _name

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-R43 §R8 实长表；窗 ≥ 链实长+300）=====
# clip 实长（SPEC-BATCH32 §4+r43 实测回填）：wrong 1656 / hint 2544 / right 2280
# / tut_watch 3072 / tut_turn 1824 / q 2088 / replay 1896 / 名音 10 见 CLIP_DUR（max=stretch 1704）。
# SPEC-R43：名音预估上界 MAX_NAME_EST=1684（r43 定版裁定：实测 max 1704>预估，STEP_MS 1834
# 维持罩住（间隙 130ms 零截断），不回调——修复轮 minor4 注记终态）
RBD_WRONG, RBD_HINT, RBD_RIGHT = 1656, 2544, 2280
MAX_NAME_EST = 1684
RBD_TUT_WATCH, RBD_TUT_TURN, RBD_Q = 3072, 1824, 2088
# ① 演示/舞单段窗 STEP_MS=1834 ≥ 名音预估上界 1684+150 间隙（SPEC-R43 §R8；data 钉死+main 引用）
assert 'STEP_MS = 1834' in data, 'game-data 缺 STEP_MS=1834（单段窗依据，SPEC-R43 §R8）'
assert 1834 >= MAX_NAME_EST + 150, 'STEP_MS 1834 < 名音预估上界 %d+150' % MAX_NAME_EST
# ①b（r43 修复轮 minor4 新增）：名音实长全域 max ≤ STEP_MS——从 game-data CLIP_DUR 提取，
# 防「实长超预估且超窗」的音频溢出（实测 1704≤1834 ✓）
_name_durs = {k: int(v) for k, v in re.findall(r'rbd_n_(\w+):\s*(\d+)', data)}
assert len(_name_durs) == 10, 'CLIP_DUR 名音条数 %d != 10' % len(_name_durs)
assert max(_name_durs.values()) <= 1834, '名音实测 max %d > STEP_MS 1834（单段窗音频溢出）' % max(_name_durs.values())
assert 'STEP_MS * SPEED' in main, 'main 演示/舞播放器缺 STEP_MS*SPEED 单段窗'
# ② dance 确认链：名音逐段+right 尾段；总窗 8×1834+2580=17252 ≥ 8×(1684+150)+2280+300=17252（max 8 步）
assert 'await wait(2580 * SPEED)' in main, 'main dance 相位缺 right 尾段窗 2580'
assert 8 * 1834 + 2580 >= 8 * (MAX_NAME_EST + 150) + RBD_RIGHT + 300, \
    'dance 总窗 %d < 确认链 %d' % (8 * 1834 + 2580, 8 * (MAX_NAME_EST + 150) + RBD_RIGHT + 300)
# ③ 错链豁免窗（契约 I）：[rbd_wrong, rbd_hint] 全 clip 链=1656+150+2544+300=4650（恒等）
assert 4650 == RBD_WRONG + 150 + RBD_HINT + 300, '错链窗 4650 与实长表不符'
# ④ 转场链（watch→build）：常规 [rbd_tut_turn, rbd_q]=1824+150+2088=4062（异步不占 UI 窗，链序断言）；
#    fix 题 [rbd_q_fix] 单段（新键预估 ~2.5-3.5s，注册后实测复核——SPEC-R43 §R8）
assert 'VOICE.turn.key, VOICE.q.key' in main, 'main 缺转场链 [tut_turn, q]（演示完进 build）'
assert RBD_TUT_TURN + 150 + RBD_Q == 4062, '转场链实长与实长表不符'
assert 'q.kind === \'fix\' ? [VOICE.fix.key]' in main, 'main 缺 fix 转场链分流 [rbd_q_fix]（SPEC-R43 §R5）'
# ⑤ 教学窗：watch 演示延 3372 ≥ 3072+300；turn 后演示延 2124 ≥ 1824+300（教学交接/replay 前导共用）
assert '3372 * SPEED' in main, 'main 缺教学 watch 演示延窗 3372'
assert 3372 >= RBD_TUT_WATCH + 300, '教学 watch 演示延 3372 < %d+300' % RBD_TUT_WATCH
assert '2124 * SPEED' in main, 'main 缺 turn 后演示延窗 2124（教学交接/replay 前导）'
assert 2124 >= RBD_TUT_TURN + 300, 'turn 后演示延 2124 < %d+300' % RBD_TUT_TURN
# ⑥ CSS 动画 SPEED 换算声明：--t 变量随 SPEED 置换（verify 提速不漂移；SPEC 任务书 §硬性契约 9）
assert "setProperty('--t'" in main, 'main 缺 CSS 动画 SPEED 换算（--t 置换）'
assert 'var(--t)' in head, 'head keyframes 缺 var(--t) 时长换算声明'
# ⑦ 兔子机器人 SVG 与动作图标锚（契约 M 渲染对账依据——data-anim 由工厂函数运行时拼接，
#    此处断言锚生成式在场：机器人=字面 data-anim="robot"；动作图标=g[data-anim] 工厂）
assert 'data-anim="robot"' in data, 'game-data 机器人 SVG 缺 data-anim=robot 锚（契约 M）'
_icon_anchor = "'<g data-anim=\"' + id"
assert _icon_anchor in data, 'game-data 动作图标缺 g[data-anim] 工厂锚（契约 M）'

# ===== 数学先验静态断言（SPEC-R43 §R3：池 10/步数谱/u 上限/干扰恰 NEW_CAP；禁 3 连；
#      fix 题每关恒 1（dch4）；flat0 q0 锚面走 legacyQuiz 旧律） =====
assert "MOVE_POOL = ['jump', 'spin', 'clap', 'stomp', 'wave', 'nod', 'kick', 'shake', 'bow', 'stretch']" in data, \
    'game-data 缺动作封闭 10 池（SPEC-R43 §R3）'
assert 'CH1_STEPS = [3, 4, 4, 5, 5]' in engine, 'engine 缺 dch1 题步数坡表 CH1_STEPS（q0=锚面 3 步）'
assert 'DCH_STEPS = { 2: 6, 3: 7, 4: 8 }' in engine, 'engine 缺章步数表 DCH_STEPS（SPEC-R43 §R3）'
assert 'U_CAP = { 1: 5, 2: 6, 3: 6, 4: 6 }' in engine, 'engine 缺序列不同动作上限表 U_CAP（ch3/4 恒重复）'
assert 'NEW_CAP = { 1: 3, 2: 3, 3: 4, 4: 4 }' in engine, 'engine 缺干扰数表 NEW_CAP（SPEC-R43 §R3）'
assert 'function hasTriple' in engine and 'function makesTriple' in engine, 'engine 缺禁 3 连工具（SPEC-R43 §R2.2）'
assert 'function legacyQuiz(rnd)' in engine and 'OLD_POOL' in engine, 'engine 缺 flat0 q0 锚面通道 legacyQuiz（SPEC-R43 §R10）'
assert 'flat === 0 && qi === 0' in engine, 'engine genLevel 缺 flat0 q0 锚面分流'
assert 'const kq = dch === 4 ? ri(rnd, 0, 4) : -1' in engine, 'engine 缺 dch4 fix 题位 kq（每关恒 1）'
assert 'function engTapSlot(L, i)' in engine, 'engine 缺 fix 点槽判定 engTapSlot（SPEC-R43 §R5）'
assert "fix:    { key: 'rbd_q_fix',     text: '有一跳错啦，找一找' }" in data, 'game-data 缺 fix 语音键（SPEC-R43 §R7）'
assert 'q.kind === \'fix\'' in main, 'main 缺 fix 题渲染/交互分流（SPEC-R43 §R5）'
assert 'async function uiTapSlot(i)' in main, 'main 缺 fix 点槽主路径 uiTapSlot（SPEC-R43 §R5）'
assert 'tapSlot(i)' in main, 'main RD 钩子缺 tapSlot 暴露'
assert 'a-nod' in head and 'a-kick' in head and 'a-shake' in head and 'a-bow' in head and 'a-stretch' in head, \
    'head 缺新 5 动作 CSS 动画（SPEC-R43 §R3）'
assert '.slot.pickable' in head and '.slot.breathe' in head, 'head 缺 fix 槽可点/答案级 breathe 样式（SPEC-R43 §R5）'
assert '.rb-head' in data and '.rb-head' in head, '机器人 SVG 缺头部动画组 rb-head（nod 目标）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.anim', 'dataset.i', 'data-anim', 'c-name', 's-name', 'rb-lift'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'keyless' in verif or 'noKeyless' in verif, 'verify 缺 keyless 恒真式断言（Mj-1）'

# ===== 教学链 watch 预算分账（SPEC-R43 §R8：STEP_MS 1834 后 16148 ≤ 16500——预算上界随段扩 500；
#      教学关 2 步零改动，4 段演示窗 1734→1834 各 +100；verify 折算含 ~750ms 归一化余量）=====
# tutorialWatch 名义分账：watch 延 3372（≥3072+300）+ 演示 2×1834 + 转场链起 420 +
# ghost 2×920（含 pointGhostAt 内 800 移动+按压）+ fill 演出 260 + 间隙 60 +
# dance 前奏 280 + dance 2×1834+2580 = 16148 ≤ 16500
TUT_SUM = 3372 + 2 * 1834 + 420 + 2 * 920 + 260 + 60 + 280 + 2 * 1834 + 2580
assert TUT_SUM <= 16500, '教学 watch 分账 %dms > 16500' % TUT_SUM
for lit in ['3372 * SPEED', '420 * SPEED', '920 * SPEED', '260 * SPEED', '280 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>兔子机器人学跳舞</title>' in head, 'head 缺标题 兔子机器人学跳舞'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('win check: step %d>=%d; dance %d>=%d; wrong %d==%d; turnq %d; tut-budget %dms <= 16500' %
      (1834, MAX_NAME_EST + 150, 8 * 1834 + 2580, 8 * (MAX_NAME_EST + 150) + RBD_RIGHT + 300,
       4650, RBD_WRONG + 150 + RBD_HINT + 300, RBD_TUT_TURN + 150 + RBD_Q, TUT_SUM))
