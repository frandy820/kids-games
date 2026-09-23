# -*- coding: utf-8 -*-
"""bodyen 身体英语 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch29/bodyen/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch29/bodyen/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（bod_ 15 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('bodyen')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：bod_ 17 条（通用 7+词音×8+T46 阶段2 again 2）+ core 3 条 = 20 条（SPEC-BATCH29 §4，任务书 ≥14）
# r41 过渡态：新键 23 条（bod_w_ 新词 16+bod_q3/v_* 5/again_do）注册前不在 manifest——注入 20 不变
# 前缀=bod_ 已核 manifest 84 前缀无占用（b28 撞前缀双事故立规：新批前缀先查；r41 新键续用 bod_ 前缀已复核）
BOD_KEYS = ['bod_tut_watch', 'bod_tut_turn', 'bod_hint', 'bod_right', 'bod_wrong', 'bod_q1', 'bod_q2'] + \
           ['bod_w_' + w for w in ['head', 'eye', 'ear', 'nose', 'mouth', 'hand', 'arm', 'leg']] + \
           ['bod_again_hear', 'bod_again_see']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in BOD_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
# r41 终态（主线注册 2026-09-22，manifest 5321→5344）：23 新键已入（16 词音 bod_w_* + do 7 键）
assert n_clips == 43, 'clips 条数 %d != 43（r42 终态：bod 40 + core 3；2026-09-22 注册）' % n_clips
# 注入键前缀对账：只允许 bod_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('bod_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 bod_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('bod_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'bodyen'" in main, 'main 缺 KIDS.init bodyen（存档键 kidsgame_bodyen）'
assert 'window.BE =' in main, 'main 缺 BE 钩子'
assert '__beDemoR' in main, 'main 缺教学演示实证 __beDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.bodyen.tutSeen）
assert 'sv.bodyen && sv.bodyen.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + 7200' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=7200'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（2026-09-10 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，词音/clip 段禁置于其后），防后代批再踩
for _m in re.finditer(r'\{ key: null[^}]*\}', main):
    _tail = main[_m.end():_m.end() + 8].lstrip()
    assert _tail.startswith(']'), \
        'game-main keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % _tail[:6]

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版：窗 ≥ estMs(最长句)/链实长）=====
# estMs 口径（b25 定版，家族 T 全字符）：SAPI ~345ms/字 + 600 落定余量（n×345+600）
est_ms = lambda n: n * 345 + 600
# 语义句模板逐字钉死（契约 I 下界依据；三句均 8 字；r41 增 do 句）
for frag in ('再听一遍这个单词', '再看看它指的地方', '再听一遍这个指令'):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == 8, '语义句 %s 应 8 字符' % frag
    assert not re.search(r'\d', frag), '语义句含数字（契约 L 豁免前提：本款无数字词）'
# T46 阶段2（2026-09-19）：语义句 clip 化（bod_again_hear/see，manifest 实长 ffprobe=SPEC_DUR 口径）
# ——链下界从 estMs(8)=3360 改按 clip 实长 2352/2376 推导（禁从实现归纳）
AGN_HEAR, AGN_SEE = 2352, 2376
MAX_WORD, BOD_WRONG, BOD_RIGHT = 1656, 1656, 2256   # r41 终态：24 词全域实长 max=bod_w_shoulder 1656（旧 1536=8 词时代 bod_w_nose；mutagen 2026-09-22）
# ① 确认链（判对拼播：bod_right+150+词音 max 1656）→ 演出窗 1600+2900=4500 ≥ 链+300=4362
assert '1600 * SPEED' in main and '2900 * SPEED' in main, 'main 缺判对演出窗 1600+2900（家族 G/H）'
assert 1600 + 2900 >= BOD_RIGHT + 150 + MAX_WORD + 300, \
    '判对演出窗 4500 < 确认链 %d+150+%d+300' % (BOD_RIGHT, MAX_WORD)
# ② 错反馈链豁免窗（契约 I）：最长 hear 链=1656+150+2352+150+MAX_WORD(1656)=5964 → 窗 ≥6264（m-2 勘误原 5844/6144 旧词音口径）
assert 7200 >= BOD_WRONG + 150 + AGN_HEAR + 150 + MAX_WORD + 300, \
    '链豁免窗 7200 < hear 链 %d+150+%d+150+%d+300' % (BOD_WRONG, AGN_HEAR, MAX_WORD)
assert 7200 >= BOD_WRONG + 150 + AGN_SEE + 300, \
    '链豁免窗 7200 < see 链（SPEC 最小式 %d+150+%d+300）' % (BOD_WRONG, AGN_SEE)
# r41 do 错链=[wrong, again_do]（est 口径，bod_again_do 注册后实长复核）：1656+150+3360+300=5466 ≤7200
AGN_DO_EST = est_ms(8)
assert 7200 >= BOD_WRONG + 150 + AGN_DO_EST + 300, \
    '链豁免窗 7200 < do 链 %d+150+%d+300' % (BOD_WRONG, AGN_DO_EST)
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# r41 do-action 确认链=两段 [bod_right, bod_v_*]（§R10 挂账转增强 2026-09-22：v_* 实测
# max=bod_v_stomp 1608——2256+150+1608+300=4314≤4500 窗收；防回归锚）
V_MAX = 1608
assert "q.kind === 'do' && q.verb !== 'touch') KIDS.voice.queue([VOICE.right.key, verbClip(q.ask)])" in main, \
    'main 缺 do-action 确认链两段式 [right, 动词短语]（§R10 增强锚）'
assert 4500 >= BOD_RIGHT + 150 + V_MAX + 300, \
    '判对窗 4500 < do-action 两段确认链 %d+150+%d+300' % (BOD_RIGHT, V_MAX)
# ③ clip 实长窗（SPEC-BATCH29 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3468 * SPEED' in main, 'main 缺教学词音演示延窗 t=3468（bod_tut_watch 3168+300）'
assert 3468 >= 3168 + 300, '教学词音演示延 3468 < bod_tut_watch 3168+300'
assert '}, 2150);' in main, 'main 教学 turn 后读题延 2150 缺失（bod_tut_turn 1824+300 防尾截）'
assert 2150 >= 1824 + 300, 'turn 后读题延 2150 < bod_tut_turn 1824+300=2124'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（bod_right ≥2556）'
assert 2620 + 400 >= BOD_RIGHT + 300, 'celebrate 2620+400=3020 < bod_right 2256+300=2556'
# ④ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑤ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1600 + 2900' in verif, 'verify 缺 estMs 动态断言'
assert "'bod_w_eye'" in verif or "'bod_w_' + " in verif or 'bod_w_eye' in verif, 'verify 缺词音键独立断言素材'

# ===== 契约 L 豁免证据：全款 TTS 句无数字词（本款无数字词——SPEC §0 任务书豁免款）=====
for s in ('再听一遍这个单词', '再看看它指的地方', '再听一遍这个指令'):
    assert not re.search(r'\d', s)

# ===== r41 结构锚（词库 24 扩容 / 近形音族 / 动词指令域 / do 三分支）=====
WORDS24 = ['head', 'face', 'hair', 'eyebrow', 'eye', 'ear', 'nose', 'mouth', 'tooth', 'tongue',
           'chin', 'cheek', 'neck', 'shoulder', 'arm', 'elbow', 'hand', 'finger', 'thumb', 'leg',
           'knee', 'foot', 'toe', 'belly']
_m = re.search(r"const WORDS24 = \[([^\]]+)\];", data)
assert _m and [w.strip().strip("'") for w in _m.group(1).split(',')] == WORDS24, \
    'WORDS24 词表与 SPEC-R41 §R2 不一致（24 词头→脚序）'
_m = re.search(r"const PART_ZH = \{([^}]+)\}", data)
assert _m and len([k for k in _m.group(1).split(',') if ':' in k]) == 24, 'PART_ZH 应 24 键'
for w in WORDS24:
    assert "'%s'" % w in data, 'game-data 缺词 %s' % w
# 近形音族表：20 有族词（ch2+ 条件必在场）/4 无族（face/mouth/shoulder/belly）——
# 族表逐词细断言在 game-verify ②/pycheck（三层独立），此处只验在场与派生式
_m = re.search(r"const NEAR = \{([^}]+)\};", data)
assert _m and _m.group(1).count(':') == 24, 'NEAR 表应 24 键（含空族 4 词）'
assert 'NEAR20' in data and 'filter(w => NEAR[w].length > 0)' in data, 'NEAR20 派生式缺失'
assert "NEAR[" in engine and "dch4slot" in engine and "doAsk20" in engine and "deckOf" in engine, \
    'engine 缺 r41 新章型结构（NEAR 引用/dch4 do 槽/do-touch 域/族牌库）'
# 动词指令域（5 动词；point 否决=视觉不可判，SPEC §R1）
_m = re.search(r"const VERBS = \[([^\]]+)\];", data)
assert _m and [v.strip().strip("'") for v in _m.group(1).split(',')] == \
       ['touch', 'clap', 'shake', 'stomp', 'wave'], 'VERBS 与 SPEC-R41 §R2 不一致'
for lit in ("ACT_ZH = { clap: '拍拍手', shake: '摇摇头', stomp: '跺跺脚', wave: '挥挥手' }",
            "const ACT_SVG = {"):
    assert lit in data, 'game-data 缺动作锚 %s' % lit[:30]
# r41 新语音键构造（7 do 键；文案与 SPEC-R41 §R6 一字一致——主线 gen_clips 注册源）
for lit in ("q3:    { key: 'bod_q3',        text: '听一听，选出那个动作' }",
            "const verbClip = v => 'bod_v_' + v;",
            "const DO_AGAIN = '再听一遍这个指令';"):
    assert lit in data, 'game-data 缺 do 键构造 %r' % lit[:40]
assert data.count("'touch your'") == 0, "verbClip 键拼接构造（'touch your' 文案属 gen_clips/manifest 面，禁入游戏源）"
# 词音键构造覆盖 24 词（bod_w_*；16 新词注册走主线 TODO）
assert "const wordClip = w => 'bod_w_' + w;" in data, 'wordClip 构造缺失'
# main do 分支锚（渲染/链/救援方向级）
for lit in ("verbClip(q.ask)", "bodySvg(o.part, 'touch')", "ACT_SVG[o.verb]",
            "b.className = 'card pop ' + (q.kind === 'hear' ? 'pcard' : q.kind === 'do' ? (o.part ? 'pcard dcard' : 'acard') : 'wcard')",
            "wSizeCls"):
    assert lit in main, 'main 缺 do/长词分支锚 %r' % lit[:40]
assert "q.kind === 'do') replayAnim(sceneEl, 'pulse')" in main, 'main do 错点方向级 pulse 缺失'
# head CSS 锚（长词档/动作卡）
for lit in ('.card .w-label.xs', '.card.acard svg', '.card .a-label'):
    assert lit in head, 'head 缺 CSS 锚 %s（r41 长词/动作卡）' % lit

# ===== 契约 M：verify 帧内容断言素材在场（分题型渲染 DOM 锚）+ r41 do 素材 =====
for lit in ("dataset.ask", "dataset.part", "w-label", ".pt.hl"):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
for lit in ("SPEC_VERBS", "SPEC_NEAR20", "dcard", "acard", "a-label", "ptouch", "dch4slot"):
    assert lit in verif, 'verify 缺 r41 do 断言素材 %s' % lit
assert 'data-part=' in data, 'game-data SVG 缺部位 data-part 锚（契约 M 渲染对账依据）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加）=====
# tutorialWatch 名义分账：watch 延 3468 + 词音+ghost 移入窗 1600（≥eye 1296+300）
# + press 320 + demo 演出窗 1600+2900（罩确认链 2256+150+1296+300=4002）+ 收尾 300 = 10188 ≤ 16000
TUT_SUM = 3468 + 1600 + 320 + 1600 + 2900 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3468 * SPEED', '1600 * SPEED', '320 * SPEED', '300 * SPEED', '2900 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>身体英语</title>' in head, 'head 缺标题 身体英语'

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
print('estMs check: confirm chain %d+150+%d+300=%d <= 4500 right-win; '
      'wrong-chain %d+150+%d(+150+%d)+300 <= 7200; tut-budget %dms <= 16000' %
      (BOD_RIGHT, MAX_WORD, BOD_RIGHT + 150 + MAX_WORD + 300,
       BOD_WRONG, AGN_HEAR, MAX_WORD, TUT_SUM))
