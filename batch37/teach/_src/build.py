# -*- coding: utf-8 -*-
"""teach 教会小兔子 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch37/teach/_src/build.py
b36 M1 4 块布局：script[0]=core / script[1]=clips / script[2]=纯 data+engine+main
（无 verify 字面）/ script[3]=verify——verify ⑨ 源码断言读 script[2] 恢复判别力。
r5 难度改造（2026-09-13）：目标数 2-7→4-20+按群计数+错误三型+生成化 4 选+两轮跟踪。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch37/teach/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（tch_ 6 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('teach') 全量返回（manifest games 已含 teach 的
# core_* 3 条自动带上）；下方补注入循环按 `if '"%s"' % k in clips: continue`
# 幂等跳过（任务书定版模式）——已注入键绝不二次写入，并以计数断言防双注入
# T46 化（2026-09-19 二波B4）：keyless say 全退役→43 条新 clip（tch_task_2..20 全句/
# tch_n_2..20 组末计数/tch_gm_1|2|5 策略 label/tch_ghint 按群引导/tch_rabbit 兔子句）；
# 既有 6 条 clip 文本禁改（tch_task 旧键保留：开题引导+show 相位重读）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('teach')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：tch_ 6 条旧（SPEC §3/§4：tut_watch/tut_turn/task/hint/right/wrong）
# + 43 条 T46 新（tch_task_N 19/tch_n_N 19/tch_gm_1|2|5 3/tch_ghint/tch_rabbit 2）
# + core 3 条 = 52 条（T46 二波B4 定版；gate G3 teach=52）
# 前缀=tch_ 已核 manifest 无占用（b28 立规先查，2026-09-12 实查）
TCH_KEYS = ['tch_tut_watch', 'tch_tut_turn', 'tch_task', 'tch_hint', 'tch_right', 'tch_wrong']
TCH_TASK_KEYS = ['tch_task_%d' % n for n in range(2, 21)]      # 全句 19 键
TCH_N_KEYS = ['tch_n_%d' % n for n in range(2, 21)]            # 组末计数 19 键
TCH_GM_KEYS = ['tch_gm_1', 'tch_gm_2', 'tch_gm_5']             # 策略 label 3 键
TCH_MISC_KEYS = ['tch_ghint', 'tch_rabbit']                    # 按群引导+兔子句
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
# 幂等补注入循环（任务书定版：`if '"%s"' % k in clips: continue`——本例全量已注入全跳过）
ALL_TCH = TCH_KEYS + TCH_TASK_KEYS + TCH_N_KEYS + TCH_GM_KEYS + TCH_MISC_KEYS
for k in ALL_TCH + CORE_KEYS:
    if '"%s"' % k in clips:
        continue
    # 不可达分支：clips_js('teach') 必含全部 52 键（下方计数断言兜底）
    raise AssertionError('clips 缺少 %s（clips_js 应全量返回）' % k)
for k in ALL_TCH + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 52, 'clips 条数 %d != 52（tch 旧 6 + T46 新 43 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 tch_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('tch_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 tch_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('tch_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips), ('head', head)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'teach'" in main, 'main 缺 KIDS.init teach（存档键 kidsgame_teach）'
assert 'window.TCH =' in main, 'main 缺 TCH 钩子'
assert '__tchDemoR' in main, 'main 缺教学演示实证 __tchDemoR'
assert '__tchTutSolo' in main, 'main 缺教学帮→独实证 __tchTutSolo'
assert '__tchWatchMs' in main, 'main 缺 watch 段计时锚 __tchWatchMs'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非步相位）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# b33 硬性③：verify 钩子素材在场（verify 驱动依赖）
for lit in ('window.TCH.quiz', 'window.TCH.tapApple', 'window.TCH.tapFix', 'window.TCH.setGroup', 'TCH.autoSolve'):
    assert lit in verif, 'verify 缺钩子素材 %s（r5 钩子族）' % lit
# 本批常量锚（SPEC-BATCH37 §0.90/§6 r5：seeded mulberry32(flat*7919+747)——本款常量 747）
assert 'flat * 7919 + 747' in engine, 'engine 缺本款常量 seed 747（SPEC §0.90）'
# r5 章域封闭表锚（NDOM/EPOOL——SPEC §6 章型定版，防手误）
assert 'NDOM = { 1: [4, 9], 2: [4, 9], 3: [10, 20], 4: [6, 20] }' in engine, 'engine 缺 r5 NDOM 章域封闭表'
assert "EPOOL = { 1: ['skip'], 2: ['dup', 'swap'], 3: ['skip', 'dup', 'swap'], 4: ['skip', 'dup', 'swap'] }" in engine, \
    'engine 缺 r5 EPOOL 错误型池'
# r5 诊断卡模板锚（SPEC §6 卡生成封闭表——label 四型双录；cardLabel 定义在 data）
assert "'漏数了' + x" in data and "x + '数了两遍'" in data, 'data 缺 r5 卡模板 skip/dup'
assert "'数反了' : '它数对啦'" in data, 'data 缺 r5 卡模板 swap/none 收尾'
for lit in ('漏数了', '数了两遍', '数反了', '它数对啦'):
    assert lit in data, 'data 缺卡模板字面 %s（SPEC §6）' % lit
# r5 复现/按群参数锚（SPEC §6：rep=0.45/策略条阈值 10）
assert 'const REP_P = 0.45' in data, 'data 缺 r5 复现概率常量 0.45'
assert 'const GROUP_MIN = 10' in data, 'data 缺 r5 策略条阈值常量 10'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配可见回应（小课堂场景 bump）
assert "replayAnim(sceneEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.teach.tutSeen）
assert 'sv.teach && sv.teach.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
combined_main = data + engine + main
assert '(ci + 1) % 4' not in combined_main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I+I补：错链豁免窗（真时钟常量 WRONG_CHAIN_WIN=4866，SPEC §4 精确值）
# + 救援 interval 守卫 + startLevel 重置 + guard 条件式（错点吞/对选放行——预判与 core 同构）
assert 'const WRONG_CHAIN_WIN = 4866' in data, 'data 缺错链豁免窗常量 4866（SPEC §4）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== answerOf(q)' in main, \
    'main 缺 fix 步豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# 家族契约 L：NUMCN 2-20 全量 19 值（r5 任务数+组末计数封闭集——SPEC §6 定版）
assert "2: '二'" in data and "10: '十'" in data and "20: '二十'" in data, 'data 缺 NUMCN 2/10/20 端点（契约 L 19 值）'
assert len(re.findall(r"\d+: '", data[data.index('const NUMCN'):data.index('};', data.index('const NUMCN'))])) == 19, \
    'NUMCN 键数 != 19（契约 L 全量——r5 扩域 2-20）'
# 真时钟演出窗常量（SPEC §4 实长表+§6 r5；窗=链总实长+300 家族 G/H/T）
for frag in ('const CONFIRM_WIN = 3420', 'const TASK_CLIP_WIN = 2460', 'const TASK_SAY_MIN = 4005',
             'const GROUP_SAY_WIN = 5040', 'const RABBIT_SAY_WIN = 3660', 'const RABBIT_PEEK_MS = 800',
             'const APPLE_POP_MS = 250', 'const CARD_IN_MS = 800', 'const TUT_WATCH_WAIT = 3132',
             'const TUT_TURN_WAIT = 2052'):
    assert frag in data, 'data 缺演出窗常量 %s（SPEC §4/§6 r5）' % frag
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tap 演出期 null）'
# r5 动态窗/重叠演出式（SPEC §6 r5 分账锚——禁静态句窗+禁串行叠加）
assert 'Math.max(TASK_SAY_MIN, estMs(taskTTS(q)) + 300)' in main, 'main 缺任务句动态窗式（r5 大数 10 字 4350）'
assert 'Math.max(RABBIT_SAY_WIN, APPLE_POP_MS * q.m)' in main, 'main 缺兔子步重叠演出式（r5 大数压缩）'
# r5 按群/两轮跟踪核心素材（main+engine 双侧锚）
for lit in ('function uiSetGroup(g)', 'engResetBowl(cur)', 'addGroupTo(teachDotsEl',
            'KIDS.voice.play(groupClipOf(q.bowl), groupTTS(q.bowl))',   # T46：组末计数 clip
            'renderGroupBar(q)', 'PHASE_TEXT[key]', 'sv.teach.hits'):
    assert lit in main, 'main 缺 r5 素材 %s' % lit
for lit in ('function engResetBowl(L)', 'L.mhits[q.etype] = 0', 'L.mhits[q.etype]++',
            'function mkSeq(n, etype, errAt)', 'function ri2Excl(rnd'):
    assert lit in engine, 'engine 缺 r5 素材 %s' % lit
# Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即 return
# 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（本款 keyless 恒走 say
# 非队列链——契约 N；若未来引入 keyless queue 段本检查仍然生效）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH37 §4 实长表 + §6 r5）=====
est_ms = lambda n: n * 345 + 600
TCH_WATCH, TCH_TURN = 2832, 1752                  # tch_tut_watch / tch_tut_turn 实长
TCH_TASK, TCH_HINT, TCH_RIGHT, TCH_WRONG = 2160, 2352, 3120, 2064  # 实长
TASK_9, TASK_10 = '教小兔子数二个苹果', '教小兔子数二十个苹果'  # 9 字 / 10 字（N=20 极值）
GROUP_12, RABBIT_8 = '大数字，可以几个几个数哦', '兔子说：我来试试'  # 12 字含标点 / 8 字含冒号
# ① 确认窗（判对 right 单 clip）：3120+300=3420 精确（b37 裁决：right 演出窗=clip+300）
assert 3420 == TCH_RIGHT + 300, '确认窗 3420 != right %d+300' % TCH_RIGHT
assert 'const CONFIRM_WIN = 3420' in data
# ② 错链豁免窗（契约 I）：wrong 2064+150+hint 2352+300=4866（SPEC §4 精确值）
assert 4866 == TCH_WRONG + 150 + TCH_HINT + 300, '链豁免窗 4866 != 错链 %d+150+%d+300' % (TCH_WRONG, TCH_HINT)
# ③ 任务句窗（r5 动态式下限）：estMs(9 字)=3705+300=4005 下限；N=20 极值 10 字 4350
assert 4005 == est_ms(len(TASK_9)) + 300, '任务句下限 4005 != estMs(%d 字)+300' % len(TASK_9)
assert 4350 == est_ms(len(TASK_10)) + 300, '任务句 N=20 极值窗 4350 != estMs(%d 字)+300' % len(TASK_10)
assert 'const TASK_SAY_MIN = 4005' in data and 'const TASK_CLIP_WIN = 2460' in data
assert 2460 == TCH_TASK + 300, 'task clip 窗 2460 != 2160+300'
# ④ r5 按群引导句窗：estMs(12 字含标点)=4740+300=5040（关首题 n≥10）
assert 5040 == est_ms(len(GROUP_12)) + 300, '按群引导句窗 5040 != estMs(%d 字)+300' % len(GROUP_12)
assert 'const GROUP_SAY_WIN = 5040' in data
# ⑤ 兔子句窗：estMs(8 字含标点)=3360+300=3660（兔子演出窗内与摆苹果重叠——r5）
assert 3660 == est_ms(len(RABBIT_8)) + 300, '兔子句窗 3660 != estMs(%d 字)+300' % len(RABBIT_8)
assert 'const RABBIT_SAY_WIN = 3660' in data
# ⑥ celebrate 后窗（家族 H）：celebrate 2620+800=3420 ≥ right 3120+300=3420（恰等——b37 裁决）
assert 'await wait(800)' in main, 'main winFlow celebrate 后补窗 800 缺失（b37 裁决）'
assert 2620 + 800 >= TCH_RIGHT + 300, 'celebrate 2620+800=3420 < tch_right 3120+300=3420'
# ⑦ 教学延窗（watch 2832+300=3132 / turn 1752+300=2052 防尾截）
assert 3132 >= TCH_WATCH + 300 and 2052 >= TCH_TURN + 300
# ⑧ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑧b T46 新键实长双录（verify SPEC 同值防漂——dur json 09-19 实测）
TCH_TASK_DUR = {2: 2760, 3: 2808, 4: 2736, 5: 2688, 6: 2952, 7: 2760, 8: 2976, 9: 2688,
                10: 2712, 11: 3096, 12: 3000, 13: 3072, 14: 3072, 15: 3024, 16: 3048,
                17: 3072, 18: 3072, 19: 3096, 20: 3096}
TCH_N_DUR = {2: 1368, 3: 1392, 4: 1416, 5: 1320, 6: 1368, 7: 1368, 8: 1320, 9: 1344,
             10: 1464, 11: 1560, 12: 1536, 13: 1632, 14: 1632, 15: 1584, 16: 1632,
             17: 1632, 18: 1584, 19: 1584, 20: 1536}
TCH_GM_DUR = {1: 1824, 2: 1848, 5: 1776}
TCH_GHINT, TCH_RABBIT = 3120, 2592
NUMCN_PY = {2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
            11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五', 16: '十六',
            17: '十七', 18: '十八', 19: '十九', 20: '二十'}
# 逐句上界（窗不动充分性）：estMs(全句)+300 ≥ clip 全 19 句
for _n, _dur in TCH_TASK_DUR.items():
    _sent = '教小兔子数' + NUMCN_PY[_n] + '个苹果'
    assert est_ms(len(_sent)) + 300 >= _dur, \
        'tch_task_%d clip %d > estMs(%d字)+300=%d（窗破）' % (_n, _dur, len(_sent), est_ms(len(_sent)) + 300)
assert est_ms(len(GROUP_12)) + 300 >= TCH_GHINT, 'tch_ghint %d > 群引导窗 5040' % TCH_GHINT
assert est_ms(len(RABBIT_8)) + 300 >= TCH_RABBIT, 'tch_rabbit %d > 兔子窗 3660' % TCH_RABBIT
# T46 play 断言：main say 全退役；5 点位 play 计数精确（带分号防头注释误计）
assert 'KIDS.voice.say(' not in main, 'main 仍有 keyless KIDS.voice.say（T46 全 clip 化）'
assert main.count('KIDS.voice.play(taskClipOf(q), taskTTS(q));') == 3, 'taskClipOf play 计数 != 3'
assert main.count("KIDS.voice.play('tch_ghint', GROUP_HINT_TTS);") == 1, 'tch_ghint play 计数 != 1'
assert main.count('KIDS.voice.play(groupClipOf(q.bowl), groupTTS(q.bowl));') == 1, 'tch_n play 计数 != 1'
assert main.count('KIDS.voice.play(gmClipOf(g), GROUP_MODES.find(m => m.g === g).label);') == 1, 'tch_gm play 计数 != 1'
assert main.count("KIDS.voice.play('tch_rabbit', rabbitTTS);") == 1, 'tch_rabbit play 计数 != 1'
# 零 keyless 队列段字面（契约 N——注释亦禁含此字面，防断言自愈）
assert 'key: null' not in main and 'key:null' not in main, 'main 含 keyless 段字面'
assert 'key: null' not in verif and 'key:null' not in verif, 'verify 含 keyless 段字面'
# estMs 保留判定（T46 口径：sayWin 动态窗消费者在场 → 禁退役断言，反向锚定其存在）
assert 'const estMs = s => s.length * 345 + 600' in main, 'main estMs 保留（sayWin 动态消费者）'
# ⑨ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '__lastSayText' in verif, 'verify 缺 estMs/__lastSayText 动态断言'
# T46 素材断言：verify 独立 SPEC 四表+两表分流查值 specDurOf；engine 键派生三函数
for lit in ('SPEC_TCH_TASK', 'SPEC_TCH_N', 'SPEC_TCH_GM', 'SPEC_TCH_MISC', 'specDurOf'):
    assert lit in verif, 'verify 缺 T46 素材 %s' % lit
for lit in ('taskClipOf', 'groupClipOf', 'gmClipOf'):
    assert lit in engine, 'engine 缺 T46 键派生函数 %s' % lit
assert 'expQuiz' in verif, 'verify 缺 RNG 副本独立复算器 expQuiz（禁读页面值当期望源）'
assert 'origLS' in verif, 'verify 缺 origLS 写档测试模式（b34 坑②）'
assert 'try {' in verif and 'finally {' in verif, 'verify 缺 try/finally（b36 m4：异常路径还原 origLS）'
assert 'parseCard' in verif and 'cardTruth' in verif, 'verify 缺卡语义真假独立验证器（r5 ⑥/⑬）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：碗苹果点阵序号徽章/托盘
# 单颗+组块/诊断 4 卡/分组点亮 .grp） =====
for lit in ('dataset.apple', 'data-fix', '.t-group', "'#teach-dots .apple'", "'#learn-dots .apple'",
            'phaseReady', 'offsetWidth', '.num', '.grp'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M r5）' % lit

# ===== 教学链 watch 预算分账（≤22000，名义值累加；三步完整演示款 b35 M1 裁决款型）
# r5 版（N=4/skip 缺3——摆 m=3 颗）：watch 延 3132（≥2832+300）+ 开题（task 2460+
# 任务句动态窗 4005（9 字 N=4）=6465）+ ghost 示范 4 颗（首颗 800+320；后续 3 颗相邻
# 直接压 320×3——从紧）+ 兔子步（**重叠式** max(3660, 3×250)+卡入场 800=4460）+
# ghost 指好卡（800+320）+ right 窗 3420 = 20677 ≤ 22000 =====
TUT_SUM = 3132 + (2460 + 4005) + (800 + 320 + 3 * 320) + (3660 + 800) + (800 + 320) + 3420
assert TUT_SUM <= 22000, '教学 watch 分账 %dms > 22000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TASK_CLIP_WIN * SPEED', 'sayWin * SPEED',
            '800 * SPEED', '320 * SPEED', 'RABBIT_SAY_WIN * SPEED', 'APPLE_POP_MS * SPEED',
            'CARD_IN_MS * SPEED', 'CONFIRM_WIN * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐+r5 布局锚
assert '<title>教会小兔子</title>' in head, 'head 缺标题 教会小兔子'
assert 'tch-peek .8s' in head, 'head 缺兔子探头动画锚（RABBIT_PEEK_MS=800 对应）'
for lit in ('#groupbar', '.t-group', '.apple .num', '.fixcard', '.grp'):
    assert lit in head, 'head 缺 r5 布局锚 %s（策略条/组块/序号徽章/4 卡/分组点亮）' % lit

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# b36 M1 ①：4 块布局判别——script[2]（data+engine+main）无 verify 字面
# （verify 独立 script[3]；verify ⑨ 读 script[2] 断言源码恢复判别力）
assert 'runVerify' not in combined_main, 'script[2] 含 verify 字面 runVerify（b36 M1 4 块布局被破坏）'
assert 'VERIFY PASS' not in combined_main, 'script[2] 含 verify 字面 VERIFY PASS（b36 M1）'
assert 'VERIFY PASS' in verif and 'runVerify' in verif, 'script[3] 缺 verify 内容（拼错块序）'

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('estMs check: confirm win 3420=right 3120+300 exact; wrong-chain 4866 '
      '(%d+150+%d+300) exact; task clip 2460/%d+300; task-say-min %d=estMs(%d)+300'
      '+N20 %d=estMs(%d)+300; group-say %d=estMs(%d)+300; rabbit-say %d=estMs(%d)+300; '
      'celebrate 2620+800>=3420; tut-budget %dms <= 22000; T46 clips 52 '
      '(task-N worst %d<=estMs+300 all 19; ghint %d<=5040; rabbit %d<=3660; n worst %d non-block)' %
      (TCH_WRONG, TCH_HINT, TCH_TASK, 4005, len(TASK_9), 4350, len(TASK_10),
       5040, len(GROUP_12), 3660, len(RABBIT_8), TUT_SUM,
       max(TCH_TASK_DUR.values()), TCH_GHINT, TCH_RABBIT, max(TCH_N_DUR.values())))
