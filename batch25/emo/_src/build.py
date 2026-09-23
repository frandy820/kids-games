# -*- coding: utf-8 -*-
"""emo 情绪脸谱 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch25/emo/_src/build.py"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch25/emo/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')
# 语音 clips 注入（emo_ 59 条 + core_* 3 条，manifest 对账）
# 注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('emo')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
# clips 注入断言：emo_ 59 条 + core 3 条 = 62 条（SPEC-BATCH25 §2/§4 + T46 阶段2 emo_s_*/emo_cf_* 48）
EMO_KEYS = ['emo_tut_watch', 'emo_tut_turn', 'emo_hint', 'emo_right', 'emo_wrong',
            'emo_w_happy', 'emo_w_sad', 'emo_w_angry', 'emo_w_scared', 'emo_w_surprised', 'emo_w_worried',
            'emo_rev_q']   # r35 审查 m-1：注册后补进逐键断言（防 manifest 错名顶替键）
CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest']
for k in EMO_KEYS + CORE_KEYS:
    assert '"%s"' % k in clips, 'clips 缺少 %s' % k
n_clips = clips.count('data:audio/mpeg;base64,')
assert n_clips == 63, 'clips 条数 %d != 63（emo 60 + core 3；主线注册 emo_rev_q 后，SPEC-R35 §R7）' % n_clips

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# 硬性检查 2b：游戏侧契约关键符号在场（防拼错文件/漏文件）
assert "KIDS.init({ game: 'emo'" in main, 'main 缺 KIDS.init emo（存档键 kidsgame_emo）'
assert 'window.EM =' in main, 'main 缺 EM 钩子'
assert '__emDemoR' in main, 'main 缺教学演示实证 __emDemoR'
# 家族契约 A：启动与 winFlow 两处 dayEnd 都传 lim-1
assert main.count('nextHint(lim - 1)') == 2, 'dayEnd nextHint(lim-1) 必须两处（启动+winFlow），实得 %d' % main.count('nextHint(lim - 1)')
# 家族 G/H：判对链窗与错窗常量在场（data 窗口表；6800=审查M2；1000=b16 定案）
assert 'RIGHT_CHAIN_MS = 6800' in data, 'data 缺判对链窗 6800（审查M2：确认句TTS 12-15字实测4281-4825）'
assert 'WRONG_WIN_MS = 1000' in data, 'data 缺错选防重入窗常量（b16）'
# 家族 B：救援双锚分离（lastDir/lastAct 独立）
assert 'await wait(700)' in main, 'main winFlow celebrate 后缺补窗 700（审查M1：emo_right 2976+300）'
assert 'lastDir = Date.now()' in main and 'idle > 14000 && Date.now() - lastDir > 14000' in main, 'main 缺 14s 方向级独立节流锚（家族 B）'
# r35 契约（SPEC-R35-EMO）：近对三对/硬对域/rev 键/门族
assert "happy: 'surprised', surprised: 'happy'" in data, 'data NEAR 缺第三对 happy<->surprised（r35 全域恒在律）'
assert 'HARD4' in data and 'HARD4' in engine, 'data/engine 缺 HARD4（ch3 目标域）'
assert "'emo_rev_q'" in data, 'data VOICE 缺 rev 题面链键 emo_rev_q（TODO 注册前 TTS 兜底）'
assert 'VOICE.rev.key' in main, 'main rev 题面链未走 VOICE.rev（emo_rev_q）'
assert 'emo_s_' in main, 'main 缺 rev 选对链尾 emo_s_（在册情境句）'
assert "mode: q.mode" in main, 'main EM.quiz 缺 mode 字段（r35 两向契约）'
# 门族一致性（r34 F1 教训）：hearBtn 四门对齐
_hear_seg = main.split('hearBtn.addEventListener')[1][:400] if 'hearBtn.addEventListener' in main else ''
assert 'state.locked || state.demo || state.won' in _hear_seg, 'hearBtn 门缺四件（locked/demo/won——r35 门族对齐）'

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
