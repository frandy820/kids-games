# -*- coding: utf-8 -*-
"""zilearn 识字小课堂 单文件拼接：_src/game-head.html + core.js(全文原样) + clips + 游戏 JS → ../index.html
用法: python batch41/zilearn/_src/build.py
结构（b36 M1 布局硬性）：script[0]=core / script[1]=clips / script[2]=data+engine+main（纯游戏
逻辑，无 verify 字面）/ script[3]=verify——verify ⑧ 读 script 块数==4 与 script[2] 源码断言。
语音两段制（r41）：段一 zi_ 178 键未注册——clips 注入允许为空（缺 clip=core v1.0 静音兜底）；
段二主线 gen_clips 注册后：注入断言收紧为 178 键全在册（禁部分注册，ins n4 in (0,8) 范式）。
字表转写对账门禁（坑13 铁律）：node 提取 game-data.js 表 ↔ _src/chars.json 深比较全等，
每次构建跑——防转写笔误/防单侧漂移。"""
import json, pathlib, re, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = pathlib.Path(__file__).resolve().parent          # _src/
OUT = ROOT.parent / 'index.html'                        # batch41/zilearn/index.html
CORE = pathlib.Path(r'F:/claudecode/projects/active/kids-games/design/core.js')

head = (ROOT / 'game-head.html').read_text(encoding='utf-8')
core = CORE.read_text(encoding='utf-8')
data = (ROOT / 'game-data.js').read_text(encoding='utf-8')
engine = (ROOT / 'game-core.js').read_text(encoding='utf-8')
main = (ROOT / 'game-main.js').read_text(encoding='utf-8')
verif = (ROOT / 'game-verify.js').read_text(encoding='utf-8')

# ===== 语音 clips 注入（r41 两段制：段一允许 0 键=静音兜底；段二 178 键全在册） =====
try:
    sys.path.insert(0, 'F:/claudecode/projects/active/kids-games/voice')
    from inject_clips import clips_js
    clips = clips_js('zilearn')
except (Exception, SystemExit) as e:
    print('CLIPS-INJECT-FAIL:', repr(e)[:200])
    sys.exit(3)
_inj_keys = re.findall(r'"([a-z0-9_]+)":"data:audio', clips)
# n_zi 只数 zi_ 前缀（core_* 3 条随 ALL 归入本款集合=家族常态，不入段二计数——2026-09-24 段二实测 181=178+core3 炸断言勘正）
n_zi = sum(1 for k in _inj_keys if k.startswith('zi_'))
# 期望键清单（与 chars.json 同源推导：zi_ch_<py> 150 + zi_st_0..19 + VOICE 8 = 178；core_* 3 条可随段二带上）
SRC = json.loads((ROOT / 'chars.json').read_text(encoding='utf-8'))
EXPECT_KEYS = set('zi_ch_' + v['py'] for v in SRC['chars'].values())
EXPECT_KEYS |= set('zi_st_%d' % f for f in range(20))
EXPECT_KEYS |= {'zi_tut_watch', 'zi_tut_turn', 'zi_hint', 'zi_right', 'zi_wrong',
                'zi_listen', 'zi_word', 'zi_read_hint', 'zi_quiz'}
assert len(EXPECT_KEYS) == 179, '期望键推导异常: %d != 179（178+zi_read_hint r2F5）' % len(EXPECT_KEYS)
bad_prefix = [k for k in _inj_keys if not (k.startswith('zi_') or k.startswith('core_'))]
assert not bad_prefix, 'clips 出现非 zi_/core_ 键: %s' % sorted(set(bad_prefix))
assert n_zi in (0, 179), 'zi_ clips %d 条（段一须 0=未注册，段二须 179=全量，禁部分注册）' % n_zi
if n_zi:
    missing = EXPECT_KEYS - set(_inj_keys)
    extra = (set(_inj_keys) & set('core_chapter_end core_day_end core_rest')) - {'core_chapter_end', 'core_day_end', 'core_rest'}
    assert not missing, '段二缺键 %d 条: %s' % (len(missing), sorted(missing)[:8])
stage = 2 if n_zi else 1

