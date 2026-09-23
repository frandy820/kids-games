# -*- coding: utf-8 -*-
"""shapeshome 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch11/shapeshome/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch11/shapeshome/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（shapeshome：33 既有 + r8 新 76 = 109 条已合成，构建自包含）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('shapeshome')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)  # 注入失败禁静默降级（任务书硬性要求）
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# r8 新键注入在场（三维/否定/九宫格题面 + 新章规则句；防 manifest/合成脱节静默回退 TTS）
for _k in ('shp_q3_red_circle_big', 'shp_nq_green_triangle', 'shp_gq', 'shp_rule_neg', 'shp_rule_mix'):
    assert '"%s":' % _k in clips, 'r8 新 clip 缺注入: %s' % _k
# T46 阶段2（2026-09-19）纠错族 73 锚（shp_wrong_g/tri/neg——B 类无册键挂正）
for _k in ('shp_wrong_g', 'shp_wrong_tri_red_circle_big', 'shp_wrong_neg_green_triangle'):
    assert '"%s":' % _k in clips, 'T46 纠错 clip 缺注入: %s' % _k
assert clips.count(':"data:audio') >= 182, 'T46 后 clip 数 <182（109 r8 + 73 shp_wrong 族）'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r8 窗常量四处同步·字面 assert）：estMs 家族定版 n*345+600（禁 +300 变体；
# 源=game-data 字面 / 注释 / verify estMs(9)===3705 数值断言 / 此处 build 字面）
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600）'
assert '+ 300' not in data.split('const estMs')[1].split(';')[0], 'estMs 出现 +300 变体（禁）'
assert 'estMs(9) === 3705' in verif and 'estMs(1) === 945' in verif, 'verify estMs 数值断言缺失'

# 硬性检查 5（r8 家族契约 A/F/M1·字面 assert）：nextHint 静态章末=CHAPTERS[floor(f/CH_LEN)+1]
# （禁旧式 floor((f+1)/CH_LEN)+1 多进一章）；生成段禁 (ci+1)%4 字面（须实算 genLevel(f+1).dch）；
# dayEnd 两处（winFlow dayDone + 启动分支）传 nextHint(lim - 1)，禁裸 nextHint(lim)
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, 'nextHint 静态分支字面缺失（M1 形）'
assert '(ci + 1) % 4' not in main and 'GEN_HINTS[(ci + 1)' not in main, '生成关预告残留 (ci+1)%4 字面（契约 F 禁）'
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '生成关预告须实算 genLevel(f+1).dch（契约 F）'
assert main.count('nextHint(lim - 1)') >= 2, 'dayEnd 预告须 ≥2 处传 nextHint(lim - 1)（契约 A）'
assert 'nextHint(lim)' not in main, '禁裸 nextHint(lim)（家族 A：lim 为章边界会多前进一章）'

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
