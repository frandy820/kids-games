# -*- coding: utf-8 -*-
"""babylove 动物宝宝找妈妈 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r10 难度改造（2026-09-14，AUDIT-56 #28）：配对封闭 12+近形干扰+发育链三段序+生境×发育双维。
用法: python batch30/babylove/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch30/babylove/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（bab_ 44 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('babylove')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：bab_ 44 条（通用 14+名音×30）+ core 3 条 = 47 条（SPEC-BATCH30 r10 块）
# 前缀=bab_ 已核 manifest 无占用（b28 撞前缀双事故立规：新批前缀先查）
BAB_IDS = ['tadpole', 'caterpillar', 'chick', 'puppy', 'kitten', 'calf',       # 配对封闭 12（幼 6+成 6 原）
           'frog', 'butterfly', 'hen', 'dog', 'cat', 'cow',
           'fishfry', 'duckling', 'grub', 'lamb', 'piglet', 'foal',           # r10 扩容 6 对（幼 6+成 6）
           'fish', 'duck', 'beetle', 'sheep', 'pig', 'horse',
           'egg_frog', 'egg_butterfly', 'egg_beetle', 'egg_fish',             # r10 发育链卵段 6
           'egg_hen', 'egg_duck']
BAB_KEYS = ['bab_tut_watch', 'bab_tut_turn', 'bab_hint', 'bab_right', 'bab_wrong',
            'bab_q1', 'bab_q2', 'bab_q3', 'bab_grow_next',
            'bab_h_water', 'bab_h_forest', 'bab_h_grass', 'bab_q4_mom', 'bab_q4_baby',
            'bab_again_mom', 'bab_again_baby', 'bab_again_grow', 'bab_again_hab'] + \
           ['bab_n_' + w for w in BAB_IDS]   # T46 阶段2：again 四键（语义句 clip 化）
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in BAB_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 51, 'clips 条数 %d != 51（bab 48 + core 3）' % n_clips
# 注入键前缀对账：只允许 bab_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('bab_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 bab_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('bab_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'babylove'" in main, 'main 缺 KIDS.init babylove（存档键 kidsgame_babylove）'
assert 'window.BL =' in main, 'main 缺 BL 钩子'
assert '__blDemoR' in main, 'main 缺教学演示实证 __blDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.babylove.tutSeen）
assert 'sv.babylove && sv.babylove.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%5——r10 五章）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 5' not in main, 'nextHint 禁 (ci+1)%5 章序推进（b26 审查 M3 同型）'
assert 'ci < 5 ? CHAPTERS[ci + 1].hint' in main, 'main 章末预告段缺五章分支（r10）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + 6600' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=6600'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（b29 反方审查 major，core voice.queue 弃尾语义）：
# keyless TTS 段（{key:null}）播完即 return 丢弃后续段——凡含 keyless 段的
# queue 链中该段必须居末元素（TTS 恒链尾，名音/clip 段禁置于其后），防后代批再踩
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== r10 结构断言：配对封闭 12 / 近形对 / 发育链 6 / 生境 3 / 章配置 =====
for frag in ("fishfry: 'fish', duckling: 'duck', grub: 'beetle'",
             "lamb: 'sheep', piglet: 'pig', foal: 'horse'"):
    assert frag in data, 'game-data 配对封闭 12 缺 r10 扩容段: %s' % frag
assert 'CONFUSABLE' in data and "tadpole: 'fishfry', fishfry: 'tadpole'" in data \
    and "caterpillar: 'grub', grub: 'caterpillar'" in data, 'game-data 缺近形干扰对 CONFUSABLE（r10）'
for ch in ('frog', 'butterfly', 'beetle', 'fish', 'hen', 'duck'):
    assert ("'%s'" % ch) in re.search(r'const GROWTH = \{(.*?)\};', data, re.S).group(1), 'GROWTH 缺链 %s' % ch
assert "HABITATS = ['water', 'forest', 'grass']" in data, 'game-data 缺生境表（r10）'
assert 'STATIC_LEVELS = 25' in data, 'game-data 缺 STATIC_LEVELS=25（r10 五章 25 关）'
assert len(re.findall(r"hint:\s*'[^']+'", data)) == 5, 'game-data CHAPTERS 应 5 章（r10）'
assert len(re.findall(r"'[^']+'", re.search(r'const GEN_HINTS = \[([^\]]+)\]', data).group(1))) == 5, \
    'GEN_HINTS 应 5 条（r10 五型）'
# r10 步语义：tapOpt 返回 'step'（storybed 先例）
assert "return 'step';" in engine, 'engine 缺 step 返回（r10 多步契约）'
assert 'quizView' in engine and 'quizView' in main, 'engine/main 缺 quizView 当前步视图（r10）'

# ===== 语音窗静态断言（家族 G/H/I/T + b25 定版 + r10 窗表：窗 ≥ estMs(最长句)/链实长）=====
# estMs 口径（b25 定版，家族 T 全字符）：SAPI ~345ms/字 + 600 落定余量（n×345+600）
est_ms = lambda n: n * 345 + 600
# 语义句模板逐字钉死（契约 I 下界依据；findmom 11 / findbaby 9 / grow 8 / habitat 9 字）
for frag, n in (('再看看它的妈妈长什么样', 11), ('再看看这个宝宝是谁', 9),
                ('再想想长大的顺序', 8), ('再看看它住在哪里', 8)):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
    assert not re.search(r'\d', frag), '语义句含数字（契约 L 豁免前提：本款无数字词）'
MAX_NAME, BAB_WRONG, BAB_RIGHT = 1848, 1656, 2280     # r10 实测：名音 max（bab_n_grub）/wrong/right
# T46 阶段2（2026-09-19）：四题型语义句 clip 化——链下界从 estMs 字数口径改按 clip 实长推导
# （ffprobe=SPEC_DUR 口径实测：mom 2904 / baby 2880 / grow 2568 / hab 2688；禁从实现归纳）
AGN_MOM, AGN_BABY, AGN_GROW, AGN_HAB = 2904, 2880, 2568, 2688
# ① 确认链（题尾判对拼播：bab_right+150+名音 max 1848）→ 演出窗 1600+3200=4800 ≥ 链+300=4578
assert '1600 * SPEED' in main and '3200 * SPEED' in main, 'main 缺判对演出窗 1600+3200（家族 G/H r10）'
assert 1600 + 3200 >= BAB_RIGHT + 150 + MAX_NAME + 300, \
    '判对演出窗 4800 < 确认链 %d+150+%d+300' % (BAB_RIGHT, MAX_NAME)
# ② 错反馈链豁免窗（契约 I）：四题型最长链 findmom=1656+150+2904 → ≥5010
assert 6600 >= BAB_WRONG + 150 + AGN_MOM + 300, \
    '链豁免窗 6600 < findmom 链 %d+150+%d+300' % (BAB_WRONG, AGN_MOM)
assert 6600 >= BAB_WRONG + 150 + AGN_BABY + 300, \
    '链豁免窗 6600 < findbaby 链 %d+150+%d+300' % (BAB_WRONG, AGN_BABY)
assert 6600 >= BAB_WRONG + 150 + AGN_GROW + 300, \
    '链豁免窗 6600 < grow 链 %d+150+%d+300' % (BAB_WRONG, AGN_GROW)
assert 6600 >= BAB_WRONG + 150 + AGN_HAB + 300, \
    '链豁免窗 6600 < habitat 链 %d+150+%d+300' % (BAB_WRONG, AGN_HAB)
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ③ r10 时长窗常量（SPEC r10 窗表；verify modeled 对账的独立真值）
assert 'SUB_WIN = 2400' in main, 'main 缺配对小问切换窗 SUB_WIN=2400（r10）'
assert 'HAB_SUB_WIN = 2600' in main, 'main 缺 habitat 小问窗 HAB_SUB_WIN=2600（r10）'
assert 'GROW_STEP_WIN = 2200' in main, 'main 缺 grow 步动画窗 GROW_STEP_WIN=2200（r10）'
assert 2400 >= MAX_NAME + 300, 'SUB_WIN 2400 < 名音 max %d+300' % MAX_NAME
assert 2600 >= 2136 + 300, 'HAB_SUB_WIN 2600 < bab_q4_mom 2136+300'
assert 2200 >= 1488 + 300, 'GROW_STEP_WIN 2200 < bab_grow_next 1488+300'
# ④ r10 关时长下界（审计 #28 实测 22s 根治）：三类题型题窗公式 ×5 题 ≥40000ms
for kind, twin in (('findmom/findbaby', 2 * 2400 + 4800), ('grow', 2 * 2200 + 4800),
                   ('habitat', 2 * 2600 + 4800)):
    assert twin * 5 >= 40000, 'r10 关时长下界 %s×5=%d < 40000（40s 门禁）' % (kind, twin * 5)
# ⑤ clip 实长窗（SPEC §4+r10 量化）：窗值 ≥ clip 实测 + 300 余量
assert '3400 * SPEED' in main, 'main 缺教学开题链演示延窗 t=3400（bab_tut_watch 3072+300）'
assert 3400 >= 3072 + 300, '教学开题链演示延 3400 < bab_tut_watch 3072+300=3372'
assert '4100 * SPEED' in main, 'main 缺教学开题链演示窗 4100（bab_n_tadpole+150+bab_q1+300=4050）'
assert 4100 >= 1368 + 150 + 2232 + 300, '教学开题链演示窗 4100 < 1368+150+2232+300=4050'
assert '}, 2150);' in main, 'main 教学 turn 后读题延 2150 缺失（bab_tut_turn 1824+300 防尾截）'
assert 2150 >= 1824 + 300, 'turn 后读题延 2150 < bab_tut_turn 1824+300=2124'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（bab_right ≥2580）'
assert 2620 + 400 >= BAB_RIGHT + 300, 'celebrate 2620+400=3020 < bab_right 2280+300=2580'
# ⑥ estMs 全字符口径在场（家族 T：len*345+600）
assert 's.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义（家族 T）'
# ⑦ verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在）
assert 'estMs' in verif and '1600 + 3200' in verif, 'verify 缺 estMs 动态断言'
assert "'bab_grow_next'" in verif and "'bab_q4_mom'" in verif, 'verify 缺 r10 新键断言素材'
assert 'modeled' in verif and 'M_LEVEL_MIN' in verif, 'verify 缺 r10 时长 modeled 断言'
assert 'wallClock' in verif or 'wcOf' in verif, 'verify 缺 r10 wall-clock 折算断言'
# ⑧ keylessLast 断言素材在场（契约 N：keyless 段恒链尾的运行时对账）
assert 'keylessLast' in verif, 'verify 缺 keylessLast 断言（契约 N/Mj-1）'

# ===== 契约 L 豁免证据：全款 TTS 句无数字词（本款无数字词——SPEC §0 任务书豁免款）=====
for s in ('再看看它的妈妈长什么样', '再看看这个宝宝是谁', '再想想长大的顺序', '再看看它住在哪里'):
    assert not re.search(r'\d', s)

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('dataset.anim', 'dataset.ask', 'g[data-anim]', 'q-text', 'data-hab'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-anim="' in data or 'data-anim=' in data, 'game-data SVG 缺 data-anim 锚（契约 M 渲染对账依据）'
assert 'data-hab=' in data, 'game-data 生境 SVG 缺 data-hab 锚（契约 M r10）'

# ===== 教学链 watch 预算分账（≤16s，名义值累加——r10 demo 走 step 分支窗 2400 由演示窗罩）=====
# tutorialWatch 名义分账：watch 延 3400（≥3072+300）+ 开题链+ghost 移入窗 4100
# （≥1368+150+2232+300=4050）+ press 320 + demo 演出窗 1600+3200（step 窗 2400 罩内）
# + 收尾 300 = 12920 ≤ 16000
TUT_SUM = 3400 + 4100 + 320 + 1600 + 3200 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['3400 * SPEED', '4100 * SPEED', '320 * SPEED', '300 * SPEED', '3200 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# 硬性检查 2c：head 标题与存档名对齐
assert '<title>动物宝宝找妈妈</title>' in head, 'head 缺标题 动物宝宝找妈妈'

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
print('estMs check: confirm chain %d+150+%d+300=%d <= 4800 right-win; '
      'wrong-chain max(mom) %d+150+%d=%d(+300) <= 6600; tut-budget %dms <= 16000' %
      (BAB_RIGHT, MAX_NAME, BAB_RIGHT + 150 + MAX_NAME + 300,
       BAB_WRONG, AGN_MOM, BAB_WRONG + 150 + AGN_MOM, TUT_SUM))
print('r10 dur: pair lvl=%dms grow=%dms habitat=%dms (>=40000 gate); clips=%d' %
      (5 * (2 * 2400 + 4800), 5 * (2 * 2200 + 4800), 5 * (2 * 2600 + 4800), n_clips))
