# -*- coding: utf-8 -*-
"""crd 贺卡工坊 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch39/crd/_src/build.py
b36 M1 布局（本批 build 层硬性）：script[0]=core / script[1]=clips /
script[2]=data+engine+main（纯游戏逻辑，无 verify 字面）/ script[3]=verify——
verify ⑨ 源码断言读 script[2] 恢复判别力（b37 R4：三款 build 断言对称）。
b39 定版：首错锁断言一律总窗口径（常量×SPEED+尾窗常数全算，禁只断常量——
b38 R1 major 教训）。
r12 难度改造（2026-09-15）：判定=SPEC_TABLE 题表驱动（偏好 like/冲突 clash/
语用 wish/综合 mix 四 kind ×occ×who）；clips crd_ 8 键（+r12 新 3 分流 hint）；
错链豁免窗 CHAIN_WIN 按步型 h 四值；时长模型 DECIDE_MS/levelDurMs/
LEVEL_MIN_MS=40000 硬断言。"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch39/crd/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（crd_ 5 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
# b33 坑③幂等纪律：clips_js('crd') 全量返回（manifest games 已含 crd 的
# core_* 3 条自动带上）——本脚本**不写任何手工 core 补注入循环**，
# 并以计数断言防双注入（若日后需补注入必须幂等跳过）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('crd')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：crd_ 8 条（v1 5+r12 新 3 分流 hint）+ core 3 条 = 11 条
# （SPEC-BATCH39 §0.94/§4+r12；前缀=crd_ 已核 manifest 0 占用 2026-09-12/09-15 实查）
CRD_KEYS = ['crd_tut_watch', 'crd_tut_turn', 'crd_hint', 'crd_right', 'crd_wrong',
            'crd_hint_like', 'crd_hint_no', 'crd_hint_wish',   # T46 阶段2 情境句 +20（行序=注册序）
            ] + ['crd_sc_%d' % i for i in range(1, 21)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in CRD_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 31, 'clips 条数 %d != 31（crd 28 + core 3）' % n_clips
# 防双注入（b33 坑③）：core 键在注入串内只出现 1 次（幂等跳过缺失）
for k in CORE_KEYS:
    assert clips.count('"%s"' % k) == 1, 'core 键 %s 双注入（幂等跳过缺失）' % k
# 注入键前缀对账：只允许 crd_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('crd_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 crd_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('crd_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'crd'" in main, 'main 缺 KIDS.init crd（存档键 kidsgame_crd）'
assert 'window.CRD =' in main, 'main 缺 CRD 钩子'
assert '__crdDemoR' in main, 'main 缺教学演示实证 __crdDemoR'
assert '__crdTutSolo' in main, 'main 缺教学帮→独实证 __crdTutSolo'
# b33 硬性①：钩子表 quiz.step 语义显式声明（全关题号 0-4，非全局题号）
assert 'step: cur.step' in main and '全关题号' in main, 'main 缺 quiz.step 题号语义声明（b33 坑①）'
# 本批常量锚（SPEC-BATCH39 §0.94：seeded mulberry32(flat*7919+857)——本款常量 857）
assert 'flat * 7919 + 857' in engine, 'engine 缺本款常量 seed 857（SPEC §0.94）'
# r12 三封闭表逐字（data OCC_EL 场合默认/WHO_LIKE 偏好/CONFLICT_EL 冲突——verify 独立对账依据）
for lit in ("birthday: { bg: 'flags',  st: 'cake',   wish: 'wbd' }",
            "newyear:  { bg: 'lant',   st: 'lant2',  wish: 'wny' }",
            "thanks:   { bg: 'hearts', st: 'heart',  wish: 'wth' }",
            "sorry:    { bg: 'clouds', st: 'bear',   wish: 'wsr' }",
            "sick:     { bg: 'hearts', st: 'heart',  wish: 'wkang' }"):
    assert lit in data, 'data 缺 r12 场合默认表 OCC_EL 行 %s' % lit
assert "grandma: { bg: 'clouds', st: 'flower' }" in data and \
       "monkey:  { bg: 'hearts', st: 'bear' }" in data, 'data 缺 WHO_LIKE 偏好表（r12 delta①）'
assert "const CONFLICT_EL = { newyear: 'tree', birthday: 'mum' }" in data, \
    'data 缺 CONFLICT_EL 冲突表（r12 delta②）'
# r12 题表素材（SPEC_TABLE 表驱动+步型 h 分流——verify 独立重列同构）
assert 'const SPEC_TABLE = [' in data, 'data 缺 r12 题表 SPEC_TABLE'
assert "const HINT_OF = { like: 'hintLike', clash: 'hintNo', wish: 'hintWish', theme: 'hint' }" in data, \
    'data 缺步型→提示分流表 HINT_OF（r12）'
for say in ("'奶奶喜欢云朵和花，做张生日贺卡'", "'朋友怕吵闹，做张生日贺卡'",
            "'奶奶生病住院了，做张贺卡'", "'小猴生病了，他喜欢抱抱熊'"):
    assert say in data, 'data 缺 r12 线索句 %s' % say
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流锚（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(trayEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.crd.tutSeen）
assert 'sv.crd && sv.crd.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（r12 真时钟常量 CHAIN_WIN 按步型四值）+ 救援 interval 守卫
# + startLevel 重置 + I 补豁免窗 guard（错点吞/对选放行/窗后二错照计 miss）
assert "const CHAIN_WIN = { like: 4626, clash: 4554, wish: 4674, theme: 5010 }" in data, \
    'data 缺 r12 错链豁免窗 CHAIN_WIN 四值（SPEC §4 实长表）'
assert 'wrongChainUntil = Date.now() + CHAIN_WIN[st.h]' in main, 'main 缺错链豁免窗按步型赋值（契约 I r12）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== st.answer' in main, \
    'main 缺豁免窗 guard（I 补：错点吞 pop+bump 不计 miss，对选放行）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip；b36 m3：教学迷你关 flat=-1
# 每错必播——条件写 cur.flat < 3 恒定字面）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J b36 m3 教训）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# 家族契约 N：本款题面主题句走 voice.play 情境键（T46 阶段2 clip 化——SPEC §1）；
# 防误用：main/verify 内不得出现 keyless queue 段（确认链/错链全 clip 天然安全）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    assert '{ key: null' not in _s, 'game-%s 不应含 keyless queue 段（题面=voice.play，N 防误用）' % _src_name
# 家族契约 O：款内自建 button 显式 color（不依赖 core 兜底）
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# SPEC §0.94/§4 演出时序常量：出场 400/换盘 400/选对窗 2316/虚影锁 1100/定格 700/送卡 600/教学延窗
for frag in ('const ENTER_MS = 400', 'const STAGE_MS = 400', 'const CARD_WIN = 2316',
             'const SHAKE_MS = 1100', 'const FINISH_HOLD = 700', 'const FINISH_FLY = 600',
             'const TUT_WATCH_WAIT = 3300', 'const TUT_TURN_WAIT = 2100'):
    assert frag in data, 'data 缺 SPEC §4 演出常量 %s' % frag
# 真时钟演出锁素材（任务书：吞输入用真时钟演出锁，tapPick 演出期 null）
assert 'Date.now() < state.showUntil' in main, 'main 缺真时钟演出锁判定（tapPick 演出期 null）'
# 题面=voice.play 情境键 clip 化（T46 阶段2）；确认链=crd_right 单 clip（SPEC §4）
assert "KIDS.voice.play(q.sayKey, q.say)" in main, 'main 缺题面主题句 play（T46 阶段2 crd_sc_N clip）'
assert "KIDS.voice.queue([VOICE.right.key])" in main, 'main 缺确认链 right 单 clip（SPEC §4）'

# ===== 语音窗静态断言（家族 G/H/I/T + SPEC-BATCH39 §4 实长表 r12）=====
est_ms = lambda n: n * 345 + 600
CRD_WATCH, CRD_TURN = 2928, 1728                  # crd_tut_watch / crd_tut_turn 实长
CRD_RIGHT, CRD_WRONG = 2016, 1968                 # 实长（SPEC §4 实长表）
CRD_HINT, HINT_LIKE, HINT_NO, HINT_WISH = 2592, 2208, 2136, 2256   # r12 四链 hint 实长（2026-09-15 实测）
SAY_LEN = 15                                      # r12 教学/最长线索句（'奶奶喜欢云朵和花，做张生日贺卡'）
# ① 选对窗（元素落位+确认链）：CARD_WIN 2316 == right 2016+300 精确（家族 H）
assert 2316 == CRD_RIGHT + 300, '选对窗 2316 != right %d+300' % CRD_RIGHT
# ② 错反馈链豁免窗四链（契约 I r12）：CHAIN_WIN[h]=wrong+150+hint_h+300（SPEC §4 精确值）
assert 4626 == CRD_WRONG + 150 + HINT_LIKE + 300, 'like 链窗 4626 != %d+150+%d+300' % (CRD_WRONG, HINT_LIKE)
assert 4554 == CRD_WRONG + 150 + HINT_NO + 300, 'clash 链窗 4554 != %d+150+%d+300' % (CRD_WRONG, HINT_NO)
assert 4674 == CRD_WRONG + 150 + HINT_WISH + 300, 'wish 链窗 4674 != %d+150+%d+300' % (CRD_WRONG, HINT_WISH)
assert 5010 == CRD_WRONG + 150 + CRD_HINT + 300, 'theme 链窗 5010 != %d+150+%d+300' % (CRD_WRONG, CRD_HINT)
# ③ 首错演出锁（b37 R3+b39 定版总窗口径）：SHAKE_MS 1100×SPEED(实页=1)+尾窗 140=1240
#    ≤ wrong 1968+150=2118（禁覆盖豁免窗——留对选放行活跃段；禁只断常量——b38 R1 major）
assert 1100 * 1 + 140 <= CRD_WRONG + 150, '首错演出锁总窗 %d > %d（b37 R3+b39 总窗口径）' % (1100 + 140, CRD_WRONG + 150)
# ④ 题面线索句窗（家族 T 动态）：estMs(15)=5775+300+出场 400=6475（estMs 全字符口径在场）
assert 'estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert est_ms(SAY_LEN) == 5775 and est_ms(4) == 1980, 'estMs 静态验算失败'
# r12 线索句长域：题表句 10-15 字（verify ⑥ ⑥ sayLen 域断言锚）
assert len('奶奶喜欢云朵和花，做张生日贺卡') == 15 and len('新年到，做张新年贺卡') == 10
# ⑤ 教学延窗（watch 3300≥2928+300 / turn 2100≥1728+300 防尾截）
assert 3300 >= CRD_WATCH + 300 and 2100 >= CRD_TURN + 300
# ⑥ winFlow celebrate 2620+400=3020 ≥ right 2016+300=2316（家族 H）
assert 2620 + 400 >= CRD_RIGHT + 300, 'celebrate 3020 < %d+300' % CRD_RIGHT
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（crd_right 2016）'
# ⑦ verify 页 estMs/窗动态断言素材在场（运行时对账，build 只验结构存在）
assert "document.querySelectorAll('script')[2]" in verif, 'verify ⑨ 缺 script[2] 源码断言（b36 M1①）'
assert "document.querySelectorAll('script')[0]" in verif, 'verify ⑨ 缺 core 源（script[0]）断言锚'
assert verif.count('runVerify') >= 1 and 'runVerify' not in (data + engine + main), \
    'b36 M1①：script[2]（data+engine+main）不得含 verify 字面（b37 R4 对称）'
assert 'estMsV' in verif and 'keylessLast' in verif, 'verify 缺 estMsV/keylessLast 动态断言素材'
assert 'SPEC_TABLE' in verif, 'verify 缺题表独立硬编码表 SPEC_TABLE（单元⑥）'
assert 'SPEC_WHO_LIKE' in verif and 'SPEC_CONFLICT' in verif, 'verify 缺 r12 偏好/冲突独立表（单元⑥/⑬）'
assert 'deltaAnchors' in verif, 'verify 缺 r12 delta 实锢单元 ⑬ deltaAnchors'
assert 'units.duration' in verif and 'V_DECIDE' in verif and 'V_MIN = 40000' in verif, \
    'verify 缺 r12 时长门禁单元 ⑭ duration（独立副本常量）'
assert 'SHAKE_MS * 1 + 140 <= D.crd_wrong + 150' in verif, 'verify 缺首错锁总窗口径断言（b39 定版/b37 R3）'
assert "CHAIN_WIN.like === 4626" in verif and "CHAIN_WIN.theme === 5010" in verif, \
    'verify 缺 r12 四链窗精确断言素材'
# r12 时长模型字面（data 源常量——build 静态验算与 verify ⑭ 独立副本互证）
assert 'const DECIDE_MS = { like: 10000, clash: 9000, wish: 9000, mix: 11000 }' in data, \
    'data 缺 r12 认知决策常量 DECIDE_MS'
assert 'const LEVEL_MIN_MS = 40000' in data and 'const levelDurMs' in data and \
       'const quizDurMs' in data and 'const stepVoiceMs' in data, 'data 缺 r12 时长模型函数（levelDurMs 族）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚：数值/DOM 类/演出层
#       含元素落位 DOM 断言 svg[data-el]——SPEC §4 任务书明示）=====
for lit in ('dataset.scene', "classList.contains('placed')", "classList.contains('cur')",
            'svg[data-el=', '__lastSayText', 'dataset.j', '.pick-wrap[data-j='):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-el=' in data, 'game-data SVG 缺 data-el 元素锚（契约 M 落位对账依据）'
assert "querySelector('.pick-wrap[data-j=" in main, 'main 缺候选下标选择器（契约 M）'

# ===== 教学链 watch 预算分账（≤16s，单步演示款；名义值累加——r12 行 0 句 15 字）=====
# tutorialWatch watch 段名义分账：watch 延 3300（≥2928+300）+ 开题演出
# （出场 400+estMs(行 0 线索句 15 字)=5775+300=6475）+ ghost 移入 800+press 320
# + demo 演出窗 2316（罩确认链 2016+300 精确）= 13211 ≤ 16000
TUT_SUM = 3300 + (400 + est_ms(SAY_LEN) + 300) + 800 + 320 + 2316
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['TUT_WATCH_WAIT * SPEED', 'TUT_TURN_WAIT * SPEED', '800 * SPEED', '320 * SPEED', 'CARD_WIN * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)
# 卡完成演出/步推进窗素材在场（SPEC §1 卡完成=定格+送出）
for lit in ['FINISH_HOLD * SPEED', 'FINISH_FLY * SPEED', 'STAGE_MS * SPEED']:
    assert lit in main, 'main 缺演出窗 %s（卡完成/步推进）' % lit

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>贺卡工坊</title>' in head, 'head 缺标题 贺卡工坊'

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
print('r12 estMs check: chain-win like %d/clash %d/wish %d/theme %d (exact); card-win 2316 == 2016+300 (exact); '
      'shake total-window %d <= %d (b37 R3+b39 总窗口径); say-win estMs(15)+300+400=%d; tut-budget %dms <= 16000' %
      (4626, 4554, 4674, 5010, 1100 + 140, 1968 + 150, est_ms(15) + 700, TUT_SUM))
