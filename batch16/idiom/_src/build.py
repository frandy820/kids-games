# -*- coding: utf-8 -*-
"""idiom 单文件拼接：_src/head.html + core.js(全文原样) + clips + 游戏 JS(3 块) + verify(独立第 4 块)
用法: python batch16/idiom/_src/build.py
r16 难度改造（2026-09-16，AUDIT-78）：库 30→80 按义类分章（五章各 16）+情境句填成语+
近义成语辨析干扰+CH_LEN 5→8（旧档迁移 IIFE）+STATIC 40 关+estMs 时长模型门禁+契约 F 实算+竖屏三件套。
语音 clip 已全部合成在场（idiom 250 条=core 共享 3+idm_ 句 7（教学反馈 5+题型指令 2）
+成语读音 idm_w_1..80+情境句 idm_ctx_1..80+释义 idm_def_1..80（T46 阶段2 keyless 尾段 clip 化）；
旧 idm_t_1..30+旧 5 句 games=[] 冻结不注入——wordprob r13 先例）：
注入失败必须 sys.exit(3)，禁降级空串构建。
script 块布局（家族纪律）：core(1) / clips(2) / data+engine+main(3) / verify 独立(4)
——verify 并入 script[2]=页内源码断言自匹配恒真（b31 教训）。"""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch16/idiom/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# 语音 clips 注入（250 条已合成在场；失败=构建失败退出码 3，不降级）
try:
    sys.path.insert(0, r'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('idiom')
except SystemExit:
    raise SystemExit(3)
except Exception as e:
    print('FATAL: idiom clips 注入失败:', e)
    sys.exit(3)
# 关键 clip 在场断言（250 条全量对账：core 3+idm_ 句 7+读音 idm_w_1..80+
# T46 阶段2 情境句 idm_ctx_1..80+释义 idm_def_1..80——keyless 尾段全量 clip 化）
MUST = ['core_chapter_end', 'core_day_end', 'core_rest',
        'idm_tut_watch2', 'idm_tut_turn2', 'idm_hint2', 'idm_right2', 'idm_wrong2',
        'idm_q_fill', 'idm_q_near'] + ['idm_w_%d' % i for i in range(1, 81)] + \
       ['idm_ctx_%d' % i for i in range(1, 81)] + ['idm_def_%d' % i for i in range(1, 81)]
for must in MUST:
    if ('"%s"' % must) not in clips:
        print('FATAL: idiom clips 注入不完整（缺 %s）' % must)
        sys.exit(3)
# 条数断言：恰 250 条（旧 idm_t_1..30+旧 5 句冻结不注入——verify_voice EXPECT 同口径）
n_audio = clips.count('data:audio/mpeg')
if n_audio != 250:
    print('FATAL: idiom clips 条数 %d != 250' % n_audio)
    sys.exit(3)

# 硬性检查 1：JS 内不得出现字面 </script>（会提前闭合标签）
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# 硬性检查 2：core.js 必须是最新契约版（防旧版混入）
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# ---- r16 静态断言（时长模型四层同步之一：build 字面层；断言全在循环体外——r13 教训） ----
# ① estMs 全字符口径（家族 b25 定版；源常量+注释实算+verify estN 副本+build 字面四方同步）
assert 'const estMs = s => s.length * 345 + 600;' in data, 'data 缺 estMs 全字符口径字面定义'
def _est(n):
    return n * 345 + 600
# 指令/文案实长锚：fill 指令 10 字/near 指令 13 字（含全角逗号）/right2·wrong2 7 字/最长读音 5 字/
# 释义上界 18 字/最长 ctx 28 字（全字符口径——r15 m1 坑：注释数字必须实算 345n+600 形）
assert len('空格里该填哪个成语呀') == 10 and _est(10) == 4050, 'fill 指令 estMs 验算失败'
assert len('这两个成语很像，哪个更合适') == 13 and _est(13) == 5085, 'near 指令 estMs 验算失败'
assert len('选对啦，真厉害') == 7 and _est(7) == 3015, 'right2 estMs 验算失败'
assert len('鲤鱼跳龙门') == 5 and _est(5) == 2325, '最长读音 5 字 estMs 验算失败'
assert _est(18) == 6810 and _est(28) == 10260, '释义/ctx 上界 estMs 验算失败'
assert 3015 + 150 + 3015 + 300 == 6480, '错链豁免窗算式验算失败'
for tok in ('4050', '5085', '3015', '2325', '6810', '10260', '6480'):
    assert tok in data, 'data 注释缺 estMs 实算数字 %s（r15 m1 坑）' % tok
# ② DECIDE 双型/ADV/LEVEL_MIN/MIN_EXACT/WRONG_CHAIN 字面（7-8 岁认知决策推算；verify SPEC_* 对账）
assert 'const DECIDE_MS = { fill: 22000, near: 18000 };' in data, \
    'data 缺 DECIDE_MS r16 双型定版字面'
assert 'const ADV_MS = 880;' in data, 'data 缺 ADV_MS 880 字面'
assert 'const LEVEL_MIN_MS = 40000;' in data, 'data 缺 LEVEL_MIN_MS 40000 字面'
assert 'const MIN_EXACT = 175040;' in data, 'data 缺 MIN_EXACT 175040 字面（6*22880+2*18880）'
assert 'const WRONG_CHAIN_MS = 6480;' in data, 'data 缺 WRONG_CHAIN_MS 6480 字面'
assert 'const ENTER_MS = 400;' in data and 'const SEG_GAP_MS = 150;' in data, \
    'data 缺 ENTER/SEG_GAP 字面'
# ③ 模型函数链在场（voice0Ms/quizDurMs/levelDurMs/confirmChainMs/confirmTailMs——
#    verify ⑩⑬ parity 对账目标）
for tok in ('const voice0Ms = q => ENTER_MS + estMs(Q_INSTR[q.kind])',
            'const quizDurMs = q => Math.max(voice0Ms(q), DECIDE_MS[q.kind]) + ADV_MS;',
            'const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);',
            'const confirmChainMs = q =>',
            'const confirmTailMs = q =>'):
    assert tok in data, 'data 缺时长模型函数链: %s' % tok[:44]
# ④ 章表契约 F：CHAPTERS[i].hint=第 i+1 章预告（字面锚防回漂）+GEN_HINTS 5 条
for ch, nm, ht in [(1, '动作神态', '数字藏成语里等你猜'),
                   (2, '数字成语', '小动物们要讲故事啦'),
                   (3, '动物故事', '大自然里藏着大智慧'),
                   (4, '自然气象', '故事里面有大道理'),
                   (5, '道理启示', '新一轮成语填空开始啦')]:
    assert "name: '%s', hint: '%s' }" % (nm, ht) in data, \
        'CHAPTERS[%d] 契约字面锚缺失（hint 须为第 %d 章预告）' % (ch, ch + 1)
_gh = data.split('const GEN_HINTS = [')[1].split('];')[0]
assert len([x for x in _gh.replace("'", '').replace(' ', '').split(',') if x]) == 5, \
    'GEN_HINTS != 5 条（r16 五章）'
# ⑤ 家族 F 生成关契约：nextHint 实算 genLevel(f+1).dch，禁章序取模推进形态（第三犯后定版；
#   禁式断言连带注释措辞——源内注释不得出现禁式字面，r14 坑①）
assert 'GEN_HINTS[genLevel(f + 1).dch - 1]' in main, 'nextHint 生成关须实算 genLevel(f+1).dch'
assert 'GEN_HINTS[(ci + 1) %' not in main and 'GEN_HINTS[(ci+1)%' not in main, \
    '禁 GEN_HINTS 取模推进形态（含注释——r14 坑①）'
# ⑥ 契约 K 救援面板守卫（r13 grid/poemfill 双犯后定版）逐字+命名函数
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    '救援 interval 缺面板守卫（契约 K）'
assert 'function rescueTick()' in main, '救援须命名函数 rescueTick（契约 K 源码级）'
# ⑦ r16 结构常量：CH_LEN 5→8（配迁移 IIFE）/STATIC 40/N_CH 5/近义对键源
assert 'const CH_LEN = 8;' in data, 'data 缺 CH_LEN = 8（r16 5→8）'
assert 'const STATIC_LEVELS = 40;' in data, 'data 缺 STATIC_LEVELS = 40（r16 5 章×8 关）'
assert 'const N_CH = 5;' in data, 'data 缺 N_CH = 5（r16 4→5 章）'
# ⑧ 旧档基迁移 IIFE（r15 M3 坑 → r16 沿用 column/spellen 范式）：矛盾态判定=有跨章首关
#    C-0 而缺前章第 6 键 (C-1)-5（旧 5 基残留）→ 一次性整档重置
assert "localStorage.getItem('kidsgame_idiom')" in main, 'main 缺旧档读取（迁移 IIFE）'
assert "lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined" in main, \
    'main 缺旧基残留矛盾态判定（迁移 IIFE r15 M3）'
assert "localStorage.removeItem('kidsgame_idiom')" in main, 'main 缺整档重置（迁移 IIFE）'
# ⑨ r16 玩法素材：IDIOMS 80 条/近义对/引擎 engTapCard+structOk/钩子 IDM/情境卡渲染
for tok in ('const IDIOMS = [', 'const Q_INSTR = {', 'near:'):
    assert tok in data, 'data 缺 r16 玩法素材: %s' % tok
assert data.count('{ i: ') == 80, 'IDIOMS 库 != 80 条'
for tok in ("kind === 'near'", "q.kind === 'near' ? 2 : 4", 'function genLevel(flat) {',
            'function engTapCard(L, i) {',
            'function structOk(q, dch) {', 'const nearPairsOf = ch =>'):
    assert tok in engine, 'engine 缺 r16 引擎素材: %s' % tok
for tok in ('function renderQcard(q) {', 'function fillBlank(q) {',
            'window.IDM = {', 'nextHintOf(flat)'):
    assert tok in main, 'main 缺 r16 主逻辑素材: %s' % tok
# ⑩ verify 独立块素材：estN/SPEC 常量族/genLevelInd 独立副本/durInd 时长副本/竖屏 simView
for tok in ('estN', 'SPEC_DECIDE', 'SPEC_INSTR', 'genLevelInd', 'durInd', 'voice0Ind',
            'MIN_EXACT_V = 175040', 'WRONG_CHAIN_V = 6480'):
    assert tok in verif, 'verify 缺 r16 分源复算素材: %s' % tok
assert "classList.add('port')" in verif and 'isPortView' in verif, \
    'verify 缺竖屏 body.port 模拟通道锚（simView）'
assert 'dMin === MIN_EXACT_V' in verif, 'verify 缺 modeled 最低值精确断言（防回漂）'
# ⑪ 竖屏三件套：head.html @media 与 body.port 双通道逐条等值（两段 /*PORT-CLS*/ 标记对账——
#     真对账非在场断言：port 段去 'body.port ' 前缀后与 @media 段逐行全等）
assert '@media (orientation:portrait){' in head and '/*PORT-CLS*/' in head, \
    'head 缺竖屏双通道（@media 与 body.port 标记段）'
_i = head.index('@media (orientation:portrait){')
_j = head.index('\n}', _i)
_media = [ln.strip() for ln in head[_i + len('@media (orientation:portrait){'): _j].splitlines()
          if ln.strip()]
_k = head.index('/*PORT-CLS*/') + len('/*PORT-CLS*/')
_l = head.index('/*PORT-CLS-END*/')
_port = [ln.strip() for ln in head[_k:_l].splitlines() if ln.strip()]
assert len(_media) >= 10 and [ln.replace('body.port ', '') for ln in _port] == _media, \
    '竖屏双通道两段不等值（@media %d 行 vs port %d 行）' % (len(_media), len(_port))
assert 'body.port #q-spk{width:64px' in head, 'head 缺竖屏判别锚（喇叭 64）'
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

# 硬性检查 4：script 块数=4（verify 独立第 4 块——家族纪律；verify ⑨ nScripts 同口径）
n_scripts = html.count('<script>')
assert n_scripts == 4, f'script 块数 {n_scripts} != 4（verify 须独立成块）'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