# ===== 字表转写对账门禁（坑13）：node 提取 JS 表 ↔ chars.json 双向深比较全等 =====
DUMP_JS = r'''
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(process.argv[1], 'utf8');
const ctx = { JSON: JSON, Math: Math };
vm.createContext(ctx);
vm.runInContext(src + ';this.__T = { CHARS: CHARS, LEVELS: LEVELS, GEN_POOL: GEN_POOL, SENTENCES: SENTENCES, REVIEW_SCHED: REVIEW_SCHED, CHAPTERS: CHAPTERS, PICTO: PICTO, VOICE: VOICE };', ctx);
process.stdout.write(JSON.stringify(ctx.__T));
'''
dump = subprocess.run(['node', '-e', DUMP_JS, str(ROOT / 'game-data.js')],
                      capture_output=True, text=True, encoding='utf-8', timeout=60)
assert dump.returncode == 0, 'node 提取 game-data.js 失败: %s' % dump.stderr[:300]
T = json.loads(dump.stdout)
lv_expect = []
for chb in SRC['chapters']:
    for lv in chb['levels']:
        e = dict(lv); e['ch'] = chb['ch']
        lv_expect.append(e)
assert T['CHARS'] == SRC['chars'], 'CHARS 对账失败（150 字逐字段）'
# r2 数据防劣化：words[0] 必含本字（word 挖空 blankWord/match 正确项前提）；干扰字≠本字
for ch, v in SRC['chars'].items():
    assert v['words'][0][0].find(ch) >= 0, 'words[0] 不含本字: %s %s' % (ch, v['words'][0])
    assert all(d[0] != ch for d in v['distract']), '干扰含本字: %s' % ch
assert T['LEVELS'] == lv_expect, 'LEVELS 对账失败（20 关 newChars/review/sentence）'
assert T['GEN_POOL'] == SRC['genPool'], 'GEN_POOL 对账失败'
assert T['SENTENCES'] == SRC['sentences'], 'SENTENCES 对账失败'
assert T['REVIEW_SCHED'] == SRC['reviewSchedule'], 'REVIEW_SCHED 对账失败'
assert len(T['PICTO']) == 26 and sum(1 for v in T['PICTO'].values() if v['ev']) == 8, 'PICTO 26 字/8 ev 对账失败'
assert set(T['PICTO']) == set(c for c, v in SRC['chars'].items() if v['pic']), 'PICTO 键集≠pic 字集'

# ===== 硬性检查 1：JS 内不得出现字面 </script> =====
for name, s in [('core', core), ('data', data), ('engine', engine),
                ('main', main), ('verify', verif), ('clips', clips)]:
    assert '</script' not in s, f'{name} 含字面 </script>，需写 <\\/script>'

# ===== 硬性检查 2：core.js 最新契约版 =====
assert 'settle()' in core, 'core.js 非最新版（缺 session.settle）'
assert 'queue(parts)' in core, 'core.js 非最新版（缺 voice.queue）'

# ===== 硬性检查 2b：游戏侧契约关键符号在场 =====
assert "KIDS.init({ game: 'zilearn'" in main, 'main 缺 KIDS.init zilearn（存档键 kidsgame_zilearn）'
assert 'window.ZIL =' in main, 'main 缺 ZIL 钩子'
assert '<title>识字小课堂</title>' in head, 'head 缺标题 识字小课堂'
assert 'button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}' in head, \
    'head 缺自建 button 显式 color（契约 O）'
# 本款常量锚（SPEC-ZILEARN §0：seeded mulberry32(flat*7919+97)——本款常量 97）
assert 'flat * 7919 + 97' in engine, 'engine 缺本款常量 seed 97（SPEC §0）'
assert 'function genLevel' in engine and 'function engPick' in engine and 'function engSkipWatch' in engine, '引擎函数缺失'
# 数据常量锚
for frag in ('const CH_LEN = 5;', 'const STATIC_LEVELS = 20;',
             'const LOOK_MS = 2800;', 'const WATCH_P1 = 1100;', 'const WATCH_P2 = 1100;',
             'const WRONG_CHAIN_WIN = estMs(', 'const RESCUE_DIR_MS = 14000;',
             'const RESCUE_ANS_MS = 30000;', 'const RESCUE_ANS_REPEAT = 15000;'):
    assert frag in data, 'data 缺 SPEC §1 时序常量 %s' % frag
# 家族契约 C7：章末预告=CHAPTERS[ci+1].hint（禁右移）
assert 'CHAPTERS[ci + 1].hint' in main, 'main 缺章末预告契约锚 CHAPTERS[ci+1].hint（C7）'
assert len(re.findall(r'hint: "', data)) == 4, 'CHAPTERS hint 字段须 4 条'
# 家族契约 K：rescueTick 命名函数 + 面板在场守卫
assert 'function rescueTick()' in main, 'main 救援 tick 必须命名函数 rescueTick（契约 K）'
assert "if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;" in main, \
    'main rescueCore 缺面板在场守卫（契约 K）'
