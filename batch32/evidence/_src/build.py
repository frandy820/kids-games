# -*- coding: utf-8 -*-
"""evidence 找证据 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r17 难度改造 v2（2026-09-17）：结论池 20+证据推理三档+findall 三真值多选+反问+同关去重（SPEC §-r17-evidence）。
用法: python batch32/evidence/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch32/evidence/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
selftest = (ROOT / '_selftest.py').read_text(encoding='utf-8')
# 语音 clips 注入（r17+T46：evi_ 29 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('evidence')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：evi_ 29 条（通用 7+evi_q3+结论句×20+T46 语义句 evi_again）+ core 3 条 = 32 条
# 前缀=evi_ 已核 manifest 无占用（b28 立规先查）；evi_q2 文本迁移删 mp3 重合成（键数不变）
EVI_CONCLS = ['rainwet', 'snowplay', 'birthday', 'cooked',
              'doghere', 'windbig', 'paintday', 'nightowl',
              'washhands', 'ateorange', 'haircut', 'waterplant',
              'mopped', 'brushed', 'fedfish', 'playedblocks',
              'drankmilk', 'wrotehomework', 'fixedbike', 'playedsandbox']   # 结论封闭 20（r17）
EVI_KEYS = ['evi_tut_watch', 'evi_tut_turn', 'evi_hint', 'evi_right', 'evi_wrong',
            'evi_q1', 'evi_q2', 'evi_q3', 'evi_again'] + ['evi_c_' + c for c in EVI_CONCLS]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in EVI_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 32, 'clips 条数 %d != 32（evi 29 + core 3）' % n_clips
# 注入键前缀对账：只允许 evi_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('evi_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 evi_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('evi_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'evidence'" in main, 'main 缺 KIDS.init evidence（存档键 kidsgame_evidence）'
assert 'window.EV =' in main, 'main 缺 EV 钩子'
assert '__evDemoR' in main, 'main 缺教学演示实证 __evDemoR'
# 家族契约 A（r17 升级双 lim-1 形态，E-M1 修复）：winFlow dayEnd 与启动 dayEnd 两处实算 +
# 日末停留 Math.max(0, lim-1)；旧 null 实参形态禁再现（含注释）
assert main.count('nextHint(lim - 1)') == 2, 'nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 null 实参形态（r17 双 lim-1 定版；注释亦禁该字面）'
assert 'Math.max(0, lim - 1)' in main, '启动日末缺停留今日末关 Math.max(0, lim - 1)'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.evidence.tutSeen）
assert 'sv.evidence && sv.evidence.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 4242（evi_wrong 2112+150+evi_again 1680+300，T46 clip 实长口径）+ 救援 interval 守卫 + startLevel 重置
assert 'WRONG_CHAIN_WIN = 2112 + 150 + 1680 + 300' in main, 'main 缺错链豁免窗常量 2112+150+1680+300（契约 I，T46）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错链豁免窗设置（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 I 补（b31→r17 定版）：判定式题型 guard 挂 uiTapOpt（错点吞/对选放行，真时钟窗）；
# findall 勾选中性不吞+守卫挂 uiSubmit（§-r17 §5 契约 I r17 补——窗内提交吞 pop+bump）
assert 'judging && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer' in main, \
    'main 缺 uiTapOpt 错链窗判定式 guard（契约 I r17）'
assert 'if (!demo && wrongChainUntil && Date.now() < wrongChainUntil) {' in main, \
    'main 缺 uiSubmit 错链窗提交 guard（契约 I r17 补）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，clip 段禁置于其后），防后代批再踩
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版：窗 ≥ estMs(最长句)/链实长）=====
# estMs 口径（b25 定版，家族 T 全字符）：SAPI ~345ms/字 + 600 落定余量（n×345+600）
est_ms = lambda n: n * 345 + 600
# 错反馈语义句尾段逐字钉死（契约 I 下界依据；「能证明吗」4 字）
for frag, n in (('能证明吗', 4),):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
    assert not re.search(r'\d', frag), '语义句含数字（证据标签不读名音，无数字 TTS 需求）'
# 屏显问句逐字钉死（三族分流依据；r17：q2 三张图文本迁移+q3 反问新句）
for frag in ('哪张能证明它呀？', '找出能证明它的三张图', '哪张不能证明它呀？'):
    assert "'%s'" % frag in data, 'game-data 缺屏显问句 %s' % frag
EVI_RIGHT, MAX_CONCL = 2472, 2832     # §-r17 §5：evi_right / 结论句 max（evi_c_nightowl 2832）
EVI_WRONG, EVI_Q1, EVI_Q2, EVI_Q3 = 2112, 2232, 3120, 2376
EVI_WATCH, EVI_TURN, EVI_C_RAINWET = 2928, 1920, 1776
EVI_AGAIN = 1680                                          # T46 语义句 evi_again「能证明吗」clip 实长
# ① 确认链（evi_right 单段——findall 两卡 lit 动画承载，不拼名音）
#    → 演出窗 1600+1300=2900 ≥ 2472+300=2772（SPEC §4「判对后窗 ≥2772」）
assert '1600 * SPEED' in main and '1300 * SPEED' in main, 'main 缺判对演出窗 1600+1300（家族 G/H）'
assert 1600 + 1300 >= EVI_RIGHT + 300, \
    '判对演出窗 2900 < 确认链 %d+300' % EVI_RIGHT
# ② 错反馈链豁免窗（契约 I，T46 clip 实长口径）：evi_wrong 2112+150+evi_again 1680+300=4242
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
assert EVI_WRONG + 150 + EVI_AGAIN + 300 == 4242, \
    '错链豁免窗构成不符（2112+150+1680+300=4242，T46）'
assert '2112 + 150 + 1680 + 300' in main, 'main 缺错链窗构成表达式（豁免窗=4242 静态断言，T46）'
# ③ clip 实长窗（SPEC-BATCH32 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3300 * SPEED' in main, 'main 缺教学 watch 演示延窗 t=3300（evi_tut_watch 2928+300）'
assert 3300 >= EVI_WATCH + 300, '教学 watch 演示延 3300 < evi_tut_watch 2928+300=3228'
assert '3200 * SPEED' in main, 'main 缺教学结论句窗 3200（evi_c_rainwet 1776+300）'
assert 3200 >= EVI_C_RAINWET + 300, '教学结论句窗 3200 < evi_c_rainwet 1776+300=2076'
assert '}, 2300);' in main, 'main 教学 turn 后读题延 2300 缺失（evi_tut_turn 1920+300 防尾截）'
assert 2300 >= EVI_TURN + 300, 'turn 后读题延 2300 < evi_tut_turn 1920+300=2220'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（evi_right ≥2772）'
assert 2620 + 400 >= EVI_RIGHT + 300, 'celebrate 2620+400=3020 < evi_right 2472+300=2772'
# ④ 题面链窗知识断言（§-r17 §5）：findexact max=2832+150+2232+300=5514 /
#    findall max=2832+150+3120+300=6402 / reverse max=2832+150+2376+300=5658
assert MAX_CONCL + 150 + EVI_Q1 + 300 == 5514, 'findexact 题面链 max 应 5514'
assert MAX_CONCL + 150 + EVI_Q2 + 300 == 6402, 'findall 题面链 max 应 6402'
assert MAX_CONCL + 150 + EVI_Q3 + 300 == 5658, 'reverse 题面链 max 应 5658'
# ⑤ estMs 全字符口径四方同步之一（家族 T：len*345+600——r17 定义移驻 data，main 不再重复声明）
assert 'const estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（四方同步之一）'
assert 'const estMs' not in main, 'main 不得重复声明 estMs（data+main 同块拼接=SyntaxError）'
assert 'n * 345 + 600' in selftest, '_selftest 缺 estMs 口径 lambda（四方一致；E-m2 修复）'
# ⑥ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在；verify 侧函数域独立定义）
assert 'estMs = n => n * 345 + 600' in verif and '1600 + 1300' in verif, 'verify 缺 estMs 动态断言'
assert "'evi_c_' + " in verif, 'verify 缺结论句键独立断言素材'
# ⑥b r17 时长模型双钉素材：modeled 最低值 88100 精确断言在 verify（禁约数）
assert 'SPEC_MODELED_MIN = 88100' in verif and 'modeled(0) === SPEC_MODELED_MIN' in verif, \
    'verify 缺 modeled 88100 精确钉死断言（§-r17 §4）'
assert 'const DECIDE_MS = { findexact: 8000, findall: 11500, reverse: 9000 }' in data, \
    'data 缺 DECIDE_MS 三族字面（§-r17 §4）'
# ⑦ T46 语义句键段断言素材在场（clip 化替代 keylessLast——契约 N 全 clip 化）
assert "'evi_again'" in verif, 'verify 缺语义句键段断言 evi_again（T46 阶段2 替代 keylessLast）'
assert 'keylessLast' not in verif, 'verify keylessLast 断言应随 T46 clip 化退役'

# ===== 题库硬指标静态断言（§-r17 §1/§3 数学先验的源级锚）=====
# 结论封闭 20 + 证据场景 114（verify 运行时全量对账，此处锚关键常量）
assert "CONCLS20 = ['rainwet', 'snowplay', 'birthday', 'cooked'," in data, 'data 缺结论封闭 20 表'
assert 'CONCLS8' not in data and 'CONCLS8' not in engine and 'CONCLS8' not in main and 'CONCLS8' not in verif, \
    'r17 禁残留 CONCLS8 旧表名（全部改挂 CONCLS20）'
assert "const CH_LEN = 8" in data and "const STATIC_LEVELS = 32" in data, 'data 缺 r17 关型常量（CH_LEN 8/STATIC 32）'
assert "mulberry32(flat * 7919 + 1031)" in engine, 'engine 缺本批种子常量 1031（SPEC §0.78）'
# r17 真值数先验锚（防双真值：findexact 恰 1 真+3 干扰；findall/reverse 三真值全在场）
assert "const nT = q.kind === 'findexact' ? 1 : 3" in engine, 'engine 缺真值数先验（防双真值）'
# r17 档位律锚（dch1 二分全 none/dch2 三档 weak≥1+none≥1——独立于实现的先验）
assert "return 'tier1'" in engine and "return 'tier2'" in engine, 'engine 缺档位律先验 tier1/tier2'
# r17 题型三族+生成关 dch 域锚（KIND_POOL：dch3 只 findall/dch4 三族在场保证）
assert "3: ['findall']" in engine and "4: ['findexact', 'findall', 'reverse']" in engine, \
    'engine 缺 r17 KIND_POOL 三族章域'
# findall pick/unpick+engSubmit 判定步锚（SPEC §-r17 §2 契约 F17）
assert "return 'pick';" in engine and "return 'unpick';" in engine, 'engine 缺 findall 勾选中性分流'
assert 'function engSubmit(' in engine and \
    'q.picked.filter(i => q.answers.indexOf(i) >= 0)' in engine, \
    'engine 缺 engSubmit 判定步（F17：对位保留 picked∩answers）'

# ===== r17 键基迁移 IIFE（CH_LEN 5→8，r16 范式——矛盾态+脏键守卫，先于 KIDS.init）=====
assert "localStorage.getItem('kidsgame_evidence')" in main and \
    "lv[(c - 1) + '-5']" in main and '> CH_LEN - 1' in main, \
    'main 缺存档迁移 IIFE（矛盾态检测+脏键守卫，§-r17 §3）'
assert main.index('kidsgame_evidence\')') < main.index("KIDS.init({ game: 'evidence'"), \
    '迁移 IIFE 必须先于 KIDS.init 读档执行'

# ===== r17 提交制 UI（findall 判定步）：#btn-submit+勾选角标（head）+接线（main/data）=====
assert '#btn-submit' in head and '.card .tick' in head and '.card.held' in head, \
    'head 缺提交钮/勾选角标样式（§-r17 §6 UI）'
assert 'submitBtn.innerHTML = ICONS.check' in main and 'submitBtn.addEventListener' in main, \
    'main 缺提交钮接线（ICONS.check+pointerdown→uiSubmit）'
assert "check: '<svg" in data, 'data 缺 ICONS.check（提交钮图标）'
assert "tapSubmit() { return uiSubmit(); }" in main, 'EV 钩子缺 tapSubmit（§-r17 §6）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.img', 'dataset.concl', 'g[data-img]', 'q-text', 'c-text'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-concl="' in main or 'dataset.concl' in main, 'main 结论卡渲染缺 data-concl 锚（契约 M）'
assert 'data-img = o.img' in main or "dataset.img = o.img" in main, 'main 证据卡渲染缺 data-img 锚（契约 M）'

# ===== r17 竖屏双通道逐行全等（§-r17 §6：@media(orientation:portrait) 与 body.port 类通道
# 规则逐行相同——/*PORT-CLS*/ 标记段；verify 竖屏模拟/自测 P1b 依赖 body.port 通道）=====
assert '/*PORT-CLS*/' in head, 'head 缺 /*PORT-CLS*/ 标记（body.port 段起点）'
_media_m = re.search(r'@media \(orientation:portrait\)\{(.*?)\n\}', head, re.S)
_port_m = re.search(r'/\*PORT-CLS\*/\n(.*?)\n</style>', head, re.S)
assert _media_m and _port_m, 'head 缺 @media portrait 块或 body.port 段'
_media_lines = [ln.strip() for ln in _media_m.group(1).splitlines() if ln.strip()]
_port_lines = [ln.strip() for ln in _port_m.group(1).splitlines() if ln.strip()]
assert _port_lines and all(ln.startswith('body.port ') for ln in _port_lines), \
    'body.port 段存在非 body.port 前缀行'
_norm_port = [ln[len('body.port '):] for ln in _port_lines]
assert len(_media_lines) == len(_norm_port), \
    'PORT-CLS 行数不等：@media %d vs body.port %d' % (len(_media_lines), len(_norm_port))
for _i, (_a, _p) in enumerate(zip(_media_lines, _norm_port)):
    assert _a == _p, 'PORT-CLS 第 %d 行不等：@media=%r vs body.port=%r' % (_i + 1, _a, _p)

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 3300（≥2928+300）+ 结论句窗 3200（≥1776+300，q1 在播）
# + ghost 移卡窗 900 + press 320 + demo 演出窗 1600+1300（罩确认链 2472+300=2772）
# + 收尾 300 = 10620 ≤ 16000
TUT_SUM = 3300 + 3200 + 900 + 320 + 1600 + 1300 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3300 * SPEED', '3200 * SPEED', '900 * SPEED', '320 * SPEED', '300 * SPEED', '1300 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题/按钮显式色（契约 O：自建 button 带显式 color，禁依赖 core 兜底）
assert '<title>找证据</title>' in head, 'head 缺标题 找证据'
assert re.search(r'button\{[^}]*color:#4A3B2E', head), 'head button 规则缺显式 color（契约 O）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +          # verify 独立第 4 块（E-M2：禁并入 game 块自匹配）
        '</body>\n</html>\n')
assert html.count('<script>') == 4, 'script 块数 %d != 4（verify 须独立第 4 块，E-M2）' % html.count('<script>')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('r17+T46 check: confirm chain %d+300=%d <= 2900 right-win; '
      'wrong-chain 2112+150+%d+300=%d; q-chain max findexact %d / findall %d / reverse %d; '
      'modeled min 88100; PORT-CLS %d lines equal; tut-budget %dms <= 16000' %
      (EVI_RIGHT, EVI_RIGHT + 300, EVI_AGAIN, EVI_WRONG + 150 + EVI_AGAIN + 300,
       MAX_CONCL + 150 + EVI_Q1 + 300, MAX_CONCL + 150 + EVI_Q2 + 300,
       MAX_CONCL + 150 + EVI_Q3 + 300, len(_media_lines), TUT_SUM))
