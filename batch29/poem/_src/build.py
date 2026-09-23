# -*- coding: utf-8 -*-
"""poem 古诗跟读 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch29/poem/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch29/poem/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
GENCLIPS = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/gen_clips.py')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（r42 终态 2026-09-22：poe_ 59 条 + core_* 3 条 = 62，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('poem')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r42 终态 2026-09-22 主线注册，manifest 5291→5321）：
# poe_ 59 条（通用 11+12 诗行音 48）+ core 3 条 = 62 条
POE_KEYS = ['poe_tut_watch', 'poe_tut_turn', 'poe_hint', 'poe_right', 'poe_wrong',
            'poe_q_next', 'poe_q_hear', 'poe_q_fill', 'poe_q_order', 'poe_g_next', 'poe_g_hear']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in POE_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
for pid in ['yie', 'jys', 'cx', 'mn', 'dgjl', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']:
    for n in range(4):
        assert '"poe_line_%s_%d"' % (pid, n) in clips, 'clips 缺少行音 poe_line_%s_%d' % (pid, n)
assert '"pf_poem' not in clips, 'clips 出现 pf_poem 整诗键（§0.71 禁复用 poemfill 整诗 clip）'
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 62, 'clips 条数 %d != 62（r42 终态：poe 59 + core 3；2026-09-22 注册）' % n_clips

# ===== 行表对账（零手抄源铁律）：交集对账——gen_clips.py POEM29_LINES 现值（旧 5 诗）
# 与 game-data POEMS 同 pid 行表严格一致；r42 新 7 诗（yqesl/clg/yhs/jsyz/dlyy/lc/xs）
# 走主线注册扩容 POEM29_LINES 后同律对账【TODO 主线】=====
gp = GENCLIPS.read_text(encoding='utf-8')
mblock = re.search(r'POEM29_LINES = \{(.*?)\n    \}', gp, re.S)
assert mblock, 'gen_clips.py 未找到 POEM29_LINES 块'
src_rows = {}
for pid, body in re.findall(r"'([a-z]+)':\s*\[([^\]]*)\]", mblock.group(1)):
    src_rows[pid] = re.findall(r"'([^']+)'", body)
assert sorted(src_rows) == sorted(['cx', 'dgjl', 'jys', 'mn', 'yie', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']) \
    and all(len(v) == 4 for v in src_rows.values()), \
    'POEM29_LINES 解析异常（r42 终态应 12 诗）: %s' % {k: len(v) for k, v in src_rows.items()}
data_rows = {}
for pid, body in re.findall(r"(yie|jys|cx|mn|dgjl|yqesl|clg|yhs|jsyz|dlyy|lc|xs):\s*\{ title: '[^']+',\s*lines: \[([^\]]*)\]", data):
    data_rows[pid] = re.findall(r"'([^']+)'", body)
assert len(data_rows) == 12 and all(len(v) == 4 for v in data_rows.values()), \
    'game-data POEMS 应 12 诗各 4 行: %s' % {k: len(v) for k, v in data_rows.items()}
for pid in src_rows:                                   # 全量对账（r42 终态：12 诗逐行零手抄）
    assert data_rows.get(pid) == src_rows[pid], 'game-data POEMS[%s] 与 gen_clips POEM29_LINES 不一致' % pid
NEW7 = ['yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']     # r42 新 7 诗（主线已注册 2026-09-22）
POEM_ORDER = re.search(r"const POEM_IDS = \[([^]]+)\]", data).group(1)
assert re.sub(r'\s+', ' ', POEM_ORDER).strip() == "'yie', 'jys', 'cx', 'mn', 'dgjl', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs'", \
    'POEM_IDS 顺序异常（前 5 锚面序+r42 新 7 序）: %s' % POEM_ORDER
# ===== FILLS 挖空封闭表对账（r42 §R4）：真值字与行文本汉位互证（零手抄）+干扰律 =====
def han_at(line, h):
    k = -1
    for c in line:
        if c in '，。！？、':
            continue
        k += 1
        if k == h:
            return c
    return None
fills_m = re.search(r'const FILLS = \{(.*?)\n\};', data, re.S)
assert fills_m, 'game-data 缺 FILLS 挖空封闭表（r42）'
ORDER12 = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs']
for pid in ORDER12:                                    # 每诗标签在场（防漏诗）
    assert re.search(r'%s:\s*\[' % pid, fills_m.group(1)), 'FILLS 缺诗 %s' % pid
entries = re.findall(r"\{ h: (\d+), ch: '([^']+)', dis: \[([^\]]*)\] \}", fills_m.group(1))
assert len(entries) == 48, 'FILLS 应 48 条（12 诗×4 行），实得 %d' % len(entries)
holes_all = {}
for i, pid in enumerate(ORDER12):                      # 条目按诗序切分（game-data 表序=ORDER12）
    rows = entries[i * 4:(i + 1) * 4]
    hs = []
    for n, (h, ch, dis) in enumerate(rows):
        h = int(h)
        dis_l = re.findall(r"'([^']+)'", dis)
        assert han_at(data_rows[pid][n], h) == ch, 'FILLS[%s][%d] 汉位 %d 真值 %s != 行文本 %s' % (
            pid, n, h, ch, han_at(data_rows[pid][n], h))
        assert len(dis_l) == 3 and len(set(dis_l)) == 3 and ch not in dis_l, 'FILLS[%s][%d] 干扰异常' % (pid, n)
        for d in dis_l:
            assert d not in data_rows[pid][n], 'FILLS[%s][%d] 干扰 %s 是句内字' % (pid, n, d)
        hs.append(h)
    assert len(set(hs)) >= 3, 'FILLS[%s] 位次仅 %d 种（分布铁律 ≥3）' % (pid, len(set(hs)))
    holes_all[pid] = hs
_h = [h for hs in holes_all.values() for h in hs]
assert len(_h) == 48 and len(set(_h)) >= 6 and _h.count(0) <= 8, \
    'FILLS 全库 48 空位次分布异常：n=%d distinct=%d hole0=%d' % (len(_h), len(set(_h)), _h.count(0))
assert 'const hanAt = (line, h) =>' in data, 'game-data 缺 hanAt 汉位函数（FILLS 互证共用）'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'poem'" in main, 'main 缺 KIDS.init poem（存档键 kidsgame_poem）'
assert 'window.PM =' in main, 'main 缺 PM 钩子'
assert '__pmDemoR' in main, 'main 缺教学演示实证 __pmDemoR'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 E：修复行为收窄先查教学特例（demo 通道豁免 locked 门）
assert '(state.locked && !demo) || (state.demo && !demo)' in main, 'main 缺教学特例豁免门（家族 E）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'main 缺生成关 nextHint 实算（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 G：读题拼播链窗常量在场（链总实长+300 口径；r42 四型链）
assert 'KIDS.voice.queue([lineKey(q.poem, q.prevLine), VOICE.qNext.key])' in main, 'main 缺 next 读题拼播链（家族 G）'
assert 'KIDS.voice.queue([lineKey(q.poem, q.audioLine), VOICE.qHear.key])' in main, 'main 缺 hear 读题拼播链（家族 G）'
assert 'KIDS.voice.queue([lineKey(q.poem, q.line), VOICE.qFill.key])' in main, 'main 缺 fill 读题拼播链（家族 G r42）'
assert 'lineKey(q.poem, 0), lineKey(q.poem, 1)' in main, 'main 缺 order 全诗读题链（家族 G r42）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 重置（r42 +orderChainUntil 三处）
assert 'wrongChainUntil = Date.now() + WRONG_CHAIN_WIN' in main, 'main 缺错反馈链豁免窗赋值（契约 I 起播设）'
assert 'if (Date.now() < wrongChainUntil) return;' in main or \
       'Date.now() < wrongChainUntil || Date.now() < orderChainUntil' in main, 'main 救援 interval 缺链豁免守卫（契约 I）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0; orderChainUntil = 0;' in main, 'main startLevel 缺链豁免/节流锚重置（契约 I/J r42）'
assert 'orderChainUntil = Date.now() + ORDER_WIN' in main, 'main 缺 order 链豁免窗赋值（契约 I r42 扩展）'
# 家族契约 J：语义句 flat≥3 只 10s 节流（禁切通用 clip）
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫（b28 m4，逐字一致）
assert 'function rescueTick()' in main, 'main rescueTick 必须命名函数（b28 m4）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueTick 缺面板在场守卫（契约 K）'
# estMs 全字符口径（家族 T：len*345+600，标点计入）
assert 'estMs = s => s.length * 345 + 600' in main, 'main 缺 estMs 全字符口径定义'
# r42 结构锚（四族谱防回退）：engine 四型分支与 order 逐句即判在场
assert "if (q.kind === 'order')" in engine, 'engine 缺 order 判定分支（r42）'
assert "return 'step';" in engine, 'engine 缺 order step 中间步返回（r25 M2 单步）'
assert "'orderSorted'" in engine, 'engine structWhy 缺 order 恒非原序断言（r42）'
assert "kind === 'fill'" in engine and "'fillTruth'" in engine, 'engine 缺 fill 生成/互证断言（r42）'

# ===== 语音窗静态断言（家族 G/H/I + r42 §R9 est 口径【新键注册后实测复核 TODO】）=====
est_ms = lambda n: n * 345 + 600
# clip 实长（SPEC §4，2026-09-10 浏览器实测）
WATCH_MS, TURN_MS, RIGHT_MS, WRONG_MS, QN_MS, QH_MS = 2904, 1776, 2472, 2232, 2136, 2472
# r42 新窗（est 口径）：LINE_MAX=敕勒歌行1 est 3705×1.04 实/估比外推 → 3900；
# Q_FILL_MS=estMs(6 字)=2670 取整 2700；Q_ORDER_MS=estMs(9 字符)=3705
LINE_MAX, QF_MS, QO_MS = 3900, 2700, 3705
assert LINE_MAX >= 3705 * 1.04, 'LINE_MAX %d < 敕勒歌行1 est 3705×1.04' % LINE_MAX
assert est_ms(6) <= QF_MS <= est_ms(6) + 100, 'Q_FILL_MS 口径异常（est 2670±）'
assert QO_MS == est_ms(9), 'Q_ORDER_MS 口径异常（est 3705）'
# ① 读题拼播链窗（家族 G：链总实长+300；行音按全库行 max est 口径 r42）
assert 'const NEXT_WIN = LINE_MAX + 150 + Q_NEXT_MS + 300;' in data, 'game-data 缺 NEXT_WIN 链窗常量'
assert 'const HEAR_WIN = LINE_MAX + 150 + Q_HEAR_MS + 300;' in data, 'game-data 缺 HEAR_WIN 链窗常量'
assert 'const FILL_WIN = LINE_MAX + 150 + Q_FILL_MS + 300;' in data, 'game-data 缺 FILL_WIN 链窗常量（r42）'
assert 'const LINE_WIN = LINE_MAX + 300;' in data, 'game-data 缺 LINE_WIN 行音窗常量'
# ② order 全诗链豁免窗（r42：≥敕勒歌最坏链 est+300=17355）
CLG_CHAIN = QO_MS + 150 * 4 + (est_ms(7) + est_ms(9) + est_ms(7) + est_ms(7)) + 300
assert CLG_CHAIN == 3705 + 600 + 12750 + 300 == 17355, '敕勒歌链估异常 %d' % CLG_CHAIN
assert 'const ORDER_WIN = 18600;' in data and 18600 >= CLG_CHAIN, \
    'game-data ORDER_WIN 18600 < 最坏诗全链 est %d' % CLG_CHAIN
# ③ 错反馈链豁免窗（契约 I 下界逐字钉死）：poe_wrong 2232 + 150 + 引导句 clip 实长 + 300
GA_NEXT = '再读读上一行，找找接下来那句'
GA_HEAR = '再听一遍这一句'
GN_MS, GH_MS = 3720, 2112
assert len(GA_NEXT) == 14 and len(GA_HEAR) == 7, '引导句长度口径异常（14/7 字符）'
assert ("const GUIDE_NEXT = '%s'" % GA_NEXT) in data, 'game-data 缺 next 错引导句（链下界依据）'
assert ("const GUIDE_HEAR = '%s'" % GA_HEAR) in data, 'game-data 缺 hear 错引导句（链下界依据）'
WRONG_CHAIN_WIN = 8400
assert WRONG_CHAIN_WIN >= WRONG_MS + 150 + GN_MS + 300, \
    '链豁免窗 %d < poe_wrong %d+150+poe_g_next %d+300' % (WRONG_CHAIN_WIN, WRONG_MS, GN_MS)
assert 'const WRONG_CHAIN_WIN = 8400;' in data, 'game-data 缺链豁免窗常量 8400'
# ④ 判对/奖励窗（家族 H：实测 clip 时长+300）
assert main.count('await wait(1800 * SPEED)') == 2, 'main 判对演出窗 1800+1800 两段不足'
assert 1800 + 1800 >= RIGHT_MS + 300, '判对演出窗 3600 < poe_right %d+300' % RIGHT_MS
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（poe_right ≥2772）'
assert 2620 + 400 >= RIGHT_MS + 300, 'celebrate 2620+400=3020 < poe_right %d+300=2772' % RIGHT_MS
# ⑤ 教学 clip 窗（SPEC §4）：窗值 ≥ clip 实测 + 300 余量
assert 'const WATCH_T = WATCH_MS + 300;' in data, 'game-data 缺 WATCH_T 教学窗常量'
assert '}, TURN_DELAY);' in main, 'main 教学 turn 后读题延 TURN_DELAY 缺失（poe_tut_turn 1776+300 防尾截）'
assert 'const TURN_DELAY = 2100;' in data and 2100 >= TURN_MS + 300, 'TURN_DELAY 2100 < 1776+300=2076'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
assert 'await wait(700 * SPEED)' in main, 'main 缺 order step 飞槽锁窗 700ms（r25 M2）'
# ⑥ 教学链读题链窗在场（家族 G：watch 后播链，窗=NEXT_WIN）
assert 'await wait(WATCH_T * SPEED)' in main, 'main 缺教学 watch 窗 WATCH_T'
assert 'await wait(NEXT_WIN * SPEED)' in main, 'main 缺教学读题链窗 NEXT_WIN'

# ===== 教学链 watch 预算分账（≤16s，名义值累加；SPEED 提速仅 verify 页）=====
# tutorialWatch 名义分账（r42）：watch 窗 3204 + 读题链窗 NEXT_WIN 6486（全库行 max 口径）
# + ghost 700 + press 320 + 判对演出窗 1800+1800 + 收尾 300 = 14610 ≤ 16000
TUT_SUM = (WATCH_MS + 300) + (LINE_MAX + 150 + QN_MS + 300) + 700 + 320 + 1800 + 1800 + 300
assert TUT_SUM <= 16000, '教学 watch 分账 %dms > 16000' % TUT_SUM
for lit in ['WATCH_T * SPEED', 'NEXT_WIN * SPEED', '700 * SPEED', '320 * SPEED',
            '300 * SPEED', '1800 * SPEED', '600 * SPEED']:
    assert lit in main, 'main 教学分账缺常量窗 %s（预算 %d 断言依据）' % (lit, TUT_SUM)

# ===== verify 侧独立重列表在场（SPEC 真值双源对账防单侧漂移；r42 三表）=====
assert "SPEC_POEMS" in verif and '咏鹅' in verif and '敕勒歌' in verif and '相思' in verif, 'verify 缺 SPEC 行表独立重列（12 诗）'
assert 'SPEC_IDS' in verif and "'yqesl', 'clg', 'yhs', 'jsyz', 'dlyy', 'lc', 'xs'" in verif, 'verify 缺 SPEC_IDS r42 12 诗序'
assert 'SPEC_FILLS' in verif and 'fillDisIn' in verif, 'verify 缺 SPEC_FILLS 挖空表独立重列（r42）'
assert '__pmVlog' in verif and 'VERIFY PASS ' in verif, 'verify 缺 __pmVlog/title 断言挂载'
assert 'prev-line' in verif and 'hear-ico' in verif and 'fill-line' in verif and 'oslot' in verif, 'verify 缺帧内容断言锚（契约 M 四型）'
assert "const SPEC_DUR = { poe_tut_watch: 2904" in verif, 'verify 缺 SPEC 实长表'
assert 'SPEC_CLG_CHAIN' in verif, 'verify 缺敕勒歌链估常量（⑮ ORDER_WIN 断言依据）'
assert 'fillAnsHist' in verif and 'orderSortedN' in verif, 'verify 缺分布断言（⑱ r39-bis 铁律）'

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
print('行表对账: 12 诗 %d 行 == gen_clips POEM29_LINES 全量（r42 终态 2026-09-22 注册；新 7 诗 %d 行）'
      % (sum(len(v) for v in src_rows.values()), sum(len(data_rows[p]) for p in NEW7)))
print('FILLS 对账: 48 空真值互证全过，位次 distinct=%d hole0=%d' % (len(set(_h)), _h.count(0)))
print('estMs check: line-max %d(≥%d) clg-chain %d <= ORDER_WIN 18600; wrong-chain %d+150+%d+300=%d <= %d; '
      'right-win 3600 >= %d; tut-budget %dms <= 16000' %
      (LINE_MAX, 3705, CLG_CHAIN, WRONG_MS, GN_MS, WRONG_MS + 150 + GN_MS + 300,
       WRONG_CHAIN_WIN, RIGHT_MS + 300, TUT_SUM))
