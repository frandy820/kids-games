# -*- coding: utf-8 -*-
"""countchick 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS + verify(独立第4块) → ../index.html
r19 难度改造（2026-09-18，AUDIT-56 黄款 #7）：量域 11-20（十加几锚）+两群比较+限时快数+DECIDE_MS 时长模型。
用法: python batch5/countchick/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch5/countchick/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
selftest = (ROOT / '_selftest.py').read_text(encoding='utf-8')
# 语音 clips 注入（r19 新 6 键已由主线 gen_clips ALL 合成，manifest 2244；定值 13=core3+旧4+新6）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('countchick')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# 注入键前缀对账：只允许 chk_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('chk_') or k.startswith('core_') for k in _inj_keys), \
    'clips 出现非 chk_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('chk_') or k.startswith('core_'))))
for k in ('chk_tut_watch', 'chk_tut_turn', 'chk_hint', 'chk_rec'):   # 旧 4 键必须在场
    assert '"%s"' % k in clips, 'clips 缺少旧键 %s' % k
# r19 新 6 键（chk_ten/chk_cmp_more/chk_cmp_less/chk_cmp_hint/chk_flash_q/chk_flash_hint）：
# 主线 gen_clips ALL 已合成（manifest 2244）——定值 13 = core 3 + chk 旧 4 + r19 新 6（禁容差回退）
assert len(_inj_keys) == 13, 'clips 条数 %d != 13（core 3+旧 4+新 6 定值，r19 二轮收口）' % len(_inj_keys)
for _k in ('chk_ten', 'chk_cmp_more', 'chk_cmp_less', 'chk_cmp_hint', 'chk_flash_q', 'chk_flash_hint'):
    assert '"%s"' % _k in clips, 'clips 缺 r19 新键 %s（已合成定值态，缺=manifest 串档）' % _k

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'countchick'" in main, 'main 缺 KIDS.init countchick（存档键 kidsgame_countchick）'
assert 'window.CHK =' in main, 'main 缺 CHK 钩子'
# 家族契约 A（r17 定版双 lim-1 形态）：winFlow dayEnd 与启动 dayEnd 两处实算 +
# 日末停留 Math.max(0, lim-1)；旧 null 实参形态禁再现（含注释）
assert main.count('nextHint(lim - 1)') == 2, 'nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 null 实参形态（r17 双 lim-1 定版；注释亦禁该字面）'
assert 'Math.max(0, lim - 1)' in main, '启动日末缺停留今日末关 Math.max(0, lim - 1)'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(answersEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
assert "replayAnim(fieldEl, 'bump')" in main, 'main 缺 flash 点数吞 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.chk.tutSeen）
assert 'sv.chk && sv.chk.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈链豁免窗（链实长+300，estMs 上界口径）+ 救援 interval 让路守卫 + startLevel 重置
assert 'WRONG_WIN[q.type]' in main, 'main 缺错链窗按题型取用（契约 I）'
assert 'wrongChainUntil = Date.now() + WRONG_WIN[q.type]' in main, 'main 缺错链豁免窗设置（契约 I）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil' in main, 'main 缺窗内错点吞判定式（契约 I：对选放行）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'SAYW_THROTTLE = 10000' in data, 'data 缺 SAYW_THROTTLE 常量（契约 J 锚）'
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

# ===== 语音窗静态断言（家族 T + r19：窗 ≥ estMs(语义句) 上界——clip 合成后实长恒 ≤ estMs）=====
est_ms = lambda n: n * 345 + 600
for frag, n in (('点一点，数一数', 7), ('满10只啦，接着数', 9), ('小鸡比小鸭多几只', 8),
                ('小鸭比小鸡少几只', 8), ('先数小鸡，再数小鸭', 9),
                ('看一眼，有几只小鸡', 9), ('别急着数，看一眼猜一猜', 11)):
    assert "'%s'" % frag in data, 'game-data 缺语义句 %s（链窗/题面窗下界依据）' % frag
    assert len(frag) == n, '语义句 %s 应 %d 字符' % (frag, n)
# WRONG_WIN 构成断言（b29 坑②：错反馈链窗按实际链构成独立硬编码——三题型分离）
assert 'count:   estMs(VOICE.hint.text) + 150 + 300' in data, 'data 缺 count 错链窗构成（estMs 上界）'
assert 'compare: estMs(VOICE.cmpHint.text) + 150 + 300' in data, 'data 缺 compare 错链窗构成'
assert 'flash:   estMs(VOICE.flashHint.text) + 150 + 300' in data, 'data 缺 flash 错链窗构成'
assert est_ms(7) + 450 == 3465 and est_ms(9) + 450 == 4155 and est_ms(11) + 450 == 4845, \
    '三题型错链窗推导失败（count 3465 / compare 4155 / flash 4845）'
# estMs 全字符口径四方同步之一（家族 T：len*345+600——定义驻 data，main 不重复声明）
assert 'const estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（四方同步之一）'
assert 'const estMs' not in main and 'const estMs' not in engine, 'main/engine 不得重复声明 estMs（同块拼接=SyntaxError）'
assert 'n * 345 + 600' in selftest, '_selftest 缺 estMs 口径 lambda（四方一致）'
# verify 页 estMs 动态断言在场（运行时对账，build 只验结构存在；verify 侧函数域独立定义）
assert 'estMsV = n => n * 345 + 600' in verif, 'verify 缺 estMs 动态断言'
assert "estMs('点一点，数一数') === 3015" in verif, 'verify 缺 estMs(7)=3015 运行时钉死'
# 语音新键 6 条在 VOICE 表（clip 合成走主线 gen_clips ALL，禁手改 manifest）
for k in ('chk_ten', 'chk_cmp_more', 'chk_cmp_less', 'chk_cmp_hint', 'chk_flash_q', 'chk_flash_hint'):
    assert "'%s'" % k in data, 'data VOICE 缺 r19 新键 %s' % k
# 数字不入口播（无 NUMCN 封闭表需求——角标/十加几 chip 全视觉承载，b27 坑③规避声明）
for _s in (data, engine, main, verif):
    assert 'NUMCN' not in _s, '本款数字不口播（SPEC §-r19 §5），禁引入 NUMCN 表'

# ===== r19 时长模型双钉（modeled verify+selftest 精确一致禁约数）=====
assert 'SPEC_MODELED_MIN = 81765' in verif and 'SPEC_MODELED_GLOBAL_MIN = 56840' in verif, \
    'verify 缺 modeled 81765/56840 精确钉死断言（§-r19 §4）'
_m_v = re.search(r'SPEC_MODELED_MIN = (\d+)', verif)
_m_s = re.search(r'^MODELED_MIN = (\d+)', selftest, re.M)
assert _m_v and _m_s, 'verify/_selftest 缺 MODELED_MIN 常量（双钉对账素材）'
assert _m_v.group(1) == _m_s.group(1) == '81765', \
    'modeled 双钉不一致：verify=%s selftest=%s（须同=81765）' % (_m_v.group(1), _m_s.group(1))
_m_g = re.search(r'^MODELED_GLOBAL_MIN = (\d+)', selftest, re.M)
assert _m_g and _m_g.group(1) == '56840', '_selftest 缺 MODELED_GLOBAL_MIN=56840'
# DECIDE_MS 联动常量字面（SPEC §-r19 §4 表）
for lit in ('const TAP_MS = 950', 'const COUNT_BASE = 2600', 'const CMP_BASE = 4200',
            'const FLASH_BASE = 3000', 'const FLASH_A = 1200', 'const FLASH_B = 100',
            'const RIGHT_MS = 880', 'const GAP_MS = 600',
            'const DECIDE_MS = { count: COUNT_BASE, compare: CMP_BASE, flash: FLASH_BASE }'):
    assert lit in data, 'data 缺时长模型常量 %s（§-r19 §4）' % lit
assert 'function modeledMs(' in engine, 'engine 缺 modeledMs 纯函数（§-r19 §4 联动）'
assert 'INTRO_MS = estMs(\'点一点，数一数\') + 400' in data, 'data 缺 INTRO_MS 构成'
assert 'QWIN_CMP = estMs(\'小鸡比小鸭多几只\') + 300' in data, 'data 缺 QWIN_CMP 构成'
assert 'QWIN_FLASH = estMs(\'看一眼，有几只小鸡\') + 300' in data, 'data 缺 QWIN_FLASH 构成'
assert 'RESCUE_DIR_MS = 14000' in data and 'RESCUE_ANS_MS = 30000' in data, 'data 缺救援双锚常量（家族 B）'

# ===== r19 章域/量域静态锚（SPEC §-r19 §1 数学先验的源级锚）=====
assert "const CH_LEN = 5" in data and "const STATIC_LEVELS = 20" in data, 'data 缺关常量（CH_LEN 5/STATIC 20）'
assert "1: { kind: 'count',   name: '数到十几', nMin: 11, nMax: 14" in data, 'data 缺 dch1 量域 11-14'
assert "2: { kind: 'count',   name: '数到二十', nMin: 15, nMax: 20" in data, 'data 缺 dch2 量域 15-20'
assert "3: { kind: 'compare', name: '两群比较', nMin: 7,  nMax: 12, dMin: 1, dMax: 5" in data, 'data 缺 dch3 差值域 1-5'
assert "4: { kind: 'flash',   name: '看一眼快数', nMin: 8, nMax: 16" in data, 'data 缺 dch4 快数域 8-16'
assert 'flashMs: FLASH_A + n * FLASH_B' in engine, 'engine 缺呈现窗公式（1200+n*100）'
assert 'flashDistractorsOf' in engine and 'return [n - 3, n + 3]' in engine, 'engine 缺快数干扰间距 3'

# ===== r19 存档脏键守卫 IIFE（键基未变；先于 KIDS.init 读档执行——r18 坑③防线）=====
assert "localStorage.getItem('kidsgame_countchick')" in main and \
    '> CH_LEN - 1' in main, 'main 缺存档脏键守卫 IIFE（§-r19 §3）'
assert main.index('kidsgame_countchick\')') < main.index("KIDS.init({ game: 'countchick'"), \
    '守卫 IIFE 必须先于 KIDS.init 读档执行'

# ===== r19 新 UI 接线（head 样式 + main 接线）=====
assert '#btn-resee' in head and '#ten-chip' in head and '.tally' in head, 'head 缺 r19 新面样式（ten-chip/tally/resee）'
assert 'reseeBtn.innerHTML = ICONS.resee' in main and 'reseeBtn.addEventListener' in main, 'main 缺再看一眼接线'
assert 'renderTen' in main and 'renderTally' in main, 'main 缺十加几锚/tally 渲染'
assert 'uiResee' in main and 'resee() { return uiResee(); }' in main, 'main/CHK 缺 resee 钩子'
assert "duckmini: '<svg" in data, 'data 缺 duckmini 图标（tally 呈现）'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('data-i=', 'tally-c', 'ten-chip', 'btn-resee'):
    assert lit in verif, 'verify 缺帧内容断言素材 %s（契约 M）' % lit
# 契约 E-M2：verify 独立第 4 块 + 源码扫描读 [2]（禁全文自匹配）
assert "document.querySelectorAll('script')[2]" in verif, 'verify 缺纯游戏块定位断言（E-M2）'
assert "['nextHint', '(lim - 1)'].join('')" in verif, 'verify 高风险检索串须拼接（b36 M1/E-M2）'

# ===== r19 竖屏双通道逐行全等（§-r19 §6：@media(orientation:portrait) 与 body.port 类通道
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

# 硬性检查 2c：head 标题/按钮显式色（契约 O：自建 button 带显式 color，禁依赖 core 兜底）
assert '<title>数数小鸡</title>' in head, 'head 缺标题 数数小鸡'
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
print('r19 check: wrong-win count/compare/flash = %d/%d/%d; modeled min 81765 / global 56840; '
      'PORT-CLS %d lines equal; clips %d keys (13 fixed: core3+old4+new6)' %
      (3465, 4155, 4845, len(_media_lines), len(_inj_keys)))
