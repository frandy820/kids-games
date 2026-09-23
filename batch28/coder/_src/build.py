# -*- coding: utf-8 -*-
"""coder 指令小兔 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch28/coder/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch28/coder/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（cod_ 6 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
COD_KEYS = ['cod_tut_watch', 'cod_tut_turn', 'cod_hint', 'cod_right', 'cod_wrong', 'cod_q']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('coder')            # cod_ 6 条（manifest games 含 coder）
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# core 3 条兜底：manifest games 列表未含本游戏时（禁改 manifest——任务书红线），
# 按 key 显式注入（同源 voice/clips/*.mp3，与 sign/ruler 产物等价结构）；已含则直接用
if not all('"%s"' % k in clips for k in CORE_KEYS):
    import base64 as _b64, os as _os
    _VCLIPS = _os.path.join('F:/claudecode/projects/active/kids-games/voice', 'clips')
    _extra = []
    for _k in CORE_KEYS:
        _p = _os.path.join(_VCLIPS, _k + '.mp3')
        if not _os.path.exists(_p) or _os.path.getsize(_p) < 800:
            print('CLIPS-INJECT-FAIL: core clip %s' % _k); sys.exit(3)
        _b = _b64.b64encode(open(_p, 'rb').read()).decode('ascii')
        assert '</script' not in _b
        _extra.append('"%s":"data:audio/mpeg;base64,%s"' % (_k, _b))
    clips = clips.replace('};/*CLIPS-END*/', ',' + ','.join(_extra) + '};/*CLIPS-END*/')
# clips 注入断言：T46 阶段2 后 cod_ 24 条（6 固定+18 段键）+ core 3 条 = 27（SPEC-BATCH28 §1/§4）
COD_T46 = ['cod_ps_go', 'cod_ps_n_1', 'cod_ps_n_2', 'cod_ps_n_3', 'cod_ps_bu', 'cod_ps_zai',
           'cod_ps_tail', 'cod_d_up', 'cod_d_down', 'cod_d_left', 'cod_d_right',
           'cod_gw1', 'cod_gw2', 'cod_g_path', 'cod_g_block', 'cod_cf_path', 'cod_cf_run',
           'cod_demo']
for k in COD_KEYS + COD_T46 + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 27, 'clips 条数 %d != 27（cod 24 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'coder'" in main, 'main 缺 KIDS.init coder（存档键 kidsgame_coder）'
assert 'window.CD =' in main, 'main 缺 CD 钩子'
assert '__cdDemoR' in main, 'main 缺教学演示实证 __cdDemoR'
assert "__cdDemoV = 'cod_demo'" in main, 'main 缺教学 demo 键实证 __cdDemoV（T46 阶段2）'
# 家族契约 A：启动 dayEnd 传 lim-1（winFlow dayEnd 传 nextHint(null)——b25 形态定版，两处等价语义）
assert main.count('nextHint(lim - 1)') == 1, '启动 dayEnd nextHint(lim-1) 必须恰 1 处，实得 %d' % main.count('nextHint(lim - 1)')
assert 'nextHint(null)' in main, 'winFlow dayEnd 缺 nextHint(null)（b25 形态定版）'
# 家族契约 F：生成关 hint 实算 genLevel(f+1).dch-1，禁 (ci+1)%4 章序推进（b26 审查 M3）
assert 'genLevel(f + 1).dch - 1' in main, 'nextHint 生成关分支缺实算 genLevel(f+1).dch-1（家族 F）'
assert '(ci + 1) % 4' not in main, 'nextHint 禁 (ci+1)%4 章序推进（b26 审查 M3）'
# 家族契约 B：救援双锚（lastDir 独立节流锚在场，不与 lastAct 共享）
assert 'lastDir' in main and 'lastAct' in main, 'main 缺救援双锚 lastAct/lastDir'
# 家族契约 D：吞输入轻叮必配容器 bump
assert "replayAnim(boardEl, 'bump')" in main, 'main 缺吞输入容器 bump（家族 D）'
# 家族契约 K：rescueTick 面板在场守卫（b27 新立——面板遮挡期救援静默）
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'rescueTick 缺面板守卫（家族 K）'
# 家族契约 I：错反馈链豁免窗 + 救援 interval 守卫 + startLevel 三锚重置（T46 clip 链实长口径；
# r40 增 readChainUntil 读链豁免窗——seq3 9 段链 14136 > 14000 方向级救援间隔，家族 I 同构让路）
assert 'wrongChainUntil = Date.now() + 8800' in main, 'main 缺错反馈链豁免窗 wrongChainUntil=8800'
assert 'wrongChainUntil = Date.now() + 3700' in main, 'main 缺撞石探索豁免窗 3700'
assert 'readChainUntil = Date.now() + 14600' in main, 'main 缺 r40 seq3 读链豁免窗 readChainUntil=14600'
assert 'if (Date.now() < wrongChainUntil || Date.now() < readChainUntil) return;' in main, \
    '救援 interval 缺链豁免双守卫（家族 I + r40 读链窗）'
assert 'lastWrongVoice = 0; wrongChainUntil = 0; readChainUntil = 0;' in main, \
    'startLevel 缺三锚重置（家族 I/J + r40 读链窗）'
assert 'sayW([VOICE.wrong.key].concat(guideKeys(q)))' in main, \
    'main 错反馈拼播链（cod_wrong+guideKeys 段组，T46 阶段2 全键化）缺失'
# 家族契约 L：NUMCN 步数表全量（2=两 口径）与 path 读句在场
assert "const NUMCN = { 1: '一', 2: '两', 3: '三' };" in data, 'NUMCN 步数表缺失或 2≠两（契约 L）'
assert 'pathSpeak' in data, 'data 缺 path 读题拼句 pathSpeak（NUMCN 消费方）'
assert 'q.seq.slice(1)' in data, 'data 缺 r40 变长 pathSpeak/pathKeys（seq.slice(1) 构造标志）'
assert 'pathSeqOf' in data, 'data 缺 r40 path seq 坡表 pathSeqOf（(dch,lv)→2|3）'
assert 'pathKeys' in data and 'guideKeys' in data and 'confirmKeyOf' in data, \
    'data 缺 T46 阶段2 键构造 pathKeys/guideKeys/confirmKeyOf'
assert 'KIDS.voice.queue(pathKeys(q))' in main, 'main 缺 path 读题变长链 queue（r40：seq2 7 段/seq3 9 段）'
assert "KIDS.voice.play('cod_g_block', GUIDE.block)" in main, 'main 缺撞石豁免句 clip 键化'
assert "KIDS.voice.play(demo ? 'cod_demo' : confirmKeyOf(q)" in main, 'main 缺 demo/确认句 clip 键化'
# r40 布局结构锚：4×4 大草地 / 卡排防溢出 wrap+紧凑档 / mini m4 四列（r31 判别力：mini 与真网格同构）
assert '.grid.g4' in head, 'head 缺 4×4 网格样式 .grid.g4（r40 ch3+ 大草地）'
assert 'flex-wrap:wrap' in head, 'head 缺 #board flex-wrap 防溢出安全网（r40 池 5-6 张）'
assert '#board.many .card' in head, 'head 缺 many 紧凑卡档（r40 池 ≥5 张单行 550≤640）'
assert '.mini.m4' in head, 'head 缺 mini m4 四列档（r40 4×4 候选卡同构）'

# ===== 语音窗静态断言（T46 阶段2 后以 clip 链实长为主口径：mp3 实测表 + Σ段+150×段距+300）=====
est_ms = lambda n: n * 345 + 600
CLIP_MS = {'cod_tut_watch': 3504, 'cod_tut_turn': 1848, 'cod_hint': 2352, 'cod_right': 2424,
           'cod_wrong': 2568, 'cod_q': 2400, 'cod_ps_go': 1104, 'cod_ps_n_1': 1128,
           'cod_ps_n_2': 1128, 'cod_ps_n_3': 1224, 'cod_ps_bu': 1920, 'cod_ps_zai': 1368,
           'cod_ps_tail': 2280, 'cod_d_up': 1224, 'cod_d_down': 1224, 'cod_d_left': 1152,
           'cod_d_right': 1176, 'cod_gw1': 3072, 'cod_gw2': 1104, 'cod_g_path': 3120,
           'cod_g_block': 2280, 'cod_cf_path': 2616, 'cod_cf_run': 2424, 'cod_demo': 2832}
chain_ms = lambda *ks: sum(CLIP_MS[k] for k in ks) + 150 * (len(ks) - 1)
# ① 确认句 clip 化（cf_path/cf_run/demo 单键）：判对演出窗 1800+3600=5400 ≥ 最长 2832+300
mconf = re.search(r"const confirmText = q => q\.kind === 'path' \? '([^']+)' : '([^']+)'", data)
assert mconf, 'data 缺 confirmText 句式'
assert "KIDS.voice.play(demo ? 'cod_demo' : confirmKeyOf(q)" in main, 'main 缺 demo/确认句 clip 键化'
mdemo = re.search(r"demo \? '([^']+)' : confirmText\(q\)\)", main)
assert mdemo and mdemo.group(1) == '点箭头，小兔子就走', 'main 缺教学 demo 机制句文本'
assert '1800 * SPEED' in main and '3600 * SPEED' in main, 'main 判对演出窗 5400（1800+3600）缺失'
max_conf_ms = max(CLIP_MS['cod_cf_path'], CLIP_MS['cod_cf_run'], CLIP_MS['cod_demo'])
assert 1800 + 3600 >= max_conf_ms + 300, \
    '判对演出窗 5400 < 确认/demo clip 最长 %d+300' % max_conf_ms
# ② 错反馈链（T46 段链实长）：run=cod_wrong+gw1+方向+gw2 四段；path=cod_wrong+g_path 两段
#    链豁免窗（家族 I）≥ 链总实长+300；run/path 双链同窗
run_chain = chain_ms('cod_wrong', 'cod_gw1', 'cod_d_up', 'cod_gw2')   # 方向取最长 up/down 1224
path_chain = chain_ms('cod_wrong', 'cod_g_path')
assert 8800 >= run_chain + 300, '链豁免窗 8800 < run 链 %d+300' % run_chain
assert 8800 >= path_chain + 300, '链豁免窗 8800 < path 链 %d+300' % path_chain
# ③ 撞石豁免（单键 clip）：3700 ≥ 2280+300
assert 3700 >= CLIP_MS['cod_g_block'] + 300, '撞石豁免窗 3700 < cod_g_block 2280+300'
# ③b path 读题 7 段链（seq2）≤ 方向级救援间隔-1000（救援 14s 不掐尾；n_3 取保守上界 11244）
read_chain = chain_ms('cod_ps_go', 'cod_ps_n_3', 'cod_ps_bu', 'cod_d_up', 'cod_ps_zai', 'cod_d_down', 'cod_ps_tail')
assert read_chain + 1000 <= 14000, 'path 读题 7 段链 %d+1000 > 14000' % read_chain
# ③c r40 seq3 读题 9 段链（cod_ps_zai 复用两次）：14136 > 14000 救援间隔 → readChainUntil=14600 豁免守卫
read3_chain = chain_ms('cod_ps_go', 'cod_ps_n_3', 'cod_ps_bu', 'cod_d_up', 'cod_ps_zai',
                       'cod_d_down', 'cod_ps_zai', 'cod_d_up', 'cod_ps_tail')
assert read3_chain + 300 <= 14600, 'r40 seq3 9 段链 %d+300 > readChainUntil 14600' % read3_chain
# ③ clip 实长窗（SPEC-BATCH28 §4 量化）：窗值 ≥ clip 实测 + 300 余量
assert '900 * SPEED' in main and '3000 * SPEED' in main, 'main 缺教学演示延窗（t=900+3000=3900）'
assert 900 + 3000 >= 3504 + 300, '教学演示窗 3900 < cod_tut_watch 3504+300=3804'
assert '}, 2200);' in main, 'main 教学 turn 后读题延 2200 缺失（cod_tut_turn 1848+300 防尾截）'
assert 2200 >= 1848 + 300, 'turn 后读题延 2200 < cod_tut_turn 1848+300=2148'
assert 'await wait(400)' in main, 'main winFlow celebrate 后补窗 400 缺失（cod_right ≥2724）'
assert 2620 + 400 >= 2424 + 300, 'celebrate 2620+400=3020 < cod_right 2424+300=2724（契约 H）'
assert 'await wait(1000 * SPEED)' in main, 'main 缺错点防重入窗 1000ms'
# ④ 教学链预算 ≤16s（任务书静态断言：SPEED 段+固定段分账累加）
#    tutorialWatch 内 await wait(N*SPEED) 分账 + demo tap 演出窗（uiTapCard 判对 1800+3600）
mtut = re.search(r'async function tutorialWatch\(\) \{.*?\n\}', main, re.S)
assert mtut, 'main 缺 tutorialWatch'
tut_speeds = [int(x) for x in re.findall(r'await wait\((\d+) \* SPEED\)', mtut.group(0))]
tut_fixed = [int(x) for x in re.findall(r'await wait\((\d+)\);', mtut.group(0))]
budget = sum(tut_speeds) + sum(tut_fixed) + (1800 + 3600)
assert budget <= 16000, '教学 watch 链预算 %dms > 16000（SPEED 段 %s + 固定段 %s + demo 演出窗 5400）' % (
    budget, tut_speeds, tut_fixed)
# ⑤ verify 页 clip 链动态断言在场（运行时对账，build 只验结构存在）
assert 'chainMs' in verif and '1800 + 3600' in verif, 'verify 缺 clip 链动态断言 chainMs'
assert 'tw <= 16000' in verif, 'verify 缺教学链 ≤16s 实测断言'
# SPEC 独立硬编码表在场（双录对账前提）+ 实长表数值一致（T46 后 24 键全表）
for sym in ['SPEC_DIRS', 'SPEC_DELTA', 'SPEC_NUMCN', 'SPEC_SENT', 'SPEC_DUR']:
    assert ('const ' + sym) in verif, 'verify 缺 SPEC 独立表 %s' % sym
mdur = re.search(r'const SPEC_DUR = \{([^}]+)\}', verif)
dur_vals = dict(re.findall(r"'(cod_\w+)':\s*(\d+)", mdur.group(1)))
assert len(dur_vals) == 24 and \
    all(dur_vals.get(k) == str(v) for k, v in CLIP_MS.items()), \
    'SPEC_DUR 24 键与 CLIP_MS 实长表不符：%s' % dur_vals
# 卡池先验独立复算器在场（verify ② ③ 防同源）
for sym in ['specSolve', 'specReach', 'specShortest', 'specWrongSeq', 'specBlockIdx']:
    assert sym in verif, 'verify 缺独立复算器 %s' % sym

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
print('T46 clip-chain check: right %d+300 <= 5400; run-chain %d+300 & path-chain %d+300 <= 8800; '
      'block %d+300 <= 3700; read-chain %d+1000 <= 14000; r40 read3-chain %d+300 <= 14600(readChainUntil)'
      % (max_conf_ms, run_chain, path_chain, CLIP_MS['cod_g_block'], read_chain, read3_chain))
print('tutorial budget: SPEED %s + fixed %s + demo 5400 = %dms <= 16000'
      % (tut_speeds, tut_fixed, budget))
