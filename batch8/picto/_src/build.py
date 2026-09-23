# -*- coding: utf-8 -*-
"""picto 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
r12：verify 拆独立第 4 script 块（b8 老批次合并布局照 batch36/comfort/_src/build.py 185-190 先例——
拆块后页内源码断言恢复判别力）+ r12 常量字面 assert（estMs 家族/时长模型/40 字库/形近族/evo/契约 F+A）
用法: python batch8/picto/_src/build.py"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch8/picto/index.html
KIDS_GAMES = ROOT.parents[2]                             # kids-games/（_src→picto→batch8→kids-games）
CORE = KIDS_GAMES / 'design' / 'core.js'

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（picto：6 指令 + 40 组词 pic_ch_* + 3 条 core_* 已合成，构建自包含）
try:
    sys.path.insert(0, str(KIDS_GAMES / 'voice'))
    from inject_clips import clips_js
    clips = clips_js('picto')
except (Exception, SystemExit) as e:
    print('FATAL clips inject failed: %r' % (e,), file=sys.stderr)
    sys.exit(3)   # m4：注入失败禁静默（原 clips='' 继续构建，仅靠 verify 兜底拦——对齐新款 exit(3)+计数）
n_clips = clips.count('data:audio')
print('clips[picto]: %d 条, base64 %d chars' % (n_clips, len(clips)))
assert n_clips >= 28, 'clips 数 %d < 28（pic 组词 25+core 3——verify_one 同口径）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 4（r12·常量四处同步·字面 assert）：
# estMs 家族定版 n*345+600（禁 +300 变体）；时长模型常量；40 字库实数；形近族/推演结构在场
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'
assert 'const LOOK_MS = { m1: 4800, m2: 6200, m3: 6800, m4: 6200, evo: 8400 };' in data, 'r12 观察窗分档常量漂移'
assert 'const MOTOR_MS = 800, RIGHT_MS = 1900;' in data, 'r12 演出窗常量漂移'
assert 'const LEVEL_MIN_MS = 40000;' in data, 'r12 时长下限常量漂移'
assert len(re.findall(r"k:\s*'(\w+)',\s*ch:\s*'([^']+)',\s*wd:\s*'([^']+)'", data)) == 40, \
    'r12 字库应 40 字（gen_clips.py 同口径正则）'
assert 'const sameFam' in data and 'const famOf' in data, 'r12 形近族口径缺失'
assert "const EVO_KEYS = ['ri', 'mu', 'tian', 'kou', 'niao', 'ma', 'mu2', 'wei', 'mo', 'he2', 'wu', 'jia'];" in data, \
    'r12 字源推演池漂移'
assert 'const MIX_PAT' in engine and "mode === 'evo'" in engine, 'r12 混合题型谱/evo 引擎缺失'
assert 'await wait(1900 * SPEED)' in main, '答对演出窗与 RIGHT_MS=1900 对账口径漂移'
assert 'pic_q3' in data and '"pic_q3"' in clips, 'r12 推演题面 clip 未注册/未注入'

# 家族契约 F/M1：nextHint 实算生成关预告+静态章末预告（禁字面取模）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, '家族契约 F：生成关预告须实算 genLevel(f+1).dch'
assert 'CHAPTERS[Math.floor(f / CH_LEN) + 1].hint' in main, '家族契约 M1：静态章末预告口径'
# 家族契约 A：dayEnd 预告传 nextHint(lim - 1)（含启动分支两处——r12 老批契约升级）
assert main.count('nextHint(lim - 1)') == 2, '家族契约 A：dayEnd 两处须传 nextHint(lim-1)'

# 硬性检查 2c：verify 独立副本素材（拆块后页内判别力）+ head 竖屏通道两段同步
assert 'V_LOOK = { m1: 4800, m2: 6200, m3: 6800, m4: 6200, evo: 8400 };' in verif, 'verify 缺时长模型独立副本'
assert "SPEC_PAIRS = [['ri', 'mu2']" in verif, 'verify 缺形近对独立副本'
assert "classList.toggle('port', portrait)" in verif, 'verify simView 缺 body.port 竖屏通道'
port_css = head.count('body.port #prompt-card.evo{max-width:96vw;min-height:140px;padding:10px 10px}')
media_css = head.count('  #prompt-card.evo{max-width:96vw;min-height:140px;padding:10px 10px}')
assert port_css == 1 and media_css == 1 and '@media (orientation:portrait)' in head, \
    'head 缺 body.port 等值段/竖屏段（evo 卡两段须同步）'
assert 'body.port .opt{width:118px;height:122px}' in head and '.opt{width:118px;height:122px}' in head, \
    'head 竖屏两段（@media 与 body.port）须等值同步'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('r12: 40-char lib / 19 near pairs / evo pool 12 / estMs n*345+600 / LEVEL_MIN_MS 40000 / '
      'verify 4th block / contract F+M1+A (lim-1 x2)')
