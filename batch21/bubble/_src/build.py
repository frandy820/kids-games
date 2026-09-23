# -*- coding: utf-8 -*-
"""bubble 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r9 难度改造（2026-09-14，AUDIT-56 #17）：v2 去计数器+颜色子集+提交制之上新增——
章后段温和倒计时收尾（lv>=3 计时/超时泡泡缓浮不爆/温和重来零惩罚）+ estMs 家族时长硬断言
+ 家族契约 A/F/M1 实修（dayEnd nextHint(lim-1) 两处/生成关预告实算 dch/静态章末预告式）。
用法: python batch21/bubble/_src/build.py"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch21/bubble/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')
MANI = pathlib.Path(r'F:/claudecode/projects/active/kids-games/voice/clips/manifest.json')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（bubble 七条 bub_*（r9 新增 bub_timeup）+ 三条 core_*）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露——承 feed 同款纪律）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('bubble')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3：clips 注入数=37（bub_ 34 + core 3），键族全在场（§4 语音预合成对账）
# T46 阶段2（2026-09-19）：题面 18（bub_q_{n}_{色}）+跟数 8（bub_n_1..8）+演示强调 1（bub_enough）
BUB_KEYS = ['bub_tut_watch', 'bub_tut_turn', 'bub_hint', 'bub_right',
            'bub_wrong_more', 'bub_wrong_less', 'bub_timeup', 'bub_enough']
T46_KEYS = ['bub_q_%d_%s' % (n, c) for n in range(3, 9) for c in ('blue', 'yellow', 'pink')] + \
           ['bub_n_%d' % n for n in range(1, 9)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in BUB_KEYS + T46_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 37, f'clips 条数 {n_clips} != 37（bub 34 + core 3）'

# 硬性检查 4：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链（写盘前对整 html 检查）

# 硬性检查 5（r9）：estMs 家族定版字面（n*345+600，禁 +300 变体）——源码级断言
# （页内 game-verify 另有数值+toString 断言；game-data 定义 / game-main 注释 / verify / 本处四处同步）
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'

# 硬性检查 6（家族契约）：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；
# F=生成关预告禁 (ci+1)%N 字面（须实算 GEN_HINTS[genLevel(f+1).dch-1]）
assert main.count('nextHint(lim - 1)') >= 2, '家族契约 A：dayEnd 预告须传 nextHint(lim - 1) 两处'
assert '(ci + 1) %' not in main and '(ci+1)%' not in main, '家族契约 F：禁 (ci+1)% 字面'
# r7 审查 M1 同型坑：静态章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4）；禁 off-by-one 式
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约：静态章末预告式漂移'
assert 'CHAPTERS[Math.floor((f + 1) / CH_LEN) + 1].hint' not in main, '禁 off-by-one 章末预告式（M1）'
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'

# 硬性检查 7（r9 玩法契约）：倒计时收尾常量+时长模型在源（源码级，防误删）
assert 'TIMED_FROM_LV = 3' in data, 'r9 章后段阈值常量漂移（lv>=3）'
assert 'COUNT_SEC = 12, SLEEP_SEC = 4, DRIFT_K = 0.2' in data, 'r9 倒计时常量漂移'
assert 'LEVEL_MIN_MS = 40000' in data, 'r9 时长下限常量漂移'
assert "q._cnt = 0" in main, 'r9 温和重来（计数清零）缺失'
assert "return 'sleep'" in main, 'r9 静息软吞（sleep 返回）缺失'

# 硬性检查 8（r9 语音文案对账）：新键与 manifest 一字一致（gen_clips.py 真值源）
mani = json.loads(MANI.read_text(encoding='utf-8'))
for k, t in [('bub_timeup', '泡泡睡着啦，不着急，再数一次')]:
    assert mani.get(k, {}).get('text') == t, 'manifest %s 文案不一致：%r' % (k, mani.get(k, {}).get('text'))
    assert k in data and t in data, 'game-data 未含 %s 文案' % k

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 4（续）：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
