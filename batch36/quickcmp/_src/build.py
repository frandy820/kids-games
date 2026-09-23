# -*- coding: utf-8 -*-
"""quickcmp 快速比大小 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch36/quickcmp/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch36/quickcmp/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（qc_ 29 条 + core_* 3 条，manifest 对账）
# r46 段二已注册（09-22）：qc_ask_gap + qc_n_11..20 共 11 新键，manifest 5350→5459
# （ok=11 fail=0）——TODO 销账：原两段制断言（21 条）已按在册 32 条收口
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('quickcmp')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：qc_ 29 条（既有 6+T46 段 2+r46 qc_ask_gap+数词 1-20）+ core 3 条 = 32 条
# 前缀=qc_ 已核 manifest 无占用（b28 立规先查，2026-09-12 实查；T46 键 09-19 复核；
# r46 新键 11 个 09-22 主线注册——manifest games quickcmp 计数 32 实查）
QC_KEYS = ['qc_tut_watch', 'qc_tut_turn', 'qc_ask', 'qc_hint', 'qc_right', 'qc_wrong',
           'qc_s_left', 'qc_s_right', 'qc_ask_gap'] + ['qc_n_%d' % n for n in range(1, 21)]  # 29 键
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in QC_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 32, 'clips 条数 %d != 32（qc 29 + core 3）' % n_clips
# 注入键前缀对账：只允许 qc_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('qc_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 qc_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('qc_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'quickcmp'" in main, 'main 缺 KIDS.init quickcmp（存档键 kidsgame_quickcmp）'
assert 'window.QC =' in main, 'main 缺 QC 钩子'
assert '__qcDemoR' in main, 'main 缺教学演示实证 __qcDemoR'
assert '__qcTutSolo' in main, 'main 缺教学帮→独实证 __qcTutSolo'
assert '__qcFlashN' in main, 'main 缺闪现演出锚 __qcFlashN（契约 M）'
# 本批常量锚（SPEC-BATCH36 §0.89：seeded mulberry32(flat*7919+887)——本款常量 887）
assert 'flat * 7919 + 887' in engine, 'engine 缺本款常量 seed 887（SPEC §0.89）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# r46 修复轮 M1（r24 doReplay keepIdle 同型）：救援重放不刷 idle 锚——防 30s 答案级饿死回退
assert 'doFlash(false, true)' in main and 'if (!keepIdle) lastAct = Date.now();' in main, \
    'main 缺救援重放 keepIdle（M1：14s 方向级重放饿死 30s 答案级——试玩静置实锤）'
# r46 修复轮 S1：判定 ++ 点同步解除闪现态（abort 分支不清旗标防误清新闪现者——吞输入死锁防回归）
assert '旗标由本 ++ 点回收' in main, 'main 缺 S1 判定点清闪现态锚（flashOn 回收不变式）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(choicesEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.quickcmp.tutSeen）
assert 'sv.quickcmp && sv.quickcmp.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置（本款窗=4938，SPEC §4）
assert 'wrongChainUntil = Date.now() + 4938' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=4938'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补（b31 定版）：豁免窗错点吞/对选放行/窗后二错照计 miss（guard 挂 uiTapSide 判定前）
assert 'wrongChainUntil && Date.now() < wrongChainUntil && !sideOk' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# 契约 L：数字映射表覆盖 1-20 全量（r46 域升 10-20——NUMCN 扩 11-20，SPEC-R46 §R3；
# TTS 复述句回退文本+segParts 段键值域同构 1-20；段键 qc_n_1..20 全在册——r46 段二
# 注册收口 09-22，SPEC §R7/§R13）
NUMCN_EXP = {1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
             11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
             16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十'}
for k, v in NUMCN_EXP.items():
    assert '%d: ' % k in data and "'%s'" % v in data, 'game-data NUMCN 缺 %d→%s（契约 L 全量 1-20）' % (k, v)
# 契约 L（T46 化）：NUMCN 表保留=verify 双录对账源（纯数词映射，显示/回退文本用途——
# 注册 clip 文案=数词+「个」量词口径，见 game-data 注释勘误）；确认句段键走 segParts
# （数词键 qc_n_<n> 与 NUMCN 值域同构 1-20 全量——r46 段二注册后 clip 1-20 全在册）
assert '.concat(segParts(q))' in main, 'main 确认链缺 segParts 拼播（T46 化）'
assert 'const segParts = q =>' in data and 'const numClip = n =>' in data, \
    'game-data 缺 segParts/numClip（T46 化）'
# SPEC-R46 §R8：闪现档 ch1/ch3=1200（FLASH_EASY 锚面不变）/ch2/ch4=1400（FLASH_MID
# 大数域 ANS 编码档）+ dual 双簇间隔 DUAL_ISI 800 + flashMs 按章取档
assert 'const FLASH_EASY = 1200, FLASH_MID = 1400' in data, 'data 缺闪现档 1200/1400（SPEC-R46 §R8）'
assert 'const DUAL_ISI = 800' in data, 'data 缺 dual 双簇间隔 DUAL_ISI=800（SPEC-R46 §R8）'
assert '(dch === 2 || dch === 4 ? FLASH_MID : FLASH_EASY)' in data, 'data 缺 flashMs 按章取档'
# r46 dual half 转相位窗 2700：段二实测复核（mutagen 09-22）qc_ask_gap=1656+300=1956
# ≤ 2700（余 744）——窗不调（原 estMs(5)=2325 口径定值已销账，SPEC §R8 实测复核行）
assert 'const GAP_ASK_WIN = 2700' in data, 'data 缺 GAP_ASK_WIN=2700（SPEC-R46 §R8）'
assert 'GAP_ASK_WIN * SPEED' in main, 'main 缺 dual 第二问问句窗驱动'
assert 'lastFlashAt < 6000' in main, 'main 缺重看通道 6s 节流（SPEC §2）'
assert 'q.flash * SPEED' in main, 'main 缺闪现窗按题档驱动'
# r46 生成域（SPEC-R46 §R3）：比例带收紧（ch2 [0.85,0.92)/ch3 [0.85,0.90) 差≥2）+
# dual 池（base∈[10,20-d]×d∈{2,4,6} 镜像 42 对——池计数精确值由 _r46_pycheck.py
# Python 位级复刻独立断言 20/16/14/42/11）+ 等数池 10-20
assert 'pairsBand(10, 20, 2, 0.85, 0.92)' in engine, 'engine 缺 ch2 比例带池 [0.85,0.92)（SPEC-R46 §R3）'
assert 'pairsBand(10, 20, 2, 0.85, 0.90)' in engine, 'engine 缺 ch3 窄带池 [0.85,0.90)（SPEC-R46 §R3）'
assert 'POOL_DUAL' in engine and 'POOL_EQ2' in engine and 'POOL_R2' in engine and 'POOL_R3' in engine, \
    'engine 缺 r46 候选池（SPEC-R46 §R3）'
assert 'for (const d of [2, 4, 6])' in engine, 'engine dual 池缺差值档 {2,4,6}（SPEC-R46 §R3）'
# r46 两段判定（half 范式 r24/r25）：第一步对转相位不推 step+lastAct 刷新（r25 M2 铁律）
assert "if (r === 'half') {" in main, 'main 缺 half 分支（dual 两段式 SPEC-R46 §R3）'
assert "if (r === 'half') {\n    lastAct = Date.now();" in main, \
    'main half 分支缺 lastAct 刷新（r25 M2：转相位必刷救援钟）'
assert '__qcDualPhase' in main, 'main 缺双闪序列中间态锚 __qcDualPhase（verify 瞬态捕获）'
assert "q.kind === 'dual'" in engine, 'engine 缺 dual 两段判定（SPEC-R46 §R3）'
assert "kind = 'dual'" in engine, 'engine 生成态缺 dual 题型标记'
# r46 大簇半径参数化（渲染铁律：n≥13 二十格 5×4 r=7.5——SPEC-R46 §R3 布点分支）
assert 'function dotsSvg(n, pts, r)' in data, 'data dotsSvg 缺 r 参数（同题同半径注入）'
assert 'const rOf = q =>' in engine and 'Math.max(q.nL, q.nR) <= 12 ? 8 : 7.5' in engine, \
    'engine 缺 rOf 大簇半径分支（SPEC-R46 §R3）'
assert "b.className = 'side-btn pop' + (isDualGap(q) ? ' gap' : '');" in main, \
    'main 缺 dual 第二问档级按钮渲染（SPEC-R46 §R3）'
# r46 head 样式：多侧 lit 记忆锚+档级按钮大数字
assert '.panel.lit' in head, 'head 缺 .panel.lit 多侧记忆锚样式（SPEC-R46 §R4）'
assert '.side-btn.gap .gapnum' in head, 'head 缺档级按钮大数字样式（SPEC-R46 §R4）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）——T46 化零 keyless 政策：
# 确认尾段=qc_s_*/qc_n_* clip 拼播（原 keyless TTS 复述尾退役），出现 keyless 即 fail
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert 'key: null' not in _s and 'key:null' not in _s, \
        'game-%s 出现 keyless 段（T46 化零 keyless 政策）' % _src_name

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH36 §4 实长表；T46 clip 口径 09-19）=====
QC_WATCH, QC_TURN = 3072, 1848                  # qc_tut_watch / qc_tut_turn 实长
QC_ASK, QC_HINT, QC_RIGHT, QC_WRONG = 2088, 2496, 2256, 1992
QC_S_LEFT, QC_S_RIGHT = 1344, 1368              # T46 段键实长（voice/clips Audio 实测 09-19）
QC_N = {1: 1344, 2: 1368, 3: 1392, 4: 1416, 5: 1320,                         # T46 数词段实长 10 键
        6: 1368, 7: 1368, 8: 1320, 9: 1344, 10: 1464}
QC_N_HI = {11: 1560, 12: 1536, 13: 1632, 14: 1632, 15: 1584,                 # r46 段二实长 11-20
           16: 1632, 17: 1632, 18: 1584, 19: 1584, 20: 1536}                 # （mutagen 09-22——TODO 销账）
QC_GAP = 1656   # qc_ask_gap 实长（5 字；组 max——「gap 5 字+数词 3 字十一个」09-22 实测）
QC_N_ALL = dict(QC_N); QC_N_ALL.update(QC_N_HI)
_chain_ms = lambda a, b: (QC_RIGHT + 4 * 150 + QC_S_LEFT + QC_N_ALL[a] +
                          QC_S_RIGHT + QC_N_ALL[b] + 300)    # 5 段链（right+4 段复述）
_worst = max(_chain_ms(a, b) for a in QC_N for b in QC_N)    # 1-10 域 max（nL=nR=10）
_worst_hi = max(_chain_ms(a, b) for a in QC_N_HI for b in QC_N_HI)   # 11-20 实测域 max（1632×2）
_worst_cons = QC_RIGHT + 4 * 150 + QC_S_LEFT + QC_GAP + QC_S_RIGHT + QC_GAP + 300   # 组 max 保守口径
# ① 确认链（T46 化：qc_right+复述 4 段 clip）→ 演出窗动态尾（r37 max(estMs,chainMs)
#    先例，SPEC-R46 §R8）：n≤10 走尾 6800（总 8800 ≥ 最坏 8796；教学迷你关 n≤5 同档
#    ——分账 17220≤17250 不破）；n>10 走尾 7400（总 9400 ≥ 实测链 9132——原预估 9168
#    按保守上界 1650/键，段二实测 1632 max，组 max 口径 1656×2=9180 仍罩——窗不调）
assert '2000 * SPEED' in main and 'tailWin * SPEED' in main, 'main 缺判对演出窗 2000+动态尾（家族 G/H）'
assert '(q.nL > 10 || q.nR > 10) ? 7400 : 6800' in main, 'main 缺动态尾三元 7400|6800（SPEC-R46 §R8）'
assert _worst == 8796, '确认链全域最坏应为 8796（nL=nR=10），实得 %d' % _worst
assert 2000 + 6800 >= _worst, '判对演出窗 8800 < 确认链最坏 %d' % _worst
assert _worst_hi == 9132, '11-20 实测链应为 9132（1632×2），实得 %d' % _worst_hi
assert 2000 + 7400 >= _worst_hi, '动态尾窗 9400 < 11-20 实测链 %d' % _worst_hi
assert _worst_cons == 9180 and 2000 + 7400 >= _worst_cons, '组 max 保守口径链 %d 应为 9180 且 ≤ 9400' % _worst_cons
assert 2700 >= QC_GAP + 300, 'GAP_ASK_WIN 2700 < qc_ask_gap 实测 %d+300' % QC_GAP
# ② 错反馈链豁免窗（契约 I）：错链=wrong 1992+150+hint 2496+300=4938（SPEC §4 精确值）
assert 4938 == QC_WRONG + 150 + QC_HINT + 300, '链豁免窗 4938 != 错链 %d+150+%d+300' % (QC_WRONG, QC_HINT)
assert '(q._miss === 1 ? 4638 : 1000) * SPEED' in main, \
    'main 缺错链主窗三元（首错 4638=wrong 1992+150+hint 2496 / miss≥2 防重入 1000）'
# ③ clip 实长窗（SPEC-BATCH36 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3400 * SPEED' in main, 'main 缺教学演示延窗 3400（qc_tut_watch 3072+300）'
assert 3400 >= QC_WATCH + 300, '教学演示延 3400 < qc_tut_watch 3072+300=3372'
assert '2400 * SPEED' in main, 'main 缺问句窗 2400（qc_ask 2088+300）'
assert 2400 >= QC_ASK + 300, '问句窗 2400 < qc_ask 2088+300=2388'
assert 2150 >= QC_TURN + 300, 'turn 后问句延 2150 < qc_tut_turn 1848+300=2148'
assert '2150 * SPEED' in main, 'main 教学 turn 后问句延 2150 缺失（qc_tut_turn 1848+300 防尾截）'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（qc_right 2256）'
assert 2620 + 400 >= QC_RIGHT + 300, 'celebrate 2620+400=3020 < qc_right 2256+300=2556'
# ④ estMs 口径退役（T46 化：确认链全 clip，估长无消费者——禁死代码回潮；注释提及不禁）
assert 'const estMs' not in main and 's.length * 345 + 600' not in main, \
    'main estMs 定义已退役（T46 化），发现残留死代码'
# ⑤ verify 页 clip 链动态断言素材在场（运行时对账，build 只验结构存在）
assert 'SPEC_QC_N' in verif and 'chainMs' in verif and '2000 + 6800' in verif and '2000 + 7400' in verif, \
    'verify 缺 SPEC_QC_N/chainMs/双档窗对账素材（T46 化+r46 动态尾）'
assert "SPEC_NUMCN" in verif, 'verify 缺 NUMCN 独立双录素材（契约 L）'
# ⑥ keylessLast 断言素材在场（契约 N T46 化：零 keyless 的运行时复核）
assert 'keylessLast' in verif, 'verify 缺 keylessLast 断言（契约 N/Mj-1）'
# ⑥b r46 verify 素材：dual 专项+全部作答形态采样（r43 M4：sims 含 dual 形态）+
# 双闪中间态捕获（b18 密集轮询）+SPEC 域表独立复算
assert '__qcDualPhase' in verif and 'dHist' in verif and 'specDomainOk' in verif, \
    'verify 缺 dual 专项素材（SPEC-R46 §R10）'
assert 'sawA' in verif and 'sawB' in verif, 'verify 缺双闪中间态捕获素材（b18 先例）'
assert 'specR' in verif, 'verify 缺 rOf 参数化期望素材（渲染铁律）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚+闪现演出态）=====
for lit in ('dataset.side', "'.dot'", '__qcFlashN', "classList.contains('veil')"):
    assert lit in verif, 'verify 缺帧内容断言素材 %r（契约 M）' % lit
assert 'class="dot"' in data, 'game-data dotsSvg 缺 .dot 圆点锚（圆点数==n 对账依据）'
assert 'panel.veil .dot' in head, 'head 缺 veil 消隐样式（闪现后 DOM 残留计数锚）'
# 等大半径（渲染铁律）：r46 起半径参数化注入（dotsSvg(n,pts,r)×rOf(q) 8|7.5）——
# 等大同源断言移交 engine rOf+data 三参签名+verify specR 运行时对账（上方已断言）

# ===== 教学链 watch 预算分账（T46 化 09-19：帽按 clip 实长分账重定 17250——原 16000
# 帽基于 estMs 复述 3360，clip 复述 4 段实长+gap=5640+600>3360，音频完整性优先；
# 单步演示款口径不变，帽仍为名义和+30 防胀窗）=====
# tutorialWatch 名义分账：watch 延 3400（≥3072+300）+ 问句 2400（≥2088+300）
# + 闪现 1200 + 消隐 300 + ghost 移入 800 + press 320 + demo 演出窗 2000+6800
# （教学迷你关 n≤5 → 动态尾恒 6800 档——罩确认链最坏 8796）= 17220 ≤ 17250
TUT_SUM = 3400 + 2400 + 1200 + 300 + 800 + 320 + 2000 + 6800
assert TUT_SUM <= 17250, '教学 watch 分账 %dms > 17250' % TUT_SUM
for lit in ['3400 * SPEED', '2400 * SPEED', '800 * SPEED', '320 * SPEED',
            '2000 * SPEED', '2150 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学迷你关 n≤5 恒走 6800 尾档（r46 动态尾三元 (q.nL>10||q.nR>10)?7400:6800——
# 教学题 3vs5/2vs4 恒 6800，分账不破 17250 帽；动态尾字面已由①断言）

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>快速比大小</title>' in head, 'head 缺标题 快速比大小'

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
print('T46 clip check: confirm worst chain %d <= 8800 right-win; '
      'wrong-chain %d+150+%d+300=4938 (exact); ask-win 2400 >= %d+300; tut-budget %dms <= 17250' %
      (_worst, QC_WRONG, QC_HINT, QC_ASK, TUT_SUM))
print('r46 check: hi-chain real %d (cons %d) <= 9400 dyn-tail; gap %d+300 <= 2700; '
      'clips %d (post-register 32); dual pools 20/16/14/42/11 -> pycheck' %
      (_worst_hi, _worst_cons, QC_GAP, n_clips))
