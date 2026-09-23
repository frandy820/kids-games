# -*- coding: utf-8 -*-
"""sortsize 大小排序 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r19 难度改造（2026-09-18，AUDIT-56 #15 黄款）：6-7 物相近档+双属性排序+序数题+时长模型双钉
（SPEC-BATCH11 §-r19）。verify 独立第 4 script 块（旧 b11 是 3 块——重建为 4 块，E-M2 家族定版）。
用法: python batch11/sortsize/_src/build.py"""
import json as _json
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch11/sortsize/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
MANI = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips/manifest.json')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
selftest = (ROOT / '_selftest.py').read_text(encoding='utf-8')
# 语音 clips 注入（r19：sor_ 17 条（旧 5+新 12）+ core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('sortsize')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：sor_ 18（通用 3+方向 2+dual 4+ord 8+T46 阶段2 wrong 1）+ core 3 = 21 条（§-r19 §5+T46）
SOR_KEYS = ['sor_tut_watch', 'sor_tut_turn', 'sor_hint', 'sor_q_big', 'sor_q_small',
            'sor_q_dbr', 'sor_q_dbb', 'sor_q_dsr', 'sor_q_dsb',
            'sor_q_ob2', 'sor_q_ob3', 'sor_q_ob4', 'sor_q_ob5',
            'sor_q_os2', 'sor_q_os3', 'sor_q_os4', 'sor_q_os5',
            'sor_wrong']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in SOR_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 21, 'clips 条数 %d != 21（sor 18 + core 3）' % n_clips
# 注入键前缀对账：只允许 sor_* 与 core_*（防 manifest 串档带进他款 clip）
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
assert _inj_keys and all(k.startswith('sor_') or k in CORE_KEYS for k in _inj_keys), \
    'clips 出现非 sor_/core_ 键: %s' % sorted(set(k for k in _inj_keys if not (k.startswith('sor_') or k in CORE_KEYS)))

# ===== r19 新句三方对账（game-data 字面 ↔ manifest 文本；ord 句=data 模板件锚定）=====
_ORD_CN = {2: '二', 3: '三', 4: '四', 5: '五'}
SOR_SENT = {
    'sor_q_big': '从最大的开始，排一排',
    'sor_q_small': '从最小的开始，排一排',
    'sor_q_dbr': '从最大的开始排，一样大的，红皮球排在前面',
    'sor_q_dbb': '从最大的开始排，一样大的，蓝皮球排在前面',
    'sor_q_dsr': '从最小的开始排，一样大的，红皮球排在前面',
    'sor_q_dsb': '从最小的开始排，一样大的，蓝皮球排在前面',
}
for _n in (2, 3, 4, 5):
    SOR_SENT['sor_q_ob%d' % _n] = '从最大的开始数，第%s个，是哪一个呀' % _ORD_CN[_n]
    SOR_SENT['sor_q_os%d' % _n] = '从最小的开始数，第%s个，是哪一个呀' % _ORD_CN[_n]
SOR_SENT['sor_wrong'] = '再想一想，先点哪个呀'   # T46 阶段2：wrong 纠错键（game-data VOICE.wrong 字面同步对账）
_mani = _json.load(open(MANI, encoding='utf-8'))
for _k, _t in SOR_SENT.items():
    assert _k in _mani and _mani[_k]['text'] == _t, 'manifest %s 文本不一致: %r' % (_k, _mani.get(_k, {}).get('text'))
    assert _mani[_k].get('games') == ['sortsize'], 'manifest %s games 异常' % _k
    if _k not in ('sor_q_ob2', 'sor_q_ob3', 'sor_q_ob4', 'sor_q_ob5',
                  'sor_q_os2', 'sor_q_os3', 'sor_q_os4', 'sor_q_os5'):
        assert "'%s'" % _t in data, 'game-data 缺题面句字面 %s' % _k   # ord 句=模板拼装（下方件锚定）
