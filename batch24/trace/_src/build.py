# -*- coding: utf-8 -*-
"""trace 描红数字 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch24/trace/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch24/trace/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（tra_* 25 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('trace')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：tra_ 25 条（v1 15 + r5 新 10） + core 3 条 = 28 条（SPEC-BATCH24 §2/§7 r5）
TRA_KEYS = ['tra_tut_watch', 'tra_tut_turn', 'tra_hint', 'tra_right', 'tra_wrong'] + \
           ['tra_n_%d' % i for i in range(1, 11)] + \
           ['tra_hint2', 'tra_l_q', 'tra_m_q', 'tra_w_pick', 'tra_w_mir',
            'tra_w_wait', 'tra_w_down', 'tra_w_right', 'tra_w_up', 'tra_w_left']
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in TRA_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 28, 'clips 条数 %d != 28（tra 25 + core 3）' % n_clips

# 窗常量四处同步断言（game-data WIN + game-main 注释 + game-verify + 此处字面 assert）
for lit in ['WRONG: 1000', 'PICK_RIGHT: 600', 'DONE: 4100']:
    assert lit in data, 'game-data.js WIN 窗常量缺失/漂移: %s' % lit
for lit in ['WIN.WRONG', 'WIN.PICK_RIGHT', 'WIN.DONE']:
    assert lit in main, 'game-main.js 未走 WIN 常量: %s' % lit
    assert lit in verif, 'game-verify.js 未断言 WIN 常量: %s' % lit

# r5 审查 m-1（家族 F 静态护栏）：生成关预告实算+禁式字面；P1 镜像 CSS 选择器防回归
assert 'genLevel(f + 1).dch - 1' in main, '家族 F：生成关预告须实算 genLevel(f+1).dch'
assert '(ci + 1) % 4' not in main, '家族 F 禁式字面（habitat r4 M-1 同型）'
assert '.g.v-m{transform:scaleX(-1)}' in head, 'P1 防回归：镜像变体选择器须 .g.v-*'

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
