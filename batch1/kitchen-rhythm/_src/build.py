# -*- coding: utf-8 -*-
"""kitchen-rhythm 厨房节奏 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r18 老结构重建·难度改造（SPEC-R18-KITCHEN）：曲库 10（含变速/长曲/双轨）+连击门槛星级+双轨双时间轴。
用法: python batch1/kitchen-rhythm/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch1/kitchen-rhythm/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
selftest = (ROOT / '_selftest.py').read_text(encoding='utf-8')

# 语音 clips 注入（r18：kitchen_* 34 老键+零值沿用 + kr_ 3 + T46 结算拆段 33（kr_combo+kr_dn_0..30）+ core_* 3 = 72）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('kitchen')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：kitchen_ 34（tut/cut/cat + n_0..30 含零值键）+ kr_ 35（hint/missmore/dual + T46 combo/dn_0..30）
# + core 3 = 72 条（SPEC §6 + T46 拆段 + 09-19 零值键 kitchen_n_0/kr_dn_0）
KR_KEYS = ['kr_hint', 'kr_missmore', 'kr_dual', 'kr_combo']
KR_DN = ['kr_dn_%d' % n for n in range(0, 31)]          # T46 结算连击段（maxCombo 域 0..30，0=无连击；曲库上限 28）
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in KR_KEYS + KR_DN + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
for n in (0, 1, 28, 30):                                # 数字词抽检（n_0..30 全量在 verify 动态对账）
    assert '"kitchen_n_%d"' % n in clips, 'clips 缺少 kitchen_n_%d' % n
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 72, 'clips 条数 %d != 72（kitchen 34 + kr 35 + core 3）' % n_clips
# 注入键前缀对账：只允许 kitchen_*/kr_*/core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('kitchen_') or k.startswith('kr_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 kitchen_/kr_/core_ 键: %s' % sorted(set(k for k in _inj_keys
        if not (k.startswith('kitchen_') or k.startswith('kr_') or k in CORE_KEYS)))
assert len([k for k in _inj_keys if k.startswith('kitchen_')]) == 34, 'kitchen_ 键数 != 34（33+零值 kitchen_n_0）'
assert len([k for k in _inj_keys if k.startswith('kr_')]) == 35, 'kr_ 键数 != 35（3 老键 + T46 32 含零值 kr_dn_0）'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'kitchen'" in main, 'main 缺 KIDS.init kitchen（存档键 kidsgame_kitchen）'
assert 'window.RHY =' in main, 'main 缺 RHY 钩子'
assert '__krDemoR' in main, 'main 缺教学演示实证 __krDemoR'
assert "KIDS.assets.rabbit" in main, 'main 缺兔子 IP 资产调用（combo 庆祝）'

# 家族契约 A（双 lim-1 形态）：winFlow dayEnd 与启动 dayEnd 两处实算 + 日末停留 Math.max(0, lim-1)
assert main.count('nextHint(lim - 1)') == 2, \
    'nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 null 实参形态（含注释亦禁该字面）'
assert 'Math.max(0, lim - 1)' in main, '启动日末缺停留今日末关 Math.max(0, lim - 1)'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流（契约 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(wrapEl(), 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.kitchen.tutSeen；v1 k_tut 转译见 MIG）
assert 'sv.kitchen && sv.kitchen.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（拼接检索防 build 自身命中）'
# 家族契约 I：错反馈链豁免窗 3516（kr_missmore 3216+300，SPEC_DUR 实测表）+ 救援让路 + startLevel 重置
assert 'WRONG_CHAIN_WIN = 3216 + 300' in main, 'main 缺错链豁免窗常量 3216+300（契约 I）'
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错链豁免窗设置（契约 I）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
assert 3216 + 300 == 3516, '错链窗构成不符（kr_missmore 3216+300=3516）'
# 家族契约 J：语义句 flat≥3 只 10s 节流
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（r18 增 .k-song-end 曲终结算层）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel,.k-song-end')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K，r18 含 .k-song-end）'
# Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段必须居链尾。
# 本款 sayW/结算链全 clip（无 keyless 段）——finditer 空集自然通过，断言保留防后代批加 keyless 段踩坑
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
        _tail = _s[_m.end():_m.end() + 8].lstrip()
        assert _tail.startswith(']'), \
            'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

# ===== 语音窗静态断言（r18：窗 ≥ clip 实长+300；SPEC_DUR 实测表口径）=====
est_ms = lambda n: n * 345 + 600                      # estMs 四方同步之 build 侧（b25 定版）
KR_HINT, KR_MISSMORE, KR_DUAL = 2856, 3216, 2640      # §-r18 §6 实测（_probe_dur.py，容差 ±60 verify 动态复测）
KITCHEN_TUT = 3960
assert 'WRONG_CHAIN_WIN' in main and KR_MISSMORE + 300 == 3516, '错链窗静态口径不符'
# 教学看窗 lead 4.3 ≥ kitchen_tut 3960+300=4260（main 字面 lead=4.3）
assert 'lead = Math.max(lead, 4.3)' in main and 4300 >= KITCHEN_TUT + 300, \
    '教学看窗 4.3s < kitchen_tut 3960+300=4260'
# 双轨首教 lead 3.3 ≥ kr_dual 2640+300=2940
assert 'lead = Math.max(lead, 3.3)' in main and 3300 >= KR_DUAL + 300, \
    '双轨首教窗 3.3s < kr_dual 2640+300=2940'
# estMs 全字符口径四方同步（家族 T：len*345+600——r18 定义在 data，main 不重复声明）
assert 'const estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（四方同步之一）'
assert 'const estMs' not in main, 'main 不得重复声明 estMs（data+main 同块拼接=SyntaxError）'
assert 'n * 345 + 600' in selftest, '_selftest 缺 estMs 口径 lambda（四方一致）'
assert 'estMs = n => n * 345 + 600' in verif, 'verify 缺 estMs 动态断言（函数域独立定义）'

# ===== r18 难度改造数学先验锚（SPEC-R18-KITCHEN §1/§2/§4/§5 源级）=====
assert "const CH_LEN = 8" in data and "const STATIC_LEVELS = 32" in data, 'data 缺 r18 关型常量（CH_LEN 8/STATIC 32）'
assert 'const KR_SEED = 1002' in data, 'data 缺本批种子常量 1002（SEED 扫描定值）'
assert 'mulberry32(flat * 7919 + KR_SEED)' in engine, 'engine 缺种子同源式 mulberry32(flat*7919+KR_SEED)'
assert 'const SONG_OF_STATIC = [0, 1, 2, 0, 1, 2, 0, 1,' in data, 'data 缺 SONG_OF_STATIC 映射表'
_sos = re.sub(r'//[^\n]*', '', data.split('const SONG_OF_STATIC = [')[1].split(']')[0])
assert len(re.findall(r'\d+', _sos)) == 32, 'SONG_OF_STATIC 必须恰 32 关映射（去注释后数）'
assert "const DECIDE_MIN = { steady: 550, tempo: 620, long: 620, dual: 800 }" in data, \
    'data 缺 DECIDE_MIN 四档字面（§5 时长模型）'
assert 'const PERFECT_K = 0.22, PERFECT_LO = 0.09, PERFECT_HI = 0.15' in data, \
    'data 缺判定窗常量（§3 BPM 归一化档）'
assert 'const GATE2_R = [1 / 3, 1 / 2, 2 / 3, 3 / 4]' in data and \
       'const GATE3_R = [1 / 2, 2 / 3, 3 / 4, 4 / 5]' in data, 'data 缺连击门槛比例表（§4）'
assert 'const LEVEL_MIN_MS = 17000' in data, 'data 缺 LEVEL_MIN_MS 本款口径（§5）'
assert 'kr_missmore' in data and 'kr_dual' in data and 'kr_hint' in data, 'data 缺 r18 新语音键引用（§6）'
assert "key: 'kitchen_tut'" in data, 'data 缺老键沿用引用'
# 曲库 10 首结构锚（运行时 verify 全量逐值对账 SPEC_T 表）
assert data.count("style: 'steady'") == 3 and data.count("style: 'tempo'") == 3 and \
       data.count("style: 'long'") == 2 and data.count("style: 'dual'") == 2, \
    '曲型分布应 3 恒速+3 变速+2 长曲+2 双轨'
assert data.count('from:') == 5, '变速段（含 from 的段）应恰 5 首 5 处'
# 双轨 UI（head）：#btn-cut-l1 双钮 + .dual 形态 + 双时间轴说明
assert '#btn-cut-l1' in head and '#btn-cut-l1.dual' in head and '#btn-cut.dual' in head, \
    'head 缺双轨双钮样式（§6 UI）'
assert 'lane: [0, 1' in data, 'data 缺双轨曲 lane 表'
# 引擎纯度：game-core 禁 DOM（无 document/window 引用）
assert 'document' not in engine and 'window' not in engine, 'game-core 须纯引擎（禁 DOM）'
# verify 双钉素材（§5 禁约数）
assert 'SPEC_MODELED_MIN = 17170' in verif and 'm0 === 24177' in verif, \
    'verify 缺 modeled 17170/24177 精确钉死断言（§5 双钉）'
assert 'def modeled_py' in selftest and 'modeled_py(0) == 24177' in selftest, \
    '_selftest 缺 python 侧 modeled 复算（双钉之二：m0=24177）'
assert 'SPEC_DUR' in verif and 'kr_missmore: 3216' in verif, 'verify 缺 SPEC_DUR 实测表'
# 教学链实证 + SPEED 提速
assert 'window.__krDemoR' in main and 'SPEED = VERIFY ? 0.12 : 1' in main, 'main 缺演示实证/提速字面'
# 时钟纪律：主时钟 audioContext（verify 模拟时钟旁路；禁 setInterval 驱动音符时刻）
assert 'return c ? c.currentTime : performance.now() / 1000' in main, 'main 缺音频主时钟分支'
assert 'if (ST.verifySim) return (performance.now() - ST.simT0) / 1000 * ST.simRate' in main, \
    'main 缺 verify 模拟时钟旁路'

# ===== r18 键基迁移 IIFE（CH_LEN 5→8，r16 范式——矛盾态+脏键守卫，先于 KIDS.init）=====
assert "localStorage.getItem('kidsgame_kitchen')" in main and \
       "lv[(c - 1) + '-5']" in main and '> CH_LEN - 1' in main, \
       'main 缺存档迁移 IIFE（矛盾态检测+脏键守卫，§7）'
assert main.index("getItem('kidsgame_kitchen')") < main.index("KIDS.init({ game: 'kitchen'"), \
    '迁移 IIFE 必须先于 KIDS.init 读档执行'

# ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
for lit in ('__noteLog', 'melody[', '146.83'):
    assert lit in verif, 'verify 缺取证素材 %s（契约 M/notebird 双通道）' % lit

# ===== r18 竖屏双通道逐行全等（@media(orientation:portrait) 与 body.port 类通道规则逐行相同
# ——/*PORT-CLS*/ 标记段；verify 竖屏模拟/自测 P1b 依赖 body.port 通道）=====
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
assert '<title>厨房节奏</title>' in head, 'head 缺标题 厨房节奏'
assert re.search(r'button\{[^}]*color:#4A3B2E', head), 'head button 规则缺显式 color（契约 O）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +          # verify 独立第 4 块（禁并入 game 块自匹配）
        '</body>\n</html>\n')
assert html.count('<script>') == 4, 'script 块数 %d != 4（verify 须独立第 4 块）' % html.count('<script>')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('r18 check: clips %d（kitchen 33+kr 34+core 3）; wrong-chain %d+300=%d; '
      'tut-win 4300>=%d; dual-win 3300>=%d; modeled min 17170 / m0 24177; PORT-CLS %d lines equal' %
      (n_clips, KR_MISSMORE, KR_MISSMORE + 300, KITCHEN_TUT + 300, KR_DUAL + 300, len(_media_lines)))
