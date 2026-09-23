# -*- coding: utf-8 -*-
"""hidden 隐藏朋友 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch22/hidden/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch22/hidden/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（hidden 四条 hid_* + 三条 core_*，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('hidden')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言（r20 SPEC-R20-HIDDEN §R6）：必备键精确在册（m4 钉名）——
# r20 新键已钉名：10 键全注入，manifest 37
HID_KEYS = ['hid_tut_watch', 'hid_tut_turn', 'hid_hint', 'hid_right', 'hid_ear',
            'hid_s_find', 'hid_s_he', 'hid_cnt_q', 'hid_cnt_retry', 'hid_mem_watch']
ANIMAL_IDS = ('bird', 'butterfly', 'frog', 'hedgehog', 'ladybug', 'squirrel')
T46_KEYS = ['hid_q_' + a for a in ANIMAL_IDS] + ['hid_an_' + a for a in ANIMAL_IDS] + \
           ['hid_w_' + a for a in ANIMAL_IDS] + ['hid_n_%d' % n for n in range(1, 7)]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in HID_KEYS + T46_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips >= 37, 'clips 条数 %d < 37（必备 hid 34 + core 3，m4 钉名后）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 3：游戏 JS 禁 Math.random（一律 seeded；core.js 的 sfx 噪声除外）
for name, s in [('data', data), ('engine', engine), ('main', main), ('verify', verif)]:
    assert 'Math.random' not in s, f'{name} 含 Math.random（违确定性铁律）'

html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# 硬性检查 4：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