# ord 句模板件锚定（拼装源在 data；语义句与 manifest 全文对账已上行完成）
assert "const ordText = (order, rank) =>" in data, 'data 缺 ordText 拼装函数'
assert "ORD_CN = { 2: '二', 3: '三', 4: '四', 5: '五' }" in data, 'data 缺 ORD_CN 序数域表'
assert "'的开始数，第' + ORD_CN[rank] + '个，是哪一个呀'" in data, 'data 缺 ord 句模板件'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'sortsize'" in main, 'main 缺 KIDS.init sortsize（存档键 kidsgame_sortsize）'
assert 'window.SO =' in main, 'main 缺 SO 钩子'
# 家族契约 A（双 lim-1 实算形态）：winFlow dayEnd 与启动 dayEnd 两处 + 日末停留 Math.max(0, lim-1)；
# 旧 null 实参形态禁再现（含注释）
assert main.count('nextHint(lim - 1)') == 2, 'nextHint(lim-1) 必须恰 2 处（winFlow+启动），实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' not in main, 'winFlow dayEnd 禁 null 实参形态（家族 A 定版；注释亦禁该字面）'
assert 'Math.max(0, lim - 1)' in main, '启动日末缺停留今日末关 Math.max(0, lim - 1)'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享；14s 方向级/30s 答案级）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
assert 'idle > 14000 && Date.now() - lastDir > 14000' in main, 'main 缺 14s 方向级独立锚判定（家族 B）'
assert 'idle > 30000' in main, 'main 缺 30s 答案级判定（家族 B）'
# 家族契约 D：吞输入轻叮必配容器 bump
assert main.count("replayAnim(boardEl, 'bump')") >= 2, 'main 缺吞输入容器 bump ≥2 处（家族 D：窗内吞+演出期卡点）'
# 家族契约 E：行为分流先查教学特例（freshTut 判定读 sv.sortsize.tutSeen）
assert 'sv.sortsize && sv.sortsize.tutSeen' in main, 'main 缺教学特例先查（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 I：错反馈豁免窗=estMs(句)+300（窗内错点吞对选放行）+ 救援 interval 让路守卫 + startLevel 重置
assert 'wrongChainUntil = Date.now() + estMs(VOICE.wrong.text) + 300;' in main, \
    'main 缺错反馈豁免窗设置（契约 I：句长+300）'
assert 'wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answerIdx' in main, \
    'main 缺窗内错点吞对选放行 guard（契约 I r19）'
assert 'if (Date.now() < wrongChainUntil) return;' in main, 'main 救援 interval 缺豁免窗让路守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0;' in main, 'main startLevel 缺节流锚/豁免窗重置（契约 I/J）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）+ sayW 返回 bool（起播才设窗）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# Mj-1 防回归（core voice.queue 弃尾语义）：queue([...]) 数组内 keyless 段（{key:null}）
# 播完即 return 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（其后不得再有逗号+段）
for _src_name in ('main', 'verif'):
    _s = main if _src_name == 'main' else verif
    for _qm in re.finditer(r'queue\(\[(.*?)\]\)', _s, re.S):
        for _km in re.finditer(r'\{\s*key:\s*null[^\}]*\}\s*,', _qm.group(1)):
            raise AssertionError('game-%s queue 链 keyless 段必须居尾（Mj-1）: %r' %
                                 (_src_name, _km.group(0)[:60]))

# ===== estMs 四方同步（家族 T 全字符口径；r18 坑④：estMs 吃字符串禁传 .length 数字）=====
est_ms = lambda n: n * 345 + 600
assert 'const estMs = s => s.length * 345 + 600' in data, 'data 缺 estMs 全字符口径定义（四方同步之一）'
assert 'const estMs' not in main, 'main 不得重复声明 estMs（data+main 同块拼接=SyntaxError）'
assert 'const estMsV = s => s.length * 345 + 600' in verif, 'verify 缺 estMs 独立副本（四方同步之 verify 侧）'
assert 'est_ms = lambda n: n * 345 + 600' in selftest, '_selftest 缺 estMs 口径 lambda（四方一致）'
# 豁免窗算术门（契约 I 下界依据：wrong 句 10 字 → est 4050 + 300 = 4350）
assert len('再想一想，先点哪个呀') == 10 and est_ms(10) + 300 == 4350, '豁免窗构成不符（estMs(10)+300=4350）'

# ===== r19 时长模型双钉素材（§-r19 §4；build 算术门 + verify 精确钉死断言在场）=====
STEP = {'obv6': 1500, 'close6': 2100, 'close7': 2300, 'dualObv': 2800, 'dualClose': 3400}
ORD = {'obv6': 4200, 'close7': 7600}
assert 'const STEP_MS = { obv6: 1500, close6: 2100, close7: 2300, dualObv: 2800, dualClose: 3400 };' in data, \
    'data 缺 STEP_MS 字面（§-r19 §4）'
assert 'const ORD_MS = { obv6: 4200, close7: 7600 };' in data, 'data 缺 ORD_MS 字面（§-r19 §4）'
assert 'const SWITCH_MS = 400;' in data, 'data 缺 SWITCH_MS 字面'
_SENT_LEN = {'sort': 10, 'dual': 20, 'ord': 17}
_PLAN = {1: [('sort', 'obv6', 6), ('sort', 'close6', 6), ('sort', 'close6', 6), ('sort', 'close7', 7), ('sort', 'close7', 7)],
         2: [('sort', 'close6', 6)] * 2 + [('sort', 'close7', 7)] * 3,
         3: [('dual', 'dualObv', 6)] + [('dual', 'dualClose', 6)] * 4,
         4: [('ord', 'obv6', 6)] + [('ord', 'close7', 7)] * 3 + [('dual', 'dualClose', 6)]}
