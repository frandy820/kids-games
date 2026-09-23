# -*- coding: utf-8 -*-
"""senses 五感侦探 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r11 难度改造 v2（2026-09-14）：四族题型（find/multi/anti/comp）+multi 提交制+认知建模门禁。
用法: python batch32/senses/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch32/senses/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（r11+T46：sen_ 39 条（通用 7+r11 新 6+名音×20+T46 语义句 6）+ core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('senses')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：sen_ 39 条（通用 7+r11 新句 6+名音×20+T46 语义句 6）+ core 3 条 = 42 条
# （SPEC-BATCH32 §6 r11+T46 阶段2；既有 22 键文本一字不改；前缀=sen_ 已核 manifest 无占用，b28 立规先查）
SEN_SENSES = ['eye', 'ear', 'nose', 'hand', 'mouth']
SEN_THINGS = ['rainbow', 'star', 'bell', 'birdsong', 'flower', 'cookie', 'softtoy', 'ice', 'lemon', 'candy']
SEN_MULTI = ['popcorn', 'watermelon', 'kitten', 'soup', 'drum']
SEN_KEYS = (['sen_tut_watch', 'sen_tut_turn', 'sen_hint', 'sen_right', 'sen_wrong',
             'sen_q1', 'sen_q2',
             'sen_q3', 'sen_q_not', 'sen_q_not2', 'sen_q_cov1', 'sen_q_cov2', 'sen_mw',
             'sen_again_sense', 'sen_again_thing', 'sen_again_multi',
             'sen_again_cov', 'sen_anti_base', 'sen_anti_tail'] +
            ['sen_n_' + w for w in SEN_SENSES + SEN_THINGS + SEN_MULTI])
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SEN_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 42, 'clips 条数 %d != 42（sen 39 + core 3）' % n_clips
# 注入键前缀对账：只允许 sen_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('sen_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 sen_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('sen_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'senses'" in main, 'main 缺 KIDS.init senses（存档键 kidsgame_senses）'
assert 'window.SE =' in main, 'main 缺 SE 钩子'
assert '__seDemoR' in main, 'main 缺教学演示实证 __seDemoR'
assert 'tapSubmit() { return uiSubmit(); }' in main, 'main 缺 tapSubmit 钩子（multi 判定步）'
assert 'function engSubmit(L)' in engine, 'engine 缺 engSubmit（multi 提交判定）'
assert 'function uiSubmit()' in main, 'main 缺 uiSubmit（multi 提交主路径）'
# 本批常量锚（SPEC-BATCH32 §0.76/§6 r11：seeded mulberry32(flat*7919+421)——本批常量 sen=421）
assert 'flat * 7919 + 421' in engine, 'engine 缺本批常量 seed 421（SPEC §0.76）'
# r11 四族章型位序与认知建模在场（data 层真值源）
assert 'const CH_FAMILY = {' in data, 'data 缺 CH_FAMILY 章型位序（r11 定版）'
assert 'const MODELED_MS = { find: 4500, anti: 7500, multi: 15000, comp: 9000 };' in data, \
    'data 缺 MODELED_MS 认知建模常量（r11 时长门禁）'
assert 'const MODELED_FLOOR = 40000;' in data, 'data 缺 MODELED_FLOOR=40000（r11 时长硬断言下限）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.senses.tutSeen）
assert 'sv.senses && sv.senses.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
# T46：9800 ≥ 最长 anti 5 段链 1656+150+1440+150+2880+150+1440+150+1248+300=9564+余量
# （r11 9500 不足——anti 拼句 T46 拆三段后链超旧窗 64ms；四族共用单常量）
assert 'wrongChainUntil = Date.now() + 9800' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=9800（T46）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补（b31 定版）：豁免窗错点吞/对选放行/窗后二错照计 miss（guard 挂 uiTapOpt 取 q 后；
# r11：multi 勾选中性不吞——豁免窗守卫移挂 uiSubmit，源码断言双落点）
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
assert "q.kind !== 'multi' && wrongChainUntil" in main, 'main 豁免窗 guard 未豁免 multi 勾选（r11）'
assert 'if (wrongChainUntil && Date.now() < wrongChainUntil) {' in main, \
    'main uiSubmit 缺链豁免守卫（契约 I·multi 判定步）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# §0.76 家族梯度：miss≥2=正确卡 breathe（答案级；multi=全部真值卡）
assert 'q._miss >= 2' in main, 'main 缺 miss≥2 正确卡 breathe（答案级梯度）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，名音/clip 段禁置于其后），防后代批再踩
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版：窗 ≥ estMs(最长句)/链实长）=====
# estMs 口径（b25 定版，家族 T 全字符；r11 起定版字面 const estMs = n => n * 345 + 600）
est_ms = lambda n: n * 345 + 600
# estMs 定版字面四处同步（源 main + verify + 本 build 三处同口径断言）
assert 'const estMs = n => n * 345 + 600;' in main, 'main 缺 estMs 定版字面（家族 T：n×345+600）'
assert 'const estMs = n => n * 345 + 600;' in verif, 'verify 缺 estMs 定版字面（家族 T）'
assert 's.length * 345 + 600' not in main, 'main estMs 禁 +300/字符串旧变体（家族定版）'
# 语义句模板逐字钉死（契约 I 下界依据；r11 四族字数：findsense 9/findthing 7/multi 11/
# anti 10+2+2=14（感官名恒 2 字）/comp 13）
for frag, n in (('再想一想，用什么呢', 9), ('再想想什么用它', 7),
                ('再想一想，都用了哪里呀', 11),
                ('再想一想，哪个不是用', 10), ('的呀', 2),
                ('再想一想，捂住了还能用什么', 13)):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
    assert not re.search(r'\d', frag), '语义句含数字（契约 L 豁免前提：本款无数字词）'
MAX_NAME, MAX_SENSE_NAME = 1872, 1440            # _clipdur32：全名音 max(star)/感官名音 max(hand)
MAX_MULTI_NAME = 1560                            # r11 多感官名音 max(kitten，_clipdur32 实测)
SEN_MW = 1824                                    # sen_mw「没有找全哦」实长（_clipdur32）
SEN_WRONG, SEN_RIGHT = 1656, 2256                # sen_wrong / sen_right 实长
SEN_Q1, SEN_WATCH, SEN_TURN = 1560, 2592, 1824   # sen_q1 / sen_tut_watch / sen_tut_turn 实长
FS_N, FT_N, MU_N, AN_N, CO_N = 9, 7, 11, 14, 13  # 语义句字数（findsense/findthing/multi/anti/comp）
# T46 语义句 clip 实长（ffprobe 2026-09-19）
AG_SENSE, AG_THING, AG_MULTI, AG_COV, AN_BASE, AN_TAIL = 2640, 2184, 2976, 3264, 2880, 1248
# ① 确认链（判对拼播）：单选族=sen_right+150+名音 max 1872 → 演出窗 1600+3000=4600 ≥ 4578；
#   multi=sen_right+3×(150+感官名音 max 1440)+300=7326 → 演出窗 1600+5800=7400 ≥ 7326
assert '1600 * SPEED' in main and '3000 * SPEED' in main, 'main 缺判对演出窗 1600+3000（家族 G/H）'
assert 1600 + 3000 >= SEN_RIGHT + 150 + MAX_NAME + 300, \
    '判对演出窗 4600 < 确认链 %d+150+%d+300' % (SEN_RIGHT, MAX_NAME)
assert "(q.kind === 'multi' ? 5800 : 3000) * SPEED" in main, \
    'main 缺 multi 判对演出窗三元式（1600+5800/1600+3000 按族分窗）'
assert 1600 + 5800 >= SEN_RIGHT + 3 * (150 + MAX_SENSE_NAME) + 300, \
    'multi 判对窗 7400 < 确认链 %d+3×150+%d+300' % (SEN_RIGHT, 3 * MAX_SENSE_NAME)
# ② 错反馈链豁免窗（契约 I，T46 clip 实长口径，四族共用 9800）：
#   findsense 链=1656+150+1872+150+2640+300=7768 / findthing=1656+150+1440+150+2184+300=6870 /
#   multi=1824+150+1560+150+2976+300=6960 / anti（最长 5 段）=1656+150+1440+150+2880+150+1440+150+1248+300=9564 /
#   comp=1656+150+1440+150+3264+300=6960 —— 9800 ≥ 全族（estMs 字数口径在错链上退役）
for lb, tag in ((SEN_WRONG + 150 + MAX_NAME + 150 + AG_SENSE + 300, 'findsense'),
                (SEN_WRONG + 150 + MAX_SENSE_NAME + 150 + AG_THING + 300, 'findthing'),
                (SEN_MW + 150 + MAX_MULTI_NAME + 150 + AG_MULTI + 300, 'multi'),
                (SEN_WRONG + 150 + MAX_SENSE_NAME + 150 + AN_BASE + 150 + MAX_SENSE_NAME + 150 + AN_TAIL + 300, 'anti'),
                (SEN_WRONG + 150 + MAX_SENSE_NAME + 150 + AG_COV + 300, 'comp')):
    assert 9800 >= lb, '链豁免窗 9800 < %s 链 %d（T46 实长口径）' % (tag, lb)
assert SEN_WRONG + 150 + MAX_SENSE_NAME + 150 + AN_BASE + 150 + MAX_SENSE_NAME + 150 + AN_TAIL + 300 == 9564, \
    'anti 5 段链应 9564（T46 拆段复算）'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ clip 实长窗（SPEC §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3000 * SPEED' in main, 'main 缺教学名音演示延窗 t=3000（sen_tut_watch 2592+300）'
assert 3000 >= SEN_WATCH + 300, '教学名音演示延 3000 < sen_tut_watch 2592+300=2892'
assert '3900 * SPEED' in main, 'main 缺教学开题链演示窗 3900（sen_n_bell 1824+150+sen_q1 1560+300=3834）'
assert 3900 >= 1824 + 150 + SEN_Q1 + 300, '教学开题链演示窗 3900 < 1824+150+1560+300=3834'
assert '}, 2150);' in main, 'main 教学 turn 后读题延 2150 缺失（sen_tut_turn 1824+300 防尾截）'
assert 2150 >= SEN_TURN + 300, 'turn 后读题延 2150 < sen_tut_turn 1824+300=2124'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（sen_right 2256）'
assert 2620 + 400 >= SEN_RIGHT + 300, 'celebrate 2620+400=3020 < sen_right 2256+300=2556'
# ④ estMs 全字符口径在场（家族 T：len*345+600——r11 定版字面已在上方钉死）
# ⑤ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1600 + 3000' in verif, 'verify 缺 estMs 动态断言'
assert '1600 + 5800' in verif, 'verify 缺 multi 判对窗动态断言素材'
assert "'sen_n_star'" in verif or "'sen_n_' + " in verif, 'verify 缺名音键独立断言素材'
# ⑥ T46 语义句键段断言素材在场（clip 化替代 keylessLast——契约 N 全 clip 化）
for _k46 in ('sen_again_sense', 'sen_again_thing', 'sen_again_multi',
             'sen_again_cov', 'sen_anti_base', 'sen_anti_tail'):
    assert "'%s'" % _k46 in verif, 'verify 缺语义句键段断言 %s（T46 阶段2 替代 keylessLast）' % _k46
assert 'keylessLast' not in verif, 'verify keylessLast 断言应随 T46 clip 化退役'
# ⑥b T46 键段实断（main 拼播链源级锚：anti 三段拼播=base+名音+tail）
assert "'sen_anti_base'" in main and "'sen_anti_tail'" in main, 'main 缺 anti 拼句三段 clip 键（T46）'
# ⑦ r11 认知建模门禁素材（verify 动态断言 modeledLevelMs ≥ MODELED_FLOOR）
assert 'modeledLevelMs' in verif, 'verify 缺 modeled 时长硬断言素材（r11 门禁）'
assert 'MODELED_FLOOR' in verif, 'verify 缺 MODELED_FLOOR 引用（r11 门禁）'

# ===== 契约 L 豁免证据：全款 TTS 句无数字词（本款无数字词——SPEC §0 任务书豁免款）=====
for s in ('再想一想，用什么呢', '再想想什么用它', '再想一想，都用了哪里呀',
          '再想一想，哪个不是用', '再想一想，捂住了还能用什么'):
    assert not re.search(r'\d', s)

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.anim', 'dataset.ask', 'g[data-anim]', 'q-text'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="' in data or 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'dataset.blocked' in verif, 'verify 缺 comp blocked 帧锚断言素材（契约 M/r11）'
assert 'not-ring' in head and 'cov-badge' in head, 'head 缺 anti/comp 视觉锚样式（r11 帧断言依据）'
assert 'body.port' in head, 'head 缺 body.port 竖屏模拟通道（r7-r10 纪律⑥：媒体查询跟视口不跟元素）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 3000（≥2592+300）+ 开题链+ghost 移入窗 3900
# （≥1824+150+1560+300=3834）+ press 320 + demo 演出窗 1600+3000（罩确认链
# 2256+150+1872+300=4578）+ 收尾 300 = 12120 ≤ 16000
TUT_SUM = 3000 + 3900 + 320 + 1600 + 3000 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3000 * SPEED', '3900 * SPEED', '320 * SPEED', '300 * SPEED', '3000 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>五感侦探</title>' in head, 'head 缺标题 五感侦探'

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
print('T46 check: confirm chain %d+150+%d+300=%d <= 4600 single-win; '
      'multi confirm %d+3x(%d)+300=%d <= 7400; wrong-chain max anti 5-seg %d <= 9800; tut-budget %dms <= 16000' %
      (SEN_RIGHT, MAX_NAME, SEN_RIGHT + 150 + MAX_NAME + 300,
       SEN_RIGHT, 150 + MAX_SENSE_NAME, SEN_RIGHT + 3 * (150 + MAX_SENSE_NAME) + 300,
       SEN_WRONG + 150 + MAX_SENSE_NAME + 150 + AN_BASE + 150 + MAX_SENSE_NAME + 150 + AN_TAIL + 300, TUT_SUM))
