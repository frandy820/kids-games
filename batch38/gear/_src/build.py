# -*- coding: utf-8 -*-
"""gear 齿轮转起来 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch38/gear/_src/build.py
布局（b36 M1 强制项，三款断言对称）：script[0]=core / script[1]=clips / script[2]=纯
data+engine+main（无 verify 字面）/ script[3]=verify 独立第 4 块——verify ⑨ 源码断言读
script[2] 恢复判别力。
v3 难度升档（r3 2026-09-13）：双答制+齿数制 5 档去恒等+传动比+双驱动冲突——
断言同步 v3（新 clip 2 条/新窗常量/三判据字面/教学两步分账）。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch38/gear/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（gr_ 11 条（v3 +2 / T46 阶段2 题面观察句 +4） + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('gear') 全量返回（manifest games 已含 gear 的
# core_* 3 条自动带上，2026-09-12 实查）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('gear')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：gr_ 11 条（v3+T46 题面观察句 4）+ core 3 条 = 14 条（SPEC-BATCH38 §3 v3/§4）
# 前缀=gr_ 已核 manifest 无占用（b28 立规先查，2026-09-12 实查；v3 新增
# gr_dir_wrong/gr_speed_wrong 2026-09-13 实查无占用；T46 新增 gr_obs_1..4 2026-09-19 实查无占用）
GR_KEYS = ['gr_tut_watch', 'gr_tut_turn', 'gr_hint', 'gr_right', 'gr_wrong',
           'gr_dir_wrong', 'gr_speed_wrong',
           'gr_obs_1', 'gr_obs_2', 'gr_obs_3', 'gr_obs_4']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in GR_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 14, 'clips 条数 %d != 14（gr 11 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 gr_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('gr_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 gr_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('gr_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'gear'" in main, 'main 缺 KIDS.init gear（存档键 kidsgame_gear）'
assert 'window.GR =' in main, 'main 缺 GR 钩子'
assert '__grDemoR' in main, 'main 缺教学演示实证 __grDemoR'
assert '__grTutSolo' in main, 'main 缺教学帮→独实证 __grTutSolo'
# v3 双答制：阶段1 钩子 tapDir（verify ⑫ 断言函数存在——build 先静态锚）
assert 'tapDir(d) { return uiTapDir(d); }' in main, 'main 缺 GR.tapDir 钩子（v3 阶段1）'
assert 'function uiTapDir(d, demo)' in main, 'main 缺阶段1 判定路径 uiTapDir'
assert 'function engTapDir(L, d)' in engine, 'engine 缺阶段1 引擎 engTapDir'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非机器进度）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本款常量锚（SPEC-BATCH38 §0.93：生成关 dch=ri(rnd,1,4)，mulberry32(flat*7919+847)——seed 847）
assert 'flat * 7919 + 847' in engine, 'engine 缺本款常量 seed 847（SPEC §0.93）'
assert 'ri(rnd, 1, 4)' in engine, 'engine 缺生成关 dch 策略 ri(rnd,1,4)（b33 硬性②显式声明）'
# 转向律字面（SPEC §0.93 数学锚——verify 独立复算依据）
assert "k % 2 === 0 ? 'cw' : 'ccw'" in engine, 'engine 缺转向律 k%2 字面（SPEC §0.93）'
# v3 三判据字面：冲突律（双驱两路奇偶）+传动比（齿少者恒快）+转速周期常量
assert '(k % 2) !== ((n - 1 - k) % 2)' in engine, 'engine 缺冲突律字面（v3 SPEC §3）'
assert "=== row.need ? 'same' : 'small'" in engine, 'engine 缺传动比律字面（v3 SPEC §3）'
assert 'const TOOTH_MS = 70' in data, 'data 缺转速周期常量 TOOTH_MS=70（传动比可视化）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump（v3 双答：wall+scene 两容器）
assert "replayAnim(wallEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
assert "replayAnim(sceneEl, 'bump')" in main, 'main 缺阶段1 预判行 bump（家族 D——v3）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.gear.tutSeen）
assert 'sv.gear && sv.gear.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量三链——尺寸 4962/转向 5538/快慢 5442）
# + 救援 interval 守卫 + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 4962' in data, 'data 缺尺寸错链豁免窗常量 4962（SPEC §4）'
assert 'const DIR_CHAIN_WIN = 5538' in data, 'data 缺转向错链豁免窗常量 5538（v3 SPEC §4）'
assert 'const SPEED_CHAIN_WIN = 5442' in data, 'data 缺快慢错链豁免窗常量 5442（v3 SPEC §4）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺尺寸错链豁免窗赋值（契约 I）'
assert 'wrongChainUntil = Date.now() + chainWin' in main, 'main 缺阶段1 错链豁免窗赋值（契约 I——v3）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && d !== q.dirAns' in main, \
    'main 缺阶段1 豁免窗 guard（I 补 v3：错答吞/对答放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）；flat<3（含教学 -1）每错必播
# ——写法恒 cur.flat < 3（b36 m3+b37 R1 两起教训）
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播分支（契约 J 写法恒 cur.flat < 3）'
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §3 v3 本款特化：方向级=高亮相邻已固定齿轮（litNeighbors 不泄答案）+
# 判定槽开口=需求齿数直径（几何匹配）+ 题面句 clip 播报 + 阶段1 答对钉住
assert 'function litNeighbors(q)' in main, 'main 缺方向级相邻高亮 litNeighbors（SPEC §3 不泄答案）'
assert 'KIDS.voice.play(q.obsKey, q.obs)' in main, 'main 缺题面句 clip 播报（T46 阶段2 gr_obs_ 章档键）'
assert "classList.add('meshed', 'pop')" in main, 'main 缺齿轮咬合 meshed 落位（SPEC §3）'
assert 'chainSpin(q)' in main, 'main 缺全链联动预演 chainSpin（SPEC §3 教学核心）'
assert "classList.add('jammed')" in main, "main 缺冲突锁死演出 jammed（v3 SPEC §3）"
assert "pin.classList.add('show')" in main, 'main 缺阶段1 答对钉住 pindir（v3 SPEC §3）'
# SPEC §0.93/§3 v3 演出时序常量：判对窗 1100+1500 / 全速窗 2400 / 三链窗 / 三首错锁
for frag in ('const MESH_MS = 1100, CHAIN_MS = 1500', 'const FULL_WIN = 2400',
             'const WRONG_CHAIN_WIN = 4962', 'const WRONG_LOCK_1 = 2334',
             'const DIR_CHAIN_WIN = 5538', 'const DIR_LOCK_1 = 2910',
             'const SPEED_CHAIN_WIN = 5442', 'const SPEED_LOCK_1 = 2814',
             'const SPIN_STEP = 180', 'const DIR_OK_MS = 500'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
assert 'lastReplayAt < 3000' in main, 'main 缺重听 3s 节流'
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapDir/tapGear 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapX 演出期 null）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素。本款题面句走 voice.say 非队列链（SPEC §3 明示，
# 承 b36/b37 N 括注防误伤），确认链 ['gr_right'] 单 clip——main/verify 若出现
# { key: null } 段仍须居链尾（本款预期零处，循环零次通过）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH38 §4 实长表 v3）=====
est_ms = lambda n: n * 345 + 600
GR_WATCH, GR_TURN = 3024, 1776                  # gr_tut_watch / gr_tut_turn 实长
GR_HINT, GR_RIGHT, GR_WRONG = 2328, 2088, 2184  # 实长
GR_DIR_WRONG, GR_SPEED_WRONG = 2760, 2664       # v3 实长（ffprobe 2026-09-13）
# ① 确认链（判对单 clip gr_right）→ 演出窗 1100+1500=2600 ≥ 2088+300=2388（SPEC §4）
assert 'MESH_MS * SPEED' in main and 'CHAIN_MS * SPEED' in main, 'main 缺判对演出窗 1100+1500（家族 G/H）'
assert 1100 + 1500 >= GR_RIGHT + 300, \
    '判对演出窗 2600 < 确认链 %d+300' % (GR_RIGHT + 300)
# ② 错反馈链豁免窗（契约 I）三链算式（SPEC §4 精确值）：
#    尺寸=wrong 2184+150+hint 2328+300=4962 / 转向=dir_wrong 2760+150+2328+300=5538
#    / 快慢=speed_wrong 2664+150+2328+300=5442
assert 4962 == GR_WRONG + 150 + GR_HINT + 300, '尺寸链豁免窗 4962 != 错链 %d+150+%d+300' % (GR_WRONG, GR_HINT)
assert 5538 == GR_DIR_WRONG + 150 + GR_HINT + 300, '转向链豁免窗 5538 != %d+150+%d+300' % (GR_DIR_WRONG, GR_HINT)
assert 5442 == GR_SPEED_WRONG + 150 + GR_HINT + 300, '快慢链豁免窗 5442 != %d+150+%d+300' % (GR_SPEED_WRONG, GR_HINT)
# 首错演出锁收窄（b37 R3：锁=clip+150 ≤ 各自豁免窗——留对选放行活跃段）
assert 2334 == GR_WRONG + 150, '尺寸首错锁 2334 != wrong %d+150' % GR_WRONG
assert 2910 == GR_DIR_WRONG + 150, '转向首错锁 2910 != dir_wrong %d+150' % GR_DIR_WRONG
assert 2814 == GR_SPEED_WRONG + 150, '快慢首错锁 2814 != speed_wrong %d+150' % GR_SPEED_WRONG
assert '(q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED' in main, \
    'main 缺尺寸错链主窗三元（b37 R3 首错 2334 收窄 / miss≥2 防重入 1000）'
assert 'const lock = q._miss === 1 ? lock1 : WRONG_LOCK_2;' in main and 'lock * SPEED' in main, \
    'main 缺阶段1 错链主窗三元（v3：dir 2910/speed 2814 按题型分流——lock 中间变量式）'
# b38 R1 总窗口径（审查 M1）：锁表达式禁叠尾窗常数——SPEED=1 实锁须=2334 顶格（2474 越界防回归）
assert '(q._miss === 1 ? WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED + 140' not in main, \
    '首错锁叠 +140 尾窗（总窗 2474 > wrong+150=2334 越界——b38 审查 M1）'
assert 'lock * SPEED + 140' not in main, \
    '阶段1 首错锁叠 +140 尾窗（v3 同款 R1 总窗口径防回归）'
# ③ 题面句窗（家族 T：estMs(全字符)+300——ch1/2/4 八十字句 / ch3 七字句 3315）
assert est_ms(8) + 300 == 3660 and est_ms(10) + 300 == 4350 and est_ms(7) + 300 == 3315
assert '看一看手柄往哪转' in data and len('看一看手柄往哪转') == 8, 'ch1 题面句须 8 字（窗 3660=estMs(8)+300）'
assert '猜猜这个轮子往哪边转' in data and len('猜猜这个轮子往哪边转') == 10, 'ch2 题面句须 10 字（窗 4350）'
assert '哪个齿轮转得快' in data and len('哪个齿轮转得快') == 7, 'ch3 题面句须 7 字（窗 3315=estMs(7)+300——v3）'
assert '这个轮子转得动吗' in data and len('这个轮子转得动吗') == 8, 'ch4 题面句须 8 字（窗 3660）'
assert 'obsWin: 3660' in data and 'obsWin: 4350' in data and 'obsWin: 3315' in data, \
    'data 缺题面句窗常量 3660/4350/3315（家族 T）'
# ③b 关末全速窗（FULL_WIN=2400 ≥ gr_right 2088+300——纯演出层罩 winFlow 重播）
assert 2400 >= GR_RIGHT + 300, '全速窗 2400 < %d+300' % GR_RIGHT
assert 'FULL_WIN * SPEED' in main, 'main 缺关末全速窗驱动'
# ④ 教学演示延窗（watch 3024+300=3324 / turn 1776+300=2076 防尾截）
assert 'await wait(3324 * SPEED)' in main, 'main 缺教学 watch 延 3324（gr_tut_watch 3024+300）'
assert 'await wait(2076 * SPEED)' in main, 'main 缺教学 turn 延 2076（gr_tut_turn 1776+300）'
assert 3324 >= GR_WATCH + 300 and 2076 >= GR_TURN + 300
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（gr_right 2088）'
assert 2620 + 400 >= GR_RIGHT + 300, 'celebrate 2620+400=3020 < gr_right 2088+300=2388'
# ⑤ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑥ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '__lastSayText' in verif, 'verify 缺 estMs/__lastSayText 动态断言'
assert 'specTable' in verif, 'verify 缺 SPEC 20 题表独立双录素材（specTable）'
assert 'specDirAnsOf' in verif, 'verify 缺阶段1 真值独立重列副本（specDirAnsOf——v3）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/渲染/演出三层）=====
for lit in ('dataset.k', 'data-anim', "classList.contains('meshed')", 'dataset.dir',
            '__grVlog', "'.slot.jammed'", 'animationDirection', '--dur'):
    assert lit in verif, 'verify 缺帧内容断言素材 %r（契约 M——v3 含转向视觉对账/传动比）' % lit
assert 'data-anim="gear"' in data, 'game-data 齿轮 SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-anim="wind"' in data, 'game-data 风车 SVG 缺 data-anim 锚（契约 M）'
assert "querySelector('.slot[data-k=" in main, 'main 缺槽位相位选择器（契约 M）'
assert 'wallEl.dataset.n' in main, 'main 缺机器墙槽数 DOM 锚（契约 M 渲染即引擎）'

# ===== b36 M1 强制项：verify 独立第 4 script 块 + verify ⑨ 读 script[2] 素材在场 =====
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面'

# ===== 教学链 watch 预算分账（≤16s，单步演示款口径——v3 双答两步演示：
# watch 延 3324（≥3024+300）+ 开题题面句窗 3660（=estMs(8)+300）+ ghost① 移入 800+
# press 320 + dir 答 'ok' 短锁 DIR_OK_MS 500 + ghost② 移入 800+press 320 + demo
# 演出窗 1100+1500（罩确认链 gr_right 2088+300=2388）= 12324 ≤ 16000 =====
TUT_SUM = 3324 + 3660 + 800 + 320 + 500 + 800 + 320 + 1100 + 1500
assert TUT_SUM == 12324 and TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3324 * SPEED', 'obsWin * SPEED', '800 * SPEED', '320 * SPEED',
            'DIR_OK_MS * SPEED', 'MESH_MS * SPEED', 'CHAIN_MS * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>齿轮转起来</title>' in head, 'head 缺标题 齿轮转起来'

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
print('estMs check: confirm chain %d+300=%d <= 2600 mesh-win; '
      'wrong-chain 4962 / dir-chain 5538 / speed-chain 5442 (exact); '
      'first-wrong-locks 2334/2910/2814 (b37 R3); obs-win 3660/4350/3315; '
      'tut-budget %dms <= 16000' % (GR_RIGHT, GR_RIGHT + 300, TUT_SUM))