# keepIdle 纪律（任务书铁律）：rescueCore 体内不得给 lastAct 赋值（救援不刷 idle 锚）
_rc = re.search(r'function rescueCore\(\) \{(.*?)\n\}', main, re.S)
assert _rc, 'main 缺 rescueCore 函数体'
assert not re.search(r'lastAct\s*=', _rc.group(1)), 'rescueCore 体内给 lastAct 赋值（违反 keepIdle 纪律）'
assert 'lastDir = Date.now()' in _rc.group(1) and 'lastAns = Date.now()' in _rc.group(1), \
    'rescueCore 须用 lastDir/lastAns 独立节流锚（keepIdle 配套）'
# 家族契约 J：错反馈 10s 节流 + flat<3 每错必播
assert 'now - lastWrongVoice > 10000' in main, 'main 缺错反馈 10s 节流（契约 J）'
assert 'cur.flat < 3' in main, 'main 缺 flat<3 每错必播条件（契约 J）'
# 家族契约 F：生成关预告实算（禁 (ci+1)%4 章序推进）
assert 'newCharsOf(' in main and '(ci + 1) % 4' not in main, '生成关 nextHint 须实算（家族 F）'
# 日历限速（SPEC §R5：首日 2/次日 3/第 3 日 4/第 4 日起 6）
assert 'const ZI_DAY_NEW = [2, 3, 4];' in main, 'main 缺日历限速表 ZI_DAY_NEW（SPEC §R5）'
assert 'ziLimit(Infinity)' in main, 'main 未走 ziLimit 限速通道（SPEC §R5）'
# 教学三段（看→操作→独）+ soft 不计 miss
assert 'tutorialWatch' in main and "state.tut === 'turn'" in main and "state.tut === 'solo'" in main, '教学三段链缺失'
assert 'engPick(cur, i, soft)' in main, 'main 缺 soft 教学不计 miss 通道'
# 防泄露结构锚：视觉题面渲染分支不播目标字音（运行时由 verify ④ 键账断言）
assert "q.kind === 'listen' || r.sub === 'listen'" in main and 'sayQuestion' in main, '题面语音分流缺失'
# verify 素材（独立硬编码表 + script 块数断言 + 双视口）
for lit in ('SPEC_KINDS', 'SPEC_ZI_BASE', 'SPEC_WHITELIST', "document.querySelectorAll('script').length",
            'vGenLevel', 'runVerify'):
    assert lit in verif, 'verify 缺素材 %s' % lit
assert 'runVerify' not in (data + engine + main), 'b36 M1①：script[2]（data+engine+main）不得含 verify 字面'
# ICONS/VOICE 结构锚
for k in ('logo:', 'hear:', 'pen:', 'replay:', 'finger:'):
    assert k in data, 'data 缺 ICONS.%s' % k
assert verif.count('const SPEC_ZI_BASE') == 1 and '[1, 2], [2, 5], [3, 9], [4, 15]' in verif, \
    'verify 缺 ziBase 独立表硬编码（SPEC §R5：2/5/9/15）'

# ===== 拼接（4 script 块） =====
html = (head + '\n' +
        '<script>\n' + core + '\n</script>\n' +
        '<script>\n' + clips + '\n</script>\n' +
        '<script>\n' + data + engine + main + '\n</script>\n' +
        '<script>\n' + verif + '\n</script>\n' +
        '</body>\n</html>\n')

# ===== 硬性检查 3：script 块数恰 4（b36 M1） =====
assert html.count('<script>') == 4 and html.count('</script>') == 4, \
    'script 块数异常: %d' % html.count('<script>')

# ===== 硬性检查 4：完全离线——除 SVG xmlns 命名空间标识符外无任何 http(s)/外链 =====
stripped = html.replace('http://www.w3.org/2000/svg', 'NS-SVG')
for bad in ['http://', 'https://', '<link', ' src=', ' href=']:
    assert bad not in stripped, f'发现外部引用: {bad}'

OUT.write_text(html, encoding='utf-8')
print('OK written:', OUT, len(html), 'chars')
print('对账: CHARS/LEVELS/GEN_POOL/SENTENCES/REVIEW_SCHED ↔ chars.json 双向全等；PICTO 26(8 ev)')
print('clips: stage-%d（zi_ %d/179 键在册；段二 gen_clips 注册后自动收紧为全量）' % (stage, n_zi))
