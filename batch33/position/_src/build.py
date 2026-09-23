# -*- coding: utf-8 -*-
"""position 方位词图阵 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch33/position/_src/build.py"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch33/position/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
VOICE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice')
CLIPS_DIR = VOICE / 'clips'

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（ps_ 36 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, str(VOICE))
    from inject_clips import clips_js
    clips = clips_js('position')          # ps_ 36 条（manifest games 含 position，r44 注册后）
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# core 3 条自适应注入：manifest 的 core_* games 是否已登记 position 由并行批协调决定
# （两种状态都合法）——已含则 clips_js 直出，未含才按 key 直读 mp3 追加（不改共享 manifest）
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
_extra = []
for _k in CORE_KEYS:
    if '"%s"' % _k in clips: continue          # manifest 已登记 position，跳过防重复注入
    _p = CLIPS_DIR / (_k + '.mp3')
    assert _p.exists() and _p.stat().st_size >= 800, 'core clip 缺失或过小: %s' % _k
    _b = base64.b64encode(_p.read_bytes()).decode('ascii')
    assert '</script' not in _b
    _extra.append('%s:"data:audio/mpeg;base64,%s"' % (json.dumps(_k), _b))
if _extra:
    assert clips.count('};/*CLIPS-END*/') == 1, 'CLIPS-END 标记异常'
    clips = clips.replace('};/*CLIPS-END*/', ', ' + ','.join(_extra) + '};/*CLIPS-END*/')
# clips 注入断言：ps_ 36 条（通用 7+名音×6+T46 place×6+ya 1+r44 新键 16）+ core 3 条 = 39 条
# 前缀=ps_ 已核 manifest 无占用（b28 撞前缀双事故立规：新批前缀先查）
# r44 段二销账（2026-09-22）：16 新键已由主线注册（manifest 5350→5459，ok=16 fail=0），
# 原「23→39+PS_KEYS 扩 16 联动 TODO」已执行；game-verify ⑫ psKeys/SPEC_DUR 同步 39
PS_POS = ['front', 'back', 'left', 'right', 'up', 'down']
PS_KEYS = ['ps_tut_watch', 'ps_tut_turn', 'ps_hint', 'ps_right', 'ps_wrong',
           'ps_q1', 'ps_q2'] + ['ps_n_' + p for p in PS_POS] + \
          ['ps_place_' + p for p in PS_POS] + ['ps_ya'] + \
          ['ps_dual_' + k for k in ('lu', 'dr', 'ru', 'dl')] + \
          ['ps_flip_' + p for p in PS_POS] + ['ps_fy_' + p for p in PS_POS]
          # T46 阶段2 全句 6+「呀」尾段；r44 段二新键 16=dual 4+flip 6+fy 6（SPEC-R44 §R7 已注册）
for k in PS_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 39, 'clips 条数 %d != 39（ps 36 + core 3；r44 16 键注册后口径）' % n_clips
# 注入键前缀对账：只允许 ps_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('ps_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 ps_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('ps_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'position'" in main, 'main 缺 KIDS.init position（存档键 kidsgame_position）'
assert 'window.PS =' in main, 'main 缺 PS 钩子'
assert '__psDemoR' in main, 'main 缺教学演示实证 __psDemoR'
# 本款常量锚（SPEC-BATCH33 §0.80：seeded mulberry32(flat*7919+977)——本款常量 position=977）
assert 'flat * 7919 + 977' in engine, 'engine 缺本款常量 seed 977（SPEC §0.80）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(sceneEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.position.tutSeen）
assert 'sv.position && sv.position.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
# 窗=4970：SPEC §4 算式 1656+150+2856+300=4962 契约下界（任务书 4960 为舍入口径，取 4970 覆盖下界）
assert 'wrongChainUntil = Date.now() + 4970' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=4970'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补（b31 定版）：豁免窗错点吞/对选放行/窗后二错照计 miss（guard 挂 uiTapCell 取 q 后）
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# §0.80 家族梯度：miss≥2=正确格 breathe（答案级）
assert 'q._miss >= 2' in main, 'main 缺 miss≥2 正确格 breathe（答案级梯度）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，名音/clip 段禁置于其后），防后代批再踩。
# T46 阶段2 化后本款语音全 clip：零 keyless 政策（出现即 fail，比居尾更强的门禁）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert 'key: null' not in _s and 'key:null' not in _s, \
        'game-%s 出现 keyless 段（T46 化后零 keyless 政策）' % _src_name

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版：窗 ≥ estMs(最长句)/链实长）=====
# estMs 口径（b25 定版，家族 T 全字符）：SAPI ~345ms/字 + 600 落定余量（n×345+600）
est_ms = lambda n: n * 345 + 600
# TTS 封闭表（契约 L）：六方位全句式双表（指令 9 字/确认句 8 字）——表模板与独立串双断言
for p, cmd, conf in [('front', '把兔子放到树的前面', '兔子在树的前面呀'),
                     ('back', '把兔子放到树的后面', '兔子在树的后面呀'),
                     ('left', '把兔子放到树的左边', '兔子在树的左边呀'),
                     ('right', '把兔子放到树的右边', '兔子在树的右边呀'),
                     ('up', '把兔子放到树的上面', '兔子在树的上面呀'),
                     ('down', '把兔子放到树的下面', '兔子在树的下面呀')]:
    assert len(cmd) == 9, 'TTS 指令 %s 应 9 字' % cmd
    assert len(conf) == 8, '确认句 %s 应 8 字' % conf
    assert "'%s'" % cmd in verif, 'verify 缺 TTS 指令独立串 %s（契约 L 对账）' % cmd
    assert "'%s'" % conf in verif, 'verify 缺确认句独立串 %s（契约 L 对账）' % conf
assert "'把兔子放到树的' + POS_NAME[p]" in data, 'game-data 缺 PLACE_TTS 表构建（契约 L）'
assert "'兔子在树的' + POS_NAME[p] + '呀'" in data, 'game-data 缺 CONFIRM_TTS 表构建（契约 L）'
assert not re.search(r'\d', '把兔子放到树的前面'), 'TTS 句含数字（契约 L：本款 TTS 句无数字词）'
# r44 新表（SPEC-R44 §R4/§R8）：DUAL 4（16 全字符）/FLIP 6（18）/FLIPY 6（16）——独立串+表构建双断言
for k, du in [('lu', '兔子藏在树的左边，也在房子的上面'), ('dr', '兔子藏在树的下面，也在房子的右边'),
              ('ru', '兔子藏在树的右边，也在房子的上面'), ('dl', '兔子藏在树的下面，也在房子的左边')]:
    assert len(du) == 16, 'DUAL 句 %s 应 16 全字符' % du
    assert "'%s'" % du in verif, 'verify 缺 DUAL 独立串 %s（契约 L 对账）' % du
for p, fl, fy in [('front', '兔子转过身去啦，它的前面是树的哪边呀', '转身以后，它的前面就是树的后面呀'),
                  ('back', '兔子转过身去啦，它的后面是树的哪边呀', '转身以后，它的后面就是树的前面呀'),
                  ('left', '兔子转过身去啦，它的左边是树的哪边呀', '转身以后，它的左边就是树的右边呀'),
                  ('right', '兔子转过身去啦，它的右边是树的哪边呀', '转身以后，它的右边就是树的左边呀'),
                  ('up', '兔子转过身去啦，它的上面是树的哪边呀', '转身以后，它的上面就是树的上面呀'),
                  ('down', '兔子转过身去啦，它的下面是树的哪边呀', '转身以后，它的下面就是树的下面呀')]:
    assert len(fl) == 18, 'FLIP 问句 %s 应 18 全字符' % fl
    assert len(fy) == 16, 'FLIPY 确认句 %s 应 16 全字符' % fy
    assert "'%s'" % fl in verif, 'verify 缺 FLIP 独立串 %s（契约 L 对账）' % fl
    assert "'%s'" % fy in verif, 'verify 缺 FLIPY 独立串 %s（契约 L 对账）' % fy
assert "'兔子藏在树的' + POS_NAME[c.tree] + '，也在房子的' + POS_NAME[c.houseDir]" in data, \
    'game-data 缺 DUAL_TTS 表构建（契约 L）'
assert "'兔子转过身去啦，它的' + POS_NAME[p] + '是树的哪边呀'" in data, \
    'game-data 缺 FLIP_TTS 表构建（契约 L；POS_NAME 已含「边」字禁再拼）'
assert "'转身以后，它的' + POS_NAME[p] + '就是树的' + POS_NAME[FLIP_MAP[p]] + '呀'" in data, \
    'game-data 缺 FLIPY_TTS 表构建（契约 L；同上禁「边边」重字）'
assert not re.search(r'\d', '兔子藏在树的左边，也在房子的上面'), 'r44 新 TTS 句含数字（契约 L）'
MAX_NAME = 1416                                 # _clipdur33：名音 max（up/down）
PS_WRONG, PS_RIGHT = 1656, 2280                 # ps_wrong / ps_right 实长
PS_HINT, PS_Q1 = 2856, 2328                     # ps_hint / ps_q1 实长
PS_WATCH, PS_TURN = 3024, 1776                  # ps_tut_watch / ps_tut_turn 实长
# ① 确认链（判对拼播：ps_right+150+名音 max 1416+150+ps_ya 1152）→ 演出窗 1600+3900=5500 ≥ 链+300=5448（SPEC §4+T46 实长）
PS_YA = 1152                                     # ps_ya 实长（T46 新增，voice/clips Audio 实测）
assert '1600 * SPEED' in main and "q.kind === 'flip' ? 7400 : 3900" in main, \
    'main 缺判对演出窗 1600+收尾窗 3900/7400 flip 分支（家族 G/H+r44——②b 同串独立断言）'
assert 1600 + 3900 >= PS_RIGHT + 150 + MAX_NAME + 150 + PS_YA + 300, \
    '判对演出窗 5500 < 确认链 %d+150+%d+150+%d+300' % (PS_RIGHT, MAX_NAME, PS_YA)
# ② 错反馈链豁免窗（契约 I）：错链=1656+150+2856+300=4962（SPEC §4 算式）→ 窗 4970 覆盖下界
assert 4970 >= PS_WRONG + 150 + PS_HINT + 300, \
    '链豁免窗 4970 < 错链 %d+150+%d+300' % (PS_WRONG, PS_HINT)
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ②b r44 flip 答对窗（SPEC-R44 §R8）：1600+7400=9000 ≥ ps_right 2280+150+ps_fy est 6120+300=8850
# 注册后实测复核（2026-09-22，mutagen，F:/Cache/temp/r456_clip_ms.json）：ps_fy 实测
# 4152-4272（max 4272）全部低于 est 6120——窗不调（9000 ≥ 2280+150+4272+300=7002 实测链
# 大余量）；est 断言保留=更保守上界，实测断言并列锁口径（dual 4128-4200/flip 4488-4536
# 同源实测，开题异步不锁输入无窗消费，仅注记）
FY_EST = est_ms(16)
FY_MEAS = 4272                                     # ps_fy_* 实测 max（r44 注册后）
assert FY_EST == 6120, 'ps_fy est 口径 estMs(16)=%d != 6120' % FY_EST
assert "q.kind === 'flip' ? 7400 : 3900" in main, 'main 缺 flip 答对收尾窗 7400 分支（r44）'
assert 1600 + 7400 >= PS_RIGHT + 150 + FY_EST + 300, \
    'flip 答对窗 9000 < %d+150+%d+300' % (PS_RIGHT, FY_EST)
assert 1600 + 7400 >= PS_RIGHT + 150 + FY_MEAS + 300, \
    'flip 答对窗 9000 < 实测链 %d+150+%d+300' % (PS_RIGHT, FY_MEAS)
# ③ clip 实长窗（SPEC-BATCH33 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3400 * SPEED' in main, 'main 缺教学名音演示延窗 t=3400（ps_tut_watch 3024+300）'
assert 3400 >= PS_WATCH + 300, '教学名音演示延 3400 < ps_tut_watch 3024+300=3324'
assert '2700 * SPEED' in main, 'main 缺教学问句演示窗 2700（ps_q1 2328+300）'
assert 2700 >= PS_Q1 + 300, '教学问句演示窗 2700 < 2328+300=2628'
assert '}, 2100);' in main, 'main 教学 turn 后读题延 2100 缺失（ps_tut_turn 1776+300 防尾截）'
assert 2100 >= PS_TURN + 300, 'turn 后读题延 2100 < 1776+300=2076'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（ps_right 2280）'
assert 2620 + 400 >= PS_RIGHT + 300, 'celebrate 2620+400=3020 < ps_right 2280+300=2580'
# ④ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑤ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1600 + 3900' in verif, 'verify 缺 estMs 动态断言'
assert "'ps_n_' + " in verif or "'ps_n_up'" in verif, 'verify 缺名音键独立断言素材'
assert "'ps_place_' + " in verif, 'verify 缺 place 全句键独立断言素材（T46 化）'
# ⑥ hasKeyless 断言素材在场（契约 N/Mj-1：T46 化零 keyless 政策的运行时对账）
assert 'hasKeyless' in verif, 'verify 缺 hasKeyless 断言（契约 N/Mj-1 T46 口径）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚；r44 扩 house/背面兔/data-face）=====
for lit in ('dataset.pos', 'g[data-scene="tree"]', 'g[data-anim="bunny"]', 'q-text',
            'g[data-scene="house"]', 'data-face="back"', '.bunny.back'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="bunny"' in data, 'game-data 兔子 SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-scene="tree"' in data, 'game-data 树 SVG 缺 data-scene 锚（契约 M 渲染对账依据）'
assert 'data-scene="house"' in data, 'game-data 房子 SVG 缺 data-scene 锚（r44 dual 参照物）'
assert 'data-anim="bunny"' in data.split('BUNNY_BACK_INNER')[1][:400] if 'BUNNY_BACK_INNER' in data else False, \
    'game-data 背面兔 SVG 缺 data-anim 锚（r44 flip 朝向态——根锚保留契约 M 不断朝向）'
# r44 引擎锚（SPEC-R44 §R3）：FLIP_MAP 对合映射/DUAL_COMBOS 封闭表/域分裂退役（DOM4 不在）
assert "const FLIP_MAP = { left: 'right'" in data, 'game-data 缺 FLIP_MAP 180° 对合映射（r44）'
assert 'const DUAL_COMBOS = [' in data, 'game-data 缺 DUAL_COMBOS 组合封闭表（r44）'
assert 'DOM4' not in data and 'domainOf' not in data, 'r44 域分裂已退役（恒 6 格）——DOM4/domainOf 应删'
# r44 章谱锚（SPEC-R44 §R2）：dch3/4 主载构成（shuffled [dual×3+coin]/[flip×3+coin]+qi0 findpos 热身）
assert "specs.push({ kind: 'findpos', pos: pick() });" in engine and \
       'shuffled([mkDual(), mkDual(), mkDual(), mkCoin()]' in engine and \
       'shuffled([mkFlip(), mkFlip(), mkFlip(), mkCoin()]' in engine, \
    'engine 缺 r44 章谱构成律（dch3 dual×3/dch4 flip×3+qi0 findpos 热身）'

# ===== 遮挡语义静态断言（SPEC §0.80：z 序承载前后遮挡+近大远小）=====
assert '.cell.pos-back{z-index:10}' in head, 'head 缺 back 格 z-index:10（树盖兔子）'
assert '#tree-svg' in head and 'z-index:20' in head, 'head 缺树 z-index:20'
assert 'z-index:30' in head, 'head 缺方位格 z-index:30（front 兔盖树干下段）'
assert '.pos-back .bunny{width:58%}' in head, 'head 缺远景兔 58%（近大远小）'
assert '.pos-front .bunny{width:90%}' in head, 'head 缺近景兔 90%（近大远小）'
# 遮挡栈上下文回归锁：#cells 禁 z-index（≠auto 自建栈上下文→整格层被树盖）；bump 挂 #scene
assert '#cells{position:absolute;inset:0;pointer-events:none}' in head, 'head #cells 带了 z-index（栈上下文病）'
assert '#scene.bump{animation:ps-bump' in head, 'head 缺 #scene.bump（bump 须挂 #scene）'
assert '#cells.bump' not in head, 'head #cells.bump 必须移除（transform 建栈上下文闪遮挡）'
# 树 svg viewBox 回归锁：缺 viewBox=TREE_INNER 1:1 像素渲染，树不缩放→遮挡错位
assert '<svg id="tree-svg" viewBox="0 0 330 490" preserveAspectRatio="none"' in head, 'head #tree-svg 缺 viewBox 330x490（树不随场景缩放病）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 3400（≥3024+300）+ 问句+ghost 移入窗 2700
# （≥2328+300=2628）+ press 320 + demo 演出窗 1600+3900（罩确认链
# 2280+150+1416+150+1152+300=5448）+ 收尾 300 = 12220 ≤ 16000
TUT_SUM = 3400 + 2700 + 320 + 1600 + 3900 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3400 * SPEED', '2700 * SPEED', '320 * SPEED', '300 * SPEED',
            "(q.kind === 'flip' ? 7400 : 3900) * SPEED"]:   # 收尾窗常量（教学题恒 findpos/
    # placepos=3900 分支；r44 起字面为 flip 三元式，教学分账仍按 3900 计）
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>方位词图阵</title>' in head, 'head 缺标题 方位词图阵'

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
print('estMs check: confirm chain %d+150+%d+150+%d(+300) <= 5500 right-win; '
      'wrong-chain %d+150+%d(+300) <= 4970; tut-budget %dms <= 16000' %
      (PS_RIGHT, MAX_NAME, PS_YA, PS_WRONG, PS_HINT, TUT_SUM))
