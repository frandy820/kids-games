# -*- coding: utf-8 -*-
"""tictac 井字棋小冠军 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch36/tictac/_src/build.py"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch36/tictac/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
CLIPS_DIR = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（tk_ 13 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('tictac')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'

# b33 坑③：core_* 注入必须幂等跳过——主线 manifest 已含本款 core_*（games 含 tictac），
# 手工再注入=双注入。仅当 manifest 缺该键时才从 clips/ 目录补注（防主线 manifest 变更断链）。
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
_extra = []
for k in CORE_KEYS:
    if '"%s"' % k in clips:
        continue                                        # 幂等跳过（正常路径：manifest 已含）
    _b = base64.b64encode((CLIPS_DIR / (k + '.mp3')).read_bytes()).decode('ascii')
    _extra.append('%s:"data:audio/mpeg;base64,%s"' % (json.dumps(k), _b))
    print('core manual-inject:', k)
if _extra:
    assert clips.count('};/*CLIPS-END*/') == 1, 'CLIPS-END 标记异常'
    clips = clips.replace('};/*CLIPS-END*/', ', ' + ','.join(_extra) + '};/*CLIPS-END*/')
# clips 注入断言：tk_ 13 条 + core 3 条 = 16 条（SPEC-BATCH36 §-r18 §7；gate G3 注入数 16）
TK_KEYS = ['tk_tut_watch', 'tk_tut_turn', 'tk_hint', 'tk_right', 'tk_draw', 'tk_lose',
           'tk_puz_win', 'tk_puz_block', 'tk_puz_fork', 'tk_wrong', 'tk_review',
           'tk_v44', 'tk_vroll']
for k in TK_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 16, 'clips 条数 %d != 16（tk 13 + core 3）' % n_clips
# 注入键前缀对账：只允许 tk_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('tk_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 tk_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('tk_') or k in CORE_KEYS)))

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'tictac'" in main, 'main 缺 KIDS.init tictac（存档键 kidsgame_tictac）'
assert 'window.TK =' in main, 'main 缺 TK 钩子（b29 坑⑥：真实页同暴露）'
assert '__tkDemoR' in main, 'main 缺教学演示实证 __tkDemoR'
assert "'done'" in main and '__tkDemoR = ' in main, 'main 缺 __tkDemoR=done 赋值（gate 口径）'
assert 'get tutorial()' in main, 'main 缺 TK.tutorial getter（gate G2 依赖）'
assert 'get final' in main, 'main 缺 TK.final getter（b19 坑③终局快照）'
assert 'get review' in main, 'main 缺 TK.review getter（§-r18 §8 复盘快照）'
# 本款常量锚（SPEC §0.90/§-r18：seeded mulberry32(flat*7919+911)——本款常量 tictac=911）
assert 'flat * 7919 + 911' in engine, 'engine 缺本款常量 seed 911（SPEC §0.90）'
# 局内 RNG 分流公式（§3：mulberry32(flat*7919+911+round*77)——与 dch RNG 分流）
assert '911 + round * 77' in engine, 'engine 缺局种子分流公式 911+round*77（SPEC §3）'
# 残局题库第三分流（§-r18 §2：+7777+qi*131）
assert '911 + 7777 + qi * 131' in engine, 'engine 缺残局题库种子分流 +7777+qi*131（§-r18 §2）'

# 家族契约 A（r17 双 lim-1）：启动+winFlow 两处均传 lim-1（日末停留可重玩），无 null 形态
assert main.count('nextHint(lim - 1)') == 2, \
    'dayEnd nextHint(lim-1) 必须恰 2 处（r17 双 lim-1），实得 %d' % main.count('nextHint(lim - 1)')
assert 'Math.max(0, lim - 1)' in main, 'main 缺 r17 日末停留 Math.max(0, lim-1)'
assert 'nextHint(null)' not in main, 'main 不得残留 nextHint(null)（r17 已废形态）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：拒绝轻叮必配格子 wig（已占格/吞输入期——本款无容器级 bump，格级摇头同族）
assert "sfx('pop')" in main and "'wig'" in main, 'main 缺拒绝轻叮+wig（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.tictac.tutSeen）
assert 'sv.tictac && sv.tictac.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I（r18 残局全量——§-r18 §5）：错链豁免窗四字面+guard 挂判定前+救援让路+关切换重置
assert 'WRONG_CHAIN_WIN = 2448 + 300' in main, 'main 缺 WRONG_CHAIN_WIN=2448+300 字面（契约 I r18）'
assert 'if (wrongChainUntil && Date.now() < wrongChainUntil)' in main, \
    'main 缺豁免窗 guard（挂判定前：窗内错点吞/对选放行——契约 I r18）'
assert 'wrongChainUntil = now + WRONG_CHAIN_WIN' in main, 'main 缺窗设锚（契约 I r18）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, \
    'main 缺救援 interval 让路（契约 I r18——错链窗内救援静默）'
assert 'wrongChainUntil = 0; lastWrongVoice = 0;' in main, 'main 缺 startLevel 重置（契约 I/J r18）'
assert 'tk_wrong' in data, 'data 缺 tk_wrong 语音注册（§-r18 §5 残局错反馈）'
# 家族契约 J：错反馈语义句 10s 节流（节流内 miss 照计、链不重播不设窗）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺 10s 节流（契约 J r18）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4 逐字一致）+ 复盘层守卫（§-r18）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
assert "document.querySelector('.k-review')" in main, 'main rescueTick 缺复盘层守卫（§-r18 复盘窗不抢救援）'
# 键基迁移 IIFE（§-r18 §6：CH_LEN 5→6）：三字面+先于 KIDS.init 执行
assert "localStorage.getItem('kidsgame_tictac')" in main, 'main 迁移 IIFE 缺读档字面（§-r18 §6）'
assert "lv[(c - 1) + '-5']" in main, 'main 迁移 IIFE 缺矛盾态检测字面（§-r18 §6）'
assert '> CH_LEN - 1' in main, 'main 迁移 IIFE 缺关号域上限字面（§-r18 §6）'
assert main.index("localStorage.getItem('kidsgame_tictac')") < main.index("KIDS.init({ game: 'tictac'"), \
    '迁移 IIFE 必须先于 KIDS.init 执行（§-r18 §6）'
# ch4 minimax 在场（§0.90：完美档全展开——verify ⑰全谱+U6 复算的靶）
assert 'function engPerfectPick' in engine and 'minimax' in engine, 'engine 缺 minimax 完美档（§0.90）'
# r18 新引擎族在场（§-r18 §2/§3/§4）
assert 'function engV44' in engine and 'LINES16' in engine, 'engine 缺 v44 判定器（§-r18 §3）'
assert 'function engRollPick' in engine and 'ROLL_MOVE_CAP = 36' in engine, 'engine 缺 vroll 判定器（§-r18 §3）'
assert 'function genPuzzles' in engine and 'PUZ_FALLBACK' in engine, 'engine 缺残局题库（§-r18 §2）'
assert 'function engReview' in engine, 'engine 缺负局复盘回溯（§-r18 delta3）'
assert 'function modeled(flat)' in engine, 'engine 缺时长模型（§-r18 §4）'
assert 'const DECIDE_MS = { battle: 7000, puzzle: 12000, v44: 8000, vroll: 8000 }' in data, \
    'data 缺 DECIDE_MS 字面（§-r18 §4 认知决策时长）'
# Mj-1 防回归（b29：core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即 return
# 丢弃后续段——本款全 clip 无 keyless 段（契约 N 天然满足）：断言不出现 keyless 段即可
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（SPEC-BATCH36 §4+§-r18 §7 实长表；三链独立单发不拼播）=====
TK_WATCH, TK_TURN, TK_HINT = 2952, 1752, 2400
TK_RIGHT, TK_DRAW, TK_LOSE = 2304, 2544, 2712
TK_WRONG, TK_REVIEW = 2448, 2712                       # r18 新增（§-r18 §7）
WIN_MS, DRAW_MS, LOSE_MS = 2604, 2844, 3012            # §4：实长+300（胜/平/负局演出窗）
WRONG_CHAIN_WIN = 2448 + 300                           # §-r18 §5：残局错链豁免窗
REVIEW_MS = 2712 + 300 + 1500                          # §-r18 §7：复盘窗（语音+300+看板余量）
RABBIT_MS = 800                                        # §0.90：兔子应手演出 800ms
WATCH_DELAY, TURN_DELAY = 3300, 2100                   # watch 延 ≥2952+300；turn 后读题延 ≥1752+300
# ① 终局窗=实长+300（三链独立单发——SPEC §4 算式恒等）
assert WIN_MS == TK_RIGHT + 300 and DRAW_MS == TK_DRAW + 300 and LOSE_MS == TK_LOSE + 300, \
    '终局窗算式不符 SPEC §4（2604/2844/3012）'
assert WRONG_CHAIN_WIN == TK_WRONG + 300, '残局错链窗算式不符 §-r18 §5（2748）'
assert REVIEW_MS >= TK_REVIEW + 300, '复盘窗算式不符 §-r18 §7（≥3012）'
for lit in ('WIN_MS = %d' % WIN_MS, 'DRAW_MS = %d' % DRAW_MS, 'LOSE_MS = %d' % LOSE_MS):
    assert lit in main, 'main 缺终局演出窗常量定义 %s（家族 G/H）' % lit
assert 'WRONG_CHAIN_WIN = %d + 300' % TK_WRONG in main, 'main 缺残局错链窗常量（契约 I r18）'
assert 'REVIEW_MS = %d + 300 + 1500' % TK_REVIEW in main, 'main 缺复盘窗常量（§-r18 §7）'
assert 'await wait(ms * SPEED)' in main, 'main 终局演出窗缺 * SPEED 提速用法（verify 页时序）'
assert 'REVIEW_MS * SPEED' in main, 'main 复盘窗缺 SPEED 提速用法'
# ② 兔子应手演出 800ms（§0.90）
assert ('%d * SPEED' % RABBIT_MS) in main, 'main 缺兔子应手演出窗 800（§0.90）'
# ③ 教学 watch 延 ≥2952+300=3252；turn 后读题延 ≥1752+300=2052（防尾截）
assert ('%d * SPEED' % WATCH_DELAY) in main, 'main 缺教学 watch 演示延窗 %d（tk_tut_watch 2952+300）' % WATCH_DELAY
assert WATCH_DELAY >= TK_WATCH + 300, 'watch 延 %d < 2952+300=3252' % WATCH_DELAY
assert ('}, %d);' % TURN_DELAY) in main, 'main 教学 turn 后读题延 %d 缺失（tk_tut_turn 1752+300 防尾截）' % TURN_DELAY
assert TURN_DELAY >= TK_TURN + 300, 'turn 后读题延 %d < 1752+300=2052' % TURN_DELAY
# ④ celebrate 2620+400 ≥ right 2304+300（winFlow 家族 H）
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（tk_right ≥2604）'
assert 2620 + 400 >= TK_RIGHT + 300, 'celebrate 2620+400=3020 < tk_right 2304+300=2604'
# ⑤ estMs 四方同步之一：data 定义（全字符口径），main 禁重复声明（家族 T）
assert 'const estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（家族 T）'
assert 'const estMs' not in main, 'main 不得重复声明 estMs（家族 T 四方同步：data+main 同块拼接）'
# ⑥ verify 页动态断言素材在场（独立 minimax/窗值/时长模型钉值）
for _tok in ('estMs', 'vMm', 'vPerfect', 'vV44', 'vRollPick', 'vPuzAnswer', 'vReview', 'vModeled'):
    assert _tok in verif, 'verify 缺独立复算件 %s' % _tok
for _lit in ('2604', '2844', '3012', '2748', '4512', '99660', '88020', '166860', '40000'):
    assert _lit in verif, 'verify 缺断言素材 %s（SPEC §4/§-r18 §4/§7）' % _lit

# ===== 教学链 watch 预算分账（≤16s，名义值累加；SPEC §0.90/§4：一局 4-6 手快速演出）=====
# tutorialWatch 名义分账：watch 延 3300（≥2952+300）+ 3 手 X（ghost 600+press 320+垫 200）
# + 2 次兔子应手演出 800（uiTapCell 内联）+ 胜局窗 2604 = 10864 ≤ 16000
TUT_SUM = WATCH_DELAY + 3 * (600 + 320 + 200) + 2 * RABBIT_MS + WIN_MS
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['600 * SPEED', '320 * SPEED', '200 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# ===== 契约 L：本款无数字 TTS（棋盘格不 TTS）——天然满足（占位说明，无映射表需求）=====

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锁）=====
for lit in ("classList.contains('x')", "classList.contains('o')", "classList.contains('empty')",
            '.cell.wincell', 'dataset.i', 'board.slice()'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
assert 'data-i="' in main, 'main 棋盘格渲染缺 data-i 锚（契约 M）'

# 硬性检查 2c：head 标题与存档名对齐 + 双头像 data-side 锚 + r18 布局锚
assert '<title>井字棋小冠军</title>' in head, 'head 缺标题 井字棋小冠军'
assert head.count('data-side="k"') >= 1 and head.count('data-side="r"') >= 1, 'head 缺双头像 data-side 锚'
for lit in ('#board-wrap.w16', 'repeat(4,1fr)', '.cell.oldest', '.k-review',
            '.rv-cell.rev-miss', '.rv-cell.rev-best'):
    assert lit in head, 'head 缺 r18 布局锚 %s（v44/vroll/复盘层）' % lit
# PORT-CLS 双通道（家族：竖屏 @media 与 body.port 类通道逐行镜像——selftest 竖屏等价靶）
_pm = re.search(r'@media \(orientation:portrait\)\{\n(.*?)\n\}\n/\*PORT-CLS\*/\n(.*?)\n</style>', head, re.S)
assert _pm, 'head 缺 PORT-CLS 双通道结构（@media+/*PORT-CLS*/ 相邻镜像）'
_media_lines = _pm.group(1).split('\n')
_port_lines = _pm.group(2).split('\n')
assert len(_media_lines) == len(_port_lines) and len(_media_lines) >= 3, 'PORT-CLS 镜像行数异常'
for _a, _b in zip(_media_lines, _port_lines):
    assert _b.strip() == 'body.port ' + _a.strip(), 'PORT-CLS 镜像行不等：%r vs %r' % (_a.strip(), _b.strip())

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 2d：四 script 块结构（core / clips / 游戏 data+engine+main / verify——M1 分离）
assert html.count('<script>') == 4, 'script 块数 %d != 4（verify 分离第 4 块——M1 修复）' % html.count('<script>')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('estMs check: win %d=right %d+300; draw %d=%d+300; lose %d=%d+300; '
      'wrong-chain %d=%d+300; review %d>=%d+300; rabbit %dms; watch-delay %d>=%d; '
      'turn-delay %d>=%d; tut-budget %dms <= 16000' %
      (WIN_MS, TK_RIGHT, DRAW_MS, TK_DRAW, LOSE_MS, TK_LOSE,
       WRONG_CHAIN_WIN, TK_WRONG, REVIEW_MS, TK_REVIEW, RABBIT_MS,
       WATCH_DELAY, TK_WATCH + 300, TURN_DELAY, TK_TURN + 300, TUT_SUM))
