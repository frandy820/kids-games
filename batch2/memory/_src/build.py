# -*- coding: utf-8 -*-
"""memory 记忆翻牌配对 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r19 老结构重建·难度改造（batch2/SPEC-R19-MEMORY.md）：图案相似化干扰（8 近形族）+
补数配对「和为 10」（封闭域 {1..9}）+ 先看后翻（亮出窗=800+对数×750）。
用法: python batch2/memory/_src/build.py
S4 阶段1：共同骨架（读源/clips 注入/三硬检查/4 块拼接/幂等写出）已入 design/build_lib.py，
本文件只留款级断言表（双跑对拍 md5 等价验证过：ee4c37c37faf7280a0e985a831136979）。"""
import pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))  # 仓库根（禁绝对路径）
from design import build_lib

ROOT = pathlib.Path(__file__).resolve().parent          # _src/


def _asserts(S):
    head, data, engine = S['head'], S['data'], S['engine']
    main, verif, clips = S['main'], S['verify'], S['clips']
    selftest = (ROOT.parent / '_selftest.py').read_text(encoding='utf-8')

    # 语音 clips 注入断言（r19 定版：mem 7 键=3 老沿用+4 新键已主线落地合成 + core 3 = 10）
    assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
    MEM_KEYS = ['mem_tut_watch', 'mem_tut_turn', 'mem_hint', 'mem_peek', 'mem_sum10', 'mem_twin', 'mem_missmore']
    CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
    for k in MEM_KEYS + CORE_KEYS:
        assert '"%s"' % k in clips, 'clips 缺少 %s' % k
    n_clips = clips.count('data:audio/mpeg;base64,')
    assert n_clips == 10, 'clips 条数 %d != 10（mem 7+core 3 定值——r19 审查 m2 收紧，SPEC §6 对齐）' % n_clips
    # 注入键前缀对账：只允许 mem_*/core_*（防 manifest 串档带进他款 clip）
    _inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
    assert _inj_keys and all(k.startswith('mem_') or k in CORE_KEYS for k in _inj_keys), \
        'clips 出现非 mem_/core_ 键: %s' % sorted(set(k for k in _inj_keys
            if not (k.startswith('mem_') or k in CORE_KEYS)))

    # 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
    assert "KIDS.init({ game: 'memory'" in main, 'main 缺 KIDS.init memory（存档键 kidsgame_memory）'
    assert 'window.MEM =' in main, 'main 缺 MEM 钩子'
    assert '__memDemoR' in main, 'main 缺教学演示实证 __memDemoR'
    assert 'KIDS.assets.rabbit' in main, 'main 缺兔子 IP 资产调用（教学独阶段庆祝）'

    # 家族契约 A（双 lim-1 形态）：winFlow dayEnd 与启动 dayEnd 两处实算 + 日末停留 Math.max(0, lim-1)
    assert main.count('nextHint(lim - 1)') == 2, \
        'nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
    assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 null 实参形态（含注释亦禁该字面）'
    assert 'Math.max(0, lim - 1)' in main, '启动日末缺停留今日末关 Math.max(0, lim-1)'
    # 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
    assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
    assert 'if (idle > 14000 && Date.now() - lastDir > 14000)' in main, 'main 缺 14s 方向级独立节流（契约 B）'
    assert 'idle > 30000' in main, 'main 缺 30s 答案级锚（契约 B）'
    # 家族契约 D：吞输入轻叮必配容器 bump
    assert "replayAnim(wrapEl(), 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
    # 家族契约 E：行为分流先查教学特例（fresh 判定读 sv.mem.tutSeen——v1 即子键同形，无转译）
    assert 'sv.mem && sv.mem.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
    # 家族契约 F：生成关预告实算（禁 (ci+1)%4）
    assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
    assert '(ci + 1)' + ' % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（拼接检索防 build 自身命中）'
    # 家族契约 I：错链豁免窗=链句实长+300（两模式档：estMs 实算——SPEC §6）+ 救援让路 + startLevel 重置
    est_ms = lambda n: n * 345 + 600                      # estMs 四方同步之 build 侧（b25 定版）
    assert 'const SAME_CHAIN_WIN = estMs(VOICE.missmore.text) + 300' in main, \
        'main 缺 same 档错链窗 estMs(VOICE.missmore.text)+300（契约 I）'
    assert 'const SUM10_CHAIN_WIN = estMs(VOICE.sum10.text) + 300' in main, \
        'main 缺 sum10 档错链窗 estMs(VOICE.sum10.text)+300（契约 I）'
    assert 'wrongChainUntil = Date.now() + chainWin()' in main, 'main 缺错链豁免窗设置（契约 I）'
    assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
    assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J）'
    assert est_ms(8) + 300 == 3660 and est_ms(11) + 300 == 4695, \
        '错链窗构成不符（missmore 8 字 3360+300=3660 / sum10 11 字 4395+300=4695）'
    # 家族契约 J：语义句 flat≥3 只 10s 节流
    assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
    # 家族契约 K：rescueTick 命名函数 + 面板在场守卫
    assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
    assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
        'main rescueTick 缺面板在场守卫（契约 K）'
    # r19 审查 major-1 防回归：rescueTick 教学期守卫只拦 watch（帮期放行 5s 重演示——老款语义+countchick 家族形态）；
    # 禁再现宽守卫形态（拦掉 help 态=重演示分支成死代码）
    assert "if (state.tut === 'watch') return;" in main, 'main rescueTick 缺教学 watch 静默守卫（r19 major-1 修复形态）'
    assert "state.tut !== 'none' && state.tut !== 'solo'" not in main, \
        'main rescueTick 禁宽守卫（拦 help 态=教学帮重演示死代码，r19 major-1）'
    # Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段必须居链尾。
    # 本款语音全走 voice.play 单句（无 keyless 段）——finditer 空集自然通过，断言保留防后代批加 keyless 段踩坑
    for _src_name in ('main', 'verif'):
        _s = main if _src_name == 'main' else verif
        for _m in re.finditer(r'\{ key: null[^}]*\}', _s):
            _tail = _s[_m.end():_m.end() + 8].lstrip()
            assert _tail.startswith(']'), \
                'game-%s keyless TTS 段必须居链尾（core queue 弃尾语义，Mj-1）：%r' % (_src_name, _tail[:6])

    # ===== estMs 全字符口径四方同步（家族 T：len*345+600——r19 定义在 data，main 不重复声明）=====
    assert 'const estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（四方同步之一）'
    assert 'const estMs' not in main, 'main 不得重复声明 estMs（data+main 同块拼接=SyntaxError）'
    assert 'n * 345 + 600' in selftest, '_selftest 缺 estMs 口径 lambda（四方一致）'
    assert 'estMs = n => n * 345 + 600' in verif, 'verify 缺 estMs 动态断言（函数域独立定义）'

    # ===== r19 难度改造数学先验锚（SPEC-R19-MEMORY §1-§5 源级）=====
    assert 'const CH_LEN = 6' in data and 'const STATIC_LEVELS = 24' in data, 'data 缺 r19 关型常量（CH_LEN 6/STATIC 24）'
    assert 'const MEM_SEED = 1056' in data, 'data 缺本批种子常量 1056（SEED 扫描定值：flat24-39 四 dch 全现+双模式）'
    assert 'mulberry32(flat * 7919 + MEM_SEED)' in engine, 'engine 缺种子同源式 mulberry32(flat*7919+MEM_SEED)'
    assert data.count('{ r:') == 24, 'LEVEL_SPECS 必须 24 关（4 章×6），实得 %d' % data.count('{ r:')
    assert "const DECIDE_MIN = { same: 1500, sum10: 2400 }" in data, 'data 缺 DECIDE_MIN 两档字面（§5 时长模型）'
    assert 'const PEEK_BASE = 800, PEEK_PER_PAIR = 750' in data, 'data 缺 peek 亮出窗常量（§4）'
    assert 'const LEVEL_MIN_MS = 12000' in data, 'data 缺 LEVEL_MIN_MS 本款口径（§5）'
    assert 'Math.round(OPEN_MS + (g.peek ? peekMs(pairs) : 0) + pairs * 2 * DECIDE_MIN[g.mode] + END_MS)' in data, \
        'data 缺 modeled 公式（§5：OPEN+peek+2×对数×DECIDE+END）'
    assert 'const COMP_PAIRS = [[5, 5], [4, 6], [3, 7], [2, 8], [1, 9]]' in data, 'data 缺补数封闭域表（§3）'
    assert "const FAM_KEYS = ['cat', 'bear', 'apple', 'flower', 'star', 'pear', 'frog', 'orange']" in data, \
        'data 缺近形族索引（§1：8 族）'
    assert "key: 'mem_tut_watch'" in data, 'data 缺老键沿用引用'
    for _nk in ('mem_peek', 'mem_sum10', 'mem_twin', 'mem_missmore'):
        assert ("key: '%s'" % _nk) in data, 'data 缺 r19 新语音键引用 %s（§6）' % _nk
    # 引擎纯度：game-core 禁 DOM（无 document/window 引用）
    assert 'document' not in engine and 'window' not in engine, 'game-core 须纯引擎（禁 DOM）'
    # verify 双钉素材（§5 禁约数）
    assert 'SPEC_MODELED_MIN = 12000' in verif and 'm0 === 12000' in verif, \
        'verify 缺 modeled 12000 精确钉死断言（§5 双钉）'
    assert 'def modeled_py' in selftest and 'modeled_py(0) == 12000' in selftest, \
        '_selftest 缺 python 侧 modeled 复算（双钉之二：m0=12000）'
    assert 'SPEC_DUR' in verif and 'mem_hint: 2160' in verif, 'verify 缺 SPEC_DUR 实测表'
    assert "document.querySelectorAll('script')[2]" in verif, 'verify 缺第 3 script 块契约断言读法'
    assert 'SPEC_PEEK = { base: 800, perPair: 750 }' in verif, 'verify 缺 SPEC_PEEK 对账表'
    # 教学链实证
    assert 'window.__memDemoR' in main and 'window.__memDemoR' in verif, '教学演示实证字面 main+verify 须双在场'

    # ===== r19 键基迁移 IIFE（CH_LEN 5→6，r18 范式——矛盾态+脏键守卫，先于 KIDS.init）=====
    assert "localStorage.getItem('kidsgame_memory')" in main and \
           "lv[(c - 1) + '-5']" in main and '> CH_LEN - 1' in main, \
           'main 缺存档迁移 IIFE（矛盾态检测+脏键守卫，§7）'
    assert main.index("getItem('kidsgame_memory')") < main.index("KIDS.init({ game: 'memory'"), \
        '迁移 IIFE 必须先于 KIDS.init 读档执行'

    # ===== 契约 M：verify 帧内容断言素材在场（渲染即引擎 DOM 锚）=====
    for lit in ('__memDemoR', 'perfectSequence', 'LEVEL_SPECS'):
        assert lit in verif or lit in data or lit in engine, 'verify/引擎缺取证素材 %s' % lit

    # ===== r19 竖屏双通道逐行全等（@media(orientation:portrait) 与 body.port 类通道规则逐行相同
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
    assert '<title>记忆翻牌配对</title>' in head, 'head 缺标题 记忆翻牌配对'
    assert re.search(r'button\{[^}]*color:#4A3B2E', head), 'head button 规则缺显式 color（契约 O）'
    assert '#mode-chip' in head, 'head 缺规则章徽 #mode-chip（r19 补数/同图零文字提示）'

    # 尾部统计（与旧脚本输出口径一致；est_ms 防未用告警一并复算）
    assert est_ms(8) == 8 * 345 + 600
    print('r19 check: clips %d（mem 7+core 3=10 定版，4 新键实长 2688/3240/3384/3144 已钉 SPEC_DUR）; '
          'chain-win same %d+300=%d sum10 %d+300=%d（estMs 口径保持，实长更短不收窄）; '
          'modeled min/m0 12000; PORT-CLS %d lines equal; LEVEL_SPECS 24' %
          (n_clips, est_ms(8), est_ms(8) + 300, est_ms(11), est_ms(11) + 300, len(_media_lines)))


build_lib.build(ROOT, game='memory', head_name='head.html',
                verify_block='separate', pre_assemble=_asserts)
