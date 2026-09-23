# -*- coding: utf-8 -*-
"""dressup 贴纸装扮 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch24/dressup/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch24/dressup/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（dru_* 9 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('dressup')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：dru_ 26 条（v1 6 + r10 新 3 + T46 阶段2 题面 17）+ core 3 条 = 29 条
# （SPEC-BATCH24 §8；manifest 为真值源；题面域=THEMES 6/BUDGET_Q 5/ANTI_Q 6 与 quizKey 对账）
DRU_KEYS = ['dru_tut_watch', 'dru_tut_turn', 'dru_hint', 'dru_right', 'dru_wrong', 'dru_free',
            'dru_budget_hint', 'dru_anti_hint', 'dru_anti_right']
T46_Q = ['dru_q_' + t for t in ('school', 'sports', 'nap', 'party', 'rain', 'winter')]
T46_QB = ['dru_qb_' + t for t in ('school', 'sports', 'nap', 'party', 'winter')]
T46_QA = ['dru_qa_' + t for t in ('school', 'sports', 'nap', 'party', 'rain', 'winter')]
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in DRU_KEYS + T46_Q + T46_QB + T46_QA + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 29, 'clips 条数 %d != 29（dru 9+17 + core 3）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b（r10）：estMs 家族定版字面（n*345+600，禁 +300 变体）+时长源模型在场（四处同步）
assert 'const estMs = n => n * 345 + 600;' in data, 'estMs 家族漂移（须 n*345+600 定版字面，data 定义）'
assert '+ 300' not in data, 'estMs 家族禁 +300 变体'
assert 'LEVEL_MIN_MS = 40000' in data and 'levelDurMs' in data and 'DECIDE_MS' in data, 'r10 时长模型源缺失（data）'
assert 'estMs 家族定版' in main, 'main 注释缺 estMs 家族定版提及（四处同步）'
assert 'ADV_MS = 3200' in data and 'TAP_MS = 430' in data and 'SW_MS = 900' in data, 'r10 窗常量缺失（data）'
# r10 三族引擎标记（kind 分流+满员即检+peel）
assert "q.kind === 'anti'" in engine and "q.kind === 'budget'" in engine and 'function engPeel' in engine, 'r10 三族引擎缺失'
assert 'units.duration' in verif and 'V_MIN = 40000' in verif, 'verify 缺 r10 时长独立副本单元'
assert "GEN_HINTS[genLevel(f + 1).dch - 1]" in main, 'nextHint 生成关未实算（契约 F）'

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
