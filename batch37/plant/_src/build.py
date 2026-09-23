# -*- coding: utf-8 -*-
"""plant 植树程序 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch37/plant/_src/build.py
布局（b36 M1 强制项）：script[0]=core / script[1]=clips / script[2]=纯 data+engine+main
（无 verify 字面）/ script[3]=verify 独立第 4 块——verify ⑨ 源码断言读 script[2] 恢复判别力。
r47 段二（SPEC-R47-PLANT §R6 销账，2026-09-22）：主线已注册 34 新键（manifest
5459→5517），clips 按注册后 59 条断言（pl_ 56+core 3）；新键 est→实测实长回填
（真值源 F:/Cache/temp/r4789_clip_ms.json，mutagen 口径）；CH_N/REL_PLAN/rel 流 9973/
星星拒绝/playCard 分流/CARD_WIN_REL/WRONG_CHAIN_REL/RULER_FADE_MS/wide 布局新锚不变。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch37/plant/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（r47 段二注册后 pl_ 56 条 + core_* 3 条 = 59，manifest 5517 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('plant') 全量返回（manifest games 已含 plant 的
# core_* 3 条自动带上，2026-09-12 实查）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('plant')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：r47 段二注册后 59 条（pl 6 + pl_q 36 + pl_rel/mv 14 + core 3）
PL_KEYS = ['pl_tut_watch', 'pl_tut_turn', 'pl_ask', 'pl_hint', 'pl_right', 'pl_wrong']
PL_Q_KEYS = ['pl_q_%d_%d' % (r, c) for r in range(1, 7) for c in range(1, 7)]   # T46+r47：程序卡句 6×6=36 键
PL_REL_MV_KEYS = ['pl_rel_from', 'pl_rel_hint'] + \
    ['pl_mv_%s%d' % (d, s) for d in 'rdlu' for s in (1, 2, 3)]                  # r47：rel 卡句链 14 键
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in PL_KEYS + PL_Q_KEYS + PL_REL_MV_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 59, 'clips 条数 %d != 59（pl 6 + pl_q 36 + pl_rel/mv 14 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 pl_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('pl_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 pl_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('pl_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'plant'" in main, 'main 缺 KIDS.init plant（存档键 kidsgame_plant）'
assert 'window.PL =' in main, 'main 缺 PL 钩子'
assert '__plDemoR' in main, 'main 缺教学演示实证 __plDemoR'
assert '__plTutSolo' in main, 'main 缺教学帮→独实证 __plTutSolo'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非网格进度）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本款常量锚（SPEC-BATCH37 §0.89：abs 坐标=mulberry32(flat*7919+737+qi*131) 逐题独立——
# 本款 abs 流常量 737 v1 原样；SPEC-R47 §R3：rel 独立流常量 9973）
assert 'flat * 7919 + 737 + qi * 131' in engine, 'engine 缺本款常量 seed 737 逐题独立流（SPEC §0.89）'
assert 'flat * 7919 + 9973 + qi * 131' in engine, 'engine 缺 rel 流常量 9973（r47 §R3）'
# r47 章谱（SPEC-R47 §R2：CH_N 网格档 3/4/5/6 + REL_PLAN rel 题位——verify ⑨ 同字面断言）
assert 'const CH_N = { 1: 3, 2: 4, 3: 5, 4: 6 }' in data, 'data 缺 CH_N 网格档表（r47 δ1）'
assert 'const REL_PLAN = { 1: [], 2: [1, 3], 3: [1, 3], 4: [0, 2, 4] }' in data, 'data 缺 REL_PLAN 章谱（r47 δ3）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(gridEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.plant.tutSeen）
assert 'sv.plant && sv.plant.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=5082 / r47 rel 6219）+
# 救援 interval 守卫 + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 5082' in data, 'data 缺错链豁免窗常量 5082（SPEC §4）'
assert 'const WRONG_CHAIN_REL = 6219' in data, 'data 缺 rel 错链豁免窗常量 6219（r47 §R7）'
assert 'wrongChainUntil = Date.now() + (q.mode === ' + "'rel'" + ' ? WRONG_CHAIN_REL : WRONG_CHAIN_WIN)' in main, \
    'main 缺错反馈链豁免窗赋值（r47 按题型分流三元，契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== tgt' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）；flat<3（含教学 -1）每错必播
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播分支（契约 J）'
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.89/§2 本款特化：已种格=树苗轻摇拒绝（家族 D 变体，不计 miss）+ 方向级标尺高亮
assert "replayAnim(cellAt(i), 'shake')" in main, 'main 缺已种格树苗轻摇（SPEC §2 家族 D 变体）'
assert 'function litRulers(q)' in main, 'main 缺方向级标尺高亮 litRulers（SPEC §2 不泄答案）'
# T46 化（2026-09-19）+ r47 分流（SPEC-R47 §R4）：程序卡句 abs=play(cardClip) /
# rel=queue 3 clip 链——playCard(q) 统一分流，开题+重听两处调用（原
# KIDS.voice.play(cardClip(q), cardText(q)) ×2 字面由 r47 有意变更）
assert "const playCard = q => q.mode === 'rel'" in main, 'main 缺 playCard 分流定义（r47 §R4）'
assert main.count('playCard(q);') == 2, \
    'main 程序卡句 playCard(q) 调用应 2 处（开题+重听），实得 %d' % main.count('playCard(q);')
assert 'KIDS.voice.say(cardText(q))' not in main, 'main 程序卡句仍残留 keyless say'
assert "const cardClip = q => 'pl_q_' + q.row + '_' + q.col" in data, 'data 缺 cardClip 键函数（T46 pl_q）'
assert 'const relClips = q => [REL_FROM_KEY]' in data, 'data 缺 relClips 链函数（r47 §R4）'
# 零 keyless 政策：main/verify 不得含 key 空缺段字面（含注释措辞亦禁）
for _n, _f in (('main', main), ('verify', verif)):
    assert 'key: null' not in _f and 'key:null' not in _f, 'game-%s 含 key 空缺带 text 的 TTS 段字面（零 keyless 政策）' % _n
# SPEC §0.89 演出时序常量：ask 窗 2172/卡句窗 3315/判对窗 1100+1300/全景窗 2400
for frag in ('const ASK_WIN = 2172', 'const CARD_WIN = 3315',
             'const GROW_MS = 1100, PLANT_TAIL = 1300', 'const GARDEN_WIN = 2400'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
assert 'lastReplayAt < 3000' in main, 'main 缺重听 3s 节流'
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapCell 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapCell 演出期 null）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素。本款程序卡句走 voice.say 非队列链（SPEC §2 明示，
# 承 b36 N 括注防误伤），确认链 ['pl_right'] 单 clip——main/verify 若出现
# { key: null } 段仍须居链尾（本款预期零处，循环零次通过）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH37 §4 实长表）=====
PL_WATCH, PL_TURN = 3072, 1824                  # pl_tut_watch / pl_tut_turn 实长
PL_ASK, PL_HINT, PL_RIGHT, PL_WRONG = 1872, 2568, 1944, 2064  # 实长
# T46+r47 化：程序卡句 36 键实长 python 双录（verify SPEC_PL_Q 同值——防漂）；
# r4_5..r6_6 新 20 键为段二实测回填（F:/Cache/temp/r4789_clip_ms.json，mutagen 口径）；
# worst=2184（pl_q_4_4 在册旧键——新 20 键 max 2160）
PL_Q_DUR = { (1,1):1992,(1,2):1992,(1,3):2064,(1,4):2064,(1,5):2040,(1,6):2064,
             (2,1):1944,(2,2):1992,(2,3):2064,(2,4):2064,(2,5):2040,(2,6):2040,
             (3,1):2088,(3,2):2088,(3,3):2160,(3,4):2160,(3,5):2112,(3,6):2136,
             (4,1):2064,(4,2):2112,(4,3):2136,(4,4):2184,(4,5):2112,(4,6):2160,
             (5,1):1992,(5,2):2016,(5,3):2064,(5,4):2112,(5,5):2016,(5,6):2064,
             (6,1):2040,(6,2):2040,(6,3):2112,(6,4):2136,(6,5):2088,(6,6):2112 }
PL_Q_WORST = max(PL_Q_DUR.values())
assert PL_Q_WORST == 2184, 'pl_q worst %d != 2184（表漂移）' % PL_Q_WORST
# ① 确认链（判对单 clip pl_right）→ 演出窗 1100+1300=2400 ≥ 1944+300=2244（SPEC §4）
assert 'GROW_MS * SPEED' in main and 'PLANT_TAIL * SPEED' in main, 'main 缺判对演出窗 1100+1300（家族 G/H）'
assert 1100 + 1300 >= PL_RIGHT + 300, \
    '判对演出窗 2400 < 确认链 %d+300' % (PL_RIGHT + 300)
# ② 错反馈链豁免窗（契约 I）：abs 错链=wrong 2064+150+hint 2568+300=5082（SPEC §4 精确值，
#    三键全在册实测——段二复核不变）；rel 错链 6219=est 上界设计口径（2064+150+3705+300）
#    ≥ 实测 2064+150+2928+300=5442（段二实测复核，窗不调余 777ms——r24 宁等勿叠）
REL_HINT_EST = 9 * 345 + 600      # pl_rel_hint「从星星开始，数着走」9 字 estMs 上界（设计口径）
REL_HINT_MS = 2928                # pl_rel_hint 实测实长（mutagen 真值源，段二回填）
assert 5082 == PL_WRONG + 150 + PL_HINT + 300, '链豁免窗 5082 != 错链 %d+150+%d+300' % (PL_WRONG, PL_HINT)
assert 6219 == PL_WRONG + 150 + REL_HINT_EST + 300, \
    'rel 链豁免窗 6219 != 错链 %d+150+est(%d)+300' % (PL_WRONG, REL_HINT_EST)
assert 6219 >= PL_WRONG + 150 + REL_HINT_MS + 300, \
    'rel 链豁免窗 6219 < 实测错链 %d+150+%d+300（段二实测复核）' % (PL_WRONG, REL_HINT_MS)
assert '(q._miss === 1 ? 2214 : 1000) * SPEED' in main, \
    'main 缺错链主窗三元（b37 审查 R3 首错 2214=wrong 2064+150 收窄 / miss≥2 防重入 1000）'
# ③ 开题窗（ASK_WIN=2172 精确=CARD 前段；CARD_WIN=3315=§4 实长表值 ≥ estMs(6)+300=2970——家族 T/H；
#    r47 CARD_WIN_REL 6900 ≥ rel 链 est 2325+150+1980+150+1980+300=6885 宁等勿叠 r24 口径；
#    段二实测复核：实测链 1920+150+1920+150+1920+300=6360 ≤ 6900 余 540ms——窗不调，
#    est 上界保留为设计口径（§R7 双口径注记））
REL_FROM_EST, PL_MV_EST = 5 * 345 + 600, 4 * 345 + 600   # pl_rel_from 5 字 / pl_mv_* 4 字 est（设计口径）
REL_FROM_MS, PL_MV_MS_MAX = 1920, 1920    # pl_rel_from / pl_mv worst 实测实长（mutagen 真值源，段二回填）
assert 2172 == PL_ASK + 300, 'ask 窗 2172 != pl_ask %d+300' % PL_ASK
assert 3315 >= PL_Q_WORST + 300, '卡句窗 3315 < clip worst %d+300（T46 口径）' % PL_Q_WORST
assert 6900 >= REL_FROM_EST + 150 + PL_MV_EST + 150 + PL_MV_EST + 300, \
    'rel 卡句链窗 6900 < est 链 %d+150+%d+150+%d+300' % (REL_FROM_EST, PL_MV_EST, PL_MV_EST)
assert 6900 >= REL_FROM_MS + 150 + PL_MV_MS_MAX + 150 + PL_MV_MS_MAX + 300, \
    'rel 卡句链窗 6900 < 实测链 %d+150+%d+150+%d+300（段二实测复核）' % (REL_FROM_MS, PL_MV_MS_MAX, PL_MV_MS_MAX)
assert 'const CARD_WIN_REL = 6900' in data, 'data 缺 rel 卡句链窗常量（r47 §R7）'
assert 'CARD_WIN_REL * SPEED' in main, 'main 缺 rel 卡句链窗驱动（r47）'
assert 'ASK_WIN * SPEED' in main and 'CARD_WIN * SPEED' in main, 'main 缺开题窗常量驱动'
# ③b 关末全景窗（GARDEN_WIN=2400 ≥ pl_right 1944+300——纯演出层罩 winFlow 重播）
assert 2400 >= PL_RIGHT + 300, '全景窗 2400 < %d+300' % PL_RIGHT
assert 'GARDEN_WIN * SPEED' in main, 'main 缺关末全景窗驱动'
# ④ 教学演示延窗（watch 3072+300=3372 / turn 1824+300=2124 防尾截）
assert 'await wait(3372 * SPEED)' in main, 'main 缺教学 watch 延 3372（pl_tut_watch 3072+300）'
assert 'await wait(2124 * SPEED)' in main, 'main 缺教学 turn 延 2124（pl_tut_turn 1824+300）'
assert 3372 >= PL_WATCH + 300 and 2124 >= PL_TURN + 300
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（pl_right 1944）'
assert 2620 + 400 >= PL_RIGHT + 300, 'celebrate 2620+400=3020 < pl_right 1944+300=2244'
# ⑤ T46 化：estMs TTS 估长退役（卡句全 clip 化后 main 无消费者——禁死代码留存）
assert 'const estMs' not in main, 'main 仍含 estMs 定义（T46 退役——注释提及不禁，定义禁）'
# ⑥ verify 页 T46+r47 素材在场（运行时对账，build 只验结构存在）
assert 'SPEC_PL_Q' in verif and '__lastVoiceKey' in verif and 'specQWorst' in verif,     'verify 缺 SPEC_PL_Q/__lastVoiceKey/specQWorst 动态断言素材（T46）'
assert 'SPEC_NUMCN' in verif, 'verify 缺 NUMCN 独立双录素材（契约 L）'
assert 'SPEC_REL_PLAN' in verif and 'specRel' in verif and 'specLevel' in verif, \
    'verify 缺 r47 双流独立复算素材（SPEC_REL_PLAN/specRel/specLevel——§R3 对账锚）'
assert 'SPEC_CHAPTER_HINTS' in verif and 'SPEC_GEN_HINTS' in verif, 'verify 缺章末文案双录素材（r47 §R4）'

# ===== 契约 L：NUMCN 表 1-6 全量（程序卡行列封闭集——r47 扩 5/6 域，SPEC-R47 §R4）=====
NUMCN_EXP = {1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六'}
for k, v in NUMCN_EXP.items():
    assert '%d: ' % k in data and "'%s'" % v in data, 'game-data NUMCN 缺 %d→%s（契约 L 全量）' % (k, v)
assert "NUMCN[q.row]" in data and "NUMCN[q.col]" in data, 'data cardText 缺 NUMCN 取值（契约 L）'

# ===== r47 新锚：星星徽章/标尺闪现/wide 布局/rel 错链第二段（SPEC-R47 §R1-§R8）=====
assert 'if (q.mode === ' + "'rel'" + ' && i === starIdx(q)) return false;' in engine, \
    'engine 缺星星格拒绝（r47 家族 D 变体——探索不罚）'
assert 'function setStar(q)' in main and 'function starPulse(q)' in main, 'main 缺星星生命周期函数（r47 δ3）'
assert "classList.toggle('wide', q.n >= 5)" in main, 'main 缺 wide 布局开关（r47 δ1）'
assert 'const RULER_FADE_MS = 1200' in data, 'data 缺标尺淡出常量（r47 δ2）'
# r47-fix M1/M2 防回归锚（审查修复轮）：M1=徽章 span 随星拆除；M2=淡出延迟只算 RULER_FADE_MS 段
# （注册点已在卡亮 ask 窗 await 后——禁式 (ASK_WIN + RULER_FADE_MS) 回流=ASK_WIN 双重计入复发）
assert "querySelector('.starbadge');" in main and 'if (b) b.remove();' in main, \
    'main 缺星星徽章拆除（r47-fix M1：残留金星盖树苗/标后题答案格）'
assert 'RULER_FADE_MS * SPEED);' in main, 'main 缺淡出延迟字面 RULER_FADE_MS * SPEED（r47-fix M2）'
assert '(ASK_WIN + RULER_FADE_MS)' not in main, 'r47-fix M2 禁式回流：ASK_WIN 双重计入淡出延迟'
assert 'REL_HINT_KEY' in main, 'main 缺 rel 错链第二段键引用（r47）'
assert 'starIdx' in data or 'starIdx' in engine, 'starIdx 索引函数缺失（r47）'
assert 'data-anim="star"' in data, 'game-data 星星 SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
for css in ('#game.wide #garden', 'rulers-off', 'starbadge', 'star-beat'):
    assert css in head, 'head 缺 r47 CSS 锚 %r' % css

# ===== r47 DESIGN_KEYS 34 键三源对账（SPEC-R47 §R6：本表/SPEC §R6 表/此断言逐集合相等）=====
_m = re.search(r'const DESIGN_KEYS = \{(.*?)\};', data, re.S)
assert _m, 'data 缺 DESIGN_KEYS 键表（r47 §R6 三源一致锚）'
_dk = set(re.findall(r'(pl_[a-z0-9_]+):', _m.group(1)))
_dk_exp = {'pl_rel_from', 'pl_rel_hint'}
_dk_exp |= {'pl_mv_%s%d' % (d, s) for d in 'rdlu' for s in (1, 2, 3)}
_dk_exp |= {'pl_q_%d_%d' % (r, c) for r in range(1, 7) for c in (5, 6)}
_dk_exp |= {'pl_q_%d_%d' % (r, c) for r in (5, 6) for c in range(1, 7)}
assert len(_dk) == 34 and _dk == _dk_exp, \
    'DESIGN_KEYS 34 键对账失败：实得 %d 键，差集 %s' % (len(_dk), sorted(_dk ^ _dk_exp)[:10])
for _k in sorted(_dk):
    assert '"%s"' % _k in clips, '段二对账失败：设计键 %s 未在册 clips（主线注册 34 键应有尽有）' % _k

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/渲染/演出三层）=====
for lit in ('dataset.i', 'data-anim', 'classList.contains(\'empty\')', 'classList.contains(\'tree\')',
            '__plVlog'):
    assert lit in verif, 'verify 缺帧内容断言素材 %r（契约 M）' % lit
assert 'data-anim="tree"' in data, 'game-data 树苗 SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.cell[data-i=" in main, 'main 缺格子相位选择器（契约 M）'
assert 'gridEl.dataset.n' in main, 'main 缺网格边数 DOM 锚（契约 M 渲染即引擎）'

# ===== b36 M1 强制项：verify 独立第 4 script 块 + verify ⑨ 读 script[2] 素材在场 =====
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面'

# ===== 教学链 watch 预算分账（≤16s，单步演示款口径——SPEC §4 验算+T46 clip 口径）=====
# tutorialWatch watch 段名义分账：watch 延 3372（≥3072+300）+ 开题 ask 窗 2172（≥1872+300）
# + 卡句窗 3315（≥ clip worst 2184+300=2484——T46 化后口径，窗不动）+ ghost 移入 800
# + press 320 + demo 演出窗 1100+1300（罩确认链 pl_right 1944+300=2244）= 12379 ≤ 16000
TUT_SUM = 3372 + 2172 + 3315 + 800 + 320 + 1100 + 1300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3372 * SPEED', 'ASK_WIN * SPEED', 'CARD_WIN * SPEED', '800 * SPEED', '320 * SPEED',
            'GROW_MS * SPEED', 'PLANT_TAIL * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>植树程序</title>' in head, 'head 缺标题 植树程序'

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
print('window check: confirm chain %d+300=%d <= 2400 right-win; '
      'wrong-chain abs 5082 (exact) / rel 6219 (est) >= measured 5442; ask-win 2172=%d+300; '
      'card-win 3315 >= pl_q worst %d+300 (T46 clip) / rel-chain 6900 >= est 6885 '
      '>= measured 6360; tut-budget %dms <= 16000; clips 59 (r47 34 design keys registered)' %
      (PL_RIGHT, PL_RIGHT + 300, PL_ASK, PL_Q_WORST, TUT_SUM))
