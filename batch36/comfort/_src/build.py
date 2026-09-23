# -*- coding: utf-8 -*-
"""comfort 安慰选择 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch36/comfort/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch36/comfort/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（r11：co_ 7 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('comfort') 全量返回（manifest games 已含 comfort 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须 `if '"%s"' % k in clips: continue` 幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('comfort')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：co_ 27 条（tut_watch/tut_turn/hint/right/wrong + r11 pick/gray +
# T46 情景句 co_sc_1..20）+ core 3 条 = 30 条（SPEC-BATCH36 §0.88/§4/§6；
# 前缀=co_ 已核 manifest 无占用 2026-09-12 实查；T46 键 09-19 复核）
CO_KEYS = ['co_tut_watch', 'co_tut_turn', 'co_hint', 'co_right', 'co_wrong', 'co_pick', 'co_gray'] +           ['co_sc_%d' % i for i in range(1, 21)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CO_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 30, 'clips 条数 %d != 30（co 27 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 co_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('co_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 co_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('co_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'comfort'" in main, 'main 缺 KIDS.init comfort（存档键 kidsgame_comfort）'
assert 'window.CO =' in main, 'main 缺 CO 钩子'
assert '__coDemoR' in main, 'main 缺教学演示实证 __coDemoR'
assert '__coTutSolo' in main, 'main 缺教学帮→独实证 __coTutSolo'
assert 'setFriendMood' in main, 'main 缺朋友表情态函数 setFriendMood（契约 M DOM 类层）'
# r11 三态表情（sad/meh/happy）+ 后果因果链（renderOutcome best/gray 两档）+ 方向提示按题型分流
assert "setFriendMood('meh')" in main, 'main 缺 r11 半好态 setFriendMood(meh)'
assert "renderOutcome('best')" in main, 'main 缺 r11 后果链好档 renderOutcome(best)'
assert "renderOutcome('gray')" in main, 'main 缺 r11 后果链灰档 renderOutcome(gray)'
assert 'const dirVoice = () =>' in main, 'main 缺 r11 方向提示分流 dirVoice（best2=锚/grad3=hint）'
assert 'VOICE.pick.key' in main, 'main 缺 r11 择优锚 co_pick 播报'
assert 'outcomeEl' in main, 'main 缺后果气泡元素锚 outcomeEl'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH36 §0.88：seeded mulberry32(flat*7919+757)——本款常量 757）
assert 'flat * 7919 + 757' in engine, 'engine 缺本款常量 seed 757（SPEC §0.88）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(cardsEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.comfort.tutSeen）
assert 'sv.comfort && sv.comfort.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（真时钟常量 WRONG_CHAIN_WIN=5898 + r11 灰链 GRAY_WIN=3540）
# + 救援 interval 守卫 + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert 'const WRONG_CHAIN_WIN = 5898' in data, 'data 缺错链豁免窗常量 5898（SPEC §4）'
assert 'const PICK_WIN = 3252' in data, 'data 缺 r11 择优锚窗常量 3252（SPEC §6）'
assert 'const GRAY_WIN = 3540' in data, 'data 缺 r11 灰链豁免窗常量 3540（SPEC §6）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I）'
assert 'wrongChainUntil = Date.now() + GRAY_WIN' in main, 'main 缺 r11 灰链豁免窗赋值（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：本款题面情景句走 voice.say（非队列链——SPEC §1 明示 N 不适用）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面=voice.say，N 防误用）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.88 演出时序常量：出场 400/破涕为笑窗 2940/坏卡锁 1100/教学延窗
for frag in ('const ENTER_MS = 400', 'const CELE_WIN = 2940', 'const SHAKE_MS = 1100',
             'const TUT_WATCH_WAIT = 3180', 'const TUT_TURN_WAIT = 2124'):
    assert frag in data, 'data 缺 SPEC §0.88 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapCard 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapCard 演出期 null）'
# 题面情景句 T46 化（09-19）：voice.say→voice.play(sayClipOf(q), q.say)——co_sc_* 全句
# clip（presentQuiz 开题+saySceneAgain 重听两处；SAY_CLIP 表=SCENES 顺序映射，重复句首现键）
assert main.count('KIDS.voice.play(sayClipOf(q), q.say)') == 2,     'main 题面情景句 play 应恰 2 处（开题+重听），实得 %d' % main.count('KIDS.voice.play(sayClipOf(q), q.say)')
assert 'const SAY_CLIP = {};' in data and 'const sayClipOf = q =>' in data,     'game-data 缺 SAY_CLIP/sayClipOf（T46 化）'
assert 'KIDS.voice.say(q.say)' not in main, 'main 残留 keyless say 题面（T46 化零 keyless）'
# T46 窗不动依据：20 句 clip 实长全部 ≤ estMs 窗上界（voice/clips Audio 实测 09-19）
CO_SC_DUR = [3504, 3360, 3624, 3432, 2472, 3288, 3288, 3048, 2616, 3096,
             3504, 3288, 2520, 3048, 2568, 2568, 2616, 2712, 2352, 3264]
_says = re.findall(r"say: '([^']+)'", data)
assert len(_says) == 20, 'SCENES say 应 20 句，实得 %d' % len(_says)
for _i, _s in enumerate(_says):
    assert CO_SC_DUR[_i] <= 400 + len(_s) * 345 + 600 + 300,         'co_sc_%d 实长 %d > estMs 窗上界（句 %r）——窗不足需扩' % (_i + 1, CO_SC_DUR[_i], _s)
# 确认链=co_right 单 clip（SPEC §4）
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §4）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH36 §4/§6 实长表 r11）=====
est_ms = lambda n: n * 345 + 600
CO_WATCH, CO_TURN = 2880, 1824                  # co_tut_watch / co_tut_turn 实长
CO_RIGHT, CO_WRONG, CO_HINT = 2640, 2544, 2904  # 实长（SPEC §4 实长表）
CO_PICK, CO_GRAY = 2952, 3240                   # r11 实长（SPEC §6：co_pick/co_gray）
SAY_B2_MAX, SAY_G3_MAX = 13, 12                 # r11 题库最长句：best2 13 字/grad3 12 字（全字符口径——审查 m-2 勘正：题库 ⑪ 含逗号 12 字符，旧 11 过时）
DECIDE_B2, DECIDE_G3, ADV_MS, LEVEL_MIN = 10000, 11000, 2940, 40000  # r11 时长模型常量
# ① 确认窗（破涕为笑演出）：CELE_WIN 2940 == right 2640+300 精确（家族 H）
assert 2940 == CO_RIGHT + 300, '确认窗 2940 != right %d+300' % CO_RIGHT
# ② 错反馈链豁免窗（契约 I）：错链=wrong 2544+150+hint 2904+300=5898（SPEC §4 精确值）
assert 5898 == CO_WRONG + 150 + CO_HINT + 300, '链豁免窗 5898 != 错链 %d+150+%d+300' % (CO_WRONG, CO_HINT)
# ②b r11 择优锚窗（best2 题题面句后串播）：PICK_WIN 3252 == co_pick 2952+300 精确
assert 3252 == CO_PICK + 300, '择优锚窗 3252 != co_pick %d+300' % CO_PICK
# ②c r11 灰链豁免窗（gray 卡反馈）：GRAY_WIN 3540 == co_gray 3240+300 精确
assert 3540 == CO_GRAY + 300, '灰链豁免窗 3540 != co_gray %d+300' % CO_GRAY
# ③ 题面 say 窗（家族 T 动态）：estMs(13)=5085（estMs 全字符口径在场）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(SAY_B2_MAX) == 5085 and est_ms(8) == 3360, 'estMs 静态验算失败'
# ④ 教学延窗（watch 3180≥2880+300 / turn 2124≥1824+300 防尾截）
assert 3180 >= CO_WATCH + 300 and 2124 >= CO_TURN + 300
# ⑤ winFlow celebrate 2620+400=3020 ≥ right 2640+300=2940（家族 H）
assert 2620 + 400 >= CO_RIGHT + 300, 'celebrate 3020 < %d+300' % CO_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（co_right 2640）'
# ⑤b r11 时长模型（SPEC §6）：每题=max(voiceWin,DECIDE)+ADV，voiceWin=400+estMs(say)+300+(best2 加 PICK_WIN)；
# 逐题 DECIDE ≥ voiceWin（语音窗从不撑时长——认知步主体）+最低关 5*(10000+2940)=64700 ≥ 40000
vw_b2_max = 400 + est_ms(SAY_B2_MAX) + 300 + CO_PICK + 300
vw_g3_max = 400 + est_ms(SAY_G3_MAX) + 300
assert DECIDE_B2 >= vw_b2_max, 'best2 决策 %d < 最长语音窗 %d（语音不得撑时长）' % (DECIDE_B2, vw_b2_max)
assert DECIDE_G3 >= vw_g3_max, 'grad3 决策 %d < 最长语音窗 %d' % (DECIDE_G3, vw_g3_max)
assert 5 * (DECIDE_B2 + ADV_MS) >= LEVEL_MIN, '最低 modeled 关 < %d' % LEVEL_MIN
for lit in ('const DECIDE_MS', 'const ADV_MS = CELE_WIN', 'const LEVEL_MIN_MS = 40000',
            'const quizDurMs', 'const levelDurMs'):
    assert lit in data, 'data 缺 r11 时长模型字面 %s' % lit
# ⑥ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_SCENES' in verif, 'verify 缺题库独立硬编码表 SPEC_SCENES（单元⑦）'
assert 'V_DECIDE' in verif and 'V_MIN = 40000' in verif and 'V_PICK = 3252' in verif, \
    'verify 时长单元缺独立副本常量 V_DECIDE/V_MIN/V_PICK（r11 独立重列）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层）=====
for lit in ('dataset.scene', 'classList.contains(\'sad\')', 'classList.contains(\'happy\')',
            "classList.contains('good')", '__lastSayText', 'dataset.i', '.card-wrap[data-i='):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert "querySelector('.card-wrap[data-i=" in main, 'main 缺卡下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加；r11 含择优锚窗）=====
# tutorialWatch watch 段名义分账：watch 延 3180（≥2880+300）+ 开题演出
# （出场 400+estMs(scene4 句 8 字)=3360+300 + r11 择优锚窗 3252=7312——演示题=best2）
# + ghost 移入 800+press 320 + demo 演出窗 2940（罩确认链 2640+300 精确）
# = 14552 ≤ 16000
TUT_SUM = 3180 + (400 + est_ms(8) + 300 + CO_PICK + 300) + 800 + 320 + 2940
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED',
            'CELE_WIN * SPEED', 'PICK_WIN * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 教学题句长受控（scene4=8 字——预算锚与实现绑定）
assert '小羊的水杯打翻了' in data and len('小羊的水杯打翻了') == 8

# 硬性检查 2c：head 标题与存档名对齐 + r11 后果气泡/半好态 CSS 素材
assert '<title>安慰选择</title>' in head, 'head 缺标题 安慰选择'
assert 'id="outcome"' in head, 'head 缺 r11 后果气泡容器 #outcome'
assert '#outcome.show' in head, 'head 缺 #outcome.show 过渡样式（r11 因果链演出）'
assert '#friend .fx-happy,#friend .fx-meh{display:none}' in head, 'head 缺 r11 三表情组切换 CSS'

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
print('estMs check: wrong-chain 5898 (exact); cele-win 2940 == 2640+300 (exact); '
      'pick-win 3252 == 2952+300; gray-win 3540 == 3240+300; '
      'duration: min level 5*(10000+2940)=%d >= 40000; tut-budget %dms <= 16000'
      % (5 * (DECIDE_B2 + ADV_MS), TUT_SUM))
