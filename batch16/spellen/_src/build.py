# -*- coding: utf-8 -*-
"""spellen 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS(3 块) + verify(独立第 4 块)
用法: python batch16/spellen/_src/build.py
r16 难度改造（2026-09-16，AUDIT-78）：词库 60 词三题型（listen/missing/meaning）+ b/d 同形干扰
+ CH_LEN 5→8（旧档迁移 IIFE）+ STATIC 20→40 + estMs 时长模型门禁 + 契约 F 实算 + 竖屏三件套。
语音 clip 已全部合成在场（spellen 191 条=sp_ 中文 8+sp_word_* 英文 60+sp_mean_* 中文 60
+sp_l_* 字母名串 60（T46 拆段）+core 共享 3，由主会话注入 manifest games:['spellen']）：
注入失败必须 sys.exit(3)，禁降级空串构建。
script 块布局（家族纪律）：core(1) / clips(2) / data+engine+main(3) / verify 独立(4)
——verify 并入 script[3]=页内源码断言自匹配恒真（b31 教训）。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch16/spellen/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（191 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('spellen')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: spellen clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言：8 条 sp 中文句+首尾三词英文+首尾三词释义（全量由 ?verify=1 clipOk 复核）
for must in ('sp_hint', 'sp_tut_watch', 'sp_tut_turn', 'sp_right', 'sp_wrong', 'sp_first',
             'sp_missing', 'sp_mean',
             'sp_word_cat', 'sp_word_pencil', 'sp_word_garden',
             'sp_mean_cat', 'sp_mean_pencil', 'sp_mean_garden',
             'sp_l_cat', 'sp_l_pencil', 'sp_l_garden'):
    if ('"%s"' % must) not in clips:
        print('FATAL: spellen clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言：恰 191 条（core 3+sp 中文 8+sp_word 60+sp_mean 60+sp_l 60——T46 拆段口径）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 191:
    print('FATAL: spellen clips 条数 %d != 191' % n_audio)
    sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# ---- r16 静态断言（时长模型四层同步之一：build 字面层；断言全在循环体外——r13 教训） ----
# ① estMs 全字符口径（家族 b25 定版；verify estMsV 断言+源常量+注释四方同步）
assert 'const estMs = s => s.length * 345 + 600;' in data, 'data 缺 estMs 全字符口径字面定义'
def _est(n):
    return n * 345 + 600
# ADV_QUIZ 派生链验算：'拼对啦，你真棒'=7 字符（含全角逗号，全字符口径）→ 3015
assert len('拼对啦，你真棒') == 7 and _est(7) == 3015, 'estMs 静态验算失败'
assert "const ADV_QUIZ = estMs('拼对啦，你真棒');" in data, 'data 缺 ADV_QUIZ=estMs(right) 派生字面'
# 注释内 estMs 验算数字抽查（r15 m1 坑：注释数字必须实算 345n+600 形）
# '再听一听这个单词'=8 → 3360；'看一看，少了哪个字母'=10 → 4050；'看一看中文，拼一拼单词'=11 → 4395
assert len('再听一听这个单词') == 8 and _est(8) == 3360, 'listen 开场句 estMs 验算失败'
assert len('看一看，少了哪个字母') == 10 and _est(10) == 4050, 'missing 开场句 estMs 验算失败'
assert len('看一看中文，拼一拼单词') == 11 and _est(11) == 4395, 'meaning 开场句 estMs 验算失败'
for tok in ('3360', '4050', '4395', '3015'):
    assert tok in data, 'data 注释缺 estMs 实算数字 %s（r15 m1 坑）' % tok
# ② DECIDE_MS 三型/ADV_STEP/LEVEL_MIN_MS/WORD_SAY_MS 字面（7-8 岁三题型认知推算；verify V_DECIDE 对账）
assert 'const DECIDE_MS = { listen: 2600, missing: 5500, meaning: 3600 };' in data, \
    'data 缺 DECIDE_MS r16 三型定版字面'
assert 'const ADV_STEP = 600;' in data, 'data 缺 ADV_STEP 600 字面'
assert 'const LEVEL_MIN_MS = 40000;' in data, 'data 缺 LEVEL_MIN_MS 40000 字面'
assert 'const WORD_SAY_MS = 1200;' in data, 'data 缺 WORD_SAY_MS 1200 字面'
assert 'const ENTER_MS = 400;' in data and 'const STAGE_MS = 400;' in data, 'data 缺 ENTER/STAGE 字面'
# ③ 模型函数链在场（faceMs/nSteps/quizDurMs/levelDurMs/modeled——verify ⑪ parity 对账目标）
for tok in ('const faceMs = q => q.type === \'listen\'',
            'const nSteps = q => q.type === \'missing\' ? q.blanks.length : q.word.length;',
            'const quizDurMs = q => faceMs(q) +',
            'const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);',
            'const modeled = flat => levelDurMs(genLevel(flat | 0));'):
    assert tok in data, 'data 缺时长模型函数链: %s' % tok[:44]
# ④ 章表契约 F：CHAPTERS[i].hint=第 i+1 章预告（字面锚防回漂）+GEN_HINTS 4 条
assert "1: { name: '小小单词',   hint: '长元音的单词来啦' }" in data, \
    'CHAPTERS[1].hint 须为第 2 章预告（契约 F 防回漂锚）'
assert "2: { name: '长音单词',   hint: '两个字母一起读的单词' }" in data, 'CHAPTERS[2] 契约字面锚缺失'
assert "3: { name: '字母搭伙',   hint: '两个音节的单词来啦' }" in data, 'CHAPTERS[3] 契约字面锚缺失'
assert "4: { name: '双音节词',   hint: '新一轮拼写挑战' }" in data, 'CHAPTERS[4] 契约字面锚缺失'
_gh = data.split("const GEN_HINTS = [")[1].split('];')[0]
assert len([x for x in _gh.replace("'", '').replace(' ', '').split(',') if x]) == 4, 'GEN_HINTS != 4 条'
# ⑤ 家族 F 生成关契约：nextHint 实算 genLevel(f+1).dch，禁章序取模推进形态（第三犯后定版；
#   禁式断言连带注释措辞——源内注释不得出现禁式字面，r14 坑①）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
assert 'GEN_HINTS[(ci + 1) % 4]' not in main and 'GEN_HINTS[(ci+1)%4]' not in main, \
    '禁 GEN_HINTS 取模推进形态（含注释——r14 坑①）'
# ⑥ 契约 K 救援面板守卫（r13 grid/poemfill 双犯后定版）逐字
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    '救援 interval 缺面板守卫（契约 K）'
# ⑦ r16 结构常量：CH_LEN 5→8（配迁移 IIFE）/STATIC 20→40
assert 'const CH_LEN = 8;' in data, 'data 缺 CH_LEN = 8（r16 5→8）'
assert 'const STATIC_LEVELS = 40;' in data, 'data 缺 STATIC_LEVELS = 40（r16 20→40）'
# ⑧ 旧档基迁移 IIFE（r15 M3 坑 → r16 沿用 column 范式）：矛盾态判定=有跨章首关 C-0 而缺前章第 6 键
assert "localStorage.getItem('kidsgame_spellen')" in main, 'main 缺旧档读取（迁移 IIFE）'
assert "lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined" in main, \
    'main 缺旧基残留矛盾态判定（迁移 IIFE r15 M3）'
assert "localStorage.removeItem('kidsgame_spellen')" in main, 'main 缺整档重置（迁移 IIFE）'
# ⑨ r16 三题型素材：TYPE_MIX 配比/引擎 engTapOption/钩子 tapOption/释义卡/词库 60
for tok in ("const TYPE_MIX = {", 'const WORDS60 = {'):
    assert tok in data, 'data 缺 r16 三题型素材: %s' % tok[:36]
for tok in ("['listen', 'missing', 'meaning'].forEach", 'function engTapOption(L, i) {',
            "if (q.type === 'missing') return null;", 'const engStars = L =>'):
    assert tok in engine, 'engine 缺 r16 三题型素材: %s' % tok[:44]
for tok in ('tapOption(i) { return uiTapOption(i); }', "gameEl.classList.toggle('q-meaning'",
            "meanCardEl.textContent = MEANS[q.word]", 'CH_LVS = [0, 1, 2, 3, 4, 5, 6, 7]'):
    assert tok in main, 'main 缺 r16 三题型素材: %s' % tok[:44]
assert 'const bdPairOf = word =>' in data, 'data 缺 b/d 同形翻转对源（AUDIT-78 ④）'
assert "act: 'opt'" in engine and "t.act === 'opt'" in main, 'engine/main 缺 missing 救援 opt 分支（构造/消费）'
# ⑩ verify 独立块素材：estMsV/V_DECIDE/durUnitOk/REF_WORDS60/REF_MEANS/REF_TYPE_MIX/portStyle
assert 'estMsV' in verif and 'V_DECIDE' in verif and 'durUnitOk' in verif, \
    'verify 缺 r16 duration 单元素材'
assert 'REF_WORDS60' in verif and 'REF_MEANS' in verif and 'REF_TYPE_MIX' in verif, \
    'verify 缺 r16 分源复算素材（60 词/释义/题型配比）'
assert 'dMin === 142995' in verif, 'verify 缺 80 关 modeled 最低值精确断言（防回漂）'
assert 'portStyle' in verif and "classList.toggle('port'" in verif, 'verify 缺竖屏 body.port 通道锚'
assert 'nClips === 191' in verif, 'verify 缺 191 条 clip 对账断言'
# ⑪ 竖屏三件套：head.html @media 与 body.port 双通道逐条等值（判别锚=喇叭 104/96）
assert '@media (orientation:portrait){' in head and 'body.port #speaker-btn{width:96px' in head, \
    'head 缺竖屏双通道（@media 与 body.port 等值）'

# ⑪b 竖屏逐行对账（r16 审查 T-m2/S-m2 补齐，idiom build 同款）：port 段去前缀后与 @media 段逐行全等
assert '/*PORT-CLS*/' in head, 'head 缺 PORT-CLS 标记段'
_i = head.index('@media (orientation:portrait){')
_j = head.index('\n}', _i)
_media = [ln.strip() for ln in head[_i + len('@media (orientation:portrait){'): _j].splitlines() if ln.strip()]
_k = head.index('/*PORT-CLS*/') + len('/*PORT-CLS*/')
_l = head.index('/*PORT-CLS-END*/')
_port = [ln.strip() for ln in head[_k:_l].splitlines() if ln.strip()]
assert len(_media) >= 10 and [ln.replace('body.port ', '') for ln in _port] == _media, \
    '竖屏双通道两段不等值（@media %d 行 vs port %d 行）' % (len(_media), len(_port))

assert '#mean-card' in head and '.cell.blank' in head and '.cell.given' in head, \
    'head 缺 r16 题型样式（释义卡/缺位格/可见格）'
# ⑫ _selftest P1b 在场（硬契约：已有 _selftest 须保 P1b 真竖轮）
_selftest = (ROOT / '_selftest.py').read_text(encoding='utf-8')
assert 'P1b' in _selftest and '800' in _selftest and '1180' in _selftest, '_selftest 缺 P1b 真竖 800×1180 轮'

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

# 硬性检查 4：script 块数=4（verify 独立第 4 块——家族纪律）
n_scripts = html.count('<script>')
assert n_scripts == 4, f'script 块数 {n_scripts} != 4（verify 须独立成块）'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
