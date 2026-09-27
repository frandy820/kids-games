# -*- coding: utf-8 -*-
"""robotpaint 机器画师 单文件拼接 r18：_src/head.html + core.js(全文原样) + clips +
游戏 JS(data+engine+main) + verify(独立第 4 块) → ../index.html
r18 难度改造（2026-09-18，AUDIT-78 黄款）：五题型（plain/neg/edit/mem/dual）+ 块池组内
打乱（防位置查表）+ CH_LEN 6/静态 24（键基迁移 IIFE）+ estMs 四方 + modeled 双钉 134472。
用法: python batch33/robotpaint/_src/build.py
语音 clips 注入（rp_ 20 条 + core_* 3 条 = 23，manifest 对账）
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/4 块拼接/写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：9e82abf57d1bf10a871502032da09024）。
本款拼接口径=4 script 块（verify 独立第 4 块，禁并入 game 块自匹配）；
字面 </script>/core 契约版由 hard_checks_pre、完全离线与 n_scripts==4 由
hard_checks_post(n_scripts=4) 同口径兜底（原拼接后 html.count('<script>')==4 断言同口径）。
差异说明：①原「core 3 条逐键直读追加」（manifest core_* 未登记时）收编为
build_lib.clips_core_fallback（clips_prep 参数）——manifest 现已登记 robotpaint
（主线 ALL 补登记后），走原样路径与原版逐字节一致；
②原「写盘后执行」的 r18 win check 尾 print 前移至断言表尾（纯诊断输出，无产物依赖），
成功路径对拍逐字节一致。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']
    selftest_p = ROOT / '_selftest.py'
    assert selftest_p.exists(), '缺 _selftest.py（交付四件套之一）'
    selftest = selftest_p.read_text(encoding='utf-8')

    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    # clips 注入断言：rp_ 20 条（通用 8+开题 3[r18]+名音×8+mem 1[T46]）+ core 3 条 = 23 条
    # （SPEC-BATCH33 §-r18 §4；前缀 rp_ 已核 manifest 无占用——r18 新 3 键 2026-09-18 实查无撞名 ✓）
    RP_IDS = ['red', 'yel', 'blu', 'cir', 'squ', 'tri', 'big', 'small']   # 属性封闭三轴（SPEC §0.81）
    RP_KEYS = ['rp_tut_watch', 'rp_tut_turn', 'rp_hint', 'rp_right', 'rp_wrong',
               'rp_q', 'rp_go', 'rp_like', 'rp_neg', 'rp_edit', 'rp_dual', 'rp_mem'] + \
              ['rp_n_' + w for w in RP_IDS]
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in RP_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 23, 'clips 条数 %d != 23（rp 20 + core 3）' % n_clips
    # 注入键前缀对账：只允许 rp_* 与 core_*（防 manifest 串档带进他款 clip）
    _inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
    assert _inj_keys and all(k.startswith('rp_') or k in CORE_KEYS for k in _inj_keys), \
        'clips 出现非 rp_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('rp_') or k in CORE_KEYS)))

    # 硬性检查 1 款级扩展：selftest 段同禁字面 </script>（core/data/engine/main/verify/clips 由 lib 兜底）
    assert '</script' not in selftest, 'selftest 含字面 </script>，需写 <\\/script>'

    # 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
    assert "KIDS.init({ game: 'robotpaint'" in main, 'main 缺 KIDS.init robotpaint（存档键 kidsgame_robotpaint）'
    assert 'window.RP =' in main, 'main 缺 RP 钩子'
    assert '__rpDemoR' in main, 'main 缺教学演示实证 __rpDemoR'
    # 家族契约 A r18 升级（evidence r17 同款）：winFlow dayEnd 与启动 dayEnd 双 nextHint(lim - 1)；
    # 原 null 实参形态废止（字面禁入——注释用「原 null 实参形态」表述）；启动日末停留 Math.max(0, lim - 1)
    assert main.count('nextHint(lim - 1)') == 2, \
        'dayEnd nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
    assert 'nextHint(null)' not in main, 'nextHint(null) 字面废止（家族 A r18——注释用「原 null 实参形态」）'
    assert 'Math.max(0, lim - 1)' in main, 'main 启动日末缺 Math.max(0, lim - 1) 停留（家族 A）'
    # 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
    assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
    # 家族契约 D：吞输入轻叮必配容器 bump
    assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
    # 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.robotpaint.tutSeen）
    assert 'sv.robotpaint && sv.robotpaint.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
    # 家族契约 F：生成关预告实算（禁 (ci+1)%4）
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
    assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
    # 家族契约 I：错反馈链豁免窗 5010（SPEC §4 rp 错链=1848+150+2712+300）+ 救援 interval 守卫 + startLevel 重置
    assert 'wrongChainUntil = Date.now() + 5010' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=5010'
    assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
    assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
    # 家族契约 I 补：guard 挂 uiTapGo 入口（本款 tapGo 才产生 wrong——豁免窗护 tapGo 后的重画间隔：
    # 窗内重画吞 / 窗后照常——真时钟窗，非 SPEED 缩水）
    assert '!demo && wrongChainUntil && Date.now() < wrongChainUntil' in main, \
        'main 缺错链豁免窗 guard（契约 I 补：挂 uiTapGo 入口护重画间隔）'
    # 家族契约 J：语义链 flat≥3 只 10s 节流（禁切通用 clip）
    assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
    # 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
    assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
    assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
        'main rescueTick 缺面板在场守卫（契约 K）'
    # paint/compare 演出相位豁免 idle（§-r18：演示相位演出即引导，不计时）
    assert "q.phase !== 'pick') return;" in main, 'main rescueTick 缺演出相位 idle 豁免'
    # 家族契约 O：款内自建 button 显式 color（core 兜底之外仍须显式）
    assert 'button{color:#4A3B2E' in head, 'head 缺自建 button 显式 color（契约 O）'
    # 契约 N T46 化（Mj-1 零 keyless）：mem 闪现句=rp_mem clip 单段链（原 keyless TTS 退役）
    _kl = re.findall(r'\{ key: null[^}]*\}', main)
    assert len(_kl) == 0, 'main keyless 段应 0 处（T46 化零 keyless 政策），实得 %d' % len(_kl)
    assert 'KIDS.voice.queue([VOICE.mem.key])' in main, 'main 缺 mem 闪现 rp_mem clip 链'
    assert "mem:    { key: 'rp_mem'," in data, 'game-data VOICE 缺 mem 条目（rp_mem）'

    # ===== 契约 MIG r18：键基迁移 IIFE（CH_LEN 5→6）——矛盾态+脏键守卫+先于 KIDS.init =====
    _i_mig = main.index("localStorage.getItem('kidsgame_robotpaint')")
    _i_init = main.index('KIDS.init(')
    assert _i_mig < _i_init, '迁移 IIFE 必须先于 KIDS.init 读档执行（次序断言）'
    assert "lv[(c - 1) + '-5']" in main, '迁移 IIFE 缺旧基矛盾态检测 lv[(c-1)+"-5"]（c=2..4）'
    assert '+m[1] < 1' in main and '+m[2] > CH_LEN - 1' in main, '迁移 IIFE 缺脏键守卫（章号≥1 上界放开/关号域）'
    assert 'CH_LEN = 6' in data and 'STATIC_LEVELS = 24' in data, 'game-data 缺 r18 键基常量（CH_LEN 6/静态 24）'

    # ===== estMs 四方同步（家族 T）：data 定义 / main 用不复声明 / verify 独立定义 / selftest lambda =====
    est_ms = lambda n: n * 345 + 600
    assert 'const estMs = s => s.length * 345 + 600' in data, 'game-data 缺 estMs 定义（四方之一）'
    assert 'const estMs' not in main and 'const estMs' not in engine, 'main/engine 禁重复声明 estMs（四方：仅 data 定义）'
    assert 'estMs = n => n * 345 + 600' in verif, 'verify 缺 estMs 独立定义（四方之一）'
    assert 'n * 345 + 600' in selftest, '_selftest 缺 est_ms 同式（四方之一）'

    # ===== r18 五题型结构静态断言（KIND_POOL/否定轴数/修改轴数/breathe 章表/块池组内打乱）=====
    assert "KIND_POOL = {\n  1: ['plain'],\n  2: ['neg', 'edit'],\n  3: ['mem', 'dual'],\n  4: ['plain', 'neg', 'edit', 'mem', 'dual']\n}" in data, \
        'game-data 缺五题型池 KIND_POOL（§-r18）'
    assert 'NEG_AXES_N  = { 2: 1, 4: 2 }' in data and 'EDIT_AXES_N = { 2: 1, 4: 2 }' in data, \
        'game-data 缺否定/修改轴数表（dch2 一轴 / dch4 两轴）'
    assert 'DCH_BREATHE = { 1: false, 2: true, 3: true, 4: true }' in data, \
        'game-data 缺答案级 breathe 章表（ch2+ 才 miss≥2 指错轴——§-r18）'
    assert 'DCH_BREATHE[cur.dch]' in main, 'main showDiffHelp 未按章表启用答案级（死配置）'
    assert 'flat < STATIC_LEVELS ? dch0 : 4' in engine, 'engine 缺生成关恒 dch4（五题型混出）'
    assert 'shuffled(AXIS_POOL[ax], rnd)' in engine, 'engine 缺块池组内 seeded 打乱（防位置查表——§-r18 核心）'
    assert 'AXIS_POOL[ax].filter(v => v !== q.target[ax])' in engine, 'engine 缺 neg 排除集=轴封闭集∖目标（补全推理）'
    assert "q.target[ax] = to;" in engine and 'q.edits = edAxes.map' in engine, 'engine 缺 edit 终态=start∘edits（两步复合）'
    assert 'qd.tIdx = 1;' in engine, 'engine engAfterConfirm 缺 dual 任务二切换（tIdx=1 槽复位）'
    assert "kind === 'dual' && q.tIdx === 0" in engine, 'engine engTapGo 缺 dual 任务一判对分支（nextTask）'
    assert 'q.flashDone = true;' in main, 'main 缺 mem 闪现窗毕罩住置位（flashDone）'
    assert 'function memFlashFlow' in main and 'function sayOpener' in main, 'main 缺题型开题分流'
    assert 'renderEaselState' in main and 'renderCanvas' in main, 'main 缺目标侧/画布渲染族'
    # r18 帧内容锚（契约 M 扩展）：指令卡/罩卡/双画师 DOM 锚工厂
    for lit in ('data-neg', 'data-ok', 'data-covered', 'negCardHtml', 'editCardHtml', 'coverCardHtml'):
        assert lit in data, 'game-data 缺 r18 指令卡锚 %s（契约 M）' % lit
    assert 'dual-only' in head and '#easel.dual' in head, 'head 缺 dual 四框样式'

    # ===== 语音窗静态断言（家族 G/H/I/T + SPEC §4+r18 实长表；窗 ≥ 链实长+300）=====
    # clip 实长：rp_go 1176 / rp_like 1752 / rp_right 3216 / rp_wrong 1848 / rp_hint 2712 /
    # rp_tut_watch 3384 / rp_tut_turn 2016 / rp_neg 3600 / rp_edit 3768 / rp_dual 3792（r18 浏览器实测）；
    # 名音 rp_n_* max = rp_n_tri 1656
    RP_GO, RP_LIKE, RP_RIGHT, RP_WRONG, RP_HINT = 1176, 1752, 3216, 1848, 2712
    RP_TUT_WATCH, RP_TUT_TURN, RP_NEG, RP_EDIT, RP_DUAL = 3384, 2016, 3600, 3768, 3792
    MAX_NAME = 1656
    # ① 作画演出窗（paint 相位锁定窗，SPEC §4「≥3876」）：go+3×800+300
    assert 'PAINT_WIN = GO_MS + 3 * PAINT_STEP_MS + 300' in data, 'game-data 缺 PAINT_WIN 推导式'
    assert 'PAINT_WIN = 3876' not in data  # 推导式而非魔数
    assert 'GO_MS = 1176' in data and 'PAINT_STEP_MS = 800' in data, 'game-data 缺 go/段常量'
    assert 1176 + 3 * 800 + 300 == 3876, '作画演出窗与实长表不符'
    assert 'await wait(GO_MS * SPEED)' in main and 'await wait(PAINT_STEP_MS * SPEED)' in main, \
        'main 作画演出缺 go/单段窗'
    # ② 比对像前导窗（like play+300）
    assert 'LIKE_WIN = 1752 + 300' in data and 'await wait(LIKE_WIN * SPEED)' in main, 'main 缺 like 前导窗'
    # ③ 确认链 [rp_right, 名音×槽序]：r18 恒三段 8634（ch1 预填废止——全档三槽）
    assert 'CONFIRM_WIN = 3216 + 150 + 3 * 1656 + 300' in data, 'game-data 缺 CONFIRM_WIN 推导式'
    assert 'CONFIRM_WIN2' not in data and 'CONFIRM_WIN2' not in main and 'CONFIRM_WIN2' not in verif, \
        'CONFIRM_WIN2（ch1 两段）已废止（r18 全档三槽）'
    assert 3216 + 150 + 3 * MAX_NAME + 300 == 8634, '确认链窗与实长表不符'
    assert 'await wait(CONFIRM_WIN * SPEED)' in main, 'main 确认链窗缺恒三段等待'
    # ④ 错链豁免窗（契约 I）：[rp_wrong, rp_hint] 全 clip 链=1848+150+2712+300=5010（恒等）
    assert 'WRONG_CHAIN_MS = 5010' in data, 'game-data 缺 WRONG_CHAIN_MS=5010'
    assert 5010 == RP_WRONG + 150 + RP_HINT + 300, '错链窗 5010 与实长表不符'
    # ⑤ mem 闪现窗（家族 T 实算·T46 化预算冻结）：FLASH_WIN=estMs(17)+300=6765 ≥ rp_mem clip 实长 3960+300
    assert "MEM_TEXT = '看清楚啦，把它记住，等一会儿画出来'" in data, 'game-data 缺 mem 闪现句（17 字符）'
    assert 'FLASH_WIN = estMs(MEM_TEXT) + 300' in data, 'game-data 缺 FLASH_WIN 推导式（家族 T·estMs 吃字符串）'
    assert est_ms(17) == 6465 and est_ms(17) + 300 == 6765, '闪现窗 estMs 推导与实长表不符'
    assert 6765 >= 3960 + 300, '闪现窗 6765 < rp_mem clip 3960+300（T46 化联动核）'
    assert 'await wait(FLASH_WIN * SPEED)' in main, 'main 缺 mem 闪现窗等待'
    # ⑥ 教学窗：watch 延 3684 ≥ 3384+300；turn 后交接 2316 ≥ 2016+300（startQuizFlow 入参）
    assert 3684 >= RP_TUT_WATCH + 300, '教学 watch 延 3684 < %d+300' % RP_TUT_WATCH
    assert 2316 >= RP_TUT_TURN + 300, 'turn 后交接延 2316 < %d+300' % RP_TUT_TURN
    assert '3684 * SPEED' in main, 'main 缺教学 watch 演示延窗 3684'
    assert 'startQuizFlow(2316)' in main, 'main 缺 turn 后交接延窗 2316'
    # ⑦ CSS 动画 SPEED 换算声明：--t 变量随 SPEED 置换（verify 提速不漂移）
    assert "setProperty('--t'" in main, 'main 缺 CSS 动画 SPEED 换算（--t 置换）'
    assert 'var(--t)' in head, 'head keyframes 缺 var(--t) 时长换算声明'

    # ===== r18 时长模型静态断言（DECIDE_MS 认知时长 + PERF_RIGHT_MS + modeled 双钉 134472）=====
    assert 'DECIDE_MS = { plain: 8000, neg: 12000, edit: 11000, mem: 10500, dual: 17000 }' in data, \
        'game-data 缺 DECIDE_MS 五题型认知时长表（§-r18 §4）'
    assert 'PERF_RIGHT_MS = GO_MS + 3 * PAINT_STEP_MS + LIKE_WIN + CONFIRM_WIN' in data, \
        'game-data 缺 PERF_RIGHT_MS 推导式'
    assert 1176 + 3 * 800 + 2052 + 8634 == 14262, 'PERF_RIGHT_MS 与实长表不符（期望 14262）'
    assert 'OPENER_KEY = ' in data and 'voiceWinMs' in data, 'game-data 缺开题窗函数（voiceWin=clip+300/mem=FLASH_WIN）'
    assert 'quizDurMs = q => Math.max(voiceWinMs(q), DECIDE_MS[q.kind]) + PERF_RIGHT_MS' in data, \
        'game-data 缺每题时长式（max(voiceWin, DECIDE)+PERF）'
    assert 'SPEC_MODELED_MIN = 134472' in verif, 'verify 缺 SPEC_MODELED_MIN=134472（双钉之一）'
    assert 'modeled(0) === SPEC_MODELED_MIN' in verif or 'm0 === SPEC_MODELED_MIN' in verif, \
        'verify 缺 modeled(0) 钉死断言'
    assert '134472' in selftest, '_selftest 缺 modeled 双钉常量 134472'
    assert 900 + 6 * (8000 + 14262) == 134472, 'modeled(0) 恒等式与推导不符（900+6*(8000+14262)）'
    assert 'LEVEL_MIN_MS = 40000' in data and 'levelDurMs' in data, 'game-data 缺家族时长下限/关卡时长函数'

    # ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
    for lit in ('dataset.val', 'data-axis', 'data-paint', 'data-target', 'data-judge',
                'c-name', 's-axis', 'noKeyless', 'data-neg', 'data-ok', 'data-covered'):
        assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
    assert 'data-paint' in data and 'data-target' in data, 'game-data 缺成品/目标 SVG 帧锚工厂（契约 M）'
    assert '__rpPaintLog' in main and '__rpDemoLog' in main, 'main 缺作画/教学实录（契约 M 对账）'
    # verify 独立第 4 块（script[2]=纯游戏块——源码断言免拼接防自匹配）
    assert "document.querySelectorAll('script')[2]" in verif, 'verify 缺 script[2] 纯游戏块读取（第 4 块范式）'
    assert 'VERIFY PASS' in verif, 'verify 缺 title 通道'

    # ===== 文案红线（SPEC §0.81：禁一切 人工智能/AI 词汇——落「精确表达/当好小老师」表述）=====
    # \bAI\b 词边界（PAINT/CHAIN 等常量内嵌 'AI' 子串不误伤）；标题对齐
    _all_src = head + data + engine + main + verif + selftest
    assert not re.search(r'人工智能|\bAI\b', _all_src), '文案红线违约：出现 人工智能/AI 词汇'
    assert '<title>机器画师</title>' in head, 'head 缺标题 机器画师'

    # 硬性检查 2c：head 存档名与 KIDS.init 对齐（家族 C：存档 kidsgame_robotpaint v1.0）
    assert "'robotpaint'" in main and "title: '机器画师'" in main, 'main KIDS.init 款名/标题不齐'

    # ===== 竖屏双通道逐行全等（PORT-CLS：@media 与 body.port 镜像——build 静态断言）=====
    _m = re.search(r'@media \(orientation:portrait\)\{\n(.*?)\n\}', head, re.S)
    _p = re.search(r'/\*PORT-CLS\*/\n(.*?)\n</style>', head, re.S)
    assert _m and _p, 'head 缺 PORT-CLS 双通道段（@media + body.port 镜像）'
    _media_lines = _m.group(1).split('\n')
    _port_lines = _p.group(1).split('\n')
    assert len(_media_lines) == len(_port_lines) and len(_media_lines) >= 15, \
        'PORT-CLS 双通道行数不一致或过少：%d/%d' % (len(_media_lines), len(_port_lines))
    for _i, (_ml, _pl) in enumerate(zip(_media_lines, _port_lines)):
        assert _pl.startswith('body.port '), 'PORT-CLS 第 %d 行缺 body.port 前缀: %r' % (_i, _pl[:40])
        assert _pl[len('body.port '):] == _ml, 'PORT-CLS 第 %d 行与 @media 不全等: %r vs %r' % (_i, _pl, _ml)

    print('r18 win check: paint %d==3876; like %d; conf %d==8634; wrong %d==5010; flash %d==6765; '
          'openers neg/edit/dual %d/%d/%d; PERF %d==14262; modeled0 %d==134472; clips %d (20+3); scripts=4' %
          (1176 + 3 * 800 + 300, RP_LIKE + 300, 3216 + 150 + 3 * MAX_NAME + 300,
           5010, est_ms(17) + 300, RP_NEG, RP_EDIT, RP_DUAL,
           1176 + 3 * 800 + 2052 + 8634, 900 + 6 * (8000 + 14262), n_clips))


build_lib.build(ROOT, game='robotpaint', head_name='head.html',
                verify_block='separate', pre_assemble=_asserts,
                clips_prep=build_lib.clips_core_fallback)
