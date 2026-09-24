# -*- coding: utf-8 -*-
"""zilearn game-data.js 生成器（字表转写：chars.json 定稿 → JS 内嵌，零手抄）
产物 game-data.js 的保真由 build.py 的双向对账门禁把关（node 提取 JS 表 ↔ json 深比较全等）。
源输入：
  chars.json                —— 150 字定稿（output/kids-games-zilearn 构建产物快照）
  _r_zi_picto_extract.json  —— batch8/picto PICTO 表按字面映射复制的 26 字 SVG（含 8 字 ev 古形）
用法: python _r_zi_gen_data.py  （在 _src/ 下执行）
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SRC = json.loads((HERE / 'chars.json').read_text(encoding='utf-8'))
PIC = json.loads(pathlib.Path('F:/claudecode/output/kids-games-zilearn/_r_zi_picto_extract.json').read_text(encoding='utf-8'))

J = lambda v: json.dumps(v, ensure_ascii=False)

# ---------- 构建期不变量（fail fast——数据定稿自检的工程侧镜像） ----------
chars, chapters, genpool, sentences = SRC['chars'], SRC['chapters'], SRC['genPool'], SRC['sentences']
assert SRC['meta']['total'] == 150 and SRC['meta']['staticCount'] == 100
assert len(chars) == 150 and len(genpool) == 50 and len(sentences) == 20
assert set(genpool) <= set(chars), 'genPool 必须落在 CHARS 内'
static_chars = [c for c in chars if c not in set(genpool)]
assert len(static_chars) == 100
pys = [v['py'] for v in chars.values()]
assert len(set(pys)) == 150 and all(p.isascii() for p in pys), 'py 冲突或非 ASCII'
pic_chars = [c for c, v in chars.items() if v.get('pic')]
glyph_chars = [c for c, v in chars.items() if v.get('glyph')]
assert set(pic_chars) == set(glyph_chars) == set(PIC), 'pic/glyph/PICTO 三表必须同键（%d 字）' % len(pic_chars)
for c, v in chars.items():
    assert 2 <= len(v['distract']) <= 3, '%s distract 数越界' % c
    assert all(d[0] != c for d in v['distract']), '%s 自干扰' % c
    assert len(v['words']) >= 2 and all(len(w) == 2 and w[0] and w[1] for w in v['words'])
    if v.get('glyph'):
        assert len(v['glyph']) <= 40, '%s glyph 超 40 字' % c
known = [c for c, v in chars.items() if v.get('known')]
assert known and all(chars[c]['chNo'] == 1 for c in known)

levels = []
for chb in chapters:
    assert len(chb['levels']) == 5
    for lv in chb['levels']:
        assert lv['flat'] == len(levels) and lv['lv'] == len(levels) % 5
        assert len(lv['newChars']) == 5 and len(set(lv['newChars'])) == 5
        assert all(c in chars and c not in genpool for c in lv['newChars']), '静态关新字必须出自 100 静态字'
        lv = dict(lv)
        lv['ch'] = chb['ch']
        levels.append(lv)
assert len(levels) == 20
cover = [c for lv in levels for c in lv['newChars']]
assert sorted(set(cover)) == sorted(static_chars) and len(cover) == 100, '静态 20 关新字并集=100 静态字全集'
for lv in levels:
    assert all(c in chars for c in lv['review'])
    s = lv['sentence']
    assert s and s['text'] and s['charsUsed']
sched = SRC['reviewSchedule']
sched_flats = sorted(set(sum(sched.values(), [])))
rev_flats = sorted(lv['flat'] for lv in levels if lv['review'])
assert sched_flats == rev_flats, 'reviewSchedule 列出关与实际带复习字关必须一致: %s vs %s' % (sched_flats, rev_flats)
assert [s['afterFlat'] for s in sentences] == list(range(20)), 'sentences afterFlat 必须 0-19 齐'

# ---------- 发射 game-data.js ----------
out = []
A = out.append
A('''/* ================= zilearn 识字小课堂 游戏数据（batch41，第 151 款）
   字表 150 字 = 静态 100（4 章×5 关×5 新字）+ genPool 50（生成关每关 +2 渐进引入）。
   本表由 _src/chars.json 定稿经 _r_zi_gen_data.py 转写生成（零手抄）——
   字段与 chars.json 一一同名（py 无调拼音+同音序号/clip key=zi_ch_<py> 全表唯一 ASCII）；
   build.py 每次构建跑双向对账门禁（node 提取本表 ↔ chars.json 深比较全等），防转写笔误。
   PICTO 26 字象形 SVG 自 batch8/picto PICTO 表按汉字字面映射复制（勿引用），8 字含 ev 古形。
   语音键账（SPEC-ZILEARN §R，r41 两段制——段一只接线不注册）：
   zi_ch_<py> 150 键（文案=字，首词的字——chText 同式）+ zi_st_<flat> 20 键（句子朗读，
   答对确认链尾段）+ 通用 8 键（VOICE 表）= 178 键；clip 未注册=静音（core v1.0 TTS 通道
   已删），段二主线 gen_clips 中央登记后自动有声。 */''')
A("'use strict';")
A('')
A("const INK = '#4A3B2E';            // 家族暖棕描边（DESIGN-SPEC §8）")
A('')
A('/* ---------- 关卡框架：5 题位=1 关；静态 20 关=4 章 ---------- */')
A('const CH_LEN = 5;')
A('const STATIC_LEVELS = 20;')
A('')
A('/* ---------- 句子虚词白名单（子集铁律：这些字永不挖空做目标） ---------- */')
A('const WHITELIST = %s;' % J('的了是我你在他有和就不啊吧呀嗯啦好'))
A('')
A('''/* ---------- 章配置：hint=本章内容预告文案（契约 C7：章 ci 结束时显示 CHAPTERS[ci+1].hint
   ——hint[n] 写第 n 章自己的内容，禁右移成第 n+1 章描述；ch1.hint 仅存档从不显示（无第 0 章） ---------- */''')
A('const CHAPTERS = {')
hints = {1: '天地日月山和水，先认识大自然', 2: '去我的家，认识小动物和家里人',
         3: '吃喝玩乐，认识吃饭做游戏的动作字', 4: '字的家族，长得像的字要分清'}
for ch in chapters:
    A('  %d: { name: %s, hint: %s },' % (ch['ch'], J(ch['name']), J(hints[ch['ch']])))
A('};')
A('')
A('/* ---------- 生成关预告（家族 F：实算下一关，禁 (ci+1)%%4 章序推进） ---------- */')
A('const GEN_HINT_MORE = %s;' % J('生字池还有新朋友等你认'))
A('const GEN_HINT_DONE = %s;' % J('生字全部认完啦，你是识字小达人'))
A('')
A('''/* ---------- 字库（150 字定稿转写；words=[词,全拼]；distract=[干扰字,理由]；
   pic=true ⟺ glyph 非空 ⟺ PICTO 有象形 SVG（三表同键 26 字，构建期断言） ---------- */''')
A('const CHARS = {')
for c, v in chars.items():
    A('%s: { py: %s, pyFull: %s, chNo: %d, words: %s, pic: %s, glyph: %s, known: %s, distract: %s },' % (
        J(c), J(v['py']), J(v['pyFull']), v['chNo'], J(v['words']),
        'true' if v['pic'] else 'false', J(v['glyph']) if v['glyph'] else 'null',
        'true' if v.get('known') else 'false', J(v['distract'])))
A('};')
A('')
A('/* ---------- 静态 20 关谱（flat 0-19；review=确定性复习字；sentence=本关句子） ---------- */')
A('const LEVELS = [')
for lv in levels:
    A('  { flat: %d, ch: %d, lv: %d, newChars: %s, review: %s, sentence: %s },' % (
        lv['flat'], lv['ch'], lv['lv'], J(lv['newChars']), J(lv['review']),
        J(lv['sentence'])))
A('];')
A('')
A('/* ---------- 生成关引入池（50 字，flat≥20 每关引入前 2 个未引入字） ---------- */')
A('const GEN_POOL = %s;' % J(genpool))
A('')
A('/* ---------- 20 句（afterFlat=0-19 与 LEVELS[].sentence 同源对账） ---------- */')
A('const SENTENCES = %s;' % J(sentences))
A('')
A('/* ---------- 复习曲线表（1/3/7 关隔适用关清单；各关实际复习字在 LEVELS[].review） ---------- */')
A('const REVIEW_SCHED = %s;' % J(sched))
A('')
A('/* ---------- 象形 SVG（26 字，自 batch8/picto 按字面复制；ev=更古形态，8 字有） ---------- */')
A('const PICTO = {')
for c, v in PIC.items():
    A('%s: { ev: %s, svg: %s },' % (J(c), J(v['ev']) if v['ev'] else 'null', J(v['svg'])))
A('};')
A('')
A('/* ---------- 通用语音（8 键；chText=每字读音组词文案=zi_ch_<py> 键文本，与 wrd 范式同式） ---------- */')
A('const VOICE = {')
A("  watch:  { key: 'zi_tut_watch', text: '看！来认识新字啦' },")
A("  turn:   { key: 'zi_tut_turn',  text: '你来点一点' },")
A("  hint:   { key: 'zi_hint',      text: '想一想，再选一选' },")
A("  right:  { key: 'zi_right',     text: '答对啦，真棒' },")
A("  wrong:  { key: 'zi_wrong',     text: '不对哦，再想一想' },")
A("  listen: { key: 'zi_listen',    text: '听一听，找一找' },")
A("  word:   { key: 'zi_word',      text: '选一选' },")
A("  quiz:   { key: 'zi_quiz',      text: '小测时间到' },")
A('};')
A("const chKey = ch => 'zi_ch_' + CHARS[ch].py;")
A("const chText = ch => ch + '，' + CHARS[ch].words[0][0] + '的' + ch;")
A("const stKey = flat => 'zi_st_' + flat;")
A('')
A('/* ---------- 图标（内嵌 SVG，家族描线风：INK 暖棕 / 暖橙点缀） ---------- */')
A('const ICONS = {')
A("  logo: '<svg viewBox=\"0 0 44 44\" width=\"32\" height=\"32\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\">' +")
A("    '<rect x=\"4\" y=\"4\" width=\"36\" height=\"36\" rx=\"10\" fill=\"#E8975A\" stroke=\"#FFF\" stroke-width=\"2.5\"/>' +")
A("    '<text x=\"22\" y=\"31\" font-size=\"22\" font-weight=\"800\" text-anchor=\"middle\" fill=\"#FFF9EE\" font-family=\"inherit\">字</text></svg>',")
A("  hear: '<svg viewBox=\"0 0 64 64\" xmlns=\"http://www.w3.org/2000/svg\">' +")
A("    '<path d=\"M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z\" fill=\"#E8975A\" stroke=\"#4A3B2E\" stroke-width=\"3\" stroke-linejoin=\"round\"/>' +")
A("    '<path d=\"M43 23 q6 9 0 18 M50 16 q11 16 0 32\" stroke=\"#4A3B2E\" stroke-width=\"3.5\" fill=\"none\" stroke-linecap=\"round\"/></svg>',")
A("  pen: '<svg viewBox=\"0 0 64 64\" xmlns=\"http://www.w3.org/2000/svg\">' +")
A("    '<rect x=\"10\" y=\"10\" width=\"44\" height=\"44\" rx=\"9\" fill=\"none\" stroke=\"#4A3B2E\" stroke-width=\"3.5\"/>' +")
A("    '<path d=\"M20 42 l4 -12 12 -4 -4 12 Z\" fill=\"#E8975A\" stroke=\"#4A3B2E\" stroke-width=\"3\" stroke-linejoin=\"round\"/></svg>',")
A("  replay: '<svg viewBox=\"0 0 64 64\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\">' +")
A("    '<path d=\"M46 30 a17 17 0 1 0 -3 13\" stroke=\"#8A9BAE\" stroke-width=\"6\" stroke-linecap=\"round\" fill=\"none\"/>' +")
A("    '<path d=\"M40 12 L48 30 L30 30 Z\" fill=\"#8A9BAE\"/></svg>',")
A("  finger: '<svg viewBox=\"0 0 64 76\" xmlns=\"http://www.w3.org/2000/svg\">' +")
A("    '<path d=\"M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z\" fill=\"#FFF\" opacity=\".93\" stroke=\"#E8DCC8\" stroke-width=\"2\"/>' +")
A("    '<ellipse cx=\"35\" cy=\"44\" rx=\"10\" ry=\"6\" fill=\"#F2B8C6\" opacity=\".35\"/></svg>'")
A('};')
A('')
A('/* ---------- 时序常量（段一 estMs 估值口径；段二 gen_clips 注册后按实长回填——SPEC §R9） ---------- */')
A("const estMs = s => s.length * 345 + 600;")
A('const LOOK_MS = 2800;        // qi0 每字亮相窗（5 字总窗 ~14s，SPEED 缩放）')
A('const WATCH_P1 = 1100;       // 亮相第一段（ev 古形/svg/glyph 文案）')
A('const WATCH_P2 = 1100;       // 亮相第二段（svg 现形/glyph 保持）')
A('const WRONG_CHAIN_WIN = estMs(%s) + 300;' % J('不对哦，再想一想'))
A('const RESCUE_DIR_MS = 14000;   // 救援方向级（重播题面语音；不刷 lastAct——keepIdle 纪律）')
A('const RESCUE_ANS_MS = 30000;   // 救援答案级（breathe 正确卡+重播；不刷 lastAct）')
A('const RESCUE_ANS_REPEAT = 15000;  // 答案级重复节流（lastAns 独立锚）')

(HERE / 'game-data.js').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('OK game-data.js:', len('\n'.join(out)), 'chars; chars=150 pic=%d levels=20 genPool=50 sentences=20' % len(pic_chars))
