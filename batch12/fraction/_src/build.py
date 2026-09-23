# -*- coding: utf-8 -*-
"""fraction 分数披萨 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch12/fraction/_src/build.py
r15 难度改造（2026-09-16，AUDIT-78:78）：五章×8 题（ch2/ch4 混 read）+ ch5 一样大章（eq 等值+cmp 同分母）
+cut 4 选 1（非平均切干扰）+时长模型门禁（crd r12 范式）+竖屏三件套（@media+body.port 双通道）。
语音 clip 18 条 fra_（既有 17 一字不改 + r15 新 fra_q_eq）由 inject_clips 注入 manifest games:['fraction']；
注入失败禁静默降级（缺 clip=残缺交付，必须 sys.exit(3) 暴露）。
script 块布局（家族纪律，r15 对齐）：core(1) / clips(2) / data+engine+main(3) / verify 独立(4)。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch12/fraction/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（fra_ 18 条 = 既有 17 + r15 新 fra_q_eq；manifest 对账）
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('fraction')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200]); sys.exit(3)
assert 'data:audio' in clips, 'clips 为空：注入被静默架空'
FRA_MUST = ('fra_tut_watch', 'fra_tut_turn', 'fra_hint', 'fra_q_cut', 'fra_q_cut2',
            'fra_q_read', 'fra_q_cmp', 'fra_q_eq', 'fra_f_1_2', 'fra_f_1_3', 'fra_f_1_4',
            'fra_f_2_3', 'fra_f_2_4', 'fra_f_3_4', 'fra_num_2', 'fra_num_3', 'fra_num_4',
            'fra_wrong')
for key in FRA_MUST:
    assert ('"%s"' % key) in clips, '缺 clip: %s' % key
n_audio = clips.count('data:audio/mpeg')
assert n_audio == 21, 'clips 条数 %d != 21（fra 18+core 3）' % n_audio

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# ---- r15 静态断言（断言全在循环体外——r13 教训；r14 教训：禁式断言已核对源注释措辞无禁戒字面） ----
# ① estMs 全字符口径（b25 定版；verify estMsV 断言+源常量+注释四方同步）
assert 'const estMs = s => s.length * 345 + 600;' in data, 'data 缺 estMs 全字符口径字面定义'
def _est(n):
    return n * 345 + 600
# estMs 静态验算（r15 文案字符数：全角标点计入——全字符口径）
assert len('看一看，每份一样大') == 9 and _est(9) == 3705, 'estMs 开场链句验算失败'
assert len('哪一块和它一样大') == 8 and _est(8) == 3360, 'estMs eq 题面句验算失败'
assert len('哪一个平均分成了') == 8 and len('涂色部分是几分之几') == 9 and len('哪一块大') == 4, 'estMs 题面句字符数验算失败'
assert 'const OPEN_MS = estMs(\'看一看，每份一样大\') + 2000;' in data, 'data 缺 OPEN_MS 派生字面'
# ② r15 时长模型常量（verify V_DECIDE/V_VOICE 对账；prior_check.py 验算 dMin=72265@flat24）
assert 'const DECIDE_MS = { cut: 8500, read: 7000, cmp: 5500, eq: 7500 };' in data, \
    'data 缺 DECIDE_MS r15 四题型定版字面'
assert 'const ADV_BASE = 620;' in data and 'const ADV_WORD = 1450;' in data, 'data 缺 ADV 常量字面'
assert 'const LEVEL_MIN_MS = 40000;' in data, 'data 缺 LEVEL_MIN_MS 40000 字面'
for tok in ('const quizDurMs = q => Math.max(VOICE_MS[q.kind], DECIDE_MS[q.kind]) + ADV_BASE + (q.kind !== \'cut\' ? ADV_WORD : 0);',
            'const levelDurMs = L => OPEN_MS + L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);',
            'const modeled = flat => levelDurMs(genLevel(flat | 0));'):
    assert tok in data, 'data 缺时长模型函数链: %s' % tok[:44]
# ③ r15 结构常量：8 题/关·40 静态关·5 章·LVS 章内 lv 表
for tok in ('const CH_LEN = 8;', 'const STATIC_LEVELS = 40;', 'const N_CHAPTERS = 5;',
            'const LVS = [0, 1, 2, 3, 4, 5, 6, 7];'):
    assert tok in data, 'data 缺 r15 结构常量: %s' % tok
# ④ 章表契约 F：CHAPTERS[i].hint=第 i+1 章预告（内容字面锚防回漂）+GEN_HINTS 5 条
for lit in ("name: '对半切',   hint: '接下来，三份四份的披萨，还要认一认'",
            "name: '切三切四', hint: '涂了颜色的披萨，要认几分之几啦'",
            "name: '几分之几', hint: '两块披萨，比一比哪一块大'",
            "name: '比大小',   hint: '还有一样大的披萨块，来找一找'",
            "name: '一样大',   hint: '新一轮分数披萨挑战'"):
    assert lit in data, 'CHAPTERS 契约内容锚缺失: %s' % lit[:24]
_gh = data.split('const GEN_HINTS = [')[1].split('];')[0]
assert len([x for x in _gh.replace("'", '').replace(' ', '').split(',') if x]) == 5, 'GEN_HINTS != 5 条'
# ⑤ 家族 F 生成关契约：nextHint 实算 genLevel(f+1).dch（r15 五章），禁章序取模推进形态（两种空格×4/5 两种基数全拦）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
for bad in ('GEN_HINTS[(ci + 1) % 4]', 'GEN_HINTS[(ci+1)%4]', 'GEN_HINTS[(ci + 1) % 5]', 'GEN_HINTS[(ci+1)%5]',
            'GEN_HINTS[ci % 4]', 'GEN_HINTS[ci%4]', 'GEN_HINTS[ci % 5]', 'GEN_HINTS[ci%5]'):
    assert bad not in main, '禁 GEN_HINTS 取模推进形态: %s' % bad
# ⑥ 契约 K 救援面板守卫（r13 grid/poemfill 双犯后定版；fraction r15 补装）
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    '救援 interval 缺面板守卫（契约 K）'
# ⑦ r15 引擎素材：5 份不均模板（非平均切干扰）+同分母对池+eq 干扰域+五章 kindOf+diffOfCh 五章循环
assert 'const UN_TPL = { 2: [0.63, 0.37], 3: [0.46, 0.27, 0.27], 4: [0.33, 0.185, 0.25, 0.235], 5: [0.30, 0.16, 0.22, 0.16, 0.16] };' in engine, \
    'engine 缺 UN_TPL r15 五档字面'
_UN = {2: [0.63, 0.37], 3: [0.46, 0.27, 0.27], 4: [0.33, 0.185, 0.25, 0.235], 5: [0.30, 0.16, 0.22, 0.16, 0.16]}
for n_, tpl_ in _UN.items():   # 不均模板微扰最坏角宽比 ≥1.5（±0.014，归一化不改变比值——prior 验算同式）
    worst = (max(tpl_) - 0.014) / (min(tpl_) + 0.014)
    assert worst >= 1.5, 'UN_TPL[%d] 微扰最坏比 %.3f < 1.5（视觉可判失效）' % (n_, worst)
assert 'const CMP2_SET = [[1, 4, 3, 4], [1, 4, 2, 4], [2, 4, 3, 4], [1, 3, 2, 3]];' in engine, 'engine 缺 CMP2_SET 同分母池'
assert 'const EQ_DIST = [[1, 3], [1, 4], [2, 3], [3, 4]];' in engine, 'engine 缺 EQ_DIST 等值干扰域'
assert "const diffOfCh = ch => (ch - 1) % N_CHAPTERS + 1;" in engine, 'engine 缺 diffOfCh 五章循环字面'
assert "dch === 4 ? (qi % 2 === 0 ? 'cmp' : 'read') :" in engine, 'engine 缺 r15 ch4 混 read kindOf 字面'
assert "const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, N_CHAPTERS);" in engine, 'engine 缺生成关随机章参数字面'
# ⑧ r15 题面/钩子素材：eq 题面 clip 队列 + ref 钩子 + eq 题面渲染（pwrap 参照块）
assert "'fra_q_cmp' : 'fra_q_eq'" in main, 'main 缺 eq 题面 clip 分流字面'
assert 'ref: q.kind === \'eq\' ? { k: q.rk, n: q.rn } : null' in main, 'main 缺 eq ref 钩子字面'
assert "wedgeSvg(q.rk, q.rn)" in main, 'main 缺 eq 参照块渲染字面'
# ⑨ 竖屏三件套：head @media 与 body.port 双通道（逐条等值——锚通道 B 在场+两通道条数一致）
assert 'body.port #board{gap:16px}' in head, 'head 缺 body.port 竖屏通道 B'
assert head.count('body.port') >= 12, 'head body.port 镜像条目不足（与 @media 逐条等值）'
assert '@media (orientation:portrait)' in head, 'head 缺 @media 竖屏通道 A'
# ⑩ verify 独立块素材：estMsV/V_DECIDE/durUnitOk 在场+80 关 modeled 最低值 72265 精确断言（防回漂）
assert 'estMsV' in verif and 'V_DECIDE' in verif and 'durUnitOk' in verif, \
    'verify 缺 r15 duration 单元素材'
assert 'dMin === 72265' in verif, 'verify 缺 80 关 modeled 最低值 72265 精确断言（防回漂）'
assert "document.body.classList.toggle('port', !!port)" in verif, 'verify simView 缺竖屏类通道'
assert "classList.remove('pop')" in verif, 'verify 量测缺清 .pop（card-in transform 陷阱）'
assert 'fra_q_eq' in verif, 'verify 缺 r15 eq clip 对账'

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

# 硬性检查 4：script 块数=4（verify 独立第 4 块——家族纪律，r15 对齐）
n_scripts = html.count('<script>')
assert n_scripts == 4, f'script 块数 {n_scripts} != 4（verify 须独立成块）'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
