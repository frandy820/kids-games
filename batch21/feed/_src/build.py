# -*- coding: utf-8 -*-
"""feed 喂小兔 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r8 难度改造（2026-09-14，AUDIT-56 #16）：六章量域 6-10 / left 剩题真心算 / combo 双食物合计订单。
用法: python batch21/feed/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch21/feed/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
MANI = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips/manifest.json')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（fed_* 7 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('feed')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：fed_ 47 条（r8 7 + T46 阶段2 40：题面 15+combo 段 13+数词 11+fed_more）
# + core 3 条 = 50 条（SPEC §1-r8 / T46）
FED_KEYS = ['fed_tut_watch', 'fed_tut_turn', 'fed_hint', 'fed_right', 'fed_wrong',
            'fed_left_q', 'fed_left_do', 'fed_more']
T46_KEYS = ['fed_q_%d_%s' % (n, f) for n in range(6, 11) for f in ('carrot', 'greens', 'apple')] + \
           ['fed_c_head'] + \
           ['fed_c_%d_%s' % (n, f) for n in range(2, 6) for f in ('carrot', 'greens', 'apple')] + \
           ['fed_n_%d' % n for n in range(0, 11)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in FED_KEYS + T46_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 50, 'clips 条数 %d != 50（fed 47 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r8）：estMs 家族定版字面（n*345+600，禁 +300 变体）——源码级断言在本文件做
# （页内 game-verify 另有数值+toString 断言；game-data 定义 / game-main 注释 / verify / 本处四处同步）
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'

# 硬性检查 5（家族契约）：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；
# F=生成关预告禁 (ci+1)%N 字面（须实算 GEN_HINTS[genLevel(f+1).dch-1]）
assert main.count('nextHint(lim - 1)') >= 2, '家族契约 A：dayEnd 预告须传 nextHint(lim - 1) 两处'
assert '(ci + 1) %' not in main and '(ci+1)%' not in main, '家族契约 F：禁 (ci+1)% 字面'
# r7 审查 M1 同型坑：静态章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4）；禁 off-by-one 式
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约：静态章末预告式漂移'
assert 'CHAPTERS[Math.floor((f + 1) / CH_LEN) + 1].hint' not in main, '禁 off-by-one 章末预告式（M1）'
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'

# 硬性检查 6（r8 玩法契约）：六章 30 关 + 三题型关键字面在场（源码级，防误删）
assert 'STATIC_LEVELS = 30' in data and 'N_CH = 6' in data, 'r8 六章 30 关常量漂移'
assert 'LEVEL_MIN_MS = 40000' in data, 'r8 时长下限常量漂移'
assert "q.kind === 'left' && q.phase === 1" in engine, "r8 left 剩题两阶段引擎缺失"
assert "q.kind === 'combo'" in engine, "r8 combo 合计订单引擎缺失"
assert 'fed_left_q' in data and 'fed_left_do' in data, 'r8 剩题语音键缺失'
assert "textContent === '?'" not in main, "chip 问句态判定应在 verify（main 禁实现断言残留）"

# 硬性检查 7（r8 语音文案对账）：新键与 manifest 一字一致（gen_clips.py 真值源）
import json
mani = json.loads(MANI.read_text(encoding='utf-8'))
for k, t in [('fed_left_q', '小兔子吃掉啦，数一数，还剩几根'),
             ('fed_left_do', '拿一样多的，喂给小兔子')]:
    assert mani.get(k, {}).get('text') == t, 'manifest %s 文案不一致：%r' % (k, mani.get(k, {}).get('text'))
    assert k in data and t in data, 'game-data 未含 %s 文案' % k

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