_ch_dur = lambda d: sum(est_ms(_SENT_LEN[k]) + (ORD[t] if k == 'ord' else n * STEP[t]) + 400
                        for k, t, n in _PLAN[d])
CH1, CH2, CH3, CH4 = _ch_dur(1), _ch_dur(2), _ch_dur(3), _ch_dur(4)
assert (CH1, CH2, CH3, CH4) == (88650, 95750, 137900, 82760), \
    'r19 关时长算术不符: %s（应 88650/95750/137900/82760）' % str((CH1, CH2, CH3, CH4))
assert 'SPEC_MODELED_FLAT0 = 88650' in verif and 'SPEC_MODELED_MIN = 82760' in verif and \
    'SPEC_MODELED_MAX = 137900' in verif, 'verify 缺 modeled 三钉字面（FLAT0/MIN/MAX 禁约数）'
assert 'modeled(0) === SPEC_MODELED_FLAT0' in verif and 'mdMin === SPEC_MODELED_MIN' in verif, \
    'verify 缺 modeled 精确钉死断言（§-r19 §4）'

# ===== 题库硬指标静态断言（§-r19 §1/§2 数学先验的源级锚）=====
for _lit in ('[19, 27, 39, 55, 77, 108]', '[34, 40, 47, 55, 64, 75]',
             '[32, 38, 44, 52, 61, 71, 84]', '[30, 45, 68]', '[40, 47, 55]'):
    assert _lit in data, 'data 缺阶梯字面 %s（SPEC §-r19 梯度表）' % _lit
assert 'const CH_LEN = 5' in data and 'const STATIC_LEVELS = 20' in data, \
    'data 缺关型常量（r19 键基不变：CH_LEN 5/STATIC 20）'
assert "mulberry32(flat * 7919 + 13)" in engine, 'engine 缺本款种子常量 13（SPEC §0.3）'
# r19 双属性唯一解先验锚（每档恰一红一蓝 → (尺寸,颜色) 对互异）
assert 'c.r !== 1 || c.b !== 1' in engine, 'engine 缺 dual 配对先验（每档恰一红一蓝）'
# r19 序数域锚（rank∈[2,n-2]——禁 1=极值退化与边缘）
assert 'q.rank < 2 || q.rank > n - 2' in engine, 'engine 缺序数域先验 [2,n-2]'
# r19 题计划锚（热身/首现槽）
assert "tier: 'dualObv', first: 'r'" in data, 'data 缺 ch3 热身锚（dualObv first=r）'
assert "kind: 'ord', n: 6, tier: 'obv6', rank: 2" in data, 'data 缺 ch4 热身锚（ord obv6 rank2）'
assert "ord: 'small'" in data, 'data 缺方向/第N小首现槽锚'
# 引擎语义锚（比较器：先尺寸后颜色）
assert 'q.colors[a] === q.first' in engine, 'engine 缺 dual 平局比较器（首色在前）'

# ===== verify 独立第 4 块 + 源码断言素材（b36 自匹配防回归：高风险串字符串拼接）=====
assert "querySelectorAll('script')[2]" in verif, 'verify 缺 script[2] 游戏块源码断言（E-M2）'
assert "next' + 'Hint(lim - 1)" in verif, 'verify 缺家族 A 检索串（拼接形态）'
assert "GEN_' + 'HINTS[genLevel(f + 1).dch - 1]" in verif, 'verify 缺家族 F 检索串（拼接形态）'
assert "function rescue' + 'Tick()" in verif, 'verify 缺契约 K 检索串（拼接形态）'
assert 'keylessLast' in verif, 'verify 缺 keylessLast 断言（契约 N/Mj-1）'

# ===== r19 竖屏双通道逐行全等（§-r19 §6：@media(orientation:portrait) 与 body.port 类通道
# 规则逐行相同——/*PORT-CLS*/ 标记段；selftest P1b 竖屏等价依赖 body.port 通道）=====
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
assert '<title>大小排排队</title>' in head, 'head 缺标题 大小排排队'
assert re.search(r'button\{[^}]*color:#4A3B2E', head), 'head button 规则缺显式 color（契约 O）'
# r19 题型样式锚（ord 锚/色序徽章/单槽/救援 pulse/容器 bump）
for _lit in ('.ord-anchor', '.d-legend', '#strip.ord', '#prompt-chip.pulse', 'an-bump'):
    assert _lit in head, 'head 缺 r19 题型/契约样式锚 %s' % _lit

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
print('r19 check: clips %d (sor 18+core 3, T46 阶段2 +sor_wrong); wrong-win estMs(10)+300=4350; '
      'modeled ch1/ch2/ch3/ch4=%d/%d/%d/%d (min %d); PORT-CLS %d lines equal; 4 script blocks' %
      (n_clips, CH1, CH2, CH3, CH4, min(CH1, CH2, CH3, CH4), len(_media_lines)))
